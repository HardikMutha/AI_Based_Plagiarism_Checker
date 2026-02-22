#type:ignore
"""
AI Text Detector  Pipeline

Orchestrates the 3 detection layers and produces a final verdict.
Automatically chunks large documents (~1000 words per chunk) so that
Layers 1+2 run per-chunk while Layer 3 runs on the full text.

Usage:
    from detector import detect
    result = detect("Some essay text …", assignment_prompt="Write about X")
"""

import re

import numpy as np

import classifier
import feature_extractor
import pattern_analyzer
from config import (
    CHUNK_WORD_LIMIT,
    MIN_CHUNK_WORDS,
    VERDICT_THRESHOLDS,
    WEIGHT_HEURISTIC,
    WEIGHT_ML,
    WEIGHT_PATTERN,
    MODEL_PATH,
    SCALER_PATH,
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


def _split_oversized_paragraph(
    para: str,
    target_words: int,
    min_words: int,
) -> list[str]:
    """Break a single large paragraph into sentence-aligned pieces."""
    sentences = re.split(r'(?<=[.!?])\s+', para)
    segments: list[str] = []
    current: list[str] = []
    current_wc = 0

    for sent in sentences:
        swc = len(sent.split())
        if current_wc + swc > target_words and current_wc >= min_words:
            segments.append(" ".join(current))
            current = [sent]
            current_wc = swc
        else:
            current.append(sent)
            current_wc += swc

    if current:
        tail = " ".join(current)
        if segments and current_wc < min_words:
            segments[-1] += " " + tail
        else:
            segments.append(tail)

    return segments if segments else [para]


def _chunk_text(
    text: str,
    target_words: int = CHUNK_WORD_LIMIT,
    min_words: int = MIN_CHUNK_WORDS,
) -> list[str]:
    """
    Split *text* into chunks of roughly *target_words*.

    Strategy:
      1. Split on paragraph boundaries (double newlines).
      2. Any paragraph that still exceeds *target_words* is sub-split at
         sentence boundaries so PDF-extracted text (which often lacks
         double-newline breaks) is handled correctly.
      3. The resulting segments are grouped into ~*target_words* chunks.
      4. A trailing chunk smaller than *min_words* is merged into the
         previous chunk so the feature extractor has enough signal.
    """
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not paragraphs:
        return [text]

    segments: list[str] = []
    for para in paragraphs:
        if len(para.split()) <= target_words:
            segments.append(para)
        else:
            segments.extend(
                _split_oversized_paragraph(para, target_words, min_words)
            )

    chunks: list[str] = []
    current_parts: list[str] = []
    current_wc = 0

    for seg in segments:
        seg_wc = len(seg.split())

        if current_wc + seg_wc > target_words and current_wc >= min_words:
            chunks.append("\n\n".join(current_parts))
            current_parts = [seg]
            current_wc = seg_wc
        else:
            current_parts.append(seg)
            current_wc += seg_wc

    if current_parts:
        tail = "\n\n".join(current_parts)
        if chunks and current_wc < min_words:
            chunks[-1] += "\n\n" + tail
        else:
            chunks.append(tail)

    return chunks if chunks else [text]


def _detect_single(
    text: str,
    assignment_prompt: str | None,
    clf: classifier.AiTextClassifier,
) -> dict:
    """Run the full 3-layer pipeline on a single (small) text."""
    features = feature_extractor.extract(text)
    ml_result = clf.predict(features)
    pattern_result = pattern_analyzer.analyze(text, assignment_prompt)
    heuristic = _heuristic_score(features)

    final_score = _combine_scores(ml_result["probability"], pattern_result, heuristic)

    explanations = _generate_explanations(
        features, ml_result["probability"], pattern_result, heuristic, final_score
    )

    return {
        "score": round(final_score, 4),
        "verdict": _categorize(final_score),
        "chunks_analyzed": 1,
        "chunk_scores": [],
        "layer_details": {
            "texture_features": features,
            "ml_probability": ml_result["probability"],
            "pattern_scores": pattern_result,
            "heuristic_score": heuristic,
        },
        "explanations": explanations,
    }


def detect(text: str, assignment_prompt: str | None = None) -> dict:
    """
    Run the full 3-layer detection pipeline.

    For documents longer than CHUNK_WORD_LIMIT (~1000 words) the text is
    split into paragraph-aligned chunks.  Layers 1 + 2 are evaluated
    per-chunk and aggregated via a word-count-weighted average, while
    Layer 3 (semantic patterns) runs on the full document so that
    global signals like drift and first/last similarity are preserved.

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
        score           - float 0.0 (human) to 1.0 (AI)
        verdict         - "Likely Human" | "Review Recommended" | "Likely AI"
        chunks_analyzed - number of chunks processed
        chunk_scores    - per-chunk score breakdown (empty when single-pass)
        layer_details   - per-layer breakdown for explainability
        explanations    - { conclusions: [...], summary: str }
    """
    clf = classifier.AiTextClassifier(MODEL_PATH, SCALER_PATH)

    word_count = len(text.split())
    if word_count <= CHUNK_WORD_LIMIT:
        return _detect_single(text, assignment_prompt, clf)

    chunks = _chunk_text(text)
    if len(chunks) == 1:
        return _detect_single(text, assignment_prompt, clf)

    # ── Layers 1 + 2: per-chunk ──────────────────────────────────────
    chunk_data: list[dict] = []
    chunk_word_counts: list[int] = []

    for chunk in chunks:
        wc = len(chunk.split())
        features = feature_extractor.extract(chunk)
        ml_result = clf.predict(features)
        heuristic = _heuristic_score(features)
        chunk_data.append({
            "features": features,
            "ml_prob": ml_result["probability"],
            "heuristic": heuristic,
        })
        chunk_word_counts.append(wc)

    total_words = sum(chunk_word_counts)
    weights = [wc / total_words for wc in chunk_word_counts]

    avg_ml_prob = sum(
        d["ml_prob"] * w for d, w in zip(chunk_data, weights)
    )
    avg_heuristic = sum(
        d["heuristic"] * w for d, w in zip(chunk_data, weights)
    )

    avg_features: dict[str, float] = {}
    for key in chunk_data[0]["features"]:
        avg_features[key] = sum(
            d["features"][key] * w for d, w in zip(chunk_data, weights)
        )

    # ── Layer 3: full document ───────────────────────────────────────
    pattern_result = pattern_analyzer.analyze(text, assignment_prompt)

    # ── Aggregate final score ────────────────────────────────────────
    final_score = _combine_scores(avg_ml_prob, pattern_result, avg_heuristic)

    # ── Per-chunk breakdown for transparency ─────────────────────────
    chunk_scores: list[dict] = []
    for i, (d, wc, chunk_text) in enumerate(
        zip(chunk_data, chunk_word_counts, chunks)
    ):
        cs = _combine_scores(d["ml_prob"], pattern_result, d["heuristic"])
        chunk_scores.append({
            "chunk_index": i,
            "word_count": wc,
            "score": round(cs, 4),
            "verdict": _categorize(cs),
            "text": chunk_text,
        })

    explanations = _generate_explanations(
        avg_features, avg_ml_prob, pattern_result, avg_heuristic, final_score
    )

    return {
        "score": round(final_score, 4),
        "verdict": _categorize(final_score),
        "chunks_analyzed": len(chunks),
        "chunk_scores": chunk_scores,
        "layer_details": {
            "texture_features": avg_features,
            "ml_probability": avg_ml_prob,
            "pattern_scores": pattern_result,
            "heuristic_score": avg_heuristic,
        },
        "explanations": explanations,
    }
