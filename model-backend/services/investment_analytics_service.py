from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List
import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def _safe_float(x: Any) -> float:
    try:
        v = float(x)
        if not np.isfinite(v):
            logger.warning("Non-finite analytics value detected (%s); replacing with 0.0", x)
            return 0.0
        return v
    except Exception:
        return 0.0


def build_stock_price_and_risk_analytics(
    *,
    tickers: List[str],
    expected_returns: pd.Series,
    market_data: Dict[str, pd.DataFrame],
    price_period: str = "1y",
    price_interval: str = "1d",
    max_points: int = 90,
) -> Dict[str, Any]:
    """
    Build data needed for:
    - closing prices over time (line chart)
    - risk/return scatter (expected return vs historical volatility)
    - correlation heatmap (historical return correlation)

    Notes:
    - volatility/correlation are computed from historical daily returns.
    - expected_returns comes from your existing LSTM forecast logic.
    """
    if not tickers:
        raise ValueError("tickers cannot be empty")

    series_map: Dict[str, pd.Series] = {}
    for t in tickers:
        frame = (market_data or {}).get(t)
        if frame is None or frame.empty:
            continue
        if "Adj Close" in frame.columns:
            s = frame["Adj Close"].dropna()
        elif "Close" in frame.columns:
            s = frame["Close"].dropna()
        else:
            continue
        series_map[t] = s.rename(t)

    if not series_map:
        raise ValueError("No market data available for analytics tickers.")

    prices_df = pd.concat(series_map.values(), axis=1).sort_index()

    prices_df = prices_df.dropna(how="all")
    if prices_df.empty:
        raise ValueError("No price history available")

    # Keep recent window to limit payload size.
    prices_df = prices_df.tail(max_points)

    # Build chart-ready time series:
    # [{ date: 'YYYY-MM-DD', prices: { 'RELIANCE.NS': 123.4, ... } }, ...]
    data: List[Dict[str, Any]] = []
    for idx, row in prices_df.iterrows():
        date_str = str(pd.to_datetime(idx).date())
        prices = {t: _safe_float(row.get(t)) for t in tickers if t in prices_df.columns}
        data.append({"date": date_str, "prices": prices})

    # Historical returns for volatility + correlation.
    # Use log returns for stability.
    returns_df = np.log(prices_df / prices_df.shift(1)).dropna(how="all")
    returns_df = returns_df.replace([np.inf, -np.inf], np.nan).dropna(how="all")

    if returns_df.empty or returns_df.shape[0] < 2:
        # Fallback: no returns history; still return price series.
        return {
            "stock_price_history": {
                "tickers": tickers,
                "data": data,
            },
            "stock_risk_return_points": [],
            "stock_correlation": {
                "tickers": tickers,
                "matrix": [],
            },
        }

    # Annualized volatility estimate.
    daily_vol = returns_df.std(skipna=True) * np.sqrt(252)

    # Correlation matrix.
    corr_df = returns_df.corr()
    corr_matrix = corr_df.values
    corr_matrix = np.nan_to_num(corr_matrix, nan=0.0).tolist()

    points = []
    for t in tickers:
        points.append(
            {
                "ticker": t,
                "expected_return": _safe_float(expected_returns.get(t, 0.0)),
                "volatility": _safe_float(daily_vol.get(t, 0.0)),
            }
        )

    return {
        "stock_price_history": {"tickers": tickers, "data": data},
        "stock_risk_return_points": points,
        "stock_correlation": {"tickers": tickers, "matrix": corr_matrix},
    }

