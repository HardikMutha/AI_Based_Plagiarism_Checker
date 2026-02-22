#type:ignore
"""
Layer 2  XGBoost inference wrapper.

Loads the trained model + scaler once and exposes a lightweight
predict() function.  No GPU required.
"""

import os

import joblib
import numpy as np

import feature_extractor


class AiTextClassifier:
    def __init__(self,model_path,scaler_path):
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.model = None
        self.scaler = None

    def _ensure_loaded(self):
        if self.model is not None:
            return

        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Trained model not found at {self.model_path}. "
                "Run train_classifier.py first."
            )

        self.model = joblib.load(self.model_path)
        self.scaler = joblib.load(self.scaler_path)


    def predict(self,features: dict[str, float]) -> dict:
        self._ensure_loaded()

        arr = np.array(
            [features[name] for name in feature_extractor.FEATURE_NAMES],
            dtype=np.float64,
        ).reshape(1, -1)

        arr_scaled = self.scaler.transform(arr)
        prob = float(self.model.predict_proba(arr_scaled)[0, 1])
        label = int(prob >= 0.5)

        return {"probability": prob, "label": label}


    def predict_text(self,text: str) -> dict:
        """Convenience: extract features then predict in one call."""
        features = feature_extractor.extract(text)
        return self.predict(features)
