import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    History,
    Trash2,
    Loader2,
    FileCode,
    FileText,
    Bot,
    Sparkles,
    ChevronRight,
    ChevronDown,
    AlertTriangle,
    Clock,
    Files,
    RefreshCw,
    Inbox,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Link } from "react-router-dom"

// ── Type config ─────────────────────────────────────────────────
const TYPE_CONFIG = {
    ast_comparison: {
        label: "Code — AST",
        icon: FileCode,
        color: "text-violet-500",
        bg: "bg-violet-500/10",
        border: "border-violet-500/20",
        badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
        scoreScale: 100,
    },
    min_hash: {
        label: "Text — MinHash",
        icon: FileText,
        color: "text-sky-500",
        bg: "bg-sky-500/10",
        border: "border-sky-500/20",
        badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
        scoreScale: 1,
    },
    semantic_similarity: {
        label: "Text — Semantic",
        icon: Sparkles,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        scoreScale: 1,
    },
    code_ai_detection: {
        label: "AI Detection",
        icon: Bot,
        color: "text-indigo-500",
        bg: "bg-indigo-500/10",
        border: "border-indigo-500/20",
        badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        scoreScale: 100,
    },
    pdf_analysis: {
        label: "PDF Analysis",
        icon: Bot,
        color: "text-indigo-500",
        bg: "bg-indigo-500/10",
        border: "border-indigo-500/20",
        badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        scoreScale: 100,
    },
}

const FALLBACK_CONFIG = {
    label: "Report",
    icon: Files,
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
    badge: "bg-muted text-muted-foreground",
    scoreScale: 100,
}

