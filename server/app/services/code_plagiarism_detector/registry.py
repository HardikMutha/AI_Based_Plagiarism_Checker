"""
This module defines the ParserRegistry class, which maintains a registry of AST parsers 
for different programming languages. 

we can add new parsers by subclassing ASTParser and registering them with ParserRegistry.register().


"""

from __future__ import annotations

from pathlib import Path

from app.services.code_plagiarism_detector.base_parser import ASTParser


class ParserRegistry:
    """
    Central registry for AST parsers.

    To add a new language:
        class RustASTParser(ASTParser):
            name = "rust"
            file_extensions = [".rs"]
            def parse(self, code): ...

        ParserRegistry.register(RustASTParser)
    """

    _parsers: dict[str, type[ASTParser]] = {}
    _ext_map: dict[str, str] = {}

    @classmethod
    def register(cls, parser_cls: type[ASTParser]) -> None:
        cls._parsers[parser_cls.name] = parser_cls
        for ext in parser_cls.file_extensions:
            cls._ext_map[ext] = parser_cls.name

    @classmethod
    def get(cls, language: str) -> ASTParser:
        language = language.lower()
        if language not in cls._parsers:
            raise ValueError(
                f"Unsupported language: '{language}'. "
                f"Supported: {list(cls._parsers.keys())}"
            )
        return cls._parsers[language]()

    @classmethod
    def detect_language(cls, filepath: str) -> str:
        ext = Path(filepath).suffix.lower()
        if ext not in cls._ext_map:
            raise ValueError(
                f"Cannot detect language for '{ext}'. "
                f"Supported: {list(cls._ext_map.keys())}"
            )
        return cls._ext_map[ext]

    @classmethod
    def supported_languages(cls) -> list[str]:
        return list(cls._parsers.keys())


def _register_builtin_parsers() -> None:
    from app.services.code_plagiarism_detector.parsers.python_parser import PythonASTParser
    from app.services.code_plagiarism_detector.parsers.cpp_parser import CppASTParser

    ParserRegistry.register(PythonASTParser)
    ParserRegistry.register(CppASTParser)

    try:
        from app.services.code_plagiarism_detector.parsers.java_parser import JavaASTParser
        ParserRegistry.register(JavaASTParser)
    except ImportError:
        pass

    try:
        from app.services.code_plagiarism_detector.parsers.c_parser import CASTParser
        ParserRegistry.register(CASTParser)
    except ImportError:
        pass


_register_builtin_parsers()