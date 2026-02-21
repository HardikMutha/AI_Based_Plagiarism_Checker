"""
Layer 1  NLP "Texture" Feature Extraction

Extracts 20 numerical features from raw text using pure NLP heuristics
and curated AI marker word lists (from config.py).
"""

import math
import re
import string
from collections import Counter

import numpy as np
import pyphen

from config import (
    AI_FILLER_PHRASES,
    AI_HEDGE_PHRASES,
    AI_TRANSITION_WORDS,
    COMMON_WORD_RANK_CUTOFF,
    EMOJI_PATTERN,
    IGNORE_WORDS,
    SYLLABLE_LANGUAGE,
)

_hyphenator = pyphen.Pyphen(lang=SYLLABLE_LANGUAGE)
_emoji_re = re.compile(EMOJI_PATTERN)
_ai_transition_set = {w.lower() for w in AI_TRANSITION_WORDS}
_ai_hedge_lower = [p.lower() for p in AI_HEDGE_PHRASES]
_ai_filler_lower = [p.lower() for p in AI_FILLER_PHRASES]
_ignore_set = {w.lower() for w in IGNORE_WORDS}

_common_words: set | None = None

FEATURE_NAMES = [
    "ai_transition_density",
    "em_dash_density",
    "hedge_phrase_density",
    "filler_ratio",
    "emoji_density",

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

    "markdown_density",

    "paragraph_length_variance",
    "paragraph_count_norm",
]


def _load_common_words() -> set:
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
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s for s in parts if len(s) > 2]


def _count_syllables(word: str) -> int:
    hyphens = _hyphenator.inserted(word)
    return max(1, hyphens.count("-") + 1)


def _words(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", text.lower())


# ── Individual feature groups ─────────────────────────────────────────

def _token_frequency_features(text: str, words: list[str], sentences: list[str]) -> dict:
    n_words = max(len(words), 1)
    n_sents = max(len(sentences), 1)
    lower_text = text.lower()

    ai_count = sum(1 for w in words if w in _ai_transition_set)
    em_dash_count = text.count("\u2014") + text.count("--")
    hedge_count = sum(lower_text.count(p) for p in _ai_hedge_lower)
    filler_count = sum(lower_text.count(p) for p in _ai_filler_lower)

    emoji_hits = _emoji_re.findall(text)
    emoji_density = len(emoji_hits) / (n_words / 100) if n_words > 0 else 0.0

    return {
        "ai_transition_density": ai_count / n_words,
        "em_dash_density": em_dash_count / n_sents,
        "hedge_phrase_density": hedge_count / n_sents,
        "filler_ratio": filler_count / n_words,
        "emoji_density": emoji_density,
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

    with_oxford = len(re.findall(r",\s+\w+,\s+and\s", text))
    without_oxford = len(re.findall(r",\s+\w+\s+and\s", text))
    total_lists = with_oxford + without_oxford
    if total_lists == 0:
        oxford_consistency = 0.5
    else:
        oxford_consistency = max(with_oxford, without_oxford) / total_lists

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
    rare_ratio = sum(1 for w in words if w not in common) / n if common else 0.0

    return {
        "ttr": unique / n,
        "hapax_ratio": hapax / max(unique, 1),
        "avg_word_length": float(np.mean([len(w) for w in words])) if words else 0.0,
        "rare_word_ratio": rare_ratio,
    }


def _formatting_features(text: str) -> dict:
    """Detect markdown formatting  AI outputs are heavy on headers, bullets, bold, code fences."""
    lines = text.split("\n")
    non_empty = [ln for ln in lines if ln.strip()]
    total_lines = max(len(non_empty), 1)

    bullet_re = re.compile(r"^\s*[-*+]\s+")
    numbered_re = re.compile(r"^\s*\d+[.)]\s+")
    header_re = re.compile(r"^\s*#{1,6}\s+")
    bold_count = len(re.findall(r"\*\*[^*]+\*\*|__[^_]+__", text))
    code_fence_count = text.count("```")

    md_lines = 0
    for ln in non_empty:
        if bullet_re.match(ln) or numbered_re.match(ln) or header_re.match(ln):
            md_lines += 1

    md_elements = md_lines + bold_count + code_fence_count
    return {"markdown_density": md_elements / total_lines}


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
    """Return a dict of all 20 features for the given text."""
    words = [w for w in _words(text) if w not in _ignore_set]
    sentences = _split_sentences(text)

    features: dict[str, float] = {}
    features.update(_token_frequency_features(text, words, sentences))
    features.update(_syllable_rhythm_features(words, sentences))
    features.update(_punctuation_features(text, sentences))
    features.update(_vocabulary_features(words))
    features.update(_formatting_features(text))
    features.update(_structural_features(text, words))
    return features


def extract_array(text: str) -> np.ndarray:
    """Return features as a numpy array in a fixed, consistent order."""
    feat = extract(text)
    return np.array([feat[name] for name in FEATURE_NAMES], dtype=np.float64)
