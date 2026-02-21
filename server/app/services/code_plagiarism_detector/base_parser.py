"""
Abstract base class for language-specific AST parsers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.services.code_plagiarism_detector.generic_node import GenericNode


class ASTParser(ABC):
    """
    Abstract base for language-specific AST parsers.

    To add a new language:
        1. Subclass ASTParser
        2. Set `name` and `file_extensions`
        3. Implement `parse()` returning a GenericNode tree
        4. Register via ParserRegistry.register(YourParser)
    """

    name: str = ""
    file_extensions: list[str] = []

    @abstractmethod
    def parse(self, code: str) -> GenericNode:
        """Parse source code into a GenericNode tree."""
        ...