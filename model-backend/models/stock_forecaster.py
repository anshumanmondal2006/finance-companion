from __future__ import annotations

import os
import time
import logging
from typing import Tuple, Optional

import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dropout, Dense
from tensorflow.keras.callbacks import EarlyStopping
from services.market_data_service import get_market_data

logger = logging.getLogger(__name__)


def _default_cache_dir() -> str:
    base_dir = os.path.dirname(os.path.dirname(__file__))  # model-backend/
    return os.path.join(base_dir, ".cache")


def _safe_filename(name: str) -> str:
    return name.replace("/", "_").replace("\\", "_").replace(":", "_")


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


# Shorter history = smaller Yahoo payloads and fewer timeouts/rate-limit issues.
# ~2y of daily bars is still enough for LSTM (60-day sequences). Override with env YFINANCE_PERIOD (e.g. 1y, 3y).
DEFAULT_YF_PERIOD: str = (os.environ.get("YFINANCE_PERIOD") or "2y").strip() or "2y"


def fetch_stock_data(
    ticker: str,
    period: str = DEFAULT_YF_PERIOD,
    interval: str = "1d",
    *,
    use_cache: bool = True,
    cache_dir: Optional[str] = None,
    cache_ttl_seconds: int = 24 * 60 * 60,
    refresh: bool = False,
) -> pd.Series:
    """
    Download historical stock data using yfinance and return the adjusted close series.
    Default window is ``DEFAULT_YF_PERIOD`` (2y unless ``YFINANCE_PERIOD`` is set).
    """
    if not ticker:
        raise ValueError("Ticker symbol must be provided.")

    cache_dir = cache_dir or _default_cache_dir()
    prices_dir = os.path.join(cache_dir, "prices")
    _ensure_dir(prices_dir)

    cache_path = os.path.join(
        prices_dir, f"{_safe_filename(ticker)}_{period}_{interval}.csv"
    )

    if use_cache and not refresh and os.path.exists(cache_path):
        age = time.time() - os.path.getmtime(cache_path)
        if age <= cache_ttl_seconds:
            cached = pd.read_csv(cache_path, parse_dates=["Date"])
            cached = cached.set_index("Date")["price"].dropna()
            cached.name = ticker
            if not cached.empty:
                return cached

    data_map = get_market_data(
        [ticker],
        period=period,
        interval=interval,
        use_cache=use_cache,
        cache_ttl_seconds=cache_ttl_seconds,
        refresh=refresh,
    )
    data = data_map.get(ticker)
    if data is None or data.empty:
        raise ValueError(f"No data returned for ticker {ticker}.")

    if "Adj Close" in data.columns:
        series = data["Adj Close"].dropna()
    elif "Close" in data.columns:
        series = data["Close"].dropna()
    else:
        raise ValueError(f"No close columns returned for ticker {ticker}.")

    series = series.rename(ticker)

    if use_cache:
        df = series.reset_index()
        df.columns = ["Date", "price"]
        df.to_csv(cache_path, index=False)

    return series


def fetch_stock_data_batch(
    tickers: list[str],
    period: str = DEFAULT_YF_PERIOD,
    interval: str = "1d",
    *,
    use_cache: bool = True,
    cache_dir: Optional[str] = None,
    cache_ttl_seconds: int = 24 * 60 * 60,
    refresh: bool = False,
) -> pd.DataFrame:
    """
    Batch download prices for many tickers in one call.
    Returns DataFrame with Date index and columns = tickers.
    Uses individual-ticker cache where possible.
    """
    if not tickers:
        raise ValueError("Tickers list cannot be empty.")

    data_map = get_market_data(
        tickers=tickers,
        period=period,
        interval=interval,
        use_cache=use_cache,
        cache_ttl_seconds=cache_ttl_seconds,
        refresh=refresh,
    )
    if not data_map:
        raise ValueError("No data returned for batch download.")

    series_map: dict[str, pd.Series] = {}
    for t in tickers:
        frame = data_map.get(t)
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
        raise ValueError("No close price series available for requested tickers.")

    df = pd.concat(series_map.values(), axis=1)
    df = df.sort_index()
    return df


def prepare_lstm_data(
    prices: pd.Series,
    sequence_length: int = 60,
) -> Tuple[np.ndarray, np.ndarray, MinMaxScaler]:
    """
    Prepare scaled sequences and targets for LSTM from a price series.
    Returns:
        X: shape (samples, timesteps, 1)
        y: shape (samples, 1)
        scaler: fitted MinMaxScaler instance
    """
    if prices is None or len(prices) <= sequence_length:
        raise ValueError("Not enough price data to build sequences.")

    values = prices.values.reshape(-1, 1)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled = scaler.fit_transform(values)

    X, y = [], []
    for i in range(sequence_length, len(scaled)):
        X.append(scaled[i - sequence_length : i, 0])
        y.append(scaled[i, 0])

    X = np.array(X)
    y = np.array(y)

    X = np.reshape(X, (X.shape[0], X.shape[1], 1))
    y = y.reshape(-1, 1)

    return X, y, scaler


