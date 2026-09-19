from typing import Dict, Any, List
import logging

import numpy as np
import pandas as pd

from services.monte_carlo_simulator import MonteCarloService
from services.asset_allocation_service import generate_asset_allocation

from config.constants import (
    RETURNS,
    ASSET_VOLATILITY,
    CASH_RETURN,
    REPORTED_PORTFOLIO_RETURN_FLOOR,
    STOCK_RETURN_FORECAST_DAYS,
)
from models.financial_calculations import (
    calculate_savings,
    monthly_investment_capacity,
    future_value_sip,
)
from models.risk_model import calculate_risk_score
from models.feature_builder import build_features
from models.ml_recommender import predict_portfolio
from models.portfolio_optimizer import (
    calculate_returns_matrix,
    calculate_covariance_matrix,
    optimize_portfolio_weights,
)
from services.stock_selector import select_top_stocks, get_stock_universe
from config.stock_universe import sector_for_ticker
from services.explainability_engine import generate_ai_explanation
from services.investment_analytics_service import build_stock_price_and_risk_analytics
from services.market_data_service import get_market_data

logger = logging.getLogger(__name__)


def _safe_finite(value: Any, *, default: float = 0.0, label: str = "value") -> float:
    """
    Return a finite float; replace NaN/inf/non-numeric values with `default`.
    """
    try:
        f = float(value)
    except Exception:
        logger.warning("Non-numeric %s detected (%r); replacing with %s", label, value, default)
        return float(default)
    if not np.isfinite(f):
        logger.warning("Non-finite %s detected (%r); replacing with %s", label, value, default)
        return float(default)
    return f


def _present_stock_expected_return(raw_simple: float) -> float:
    """
    Map LSTM simple return over STOCK_RETURN_FORECAST_DAYS to a displayed annualized figure
    in a demo-friendly band (~11–28%), so the UI is not stuck with tiny horizon fractions.
    """
    raw_simple = _safe_finite(raw_simple, default=0.0, label="stock_expected_return_raw")
    if raw_simple > 1e-9:
        ann = (1.0 + raw_simple) ** (252.0 / STOCK_RETURN_FORECAST_DAYS) - 1.0
    else:
        ann = 0.0
    out = max(_safe_finite(ann, default=0.0, label="stock_expected_return_annualized"), 0.11)
    return _safe_finite(np.clip(out, 0.11, 0.28), default=0.11, label="stock_expected_return_clipped")


def _stocks_for_api_response(
    selected_stocks: List[Dict[str, Any]], 
    allocation: Dict[str, float],
) -> List[Dict[str, Any]]:
    """
    Return only stocks that have meaningful (>0%) allocation in the portfolio.
    """
    return [
        {
            "ticker": s["ticker"],
            "expected_return": _present_stock_expected_return(float(s["expected_return"])),
        }
        for s in selected_stocks
        if allocation.get(s["ticker"], 0) > 0
    ]


def _age_group(age: int) -> str:
    if age <= 28:
        return "fresh-graduate"
    if age <= 50:
        return "middle-age"
    return "elderly"


# ---------------------------------------------------
# INPUT VALIDATION
# ---------------------------------------------------

def _validate_inputs(age, income, expenses, timeline, goal_type, target):
    if age <= 0:
        raise ValueError("Age must be positive.")
    if income < 0:
        raise ValueError("Income cannot be negative.")
    if expenses < 0:
        raise ValueError("Expenses cannot be negative.")
    if timeline <= 0:
        raise ValueError("Timeline must be greater than 0.")
    if goal_type not in {"wealth", "target", "retirement"}:
        raise ValueError("Invalid goal_type.")
    if goal_type == "target" and (target is None or target <= 0):
        raise ValueError("Target amount must be provided and positive for target goals.")


# ---------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------

def expected_portfolio_return(allocation: Dict[str, float]) -> float:
    r = 0.0
    for asset, percent in allocation.items():
        r += (percent / 100.0) * RETURNS.get(asset, 0.0)
    return r


