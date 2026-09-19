import numpy as np
import pandas as pd

# Simple optimizer for asset classes kept for compatibility.


def optimize_portfolio():

    assets = ["equity", "debt", "gold"]
    returns = np.array([0.12, 0.07, 0.06])
    risks = np.array([0.18, 0.05, 0.10])
    risk_free = 0.04

    best_sharpe = -1
    best_weights = None

    for _ in range(10000):
        weights = np.random.random(len(assets))
        weights /= np.sum(weights)

        portfolio_return = np.sum(weights * returns)
        portfolio_risk = np.sqrt(np.sum((weights * risks) ** 2))

        sharpe = (portfolio_return - risk_free) / portfolio_risk

        if sharpe > best_sharpe:
            best_sharpe = sharpe
            best_weights = weights

    return {assets[i]: round(best_weights[i] * 100, 2) for i in range(len(assets))}


def adjust_for_risk(allocation, risk):

    if risk == "low":
        allocation["equity"] = min(allocation["equity"], 40)

    elif risk == "medium":
        allocation["equity"] = min(allocation["equity"], 60)

    elif risk == "high":
        allocation["equity"] = min(allocation["equity"], 80)

    total = allocation["equity"] + allocation["debt"] + allocation["gold"]

    allocation["debt"] += (100 - total)

    return allocation


def calculate_returns_matrix(price_history: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate percentage returns matrix from a price history DataFrame.
    Rows: dates, Columns: tickers.
    """
    if price_history is None or price_history.empty:
        raise ValueError("Price history cannot be empty.")

    returns = price_history.pct_change().dropna(how="all")
    return returns


def calculate_covariance_matrix(
    returns_matrix: pd.DataFrame,
    annualize: bool = True,
    periods_per_year: int = 252,
) -> pd.DataFrame:
    """
    Calculate covariance matrix of asset returns.
    Optionally annualizes the covariance.
    """
    if returns_matrix is None or returns_matrix.empty:
        raise ValueError("Returns matrix cannot be empty.")

    cov = returns_matrix.cov()
    if annualize:
        cov *= periods_per_year
    return cov


def optimize_portfolio_weights(
    expected_returns: pd.Series,
    covariance_matrix: pd.DataFrame,
    risk_free_rate: float = 0.0,
    n_portfolios: int = 20000,
    objective: str = "sharpe",
    max_volatility: float | None = None,
    min_return: float | None = None,
    risk_aversion: float = 1.0,
) -> dict:
    """
    Modern portfolio theory optimizer.
    Given expected returns (annualized) and covariance matrix (annualized),
    search for weights that maximize an objective score.
    Ensures weights sum to 1.

    Objectives:
    - "sharpe": maximize (return - risk_free_rate) / volatility
    - "max_return": maximize return subject to optional volatility cap
    - "min_volatility": minimize volatility subject to optional minimum return
    - "utility": maximize (return - risk_aversion * volatility^2)
    """
    if expected_returns is None or expected_returns.empty:
        raise ValueError("Expected returns cannot be empty.")
    if covariance_matrix is None or covariance_matrix.empty:
        raise ValueError("Covariance matrix cannot be empty.")

    tickers = list(expected_returns.index)
    num_assets = len(tickers)

    best_score = -np.inf
    best_weights = None

    cov = covariance_matrix.values
    mu = expected_returns.values

    for _ in range(n_portfolios):
        weights = np.random.random(num_assets)
        weights /= np.sum(weights)

        port_return = np.dot(weights, mu)
        port_vol = np.sqrt(np.dot(weights.T, np.dot(cov, weights)))

        if port_vol == 0:
            continue

        if max_volatility is not None and port_vol > max_volatility:
            continue
        if min_return is not None and port_return < min_return:
            continue

        if objective == "sharpe":
            score = (port_return - risk_free_rate) / port_vol
        elif objective == "max_return":
            score = port_return
        elif objective == "min_volatility":
            score = -port_vol
        elif objective == "utility":
            score = port_return - risk_aversion * (port_vol ** 2)
        else:
            raise ValueError(f"Unknown objective: {objective}")

        if score > best_score:
            best_score = score
            best_weights = weights

    if best_weights is None:
        raise RuntimeError("Failed to find optimal portfolio weights.")

    best_weights = best_weights / best_weights.sum()

    return {tickers[i]: float(best_weights[i]) for i in range(num_assets)}
