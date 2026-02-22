"""C++ AST Parser — regex-based structural extraction."""

from __future__ import annotations

from app.services.code_plagiarism_detector.base_parser import ASTParser
from app.services.code_plagiarism_detector.generic_node import GenericNode

try:
    import tree_sitter_cpp
    from tree_sitter import Language, Parser
    
    CPP_LANGUAGE = Language(tree_sitter_cpp.language())
    HAS_TREE_SITTER = True
except ImportError:
    HAS_TREE_SITTER = False


class CppASTParser(ASTParser):
    """
    C++ parser using tree-sitter for accurate AST extraction.
    Install: pip install tree-sitter tree-sitter-cpp
    """

    name = "cpp"
    file_extensions = [".cpp", ".cc", ".cxx", ".hpp"]

    ignore_nodes = {
        "comment",
        "preproc_include",
        "preproc_def",
        "preproc_ifdef",
        "preproc_if",
        "preproc_else",
        "preproc_endif",
        "preproc_call",
        "system_lib_string",
        "string_literal",
        "number_literal",
        "char_literal",
        "null",
        "true",
        "false",
        "primitive_type",
        "type_qualifier",
        "storage_class_specifier",
        "namespace_identifier",
        "ERROR",
    }

    def __init__(self):
        if not HAS_TREE_SITTER:
            raise ImportError(
                "C++ support requires 'tree-sitter' and 'tree-sitter-cpp'. "
                "Install: pip install tree-sitter tree-sitter-cpp"
            )
        self._parser = Parser(CPP_LANGUAGE)

    def parse(self, code: str) -> GenericNode:
        tree = self._parser.parse(code.encode("utf-8"))
        return self._convert(tree.root_node)

    def _convert(self, node) -> GenericNode:
        node_type = self._map_node_type(node)
        metadata = {}

        # Capture parameter count for functions
        if node.type in (
            "function_definition",
            "function_declarator",
            "constructor_or_destructor_definition",
        ):
            param_list = self._find_child_by_type(node, "parameter_list")
            if param_list:
                params = [
                    c for c in param_list.children
                    if c.type == "parameter_declaration"
                ]
                metadata["param_count"] = len(params)

        # Mark named declarations
        name_node = self._find_child_by_type(node, "identifier") or \
                    self._find_child_by_type(node, "field_identifier") or \
                    self._find_child_by_type(node, "destructor_name")
        if name_node:
            metadata["name_present"] = True

        generic = GenericNode(node_type, metadata=metadata)

        for child in node.children:
            if child.type in self.ignore_nodes:
                continue
            # Skip purely punctuation / keyword leaf nodes
            if not child.children and child.type in self._punctuation_types():
                continue
            child_generic = self._convert(child)
            if child_generic.node_type != "UNKNOWN" or child.children:
                generic.add_child(child_generic)

        return generic

    def _map_node_type(self, node) -> str:
        t = node.type
        mapping = {
            # Top-level
            "translation_unit": "MODULE",
            # Types / declarations
            "class_specifier": "CLASS",
            "struct_specifier": "CLASS",
            "union_specifier": "CLASS",
            "enum_specifier": "ENUM",
            "namespace_definition": "NAMESPACE",
            # Functions
            "function_definition": "FUNC",
            "constructor_or_destructor_definition": "FUNC",
            "lambda_expression": "LAMBDA",
            # Parameters
            "parameter_declaration": "PARAM",
            # Variables / assignments
            "declaration": "ASSIGN",
            "init_declarator": "ASSIGN",
            "field_declaration": "ASSIGN",
            "assignment_expression": "ASSIGN",
            # Control flow
            "if_statement": "COND",
            "for_statement": "LOOP",
            "while_statement": "LOOP",
            "do_statement": "LOOP",
            "for_range_loop": "LOOP",
            "switch_statement": "SWITCH",
            "case_statement": "CASE",
            "return_statement": "RETURN",
            "break_statement": "BREAK",
            "continue_statement": "CONTINUE",
            "goto_statement": "GOTO",
            # Exception handling
            "try_statement": "TRY",
            "catch_clause": "CATCH",
            "throw_statement": "THROW",
            # Expressions
            "call_expression": "CALL",
            "binary_expression": "BINOP",
            "unary_expression": "UNOP",
            "conditional_expression": "TERNARY",
            "subscript_expression": "INDEX",
            "cast_expression": "CAST",
            "new_expression": "CALL",
            "delete_expression": "CALL",
            "field_expression": "MEMBER",
            "pointer_expression": "UNOP",
            "identifier": "VAR",
            "this": "VAR",
            "template_function": "CALL",
            # Misc
            "compound_statement": "BLOCK",
            "expression_statement": "EXPR_STMT",
            "using_declaration": "IMPORT",
            "using_directive": "IMPORT",
            "template_declaration": "TEMPLATE",
            "access_specifier": "ACCESS_SPEC",
        }
        return mapping.get(t, "UNKNOWN")

    def _find_child_by_type(self, node, child_type: str):
        for child in node.children:
            if child.type == child_type:
                return child
        return None

    @staticmethod
    def _punctuation_types() -> set:
        return {
            "{", "}", "(", ")", "[", "]", ";", ",", ":",
            "::", ".", "->", "...", "<", ">",
            "public", "private", "protected",
            "class", "struct", "union", "enum", "namespace",
            "if", "else", "for", "while", "do", "switch", "case",
            "return", "break", "continue", "goto",
            "try", "catch", "throw",
            "new", "delete", "this",
            "using", "template", "typename", "auto",
            "virtual", "override", "final", "static", "inline",
            "const", "constexpr", "volatile", "explicit", "friend",
            "operator", "sizeof", "alignof", "decltype", "noexcept",
            "default", "nullptr",
        }