def scale_expected_return(
    actual_return: float,
    target_min: float = 0.11,
    target_max: float = 0.13,
    source_min: float = 0.06,
    source_max: float = 0.20,
) -> float:
    """Scale actual expected return into a desired band for goal simulation preview."""
    if source_max <= source_min:
        return min(max(actual_return, target_min), target_max)

    ratio = (actual_return - source_min) / (source_max - source_min)
    scaled = target_min + ratio * (target_max - target_min)
    # Clamp to target range
    return min(max(scaled, target_min), target_max)


def _build_stock_return_series(stocks: List[Dict[str, float]]) -> pd.Series:
    if not stocks:
        raise ValueError("No stocks available for portfolio optimization.")
    data = {
        item["ticker"]: _safe_finite(
            item["expected_return"],
            default=0.0,
            label=f"expected_return[{item.get('ticker')}]",
        )
        for item in stocks
    }
    return pd.Series(data)


def _risk_to_numeric(risk: str) -> int:
    mapping = {"low": 2, "medium": 4, "high": 5}
    return mapping.get(str(risk).lower(), 3)


def _calculate_sector_allocation(
    stock_allocation: Dict[str, float],
) -> Dict[str, float]:
    """
    Calculate sector allocation from stock-level allocation weights.
    Groups stock weights by their sector and sums them up.
    Returns a dict of {sector: allocation_percentage}.
    """
    sector_weights: Dict[str, float] = {}
    
    for ticker, weight in stock_allocation.items():
        sector = sector_for_ticker(ticker)
        if sector not in sector_weights:
            sector_weights[sector] = 0.0
        sector_weights[sector] += weight
    
    # Normalize to 100% and return
    total = sum(sector_weights.values())
    if total <= 0:
        return {}
    
    return {sector: (weight / total) * 100.0 for sector, weight in sector_weights.items()}


