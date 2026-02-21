"""
Trained ML model for AI-generated code detection.

Uses the 19 structural + textual signals as features and learns optimal
weights from a labeled dataset instead of relying on hand-tuned weights.

Two model tiers:
  1. LogisticModel – pure-Python, no dependencies, ships pre-trained coefficients.
  2. GBTModel      – scikit-learn GradientBoostingClassifier (optional, higher accuracy).

Train with:
    python -m code_plagiarism_detector.ai_model --train dataset.csv --out model_weights.json
"""
from __future__ import annotations

import csv
import json
import math
import os
import random
from pathlib import Path
from typing import Optional

# ── Feature ordering (must match dataset columns) ───────────────────
FEATURE_NAMES: list[str] = [
    "depth_uniformity",
    "low_entropy",
    "subtree_symmetry",
    "error_handling_density",
    "func_size_uniformity",
    "branching_consistency",
    "pattern_repetition",
    "guard_clause_ratio",
    "comment_pattern",
    "naming_convention",
    "docstring_density",
    "import_style",
    "variable_name_entropy",
    "code_to_logic_ratio",
    "line_length_uniformity",
    "f_string_consistency",
    "emoji_usage",
    "em_dash_usage",
]


# =====================================================================
#  Pure-Python Logistic Regression (no external dependencies)
# =====================================================================
class LogisticModel:
    """
    Logistic regression trained via mini-batch SGD.

    After training, coefficients are exported to JSON so the detector
    can load them at runtime without needing scikit-learn.
    """

    def __init__(self) -> None:
        self.weights: list[float] = [0.0] * len(FEATURE_NAMES)
        self.bias: float = 0.0
        self.feature_means: list[float] = [0.0] * len(FEATURE_NAMES)
        self.feature_stds: list[float] = [1.0] * len(FEATURE_NAMES)
        self.trained: bool = False

    # ── Prediction ──────────────────────────────────────────────────
    @staticmethod
    def _sigmoid(z: float) -> float:
        z = max(-500.0, min(500.0, z))
        return 1.0 / (1.0 + math.exp(-z))

    def predict_proba(self, features: dict[str, float]) -> float:
        """Return P(AI-generated) given a feature dict."""
        x = [(features.get(f, 0.0) - self.feature_means[i]) / max(self.feature_stds[i], 1e-9)
             for i, f in enumerate(FEATURE_NAMES)]
        z = self.bias + sum(w * xi for w, xi in zip(self.weights, x))
        return self._sigmoid(z)

    # ── Training ────────────────────────────────────────────────────
    def fit(
        self,
        X: list[list[float]],
        y: list[int],
        *,
        lr: float = 0.05,
        epochs: int = 500,
        batch_size: int = 32,
        l2_lambda: float = 0.01,
        val_split: float = 0.15,
        patience: int = 30,
        verbose: bool = True,
    ) -> dict[str, list[float]]:
        """
        Train via mini-batch SGD with L2 regularisation and early stopping.

        Returns a dict with 'train_loss' and 'val_loss' history.
        """
        n_features = len(FEATURE_NAMES)
        assert all(len(row) == n_features for row in X)

        # Standardise features (store mean/std for inference)
        self.feature_means = [
            sum(row[j] for row in X) / len(X) for j in range(n_features)
        ]
        self.feature_stds = [
            max(
                math.sqrt(
                    sum((row[j] - self.feature_means[j]) ** 2 for row in X) / len(X)
                ),
                1e-9,
            )
            for j in range(n_features)
        ]
        X_norm = [
            [(row[j] - self.feature_means[j]) / self.feature_stds[j] for j in range(n_features)]
            for row in X
        ]

        # Train / validation split
        combined = list(zip(X_norm, y))
        random.shuffle(combined)
        split_idx = max(1, int(len(combined) * (1 - val_split)))
        train_data = combined[:split_idx]
        val_data = combined[split_idx:]

        # Initialise weights (Xavier-like)
        scale = 1.0 / math.sqrt(n_features)
        self.weights = [random.gauss(0, scale) for _ in range(n_features)]
        self.bias = 0.0

        history: dict[str, list[float]] = {"train_loss": [], "val_loss": []}
        best_val_loss = float("inf")
        best_weights = list(self.weights)
        best_bias = self.bias
        no_improve = 0

        for epoch in range(epochs):
            random.shuffle(train_data)

            # Mini-batch SGD
            for start in range(0, len(train_data), batch_size):
                batch = train_data[start: start + batch_size]
                grad_w = [0.0] * n_features
                grad_b = 0.0

                for xi, yi in batch:
                    z = self.bias + sum(w * x for w, x in zip(self.weights, xi))
                    pred = self._sigmoid(z)
                    err = pred - yi
                    for j in range(n_features):
                        grad_w[j] += err * xi[j]
                    grad_b += err

                m = len(batch)
                for j in range(n_features):
                    self.weights[j] -= lr * (grad_w[j] / m + l2_lambda * self.weights[j])
                self.bias -= lr * grad_b / m

            # Compute losses
            train_loss = self._log_loss(train_data)
            val_loss = self._log_loss(val_data) if val_data else train_loss
            history["train_loss"].append(train_loss)
            history["val_loss"].append(val_loss)

            if val_loss < best_val_loss - 1e-5:
                best_val_loss = val_loss
                best_weights = list(self.weights)
                best_bias = self.bias
                no_improve = 0
            else:
                no_improve += 1

            if verbose and epoch % 50 == 0:
                print(f"  Epoch {epoch:4d}  train_loss={train_loss:.4f}  val_loss={val_loss:.4f}")

            if no_improve >= patience:
                if verbose:
                    print(f"  Early stopping at epoch {epoch}")
                break

        self.weights = best_weights
        self.bias = best_bias
        self.trained = True
        return history

    def _log_loss(self, data: list[tuple[list[float], int]]) -> float:
        eps = 1e-15
        loss = 0.0
        for xi, yi in data:
            z = self.bias + sum(w * x for w, x in zip(self.weights, xi))
            p = self._sigmoid(z)
            p = max(eps, min(1 - eps, p))
            loss -= yi * math.log(p) + (1 - yi) * math.log(1 - p)
        return loss / max(len(data), 1)

    # ── Serialisation ───────────────────────────────────────────────
    def save(self, path: str) -> None:
        data = {
            "model_type": "logistic",
            "feature_names": FEATURE_NAMES,
            "weights": self.weights,
            "bias": self.bias,
            "feature_means": self.feature_means,
            "feature_stds": self.feature_stds,
        }
        Path(path).write_text(json.dumps(data, indent=2))

    def load(self, path: str) -> None:
        data = json.loads(Path(path).read_text())
        self.weights = data["weights"]
        self.bias = data["bias"]
        self.feature_means = data["feature_means"]
        self.feature_stds = data["feature_stds"]
        self.trained = True

    def feature_importances(self) -> dict[str, float]:
        """Return absolute weight per feature (after standardisation)."""
        imp = {f: abs(w) for f, w in zip(FEATURE_NAMES, self.weights)}
        total = sum(imp.values()) or 1.0
        return {f: round(v / total, 4) for f, v in sorted(imp.items(), key=lambda x: -x[1])}


