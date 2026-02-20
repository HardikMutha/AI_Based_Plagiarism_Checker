import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATASET_PATH = os.path.join(BASE_DIR, "combined_dataset.csv")

# ---------------------------------------------------------------------------
# Vocab Mining
# ---------------------------------------------------------------------------
VOCAB_PATH = os.path.join(MODELS_DIR, "ai_vocab.json")
VOCAB_MINING_SAMPLE_SIZE = 100_000
VOCAB_MIN_FREQUENCY = 50
VOCAB_TOP_K_UNIGRAMS = 200
VOCAB_TOP_K_NGRAMS = 100

# Seed list used ONLY when mined vocab doesn't exist yet (bootstrap)
SEED_AI_WORDS = [
    "furthermore", "moreover", "additionally", "consequently", "delve",
    "tapestry", "nuanced", "landscape", "multifaceted", "comprehensive",
]

# ---------------------------------------------------------------------------
# Feature Extraction (Layer 1)
# ---------------------------------------------------------------------------
SYLLABLE_LANGUAGE = "en_US"

# Top-N most common English words file isn't bundled; we use nltk's frequency
# list at runtime. This controls the cutoff rank for "rare word" detection.
COMMON_WORD_RANK_CUTOFF = 5000

# ---------------------------------------------------------------------------
# Classifier (Layer 2)
# ---------------------------------------------------------------------------
MODEL_PATH = os.path.join(MODELS_DIR, "xgb_model.joblib")
SCALER_PATH = os.path.join(MODELS_DIR, "scaler.joblib")

TRAINING_BALANCED_SAMPLE = 50_000  # per class
XGBOOST_PARAMS = {
    "n_estimators": 300,
    "max_depth": 6,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "eval_metric": "logloss",
    "random_state": 42,
}
CV_FOLDS = 5

# ---------------------------------------------------------------------------
# Pattern Analyzer (Layer 3)
# ---------------------------------------------------------------------------
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
SEMANTIC_DRIFT_THRESHOLD = 0.80
LOGIC_LOOP_SIMILARITY_THRESHOLD = 0.65
SEGMENT_WORD_COUNT = 200

# ---------------------------------------------------------------------------
# Pipeline (detector.py) – score combination
# ---------------------------------------------------------------------------
WEIGHT_ML = 0.55
WEIGHT_PATTERN = 0.25
WEIGHT_HEURISTIC = 0.20

VERDICT_THRESHOLDS = {
    "likely_human": 0.35,
    "review_recommended": 0.65,
}
