"""
AI-generated code detection using AST structural analysis + source heuristics.

Combines structural (AST-derived) signals with textual (source-level) signals
for a more robust classifier.  Every signal returns a float in [0, 1] where
higher means "more AI-like".
"""

from __future__ import annotations

import math
import re
import string
from collections import Counter, defaultdict
from pathlib import Path
from typing import Optional

from app.services.code_plagiarism_detector.ai_model import FEATURE_NAMES, LogisticModel, GBTModel

_MODEL_DIR = Path(__file__).parent / "models"
_LOGISTIC_WEIGHTS = _MODEL_DIR / "weights.json"
_GBT_WEIGHTS = _MODEL_DIR / "weights_gbt.pkl"

_model: Optional[LogisticModel] = None
_gbt_model: Optional[GBTModel] = None

from app.services.code_plagiarism_detector.generic_node import GenericNode
from app.services.code_plagiarism_detector.registry import ParserRegistry
from app.services.code_plagiarism_detector.results import AIDetectionResult


# ── Catalogue of signals with human-readable metadata ──────────────────

_SIGNAL_META: dict[str, dict] = {
    # ── Structural (AST) signals ────────────────────────────────────
    "depth_uniformity": {
        "label": "Depth Uniformity",
        "group": "structural",
        "tip": "Leaf nodes all end up at nearly the same depth",
    },
    "low_entropy": {
        "label": "Low Structural Entropy",
        "group": "structural",
        "tip": "Very few distinct AST node types used",
    },
    "subtree_symmetry": {
        "label": "Subtree Symmetry",
        "group": "structural",
        "tip": "Sub-tree sizes are unusually uniform",
    },
    "error_handling_density": {
        "label": "Error-Handling Density",
        "group": "structural",
        "tip": "Disproportionate try/catch/throw scaffolding",
    },
    "func_size_uniformity": {
        "label": "Function Size Uniformity",
        "group": "structural",
        "tip": "Functions are suspiciously close in size",
    },
    "branching_consistency": {
        "label": "Branching Consistency",
        "group": "structural",
        "tip": "Branching factor almost identical across depths",
    },
    "pattern_repetition": {
        "label": "Pattern Repetition",
        "group": "structural",
        "tip": "Many subtrees share the exact same shape",
    },
    "guard_clause_ratio": {
        "label": "Guard-Clause Density",
        "group": "structural",
        "tip": "High ratio of early-return guard clauses in functions",
    },
    # ── Textual (source-level) signals ──────────────────────────────
    "comment_pattern": {
        "label": "Comment Patterns",
        "group": "textual",
        "tip": "Comments match typical AI phrasing",
    },
    "naming_convention": {
        "label": "Naming Convention Score",
        "group": "textual",
        "tip": "Variable / function names follow rigid conventions",
    },
    "docstring_density": {
        "label": "Docstring Density",
        "group": "textual",
        "tip": "High ratio of docstrings to functions",
    },
    "import_style": {
        "label": "Import Organisation",
        "group": "textual",
        "tip": "Imports are perfectly grouped & alphabetised",
    },
    "variable_name_entropy": {
        "label": "Variable Name Entropy",
        "group": "textual",
        "tip": "Variable names are all verbose / descriptive (low entropy)",
    },
    "code_to_logic_ratio": {
        "label": "Boilerplate-to-Logic Ratio",
        "group": "textual",
        "tip": "High proportion of boilerplate vs actual logic",
    },
    "line_length_uniformity": {
        "label": "Line Length Uniformity",
        "group": "textual",
        "tip": "Lines are suspiciously close in length",
    },
    "f_string_consistency": {
        "label": "String-Format Consistency",
        "group": "textual",
        "tip": "All string formatting uses the same style throughout",
    },
    "emoji_usage": {
        "label": "Emoji Usage",
        "group": "textual",
        "tip": "Use of emojis in comments or strings",
    },
    "em_dash_usage": {
        "label": "Em-Dash Usage",
        "group": "textual",
        "tip": "Use of em-dashes () in comments or strings",
    },
}

def _get_model() -> LogisticModel | GBTModel:
    """Load the best available pre-trained model."""
    global _model, _gbt_model

    # Prefer GBT if available
    if _gbt_model is None and _GBT_WEIGHTS.exists():
        try:
            _gbt_model = GBTModel()
            _gbt_model.load(str(_GBT_WEIGHTS))
        except Exception:
            _gbt_model = None

    if _gbt_model is not None and _gbt_model.trained:
        return _gbt_model

    # Fall back to logistic
    if _model is None:
        _model = LogisticModel()
        if _LOGISTIC_WEIGHTS.exists():
            _model.load(str(_LOGISTIC_WEIGHTS))
        else:
            # If no pre-trained weights, use hand-tuned defaults as fallback
            _model = None

    if _model is not None and _model.trained:
        return _model

    return None  # type: ignore[return-value]


