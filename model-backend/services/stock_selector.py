from __future__ import annotations

import logging
import os
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any
from threading import Lock

import numpy as np
import pandas as pd

from config.stock_universe import DIVERSIFIED_UNIVERSE_TICKERS, sector_for_ticker
from models.stock_forecaster import (
    load_or_train_lstm_model,
    predict_future_prices,
    compute_expected_return,
)

logger = logging.getLogger(__name__)

# Treat LSTM outputs at or below this as non-positive for portfolio inclusion.
_POSITIVE_RETURN_EPS = 1e-9
_DEFAULT_LSTM_MAX_WORKERS = int((os.environ.get("LSTM_MAX_WORKERS") or "6").strip() or "6")
_PREDICTION_CACHE: dict[tuple[str, str, int], float] = {}
_PREDICTION_CACHE_LOCK = Lock()

# Fallback expected returns in case of API failures
FALLBACK_EXPECTED_RETURNS = {
    "RELIANCE.NS": 0.15,
    "TCS.NS": 0.12,
    "INFY.NS": 0.14,
    "HDFCBANK.NS": 0.13,
    "ICICIBANK.NS": 0.12,
    "HINDUNILVR.NS": 0.11,
    "SBIN.NS": 0.10,
    "BHARTIARTL.NS": 0.09,
    "KOTAKBANK.NS": 0.13,
    "AXISBANK.NS": 0.12,
}


def get_stock_universe() -> List[str]:
    """
    ~100 liquid NSE names across sectors (energy, IT, pharma, banks, etc.).
    Used as the screening set before picking a smaller top-N portfolio.
    """
    return list(DIVERSIFIED_UNIVERSE_TICKERS)


def pick_diversified_top(
    ranked: List[Dict[str, float]],
    n: int,
    max_per_sector: int,
) -> List[Dict[str, float]]:
    """
    Greedy pick from pre-sorted (desc expected_return) list while capping each sector.
    If fewer than n names pass the cap, fill with the next best names regardless of sector.
    """
    if n <= 0:
        return []
    counts: dict[str, int] = defaultdict(int)
    out: List[Dict[str, float]] = []
    for row in ranked:
        sec = sector_for_ticker(row["ticker"])
        if counts[sec] < max_per_sector:
            out.append(row)
            counts[sec] += 1
            if len(out) >= n:
                return out
    seen = {r["ticker"] for r in out}
    for row in ranked:
        if row["ticker"] in seen:
            continue
        out.append(row)
        seen.add(row["ticker"])
        if len(out) >= n:
            break
    return out[:n]


def fast_momentum_score(prices: pd.Series, lookback: int = 126) -> float:
    """
    Cheap screen: trailing total return over ``lookback`` trading days (~6 months at 126).
    Used to shrink the universe before LSTM. Returns -inf if data is insufficient.
    """
    s = prices.dropna()
    if len(s) < lookback + 1:
        return float("-inf")
    start = float(s.iloc[-lookback])
    end = float(s.iloc[-1])
    if start <= 0 or end <= 0:
        return float("-inf")
    return (end / start) - 1.0


def _pick_lstm_candidates(
    universe: List[str],
    prices_df: pd.DataFrame,
    pool_size: int,
    lookback: int,
) -> List[str]:
    """Order universe by fast momentum; keep top ``pool_size`` tickers that have data."""
    scored: List[tuple[str, float]] = []
    for t in universe:
        if t not in prices_df.columns:
            continue
        scored.append((t, fast_momentum_score(prices_df[t], lookback)))
    scored.sort(key=lambda x: x[1], reverse=True)
    picked = [t for t, sc in scored[:pool_size] if sc > float("-inf")]
    if len(picked) < pool_size:
        seen = set(picked)
        for t in universe:
            if t not in seen and t in prices_df.columns:
                picked.append(t)
                if len(picked) >= pool_size:
                    break
    return picked[:pool_size]


