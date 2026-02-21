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


def _generate_explanations(
    features: dict[str, float],
    ml_prob: float,
    pattern_scores: dict[str, float],
    heuristic: float,
    final_score: float,
) -> dict:
    """
    Produce rule-based explanations from all layers.

    Returns { "conclusions": [{ severity, signal, text }], "summary": str }
    """
    conclusions: list[dict] = []

    def add(severity: str, signal: str, text: str):
        conclusions.append({"severity": severity, "signal": signal, "text": text})

    # ── Vocabulary markers ────────────────────────────────────────
    if features["ai_transition_density"] > 0.02:
        add("high", "ai_transition_density",
            "The text contains a high density of AI-typical transition words "
            "(furthermore, moreover, additionally, etc.). These words appear "
            "disproportionately in LLM outputs.")
    elif features["ai_transition_density"] > 0.01:
        add("medium", "ai_transition_density",
            "Some AI-typical transition words were detected. While not conclusive "
            "alone, this contributes to the overall signal.")

    if features["hedge_phrase_density"] > 0.1:
        add("high", "hedge_phrase_density",
            "Frequent hedging phrases ('it is important to note', 'it's worth "
            "mentioning') are present. These formulaic expressions are a "
            "hallmark of AI-generated text.")
    elif features["hedge_phrase_density"] > 0.03:
        add("medium", "hedge_phrase_density",
            "Some hedging phrases characteristic of AI writing were found, "
            "though at moderate levels.")

    if features["filler_ratio"] > 0.02:
        add("medium", "filler_ratio",
            "The text contains filler phrases ('in the realm of', 'plays a "
            "crucial role') that are characteristic of AI writing.")

    # ── Style markers ─────────────────────────────────────────────
    if features["em_dash_density"] > 0.3:
        add("high", "em_dash_density",
            "Em-dashes (\u2014) are overused. This Unicode punctuation is "
            "extremely common in AI-generated text but rare in human writing.")

    if features.get("emoji_density", 0.0) > 0.5:
        add("high", "emoji_density",
            "Emojis were found in the text. In formal or academic writing, "
            "this is a strong indicator of AI generation, especially from "
            "conversational assistants.")

    if features["oxford_comma_consistency"] > 0.9:
        add("medium", "oxford_comma_consistency",
            "Oxford comma usage is near-perfectly consistent. AI models apply "
            "punctuation rules rigidly, whereas humans are typically less consistent.")

    if features.get("markdown_density", 0.0) > 0.15:
        add("high", "markdown_density",
            "The text contains significant markdown formatting (headers, bullets, "
            "bold). AI assistants heavily use markdown even when not explicitly "
            "requested.")
    elif features.get("markdown_density", 0.0) > 0.05:
        add("medium", "markdown_density",
            "Some markdown formatting was detected. While not conclusive, AI "
            "assistants tend to insert formatting more than human writers.")

    # ── Rhythm markers ────────────────────────────────────────────
    if features["syllable_variance"] < 0.12:
        add("high", "syllable_variance",
            "Syllable patterns across sentences are unusually uniform \u2014 a "
            "'metronomic' rhythm typical of AI-generated prose, where every "
            "sentence has a similar cadence.")
    elif features["syllable_variance"] < 0.20:
        add("medium", "syllable_variance",
            "Sentence rhythm shows moderate uniformity in syllable patterns. "
            "Human writing typically exhibits more varied cadence.")

    if features["sentence_length_variance"] < 4.0:
        add("medium", "sentence_length_variance",
            "Sentence lengths are remarkably consistent. AI tends to produce "
            "sentences of similar length, while human writing naturally varies.")

    if features["paragraph_length_variance"] < 5.0 and features.get("paragraph_count_norm", 0.0) > 0.5:
        add("low", "paragraph_length_variance",
            "Paragraph lengths are very uniform, which can indicate "
            "templated generation by an AI model.")

    # ── Pattern markers (Layer 3) ─────────────────────────────────
    drift = pattern_scores.get("drift_uniformity", 0.0)
    first_last = pattern_scores.get("first_last_sim", 0.0)
    loop = pattern_scores.get("loop_score", 0.0)

    if drift > 0.9:
        add("high", "drift_uniformity",
            "The text maintains unusually consistent semantic focus throughout. "
            "AI-generated text rarely drifts off-topic, while human writing "
            "naturally wanders and varies in focus.")
    elif drift > 0.8:
        add("medium", "drift_uniformity",
            "Semantic coherence between paragraphs is moderately high. The "
            "text stays quite consistently on-topic, which is more common "
            "in AI-generated content.")

    if first_last > 0.7:
        add("medium", "first_last_sim",
            "The opening and closing paragraphs are semantically very similar. "
            "AI models tend to 'bookend' their responses by restating initial "
            "ideas in the conclusion.")

    if loop > 0.3:
        add("high", "loop_score",
            "Multiple text segments closely echo the initial premise, indicating "
            "circular reasoning. This 'logic loop' pattern is characteristic of "
            "AI that keeps returning to its starting point.")
    elif loop > 0.1:
        add("medium", "loop_score",
            "Some text segments mirror the initial premise. This mild repetition "
            "of the core argument is sometimes seen in AI-generated text.")

    # ── ML model ──────────────────────────────────────────────────
    if ml_prob > 0.7:
        add("high", "ml_probability",
            "The XGBoost classifier strongly indicates AI authorship based on "
            "the combination of all 20 texture features.")
    elif ml_prob > 0.5:
        add("medium", "ml_probability",
            "The ML classifier detects moderate signals of AI authorship from "
            "the combined texture features.")

    # ── Heuristic layer ───────────────────────────────────────────
    if heuristic > 0.7:
        add("high", "heuristic_score",
            "Multiple strong individual AI markers (em-dashes, transition words, "
            "low syllable variance, extreme punctuation consistency) triggered "
            "the rule-based heuristic layer.")
    elif heuristic > 0.4:
        add("medium", "heuristic_score",
            "Some individual AI markers triggered the rule-based heuristic, "
            "though not overwhelmingly so.")

    # ── Summary ───────────────────────────────────────────────────
    high_count = sum(1 for c in conclusions if c["severity"] == "high")
    med_count = sum(1 for c in conclusions if c["severity"] == "medium")

    if final_score >= 0.65:
        summary = (
            f"This text exhibits {high_count} strong and {med_count} moderate "
            f"AI indicators across vocabulary, style, rhythm, and semantic "
            f"pattern analysis. The combination of these signals strongly "
            f"suggests the text was generated by an AI."
        )
    elif final_score >= 0.35:
        summary = (
            f"The analysis detected {high_count + med_count} notable signals. "
            f"While some patterns align with AI generation, the evidence is "
            f"not conclusive \u2014 the text may be human-written with some AI "
            f"assistance, or written by someone following rigid stylistic "
            f"conventions."
        )
    else:
        if not conclusions:
            summary = (
                "No significant AI generation indicators were detected. The "
                "writing style, vocabulary, and structural patterns are all "
                "consistent with human-authored text."
            )
        else:
            summary = (
                "Only minor signals were detected. The text predominantly "
                "exhibits characteristics of human-written prose, with "
                "natural variation in style and structure."
            )

    return {"conclusions": conclusions, "summary": summary}


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
        explanations  - { conclusions: [...], summary: str }
    """
    features = feature_extractor.extract(text)

    classifier_model = classifier.AiTextClassifier(MODEL_PATH, SCALER_PATH)

    ml_result = classifier_model.predict(features)

    pattern_result = pattern_analyzer.analyze(text, assignment_prompt)

    heuristic = _heuristic_score(features)

    final_score = _combine_scores(ml_result["probability"], pattern_result, heuristic)

    explanations = _generate_explanations(
        features, ml_result["probability"], pattern_result, heuristic, final_score
    )

    return {
        "score": round(final_score, 4),
        "verdict": _categorize(final_score),
        "layer_details": {
            "texture_features": features,
            "ml_probability": ml_result["probability"],
            "pattern_scores": pattern_result,
            "heuristic_score": heuristic,
        },
        "explanations": explanations,
    }
