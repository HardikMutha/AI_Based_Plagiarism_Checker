"""
Generic AST Node  The universal language-agnostic representation.
All language-specific ASTs are normalized into trees of GenericNode.
"""

from __future__ import annotations

import hashlib
import math
from collections import Counter
from typing import Optional


class GenericNode:
    """
    Language-agnostic AST node. All language-specific ASTs
    are normalized into trees of GenericNode.
    """

    TYPES = {
        "MODULE", "FUNC", "CLASS", "METHOD",
        "LOOP", "COND", "SWITCH", "CASE",
        "ASSIGN", "AUG_ASSIGN", "RETURN", "YIELD",
        "BINOP", "UNARYOP", "COMPARE", "BOOLOP",
        "CALL", "INDEX", "MEMBER", "SLICE",
        "VAR", "LITERAL", "STR_LITERAL",
        "BLOCK", "EXPR_STMT",
        "TRY", "CATCH", "FINALLY", "THROW",
        "IMPORT", "BREAK", "CONTINUE", "PASS",
        "ASSERT", "DELETE", "GLOBAL",
        "LAMBDA", "COMPREHENSION", "GENERATOR",
        "WITH", "DECORATOR", "ANNOTATION",
        "PARAM", "ARG", "KEYWORD_ARG",
        "TERNARY", "AWAIT", "ASYNC",
        "STRUCT", "ENUM", "TYPEDEF", "POINTER",
        "ARRAY_DECL", "CAST",
        "UNKNOWN",
    }

    def __init__(
        self,
        node_type: str,
        children: Optional[list[GenericNode]] = None,
        metadata: Optional[dict] = None,
    ):
        self.node_type = node_type
        self.children = children or []
        self.metadata = metadata or {}
        self._hash: Optional[int] = None

    def add_child(self, child: GenericNode) -> None:
        self.children.append(child)
        self._hash = None

    @property
    def size(self) -> int:
        return 1 + sum(c.size for c in self.children)

    @property
    def depth(self) -> int:
        if not self.children:
            return 1
        return 1 + max(c.depth for c in self.children)

    @property
    def branching_factor(self) -> float:
        internal_nodes = self._count_internal()
        if internal_nodes == 0:
            return 0.0
        return self._total_children() / internal_nodes

    def _count_internal(self) -> int:
        count = 1 if self.children else 0
        for c in self.children:
            count += c._count_internal()
        return count

    def _total_children(self) -> int:
        total = len(self.children)
        for c in self.children:
            total += c._total_children()
        return total

    def merkle_hash(self) -> int:
        """Bottom-up Merkle-tree hash. Includes type + all children's hashes."""
        if self._hash is not None:
            return self._hash

        child_hashes = tuple(c.merkle_hash() for c in self.children)
        hash_input = f"{self.node_type}|{'|'.join(str(h) for h in child_hashes)}"
        self._hash = int(hashlib.sha256(hash_input.encode()).hexdigest()[:16], 16)
        return self._hash

    def all_subtree_hashes(self, min_size: int = 2) -> dict[int, GenericNode]:
        """Collect hashes of all subtrees with at least `min_size` nodes."""
        result = {}
        if self.size >= min_size:
            result[self.merkle_hash()] = self
        for child in self.children:
            result.update(child.all_subtree_hashes(min_size))
        return result

    def node_type_histogram(self) -> Counter:
        counter = Counter()
        counter[self.node_type] += 1
        for child in self.children:
            counter.update(child.node_type_histogram())
        return counter

    def depth_histogram(self) -> Counter:
        counter: Counter = Counter()
        self._depth_hist_helper(counter, depth=0)
        return counter

    def _depth_hist_helper(self, counter: Counter, depth: int) -> None:
        counter[depth] += 1
        for child in self.children:
            child._depth_hist_helper(counter, depth + 1)

    def subtree_sizes(self) -> list[int]:
        sizes = [self.size]
        for child in self.children:
            sizes.extend(child.subtree_sizes())
        return sizes

    def flatten_types(self) -> list[str]:
        """Pre-order traversal of node types."""
        result = [self.node_type]
        for child in self.children:
            result.extend(child.flatten_types())
        return result

    def __repr__(self) -> str:
        return self._repr_tree(indent=0)

    def _repr_tree(self, indent: int = 0) -> str:
        prefix = "  " * indent
        lines = [f"{prefix}{self.node_type}"]
        for child in self.children:
            lines.append(child._repr_tree(indent + 1))
        return "\n".join(lines)