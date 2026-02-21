import { motion } from "framer-motion"
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ChevronRight,
  Info,
  Bot,
  User,
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

// ── Conclusion generator ─────────────────────────────────────────

function generateConclusions(result) {
  const s = result.signals || {}
  const prob = result.ai_probability
  const conclusions = []

  const add = (severity, text) => conclusions.push({ severity, text })

  if (s.depth_uniformity >= 0.7 && s.subtree_symmetry >= 0.6) {
    add("high", "The code's AST is unusually uniform — function bodies, conditional branches, and loops are all structured at similar depths with symmetric subtrees. This level of structural regularity is a strong indicator of machine-generated code.")
  } else if (s.depth_uniformity >= 0.6) {
    add("medium", "The AST depth uniformity is moderately high, suggesting the code might follow rigid templates. Human code typically shows more varied nesting patterns.")
  }

  if (s.func_size_uniformity >= 0.7) {
    add("high", "All functions in this file are suspiciously close in size — a hallmark of AI generators that produce cookie-cutter function bodies with consistent structure.")
  } else if (s.func_size_uniformity >= 0.5) {
    add("medium", "Functions are fairly uniform in size. While not conclusive, this pattern is more common in AI-generated code than in hand-written code where function complexity naturally varies.")
  }

  if (s.pattern_repetition >= 0.6) {
    add("high", "A significant portion of the AST subtrees repeat the exact same structural shape. This mechanical repetition is characteristic of AI models that reuse learned code patterns.")
  }

  if (s.error_handling_density >= 0.6) {
    add("medium", "The code contains disproportionately heavy error-handling scaffolding (try/catch/throw). AI assistants tend to over-engineer error handling even when not strictly necessary.")
  }

  if (s.guard_clause_ratio >= 0.7) {
    add("medium", "Most functions begin with guard clauses (early return on invalid input). While a good practice, AI models apply this pattern systematically to nearly every function, unlike typical human code.")
  }

  if (s.branching_consistency >= 0.75) {
    add("low", "Branching factors are highly consistent across all depths of the code, which can indicate templated generation.")
  }

  if (s.comment_pattern >= 0.6) {
    add("high", "Comments match typical AI phrasing patterns — expressions like \"this function\", \"helper method\", \"handle the error\", and \"return the result\" appear frequently. These formulaic comments are a strong textual indicator.")
  } else if (s.comment_pattern >= 0.4) {
    add("medium", "Some comments use phrasing commonly associated with AI assistants, though not enough to be conclusive on their own.")
  }

  if (s.naming_convention >= 0.7) {
    add("high", "Variable and function names are uniformly descriptive and follow a rigid naming convention. AI generators tend to produce consistently verbose, well-structured identifiers, whereas humans typically mix short and long names.")
  }

  if (s.docstring_density >= 0.7) {
    add("medium", "Nearly every function has a docstring/javadoc comment. While good practice, AI models do this systematically, even for trivially obvious functions.")
  }

  if (s.import_style >= 0.7) {
    add("medium", "Imports are perfectly organized — alphabetized, grouped by category, with clean separation. This level of import hygiene is typical of AI-generated Python code.")
  }

  if (s.line_length_uniformity >= 0.7) {
    add("medium", "Line lengths are remarkably consistent, suggesting the code was formatted to a strict column width by an AI. Human-written code usually has more variation in line lengths.")
  }

  if (s.code_to_logic_ratio >= 0.6) {
    add("low", "The ratio of boilerplate (comments, docstrings, imports, blanks) to actual logic is in the range typically seen in AI output, where structure and documentation often outweigh core logic.")
  }

  if (s.variable_name_entropy >= 0.65) {
    add("low", "Variable names show low lexical entropy — the same word components (e.g. \"data\", \"result\", \"value\") are reused throughout, which is a subtle pattern in AI-generated code.")
  }

  if (s.f_string_consistency >= 0.7) {
    add("low", "All string formatting uses a single style consistently. AI generators pick one approach and apply it everywhere, whereas humans often mix f-strings, .format(), and concatenation.")
  }

  if (s.emoji_usage >= 0.5) {
    add("high", "The code contains emoji characters in comments or strings — a notable AI signature, especially from conversational AI assistants.")
  }

  if (s.em_dash_usage >= 0.5) {
    add("high", "Em-dashes (—) were found in comments or strings. This Unicode punctuation is extremely common in AI-generated text but rare in human-written code.")
  }

  const highCount = conclusions.filter((c) => c.severity === "high").length
  const medCount = conclusions.filter((c) => c.severity === "medium").length

  let summary = ""
  if (prob >= 0.7) {
    summary = `This code exhibits ${highCount} strong and ${medCount} moderate AI indicators across both structural and textual analysis. The combination of these signals strongly suggests the code was generated by an AI assistant.`
  } else if (prob >= 0.4) {
    summary = `The analysis detected ${highCount + medCount} notable signals. While some patterns align with AI generation, the evidence is not conclusive — the code may be human-written with some AI assistance, or written by a developer following strict coding conventions.`
  } else {
    if (conclusions.length === 0) {
      summary = "No significant AI generation indicators were detected. The code structure, naming patterns, and comment style are all consistent with human-authored code."
    } else {
      summary = "Only minor signals were detected. The code predominantly exhibits characteristics of human-written code, with natural variation in structure and style."
    }
  }

  return { conclusions, summary }
}