def _build_lstm_model(input_shape: Tuple[int, int]) -> Sequential:
    """
    Build LSTM model with the requested architecture:
    LSTM(50) -> Dropout(0.2) -> LSTM(50) -> Dense(1)
    """
    model = Sequential()
    model.add(LSTM(50, return_sequences=True, input_shape=input_shape))
    model.add(Dropout(0.2))
    model.add(LSTM(50))
    model.add(Dense(1))

    model.compile(optimizer="adam", loss="mean_squared_error")
    return model


def train_lstm_model(
    prices: pd.Series,
    sequence_length: int = 60,
    epochs: int = 20,
    batch_size: int = 32,
) -> Tuple[Sequential, MinMaxScaler]:
    """
    Train an LSTM model to predict next-day stock prices from historical prices.
    Returns the trained model and scaler.
    """
    X, y, scaler = prepare_lstm_data(prices, sequence_length=sequence_length)
    model = _build_lstm_model((X.shape[1], 1))
    callbacks = [EarlyStopping(monitor="loss", patience=3, restore_best_weights=True)]
    model.fit(X, y, epochs=epochs, batch_size=batch_size, verbose=0, callbacks=callbacks)
    return model, scaler


def predict_future_prices(
    model: Sequential,
    scaler: MinMaxScaler,
    recent_prices: pd.Series,
    days: int = 1,
    sequence_length: int = 60,
) -> np.ndarray:
    """
    Forecast future prices for a given number of days using the trained model.
    `recent_prices` should be at least `sequence_length` long.
    Returns an array of predicted prices (unscaled).
    """
    if days <= 0:
        raise ValueError("Days to predict must be positive.")

    if len(recent_prices) < sequence_length:
        raise ValueError("Not enough recent prices for prediction window.")

    values = recent_prices.values.reshape(-1, 1)
    scaled = scaler.transform(values)

    # start with the last `sequence_length` scaled values
    last_sequence = scaled[-sequence_length:].flatten().tolist()

    preds_scaled = []
    for _ in range(days):
        seq_array = np.array(last_sequence[-sequence_length:]).reshape(1, sequence_length, 1)
        pred_scaled = model.predict(seq_array, verbose=0)[0, 0]
        preds_scaled.append(pred_scaled)
        last_sequence.append(pred_scaled)

    preds_scaled = np.array(preds_scaled).reshape(-1, 1)
    preds_unscaled = scaler.inverse_transform(preds_scaled).flatten()
    return preds_unscaled


def compute_expected_return(current_price: float, predicted_price: float) -> float:
    """
    Compute expected simple return between current and predicted prices.
    """
    if current_price <= 0:
        raise ValueError("Current price must be positive.")
    return (predicted_price - current_price) / current_price


def load_or_train_lstm_model(
    ticker: str,
    prices: pd.Series,
    *,
    cache_dir: Optional[str] = None,
    refresh: bool = False,
    sequence_length: int = 60,
    epochs: int = 10,
    batch_size: int = 32,
) -> Tuple[Sequential, MinMaxScaler]:
    """
    Load cached LSTM model+scaler for a ticker when available and up-to-date,
    otherwise train and cache them.
    """
    started = time.perf_counter()
    cache_dir = cache_dir or _default_cache_dir()
    models_dir = os.path.join(cache_dir, "models")
    _ensure_dir(models_dir)

    safe = _safe_filename(ticker)
    model_path = os.path.join(models_dir, f"{safe}_lstm.keras")
    scaler_path = os.path.join(models_dir, f"{safe}_scaler.pkl")
    meta_path = os.path.join(models_dir, f"{safe}_meta.pkl")

    last_date = str(pd.to_datetime(prices.index[-1]).date()) if len(prices) else ""

    if not refresh and os.path.exists(model_path) and os.path.exists(scaler_path) and os.path.exists(meta_path):
        try:
            meta = joblib.load(meta_path)
            if isinstance(meta, dict) and meta.get("last_date") == last_date and meta.get("sequence_length") == sequence_length:
                model = load_model(model_path)
                scaler: MinMaxScaler = joblib.load(scaler_path)
                logger.info(
                    "[MODEL] Loaded cached model for %s (seq_len=%s, last_date=%s) in %.2fs",
                    ticker,
                    sequence_length,
                    last_date,
                    time.perf_counter() - started,
                )
                return model, scaler
        except Exception:
            pass

    logger.info(
        "[MODEL] Training model for %s (seq_len=%s, epochs=%s, batch_size=%s, last_date=%s)",
        ticker,
        sequence_length,
        epochs,
        batch_size,
        last_date,
    )
    model, scaler = train_lstm_model(
        prices,
        sequence_length=sequence_length,
        epochs=epochs,
        batch_size=batch_size,
    )

    try:
        model.save(model_path)
        joblib.dump(scaler, scaler_path)
        joblib.dump({"last_date": last_date, "sequence_length": sequence_length}, meta_path)
    except Exception:
        pass

    logger.info(
        "[MODEL] Trained & cached model for %s in %.2fs",
        ticker,
        time.perf_counter() - started,
    )
    return model, scaler

