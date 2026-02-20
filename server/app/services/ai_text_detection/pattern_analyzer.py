#type:ignore
"""
Layer 3 — Pattern Recognition ("Logic" Layer)

Uses a lightweight sentence-transformer (all-MiniLM-L6-v2, ~80 MB) to
detect two AI tells:

  1. **Semantic Drift** — AI text stays "too on-topic"; consecutive
     paragraphs have unusually uniform similarity.
  2. **Logic Loops** — AI restates the prompt's premise mid-response.
     Detected via cosine similarity between the assignment prompt (or
     the first sentence as proxy) and text segments.
"""

import re

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from config import (
    EMBEDDING_MODEL,
    LOGIC_LOOP_SIMILARITY_THRESHOLD,
    SEGMENT_WORD_COUNT,
)

_model: SentenceTransformer | None = None


def _ensure_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)


def _split_paragraphs(text: str) -> list[str]:
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if len(paras) < 2:
        sents = re.split(r'(?<=[.!?])\s+', text.strip())
        if len(sents) >= 4:
            mid = len(sents) // 2
            paras = [" ".join(sents[:mid]), " ".join(sents[mid:])]
    return paras if paras else [text]


def _chunk_by_words(text: str, chunk_size: int = SEGMENT_WORD_COUNT) -> list[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        c = " ".join(words[i : i + chunk_size])
        if c:
            chunks.append(c)
    return chunks if chunks else [text]


def _semantic_drift(paragraphs: list[str]) -> dict:
    """
    Measure how uniformly "on-topic" the text stays across paragraphs.
    Returns drift_uniformity (low std = AI-like) and first_last_similarity.
    """
    _ensure_model()

    if len(paragraphs) < 2:
        return {"drift_uniformity": 0.0, "first_last_sim": 0.0}

    embeddings = _model.encode(paragraphs, show_progress_bar=False)
    sim_matrix = cosine_similarity(embeddings)

    consecutive_sims = []
    for i in range(len(paragraphs) - 1):
        consecutive_sims.append(float(sim_matrix[i, i + 1]))

    drift_uniformity = 1.0 - float(np.std(consecutive_sims)) if len(consecutive_sims) > 1 else 0.5
    first_last_sim = float(sim_matrix[0, -1])

    return {
        "drift_uniformity": drift_uniformity,
        "first_last_sim": first_last_sim,
    }


def _logic_loops(text: str, assignment_prompt: str | None = None) -> dict:
    """
    Detect segments that closely mirror the premise / prompt.
    If no prompt is given, the first sentence is used as a proxy.
    """
    _ensure_model()

    if assignment_prompt is None:
        first_sent_match = re.match(r'^(.+?[.!?])\s', text)
        assignment_prompt = first_sent_match.group(1) if first_sent_match else text[:200]

    chunks = _chunk_by_words(text)
    if not chunks:
        return {"loop_score": 0.0}

    prompt_emb = _model.encode([assignment_prompt], show_progress_bar=False)
    chunk_embs = _model.encode(chunks, show_progress_bar=False)

    sims = cosine_similarity(prompt_emb, chunk_embs)[0]
    loop_flags = sims > LOGIC_LOOP_SIMILARITY_THRESHOLD
    loop_score = float(loop_flags.sum() / len(chunks))

    return {"loop_score": loop_score}


def analyze(text: str, assignment_prompt: str | None = None) -> dict:
    """
    Run full Layer-3 analysis.  Returns:
        {
            "drift_uniformity": float,   # closer to 1.0 → AI-like
            "first_last_sim":   float,   # high → AI-like
            "loop_score":       float,   # fraction of segments echoing the prompt
        }
    """
    paragraphs = _split_paragraphs(text)
    drift = _semantic_drift(paragraphs)
    loops = _logic_loops(text, assignment_prompt)

    return {**drift, **loops}