// ── Severity styles ──────────────────────────────────────────────

const CONCLUSION_STYLES = {
  high: {
    dot: "bg-red-500",
    text: "text-foreground",
    border: "border-red-500/20",
    bg: "bg-red-500/[0.04] dark:bg-red-500/[0.06]",
    label: "Strong signal",
    labelColor: "text-red-600 dark:text-red-400",
  },
  medium: {
    dot: "bg-amber-500",
    text: "text-foreground",
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]",
    label: "Moderate signal",
    labelColor: "text-amber-600 dark:text-amber-400",
  },
  low: {
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    border: "border-border/50",
    bg: "",
    label: "Minor signal",
    labelColor: "text-muted-foreground",
  },
}

// ── Signal Bar ───────────────────────────────────────────────────

function SignalBar({ detail }) {
  const pct = detail.value * 100
  const isHigh = pct >= 65
  const isMed = pct >= 40

  const barColor = isHigh
    ? "[&>div]:bg-red-500"
    : isMed
      ? "[&>div]:bg-amber-500"
      : "[&>div]:bg-green-500"

  const textColor = isHigh
    ? "text-red-600 dark:text-red-400"
    : isMed
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground"

  return (
    <div className="group" title={detail.tip}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium truncate pr-2">{detail.label}</span>
        <span className={`text-xs font-mono font-semibold tabular-nums ${textColor}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <Progress value={Math.min(pct, 100)} className={`h-1.5 ${barColor}`} />
    </div>
  )
}

// ── Main Panel ───────────────────────────────────────────────────

export default function CodeResultsPanel({ result }) {
  const prob = result.ai_probability * 100
  const probStr = prob.toFixed(1)

  const isLikelyAI = prob >= 70
  const isPossiblyAI = prob >= 40

  const VerdictIcon = isLikelyAI ? ShieldAlert : isPossiblyAI ? ShieldQuestion : ShieldCheck
  const verdictColor = isLikelyAI
    ? "text-red-600 dark:text-red-400"
    : isPossiblyAI
      ? "text-amber-600 dark:text-amber-400"
      : "text-green-600 dark:text-green-400"
  const barColor = isLikelyAI
    ? "[&>div]:bg-red-500"
    : isPossiblyAI
      ? "[&>div]:bg-amber-500"
      : "[&>div]:bg-green-500"
  const ringColor = isLikelyAI
    ? "border-red-500/40"
    : isPossiblyAI
      ? "border-amber-500/40"
      : "border-green-500/40"

  const signalDetails = result.signal_details || {}
  const structural = Object.entries(signalDetails).filter(([, d]) => d.group === "structural")
  const textual = Object.entries(signalDetails).filter(([, d]) => d.group === "textual")

  const { conclusions, summary } = generateConclusions(result)

  return (
    <>
      {/* Verdict */}
      <Card className={`overflow-hidden ${ringColor}`}>
        <CardContent className="pt-6 pb-5">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className={`relative w-28 h-28 rounded-full border-4 flex items-center justify-center ${ringColor}`}>
                <div className="text-center">
                  <span className={`text-3xl font-bold font-mono tabular-nums ${verdictColor}`}>
                    {probStr}
                  </span>
                  <span className="text-xs text-muted-foreground block -mt-0.5">% AI</span>
                </div>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <VerdictIcon className={`h-5 w-5 shrink-0 ${verdictColor}`} />
                <h3 className={`text-lg font-bold ${verdictColor}`}>{result.verdict}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {result.file_name?.split("/").pop() || "Unknown"}{" "}
                <Badge variant="outline" className="text-[10px] font-mono ml-1 px-1.5 py-0">{result.language}</Badge>
              </p>
              <div className="w-full max-w-sm mx-auto sm:mx-0">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> Human</span>
                  <span className="flex items-center gap-1">AI <Bot className="h-3 w-3" /></span>
                </div>
                <Progress value={prob} className={`h-2.5 ${barColor}`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conclusions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Analysis Conclusions</CardTitle>
          <CardDescription className="text-xs">Insights generated from 18 structural and textual signals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
            <p className="text-sm leading-relaxed">{summary}</p>
          </div>

          {conclusions.length > 0 && (
            <div className="space-y-2">
              {conclusions.map((c, i) => {
                const style = CONCLUSION_STYLES[c.severity]
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`p-3 rounded-lg border ${style.border} ${style.bg} transition-colors`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                      <div className="flex-1 min-w-0">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${style.labelColor}`}>
                          {style.label}
                        </span>
                        <p className={`text-sm leading-relaxed mt-0.5 ${style.text}`}>{c.text}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signal Breakdown */}
      <Card>
        <details className="group">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-1.5">
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                <CardTitle className="text-sm">Signal Breakdown</CardTitle>
              </div>
              <CardDescription className="text-xs ml-5.5">Click to view all 18 individual signal scores</CardDescription>
            </CardHeader>
          </summary>
          <CardContent className="space-y-5 pt-0">
            {structural.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Structural (AST-based)
                </p>
                <div className="space-y-2.5">
                  {structural.map(([key, detail]) => (
                    <SignalBar key={key} detail={detail} />
                  ))}
                </div>
              </div>
            )}
            {textual.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Textual (Source-level)
                </p>
                <div className="space-y-2.5">
                  {textual.map(([key, detail]) => (
                    <SignalBar key={key} detail={detail} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </details>
      </Card>
    </>
  )
}
