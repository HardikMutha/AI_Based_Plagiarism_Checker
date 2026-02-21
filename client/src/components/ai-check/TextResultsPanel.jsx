import { motion } from "framer-motion"
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ChevronRight,
  Bot,
  User,
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

function barColor(pct) {
  if (pct >= 65) return "[&>div]:bg-red-500"
  if (pct >= 40) return "[&>div]:bg-amber-500"
  return "[&>div]:bg-green-500"
}

function textColor(pct) {
  if (pct >= 65) return "text-red-600 dark:text-red-400"
  if (pct >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-muted-foreground"
}

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

export default function TextResultsPanel({ result }) {
  const score = result.score * 100
  const scoreStr = score.toFixed(1)
  const verdict = result.verdict
  const layers = result.layer_details || {}
  const explanations = result.explanations || {}
  const conclusions = explanations.conclusions || []
  const summary = explanations.summary || ""

  const isLikelyAI = verdict === "Likely AI"
  const isReview = verdict === "Review Recommended"

  const VerdictIcon = isLikelyAI ? ShieldAlert : isReview ? ShieldQuestion : ShieldCheck
  const verdictColor = isLikelyAI
    ? "text-red-600 dark:text-red-400"
    : isReview
      ? "text-amber-600 dark:text-amber-400"
      : "text-green-600 dark:text-green-400"
  const progressColor = isLikelyAI
    ? "[&>div]:bg-red-500"
    : isReview
      ? "[&>div]:bg-amber-500"
      : "[&>div]:bg-green-500"
  const ringColor = isLikelyAI
    ? "border-red-500/40"
    : isReview
      ? "border-amber-500/40"
      : "border-green-500/40"

  const mainLayers = [
    { label: "ML Model Probability", value: layers.ml_probability ?? 0, weight: "55%" },
    { label: "Heuristic Score", value: layers.heuristic_score ?? 0, weight: "20%" },
  ]

  const patternScores = layers.pattern_scores || {}
  const patternEntries = [
    { label: "Semantic Drift Uniformity", value: patternScores.drift_uniformity ?? 0 },
    { label: "First-Last Paragraph Similarity", value: patternScores.first_last_sim ?? 0 },
    { label: "Logic Loop Score", value: patternScores.loop_score ?? 0 },
  ]

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
                    {scoreStr}
                  </span>
                  <span className="text-xs text-muted-foreground block -mt-0.5">% AI</span>
                </div>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <VerdictIcon className={`h-5 w-5 shrink-0 ${verdictColor}`} />
                <h3 className={`text-lg font-bold ${verdictColor}`}>{verdict}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {result.filename || "Uploaded document"}
              </p>
              <div className="w-full max-w-sm mx-auto sm:mx-0">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> Human</span>
                  <span className="flex items-center gap-1">AI <Bot className="h-3 w-3" /></span>
                </div>
                <Progress value={score} className={`h-2.5 ${progressColor}`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Conclusions */}
      {(summary || conclusions.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Analysis Conclusions</CardTitle>
            <CardDescription className="text-xs">
              Insights from vocabulary, style, rhythm, and semantic pattern analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-sm leading-relaxed">{summary}</p>
              </div>
            )}

            {conclusions.length > 0 && (
              <div className="space-y-2">
                {conclusions.map((c, i) => {
                  const style = CONCLUSION_STYLES[c.severity] || CONCLUSION_STYLES.low
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
      )}

      {/* Layer Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detection Layer Breakdown</CardTitle>
          <CardDescription className="text-xs">Scores from each detection layer in the pipeline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            {mainLayers.map((layer) => {
              const pct = layer.value * 100
              return (
                <div key={layer.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">
                      {layer.label}
                      <span className="text-muted-foreground ml-1.5">(weight: {layer.weight})</span>
                    </span>
                    <span className={`text-xs font-mono font-semibold tabular-nums ${textColor(pct)}`}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className={`h-1.5 ${barColor(pct)}`} />
                </div>
              )
            })}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Pattern Analysis <span className="normal-case">(weight: 25%)</span>
            </p>
            <div className="space-y-2.5">
              {patternEntries.map((entry) => {
                const pct = entry.value * 100
                return (
                  <div key={entry.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{entry.label}</span>
                      <span className={`text-xs font-mono font-semibold tabular-nums ${textColor(pct)}`}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.min(pct, 100)} className={`h-1.5 ${barColor(pct)}`} />
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Texture Features (collapsible) */}
      {layers.texture_features && (
        <Card>
          <details className="group">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-1.5">
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                  <CardTitle className="text-sm">Texture Features</CardTitle>
                </div>
                <CardDescription className="text-xs ml-5.5">Click to view all 20 extracted text features</CardDescription>
              </CardHeader>
            </summary>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(layers.texture_features).map(([key, value]) => (
                  <div key={key} className="p-2.5 rounded-lg border bg-muted/30">
                    <p
                      className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate"
                      title={key}
                    >
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="text-sm font-mono font-semibold mt-0.5">
                      {typeof value === "number" ? value.toFixed(4) : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </details>
        </Card>
      )}
    </>
  )
}
