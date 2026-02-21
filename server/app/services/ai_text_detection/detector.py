#type:ignore
"""
AI Text Detector  Pipeline

Orchestrates the 3 detection layers and produces a final verdict.

Usage:
    from detector import detect
    result = detect("Some essay text …", assignment_prompt="Write about X")
"""

import numpy as np

import classifier
import feature_extractor
import pattern_analyzer
from config import (
    VERDICT_THRESHOLDS,
    WEIGHT_HEURISTIC,
    WEIGHT_ML,
    WEIGHT_PATTERN,
    MODEL_PATH,
    SCALER_PATH
)


def _heuristic_score(features: dict[str, float]) -> float:
    """
    Quick rule-based score from Layer-1 features that are strong AI
    indicators on their own (em-dash overuse, very low syllable variance,
    high transition-word density, extreme Oxford comma consistency).
    Returns 0.0 - 1.0.
    """
    signals: list[float] = []

    if features["em_dash_density"] > 0.3:
        signals.append(min(features["em_dash_density"] / 1.0, 1.0))

    if features["ai_transition_density"] > 0.02:
        signals.append(min(features["ai_transition_density"] / 0.06, 1.0))

    if features["syllable_variance"] < 0.15:
        signals.append(1.0 - features["syllable_variance"] / 0.15)

    if features["oxford_comma_consistency"] > 0.9:
        signals.append(features["oxford_comma_consistency"])

    if features["hedge_phrase_density"] > 0.1:
        signals.append(min(features["hedge_phrase_density"] / 0.5, 1.0))

    if features.get("emoji_density", 0.0) > 0.5:
        signals.append(min(features["emoji_density"] / 3.0, 1.0))

    if features.get("markdown_density", 0.0) > 0.15:
        signals.append(min(features["markdown_density"] / 0.6, 1.0))

    return float(np.mean(signals)) if signals else 0.0


def _combine_scores(
    ml_prob: float,
    pattern: dict[str, float],
    heuristic: float,
) -> float:
    pattern_score = (
        pattern.get("drift_uniformity", 0.5) * 0.4
        + pattern.get("first_last_sim", 0.5) * 0.3
        + pattern.get("loop_score", 0.0) * 0.3
    )

    combined = (
        WEIGHT_ML * ml_prob
        + WEIGHT_PATTERN * pattern_score
        + WEIGHT_HEURISTIC * heuristic
    )
    return float(np.clip(combined, 0.0, 1.0))


def _categorize(score: float) -> str:
    if score < VERDICT_THRESHOLDS["likely_human"]:
        return "Likely Human"
    if score < VERDICT_THRESHOLDS["review_recommended"]:
        return "Review Recommended"
    return "Likely AI"


def detect(text: str, assignment_prompt: str | None = None) -> dict:
    """
    Run the full 3-layer detection pipeline.

    Parameters
    ----------
    text : str
        The essay / assignment text to analyse.
    assignment_prompt : str, optional
        The original assignment question.  Improves Layer-3 logic-loop
        detection.  If omitted, the first sentence is used as a proxy.

    Returns
    -------
    dict with keys:
        score         - float 0.0 (human) to 1.0 (AI)
        verdict       - "Likely Human" | "Review Recommended" | "Likely AI"
        layer_details - per-layer breakdown for explainability
    """
    features = feature_extractor.extract(text)

    classifier_model = classifier.AiTextClassifier(MODEL_PATH,SCALER_PATH)

    ml_result = classifier_model.predict(features)

    pattern_result = pattern_analyzer.analyze(text, assignment_prompt)

    heuristic = _heuristic_score(features)

    final_score = _combine_scores(ml_result["probability"], pattern_result, heuristic)

    return {
        "score": round(final_score, 4),
        "verdict": _categorize(final_score),
        "layer_details": {
            "texture_features": features,
            "ml_probability": ml_result["probability"],
            "pattern_scores": pattern_result,
            "heuristic_score": heuristic,
        },
    }