function timeAgo(dateStr) {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)

    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatDate(dateStr) {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

// ── Main Page ───────────────────────────────────────────────────
const ReportHistoryPage = () => {
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(null)
    const [expandedId, setExpandedId] = useState(null)
    const [filter, setFilter] = useState("all")

    const fetchReports = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch("/api/reports", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (!res.ok) throw new Error("Failed to load reports")
            const data = await res.json()
            setReports(data.reports || [])
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchReports()
    }, [])

    const handleDelete = async (id) => {
        setDeleting(id)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`/api/reports/${id}`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (!res.ok) throw new Error("Failed to delete report")
            setReports((prev) => prev.filter((r) => r._id !== id))
            if (expandedId === id) setExpandedId(null)
            toast.success("Report deleted.")
        } catch (err) {
            toast.error(err.message)
        } finally {
            setDeleting(null)
        }
    }

    const filteredReports =
        filter === "all"
            ? reports
            : reports.filter((r) => (r.report?.type || "") === filter)

    const typeCounts = reports.reduce((acc, r) => {
        const t = r.report?.type || "unknown"
        acc[t] = (acc[t] || 0) + 1
        return acc
    }, {})

    // ── Animations ──────────────────────────────────────────────
    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06 } },
    }
    const item = {
        hidden: { y: 14, opacity: 0 },
        show: { y: 0, opacity: 1 },
    }

    // ── Render ──────────────────────────────────────────────────
    return (
        <div className="flex flex-col min-h-screen bg-transparent">
            {/* Header */}
            <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0 shrink-0">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="p-2" />
                    <h1 className="text-xl font-semibold hidden sm:block">Reports History</h1>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={fetchReports}
                    disabled={loading}
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="max-w-5xl mx-auto space-y-6"
                >
                    {/* Title */}
                    <motion.div variants={item}>
                        <h2 className="text-3xl font-bold tracking-tight">Report History</h2>
                        <p className="text-muted-foreground mt-1">
                            View and manage your past plagiarism and AI detection scan reports.
                        </p>
                    </motion.div>

                    {/* Filter chips */}
                    {reports.length > 0 && (
                        <motion.div variants={item} className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setFilter("all")}
                                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                  ${filter === "all"
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                                    }
                `}
                            >
                                All ({reports.length})
                            </button>
                            {Object.entries(typeCounts).map(([type, count]) => {
                                const cfg = TYPE_CONFIG[type] || FALLBACK_CONFIG
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setFilter(type)}
                                        className={`
                      px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5
                      ${filter === type
                                                ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                                                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                                            }
                    `}
                                    >
                                        {cfg.label} ({count})
                                    </button>
                                )
                            })}
                        </motion.div>
                    )}

                    {/* Loading state */}
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 text-muted-foreground"
                        >
                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                            <p className="text-sm font-medium">Loading reports…</p>
                        </motion.div>
                    )}

                    {/* Empty state */}
                    {!loading && reports.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-20 text-muted-foreground"
                        >
                            <div className="p-4 rounded-full bg-muted mb-4">
                                <Inbox className="h-10 w-10 opacity-40" />
                            </div>
                            <p className="text-lg font-medium">No reports yet</p>
                            <p className="text-sm mt-1 max-w-sm text-center">
                                Run a plagiarism scan or AI detection analysis, and your reports will appear here.
                            </p>
                        </motion.div>
                    )}

                    {/* No results for filter */}
                    {!loading && reports.length > 0 && filteredReports.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center py-16 text-muted-foreground"
                        >
                            <p className="text-sm">No reports of this type found.</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={() => setFilter("all")}
                            >
                                Clear filter
                            </Button>
                        </motion.div>
                    )}

                    {/* Reports list */}
                    {!loading && filteredReports.length > 0 && (
                        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                            {filteredReports.map((report) => (
                                <ReportCard
                                    key={report._id}
                                    report={report}
                                    expanded={expandedId === report._id}
                                    onToggle={() =>
                                        setExpandedId((prev) => (prev === report._id ? null : report._id))
                                    }
                                    onDelete={() => handleDelete(report._id)}
                                    deleting={deleting === report._id}
                                />
                            ))}
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}

// ─── Report Card ────────────────────────────────────────────────
function ReportCard({ report, expanded, onToggle, onDelete, deleting }) {
    const data = report.report || {}
    const type = data.type || "unknown"
    const cfg = TYPE_CONFIG[type] || FALLBACK_CONFIG
    const Icon = cfg.icon

    const totalFiles = data.total_files ?? 0
    const totalComparisons = data.total_comparisons ?? 0
    const results = data.results

    // For AI detection, show probability
    const isAIDetection = type === "code_ai_detection"
    const aiProb = isAIDetection && results ? results.ai_probability : null

    // For comparison types, find max similarity
    const maxSim = !isAIDetection && Array.isArray(results)
        ? results.reduce((max, r) => {
            const score = r.overall_score ?? r.similarity_score ?? r.overall_similarity ?? r.similarity ?? r.jaccard_similarity ?? 0
            const normalized = cfg.scoreScale === 1 ? score * 100 : score
            return Math.max(max, normalized)
        }, 0)
        : null

    return (
        <motion.div
            variants={{ hidden: { y: 14, opacity: 0 }, show: { y: 0, opacity: 1 } }}
            layout
        >
            <Card
                className={`overflow-hidden transition-all ${expanded ? "ring-1 ring-primary/20" : ""
                    }`}
            >
                {/* Header row */}
                <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={onToggle}
                >
                    {/* Icon */}
                    <div className={`p-2.5 rounded-lg ${cfg.bg} shrink-0`}>
                        <Icon className={`h-5 w-5 ${cfg.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{cfg.label} Report</p>
                            <Badge variant="outline" className={`text-[10px] font-medium ${cfg.badge}`}>
                                {type.replace(/_/g, " ")}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Files className="h-3 w-3" />
                                {totalFiles} file{totalFiles !== 1 ? "s" : ""}
                            </span>
                            {totalComparisons > 0 && (
                                <span>{totalComparisons} comparison{totalComparisons !== 1 ? "s" : ""}</span>
                            )}
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {timeAgo(report.created_at)}
                            </span>
                        </div>
                    </div>

                    {/* Score + actions */}
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Max similarity pill */}
                        {maxSim != null && maxSim > 0 && (
                            <div className={`text-right hidden sm:block`}>
                                <p className="text-[10px] text-muted-foreground">Max match</p>
                                <p
                                    className={`text-lg font-bold font-mono tabular-nums ${maxSim >= 60
                                        ? "text-red-600 dark:text-red-400"
                                        : maxSim >= 40
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-green-600 dark:text-green-400"
                                        }`}
                                >
                                    {maxSim.toFixed(1)}
                                    <span className="text-xs font-normal text-muted-foreground">%</span>
                                </p>
                            </div>
                        )}

                        {/* AI prob pill */}
                        {aiProb != null && (
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] text-muted-foreground">AI prob</p>
                                <p
                                    className={`text-lg font-bold font-mono tabular-nums ${aiProb * 100 >= 70
                                        ? "text-red-600 dark:text-red-400"
                                        : aiProb * 100 >= 40
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-green-600 dark:text-green-400"
                                        }`}
                                >
                                    {(aiProb * 100).toFixed(1)}
                                    <span className="text-xs font-normal text-muted-foreground">%</span>
                                </p>
                            </div>
                        )}

                        {/* Delete */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete()
                            }}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                        </Button>

                        {/* Expand toggle */}
                        {expanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                    </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="border-t px-4 py-4 space-y-3">
                                {/* Action */}
                                <div className="flex justify-end">
                                    <Button asChild variant="outline" size="sm">
                                        <Link to={`/reports/${report._id}`}>
                                            View Full Report
                                        </Link>
                                    </Button>
                                </div>
                                {/* Metadata */}
                                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                    <span>
                                        <strong className="text-foreground">Created:</strong>{" "}
                                        {formatDate(report.created_at)}
                                    </span>
                                    <span>
                                        <strong className="text-foreground">Report ID:</strong>{" "}
                                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">{report._id}</code>
                                    </span>
                                </div>

                                {/* AI detection result */}
                                {isAIDetection && results && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <Badge
                                                variant="outline"
                                                className={`text-xs font-semibold ${aiProb * 100 >= 70
                                                    ? "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/8"
                                                    : aiProb * 100 >= 40
                                                        ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/8"
                                                        : "border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/8"
                                                    }`}
                                            >
                                                {results.verdict || "N/A"}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {results.file_name?.split("/").pop()} •{" "}
                                                <code className="text-[11px]">{results.language}</code>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 max-w-xs">
                                            <Progress
                                                value={aiProb * 100}
                                                className={`h-2 ${aiProb * 100 >= 70
                                                    ? "[&>div]:bg-red-500"
                                                    : aiProb * 100 >= 40
                                                        ? "[&>div]:bg-amber-500"
                                                        : "[&>div]:bg-green-500"
                                                    }`}
                                            />
                                            <span className="text-sm font-mono font-semibold">
                                                {(aiProb * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                        {results.explanations && results.explanations.length > 0 && (
                                            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 mt-2">
                                                {results.explanations.slice(0, 5).map((e, i) => (
                                                    <li key={i}>{e}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {/* Comparison results */}
                                {!isAIDetection && Array.isArray(results) && results.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Comparisons ({results.length})
                                        </p>
                                        <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                                            {results.map((r, idx) => {
                                                const fileA = (r.file_a || r.file1 || "").split("/").pop() || "File A"
                                                const fileB = (r.file_b || r.file2 || "").split("/").pop() || "File B"
                                                const rawScore =
                                                    r.overall_score ??
                                                    r.similarity_score ??
                                                    r.overall_similarity ??
                                                    r.similarity ??
                                                    r.jaccard_similarity ??
                                                    null
                                                const pct =
                                                    rawScore != null
                                                        ? cfg.scoreScale === 1
                                                            ? rawScore * 100
                                                            : rawScore
                                                        : null
                                                const severity =
                                                    pct >= 60 ? "high" : pct >= 40 ? "moderate" : "low"
                                                const sevColors = {
                                                    high: "text-red-600 dark:text-red-400",
                                                    moderate: "text-amber-600 dark:text-amber-400",
                                                    low: "text-green-600 dark:text-green-400",
                                                }
                                                const barColors = {
                                                    high: "[&>div]:bg-red-500",
                                                    moderate: "[&>div]:bg-amber-500",
                                                    low: "[&>div]:bg-green-500",
                                                }

                                                return (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium truncate">
                                                                {fileA}
                                                                <span className="text-muted-foreground mx-1.5 font-normal">
                                                                    vs
                                                                </span>
                                                                {fileB}
                                                            </p>
                                                        </div>
                                                        {pct != null && (
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <div className="w-16 hidden sm:block">
                                                                    <Progress
                                                                        value={Math.min(pct, 100)}
                                                                        className={`h-1.5 ${barColors[severity]}`}
                                                                    />
                                                                </div>
                                                                <span
                                                                    className={`text-sm font-bold font-mono tabular-nums ${sevColors[severity]}`}
                                                                >
                                                                    {pct.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* No results */}
                                {!isAIDetection && (!Array.isArray(results) || results.length === 0) && (
                                    <p className="text-xs text-muted-foreground italic">No comparison data available.</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    )
}

export default ReportHistoryPage
