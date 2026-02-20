"""
Data classes for plagiarism and AI detection results.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class PlagiarismResult:
    """Detailed plagiarism comparison result."""

    file_a: str
    file_b: str
    language_a: str
    language_b: str
    subtree_similarity: float
    sequence_similarity: float
    profile_similarity: float
    overall_score: float = 0.0
    verdict: str = ""
    matching_structures: int = 0
    largest_match_size: int = 0
    similar_lines: list = field(default_factory=list)  # [(line_a, text_a, line_b, text_b, ratio)]

    def __post_init__(self):
        self.overall_score = round(
            self.subtree_similarity * 30
            + self.sequence_similarity * 40
            + self.profile_similarity * 30,
            2,
        )
        if self.overall_score >= 75:
            self.verdict = "HIGH PLAGIARISM"
        elif self.overall_score >= 40:
            self.verdict = "MODERATE SIMILARITY"
        else:
            self.verdict = "LOW SIMILARITY"

    def as_dict(self) -> dict:
        return {
            "file_a": self.file_a,
            "file_b": self.file_b,
            "language_a": self.language_a,
            "language_b": self.language_b,
            "subtree_similarity": self.subtree_similarity,
            "sequence_similarity": self.sequence_similarity,
            "profile_similarity": self.profile_similarity,
            "overall_score": self.overall_score,
            "verdict": self.verdict,
            "matching_structures": self.matching_structures,
            "largest_match_size": self.largest_match_size,
            "similar_lines": [
                {
                    "line_a": la, "text_a": ta,
                    "line_b": lb, "text_b": tb,
                    "similarity": r,
                }
                for la, ta, lb, tb, r in self.similar_lines
            ],
        }

    def _format_similar_lines(self) -> str:
        """Format the similar-lines section for the report."""
        if not self.similar_lines:
            return (
                "╠══════════════════════════════════════════════════╣\n"
                "║ Similar Lines            : (none detected)       ║"
            )

        from pathlib import Path
        name_a = Path(self.file_a).name
        name_b = Path(self.file_b).name

        header = (
            "╠══════════════════════════════════════════════════╣\n"
            f"║ Similar Lines            : {len(self.similar_lines):<22d}║\n"
            "╠══════════════════════════════════════════════════╣"
        )

        lines_out = [header]
        for la, ta, lb, tb, ratio in self.similar_lines:
            pct = int(ratio * 100)
            lines_out.append(
                f"║  [{name_a} L{la}] ↔ [{name_b} L{lb}]  ({pct}% match)"
            )
            # Truncate long lines for display
            display_a = ta.strip()[:60]
            display_b = tb.strip()[:60]
            lines_out.append(f"║    A: {display_a}")
            lines_out.append(f"║    B: {display_b}")
            lines_out.append("║")

        return "\n".join(lines_out)

    def __str__(self) -> str:
        sim_lines_section = self._format_similar_lines()
        return (
            f"╔══════════════════════════════════════════════════╗\n"
            f"║        AST PLAGIARISM DETECTION REPORT           ║\n"
            f"╠══════════════════════════════════════════════════╣\n"
            f"║ File A    : {self.file_a:<37s}║\n"
            f"║ File B    : {self.file_b:<37s}║\n"
            f"║ Lang A    : {self.language_a:<37s}║\n"
            f"║ Lang B    : {self.language_b:<37s}║\n"
            f"╠══════════════════════════════════════════════════╣\n"
            f"║ Subtree Hashes (Jaccard) : {self.subtree_similarity * 100:>6.1f}%            ║\n"
            f"║ Sequence (Tree LCS)      : {self.sequence_similarity * 100:>6.1f}%            ║\n"
            f"║ Structural Profile       : {self.profile_similarity * 100:>6.1f}%            ║\n"
            f"╠══════════════════════════════════════════════════╣\n"
            f"║ Matching Structures      : {self.matching_structures:<22d}║\n"
            f"║ Largest Match (nodes)    : {self.largest_match_size:<22d}║\n"
            f"{sim_lines_section}\n"
            f"╠══════════════════════════════════════════════════╣\n"
            f"║ OVERALL SCORE : {self.overall_score:>6.1f} / 100                  ║\n"
            f"║ VERDICT       : {self.verdict:<33s}║\n"
            f"╚══════════════════════════════════════════════════╝"
        )


@dataclass
class AIDetectionResult:
    """Result of AI-generated code analysis."""

    file_name: str
    language: str
    ai_probability: float
    verdict: str = ""
    signals: dict = field(default_factory=dict)
    explanations: list[str] = field(default_factory=list)
    signal_details: dict = field(default_factory=dict)

    def __post_init__(self):
        if self.ai_probability >= 0.70:
            self.verdict = "LIKELY AI-GENERATED"
        elif self.ai_probability >= 0.40:
            self.verdict = "POSSIBLY AI-GENERATED"
        else:
            self.verdict = "LIKELY HUMAN-WRITTEN"

    def as_dict(self) -> dict:
        return {
            "file_name": self.file_name,
            "language": self.language,
            "ai_probability": self.ai_probability,
            "verdict": self.verdict,
            "signals": self.signals,
            "explanations": self.explanations,
            "signal_details": self.signal_details,
        }

    def __str__(self) -> str:
        signals_str = "\n".join(
            f"║   {k:<30s}: {v:>8.3f}           ║"
            for k, v in self.signals.items()
        )
        explanations_str = "\n".join(
            f"║  • {e:<46s}║" for e in self.explanations
        )
        return (
            f"╔══════════════════════════════════════════════════╗\n"
            f"║          AI CODE DETECTION REPORT                ║\n"
            f"╠══════════════════════════════════════════════════╣\n"
            f"║ File     : {self.file_name:<38s}║\n"
            f"║ Language : {self.language:<38s}║\n"
            f"╠══════════════════════════════════════════════════╣\n"
            f"║ Signals:                                         ║\n"
            f"{signals_str}\n"
            f"╠══════════════════════════════════════════════════╣\n"
            f"║ Explanations:                                    ║\n"
            f"{explanations_str}\n"
            f"╠══════════════════════════════════════════════════╣\n"
            f"║ AI PROBABILITY : {self.ai_probability * 100:>6.1f}%                      ║\n"
            f"║ VERDICT        : {self.verdict:<32s}║\n"
            f"╚══════════════════════════════════════════════════╝"
        )