"""
This module defines the TreeComparator class, which implements 
following algorithms for comparing GenericNode trees:
- subtree_jaccard: Jaccard similarity of subtree hash sets
- node_type_cosine: Cosine similarity of node-type frequency vectors
- tree_edit_distance_approx: Approximate tree edit distance using flattened type sequences + LCS
- structural_profile_similarity: Compare structural profiles (depth, branching, node types)

"""

from __future__ import annotations

import math
import re
from collections import Counter
from difflib import SequenceMatcher

from app.services.code_plagiarism_detector.generic_node import GenericNode


class TreeComparator:
    """Structural comparison algorithms for GenericNode trees."""

    @staticmethod
    def subtree_jaccard(
        tree_a: GenericNode, tree_b: GenericNode, min_size: int = 3
    ) -> float:
        """Jaccard similarity of subtree hash sets."""
        hashes_a = set(tree_a.all_subtree_hashes(min_size).keys())
        hashes_b = set(tree_b.all_subtree_hashes(min_size).keys())

        if not hashes_a and not hashes_b:
            return 1.0
        if not hashes_a or not hashes_b:
            return 0.0

        intersection = hashes_a & hashes_b
        union = hashes_a | hashes_b
        return len(intersection) / len(union)

    @staticmethod
    def node_type_cosine(
        tree_a: GenericNode, tree_b: GenericNode
    ) -> float:
        """Cosine similarity of node-type frequency vectors."""
        hist_a = tree_a.node_type_histogram()
        hist_b = tree_b.node_type_histogram()

        all_types = set(hist_a.keys()) | set(hist_b.keys())
        if not all_types:
            return 1.0

        dot = sum(hist_a.get(t, 0) * hist_b.get(t, 0) for t in all_types)
        mag_a = math.sqrt(sum(v**2 for v in hist_a.values()))
        mag_b = math.sqrt(sum(v**2 for v in hist_b.values()))

        if mag_a == 0 or mag_b == 0:
            return 0.0
        return dot / (mag_a * mag_b)

    @staticmethod
    def tree_edit_distance_approx(
        tree_a: GenericNode, tree_b: GenericNode
    ) -> float:
        """
        Approximate tree edit distance using flattened type sequences + LCS.
        Returns similarity (1.0 = identical, 0.0 = completely different).
        """
        seq_a = tree_a.flatten_types()
        seq_b = tree_b.flatten_types()

        if not seq_a and not seq_b:
            return 1.0
        if not seq_a or not seq_b:
            return 0.0

        m, n = len(seq_a), len(seq_b)

        if m > 5000 or n > 5000:
            step = max(m, n) // 5000 + 1
            seq_a = seq_a[::step]
            seq_b = seq_b[::step]
            m, n = len(seq_a), len(seq_b)

        prev = [0] * (n + 1)
        curr = [0] * (n + 1)

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if seq_a[i - 1] == seq_b[j - 1]:
                    curr[j] = prev[j - 1] + 1
                else:
                    curr[j] = max(prev[j], curr[j - 1])
            prev, curr = curr, [0] * (n + 1)

        lcs_len = prev[n]
        return (2 * lcs_len) / (m + n)

    @staticmethod
    def structural_profile_similarity(
        tree_a: GenericNode, tree_b: GenericNode
    ) -> float:
        """Compare structural profiles (depth, branching, node types)."""
        features_a = TreeComparator._extract_profile(tree_a)
        features_b = TreeComparator._extract_profile(tree_b)

        all_keys = set(features_a.keys()) | set(features_b.keys())
        if not all_keys:
            return 1.0

        dot = sum(
            features_a.get(k, 0) * features_b.get(k, 0) for k in all_keys
        )
        mag_a = math.sqrt(sum(v**2 for v in features_a.values()))
        mag_b = math.sqrt(sum(v**2 for v in features_b.values()))

        if mag_a == 0 or mag_b == 0:
            return 0.0
        return dot / (mag_a * mag_b)

    @staticmethod
    def _extract_profile(tree: GenericNode) -> dict[str, float]:
        profile: dict[str, float] = {}
        hist = tree.node_type_histogram()
        total = sum(hist.values())

        for k, v in hist.items():
            profile[f"type_{k}"] = v / total if total else 0

        profile["max_depth"] = tree.depth / 20.0
        depth_hist = tree.depth_histogram()
        for d, count in depth_hist.items():
            profile[f"depth_{d}"] = count / total if total else 0

        profile["total_size"] = tree.size / 500.0
        profile["branching_factor"] = tree.branching_factor / 5.0
        return profile

    @staticmethod
    def find_matching_subtrees(
        tree_a: GenericNode,
        tree_b: GenericNode,
        min_size: int = 5,
    ) -> list[tuple[GenericNode, GenericNode, int]]:
        """Find all matching subtrees, sorted by size (largest first)."""
        hashes_a = tree_a.all_subtree_hashes(min_size)
        hashes_b = tree_b.all_subtree_hashes(min_size)

        common = set(hashes_a.keys()) & set(hashes_b.keys())
        matches = []
        for h in common:
            node_a = hashes_a[h]
            node_b = hashes_b[h]
            matches.append((node_a, node_b, node_a.size))

        matches.sort(key=lambda x: x[2], reverse=True)
        return matches

    @staticmethod
    def _normalize_line(line: str) -> str:
        """
        Normalize a source line for comparison:
        - strip whitespace
        - collapse all whitespace runs to single space
        - lowercase
        - remove pure-comment / blank lines (return empty)
        """
        stripped = line.strip()
        if not stripped:
            return ""
        # Skip single-character brace/bracket lines
        if stripped in ("{", "}", "(", ")", ";"):
            return ""
        # Skip Python/C/Java comment-only lines
        if stripped.startswith("#") or stripped.startswith("//"):
            return ""
        # Collapse whitespace and lowercase
        return re.sub(r"\s+", " ", stripped).lower()

    @staticmethod
    def find_similar_lines(
        code_a: str,
        code_b: str,
        min_ratio: float = 0.7,
    ) -> list[tuple[int, str, int, str, float]]:
        """
        Find pairs of similar source lines between two files.

        Returns a list of (line_no_a, line_text_a, line_no_b, line_text_b, ratio)
        sorted by line_no_a.
        """
        lines_a = code_a.splitlines()
        lines_b = code_b.splitlines()

        norm_a = [TreeComparator._normalize_line(l) for l in lines_a]
        norm_b = [TreeComparator._normalize_line(l) for l in lines_b]

        b_index: dict[str, list[int]] = {}
        for j, nb in enumerate(norm_b):
            if nb:
                b_index.setdefault(nb, []).append(j)

        matched_b: set[int] = set()
        similar: list[tuple[int, str, int, str, float]] = []

        for i, na in enumerate(norm_a):
            if not na:
                continue

            best_j = -1
            best_ratio = 0.0

            if na in b_index:
                for j in b_index[na]:
                    if j not in matched_b:
                        best_j = j
                        best_ratio = 1.0
                        break

            if best_j == -1:
                for j, nb in enumerate(norm_b):
                    if not nb or j in matched_b:
                        continue
                    ratio = SequenceMatcher(None, na, nb).ratio()
                    if ratio >= min_ratio and ratio > best_ratio:
                        best_ratio = ratio
                        best_j = j

            if best_j != -1:
                matched_b.add(best_j)
                similar.append(
                    (i + 1, lines_a[i].rstrip(), best_j + 1, lines_b[best_j].rstrip(), round(best_ratio, 2))
                )

        similar.sort(key=lambda x: x[0])
        return similar