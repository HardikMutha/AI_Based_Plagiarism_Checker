"""
Language-specific AST parsers.
Each parser converts language-specific AST → GenericNode tree.
"""

from app.services.code_plagiarism_detector.parsers.python_parser import PythonASTParser
from app.services.code_plagiarism_detector.parsers.java_parser import JavaASTParser
from app.services.code_plagiarism_detector.parsers.c_parser import CASTParser
from app.services.code_plagiarism_detector.parsers.cpp_parser import CppASTParser

__all__ = [
    "PythonASTParser",
    "JavaASTParser",
    "CASTParser",
    "CppASTParser",
]