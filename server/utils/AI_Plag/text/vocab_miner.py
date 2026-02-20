#type:ignore
"""
Vocabulary Miner — extracts AI-overrepresented words and phrases from
a labeled dataset using the log-likelihood ratio (G², Dunning 1993).

Run once before training.  Output is saved to models/ai_vocab.json and
consumed by feature_extractor.py at inference time.
"""

import json
import math
import os
import re
import string
from collections import Counter

import pandas as pd
from nltk.corpus import stopwords

from config import (
    DATASET_PATH,
    MODELS_DIR,
    VOCAB_MIN_FREQUENCY,
    VOCAB_MINING_SAMPLE_SIZE,
    VOCAB_PATH,
    VOCAB_TOP_K_NGRAMS,
    VOCAB_TOP_K_UNIGRAMS,
)

STOPWORDS = set(stopwords.words("english"))

_PUNCT_TABLE = str.maketrans("", "", string.punctuation + "\u2014\u2013\u2018\u2019\u201c\u201d")


def _tokenize(text: str) -> list[str]:
    text = text.lower().translate(_PUNCT_TABLE)
    return [w for w in text.split() if w and w not in STOPWORDS]


def _ngrams(tokens: list[str], n: int) -> list[str]:
    return [" ".join(tokens[i : i + n]) for i in range(len(tokens) - n + 1)]


def _log_likelihood_ratio(a: int, b: int, c: int, d: int) -> float:
    """
    G² test for a 2*2 contingency table.
        a = freq of word in AI corpus
        b = freq of word in human corpus
        c = total tokens in AI corpus  - a
        d = total tokens in human corpus - b
    """
    n = a + b + c + d
    if n == 0:
        return 0.0

    def _safe(k, total):
        if k == 0 or total == 0:
            return 0.0
        p = k / total
        return k * math.log(p)

    g2 = 2 * (
        _safe(a, a + b) + _safe(b, a + b)
        + _safe(c, c + d) + _safe(d, c + d)
        - _safe(a + c, n) - _safe(b + d, n)
    )
    return g2 if a / max(a + c, 1) > b / max(b + d, 1) else 0.0


def _score_vocab(
    ai_counter: Counter,
    human_counter: Counter,
    ai_total: int,
    human_total: int,
    min_freq: int,
    top_k: int,
) -> list[str]:
    all_words = set(ai_counter) | set(human_counter)
    scored: list[tuple[str, float]] = []
    for w in all_words:
        a = ai_counter.get(w, 0)
        b = human_counter.get(w, 0)
        if a + b < min_freq:
            continue
        c = ai_total - a
        d = human_total - b
        g2 = _log_likelihood_ratio(a, b, c, d)
        if g2 > 0:
            scored.append((w, g2))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [w for w, _ in scored[:top_k]]


def mine(dataset_path: str | None = None, output_path: str | None = None) -> dict:
    dataset_path = dataset_path or DATASET_PATH
    output_path = output_path or VOCAB_PATH

    print(f"[vocab_miner] Loading dataset from {dataset_path} …")
    df = pd.read_csv(dataset_path)
    df = df.dropna(subset=["text", "label"])

    ai_df = df[df["label"] == 1]
    human_df = df[df["label"] == 0]

    cap = VOCAB_MINING_SAMPLE_SIZE
    if len(ai_df) > cap:
        ai_df = ai_df.sample(n=cap, random_state=42)
    if len(human_df) > cap:
        human_df = human_df.sample(n=cap, random_state=42)

    print(f"[vocab_miner] Using {len(ai_df)} AI + {len(human_df)} human samples")

    ai_uni, human_uni = Counter(), Counter()
    ai_bi, human_bi = Counter(), Counter()
    ai_tri, human_tri = Counter(), Counter()
    ai_total = human_total = 0

    for text in ai_df["text"]:
        tokens = _tokenize(str(text))
        ai_total += len(tokens)
        ai_uni.update(tokens)
        ai_bi.update(_ngrams(tokens, 2))
        ai_tri.update(_ngrams(tokens, 3))

    for text in human_df["text"]:
        tokens = _tokenize(str(text))
        human_total += len(tokens)
        human_uni.update(tokens)
        human_bi.update(_ngrams(tokens, 2))
        human_tri.update(_ngrams(tokens, 3))

    print("[vocab_miner] Scoring unigrams …")
    transition_words = _score_vocab(
        ai_uni, human_uni, ai_total, human_total,
        VOCAB_MIN_FREQUENCY, VOCAB_TOP_K_UNIGRAMS,
    )

    print("[vocab_miner] Scoring bigrams + trigrams …")
    ai_phrase = ai_bi + ai_tri
    human_phrase = human_bi + human_tri
    phrase_total_ai = sum(ai_phrase.values())
    phrase_total_human = sum(human_phrase.values())

    all_phrases = _score_vocab(
        ai_phrase, human_phrase, phrase_total_ai, phrase_total_human,
        VOCAB_MIN_FREQUENCY, VOCAB_TOP_K_NGRAMS * 2,
    )

    hedge_phrases = [p for p in all_phrases if len(p.split()) >= 2][:VOCAB_TOP_K_NGRAMS]
    filler_phrases = [p for p in all_phrases if p not in hedge_phrases][:VOCAB_TOP_K_NGRAMS]

    result = {
        "ai_transition_words": transition_words,
        "ai_hedge_phrases": hedge_phrases,
        "ai_filler_phrases": filler_phrases,
        "metadata": {
            "ai_samples": len(ai_df),
            "human_samples": len(human_df),
            "ai_tokens": ai_total,
            "human_tokens": human_total,
            "min_frequency": VOCAB_MIN_FREQUENCY,
            "top_k_unigrams": VOCAB_TOP_K_UNIGRAMS,
            "top_k_ngrams": VOCAB_TOP_K_NGRAMS,
        },
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"[vocab_miner] Saved vocab to {output_path}")
    return result


if __name__ == "__main__":
    mine()
