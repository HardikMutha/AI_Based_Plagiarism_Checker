import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATASET_PATH = os.path.join(BASE_DIR, "model_filtered.csv")

# Curated AI Marker Word Lists
# Based on well-documented AI writing patterns - NOT data-mined.
# These words/phrases appear disproportionately in LLM outputs across
# ChatGPT, Claude, Gemini, Llama, Mistral, etc.

AI_TRANSITION_WORDS = [
    "furthermore", "moreover", "additionally", "consequently", "delve",
    "tapestry", "nuanced", "landscape", "multifaceted", "comprehensive",
    "arguably", "notably", "leveraging", "intricate", "pivotal",
    "streamline", "underscore", "encompasses", "embark", "foster",
    "harness", "paradigm", "synergy", "holistic", "robust",
    "transformative", "imperative", "facilitate", "utilize", "optimize",
]

AI_HEDGE_PHRASES = [
    "it is important to note",
    "it's worth mentioning",
    "it should be noted",
    "it is worth noting",
    "it is essential to",
    "one could argue",
    "it can be argued",
    "this suggests that",
    "this highlights the",
    "this underscores the",
    "in today's world",
    "in today's society",
    "in this context",
    "from this perspective",
    "with that being said",
]

AI_FILLER_PHRASES = [
    "in the realm of",
    "plays a crucial role",
    "a testament to",
    "serves as a reminder",
    "it goes without saying",
    "at the end of the day",
    "in terms of",
    "when it comes to",
    "the fact that",
    "is a key factor",
    "on the other hand",
    "as a result of",
    "in order to",
    "the importance of",
    "a wide range of",
]

# These are stop words and are supposed to be excluded before considering a piece of code for 
# ai - based plag.
# The list is dynamic as of now and can be modified as per our convenience

IGNORE_WORDS = [
    "pict", "therefore", "nice", "christian",
]

# Feature Extraction (Layer 1)
SYLLABLE_LANGUAGE = "en_US"
COMMON_WORD_RANK_CUTOFF = 5000

EMOJI_PATTERN = (
    "[\U0001F600-\U0001F64F"  # emoticons
    "\U0001F300-\U0001F5FF"   # symbols & pictographs
    "\U0001F680-\U0001F6FF"   # transport & map symbols
    "\U0001F1E0-\U0001F1FF"   # flags
    "\U00002702-\U000027B0"   # dingbats
    "\U0000FE00-\U0000FE0F"   # variation selectors
    "\U0001F900-\U0001F9FF"   # supplemental symbols
    "\U0001FA00-\U0001FA6F"   # chess symbols
    "\U0001FA70-\U0001FAFF"   # symbols extended-A
    "\U00002600-\U000026FF"   # misc symbols
    "\U0000200D"              # zero-width joiner
    "\U00002B50"              # star
    "\U0000231A-\U0000231B"   # watch / hourglass
    "]"
)

# Classifier (Layer 2)
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

# Pattern Analyzer (Layer 3)
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
SEMANTIC_DRIFT_THRESHOLD = 0.80
LOGIC_LOOP_SIMILARITY_THRESHOLD = 0.65
SEGMENT_WORD_COUNT = 200

# Pipeline (detector.py) – score combination
WEIGHT_ML = 0.55
WEIGHT_PATTERN = 0.25
WEIGHT_HEURISTIC = 0.20

VERDICT_THRESHOLDS = {
    "likely_human": 0.35,
    "review_recommended": 0.65,
}
