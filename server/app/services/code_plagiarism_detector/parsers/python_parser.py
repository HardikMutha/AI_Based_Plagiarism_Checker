"""Python AST Parser — uses the built-in `ast` module."""

from __future__ import annotations

import ast

from app.services.code_plagiarism_detector.base_parser import ASTParser
from app.services.code_plagiarism_detector.generic_node import GenericNode


class PythonASTParser(ASTParser):
    name = "python"
    file_extensions = [".py"]

    NODE_MAP = {
        ast.Module: "MODULE",
        ast.FunctionDef: "FUNC",
        ast.AsyncFunctionDef: "ASYNC",
        ast.ClassDef: "CLASS",
        ast.Return: "RETURN",
        ast.Delete: "DELETE",
        ast.Assign: "ASSIGN",
        ast.AugAssign: "AUG_ASSIGN",
        ast.AnnAssign: "ASSIGN",
        ast.For: "LOOP",
        ast.AsyncFor: "LOOP",
        ast.While: "LOOP",
        ast.If: "COND",
        ast.With: "WITH",
        ast.AsyncWith: "WITH",
        ast.Raise: "THROW",
        ast.Try: "TRY",
        ast.Assert: "ASSERT",
        ast.Import: "IMPORT",
        ast.ImportFrom: "IMPORT",
        ast.Global: "GLOBAL",
        ast.Nonlocal: "GLOBAL",
        ast.Expr: "EXPR_STMT",
        ast.Pass: "PASS",
        ast.Break: "BREAK",
        ast.Continue: "CONTINUE",
        ast.BoolOp: "BOOLOP",
        ast.BinOp: "BINOP",
        ast.UnaryOp: "UNARYOP",
        ast.Lambda: "LAMBDA",
        ast.IfExp: "TERNARY",
        ast.Dict: "LITERAL",
        ast.Set: "LITERAL",
        ast.ListComp: "COMPREHENSION",
        ast.SetComp: "COMPREHENSION",
        ast.DictComp: "COMPREHENSION",
        ast.GeneratorExp: "GENERATOR",
        ast.Await: "AWAIT",
        ast.Yield: "YIELD",
        ast.YieldFrom: "YIELD",
        ast.Compare: "COMPARE",
        ast.Call: "CALL",
        ast.Attribute: "MEMBER",
        ast.Subscript: "INDEX",
        ast.Slice: "SLICE",
        ast.Name: "VAR",
        ast.List: "LITERAL",
        ast.Tuple: "LITERAL",
        ast.Constant: "LITERAL",
    }

    IGNORE_NODES = {
        ast.Load, ast.Store, ast.Add, ast.arguments
    }

    def parse(self, code: str) -> GenericNode:
        tree = ast.parse(code)
        return self._convert(tree)

    def _convert(self, node: ast.AST) -> GenericNode:
        node_type = self.NODE_MAP.get(type(node), "UNKNOWN")

        metadata = {}
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            metadata["param_count"] = len(node.args.args)
        if isinstance(node, ast.BinOp):
            metadata["op"] = type(node.op).__name__

        generic = GenericNode(node_type, metadata=metadata)

        for child in ast.iter_child_nodes(node):
            if type(child) in self.IGNORE_NODES:
                continue
            generic.add_child(self._convert(child))

        return generic