def _rank_stocks_lstm(
    tickers: List[str],
    prices_df: pd.DataFrame,
    days: int,
    *,
    refresh: bool,
) -> List[Dict[str, float]]:
    """LSTM forecast expected return for each ticker (prices already loaded)."""
    ranked: List[Dict[str, float]] = []

    for ticker in tickers:
        try:
            if ticker not in prices_df.columns:
                logger.debug("Ticker %s not in downloaded data. Using fallback.", ticker)
                ranked.append({
                    "ticker": ticker,
                    "expected_return": FALLBACK_EXPECTED_RETURNS.get(ticker, 0.10),
                })
                continue

            prices = prices_df[ticker].dropna()
            if prices.empty:
                logger.debug("No price data for %s. Using fallback.", ticker)
                ranked.append({
                    "ticker": ticker,
                    "expected_return": FALLBACK_EXPECTED_RETURNS.get(ticker, 0.10),
                })
                continue

            model, scaler = load_or_train_lstm_model(ticker, prices, refresh=refresh)

            predicted_prices = predict_future_prices(
                model=model,
                scaler=scaler,
                recent_prices=prices,
                days=days,
            )

            if len(predicted_prices) == 0:
                logger.debug("No predictions for %s. Using fallback.", ticker)
                ranked.append({
                    "ticker": ticker,
                    "expected_return": FALLBACK_EXPECTED_RETURNS.get(ticker, 0.10),
                })
                continue

            current_price = float(prices.iloc[-1])
            predicted_price = float(predicted_prices[-1])

            if current_price <= 0:
                logger.warning("Invalid current price for %s: %s", ticker, current_price)
                ranked.append({
                    "ticker": ticker,
                    "expected_return": FALLBACK_EXPECTED_RETURNS.get(ticker, 0.10),
                })
                continue

            expected_ret = compute_expected_return(current_price, predicted_price)

            ranked.append(
                {
                    "ticker": ticker,
                    "expected_return": float(expected_ret),
                }
            )

        except Exception as e:
            logger.warning("Error processing %s: %s. Using fallback.", ticker, e)
            ranked.append({
                "ticker": ticker,
                "expected_return": FALLBACK_EXPECTED_RETURNS.get(ticker, 0.10),
            })
            continue

    ranked.sort(key=lambda x: x["expected_return"], reverse=True)
    return ranked


def _predict_one_stock(
    ticker: str,
    prices_df: pd.DataFrame,
    *,
    days: int,
    refresh: bool,
) -> Dict[str, float]:
    """
    Compute expected return for one stock using preloaded prices (no network calls here).
    Includes per-stock cache + fallback handling.
    """
    started = time.perf_counter()
    logger.info("[LSTM] Processing %s", ticker)

    if ticker not in prices_df.columns:
        logger.warning("[FALLBACK] %s missing in prices_df", ticker)
        return {
            "ticker": ticker,
            "expected_return": FALLBACK_EXPECTED_RETURNS.get(ticker, 0.10),
        }

    prices = prices_df[ticker].dropna()
    if prices.empty:
        logger.warning("[FALLBACK] %s empty price series", ticker)
        return {
            "ticker": ticker,
            "expected_return": FALLBACK_EXPECTED_RETURNS.get(ticker, 0.10),
        }

    last_date = str(pd.to_datetime(prices.index[-1]).date())
    cache_key = (ticker, last_date, int(days))
    if not refresh:
        with _PREDICTION_CACHE_LOCK:
            cached = _PREDICTION_CACHE.get(cache_key)
        if cached is not None:
            logger.info("[CACHE HIT] %s", ticker)
            logger.info("[TIME] %s elapsed_ms=%.2f", ticker, (time.perf_counter() - started) * 1000.0)
            return {
                "ticker": ticker,
                "expected_return": float(cached),
            }

    try:
        # Model architecture/train load is cached in load_or_train_lstm_model().
        logger.info("[MODEL] Retrieving model for %s", ticker)
        model, scaler = load_or_train_lstm_model(ticker, prices, refresh=refresh)
        predicted_prices = predict_future_prices(
            model=model,
            scaler=scaler,
            recent_prices=prices,
            days=days,
        )
        if len(predicted_prices) == 0:
            raise ValueError("No predictions")

        current_price = float(prices.iloc[-1])
        predicted_price = float(predicted_prices[-1])
        if current_price <= 0:
            raise ValueError(f"Invalid current price {current_price}")

        expected_ret = float(compute_expected_return(current_price, predicted_price))
        if not np.isfinite(expected_ret):
            raise ValueError(f"Non-finite expected return {expected_ret}")

        with _PREDICTION_CACHE_LOCK:
            _PREDICTION_CACHE[cache_key] = expected_ret
        logger.info("[PREDICTION] %s -> Expected Return: %.4f", ticker, expected_ret)
        logger.info("[TIME] %s elapsed_ms=%.2f", ticker, (time.perf_counter() - started) * 1000.0)
        return {"ticker": ticker, "expected_return": expected_ret}
    except Exception as e:
        logger.warning("[FALLBACK] %s due to error: %s", ticker, e)
        logger.info("[TIME] %s elapsed_ms=%.2f", ticker, (time.perf_counter() - started) * 1000.0)
        return {
            "ticker": ticker,
            "expected_return": FALLBACK_EXPECTED_RETURNS.get(ticker, 0.10),
        }


