import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATASET_PATH = os.path.join(BASE_DIR, "combined_dataset_clean.csv")

# ---------------------------------------------------------------------------
# Curated AI Marker Word Lists
# ---------------------------------------------------------------------------
# Based on well-documented AI writing patterns — NOT data-mined.
# These words/phrases appear disproportionately in LLM outputs across
# ChatGPT, Claude, Gemini, Llama, Mistral, etc.

AI_TRANSITION_WORDS = [
    "furthermore", "moreover", "additionally", "consequently", "nevertheless",
    "nonetheless", "henceforth", "thereby", "wherein", "thereof",
    "whereby", "albeit", "notwithstanding", "inasmuch", "insofar",
    "delve", "tapestry", "nuanced", "landscape", "multifaceted",
    "comprehensive", "intricate", "pivotal", "myriad", "plethora",
    "paramount", "indispensable", "commendable", "noteworthy", "groundbreaking",
    "unprecedented", "profound", "invaluable", "quintessential", "exemplary",
    "leveraging", "streamline", "underscore", "encompasses", "embark",
    "foster", "harness", "paradigm", "synergy", "holistic",
    "robust", "transformative", "imperative", "facilitate", "utilize",
    "optimize", "bolster", "augment", "cultivate", "spearhead",
    "navigate", "elevate", "amplify", "catalyze", "galvanize",
    "arguably", "notably", "inherently", "fundamentally", "essentially",
    "intrinsically", "predominantly", "subsequently", "conversely", "correspondingly",
    "juxtaposition", "dichotomy", "amalgamation", "confluence", "interplay",
    "underpinning", "cornerstone", "linchpin", "bedrock", "hallmark",
    "resonate", "captivating", "compelling", "illuminating", "enlightening",
    "awe-inspiring", "thought-provoking", "heartwarming", "poignant", "evocative",
    "meticulous", "unwavering", "relentless", "burgeoning", "flourishing",
]

AI_HEDGE_PHRASES = [
    # "It is..." pattern — AI's signature epistemic hedging
    "it is important to note",
    "it's worth mentioning",
    "it should be noted",
    "it is worth noting",
    "it is essential to",
    "it is crucial to",
    "it is vital to",
    "it is noteworthy that",
    "it is imperative to",
    "it is worth emphasizing",
    "it bears mentioning",
    "it cannot be overstated",
    "it is widely recognized",
    "it is generally accepted",
    "it is commonly understood",
    "one could argue",
    "it can be argued",
    "one might suggest",
    "one must consider",
    "one cannot overlook",
    "this suggests that",
    "this highlights the",
    "this underscores the",
    "this demonstrates that",
    "this illustrates the",
    "this speaks to the",
    "this is particularly evident",
    "this is especially true",
    "in today's world",
    "in today's society",
    "in this context",
    "from this perspective",
    "with that being said",
    "having said that",
    "that being said",
    "it goes without saying",
    "needless to say",
    "as we move forward",
    "looking ahead",
    "in light of this",
    "given the above",
    "taken together",
    "all things considered",
]

AI_FILLER_PHRASES = [
    "in the realm of",
    "plays a crucial role",
    "a testament to",
    "serves as a reminder",
    "serves as a catalyst",
    "serves as a beacon",
    "stands as a testament",
    "stands as a reminder",
    "paves the way for",
    "sheds light on",
    "breathes new life into",
    "sends a clear message",
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
    "a diverse range of",
    "a broad spectrum of",
    "a myriad of",
    "a plethora of",
    "in an increasingly",
    "in our ever-evolving",
    "in an ever-changing",
    "the ever-growing",
    "the ever-evolving",
    "the rapidly evolving",
    "the dynamic landscape of",
    "the intricate tapestry of",
    "the complex interplay of",
    "the rich tapestry of",
    "in conclusion",
    "to sum up",
    "in summary",
    "all in all",
    "by and large",
    "first and foremost",
    "last but not least",
    "without a doubt",
    "beyond a shadow of a doubt",
    "it is safe to say",
    "has a profound impact",
    "has a significant impact",
    "cannot be understated",
    "cannot be overstated",
    "is of paramount importance",
    "is of utmost importance",
    "is nothing short of",
    "leaves no stone unturned",
    "strikes a balance between",
    "bridges the gap between",
]

# ---------------------------------------------------------------------------
# Feature Extraction (Layer 1)
# ---------------------------------------------------------------------------
SYLLABLE_LANGUAGE = "en_US"
COMMON_WORD_RANK_CUTOFF = 5000

# Unicode emoji regex pattern (covers Emoticons, Dingbats, Symbols, etc.)
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
