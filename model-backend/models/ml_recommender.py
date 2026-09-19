import os
from typing import Dict, Any, List

import joblib

_MODEL = None


def _get_model_path() -> str:
    base_dir = os.path.dirname(os.path.dirname(__file__))  # model-backend/
    return os.path.join(base_dir, "portfolio_model.pkl")


def _load_model():
    global _MODEL
    if _MODEL is None:
        path = _get_model_path()
        if not os.path.exists(path):
            raise FileNotFoundError(f"Trained portfolio model not found at {path}")
        _MODEL = joblib.load(path)
    return _MODEL


def _features_to_vector(features: Dict[str, Any]) -> List[float]:
    """
    Convert feature dict into a vector in the same order as training:
    age, income, expenses, risk, timeline, goal, savings_rate
    """
    keys = ["age", "income", "expenses", "risk", "timeline", "goal", "savings_rate"]
    missing = [k for k in keys if k not in features]
    if missing:
        raise ValueError(f"Missing features for model inference: {', '.join(missing)}")

    return [float(features[k]) for k in keys]


def predict_portfolio(features: Dict[str, Any]) -> str:
    """
    Predict portfolio type label given feature dict.
    """
    model = _load_model()
    vec = _features_to_vector(features)
    pred = model.predict([vec])[0]
    return str(pred)

