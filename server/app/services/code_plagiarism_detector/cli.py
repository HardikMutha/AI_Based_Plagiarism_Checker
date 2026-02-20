"""
This is the Command-line interface for the plagiarism detector.

Usage is as follows:
1. Compare two or more files for plagiarism:
    python -m plagiarism_detector compare file1.py file2.py
    python -m plagiarism_detector compare file1.py file2.py file3.py

2. Analyze files for AI-generated code:
    python -m plagiarism_detector ai file1.py
    python -m plagiarism_detector ai file1.py file2.java file3.cpp

3. List supported languages:
    python -m plagiarism_detector langs
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.services.code_plagiarism_detector.detector import PlagiarismDetector
from app.services.code_plagiarism_detector.ai_detector import AICodeDetector
from app.services.code_plagiarism_detector.registry import ParserRegistry


class Colors:
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"

    @classmethod
    def disable(cls):
        cls.RED = cls.GREEN = cls.YELLOW = cls.BLUE = ""
        cls.CYAN = cls.BOLD = cls.DIM = cls.RESET = ""


def verdict_color(verdict: str) -> str:
    if "HIGH" in verdict or "LIKELY AI" in verdict:
        return Colors.RED
    elif "MODERATE" in verdict or "POSSIBLY" in verdict:
        return Colors.YELLOW
    else:
        return Colors.GREEN

def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="plagiarism_detector",
        description="AST-based Code Plagiarism & AI Detection Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Compare two files for plagiarism
  %(prog)s compare file1.py file2.py

  # Compare all pairs in a batch
  %(prog)s compare file1.py file2.py file3.py file4.java

  # Check if a file is AI-generated
  %(prog)s ai file1.py

  # Check multiple files for AI generation
  %(prog)s ai file1.py file2.java file3.cpp

  # List supported languages
  %(prog)s langs

  # Output as JSON
  %(prog)s compare file1.py file2.py --json

  # Specify languages explicitly
  %(prog)s compare file1.txt file2.txt --lang python

  # No color output (for piping)
  %(prog)s compare file1.py file2.py --no-color
        """,
    )

    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON",
    )
    parser.add_argument(
        "--no-color",
        action="store_true",
        help="Disable colored output",
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    compare_parser = subparsers.add_parser(
        "compare",
        help="Compare files for plagiarism",
        description="Compare two or more files for code plagiarism.",
    )
    compare_parser.add_argument(
        "files",
        nargs="+",
        help="Source files to compare (at least 2)",
    )
    compare_parser.add_argument(
        "--lang",
        type=str,
        default=None,
        help="Override language detection (e.g., python, java, c, cpp)",
    )
    compare_parser.add_argument(
        "--threshold",
        type=float,
        default=0.0,
        help="Only show results above this score (0-100)",
    )

    ai_parser = subparsers.add_parser(
        "ai",
        help="Detect AI-generated code",
        description="Analyze files for signs of AI-generated code.",
    )
    ai_parser.add_argument(
        "files",
        nargs="+",
        help="Source files to analyze",
    )
    ai_parser.add_argument(
        "--lang",
        type=str,
        default=None,
        help="Override language detection",
    )

    subparsers.add_parser(
        "langs",
        help="List supported languages",
    )

    return parser



def handle_compare(args: argparse.Namespace) -> int:
    """Handle the 'compare' subcommand."""
    files = args.files

    if len(files) < 2:
        print(
            f"{Colors.RED}Error: Need at least 2 files to compare.{Colors.RESET}",
            file=sys.stderr,
        )
        return 1

    for f in files:
        if not Path(f).is_file():
            print(
                f"{Colors.RED}Error: File not found: {f}{Colors.RESET}",
                file=sys.stderr,
            )
            return 1

    detector = PlagiarismDetector()

    if len(files) == 2:
        try:
            result = detector.compare_files(
                files[0],
                files[1],
                language_a=args.lang,
                language_b=args.lang,
            )
        except ValueError as e:
            print(f"{Colors.RED}Error: {e}{Colors.RESET}", file=sys.stderr)
            return 1

        if args.json:
            print(json.dumps(result.as_dict(), indent=2))
        else:
            print()
            print(result)
            color = verdict_color(result.verdict)
            print(
                f"\n{color}{Colors.BOLD}» {result.verdict} "
                f"(Score: {result.overall_score}/100){Colors.RESET}"
            )
    else:
        # Batch comparison
        print(
            f"\n{Colors.CYAN}{Colors.BOLD}Comparing {len(files)} files "
            f"({len(files) * (len(files) - 1) // 2} pairs)...{Colors.RESET}\n"
        )

        results = detector.batch_compare(files)

        if args.threshold > 0:
            results = [r for r in results if r.overall_score >= args.threshold]

        if args.json:
            print(json.dumps([r.as_dict() for r in results], indent=2))
        else:
            if not results:
                print(
                    f"{Colors.GREEN}No results above threshold "
                    f"{args.threshold}.{Colors.RESET}"
                )
                return 0

            # Summary table
            print(f"{'Rank':<6}{'File A':<25}{'File B':<25}{'Score':<10}{'Verdict'}")
            print("─" * 90)
            for i, r in enumerate(results, 1):
                color = verdict_color(r.verdict)
                fa = Path(r.file_a).name
                fb = Path(r.file_b).name
                print(
                    f"{i:<6}{fa:<25}{fb:<25}"
                    f"{color}{r.overall_score:<10.1f}{r.verdict}{Colors.RESET}"
                )

            # Detailed reports
            print(f"\n{'═' * 55}")
            print(f"{Colors.BOLD}  DETAILED REPORTS{Colors.RESET}")
            print(f"{'═' * 55}")
            for r in results:
                print()
                print(r)

    return 0


def handle_ai(args: argparse.Namespace) -> int:
    """Handle the 'ai' subcommand."""
    files = args.files

    for f in files:
        if not Path(f).is_file():
            print(
                f"{Colors.RED}Error: File not found: {f}{Colors.RESET}",
                file=sys.stderr,
            )
            return 1

    ai_detector = AICodeDetector()
    results = []

    for filepath in files:
        try:
            if args.lang:
                code = Path(filepath).read_text(encoding="utf-8")
                result = ai_detector.analyze_code(code, args.lang, filepath)
            else:
                result = ai_detector.analyze_file(filepath)
            results.append(result)
        except ValueError as e:
            print(f"{Colors.RED}Error with {filepath}: {e}{Colors.RESET}", file=sys.stderr)
            return 1

    if args.json:
        print(json.dumps([r.as_dict() for r in results], indent=2))
    else:
        if len(results) > 1:
 
            print(
                f"\n{Colors.CYAN}{Colors.BOLD}"
                f"AI Detection Results for {len(files)} files"
                f"{Colors.RESET}\n"
            )
            print(f"{'File':<35}{'Probability':<15}{'Verdict'}")
            print("─" * 75)
            for r in results:
                color = verdict_color(r.verdict)
                fname = Path(r.file_name).name
                print(
                    f"{fname:<35}{r.ai_probability * 100:<15.1f}%"
                    f"{color}{r.verdict}{Colors.RESET}"
                )

        print(f"\n{'═' * 55}")
        print(f"{Colors.BOLD}  DETAILED REPORTS{Colors.RESET}")
        print(f"{'═' * 55}")
        for r in results:
            print()
            print(r)
            color = verdict_color(r.verdict)
            print(
                f"\n{color}{Colors.BOLD}» {r.verdict} "
                f"(Probability: {r.ai_probability * 100:.1f}%){Colors.RESET}"
            )

    return 0


def handle_langs(args: argparse.Namespace) -> int:
    """Handle the 'langs' subcommand."""
    langs = ParserRegistry.supported_languages()

    if args.json:
        print(json.dumps({"supported_languages": langs}))
    else:
        print(f"\n{Colors.CYAN}{Colors.BOLD}Supported Languages:{Colors.RESET}\n")
        for lang in langs:
            parser_cls = ParserRegistry._parsers[lang]
            exts = ", ".join(parser_cls.file_extensions)
            print(f"  {Colors.GREEN}✓{Colors.RESET} {lang:<15} ({exts})")
        print()

    return 0



def main() -> int:
    parser = create_parser()
    args = parser.parse_args()

    if args.no_color:
        Colors.disable()

    if args.command is None:
        parser.print_help()
        return 0

    handlers = {
        "compare": handle_compare,
        "ai": handle_ai,
        "langs": handle_langs,
    }

    handler = handlers.get(args.command)
    if handler is None:
        parser.print_help()
        return 1

    return handler(args)


if __name__ == "__main__":
    sys.exit(main())