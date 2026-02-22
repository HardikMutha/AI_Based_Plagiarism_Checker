"""
Main plagiarism detection engine.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from app.services.code_plagiarism_detector.registry import ParserRegistry
from app.services.code_plagiarism_detector.comparator import TreeComparator
from app.services.code_plagiarism_detector.results import PlagiarismResult


class PlagiarismDetector:
    """
    AST-based plagiarism detection engine.

    Compares code structurally using:
    - Subtree hash matching (Merkle-tree fingerprints)
    - Tree sequence similarity (LCS on flattened AST)
    - Structural profile similarity (feature vectors)
    """

    def compare_code(
        self,
        code_a: str,
        code_b: str,
        language_a: str = "python",
        language_b: Optional[str] = None,
        label_a: str = "code_a",
        label_b: str = "code_b",
    ) -> PlagiarismResult:
        if language_b is None:
            language_b = language_a

        parser_a = ParserRegistry.get(language_a)
        parser_b = ParserRegistry.get(language_b)

        tree_a = parser_a.parse(code_a)
        tree_b = parser_b.parse(code_b)


        return self._compare_trees(
            tree_a, tree_b, label_a, label_b, language_a, language_b,
            code_a, code_b,
        )

    def compare_files(
        self,
        filepath_a: str,
        filepath_b: str,
        language_a: Optional[str] = None,
        language_b: Optional[str] = None,
    ) -> PlagiarismResult:
        code_a = Path(filepath_a).read_text(encoding="utf-8")
        code_b = Path(filepath_b).read_text(encoding="utf-8")

        if language_a is None:
            language_a = ParserRegistry.detect_language(filepath_a)
        if language_b is None:
            language_b = ParserRegistry.detect_language(filepath_b)

        return self.compare_code(
            code_a, code_b, language_a, language_b, filepath_a, filepath_b,
        )

    def batch_compare(
        self, filepaths: list[str]
    ) -> list[PlagiarismResult]:
        results = []
        for i in range(len(filepaths)):
            for j in range(i + 1, len(filepaths)):
                try:
                    result = self.compare_files(filepaths[i], filepaths[j])
                    results.append(result)
                except (ValueError, Exception) as e:
                    print(
                        f"⚠ Skipping {filepaths[i]} vs {filepaths[j]}: {e}"
                    )
        results.sort(key=lambda r: r.overall_score, reverse=True)
        return results

    def _compare_trees(
        self,
        tree_a,
        tree_b,
        label_a: str,
        label_b: str,
        lang_a: str,
        lang_b: str,
        code_a: str = "",
        code_b: str = "",
    ) -> PlagiarismResult:
        subtree_sim = TreeComparator.subtree_jaccard(tree_a, tree_b)
        sequence_sim = TreeComparator.tree_edit_distance_approx(
            tree_a, tree_b
        )
        profile_sim = TreeComparator.structural_profile_similarity(
            tree_a, tree_b
        )

        matches = TreeComparator.find_matching_subtrees(
            tree_a, tree_b, min_size=5
        )

        similar_lines = []
        if code_a and code_b:
            similar_lines = TreeComparator.find_similar_lines(code_a, code_b)

        return PlagiarismResult(
            file_a=label_a,
            file_b=label_b,
            language_a=lang_a,
            language_b=lang_b,
            subtree_similarity=round(subtree_sim, 4),
            sequence_similarity=round(sequence_sim, 4),
            profile_similarity=round(profile_sim, 4),
            matching_structures=len(matches),
            largest_match_size=matches[0][2] if matches else 0,
            similar_lines=similar_lines,
        )