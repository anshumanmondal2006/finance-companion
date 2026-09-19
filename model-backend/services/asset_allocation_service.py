from __future__ import annotations

from typing import Dict


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def _age_group(age: int) -> str:
    """
    Keep age-group logic aligned with the recommendation engine.
    """
    if age <= 28:
        return "fresh-graduate"
    if age <= 50:
        return "middle-age"
    return "elderly"


def generate_asset_allocation(
    *,
    age: int,
    risk_score: str,
    timeline: int,
    goal_type: str,
) -> Dict[str, float]:
    """
    High-level multi-asset allocation (percent weights) for:
    - equity (stocks)
    - bonds (fixed income / fixed return)
    - gold
    - cash (liquid / fixed)

    Assumptions:
    - bonds/gold/cash returns are constants handled elsewhere.
    - this only decides the high-level weights; equity weights are decided later by
      the existing stock optimizer (equity slice only).
    """
    if risk_score not in {"low", "medium", "high"}:
        raise ValueError("risk_score must be one of: low, medium, high")
    if timeline <= 0:
        raise ValueError("timeline must be > 0")

    group = _age_group(age)

    # Explicit template to match the requested example.
    # Elderly low-risk: 20% equity, 60% bonds, 10% gold, 10% cash.
    if group == "elderly" and risk_score == "low":
        return {"equity": 20.0, "bonds": 60.0, "gold": 10.0, "cash": 10.0}

    # Base equity by age group (elderly low-risk example: ~20% equity).
    base_equity = {
        "fresh-graduate": 70.0,
        "middle-age": 45.0,
        "elderly": 20.0,
    }[group]

    # Risk affects equity tilt.
    risk_adj = {
        "low": -15.0,
        "medium": 0.0,
        "high": 15.0,
    }[risk_score]

    # Timeline affects equity tilt (long horizon -> more equity).
    if timeline <= 3:
        horizon_adj = -10.0
    elif timeline <= 7:
        horizon_adj = -5.0
    else:
        horizon_adj = 5.0

    # For goal types that often have shorter horizons (e.g. "target"), reduce risk slightly.
    if goal_type == "target":
        goal_adj = -5.0
    elif goal_type == "retirement":
        goal_adj = -2.0
    else:
        goal_adj = 0.0

    equity = _clamp(base_equity + risk_adj + horizon_adj + goal_adj, 10.0, 85.0)

    # Gold and cash act as stabilizers.
    gold = {
        "fresh-graduate": 7.0,
        "middle-age": 10.0,
        "elderly": 10.0,
    }[group]
    cash = {
        "fresh-graduate": 5.0,
        "middle-age": 5.0,
        "elderly": 10.0,
    }[group]

    # Risk/short-horizon adjustments for cash and gold.
    if risk_score == "low":
        cash += 5.0
        gold += 2.0
    elif risk_score == "high":
        cash -= 3.0
        gold -= 2.0

    if timeline <= 5:
        cash += 5.0
    if timeline > 10:
        cash -= 2.0

    cash = _clamp(cash, 0.0, 30.0)
    gold = _clamp(gold, 0.0, 25.0)

    bonds = 100.0 - equity - gold - cash
    if bonds < 0:
        # If the stabilizers + equity exceed 100%, reduce equity first.
        equity = _clamp(equity + bonds, 0.0, 100.0)  # bonds is negative here
        bonds = 100.0 - equity - gold - cash

    # Final normalization/rounding to keep sums stable for downstream calculations.
    weights = {"equity": equity, "bonds": bonds, "gold": gold, "cash": cash}
    # If rounding drift happens, put it into bonds.
    rounded = {k: round(v, 2) for k, v in weights.items()}
    drift = round(100.0 - sum(rounded.values()), 2)
    rounded["bonds"] = round(rounded["bonds"] + drift, 2)

    # Safety: ensure no negative small rounding artifacts.
    rounded["equity"] = max(0.0, rounded["equity"])
    rounded["bonds"] = max(0.0, rounded["bonds"])
    rounded["gold"] = max(0.0, rounded["gold"])
    rounded["cash"] = max(0.0, rounded["cash"])

    total = sum(rounded.values())
    if total != 100.0 and total > 0:
        # Renormalize to exactly 100.
        factor = 100.0 / total
        rounded = {k: round(v * factor, 2) for k, v in rounded.items()}
        drift = round(100.0 - sum(rounded.values()), 2)
        rounded["bonds"] = round(rounded["bonds"] + drift, 2)

    return rounded

