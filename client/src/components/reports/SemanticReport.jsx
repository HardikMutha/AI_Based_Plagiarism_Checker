import React from "react"
import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { normalizeScore, getSeverity, SEVERITY_STYLES } from "@/components/ComparisonCard"

export function SemanticReport({ data: r, index, scoreScale }) {
    const fileA = (r.file_a || r.file1 || "").split("/").pop() || "File A"
    const fileB = (r.file_b || r.file2 || "").split("/").pop() || "File B"

    const rawScore = r.overall_score ?? r.similarity_score ?? r.overall_similarity ?? r.similarity ?? r.jaccard_similarity ?? null
    const pct = rawScore != null ? normalizeScore(rawScore, scoreScale) : null
    const pctStr = pct != null ? pct.toFixed(1) : null

    const severity = getSeverity(pct)
    const styles = SEVERITY_STYLES[severity]

    const verdict = r.verdict || (severity === "high" ? "HIGH SIMILARITY" : severity === "moderate" ? "MODERATE SIMILARITY" : "LOW SIMILARITY")

    const similarChunks = r.similar_chunks || []

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

                    {/* Side-by-side diff: Similar Chunks (semantic) */}
                    {similarChunks.length > 0 && (
                        <details className="group" open>
                            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 select-none py-1">
                                <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                                {similarChunks.length} similar chunk{similarChunks.length !== 1 ? "s" : ""} found
                            </summary>
                            <div className="mt-2 space-y-3">
                                {similarChunks.map((chunk, ci) => {
                                    const chunkPct = ((chunk.similarity ?? 0) * 100).toFixed(1)
                                    const isHighMatch = (chunk.similarity ?? 0) >= 0.7
                                    const highlight = isHighMatch
                                        ? "bg-red-500/[0.04] dark:bg-red-500/[0.06]"
                                        : "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]"
                                    return (
                                        <div key={ci} className="rounded-lg border overflow-hidden">
                                            {/* Chunk header */}
                                            <div className="grid grid-cols-[1fr_auto_1fr] bg-muted/50 border-b">
                                                <div className="px-3 py-1.5 text-[11px] font-mono font-medium text-muted-foreground truncate">
                                                    {fileA}
                                                </div>
                                                <div className="px-3 py-1.5 flex items-center">
                                                    <span className="text-[10px] font-mono font-medium text-muted-foreground">{chunkPct}%</span>
                                                </div>
                                                <div className="px-3 py-1.5 text-[11px] font-mono font-medium text-muted-foreground truncate text-right">
                                                    {fileB}
                                                </div>
                                            </div>
                                            {/* Side-by-side text */}
                                            <div className="grid grid-cols-2 divide-x divide-border/40">
                                                <div className={`px-3 py-3 ${highlight}`}>
                                                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{chunk.text_a}</p>
                                                </div>
                                                <div className={`px-3 py-3 ${highlight}`}>
                                                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{chunk.text_b}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </details>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

export default SemanticReport
