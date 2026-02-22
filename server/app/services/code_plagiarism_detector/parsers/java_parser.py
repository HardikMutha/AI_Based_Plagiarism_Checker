"""Java AST Parser  uses the `javalang` library."""

from __future__ import annotations

from app.services.code_plagiarism_detector.base_parser import ASTParser
from app.services.code_plagiarism_detector.generic_node import GenericNode

try:
    import javalang
    HAS_JAVALANG = True
except ImportError:
    HAS_JAVALANG = False


class JavaASTParser(ASTParser):
    name = "java"
    file_extensions = [".java"]

    ignore_nodes = {
        "BasicType", "Operator"  
    }

    def __init__(self):
        if not HAS_JAVALANG:
            raise ImportError(
                "Java support requires 'javalang'. Install: pip install javalang"
            )
        


    def parse(self, code: str) -> GenericNode:
        tree = javalang.parse.parse(code)
        return self._convert(tree)

    def _convert(self, node) -> GenericNode:
        node_type = self._map_node_type(node)
        metadata = {}

        if hasattr(node, "name") and node.name:
            metadata["name_present"] = True
        if hasattr(node, "parameters"):
            try:
                metadata["param_count"] = (
                    len(node.parameters) if node.parameters else 0
                )
            except TypeError:
                pass

        generic = GenericNode(node_type, metadata=metadata)

        if hasattr(node, "children"):
            for child_group in node.children:
                if child_group is None:
                    continue
                if isinstance(child_group, list):
                    for child in child_group:
                        if hasattr(child, "children") and type(child).__name__ not in self.ignore_nodes:
                            generic.add_child(self._convert(child))
                elif hasattr(child_group, "children") and type(child_group).__name__ not in self.ignore_nodes:
                    generic.add_child(self._convert(child_group))

        return generic

    def _map_node_type(self, node) -> str:
        type_name = type(node).__name__
        mapping = {
            "CompilationUnit": "MODULE",
            "ClassDeclaration": "CLASS",
            "InterfaceDeclaration": "CLASS",
            "EnumDeclaration": "ENUM",
            "MethodDeclaration": "FUNC",
            "ConstructorDeclaration": "FUNC",
            "FormalParameter": "PARAM",
            "LocalVariableDeclaration": "ASSIGN",
            "VariableDeclarator": "ASSIGN",
            "FieldDeclaration": "ASSIGN",
            "ReturnStatement": "RETURN",
            "IfStatement": "COND",
            "ForStatement": "LOOP",
            "WhileStatement": "LOOP",
            "DoStatement": "LOOP",
            "ForEachStatement": "LOOP",
            "SwitchStatement": "SWITCH",
            "SwitchStatementCase": "CASE",
            "TryStatement": "TRY",
            "CatchClause": "CATCH",
            "ThrowStatement": "THROW",
            "BreakStatement": "BREAK",
            "ContinueStatement": "CONTINUE",
            "AssertStatement": "ASSERT",
            "BlockStatement": "BLOCK",
            "StatementExpression": "EXPR_STMT",
            "MethodInvocation": "CALL",
            "SuperMethodInvocation": "CALL",
            "ClassCreator": "CALL",
            "BinaryOperation": "BINOP",
            "TernaryExpression": "TERNARY",
            "Assignment": "ASSIGN",
            "MemberReference": "VAR",
            "Literal": "LITERAL",
            "This": "VAR",
            "SuperMemberReference": "MEMBER",
            "ArraySelector": "INDEX",
            "Cast": "CAST",
            "Import": "IMPORT",
            "PackageDeclaration": "MODULE",
            "Annotation": "ANNOTATION",
            "LambdaExpression": "LAMBDA",
        }
        return mapping.get(type_name, "UNKNOWN")