def run_lstm_for_stocks(
    tickers: List[str],
    market_data: Dict[str, pd.DataFrame],
    *,
    days: int = 30,
    refresh: bool = False,
    max_workers: int | None = None,
) -> List[Dict[str, float]]:
    """
    Run LSTM scoring for a list of tickers using shared preloaded market_data.
    Executes in parallel with bounded workers for throughput/safety.
    """
    started = time.time()
    logger.info("[START] Running LSTM for %s stocks", len(tickers))
    prices_df = _market_data_to_prices_df(tickers=tickers, market_data=market_data)
    if prices_df.empty:
        logger.warning("run_lstm_for_stocks: no market data available; returning fallback scores.")
        return [{"ticker": t, "expected_return": FALLBACK_EXPECTED_RETURNS.get(t, 0.10)} for t in tickers]

    total = len(tickers)
    if total == 0:
        return []
    workers = max_workers or _DEFAULT_LSTM_MAX_WORKERS
    workers = max(1, min(workers, total))

    out: List[Dict[str, float]] = []
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        fut_map = {
            ex.submit(_predict_one_stock, t, prices_df, days=days, refresh=refresh): t
            for t in tickers
        }
        for fut in as_completed(fut_map):
            row = fut.result()
            done += 1
            logger.info("[PROGRESS] LSTM %s/%s processed", done, total)
            out.append(row)

    out.sort(key=lambda x: x["expected_return"], reverse=True)
    logger.info("[DONE] Completed LSTM for %s stocks", len(tickers))
    logger.info("[TIME] Total LSTM time: %.2fs", time.time() - started)
    return out


def _market_data_to_prices_df(
    tickers: List[str],
    market_data: Dict[str, pd.DataFrame] | None,
) -> pd.DataFrame:
    """Convert ticker->OHLC DataFrames into one Date-indexed close-price frame."""
    if not market_data:
        return pd.DataFrame()
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
        series_map[t] = s.rename(t)
    if not series_map:
        return pd.DataFrame()
    return pd.concat(series_map.values(), axis=1).sort_index()


def rank_stocks(
    tickers: List[str] | None = None,
    days: int = 30,
    market_data: Dict[str, pd.DataFrame] | None = None,
    *,
    lstm_candidate_pool: int | None = 100,
    fast_screen_lookback: int = 126,
    refresh: bool = False,
) -> List[Dict[str, float]]:
    """
    Download prices once, optionally fast-screen to a smaller LSTM pool, then rank by LSTM
    expected return. Returns a list of ``{ticker, expected_return}`` sorted descending.

    When ``lstm_candidate_pool`` is set and the universe is larger, only that many names
    (top by trailing momentum) go through LSTM — much faster than scoring all ~100.

    Set ``lstm_candidate_pool=None`` to run LSTM on every ticker (slow on large universes).

    Gracefully handles Yahoo Finance failures; falls back per ticker where needed.
    """
    if tickers is None:
        tickers = get_stock_universe()

    prices_df = _market_data_to_prices_df(tickers=tickers, market_data=market_data)
    if prices_df.empty:
        logger.warning("Market data missing/empty for stock ranking. Using fallback returns.")
        return [
            {
                "ticker": ticker,
                "expected_return": FALLBACK_EXPECTED_RETURNS.get(ticker, 0.10),
            }
            for ticker in tickers
        ]

    lstm_tickers = list(tickers)
    if lstm_candidate_pool is not None and len(tickers) > lstm_candidate_pool:
        lstm_tickers = _pick_lstm_candidates(
            tickers, prices_df, lstm_candidate_pool, fast_screen_lookback
        )
        logger.info(
            "Fast momentum screen: running LSTM on %s of %s tickers (lookback=%s)",
            len(lstm_tickers),
            len(tickers),
            fast_screen_lookback,
        )

    return run_lstm_for_stocks(
        tickers=lstm_tickers,
        market_data=market_data or {},
        days=days,
        refresh=refresh,
        max_workers=_DEFAULT_LSTM_MAX_WORKERS,
    )


