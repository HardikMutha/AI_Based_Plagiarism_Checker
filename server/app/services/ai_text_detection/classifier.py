#type:ignore
"""
Layer 2 — XGBoost inference wrapper.

Loads the trained model + scaler once and exposes a lightweight
predict() function.  No GPU required.
"""

import os

import joblib
import numpy as np

from config import MODEL_PATH, SCALER_PATH
import feature_extractor

_model = None
_scaler = None


def _ensure_loaded():
    global _model, _scaler
    if _model is not None:
        return

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Trained model not found at {MODEL_PATH}. "
            "Run train_classifier.py first."
        )

    _model = joblib.load(MODEL_PATH)
    _scaler = joblib.load(SCALER_PATH)


def predict(features: dict[str, float]) -> dict:
    """
    Given a feature dict (from feature_extractor.extract), return
    {"probability": float, "label": int}.
    """
    _ensure_loaded()

    arr = np.array(
        [features[name] for name in feature_extractor.FEATURE_NAMES],
        dtype=np.float64,
    ).reshape(1, -1)

    arr_scaled = _scaler.transform(arr)
    prob = float(_model.predict_proba(arr_scaled)[0, 1])
    label = int(prob >= 0.5)

    return {"probability": prob, "label": label}


def predict_text(text: str) -> dict:
    """Convenience: extract features then predict in one call."""
    features = feature_extractor.extract(text)
    return predict(features)

if(__name__=="__main__"):
    text = """"""
    data = predict_text(text)
    print(data)