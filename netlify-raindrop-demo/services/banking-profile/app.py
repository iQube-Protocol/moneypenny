import os, json, hashlib, datetime as dt
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Note: landingai_ade is a placeholder - you'll need to install the actual package
# For now, we'll create a mock implementation
USE_MOCK_ADE = os.getenv("USE_MOCK_ADE", "true").lower() == "true"

app = FastAPI(title="Banking Profile Service", version="0.1.0")

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include new routes
from routes.bulk_extract import router as bulk_router
from routes.aggregate import router as agg_router
app.include_router(bulk_router)
app.include_router(agg_router)

# --- Pydantic schema for extraction ---
class Txn(BaseModel):
    date: str = Field(description="YYYY-MM-DD")
    description: str
    amount: float = Field(description="signed; negative=debit, positive=credit")
    currency: str = "USD"
    category: Optional[str] = None

class Statement(BaseModel):
    account_holder: Optional[str] = None
    institution: Optional[str] = None
    period_start: str
    period_end: str
    opening_balance: float
    closing_balance: float
    transactions: List[Txn]

def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def features_from_statement(stmt: Statement):
    """Extract suitability features from statement"""
    from collections import defaultdict
    import math

    by_day = defaultdict(float)
    for t in stmt.transactions:
        by_day[t.date] += t.amount

    days = sorted(by_day.keys())
    vals = [by_day[d] for d in days]

    if not vals:
        return dict(
            avg_daily_surplus=0,
            surplus_volatility=0,
            closing_balance=stmt.closing_balance,
            cash_buffer_days=0,
            max_drawdown=0
        )

    avg = sum(vals) / len(vals)
    vol = math.sqrt(sum((v - avg)**2 for v in vals) / len(vals)) if len(vals) > 1 else 0

    # Calculate max drawdown
    cumulative = 0
    peak = 0
    max_dd = 0
    for v in vals:
        cumulative += v
        if cumulative > peak:
            peak = cumulative
        dd = peak - cumulative
        if dd > max_dd:
            max_dd = dd

    # Cash buffer in days
    cash_buffer = stmt.closing_balance / abs(avg) if avg != 0 else 0

    return dict(
        avg_daily_surplus=round(avg, 2),
        surplus_volatility=round(vol, 2),
        closing_balance=round(stmt.closing_balance, 2),
        cash_buffer_days=round(cash_buffer, 1),
        max_drawdown=round(max_dd, 2)
    )

def propose_overrides(f):
    """Map features to policy overrides"""
    def clamp(x, lo, hi):
        return max(lo, min(hi, x))

    # Conservative multiplier for daily surplus
    max_notional = clamp(0.35 * f["avg_daily_surplus"], 25, 0.20 * f["closing_balance"])

    # Scale loss limits with volatility
    surplus_vol_bps = (f["surplus_volatility"] / 0.01) * 10000 if f["surplus_volatility"] > 0 else 100
    daily_loss_limit = clamp(3 * surplus_vol_bps, 8, 40)

    # Inventory band based on surplus
    inventory_band = clamp(f["avg_daily_surplus"] / 25, 0.5, 3.0) if f["avg_daily_surplus"] > 0 else 1.0

    return dict(
        max_notional_usd_day=round(max_notional, 2),
        daily_loss_limit_bps=round(daily_loss_limit, 1),
        inventory_band=round(inventory_band, 2),
        min_edge_bps_baseline=1.0
    )

def mock_extract_statement(content: bytes) -> Statement:
    """Mock statement extraction for demo purposes"""
    import random
    from datetime import datetime, timedelta

    # Generate mock transactions
    today = datetime.now()
    start_date = today - timedelta(days=30)

    transactions = []
    balance = 5000.0

    for i in range(30):
        date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")

        # Random transactions
        if random.random() > 0.3:
            amount = random.choice([
                -random.uniform(10, 100),  # expenses
                random.uniform(50, 200),   # income
            ])
            transactions.append(Txn(
                date=date,
                description=random.choice([
                    "Coffee Shop", "Grocery Store", "Gas Station",
                    "Salary Deposit", "Transfer", "Restaurant"
                ]),
                amount=round(amount, 2),
                currency="USD",
                category=random.choice(["Food", "Transport", "Income", "Other"])
            ))
            balance += amount

    return Statement(
        account_holder="Demo User",
        institution="Demo Bank",
        period_start=start_date.strftime("%Y-%m-%d"),
        period_end=today.strftime("%Y-%m-%d"),
        opening_balance=5000.0,
        closing_balance=round(balance, 2),
        transactions=transactions
    )

@app.get("/health")
async def health():
    return {"ok": True, "service": "banking-profile", "ts": dt.datetime.now().isoformat()}

@app.post("/bank/ingest")
async def ingest(file: UploadFile = File(...), tenant_id: str = Form(...)):
    """Ingest statement and store in BlakQube"""
    blob = await file.read()
    raw_hash = sha256_bytes(blob)

    # In production: Store in BlakQube (encrypted raw storage)
    # For now, just return hash

    return {
        "tenant_id": tenant_id,
        "raw_hash": raw_hash,
        "file_size": len(blob),
        "filename": file.filename,
        "stored_in": "BlakQube (mock)",
        "ts": dt.datetime.now().isoformat()
    }

@app.post("/bank/extract")
async def extract(file: UploadFile = File(...), tenant_id: str = Form(...)):
    """Extract features from statement and propose policy overrides"""
    blob = await file.read()
    raw_hash = sha256_bytes(blob)

    if USE_MOCK_ADE:
        # Mock extraction for demo
        stmt = mock_extract_statement(blob)
    else:
        # Real ADE extraction would go here
        # Requires VISION_AGENT_API_KEY and landingai_ade package
        raise HTTPException(status_code=501, detail="Real ADE extraction not yet implemented")

    # Extract features (PII-minimized)
    feats = features_from_statement(stmt)

    # Propose policy overrides
    ovr = propose_overrides(feats)

    # In production:
    # - Store raw in BlakQube
    # - Store normalized data in DataQube
    # - Store features in ProfileQube
    # - Create DiDQube attestation linking (raw_hash, extractor_version, features_hash, consent)

    return {
        "tenant_id": tenant_id,
        "raw_hash": raw_hash,
        "features": feats,
        "proposed_overrides": ovr,
        "consent": {
            "purpose": "Qc-suitability-v1",
            "scope": "feature-level",
            "retention": "12m",
            "revoke": "destroy tokenQube key"
        },
        "statement_summary": {
            "period": f"{stmt.period_start} to {stmt.period_end}",
            "transaction_count": len(stmt.transactions),
            "opening_balance": stmt.opening_balance,
            "closing_balance": stmt.closing_balance
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8788"))
    uvicorn.run(app, host="0.0.0.0", port=port)