def select_top_stocks(
    max_stocks: int = 15,
    days: int = 30,
    tickers: List[str] | None = None,
    market_data: Dict[str, pd.DataFrame] | None = None,
    *,
    min_stocks: int = 5,
    max_per_sector: int = 2,
    diversified: bool = True,
    require_positive_returns: bool = True,
    lstm_candidate_pool: int | None = 100,
    fast_screen_lookback: int = 126,
    refresh: bool = False,
) -> List[Dict[str, float]]:
    """
    Rank the universe, then build a **variable-length** list between ``min_stocks`` and ``max_stocks``
    when enough names exist in the ranked universe.

    When ``require_positive_returns`` is True (default), only names with LSTM expected return
    strictly above zero are eligible. If that list is empty, falls back to the top ``max_stocks``
    by score (may include negatives) so the API still returns something — callers may filter again.

    If the diversified pick yields fewer than ``min_stocks`` but ``ranked`` has more names,
    additional tickers are appended in return order until ``min_stocks`` (capped at ``max_stocks``).

    **Fast screening:** Only ``lstm_candidate_pool`` names (momentum) receive full LSTM scoring.

    Args:
        max_stocks: Upper bound on how many tickers to return.
        min_stocks: Target minimum count when the ranked list has enough distinct tickers (default 5).
        days: Forecast horizon in days.
        tickers: Override universe (default: ~100 NSE names).
        max_per_sector: Max names per sector in the diversified pass.
        diversified: If False, take the best names in rank order up to the cap (still positive-filtered).
        require_positive_returns: If False, use full ranked list up to ``max_stocks``.
        lstm_candidate_pool: LSTM pool size after momentum screen; ``None`` = entire universe.
        fast_screen_lookback: Trading days for momentum screen.
        refresh: Force refresh of cached prices / models.

    Raises:
        ValueError: If ``max_stocks`` < 1 or ``min_stocks`` < 1 or ``min_stocks`` > ``max_stocks``.
    """
    if max_stocks < 1:
        raise ValueError("max_stocks must be >= 1.")
    if min_stocks < 1:
        raise ValueError("min_stocks must be >= 1.")
    if min_stocks > max_stocks:
        raise ValueError("min_stocks cannot exceed max_stocks.")

    ranked = rank_stocks(
        tickers=tickers,
        days=days,
        market_data=market_data,
        lstm_candidate_pool=lstm_candidate_pool,
        fast_screen_lookback=fast_screen_lookback,
        refresh=refresh,
    )
    logger.info("[RANKING] Total stocks ranked: %s", len(ranked))

    positive_only_pool: List[Dict[str, float]] | None = None
    if require_positive_returns:
        positive = [r for r in ranked if r["expected_return"] > _POSITIVE_RETURN_EPS]
        logger.info("[FILTER] Positive-return stocks: %s", len(positive))
        if positive:
            pool = positive
            positive_only_pool = positive
        else:
            logger.warning(
                "No stocks with positive LSTM expected return; using top %s by raw score.",
                max_stocks,
            )
            pool = ranked
    else:
        pool = ranked

    cap = min(max_stocks, len(pool))
    if cap == 0:
        return []

    want = max(min_stocks, cap)
    want = min(want, max_stocks, len(pool))

    if diversified and tickers is None:
        result = pick_diversified_top(pool, n=want, max_per_sector=max_per_sector)
    else:
        result = pool[:want]

    # Pad toward min_stocks using positive-only names when available (avoids adding negative LSTM rows).
    if len(result) < min_stocks:
        pad_source = positive_only_pool if positive_only_pool is not None else ranked
        seen = {r["ticker"] for r in result}
        for row in pad_source:
            if row["ticker"] in seen:
                continue
            result.append(row)
            seen.add(row["ticker"])
            if len(result) >= min_stocks or len(result) >= max_stocks:
                break
        result = result[:max_stocks]

    if len(result) < max_stocks and len(result) == len(pool):
        logger.info("Returning %s stocks (all eligible names within cap).", len(result))
    logger.info("[FINAL] Selected stocks: %s", [s["ticker"] for s in result])

    return result

