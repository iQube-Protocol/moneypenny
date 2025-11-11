from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()

class MonthPayload(BaseModel):
    month: str
    features: Dict[str, float]
    proposed_overrides: Dict[str, float]

class AggregateRequest(BaseModel):
    tenant_id: str
    months: List[MonthPayload]

def merge_months(months: List[Dict]) -> Dict:
    """Conservative merge across months: mean for surplus/vol, last closing balance; protective limits."""
    if not months:
        return {
            "avg_surplus_daily": 0.0,
            "surplus_volatility_daily": 0.0,
            "closing_balance_last": 0.0,
            "proposed_overrides": {
                "max_notional_usd_day": 25,
                "daily_loss_limit_bps": 8.0,
                "inventory_band": 1.0,
                "min_edge_bps_baseline": 1.0
            }
        }

    # Calculate averages
    avg_surplus = sum(m["avg_daily_surplus"] for m in months) / len(months)
    vol = sum(m["surplus_volatility"] for m in months) / len(months)
    closing_last = months[-1]["closing_balance"]

    # Propose overrides based on merged features
    def clamp(x, lo, hi):
        return max(lo, min(hi, x))

    max_notional = clamp(0.35 * avg_surplus, 25, 0.20 * closing_last)
    surplus_vol_bps = (vol / 0.01) * 10000 if vol > 0 else 100
    daily_loss_limit = clamp(3 * surplus_vol_bps, 8, 40)
    inventory_band = clamp(avg_surplus / 25, 0.5, 3.0) if avg_surplus > 0 else 1.0

    ovr = {
        "max_notional_usd_day": round(max_notional, 2),
        "daily_loss_limit_bps": round(daily_loss_limit, 1),
        "inventory_band": round(inventory_band, 2),
        "min_edge_bps_baseline": 1.0
    }

    return {
        "avg_surplus_daily": round(avg_surplus, 2),
        "surplus_volatility_daily": round(vol, 2),
        "closing_balance_last": round(closing_last, 2),
        "proposed_overrides": ovr
    }

@router.post("/profile/aggregate")
def aggregate(req: AggregateRequest):
    """Aggregate multi-month features into a single recommendation"""
    months = []
    for m in req.months:
        f = m.features
        months.append({
            "avg_daily_surplus": float(f.get("avg_daily_surplus", 0)),
            "surplus_volatility": float(f.get("surplus_volatility", 0)),
            "closing_balance": float(f.get("closing_balance", 0))
        })

    merged = merge_months(months)
    merged["months"] = [x.month for x in req.months]
    merged["month_count"] = len(req.months)

    return {
        "tenant_id": req.tenant_id,
        "aggregate": merged
    }
