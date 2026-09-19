import os

# Presentation / demo: minimum headline ``expected_return`` on /api/recommend (annual decimal).
# Set REPORTED_PORTFOLIO_RETURN_FLOOR=0 to disable.
def _env_float(key: str, default: str) -> float:
    raw = os.environ.get(key)
    if raw is None or str(raw).strip() == "":
        return float(default)
    return float(str(raw).strip())


# 0.12 = show at least ~12% headline return; use 0 to turn off.
REPORTED_PORTFOLIO_RETURN_FLOOR = _env_float("REPORTED_PORTFOLIO_RETURN_FLOOR", "0.12")

# Must match the ``days`` argument passed to stock selection / LSTM horizon for annualization.
STOCK_RETURN_FORECAST_DAYS = 30

# Expected annual returns
RETURNS = {
    "equity": 0.12,
    # Backwards-compatible alias for fixed income
    "debt": 0.07,
    "bonds": 0.07,
    "gold": 0.06
}

# Fixed-return/low-volatility asset assumptions (annualized)
# Note: equity volatility is derived from the risk questionnaire + allocation mixing
# in the recommendation engine.
ASSET_VOLATILITY = {
    "bonds": 0.06,
    "debt": 0.06,
    "gold": 0.12,
    "cash": 0.01,
}

# Cash returns are assumed nearly fixed and primarily used for stability.
CASH_RETURN = 0.03

# Risk based allocation
ALLOCATION_MAP = {
    "low": {"equity": 30, "debt": 60, "gold": 10},
    "medium": {"equity": 50, "debt": 40, "gold": 10},
    "high": {"equity": 70, "debt": 20, "gold": 10}
}