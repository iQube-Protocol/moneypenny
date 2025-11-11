from typing import List, Dict
from statistics import mean, pstdev

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def monthly_features(statements: List[dict]) -> List[dict]:
    """Input: list of parsed/extracted Statement JSONs
       Statement: { closing_balance: float, transactions: [{date, amount, ...}], period_start, period_end }"""
    out = []
    for s in statements:
        # group by day
        daily = {}
        for t in s.get("transactions", []):
            d = t["date"]
            daily[d] = daily.get(d, 0.0) + float(t["amount"])
        vals = list(daily.values())
        if not vals:
            avg = 0.0
            vol = 0.0
        else:
            avg = mean(vals)
            vol = pstdev(vals) if len(vals) > 1 else 0.0
        out.append({
            "period_start": s["period_start"],
            "period_end": s["period_end"],
            "closing_balance": float(s["closing_balance"]),
            "avg_daily_surplus": avg,
            "surplus_volatility": vol
        })
    return out

def propose_overrides_from_features(f: Dict[str, float]) -> Dict[str, float]:
    max_notional = clamp(0.35 * f["avg_daily_surplus"], 25, 0.20 * f["closing_balance"])
    surplus_vol_bps = (f["surplus_volatility"] / 0.01) * 10000
    daily_loss_limit = clamp(3 * surplus_vol_bps, 8, 40)
    inventory_band = clamp(f["avg_daily_surplus"]/25, 0.5, 3.0)
    return {
        "max_notional_usd_day": round(max_notional),
        "daily_loss_limit_bps": round(daily_loss_limit, 1),
        "inventory_band": round(inventory_band, 2),
        "min_edge_bps_baseline": 1.0
    }

def merge_months(months: List[Dict]) -> Dict:
    """Conservative merge across months: mean for surplus/vol, last closing balance; protective limits."""
    if not months:
        return {
            "avg_surplus_daily": 0.0,
            "surplus_volatility_daily": 0.0,
            "closing_balance_last": 0.0
        }
    avg_surplus = mean(m["avg_daily_surplus"] for m in months)
    vol = mean(m["surplus_volatility"] for m in months)
    closing_last = months[-1]["closing_balance"]
    f = {
        "avg_daily_surplus": avg_surplus,
        "surplus_volatility": vol,
        "closing_balance": closing_last
    }
    ovr = propose_overrides_from_features(f)
    return {
        "avg_surplus_daily": avg_surplus,
        "surplus_volatility_daily": vol,
        "closing_balance_last": closing_last,
        "proposed_overrides": ovr
    }
