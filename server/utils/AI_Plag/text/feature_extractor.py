"""
Layer 1 — NLP "Texture" Feature Extraction

Extracts ~18 numerical features from raw text using pure heuristics and
data-mined vocabulary (loaded from models/ai_vocab.json).
"""

import json
import math
import os
import re
import string
from collections import Counter

import numpy as np
import pyphen

from config import (
    COMMON_WORD_RANK_CUTOFF,
    SEED_AI_WORDS,
    SYLLABLE_LANGUAGE,
    VOCAB_PATH,
)

_hyphenator = pyphen.Pyphen(lang=SYLLABLE_LANGUAGE)

# Lazy-loaded at first use
_vocab: dict | None = None
_common_words: set | None = None

FEATURE_NAMES = [
    "ai_transition_density",
    "em_dash_density",
    "hedge_phrase_density",
    "filler_ratio",
    "syllable_variance",
    "sentence_length_variance",
    "sentence_length_mean",
    "oxford_comma_consistency",
    "semicolon_density",
    "exclamation_density",
    "parenthetical_density",
    "punctuation_diversity",
    "ttr",
    "hapax_ratio",
    "avg_word_length",
    "rare_word_ratio",
    "paragraph_length_variance",
    "paragraph_count_norm",
]


def _load_vocab() -> dict:
    global _vocab
    if _vocab is not None:
        return _vocab

    if os.path.exists(VOCAB_PATH):
        with open(VOCAB_PATH) as f:
            _vocab = json.load(f)
    else:
        _vocab = {
            "ai_transition_words": SEED_AI_WORDS,
            "ai_hedge_phrases": [],
            "ai_filler_phrases": [],
        }
    return _vocab


def _load_common_words() -> set:
    """Build a set of the N most common English words using nltk."""
    global _common_words
    if _common_words is not None:
        return _common_words
    try:
        from nltk.corpus import brown

        freq = Counter()
        for word in brown.words():
            freq[word.lower()] += 1
        _common_words = {w for w, _ in freq.most_common(COMMON_WORD_RANK_CUTOFF)}
    except Exception:
        _common_words = set()
    return _common_words


def _split_sentences(text: str) -> list[str]:
    """Regex-based sentence splitter (avoids heavy nltk dependency at runtime)."""
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s for s in parts if len(s) > 2]


def _count_syllables(word: str) -> int:
    hyphens = _hyphenator.inserted(word)
    return max(1, hyphens.count("-") + 1)


def _words(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", text.lower())


# ── Individual feature groups ─────────────────────────────────────────

def _token_frequency_features(text: str, words: list[str], sentences: list[str]) -> dict:
    vocab = _load_vocab()
    n_words = max(len(words), 1)
    n_sents = max(len(sentences), 1)
    lower_text = text.lower()

    ai_words = set(vocab.get("ai_transition_words", []))
    ai_count = sum(1 for w in words if w in ai_words)

    em_dash_count = text.count("\u2014") + text.count("--")

    hedge_phrases = vocab.get("ai_hedge_phrases", [])
    hedge_count = sum(lower_text.count(p) for p in hedge_phrases)

    filler_phrases = vocab.get("ai_filler_phrases", [])
    filler_count = sum(lower_text.count(p) for p in filler_phrases)

    return {
        "ai_transition_density": ai_count / n_words,
        "em_dash_density": em_dash_count / n_sents,
        "hedge_phrase_density": hedge_count / n_sents,
        "filler_ratio": filler_count / n_words,
    }


def _syllable_rhythm_features(words: list[str], sentences: list[str]) -> dict:
    if len(sentences) < 2:
        return {
            "syllable_variance": 0.0,
            "sentence_length_variance": 0.0,
            "sentence_length_mean": float(len(words)),
        }

    sent_syllable_avgs = []
    sent_lengths = []
    for sent in sentences:
        sw = _words(sent)
        if not sw:
            continue
        sent_lengths.append(len(sw))
        avg_syl = np.mean([_count_syllables(w) for w in sw])
        sent_syllable_avgs.append(avg_syl)

    return {
        "syllable_variance": float(np.std(sent_syllable_avgs)) if sent_syllable_avgs else 0.0,
        "sentence_length_variance": float(np.std(sent_lengths)) if sent_lengths else 0.0,
        "sentence_length_mean": float(np.mean(sent_lengths)) if sent_lengths else 0.0,
    }


def _punctuation_features(text: str, sentences: list[str]) -> dict:
    n_sents = max(len(sentences), 1)

    # Oxford comma: look for patterns like "A, B, and C" vs "A, B and C"
    with_oxford = len(re.findall(r",\s+\w+,\s+and\s", text))
    without_oxford = len(re.findall(r",\s+\w+\s+and\s", text))
    total_lists = with_oxford + without_oxford
    if total_lists == 0:
        oxford_consistency = 0.5
    else:
        ratio = max(with_oxford, without_oxford) / total_lists
        oxford_consistency = ratio

    punct_chars = [c for c in text if c in string.punctuation or c in "\u2014\u2013"]
    punct_counter = Counter(punct_chars)
    total_punct = max(len(punct_chars), 1)
    entropy = 0.0
    for count in punct_counter.values():
        p = count / total_punct
        if p > 0:
            entropy -= p * math.log2(p)

    return {
        "oxford_comma_consistency": oxford_consistency,
        "semicolon_density": text.count(";") / n_sents,
        "exclamation_density": text.count("!") / n_sents,
        "parenthetical_density": (text.count("(") + text.count(")")) / n_sents,
        "punctuation_diversity": entropy,
    }


def _vocabulary_features(words: list[str]) -> dict:
    n = max(len(words), 1)
    freq = Counter(words)
    unique = len(freq)
    hapax = sum(1 for c in freq.values() if c == 1)

    common = _load_common_words()
    if common:
        rare = sum(1 for w in words if w not in common)
        rare_ratio = rare / n
    else:
        rare_ratio = 0.0

    return {
        "ttr": unique / n,
        "hapax_ratio": hapax / max(unique, 1),
        "avg_word_length": np.mean([len(w) for w in words]) if words else 0.0,
        "rare_word_ratio": rare_ratio,
    }


def _structural_features(text: str, words: list[str]) -> dict:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text]

    para_lengths = [len(_words(p)) for p in paragraphs]
    n_words = max(len(words), 1)

    return {
        "paragraph_length_variance": float(np.std(para_lengths)) if len(para_lengths) > 1 else 0.0,
        "paragraph_count_norm": len(paragraphs) / (n_words / 100),
    }


# ── Public API ────────────────────────────────────────────────────────

def extract(text: str) -> dict[str, float]:
    """Return a dict of all 18 features for the given text."""
    words = _words(text)
    sentences = _split_sentences(text)

    features: dict[str, float] = {}
    features.update(_token_frequency_features(text, words, sentences))
    features.update(_syllable_rhythm_features(words, sentences))
    features.update(_punctuation_features(text, sentences))
    features.update(_vocabulary_features(words))
    features.update(_structural_features(text, words))
    return features


def extract_array(text: str) -> np.ndarray:
    """Return features as a numpy array in a fixed, consistent order."""
    feat = extract(text)
    return np.array([feat[name] for name in FEATURE_NAMES], dtype=np.float64)
