"""
Layer 2 — Training Script

1. Runs vocab mining (if not already done)
2. Balanced-samples the dataset
3. Extracts Layer-1 features for every sample
4. Trains an XGBoost classifier with cross-validation
5. Saves the model + scaler to models/
"""

import os
import sys
import time

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from config import (
    CV_FOLDS,
    DATASET_PATH,
    MODEL_PATH,
    MODELS_DIR,
    SCALER_PATH,
    TRAINING_BALANCED_SAMPLE,
    VOCAB_PATH,
    XGBOOST_PARAMS,
)
import feature_extractor
import vocab_miner


def _balanced_sample(df: pd.DataFrame, per_class: int) -> pd.DataFrame:
    ai_df = df[df["label"] == 1]
    human_df = df[df["label"] == 0]

    n_ai = min(len(ai_df), per_class)
    n_human = min(len(human_df), per_class)
    n = min(n_ai, n_human)

    print(f"[train] Balanced sample: {n} per class (AI avail={len(ai_df)}, Human avail={len(human_df)})")
    sampled = pd.concat([
        ai_df.sample(n=n, random_state=42),
        human_df.sample(n=n, random_state=42),
    ], ignore_index=True)
    return sampled.sample(frac=1, random_state=42).reset_index(drop=True)


def _extract_features_batch(texts: pd.Series) -> np.ndarray:
    total = len(texts)
    features = []
    t0 = time.time()
    for i, text in enumerate(texts):
        features.append(feature_extractor.extract_array(str(text)))
        if (i + 1) % 1000 == 0 or i + 1 == total:
            elapsed = time.time() - t0
            rate = (i + 1) / elapsed
            eta = (total - i - 1) / rate
            print(f"  [{i+1}/{total}] {rate:.0f} samples/s  ETA {eta:.0f}s")
    return np.vstack(features)


def train(dataset_path: str | None = None):
    dataset_path = dataset_path or DATASET_PATH
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Step 0 — vocab mining
    if not os.path.exists(VOCAB_PATH):
        print("[train] Running vocab mining first …")
        vocab_miner.mine(dataset_path=dataset_path)
    else:
        print(f"[train] Vocab already exists at {VOCAB_PATH}")

    # Step 1 — load + balance
    print(f"[train] Loading dataset from {dataset_path} …")
    df = pd.read_csv(dataset_path)
    df = df.dropna(subset=["text", "label"])
    df = _balanced_sample(df, TRAINING_BALANCED_SAMPLE)

    # Step 2 — extract features
    print("[train] Extracting features …")
    X = _extract_features_batch(df["text"])
    y = df["label"].values

    # Step 3 — scale
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Step 4 — train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y,
    )

    # Step 5 — cross-validation
    print(f"[train] Running {CV_FOLDS}-fold cross-validation …")
    clf = XGBClassifier(**XGBOOST_PARAMS)
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=42)
    cv_scores = cross_val_score(clf, X_train, y_train, cv=cv, scoring="roc_auc")
    print(f"[train] CV AUC-ROC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Step 6 — final fit
    print("[train] Training final model …")
    clf.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    # Step 7 — evaluate
    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)[:, 1]

    print("\n" + "=" * 60)
    print("TEST SET EVALUATION")
    print("=" * 60)
    print(f"  Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"  Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"  Recall:    {recall_score(y_test, y_pred):.4f}")
    print(f"  F1:        {f1_score(y_test, y_pred):.4f}")
    print(f"  AUC-ROC:   {roc_auc_score(y_test, y_prob):.4f}")
    print()
    print(classification_report(y_test, y_pred, target_names=["Human", "AI"]))

    # Step 8 — save
    joblib.dump(clf, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"[train] Model saved to {MODEL_PATH}")
    print(f"[train] Scaler saved to {SCALER_PATH}")

    # Feature importance
    print("\n[train] Feature importances:")
    importances = clf.feature_importances_
    for name, imp in sorted(
        zip(feature_extractor.FEATURE_NAMES, importances),
        key=lambda x: x[1],
        reverse=True,
    ):
        print(f"  {name:30s} {imp:.4f}")


if __name__ == "__main__":
    train()
