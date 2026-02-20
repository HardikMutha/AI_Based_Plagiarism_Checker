from __future__ import annotations

import re
import textwrap
from typing import Optional
from app.services.code_plagiarism_detector.base_parser import ASTParser
from app.services.code_plagiarism_detector.generic_node import GenericNode
try:
    import pycparser
    import pycparser.c_parser
    HAS_PYCPARSER = True
except ImportError:
    HAS_PYCPARSER = False


class CASTParser(ASTParser):
    name = "c"
    file_extensions = [".c", ".h"]

    def __init__(self):
        if not HAS_PYCPARSER:
            raise ImportError("C support requires 'pycparser'. Install: pip install pycparser")

    def _strip_comments(self, code: str) -> str:
        """Remove all C-style comments (/* ... */ and // ...)."""
        # Remove multi-line comments first
        code = re.sub(r"/\*[\s\S]*?\*/", "", code)
        # Remove single-line comments
        code = re.sub(r"//.*", "", code)
        return code

    def _strip_preprocessor(self, code: str) -> str:
        """Remove ALL preprocessor directives."""
        lines = code.split("\n")
        cleaned = []
        in_multiline_directive = False
        for line in lines:
            stripped = line.strip()
            if in_multiline_directive:
                if not stripped.endswith("\\"):
                    in_multiline_directive = False
                cleaned.append("")
                continue
            if stripped.startswith("#"):
                if stripped.endswith("\\"):
                    in_multiline_directive = True
                cleaned.append("")
            else:
                cleaned.append(line)
        return "\n".join(cleaned)

    def _strip_string_literals(self, code: str) -> str:
        """Replace string/char literals to avoid parse issues."""
        # Replace string literals with placeholder (preserving structure)
        code = re.sub(r'"(?:[^"\\]|\\.)*"', '""', code)
        # Replace char literals
        code = re.sub(r"'(?:[^'\\]|\\.)'", "'x'", code)
        return code

    def _common_typedefs(self) -> str:
        return textwrap.dedent("""\
            typedef int size_t;
            typedef int ssize_t;
            typedef int bool;
            typedef unsigned int uint32_t;
            typedef unsigned long uint64_t;
            typedef int int32_t;
            typedef long int64_t;
            typedef void* FILE;
            typedef int pid_t;
            typedef int wchar_t;
            typedef int ptrdiff_t;
            typedef int intptr_t;
            typedef unsigned int uintptr_t;
        """)

    def parse(self, code: str) -> GenericNode:
        # Step 1: Strip comments FIRST (pycparser cannot handle them)
        code = self._strip_comments(code)
        # Step 2: Strip preprocessor directives
        code = self._strip_preprocessor(code)
        # Step 3: Simplify string literals
        code = self._strip_string_literals(code)

        preamble = self._common_typedefs()
        parser = pycparser.CParser()

        # Try 1: Full translation unit
        try:
            tree = parser.parse(preamble + code, filename="<input>")
            return self._convert(tree)
        except pycparser.c_parser.ParseError:
            pass

        # Try 2: Wrap in function (for snippets)
        try:
            wrapped = preamble + "void __wrapper__(void) {\n" + code + "\n}"
            tree = parser.parse(wrapped, filename="<input>")
            return self._convert(tree)
        except pycparser.c_parser.ParseError:
            pass

        # Try 3: Aggressive cleanup
        try:
            aggressive = code
            aggressive = re.sub(r"__attribute__\s*\(\(.*?\)\)", "", aggressive)
            aggressive = re.sub(r"\b(inline|volatile|register|restrict|__restrict)\b", "", aggressive)
            aggressive = re.sub(r"\b(__builtin_\w+)", "0", aggressive)
            tree = parser.parse(preamble + aggressive, filename="<input>")
            return self._convert(tree)
        except pycparser.c_parser.ParseError:
            pass

        # Try 4: Aggressive cleanup + wrap
        try:
            wrapped = preamble + "void __wrapper__(void) {\n" + aggressive + "\n}"
            tree = parser.parse(wrapped, filename="<input>")
            return self._convert(tree)
        except pycparser.c_parser.ParseError as e:
            print(f"⚠ pycparser failed, using fallback parser: {e}")
            return self._fallback_parse(code)

    def _convert(self, node) -> GenericNode:
        node_type = self._map_node_type(node)
        metadata = {}
        if hasattr(node, "name") and node.name:
            metadata["name_present"] = True
        generic = GenericNode(node_type, metadata=metadata)
        for _, child in node.children():
            generic.add_child(self._convert(child))
        return generic

    def _map_node_type(self, node) -> str:
        type_name = type(node).__name__
        mapping = {
            "FileAST": "MODULE",
            "FuncDef": "FUNC",
            "FuncDecl": "FUNC",
            "Decl": "ASSIGN",
            "TypeDecl": "TYPEDEF",
            "ArrayDecl": "ARRAY_DECL",
            "PtrDecl": "POINTER",
            "Struct": "STRUCT",
            "Union": "STRUCT",
            "Enum": "ENUM",
            "Compound": "BLOCK",
            "Assignment": "ASSIGN",
            "If": "COND",
            "For": "LOOP",
            "While": "LOOP",
            "DoWhile": "LOOP",
            "Switch": "SWITCH",
            "Case": "CASE",
            "Default": "CASE",
            "Return": "RETURN",
            "Break": "BREAK",
            "Continue": "CONTINUE",
            "BinaryOp": "BINOP",
            "UnaryOp": "UNARYOP",
            "TernaryOp": "TERNARY",
            "FuncCall": "CALL",
            "ID": "VAR",
            "Constant": "LITERAL",
            "ArrayRef": "INDEX",
            "StructRef": "MEMBER",
            "Cast": "CAST",
            "ExprList": "BLOCK",
            "DeclList": "BLOCK",
            "ParamList": "BLOCK",
            "Typedef": "TYPEDEF",
            "Goto": "UNKNOWN",
            "Label": "UNKNOWN",
            "EmptyStatement": "PASS",
            "IdentifierType": "UNKNOWN",
            "NamedInitializer": "ASSIGN",
            "Pragma": "UNKNOWN",
        }
        return mapping.get(type_name, "UNKNOWN")

    def _fallback_parse(self, code: str) -> GenericNode:
        """Regex-based fallback when pycparser can't handle the input."""
        root = GenericNode("MODULE")

        # Detect functions
        for match in re.finditer(r"(?:[\w*]+\s+)+(\w+)\s*\([^)]*\)\s*\{", code):
            func_node = GenericNode("FUNC")
            body = self._extract_braced(code, match.end() - 1)
            if body:
                self._parse_statements(body, func_node)
            root.add_child(func_node)

        return root

    def _parse_statements(self, code: str, parent: GenericNode) -> None:
        patterns = [
            (r"\bfor\s*\(", "LOOP"),
            (r"\bwhile\s*\(", "LOOP"),
            (r"\bdo\s*\{", "LOOP"),
            (r"\bif\s*\(", "COND"),
            (r"\bswitch\s*\(", "SWITCH"),
            (r"\breturn\b", "RETURN"),
            (r"\bbreak\b", "BREAK"),
            (r"\bcontinue\b", "CONTINUE"),
        ]
        for pattern, node_type in patterns:
            for match in re.finditer(pattern, code):
                node = GenericNode(node_type)
                brace_pos = code.find("{", match.end())
                if brace_pos != -1 and brace_pos - match.end() < 50:
                    body = self._extract_braced(code, brace_pos)
                    if body:
                        self._parse_statements(body, node)
                parent.add_child(node)

        for _ in re.finditer(r"[^=!<>]=[^=]", code):
            parent.add_child(GenericNode("ASSIGN"))
        for _ in re.finditer(r"\b\w+\s*\(", code):
            parent.add_child(GenericNode("CALL"))
        for _ in re.finditer(r"[+\-*/%](?!=)", code):
            parent.add_child(GenericNode("BINOP"))
        for _ in re.finditer(r"[<>]=?|[!=]=", code):
            parent.add_child(GenericNode("COMPARE"))

    def _extract_braced(self, code: str, start: int) -> Optional[str]:
        if start >= len(code) or code[start] != "{":
            return None
        depth = 0
        for i in range(start, len(code)):
            if code[i] == "{":
                depth += 1
            elif code[i] == "}":
                depth -= 1
                if depth == 0:
                    return code[start + 1 : i]
        return None