# =====================================================================
#  Optional: scikit-learn Gradient Boosting wrapper
# =====================================================================
class GBTModel:
    """
    Gradient Boosted Tree model (requires scikit-learn).

    Higher accuracy than LogisticModel but adds a dependency.
    Falls back to LogisticModel if sklearn is not installed.
    """

    def __init__(self) -> None:
        self.model = None
        self.trained = False
        self._sklearn_available = False
        try:
            from sklearn.ensemble import GradientBoostingClassifier
            self._sklearn_available = True
        except ImportError:
            pass

    def fit(self, X: list[list[float]], y: list[int], verbose: bool = True) -> dict:
        if not self._sklearn_available:
            raise ImportError("scikit-learn is required for GBTModel. Install with: pip install scikit-learn")

        from sklearn.ensemble import GradientBoostingClassifier
        from sklearn.model_selection import cross_val_score
        import numpy as np

        X_arr = np.array(X)
        y_arr = np.array(y)

        self.model = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.1,
            subsample=0.8,
            min_samples_split=5,
            min_samples_leaf=3,
            random_state=42,
        )

        # Cross-validated score
        cv_scores = cross_val_score(self.model, X_arr, y_arr, cv=5, scoring="roc_auc")
        if verbose:
            print(f"  GBT 5-fold CV AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

        self.model.fit(X_arr, y_arr)
        self.trained = True

        return {
            "cv_auc_mean": float(cv_scores.mean()),
            "cv_auc_std": float(cv_scores.std()),
        }

    def predict_proba(self, features: dict[str, float]) -> float:
        if not self.trained or self.model is None:
            raise RuntimeError("Model not trained. Call fit() first.")
        import numpy as np
        x = np.array([[features.get(f, 0.0) for f in FEATURE_NAMES]])
        return float(self.model.predict_proba(x)[0][1])

    def feature_importances(self) -> dict[str, float]:
        if not self.trained or self.model is None:
            return {}
        imp = dict(zip(FEATURE_NAMES, self.model.feature_importances_))
        return {f: round(v, 4) for f, v in sorted(imp.items(), key=lambda x: -x[1])}

    def save(self, path: str) -> None:
        import pickle
        with open(path, "wb") as f:
            pickle.dump(self.model, f)

    def load(self, path: str) -> None:
        import pickle
        with open(path, "rb") as f:
            self.model = pickle.load(f)
        self.trained = True


# =====================================================================
#  Dataset loading utility
# =====================================================================
def load_dataset(csv_path: str) -> tuple[list[list[float]], list[int], list[str]]:
    """
    Load dataset CSV and return (X, y, languages).

    Expected columns: problem_id, language, label, <18 feature columns>, ai_probability
    The 'label' column is the ground truth (1 = AI, 0 = human).
    """
    X: list[list[float]] = []
    y: list[int] = []
    languages: list[str] = []

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            features = [float(row.get(fname, 0.0)) for fname in FEATURE_NAMES]
            label = int(row["label"])
            lang = row.get("language", "unknown")
            X.append(features)
            y.append(label)
            languages.append(lang)

    return X, y, languages


# =====================================================================
#  CLI: train and evaluate
# =====================================================================
def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Train AI detection model")
    parser.add_argument("--train", required=True, help="Path to labelled CSV dataset")
    parser.add_argument("--out", default="model_weights.json", help="Output path for model weights")
    parser.add_argument("--model", choices=["logistic", "gbt", "both"], default="both",
                        help="Which model(s) to train")
    parser.add_argument("--epochs", type=int, default=500)
    parser.add_argument("--lr", type=float, default=0.05)
    args = parser.parse_args()

    print(f"Loading dataset from {args.train}...")
    X, y, languages = load_dataset(args.train)
    print(f"  {len(X)} samples, {sum(y)} AI-generated, {len(y) - sum(y)} human")
    print(f"  Languages: { {l: languages.count(l) for l in set(languages)} }")

    if args.model in ("logistic", "both"):
        print("\n── Training Logistic Regression ──")
        model = LogisticModel()
        model.fit(X, y, lr=args.lr, epochs=args.epochs)

        # Evaluation
        correct = 0
        for xi, yi in zip(X, y):
            features = dict(zip(FEATURE_NAMES, xi))
            pred = 1 if model.predict_proba(features) >= 0.5 else 0
            if pred == yi:
                correct += 1
        print(f"  Training accuracy: {correct / len(X):.4f}")
        print(f"  Feature importances: {model.feature_importances()}")

        out_path = args.out
        model.save(out_path)
        print(f"  Saved to {out_path}")

    if args.model in ("gbt", "both"):
        print("\n── Training Gradient Boosted Trees ──")
        try:
            gbt = GBTModel()
            result = gbt.fit(X, y)
            print(f"  Feature importances: {gbt.feature_importances()}")

            gbt_path = args.out.replace(".json", "_gbt.pkl")
            gbt.save(gbt_path)
            print(f"  Saved to {gbt_path}")
        except ImportError as e:
            print(f"  Skipped: {e}")


if __name__ == "__main__":
    main()