"""C++ AST Parser — regex-based structural extraction."""

from __future__ import annotations

import re
from typing import Optional

from app.services.code_plagiarism_detector.base_parser import ASTParser
from app.services.code_plagiarism_detector.generic_node import GenericNode


class CppASTParser(ASTParser):
    """
    C++ parser using regex-based structural extraction.
    For production use, consider tree-sitter-cpp for full parsing.
    """

    name = "cpp"
    file_extensions = [".cpp", ".cc", ".cxx", ".hpp"]

    def parse(self, code: str) -> GenericNode:
        code = self._strip_comments(code)
        code = self._strip_preprocessor(code)
        return self._parse_block(code, "MODULE")

    def _strip_comments(self, code: str) -> str:
        code = re.sub(r"/\*[\s\S]*?\*/", "", code)
        code = re.sub(r"//.*", "", code)
        return code

    def _strip_preprocessor(self, code: str) -> str:
        lines = code.split("\n")
        result = []
        for line in lines:
            if line.strip().startswith("#"):
                result.append("")
            else:
                result.append(line)
        return "\n".join(result)

    def _parse_block(self, code: str, context: str = "BLOCK") -> GenericNode:
        root = GenericNode(context)

        # Detect classes/structs
        for match in re.finditer(r"\b(class|struct)\s+(\w+)[^{]*\{", code):
            cls_node = GenericNode("CLASS")
            body = self._extract_braced(code, match.end() - 1)
            if body:
                for child in self._parse_block(body, "BLOCK").children:
                    cls_node.add_child(child)
            root.add_child(cls_node)

        # Detect functions/methods
        func_pattern = r"""
            (?:(?:static|virtual|inline|const|explicit|override)\s+)*
            (?:[\w:*&<>]+\s+)+
            ([\w:~]+)
            \s*\([^)]*\)
            \s*(?:const)?\s*
            \{
        """
        for match in re.finditer(func_pattern, code, re.VERBOSE):
            func_node = GenericNode("FUNC")
            param_str = re.search(r"\(([^)]*)\)", match.group())
            if param_str:
                params = [
                    p.strip()
                    for p in param_str.group(1).split(",")
                    if p.strip()
                ]
                func_node.metadata["param_count"] = len(params)

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
            (r"\belse\s+if\s*\(", "COND"),
            (r"\belse\s*\{", "COND"),
            (r"\bswitch\s*\(", "SWITCH"),
            (r"\bcase\s+", "CASE"),
            (r"\btry\s*\{", "TRY"),
            (r"\bcatch\s*\(", "CATCH"),
            (r"\breturn\b", "RETURN"),
            (r"\bthrow\b", "THROW"),
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