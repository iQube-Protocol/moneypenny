import os, hashlib, random, datetime as dt
from fastapi import APIRouter, UploadFile, File, Form
from typing import List
from pydantic import BaseModel, Field

router = APIRouter()

# Import from parent app module
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Txn(BaseModel):
    date: str = Field(description="YYYY-MM-DD")
    description: str
    amount: float = Field(description="signed; negative=debit, positive=credit")
    currency: str = "USD"
    category: str | None = None

class Statement(BaseModel):
    account_holder: str | None = None
    institution: str | None = None
    period_start: str
    period_end: str
    opening_balance: float
    closing_balance: float
    transactions: List[Txn]

def mock_extract_statement_for_month(content: bytes, month_offset: int = 0) -> Statement:
    """Mock statement extraction for a specific month"""
    today = dt.datetime.now()
    # Go back month_offset months
    year = today.year
    month = today.month - month_offset
    while month <= 0:
        month += 12
        year -= 1

    start_date = dt.datetime(year, month, 1)
    # Last day of month
    if month == 12:
        end_date = dt.datetime(year, 12, 31)
    else:
        end_date = dt.datetime(year, month + 1, 1) - dt.timedelta(days=1)

    transactions = []
    balance = 5000.0 + random.uniform(-500, 500)
    opening = balance

    current = start_date
    while current <= end_date:
        date_str = current.strftime("%Y-%m-%d")

        # Random transactions
        if random.random() > 0.3:
            amount = random.choice([
                -random.uniform(10, 150),  # expenses
                random.uniform(50, 300),   # income
            ])
            transactions.append(Txn(
                date=date_str,
                description=random.choice([
                    "Coffee Shop", "Grocery Store", "Gas Station",
                    "Salary Deposit", "Transfer", "Restaurant", "Utilities"
                ]),
                amount=round(amount, 2),
                currency="USD",
                category=random.choice(["Food", "Transport", "Income", "Other", "Bills"])
            ))
            balance += amount

        current += dt.timedelta(days=1)

    return Statement(
        account_holder="Demo User",
        institution="Demo Bank",
        period_start=start_date.strftime("%Y-%m-%d"),
        period_end=end_date.strftime("%Y-%m-%d"),
        opening_balance=round(opening, 2),
        closing_balance=round(balance, 2),
        transactions=transactions
    )

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

@router.post("/bank/bulk_extract")
async def bulk_extract(files: List[UploadFile] = File(...), tenant_id: str = Form(...)):
    """Extract features from multiple statements and return per-month analysis"""
    out = []

    for idx, f in enumerate(files):
        blob = await f.read()
        raw_hash = hashlib.sha256(blob).hexdigest()

        # Use mock extraction with different month offsets
        # In production, would use actual ADE extraction
        stmt = mock_extract_statement_for_month(blob, month_offset=len(files) - idx - 1)

        feats = features_from_statement(stmt)
        ovr = propose_overrides(feats)

        out.append({
            "month": stmt.period_start[:7] if stmt.period_start else "unknown",
            "raw_hash": raw_hash,
            "filename": f.filename,
            "features": feats,
            "proposed_overrides": ovr,
            "period": f"{stmt.period_start} to {stmt.period_end}",
            "transaction_count": len(stmt.transactions)
        })

    # Sort by month ascending
    out.sort(key=lambda x: x["month"])

    return {
        "tenant_id": tenant_id,
        "months": out,
        "total_files": len(files)
    }
