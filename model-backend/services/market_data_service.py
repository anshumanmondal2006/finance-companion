from __future__ import annotations

import logging
import os
import time
from typing import Dict, List

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)


_MEM_CACHE: dict[tuple[str, str, str], tuple[float, pd.DataFrame]] = {}


def _default_cache_dir() -> str:
    base_dir = os.path.dirname(os.path.dirname(__file__))  # model-backend/
    return os.path.join(base_dir, ".cache", "market_data")


def _safe_filename(name: str) -> str:
    return name.replace("/", "_").replace("\\", "_").replace(":", "_")


def _cache_path(cache_dir: str, ticker: str, period: str, interval: str) -> str:
    safe = _safe_filename(ticker)
    return os.path.join(cache_dir, f"{safe}_{period}_{interval}.pkl")


def _extract_ticker_frame(download_df: pd.DataFrame, ticker: str) -> pd.DataFrame | None:
    if download_df is None or download_df.empty:
        return None

    if isinstance(download_df.columns, pd.MultiIndex):
        cols = [c for c in download_df.columns if c[1] == ticker]
        if not cols:
            return None
        out = download_df.loc[:, cols].copy()
        out.columns = [c[0] for c in out.columns]
        return out.dropna(how="all")

    # single ticker fallback path
    if "Close" in download_df.columns or "Adj Close" in download_df.columns:
        return download_df.copy().dropna(how="all")
    return None


def _read_file_cache(path: str, ttl_seconds: int) -> pd.DataFrame | None:
    if not os.path.exists(path):
        return None
    age = time.time() - os.path.getmtime(path)
    if age > ttl_seconds:
        return None
    try:
        df = pd.read_pickle(path)
        if isinstance(df, pd.DataFrame) and not df.empty:
            return df
    except Exception:
        return None
    return None


def _write_file_cache(path: str, df: pd.DataFrame) -> None:
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        df.to_pickle(path)
    except Exception:
        pass


def get_market_data(
    tickers: List[str],
    *,
    period: str = "2y",
    interval: str = "1d",
    use_cache: bool = True,
    cache_ttl_seconds: int = 24 * 60 * 60,
    refresh: bool = False,
    retries: int = 2,
    retry_sleep_seconds: float = 1.0,
) -> Dict[str, pd.DataFrame]:
    """
    Centralized market data fetcher using batched yfinance download + cache.

    Returns:
        Dict[ticker, DataFrame] where DataFrame has the ticker OHLCV columns indexed by date.
    """
    unique_tickers = [t for t in dict.fromkeys(tickers) if t]
    if not unique_tickers:
        return {}

    logger.info(
        "[START] get_market_data tickers=%s period=%s interval=%s use_cache=%s refresh=%s",
        len(unique_tickers),
        period,
        interval,
        use_cache,
        refresh,
    )
    cache_dir = _default_cache_dir()
    result: Dict[str, pd.DataFrame] = {}
    missing: list[str] = []
    now = time.time()

    for t in unique_tickers:
        key = (t, period, interval)
        if use_cache and not refresh:
            mem = _MEM_CACHE.get(key)
            if mem and (now - mem[0]) <= cache_ttl_seconds:
                result[t] = mem[1]
                logger.info("[CACHE HIT - MEM] %s", t)
                continue

            file_df = _read_file_cache(
                _cache_path(cache_dir, t, period, interval), cache_ttl_seconds
            )
            if file_df is not None:
                result[t] = file_df
                _MEM_CACHE[key] = (now, file_df)
                logger.info("[CACHE HIT - FILE] %s", t)
                continue

        missing.append(t)

    if missing:
        last_err: Exception | None = None
        logger.info("[DATA FETCH] Fetching %s tickers", len(missing))
        for attempt in range(max(1, retries + 1)):
            try:
                logger.info(
                    "[DATA FETCH] yfinance attempt %s for %s tickers",
                    attempt + 1,
                    len(missing),
                )
                data = yf.download(
                    tickers=missing,
                    period=period,
                    interval=interval,
                    progress=False,
                    group_by="column",
                    threads=False,  # gentler on Yahoo + fewer request bursts
                )
                if data is None or data.empty:
                    raise ValueError("No market data returned for batch request.")

                ts = time.time()
                extracted = 0
                for t in missing:
                    frame = _extract_ticker_frame(data, t)
                    if frame is None or frame.empty:
                        continue
                    result[t] = frame
                    _MEM_CACHE[(t, period, interval)] = (ts, frame)
                    extracted += 1
                    if use_cache:
                        _write_file_cache(_cache_path(cache_dir, t, period, interval), frame)
                break
            except Exception as e:
                last_err = e
                logger.warning("[DATA FETCH] Attempt %s failed: %s", attempt + 1, e)
                if attempt < retries:
                    time.sleep(retry_sleep_seconds * (2 ** attempt))
        if last_err and not result:
            # Fail gracefully at call sites; they already have fallback behavior.
            return {}

    logger.info("[DONE] get_market_data delivered=%s tickers", len(result))
    return result

