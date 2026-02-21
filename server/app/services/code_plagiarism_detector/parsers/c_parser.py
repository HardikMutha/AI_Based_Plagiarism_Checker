from __future__ import annotations

from tree_sitter import Parser, Language
from tree_sitter_c import language as c_language_capsule

from app.services.code_plagiarism_detector.base_parser import ASTParser
from app.services.code_plagiarism_detector.generic_node import GenericNode


class CASTParser(ASTParser):
    name = "c"
    file_extensions = [".c", ".h"]

    def __init__(self):
        # Convert PyCapsule → Language object
        C_LANGUAGE = Language(c_language_capsule())
        self.parser = Parser(C_LANGUAGE)

    def parse(self, code: str) -> GenericNode:
        try:
            tree = self.parser.parse(code.encode("utf8"))
            return self._convert(tree.root_node)
        except Exception as e:
            print(f"[Tree-sitter C Parse Error] {e}")
            return GenericNode("MODULE")

    def _convert(self, node) -> GenericNode:
        node_type = self._map_node_type(node.type)

        metadata = {}
        if node.type == "identifier":
            metadata["name_present"] = True

        generic = GenericNode(node_type, metadata=metadata)

        for child in node.children:
            if child.is_named:
                generic.add_child(self._convert(child))

        return generic

    def _map_node_type(self, node_type: str) -> str:
        mapping = {
            "translation_unit": "MODULE",
            "function_definition": "FUNC",
            "declaration": "ASSIGN",
            "init_declarator": "ASSIGN",
            "compound_statement": "BLOCK",
            "if_statement": "COND",
            "for_statement": "LOOP",
            "while_statement": "LOOP",
            "do_statement": "LOOP",
            "switch_statement": "SWITCH",
            "case_statement": "CASE",
            "return_statement": "RETURN",
            "break_statement": "BREAK",
            "continue_statement": "CONTINUE",
            "binary_expression": "BINOP",
            "unary_expression": "UNARYOP",
            "assignment_expression": "ASSIGN",
            "call_expression": "CALL",
            "cast_expression": "CAST",
            "conditional_expression": "TERNARY",
            "field_expression": "MEMBER",
            "subscript_expression": "INDEX",
            "number_literal": "LITERAL",
            "string_literal": "LITERAL",
            "char_literal": "LITERAL",
            "struct_specifier": "STRUCT",
            "union_specifier": "STRUCT",
            "enum_specifier": "ENUM",
            "identifier": "VAR",
        }

        return mapping.get(node_type, "UNKNOWN")