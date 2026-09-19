from __future__ import annotations

import math
from typing import Any

import numpy as np


def _is_bad_number(x: Any) -> bool:
    try:
        v = float(x)
    except Exception:
        return False
    return math.isnan(v) or math.isinf(v)


def clean_nan(obj: Any) -> Any:
    """
    Recursively sanitize response objects for strict JSON serialization.

    - NaN -> None
    - +inf/-inf -> None
    """
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    if isinstance(obj, tuple):
        return tuple(clean_nan(v) for v in obj)
    if isinstance(obj, np.ndarray):
        return [clean_nan(v) for v in obj.tolist()]
    if _is_bad_number(obj):
        return None
    return obj

