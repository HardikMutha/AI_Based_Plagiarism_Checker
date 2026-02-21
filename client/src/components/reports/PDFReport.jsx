import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    CheckCircle2,
    ImageIcon,
    Table2,
    Globe,
    ExternalLink,
    FileText,
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

function getSeverity(pct) {
    if (pct == null) return "low"
    if (pct >= 80) return "high"
    if (pct >= 68) return "moderate"
    return "low"
}

const SEVERITY_STYLES = {
    high: {
        text: "text-red-600 dark:text-red-400",
        bg: "bg-red-500/8",
        border: "border-red-500/25",
        badge: "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/8",
        bar: "[&>div]:bg-red-500",
    },
    moderate: {
        text: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/8",
        border: "border-amber-500/25",
        badge: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/8",
        bar: "[&>div]:bg-amber-500",
    },
    low: {
        text: "text-green-600 dark:text-green-400",
        bg: "bg-green-500/8",
        border: "border-green-500/25",
        badge: "border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/8",
        bar: "[&>div]:bg-green-500",
    },
}

export function PDFReport({ results }) {
    const [activeTab, setActiveTab] = useState("images")

    if (!results) return null

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

                {/* Summary */}
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                <div>
                                    <p className="font-semibold">Comparison Complete</p>
                                    <p className="text-sm text-muted-foreground">
                                        {results.total_files} PDFs compared ({results.total_comparisons} pairwise)
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Badge variant="outline" className={`text-xs gap-1.5 ${results.total_image_matches > 0 ? "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/8" : ""}`}>
                                    <ImageIcon className="h-3 w-3" />
                                    {results.total_image_matches} image match{results.total_image_matches !== 1 ? "es" : ""}
                                </Badge>
                                <Badge variant="outline" className={`text-xs gap-1.5 ${results.total_table_matches > 0 ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/8" : ""}`}>
                                    <Table2 className="h-3 w-3" />
                                    {results.total_table_matches} table match{results.total_table_matches !== 1 ? "es" : ""}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Per-file overview */}
                <Card>
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Per-File Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {(results.files || []).map((f, i) => (
                                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20">
                                    <div className="p-1.5 rounded-md bg-red-500/10">
                                        <FileText className="h-4 w-4 text-red-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{f.file}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {f.total_images} image{f.total_images !== 1 ? "s" : ""} · {f.total_tables} table{f.total_tables !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit flex-wrap">
                    <button
                        onClick={() => setActiveTab("images")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "images" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <ImageIcon className="h-4 w-4" /> Image Matches ({results.total_image_matches})
                    </button>
                    <button
                        onClick={() => setActiveTab("tables")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "tables" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Table2 className="h-4 w-4" /> Table Matches ({results.total_table_matches})
                    </button>
                    <button
                        onClick={() => setActiveTab("sources")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "sources" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Globe className="h-4 w-4" /> Web Sources
                    </button>
                </div>

                {/* Image Matches */}
                {activeTab === "images" && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {(results.image_matches || []).length > 0 ? (
                            results.image_matches.map((match, idx) => (
                                <ImageMatchCard key={idx} match={match} index={idx} />
                            ))
                        ) : (
                            <EmptyState icon={ImageIcon} title="No matching images" description="No copied or screenshotted images were detected across the uploaded PDFs." />
                        )}
                    </motion.div>
                )}

                {/* Table Matches */}
                {activeTab === "tables" && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {(results.table_matches || []).length > 0 ? (
                            results.table_matches.map((match, idx) => (
                                <TableMatchCard key={idx} match={match} index={idx} />
                            ))
                        ) : (
                            <EmptyState icon={Table2} title="No matching tables" description="No identical, subset, or similar tables were detected across the uploaded PDFs." />
                        )}
                    </motion.div>
                )}

                {/* Web Sources */}
                {activeTab === "sources" && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {(results.files || []).some(f => f.images?.some(img => img.web_sources?.length > 0)) ? (
                            results.files.flatMap(f =>
                                (f.images || []).filter(img => img.web_sources?.length > 0).map((img, idx) => (
                                    <WebSourceCard key={`${f.file}-${img.page}-${img.index}`} image={img} file={f.file} index={idx} />
                                ))
                            )
                        ) : (
                            <Card>
                                <CardContent className="py-10 space-y-4">
                                    <div className="text-center text-muted-foreground">
                                        <Globe className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                        <p className="font-medium">No internet sources detected</p>
                                        <p className="text-sm mt-1">None of the extracted images were found on the web.</p>
                                    </div>
                                    {(results.files || []).some(f => f.images?.some(img => img.search_url)) && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground text-center">You can manually search each image on Google Lens:</p>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {results.files.flatMap(f =>
                                                    (f.images || []).filter(img => img.search_url).map((img, i) => (
                                                        <a
                                                            key={`${f.file}-${i}`}
                                                            href={img.search_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            {f.file} p.{img.page} img {img.index + 1}
                                                        </a>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    )
}

// ─── Image Match Card ───────────────────────────────────────────
function ImageMatchCard({ match, index }) {
    const pct = Math.round(match.similarity * 100)
    const severity = getSeverity(pct)
    const styles = SEVERITY_STYLES[severity]

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card className={`overflow-hidden transition-colors ${severity !== "low" ? styles.border : ""}`}>
                <CardContent className="pt-5 pb-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                                {match.file_a} <span className="text-muted-foreground font-normal mx-1.5">vs</span> {match.file_b}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">Page {match.page_a}</Badge>
                                <span className="text-muted-foreground text-[10px]">/</span>
                                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">Page {match.page_b}</Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="w-24 hidden sm:block">
                                <Progress value={pct} className={`h-2 ${styles.bar}`} />
                            </div>
                            <span className={`text-2xl font-bold font-mono tabular-nums ${styles.text}`}>
                                {pct}<span className="text-sm font-normal text-muted-foreground">%</span>
                            </span>
                        </div>
                    </div>

                    {/* Verdict */}
                    <Badge variant="outline" className={`text-[11px] font-semibold ${styles.badge}`}>
                        {match.match_type === "contained_in"
                            ? "EMBEDDED IN SCREENSHOT"
                            : match.match_type === "page_screenshot"
                                ? "PAGE SCREENSHOT"
                                : pct >= 90
                                    ? "IDENTICAL / COPY"
                                    : pct >= 75
                                        ? "LIKELY SCREENSHOT"
                                        : "SIMILAR IMAGE"}
                    </Badge>

                    {/* Side-by-side images */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-muted/20 p-2">
                            <p className="text-[10px] font-mono text-muted-foreground mb-1.5 truncate">{match.file_a} — p.{match.page_a}</p>
                            <div className="flex items-center justify-center min-h-[120px] max-h-[240px]">
                                <img src={match.data_a} alt="Image A" className="max-w-full max-h-[220px] object-contain rounded" loading="lazy" />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">{match.width_a}×{match.height_a}px</p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-2">
                            <p className="text-[10px] font-mono text-muted-foreground mb-1.5 truncate">{match.file_b} — p.{match.page_b}</p>
                            <div className="flex items-center justify-center min-h-[120px] max-h-[240px]">
                                <img src={match.data_b} alt="Image B" className="max-w-full max-h-[220px] object-contain rounded" loading="lazy" />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">{match.width_b}×{match.height_b}px</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

// ─── Web Source Card ────────────────────────────────────────────
function WebSourceCard({ image, file, index }) {
    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card className="overflow-hidden border-blue-500/25">
                <CardContent className="pt-5 pb-4 space-y-3">
                    <div className="flex gap-4">
                        {/* Thumbnail */}
                        <div className="shrink-0 w-28 h-28 rounded-lg border bg-muted/20 p-1 flex items-center justify-center">
                            <img src={image.data} alt="Extracted" className="max-w-full max-h-full object-contain rounded" loading="lazy" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                            <div>
                                <p className="text-sm font-semibold">{file}</p>
                                <p className="text-[10px] text-muted-foreground">Page {image.page} · {image.width}×{image.height}px</p>
                            </div>

                            <Badge variant="outline" className="text-[11px] font-semibold border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/8">
                                <Globe className="h-3 w-3 mr-1" />
                                {image.web_sources.length} SOURCE{image.web_sources.length !== 1 ? "S" : ""} FOUND
                            </Badge>

                            {/* Source links */}
                            <div className="space-y-1">
                                {image.web_sources.map((src, i) => (
                                    <a
                                        key={i}
                                        href={src.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 rounded-md border bg-muted/10 hover:bg-muted/30 transition-colors group"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                        <span className="text-xs truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {src.title}
                                        </span>
                                    </a>
                                ))}
                            </div>

                            {image.search_url && (
                                <a
                                    href={image.search_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ExternalLink className="h-3 w-3" /> Open full Google Lens results →
                                </a>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

// ─── Table Match Card ───────────────────────────────────────────
function TableMatchCard({ match, index }) {
    const pct = Math.round((match.similarity ?? 1) * 100)
    const severity = getSeverity(pct)
    const styles = SEVERITY_STYLES[severity]

    const matchLabel = {
        identical: "IDENTICAL TABLE",
        subset: "ROW SUBSET",
        column_subset: "COLUMN SUBSET",
        similar: "SIMILAR TABLE",
    }[match.match_type] || "TABLE MATCH"

    const tblA = match.table_a
    const tblB = match.table_b || match.table_a
    const showSideBySide = match.match_type && match.match_type !== "identical"

    const renderTable = (tbl, label) => (
        <div className="flex-1 min-w-0">
            {label && <p className="text-[10px] font-mono text-muted-foreground mb-1.5 truncate">{label}</p>}
            <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                    {tbl.headers && tbl.headers.length > 0 && (
                        <thead>
                            <tr className="bg-muted/60 border-b">
                                {tbl.headers.map((h, i) => (
                                    <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h || "—"}</th>
                                ))}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {tbl.rows.slice(0, 6).map((row, ri) => (
                            <tr key={ri} className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${ri % 2 === 0 ? "" : "bg-muted/10"}`}>
                                {row.map((cell, ci) => (
                                    <td key={ci} className="px-3 py-2 text-sm whitespace-nowrap">{cell || "—"}</td>
                                ))}
                            </tr>
                        ))}
                        {tbl.rows.length > 6 && (
                            <tr><td colSpan={(tbl.headers || []).length} className="px-3 py-2 text-xs text-muted-foreground text-center">… {tbl.rows.length - 6} more rows</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
                {tbl.rows.length} row{tbl.rows.length !== 1 ? "s" : ""} × {(tbl.headers || []).length} col{(tbl.headers || []).length !== 1 ? "s" : ""}
            </p>
        </div>
    )

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <Card className={`overflow-hidden transition-colors ${styles.border}`}>
                <CardContent className="pt-5 pb-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold">
                                {match.file_a} <span className="text-muted-foreground font-normal mx-1.5">vs</span> {match.file_b}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">Page {match.page_a}</Badge>
                                <span className="text-muted-foreground text-[10px]">/</span>
                                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">Page {match.page_b}</Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            {pct < 100 && (
                                <div className="w-20 hidden sm:block">
                                    <Progress value={pct} className={`h-2 ${styles.bar}`} />
                                </div>
                            )}
                            <span className={`text-2xl font-bold font-mono tabular-nums ${styles.text}`}>
                                {pct}<span className="text-sm font-normal text-muted-foreground">%</span>
                            </span>
                        </div>
                    </div>

                    <Badge variant="outline" className={`text-[11px] font-semibold ${styles.badge}`}>
                        {matchLabel}
                    </Badge>

                    {showSideBySide ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {renderTable(tblA, `${match.file_a} — p.${match.page_a}`)}
                            {renderTable(tblB, `${match.file_b} — p.${match.page_b}`)}
                        </div>
                    ) : (
                        renderTable(tblA)
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

// ─── Empty State ────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, description }) {
    return (
        <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
                <Icon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">{title}</p>
                <p className="text-sm mt-1">{description}</p>
            </CardContent>
        </Card>
    )
}