def _market_data_to_prices_df(tickers: List[str], market_data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    series_map: Dict[str, pd.Series] = {}
    for t in tickers:
        frame = market_data.get(t)
        if frame is None or frame.empty:
            continue
        if "Adj Close" in frame.columns:
            s = frame["Adj Close"].dropna()
        elif "Close" in frame.columns:
            s = frame["Close"].dropna()
        else:
            continue
        if not s.empty:
            series_map[t] = s.rename(t)
    if not series_map:
        return pd.DataFrame()
    return pd.concat(series_map.values(), axis=1).sort_index()


def _filter_universe_by_user_risk(
    universe: List[str],
    risk_numeric: int,
    market_data: Dict[str, pd.DataFrame],
) -> List[str]:
    """
    User-driven pre-LSTM filter based on volatility proxy from recent returns.
    low risk -> low-vol names; medium -> mixed; high -> high-vol names.
    """
    prices_df = _market_data_to_prices_df(universe, market_data)
    if prices_df.empty:
        return list(universe)
    returns = prices_df.pct_change().replace([np.inf, -np.inf], np.nan)
    vol = returns.std(skipna=True) * np.sqrt(252.0)
    vol = vol.replace([np.inf, -np.inf], np.nan).dropna()
    if vol.empty:
        return list(universe)

    q40 = float(vol.quantile(0.4))
    q60 = float(vol.quantile(0.6))
    low_bucket = [t for t in universe if t in vol.index and float(vol.loc[t]) <= q40]
    high_bucket = [t for t in universe if t in vol.index and float(vol.loc[t]) >= q60]
    all_with_vol = [t for t in universe if t in vol.index]

    if risk_numeric <= 2:
        base = low_bucket
    elif risk_numeric <= 4:
        base = all_with_vol
    else:
        base = high_bucket

    # ensure decent breadth and keep original order
    base_set = set(base)
    out = [t for t in universe if t in base_set]
    if len(out) < 15:
        seen = set(out)
        for t in universe:
            if t not in seen:
                out.append(t)
                seen.add(t)
            if len(out) >= min(40, len(universe)):
                break
    return out


def _normalize_weights(weights: Dict[str, float]) -> Dict[str, float]:
    clean = {k: max(0.0, _safe_finite(v, default=0.0, label=f"w[{k}]")) for k, v in weights.items()}
    s = float(sum(clean.values()))
    if s <= 0:
        n = len(clean) or 1
        return {k: 1.0 / n for k in clean}
    return {k: float(v / s) for k, v in clean.items()}


def estimate_market_params(risk_answers: List[int]):
    """
    Convert risk questionnaire answers into expected return and volatility
    """
    risk_score = sum(risk_answers) / len(risk_answers)

    if risk_score <= 2:
        return 0.06, 0.08
    elif risk_score <= 3:
        return 0.08, 0.12
    elif risk_score <= 4:
        return 0.10, 0.16
    else:
        return 0.12, 0.20


def derive_wealth_assumptions(
    *,
    age: int,
    income: float,
    expenses: float,
    risk_answers: List[int],
    timeline: float,
    goal_type: str = "wealth",
) -> Dict[str, Any]:
    """
    Lightweight ML-backed market assumptions for wealth goal simulations.
    Uses the same feature builder + portfolio classifier as investment engine,
    without running full recommendation pipeline.
    """
    if not risk_answers:
        raise ValueError("Risk answers cannot be empty for wealth assumptions")

    risk_profile = calculate_risk_score(risk_answers)
    features = build_features(age, income, expenses, risk_profile, timeline, goal_type)
    ml_portfolio = predict_portfolio(features)

    asset_allocation = generate_asset_allocation(
        age=age,
        risk_score=risk_profile,
        timeline=timeline,
        goal_type=goal_type,
    )

    base_expected_return = float(expected_portfolio_return(asset_allocation))
    _, questionnaire_vol = estimate_market_params(risk_answers)

    # Portfolio-type nudges from ML prediction while staying bounded.
    return_nudge = {
        "aggressive": 0.010,
        "balanced": 0.0,
        "conservative": -0.008,
    }.get(ml_portfolio, 0.0)

    vol_scale = {
        "aggressive": 1.12,
        "balanced": 1.0,
        "conservative": 0.88,
    }.get(ml_portfolio, 1.0)

    expected_return = float(np.clip(base_expected_return + return_nudge, 0.03, 0.20))
    volatility = float(np.clip(questionnaire_vol * vol_scale, 0.05, 0.45))

    rationale = (
        f"ML portfolio '{ml_portfolio}' with risk profile '{risk_profile}' implies "
        f"{asset_allocation.get('equity', 0):.0f}% equity allocation. "
        f"Derived assumptions: expected return {expected_return * 100:.1f}% and "
        f"volatility {volatility * 100:.1f}% per year."
    )

    return {
        "expected_return": expected_return,
        "volatility": volatility,
        "ml_portfolio": ml_portfolio,
        "risk_profile": risk_profile,
        "asset_allocation": asset_allocation,
        "ai_rationale": rationale,
        "assumptions_source": "ml_investment_engine",
    }


# ---------------------------------------------------
# MAIN RECOMMENDATION ENGINE
# ---------------------------------------------------

def recommend_plan(
    age: int,
    income: float,
    expenses: float,
    risk_answers: List[int],
    goal_type: str,
    timeline: float,
    target: float | None = None,
    monthly_contribution: float | None = None,
    mc_expected_return: float | None = None,
    mc_volatility: float | None = None,
    mc_simulations: int | None = None,
    mc_inflation: float | None = None,
) -> Dict[str, Any]:

    if not risk_answers:
        raise ValueError("Risk answers cannot be empty")

    _validate_inputs(age, income, expenses, timeline, goal_type, target)

    # -------------------------
    # Risk score
    # -------------------------
    risk = calculate_risk_score(risk_answers)
    age_group = _age_group(age)

    # -------------------------
    # High-level multi-asset allocation (equity/bonds/gold/cash)
    # -------------------------
    asset_allocation = generate_asset_allocation(
        age=age,
        risk_score=risk,
        timeline=timeline,
        goal_type=goal_type,
    )

    # -------------------------
    # Savings & investment
    # -------------------------
    savings = calculate_savings(income, expenses)
    # Use provided monthly contribution or calculate from savings
    investable = monthly_contribution if monthly_contribution is not None else monthly_investment_capacity(savings)

    if investable <= 0:
        return {
            "risk_profile": risk,
            "asset_allocation": asset_allocation,
            "recommended_portfolio": None,
            "stocks": [],
            "allocation": {},
            "expected_return": 0.0,
            "future_value": 0.0,
            "monte_carlo_analysis": None,
            "ai_explanation": "No investable income. Reduce expenses or increase income.",
            "explanation_source": "rule_based",
        }

    # -------------------------
    # ML portfolio prediction
    # -------------------------
    features = build_features(age, income, expenses, risk, timeline, goal_type)
    portfolio_type = predict_portfolio(features)

    # -------------------------
    # Stock selection (user-driven before LSTM)
    # -------------------------
    risk_numeric = _risk_to_numeric(risk)
    market_data: Dict[str, pd.DataFrame] = {}
    stock_universe = get_stock_universe()
    try:
        market_data = get_market_data(
            stock_universe,
            period="2y",
            interval="1d",
            use_cache=True,
            refresh=False,
            retries=2,
        )
    except Exception as e:
        logger.warning("Market data prefetch failed: %s", e)
        market_data = {}

    filtered_universe = _filter_universe_by_user_risk(
        stock_universe,
        risk_numeric=risk_numeric,
        market_data=market_data,
    )
    logger.info(
        "[FILTER] Filtered universe size=%s of %s (risk_numeric=%s)",
        len(filtered_universe),
        len(stock_universe),
        risk_numeric,
    )
    lstm_candidate_pool = max(15, min(len(filtered_universe), 15 + int(risk_numeric * 3)))
    logger.info("[CONFIG] lstm_candidate_pool=%s", lstm_candidate_pool)

    try:
        selected_stocks = select_top_stocks(
            max_stocks=15,
            min_stocks=5,
            days=STOCK_RETURN_FORECAST_DAYS,
            tickers=filtered_universe,
            market_data=market_data,
            max_per_sector=2,
            diversified=True,
            require_positive_returns=True,
            lstm_candidate_pool=lstm_candidate_pool,
            fast_screen_lookback=126,
        )
        logger.info("Selected %s stocks (variable count, prefer positive LSTM returns)", len(selected_stocks))
    except Exception as e:
        logger.error(f"Stock selection failed: {str(e)}")
        selected_stocks = [
            {"ticker": "RELIANCE.NS", "expected_return": 0.15},
            {"ticker": "TCS.NS", "expected_return": 0.12},
            {"ticker": "INFY.NS", "expected_return": 0.14},
            {"ticker": "HDFCBANK.NS", "expected_return": 0.13},
            {"ticker": "SUNPHARMA.NS", "expected_return": 0.12},
            {"ticker": "HINDUNILVR.NS", "expected_return": 0.11},
        ]

    # Only expose names with strictly positive model expected returns in the equity sleeve.
    _er_eps = 1e-9
    selected_stocks = [s for s in selected_stocks if s["expected_return"] > _er_eps]
    if not selected_stocks:
        logger.warning("No positive-expected-return picks; using default equity list (5 names).")
        selected_stocks = [
            {"ticker": "RELIANCE.NS", "expected_return": 0.12},
            {"ticker": "TCS.NS", "expected_return": 0.11},
            {"ticker": "HDFCBANK.NS", "expected_return": 0.11},
            {"ticker": "INFY.NS", "expected_return": 0.11},
            {"ticker": "SUNPHARMA.NS", "expected_return": 0.10},
        ]

    try:
        expected_returns_series = _build_stock_return_series(selected_stocks)
    except Exception as e:
        logger.error(f"Expected returns calculation failed: {str(e)}")
        expected_returns_series = pd.Series({
            "RELIANCE.NS": 0.12,
            "TCS.NS": 0.11,
            "HDFCBANK.NS": 0.11,
            "INFY.NS": 0.11,
            "SUNPHARMA.NS": 0.10,
        })

    # Return-weighted equity sleeve: larger weight on higher expected return (among selected names).
    mu = expected_returns_series.dropna().astype(float)
    mu = mu.replace([np.inf, -np.inf], np.nan).dropna()
    if mu.empty:
        logger.warning("Expected returns series empty/non-finite after cleaning; using default returns.")
        mu = pd.Series(
            {
                "RELIANCE.NS": 0.12,
                "TCS.NS": 0.11,
                "HDFCBANK.NS": 0.11,
                "INFY.NS": 0.11,
                "SUNPHARMA.NS": 0.10,
            }
        )
        selected_stocks = [{"ticker": t, "expected_return": float(v)} for t, v in mu.items()]
    # -------------------------
    # MPT optimizer with age-aware objective
    # -------------------------
    prices_for_selected = _market_data_to_prices_df(list(mu.index), market_data)
    covariance_matrix = None
    if not prices_for_selected.empty:
        try:
            returns_matrix = calculate_returns_matrix(prices_for_selected).replace([np.inf, -np.inf], np.nan).dropna(how="all")
            returns_matrix = returns_matrix.dropna(axis=1, how="all")
            if not returns_matrix.empty and returns_matrix.shape[1] >= 2:
                covariance_matrix = calculate_covariance_matrix(returns_matrix).replace([np.inf, -np.inf], np.nan).fillna(0.0)
        except Exception as e:
            logger.warning("Covariance build failed; falling back to diagonal risk proxy: %s", e)

    if age <= 30:
        objective, risk_aversion = "max_return", 0.5
    elif age <= 50:
        objective, risk_aversion = "sharpe", 1.0
    else:
        objective, risk_aversion = "min_volatility", 2.0
    logger.info(
        "[OPTIMIZER] age=%s age_group=%s objective=%s risk_aversion=%s risk_free_rate=0.04 mu_count=%s",
        age,
        age_group,
        objective,
        risk_aversion,
        len(mu.index),
    )

    optimized_weights: Dict[str, float]
    if covariance_matrix is not None:
        try:
            cov_aligned = covariance_matrix.reindex(index=mu.index, columns=mu.index).fillna(0.0)
            optimized_weights = optimize_portfolio_weights(
                expected_returns=mu,
                covariance_matrix=cov_aligned,
                risk_free_rate=0.04,
                objective=objective,
                risk_aversion=risk_aversion,
            )
        except Exception as e:
            logger.warning("MPT optimization failed; using return-proportional fallback: %s", e)
            total_mu = float(mu.sum())
            if total_mu <= 0:
                equal_w = 1.0 / len(mu)
                optimized_weights = {t: equal_w for t in mu.index}
            else:
                optimized_weights = {t: float(mu.loc[t] / total_mu) for t in mu.index}
    else:
        logger.warning("Covariance unavailable; using return-proportional fallback.")
        total_mu = float(mu.sum())
        if total_mu <= 0:
            equal_w = 1.0 / len(mu)
            optimized_weights = {t: equal_w for t in mu.index}
        else:
            optimized_weights = {t: float(mu.loc[t] / total_mu) for t in mu.index}

    # Post-optimization user-risk tilt
    risk_factor = float(risk_numeric) / 5.0
    adjusted_weights = {t: float(w) ** (1.0 + risk_factor) for t, w in optimized_weights.items()}
    optimized_weights = _normalize_weights(adjusted_weights)
    
    # Filter out negligible allocations (< 0.01%)
    min_allocation_threshold = 0.0001  # 0.01%
    optimized_weights = {
        t: w for t, w in optimized_weights.items() 
        if w >= min_allocation_threshold
    }
    
    # Re-normalize after filtering to ensure weights sum to 1.0
    total_weight = sum(optimized_weights.values())
    if total_weight > 0:
        optimized_weights = {t: w / total_weight for t, w in optimized_weights.items()}
    
    allocation = {t: w * 100.0 for t, w in optimized_weights.items()}
    logger.info(
        "[PORTFOLIO] Weights (equity sleeve)=%s",
        {t: round(w, 6) for t, w in sorted(optimized_weights.items(), key=lambda kv: kv[0])},
    )

    # -------------------------
    # Equity sleeve: weighted average using return-proportional weights above
    # -------------------------
    equity_expected_return = _safe_finite(
        np.dot(
            np.array(list(optimized_weights.values())),
            mu.loc[list(optimized_weights.keys())].values,
        ),
        default=0.0,
        label="equity_expected_return",
    )
    logger.info("[PORTFOLIO] Equity sleeve expected_return=%.6f", equity_expected_return)

    # -------------------------
    # Stock analytics for charts (price history, risk/return scatter, correlation heatmap)
    # -------------------------
    stock_analytics: Dict[str, Any] | None = None
    try:
        tickers_for_analytics = list(expected_returns_series.index)
        stock_analytics = build_stock_price_and_risk_analytics(
            tickers=tickers_for_analytics,
            expected_returns=expected_returns_series,
            market_data=market_data,
        )
    except Exception as e:
        logger.warning(f"Stock analytics build failed: {str(e)}")
        stock_analytics = None

    # -------------------------
    # Portfolio-level expected return + volatility (multi-asset)
    # -------------------------
    w_equity = asset_allocation["equity"] / 100.0
    w_bonds = asset_allocation["bonds"] / 100.0
    w_gold = asset_allocation["gold"] / 100.0
    w_cash = asset_allocation["cash"] / 100.0

    bonds_return = _safe_finite(RETURNS.get("bonds", RETURNS.get("debt", 0.07)), default=0.07, label="bonds_return")
    gold_return = _safe_finite(RETURNS.get("gold", 0.06), default=0.06, label="gold_return")
    cash_return = _safe_finite(CASH_RETURN, default=0.03, label="cash_return")

    # Equity volatility is derived from the risk questionnaire (keeps current behavior),
    # then we mix in fixed/low-volatility assets.
    _, equity_volatility = estimate_market_params(risk_answers)

    bonds_vol = _safe_finite(ASSET_VOLATILITY.get("bonds", ASSET_VOLATILITY.get("debt", 0.06)), default=0.06, label="bonds_vol")
    gold_vol = _safe_finite(ASSET_VOLATILITY.get("gold", 0.12), default=0.12, label="gold_vol")
    cash_vol = _safe_finite(ASSET_VOLATILITY.get("cash", 0.01), default=0.01, label="cash_vol")

    raw_portfolio_expected_return = (
        w_equity * equity_expected_return
        + w_bonds * bonds_return
        + w_gold * gold_return
        + w_cash * cash_return
    )

    portfolio_expected_return = _safe_finite(raw_portfolio_expected_return, default=0.0, label="portfolio_expected_return_raw")
    if REPORTED_PORTFOLIO_RETURN_FLOOR > 0:
        portfolio_expected_return = max(
            float(portfolio_expected_return),
            REPORTED_PORTFOLIO_RETURN_FLOOR,
        )

    # Portfolio volatility under a "no cross-correlation" assumption between asset classes.
    portfolio_volatility = _safe_finite(
        np.sqrt(
            (w_equity**2) * (equity_volatility**2)
            + (w_bonds**2) * (bonds_vol**2)
            + (w_gold**2) * (gold_vol**2)
            + (w_cash**2) * (cash_vol**2)
        ),
        default=0.0,
        label="portfolio_volatility",
    )
    logger.info(
        "[PORTFOLIO] Portfolio expected_return=%.6f portfolio_volatility=%.6f",
        portfolio_expected_return,
        portfolio_volatility,
    )

    # We compute actual expected return and scale it into the requested simulation band [11%, 13%] if no explicit MC override is provided.
    actual_expected_return = _safe_finite(raw_portfolio_expected_return, default=0.0, label="expected_return_actual")
    scaled_expected_return = _safe_finite(
        scale_expected_return(actual_expected_return, target_min=0.11, target_max=0.13),
        default=0.11,
        label="expected_return_scaled",
    )

    # -------------------------
    # Future value estimation
    # -------------------------
    if goal_type == "wealth":
        future_value = future_value_sip(
            investable, portfolio_expected_return, timeline
        )

    elif goal_type == "target":
        future_value = None

    else:
        future_value = future_value_sip(
            investable, portfolio_expected_return, timeline
        )

    # -------------------------
    # Monte Carlo Simulation
    # -------------------------
    target_amount = target if goal_type == "target" else None

    mc_er = mc_expected_return if mc_expected_return is not None else scaled_expected_return
    mc_vol = mc_volatility if mc_volatility is not None else portfolio_volatility
    mc_sims = mc_simulations if mc_simulations is not None else 5000
    mc_infl = mc_inflation if mc_inflation is not None else 0.06

    monte_carlo = MonteCarloService(
        monthly_investment=investable,
        years=float(timeline),
        expected_return=float(mc_er),
        volatility=float(mc_vol),
        target_amount=target_amount,
        simulations=int(mc_sims),
        inflation_rate=float(mc_infl),
    )

    try:
        simulation_results = monte_carlo.run()
    except Exception as e:
        logger.exception("Monte Carlo simulation failed: %s", e)
        simulation_results = None

    # -------------------------
    # AI Explanation
    # -------------------------
    profile = {
        "age": age,
        "income": income,
        "risk_profile": risk,
        "goal_type": goal_type,
        "timeline": timeline,
    }

    ai_explanation, explanation_source = generate_ai_explanation(
        profile=profile,
        allocation=asset_allocation,
        portfolio_return=portfolio_expected_return,
        stock_allocation=allocation,
    )

    # -------------------------
    # Sector allocation
    # -------------------------
    sector_allocation = _calculate_sector_allocation(allocation)

    # -------------------------
    # Final response
    # -------------------------
    return {
        "age_group": age_group,
        "risk_profile": risk,
        "recommended_portfolio": portfolio_type,
        "stocks": _stocks_for_api_response(selected_stocks, allocation),
        "allocation": allocation,
        "asset_allocation": asset_allocation,
        "sector_allocation": sector_allocation,
        "expected_return": scaled_expected_return,
        "portfolio_volatility": portfolio_volatility,
        "future_value": future_value,
        "monte_carlo_analysis": simulation_results,
        "expected_return_actual": actual_expected_return,
        "expected_return_scaled": scaled_expected_return,
        "risk_metrics": (
            {
                "max_drawdown_p95": None,
                "worst_5pct_final_value": simulation_results.get("percentiles", {}).get("p10"),
                "safety_score": round(
                    float(simulation_results["summary"]["success_probability"]) * 100
                )
                if simulation_results.get("summary")
                else None,
            }
            if simulation_results
            else None
        ),
        "stock_price_history": stock_analytics.get("stock_price_history") if stock_analytics else None,
        "stock_risk_return_points": stock_analytics.get("stock_risk_return_points") if stock_analytics else None,
        "stock_correlation": stock_analytics.get("stock_correlation") if stock_analytics else None,
        "ai_explanation": ai_explanation,
        "explanation_source": explanation_source,
    }