class AICodeDetector:
    """
    Detects whether code was likely AI-generated.

    Uses 16 signals (8 structural + 8 textual) combined with tuned weights.
    """

    # ── Public API ──────────────────────────────────────────────────────

    def analyze_code(
        self, code: str, language: str, label: str = "<input>"
    ) -> AIDetectionResult:
        parser = ParserRegistry.get(language)
        tree = parser.parse(code)
        return self._analyze_tree(tree, label, language, code)

    def analyze_file(self, filepath: str) -> AIDetectionResult:
        code = Path(filepath).read_text(encoding="utf-8")
        language = ParserRegistry.detect_language(filepath)
        parser = ParserRegistry.get(language)
        tree = parser.parse(code)
        return self._analyze_tree(tree, filepath, language, code)

    # ── Core analysis ───────────────────────────────────────────────────
    def _analyze_tree(self, tree, label, language, code):
        """Core analysis – now uses trained model when available."""
        signals: dict[str, float] = {}
        explanations: list[str] = []

        # ── Compute all signals (unchanged) ─────────────────────────
        signals["depth_uniformity"] = self._depth_uniformity(tree)
        signals["low_entropy"] = self._structural_entropy(tree)
        signals["subtree_symmetry"] = self._subtree_symmetry(tree)
        signals["error_handling_density"] = self._error_handling_density(tree)
        signals["func_size_uniformity"] = self._function_size_uniformity(tree)
        signals["branching_consistency"] = self._branching_consistency(tree)
        signals["pattern_repetition"] = self._pattern_repetition(tree)
        signals["guard_clause_ratio"] = self._guard_clause_ratio(tree)
        signals["comment_pattern"] = self._comment_pattern_score(code, language)
        signals["naming_convention"] = self._naming_convention_score(code, language)
        signals["docstring_density"] = self._docstring_density(code, language)
        signals["import_style"] = self._import_style_score(code, language)
        signals["variable_name_entropy"] = self._variable_name_entropy(code, language)
        signals["code_to_logic_ratio"] = self._code_to_logic_ratio(code, language)
        signals["line_length_uniformity"] = self._line_length_uniformity(code)
        signals["f_string_consistency"] = self._string_format_consistency(code, language)
        signals["emoji_usage"] = self._emoji_usage(code)
        signals["em_dash_usage"] = self._em_dash_usage(code)

        # ── Score via trained model OR fallback ─────────────────────
        model = _get_model()
        if model is not None:
            ai_probability = max(0.0, min(1.0, round(model.predict_proba(signals), 4)))
        else:
            # Fallback: original hand-tuned weights
            ai_probability = self._fallback_score(signals)

        # ── Build explanations ──────────────────────────────────────
        for key, val in signals.items():
            meta = _SIGNAL_META.get(key, {})
            if val >= 0.65:
                explanations.append(meta.get("tip", key))

        # Per-signal details for the UI
        signal_details = {}
        for key, val in signals.items():
            meta = _SIGNAL_META.get(key, {})
            signal_details[key] = {
                "value": round(val, 4),
                "label": meta.get("label", key),
                "group": meta.get("group", "other"),
                "tip": meta.get("tip", ""),
            }

        if not explanations:
            explanations.append("No strong AI signals detected")

        return AIDetectionResult(
            file_name=label,
            language=language,
            ai_probability=ai_probability,
            signals=signals,
            explanations=explanations,
            signal_details=signal_details,
        )
    
    # ── Utility ─────────────────────────────────────────────────────────

    @staticmethod
    def _logistic_scale(x: float, midpoint: float = 0.40, steepness: float = 8.0) -> float:
        """Logistic (sigmoid) rescale: pushes values away from the midpoint."""
        return 1.0 / (1.0 + math.exp(-steepness * (x - midpoint)))

    # =====================================================================
    #  STRUCTURAL SIGNALS (AST-based)
    # =====================================================================

    def _depth_uniformity(self, tree: GenericNode) -> float:
        """Low CV of leaf depths → uniform → more AI-like."""
        depths = self._collect_leaf_depths(tree, 0)
        if len(depths) < 3:
            return 0.0
        mean = sum(depths) / len(depths)
        if mean == 0:
            return 0.0
        variance = sum((d - mean) ** 2 for d in depths) / len(depths)
        cv = math.sqrt(variance) / mean
        return max(0.0, 1.0 - cv)

    def _collect_leaf_depths(self, node: GenericNode, depth: int) -> list[int]:
        if not node.children:
            return [depth]
        depths: list[int] = []
        for child in node.children:
            depths.extend(self._collect_leaf_depths(child, depth + 1))
        return depths

    def _structural_entropy(self, tree: GenericNode) -> float:
        """Low Shannon entropy of node-type distribution → repetitive → AI."""
        hist = tree.node_type_histogram()
        total = sum(hist.values())
        if total == 0:
            return 0.0
        entropy = 0.0
        for count in hist.values():
            if count > 0:
                p = count / total
                entropy -= p * math.log2(p)
        max_entropy = math.log2(len(hist)) if len(hist) > 1 else 1.0
        normalised = entropy / max_entropy if max_entropy > 0 else 0
        return max(0.0, 1.0 - normalised)

    def _subtree_symmetry(self, tree: GenericNode) -> float:
        """Low CV of subtree sizes → suspiciously symmetric."""
        sizes = [s for s in tree.subtree_sizes() if s >= 3]
        if len(sizes) < 3:
            return 0.0
        mean = sum(sizes) / len(sizes)
        if mean == 0:
            return 0.0
        variance = sum((s - mean) ** 2 for s in sizes) / len(sizes)
        cv = math.sqrt(variance) / mean
        return max(0.0, min(1.0, 1.0 - cv / 2))

    def _error_handling_density(self, tree: GenericNode) -> float:
        """Over-engineered error handling is a hallmark of AI code."""
        hist = tree.node_type_histogram()
        total = sum(hist.values())
        if total == 0:
            return 0.0
        error_nodes = hist.get("TRY", 0) + hist.get("CATCH", 0) + hist.get("THROW", 0)
        func_nodes = hist.get("FUNC", 0) + hist.get("METHOD", 0)
        if func_nodes == 0:
            return min(1.0, error_nodes / max(total, 1) * 5)
        ratio = error_nodes / max(func_nodes, 1)
        return min(1.0, ratio / 2.0)

    def _function_size_uniformity(self, tree: GenericNode) -> float:
        """Low CV of function sizes → cookie-cutter functions → AI."""
        func_sizes = self._collect_func_sizes(tree)
        if len(func_sizes) < 2:
            return 0.0
        mean = sum(func_sizes) / len(func_sizes)
        if mean == 0:
            return 0.0
        variance = sum((s - mean) ** 2 for s in func_sizes) / len(func_sizes)
        cv = math.sqrt(variance) / mean
        return max(0.0, min(1.0, 1.0 - cv))

    def _collect_func_sizes(self, node: GenericNode) -> list[int]:
        sizes: list[int] = []
        if node.node_type in ("FUNC", "METHOD"):
            sizes.append(node.size)
        for child in node.children:
            sizes.extend(self._collect_func_sizes(child))
        return sizes

    def _branching_consistency(self, tree: GenericNode) -> float:
        """Low average CV of branching factor per depth → AI."""
        branching_by_depth: dict[int, list[int]] = defaultdict(list)
        self._collect_branching(tree, 0, branching_by_depth)
        if not branching_by_depth:
            return 0.0
        cvs: list[float] = []
        for branches in branching_by_depth.values():
            if len(branches) >= 2:
                mean = sum(branches) / len(branches)
                if mean > 0:
                    var = sum((b - mean) ** 2 for b in branches) / len(branches)
                    cvs.append(math.sqrt(var) / mean)
        if not cvs:
            return 0.0
        avg_cv = sum(cvs) / len(cvs)
        return max(0.0, min(1.0, 1.0 - avg_cv))

    def _collect_branching(
        self, node: GenericNode, depth: int, result: dict[int, list[int]]
    ) -> None:
        if node.children:
            result[depth].append(len(node.children))
        for child in node.children:
            self._collect_branching(child, depth + 1, result)

    def _pattern_repetition(self, tree: GenericNode) -> float:
        """Fraction of subtrees that appear more than once."""
        counter: Counter = Counter()
        self._count_all_hashes(tree, counter, min_size=3)
        total = sum(counter.values())
        repeated = sum(c for c in counter.values() if c > 1)
        if total == 0:
            return 0.0
        return min(1.0, repeated / total)

    def _count_all_hashes(
        self, node: GenericNode, counter: Counter, min_size: int
    ) -> None:
        if node.size >= min_size:
            counter[node.merkle_hash()] += 1
        for child in node.children:
            self._count_all_hashes(child, counter, min_size)

    def _guard_clause_ratio(self, tree: GenericNode) -> float:
        """
        AI code often starts every function with guard clauses
        (if … return).  Count leading COND→RETURN patterns in functions.
        """
        funcs = self._collect_funcs(tree)
        if not funcs:
            return 0.0
        guarded = 0
        for func in funcs:
            if self._has_guard_clause(func):
                guarded += 1
        return guarded / len(funcs)

    def _collect_funcs(self, node: GenericNode) -> list[GenericNode]:
        result: list[GenericNode] = []
        if node.node_type in ("FUNC", "METHOD"):
            result.append(node)
        for child in node.children:
            result.extend(self._collect_funcs(child))
        return result

    @staticmethod
    def _has_guard_clause(func: GenericNode) -> bool:
        """True if the first child of a function body is COND containing RETURN."""
        for child in func.children[:3]:
            if child.node_type == "COND":
                for sub in child.children:
                    if sub.node_type == "RETURN":
                        return True
        return False

    # =====================================================================
    #  TEXTUAL SIGNALS (source-level)
    # =====================================================================

    def _comment_pattern_score(self, code: str, language: str) -> float:
        """Detect typical AI comment phrasing and comment density."""
        lines = code.split("\n")
        total_lines = len([l for l in lines if l.strip()])
        if total_lines == 0:
            return 0.0

        score = 0.0

        # 1. Comment density in the "AI sweet spot"  (15 – 45 %)
        comment_lines = 0
        for line in lines:
            s = line.strip()
            if language == "python":
                if s.startswith("#"):
                    comment_lines += 1
            else:
                if s.startswith(("//", "/*", "*")):
                    comment_lines += 1
        ratio = comment_lines / total_lines
        if 0.15 <= ratio <= 0.45:
            score += 0.25

        # 2. AI-typical phrases (expanded list)
        ai_phrases = [
            r"(?i)\bthis\s+(function|method|class)\b",
            r"(?i)\bhelper\s+(function|method)\b",
            r"(?i)\binitiali[sz]e\b",
            r"(?i)\bbase\s+case\b",
            r"(?i)\bedge\s+case\b",
            r"(?i)\binput\s+validation\b",
            r"(?i)\berror\s+handling\b",
            r"(?i)\bcheck\s+if\b",
            r"(?i)\breturn\s+the\s+result\b",
            r"(?i)\bdefault\s+value\b",
            r"(?i)\bexample\s+usage\b",
            r"(?i)\bensure\s+that\b",
            r"(?i)\bhandle\s+the\s+(case|error|exception)\b",
            r"(?i)\bcreate\s+(a|an|the)\s+\w+\s+object\b",
            r"(?i)\bset\s+up\b.*\b(configuration|environment)\b",
            r"(?i)\bclean\s+up\b",
            r"(?i)\bprocess\s+(the|each)\b",
            r"(?i)\biterate\s+(over|through)\b",
            r"(?i)\bconvert\s+to\b",
            r"(?i)\bsend\s+back\b",
            r"(?i)\bdefine\s+(a|the)\b",
            r"(?i)\bperform\s+(the|a)\b",
            r"(?i)\bextract\s+(the|a)\b",
            r"(?i)\bvalidate\s+(the|input)\b",
            r"(?i)\bno\s+data\s+(is\s+)?received\b",
        ]
        phrase_hits = sum(1 for p in ai_phrases if re.search(p, code))
        score += min(0.75, phrase_hits * 0.08)

        return min(1.0, score)

    def _naming_convention_score(self, code: str, language: str) -> float:
        """
        AI code tends to use very descriptive, long, snake_case / camelCase
        names consistently.  Human code mixes short and long names.
        """
        if language == "python":
            # Find all identifiers via regex (simple approximation)
            names = re.findall(r"\b([a-z_][a-z0-9_]{0,50})\b", code)
        else:
            names = re.findall(r"\b([a-zA-Z_]\w{0,50})\b", code)

        if len(names) < 5:
            return 0.0

        # Filter out keywords / builtins
        _KW = {
            "if", "else", "elif", "for", "while", "def", "class", "return",
            "import", "from", "as", "with", "try", "except", "finally",
            "raise", "pass", "break", "continue", "and", "or", "not", "in",
            "is", "True", "False", "None", "lambda", "yield", "global",
            "nonlocal", "assert", "del", "print", "self", "int", "str",
            "float", "list", "dict", "set", "tuple", "bool", "len", "range",
            "type", "void", "char", "double", "public", "private", "static",
            "final", "new", "this", "null", "case", "switch", "default",
            "include", "stdio", "stdlib", "string", "iostream", "using",
            "namespace", "std", "main", "printf", "scanf", "sizeof",
        }
        names = [n for n in names if n not in _KW and len(n) > 1]
        if not names:
            return 0.0

        # Metric 1: average name length (AI ≈ 8-20 chars, human ≈ 2-8)
        avg_len = sum(len(n) for n in names) / len(names)
        len_score = 0.0
        if 8 <= avg_len <= 25:
            len_score = min(1.0, (avg_len - 5) / 12)

        # Metric 2: fraction of names with underscores (descriptive style)
        underscore_frac = sum(1 for n in names if "_" in n) / len(names)
        us_score = min(1.0, underscore_frac * 1.5)

        # Metric 3: name length uniformity (AI names are all similar length)
        lengths = [len(n) for n in names]
        mean_l = sum(lengths) / len(lengths)
        if mean_l > 0:
            var_l = sum((l - mean_l) ** 2 for l in lengths) / len(lengths)
            cv_l = math.sqrt(var_l) / mean_l
            uniformity = max(0.0, 1.0 - cv_l)
        else:
            uniformity = 0.0

        return min(1.0, (len_score * 0.4 + us_score * 0.3 + uniformity * 0.3))

    def _docstring_density(self, code: str, language: str) -> float:
        """AI almost always adds docstrings to every function."""
        if language == "python":
            func_count = len(re.findall(r"^\s*def\s+", code, re.MULTILINE))
            docstrings = len(re.findall(r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'', code))
            if func_count == 0:
                return 0.0
            ratio = docstrings / func_count
            return min(1.0, ratio)
        elif language in ("java", "c", "cpp"):
            func_count = len(re.findall(
                r"(?:void|int|float|double|char|bool|string|public|private|static)\s+\w+\s*\(",
                code,
            ))
            javadoc = len(re.findall(r"/\*\*[\s\S]*?\*/", code))
            if func_count == 0:
                return 0.0
            return min(1.0, javadoc / func_count)
        return 0.0

    def _import_style_score(self, code: str, language: str) -> float:
        """
        AI code has perfectly organised imports (grouped, alphabetised).
        Human code usually just adds imports as needed.
        """
        if language != "python":
            return 0.0

        import_lines: list[str] = []
        for line in code.split("\n"):
            s = line.strip()
            if s.startswith("import ") or s.startswith("from "):
                import_lines.append(s)

        if len(import_lines) < 2:
            return 0.0

        score = 0.0

        # Check if imports are alphabetised
        sorted_imports = sorted(import_lines, key=str.lower)
        if import_lines == sorted_imports:
            score += 0.5

        # Check if stdlib / third-party / local groups are separated
        # (AI often puts blank lines between groups)
        has_blank_sep = False
        lines = code.split("\n")
        prev_was_import = False
        for line in lines:
            s = line.strip()
            is_import = s.startswith("import ") or s.startswith("from ")
            if prev_was_import and not s and not is_import:
                has_blank_sep = True
                break
            prev_was_import = is_import
        if has_blank_sep:
            score += 0.3

        # Check if 'from __future__' is present (AI loves this)
        if "from __future__" in code:
            score += 0.2

        return min(1.0, score)

    def _variable_name_entropy(self, code: str, language: str) -> float:
        """
        Low entropy in variable names → everything named descriptively
        with the same word patterns → AI.
        """
        if language == "python":
            # Capture assigned names
            assigned = re.findall(r"^[ \t]*([a-z_]\w*)\s*=", code, re.MULTILINE)
        else:
            assigned = re.findall(
                r"(?:int|float|double|char|bool|string|auto|var|let|const)\s+([a-zA-Z_]\w*)",
                code,
            )

        if len(assigned) < 3:
            return 0.0

        # Split names into word tokens (split on _ and camelCase boundaries)
        word_bag: list[str] = []
        for name in assigned:
            # Split on underscores
            parts = name.split("_")
            for part in parts:
                # Split camelCase
                words = re.findall(r"[a-z]+|[A-Z][a-z]*", part)
                word_bag.extend(w.lower() for w in words if len(w) > 1)

        if not word_bag:
            return 0.0

        counter = Counter(word_bag)
        total = sum(counter.values())

        # Shannon entropy of the word distribution
        entropy = 0.0
        for c in counter.values():
            p = c / total
            if p > 0:
                entropy -= p * math.log2(p)

        max_ent = math.log2(len(counter)) if len(counter) > 1 else 1.0
        normalised = entropy / max_ent if max_ent > 0 else 0.0

        # Low entropy = repetitive word choices = AI
        return max(0.0, min(1.0, 1.0 - normalised))

    def _code_to_logic_ratio(self, code: str, language: str) -> float:
        """
        Ratio of boilerplate lines (imports, docstrings, blank, comments)
        to logic lines.  AI code tends to be ~40-60% boilerplate.
        """
        lines = code.split("\n")
        total = len(lines)
        if total == 0:
            return 0.0

        boilerplate = 0
        in_docstring = False
        for line in lines:
            s = line.strip()
            if not s:
                boilerplate += 1
                continue
            # Docstrings
            if '"""' in s or "'''" in s:
                in_docstring = not in_docstring
                boilerplate += 1
                continue
            if in_docstring:
                boilerplate += 1
                continue
            # Comments
            if s.startswith("#") or s.startswith("//") or s.startswith("/*") or s.startswith("*"):
                boilerplate += 1
                continue
            # Imports
            if s.startswith("import ") or s.startswith("from ") or s.startswith("#include"):
                boilerplate += 1
                continue

        ratio = boilerplate / total
        # AI sweet spot: 35-65 % boilerplate
        if 0.35 <= ratio <= 0.65:
            return min(1.0, (ratio - 0.20) * 2)
        elif ratio > 0.65:
            return 0.6
        return max(0.0, ratio)

    def _line_length_uniformity(self, code: str) -> float:
        """
        AI code lines tend to be of very similar length (formatted to ~80 cols).
        Human code varies wildly.
        """
        lengths = [len(l) for l in code.split("\n") if l.strip()]
        if len(lengths) < 5:
            return 0.0
        mean = sum(lengths) / len(lengths)
        if mean == 0:
            return 0.0
        variance = sum((l - mean) ** 2 for l in lengths) / len(lengths)
        cv = math.sqrt(variance) / mean
        # Low CV → uniform → AI
        return max(0.0, min(1.0, 1.0 - cv / 1.5))

    def _string_format_consistency(self, code: str, language: str) -> float:
        """
        AI code uses one string formatting style consistently (f-strings,
        .format(), or %).  Human code often mixes styles.
        """
        if language != "python":
            return 0.0

        fstrings = len(re.findall(r'f"[^"]*"' + r"|f'[^']*'", code))
        dot_format = len(re.findall(r'\.format\s*\(', code))
        percent_fmt = len(re.findall(r'%\s*[\(\[]', code))
        concat = len(re.findall(r'str\(.*?\)\s*\+|"\s*\+\s*str\(', code))

        styles = [fstrings, dot_format, percent_fmt, concat]
        used = [s for s in styles if s > 0]
        total = sum(styles)

        if total == 0:
            return 0.0

        # Using only one style consistently is an AI signal
        if len(used) == 1 and total >= 3:
            return 0.9
        elif len(used) == 1 and total >= 1:
            return 0.5
        elif len(used) == 2:
            return 0.2
        return 0.0
    
    def _emoji_usage(self, code: str) -> float:
        """Use of emojis in comments or strings is a strong AI signal."""
        emoji_pattern = re.compile(
            r"[\U0001F600-\U0001F64F"  # Emoticons
            r"\U0001F300-\U0001F5FF"  # Symbols & Pictographs
            r"\U0001F680-\U0001F6FF"  # Transport & Map Symbols
            r"\U0001F700-\U0001F77F"  # Alchemical Symbols
            r"\U0001F780-\U0001F7FF"  # Geometric Shapes Extended
            r"\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
            r"\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
            r"\U0001FA00-\U0001FA6F"  # Chess Symbols
            r"\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
            r"\U00002702-\U000027B0"  # Dingbats
            r"]"
        )
        matches = emoji_pattern.findall(code)
        if not matches:
            return 0.0
        return min(1.0, len(matches) / 5)
    
    def _em_dash_usage(self, code: str) -> float:
        """Use of em-dashes (—) in comments or strings is a strong AI signal."""
        em_dash_count = code.count("\u2014")
        if em_dash_count == 0:
            return 0.0
        return min(1.0, em_dash_count / 5)
