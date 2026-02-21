import React from "react"
import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { normalizeScore, getSeverity, SEVERITY_STYLES } from "@/components/ComparisonCard"

export function MinHashReport({ data: r, index, scoreScale }) {
    const fileA = (r.file_a || r.file1 || "").split("/").pop() || "File A"
    const fileB = (r.file_b || r.file2 || "").split("/").pop() || "File B"

    const rawScore = r.overall_score ?? r.similarity_score ?? r.overall_similarity ?? r.similarity ?? r.jaccard_similarity ?? null
    const pct = rawScore != null ? normalizeScore(rawScore, scoreScale) : null
    const pctStr = pct != null ? pct.toFixed(1) : null

    const severity = getSeverity(pct)
    const styles = SEVERITY_STYLES[severity]

    const verdict = r.verdict || (severity === "high" ? "HIGH SIMILARITY" : severity === "moderate" ? "MODERATE SIMILARITY" : "LOW SIMILARITY")

    const similarLines = r.similar_lines || []

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index || 0) * 0.04 }}
        >
            <Card className={`overflow-hidden transition-colors ${severity !== "low" ? styles.border : ""}`}>
                <CardContent className="pt-5 pb-4 space-y-4">
                    {/* Header: file names + score */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="text-sm font-semibold">
                                {fileA}
                                <span className="text-muted-foreground font-normal mx-1.5">vs</span>
                                {fileB}
                            </p>
                            {(r.language_a || r.language_b) && (
                                <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">{r.language_a}</Badge>
                                    <span className="text-muted-foreground text-[10px]">/</span>
                                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">{r.language_b}</Badge>
                                </div>
                            )}
                            {r.type && !r.language_a && (
                                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">{r.type}</Badge>
                            )}
                        </div>

                        {pctStr != null && (
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="w-24 hidden sm:block">
                                    <Progress value={Math.min(parseFloat(pctStr), 100)} className={`h-2 ${styles.bar}`} />
                                </div>
                                <span className={`text-2xl font-bold font-mono tabular-nums ${styles.text}`}>
                                    {pctStr}<span className="text-sm font-normal text-muted-foreground">%</span>
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Verdict */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[11px] font-semibold ${styles.badge}`}>
                            {verdict}
                        </Badge>
                    </div>

                    {/* Side-by-side diff: Similar Lines */}
                    {similarLines.length > 0 && (
                        <details className="group" open>
                            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 select-none py-1">
                                <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                                {similarLines.length} similar line{similarLines.length !== 1 ? "s" : ""} found
                            </summary>
                            <div className="mt-2 rounded-lg border overflow-hidden">
                                {/* Split header */}
                                <div className="grid grid-cols-[1fr_48px_1fr] bg-muted/60 border-b">
                                    <div className="px-3 py-1.5 text-[11px] font-mono font-medium text-muted-foreground truncate">
                                        {fileA}
                                    </div>
                                    <div className="border-x border-border/40 flex items-center justify-center">
                                        <span className="text-[10px] text-muted-foreground/60">match</span>
                                    </div>
                                    <div className="px-3 py-1.5 text-[11px] font-mono font-medium text-muted-foreground truncate">
                                        {fileB}
                                    </div>
                                </div>
                                {/* Matched line pairs */}
                                <div className="max-h-[480px] overflow-y-auto">
                                    {similarLines.map((line, li) => {
                                        const matchPct = ((line.similarity ?? 0) * 100).toFixed(0)
                                        const isHighMatch = (line.similarity ?? 0) >= 0.9
                                        const highlightA = isHighMatch
                                            ? "bg-red-500/[0.08] dark:bg-red-500/10"
                                            : "bg-amber-500/[0.06] dark:bg-amber-500/[0.08]"
                                        const highlightB = isHighMatch
                                            ? "bg-red-500/[0.08] dark:bg-red-500/10"
                                            : "bg-amber-500/[0.06] dark:bg-amber-500/[0.08]"
                                        return (
                                            <div
                                                key={li}
                                                className={`grid grid-cols-[1fr_48px_1fr] ${li > 0 ? "border-t-2 border-border/50" : ""} ${li % 2 === 1 ? "bg-muted/[0.03]" : ""} hover:brightness-95 dark:hover:brightness-110 transition-all`}
                                            >
                                                {/* Left: File A line */}
                                                <div className={`flex ${highlightA}`}>
                                                    <div className="w-10 shrink-0 text-right pr-2 py-1.5 text-[11px] font-mono text-muted-foreground/50 select-none border-r border-border/20">
                                                        {line.line_a}
                                                    </div>
                                                    <pre className="flex-1 py-1.5 px-2 text-xs font-mono whitespace-pre-wrap break-all">{line.text_a}</pre>
                                                </div>
                                                {/* Center: match % */}
                                                <div className="border-x border-border/40 flex items-center justify-center bg-muted/30">
                                                    <span className={`text-[10px] font-mono font-semibold ${isHighMatch ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                                                        }`}>
                                                        {matchPct}%
                                                    </span>
                                                </div>
                                                {/* Right: File B line */}
                                                <div className={`flex ${highlightB}`}>
                                                    <div className="w-10 shrink-0 text-right pr-2 py-1.5 text-[11px] font-mono text-muted-foreground/50 select-none border-r border-border/20">
                                                        {line.line_b}
                                                    </div>
                                                    <pre className="flex-1 py-1.5 px-2 text-xs font-mono whitespace-pre-wrap break-all">{line.text_b}</pre>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </details>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

export default MinHashReport
