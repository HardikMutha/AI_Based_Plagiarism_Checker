"""
This AST based plagiarism detector is Extensible to new languages via plugin architecture.

To use this library, simply do the following:
    from plagiarism_detector import PlagiarismDetector, AICodeDetector

    detector = PlagiarismDetector()
    result = detector.compare_code(code_a, code_b, "python")

    ai = AICodeDetector()
    ai_result = ai.analyze_code(code, "python")

"""

from  app.services.code_plagiarism_detector.detector import PlagiarismDetector
from  app.services.code_plagiarism_detector.ai_detector import AICodeDetector
from  app.services.code_plagiarism_detector.registry import ParserRegistry
from  app.services.code_plagiarism_detector.generic_node import GenericNode

__all__ = [
    "PlagiarismDetector",
    "AICodeDetector",
    "ParserRegistry",
    "GenericNode",
]