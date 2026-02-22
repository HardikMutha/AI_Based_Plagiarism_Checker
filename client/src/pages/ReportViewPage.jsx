import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
    ArrowLeft, Loader2, AlertTriangle, FileCode, FileText, Sparkles, Bot, Files, Printer,
    ShieldCheck, ShieldAlert, ShieldQuestion, ChevronRight, ChevronDown, User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { CodeCheckReport } from "@/components/reports/CodeCheckReport"
import { MinHashReport } from "@/components/reports/MinHashReport"
import { SemanticReport } from "@/components/reports/SemanticReport"
import { PDFReport } from "@/components/reports/PDFReport"

const TYPE_CONFIG = {
    ast_comparison: { label: "Code  AST", icon: FileCode, scoreScale: 100 },
    min_hash: { label: "Text  MinHash", icon: FileText, scoreScale: 1 },
    semantic_similarity: { label: "Text  Semantic", icon: Sparkles, scoreScale: 1 },
    code_ai_detection: { label: "AI Detection", icon: Bot, scoreScale: 100 },
    text_ai: { label: "Text AI Detection", icon: Bot, scoreScale: 100 },
}
const FALLBACK_CONFIG = { label: "Report", icon: Files, scoreScale: 100 }

// Helpers for TextAI rendering (matching TextResultsPanel styles)
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
    high: { dot: "bg-red-500", text: "text-foreground", border: "border-red-500/20", bg: "bg-red-500/[0.04] dark:bg-red-500/[0.06]", label: "Strong signal", labelColor: "text-red-600 dark:text-red-400" },
    medium: { dot: "bg-amber-500", text: "text-foreground", border: "border-amber-500/20", bg: "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]", label: "Moderate signal", labelColor: "text-amber-600 dark:text-amber-400" },
    low: { dot: "bg-muted-foreground/40", text: "text-muted-foreground", border: "border-border/50", bg: "", label: "Minor signal", labelColor: "text-muted-foreground" },
}

// ── Page ────────────────────────────────────────────────────────
const ReportViewPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [downloading, setDownloading] = useState(false)
    const reportRef = useRef(null)

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const token = localStorage.getItem("token")
                const res = await fetch(`/api/reports/${id}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })
                if (!res.ok) throw new Error("Failed to load report")
                const data = await res.json()
                setReport(data)
            } catch (err) {
                setError(err.message)
                toast.error(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchReport()
    }, [id])

    const handleDownloadPDF = async () => {
        setDownloading(true)
        try {
            const token = localStorage.getItem("token")
            console.log(id)
            const res = await fetch(`/api/reports/${id}/pdf`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (!res.ok) throw new Error("Failed to download PDF")
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `report-${id}.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
            toast.success("PDF downloaded!")
        } catch (err) {
            toast.error(err.message)
        } finally {
            setDownloading(false)
        }
    }


    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !report) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <AlertTriangle className="h-10 w-10 text-destructive" />
                <p className="font-semibold text-lg">Report not found</p>
                <Button variant="outline" onClick={() => navigate("/reports")}>Go back</Button>
            </div>
        )
    }

    const data = report.report || {}
    const type = data.type || "unknown"
    const cfg = TYPE_CONFIG[type] || FALLBACK_CONFIG
    const isAIDetection = type === "code_ai_detection"
    const isTextAI = type === "text_ai"
    const results = data.results

    return (
        <>
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #report-print-area, #report-print-area * { visibility: visible; }
                    #report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .print-hidden { display: none !important; }
                }
            `}</style>

            <div className="flex flex-col min-h-screen bg-transparent">
                <header className="print-hidden h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0 shrink-0">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-xl font-semibold hidden sm:block">Report Details</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleDownloadPDF} className="gap-2" disabled={downloading}>
                            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span><svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1v10M8 11l3-3M8 11l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><rect x="3" y="13" width="10" height="2" rx="1" fill="currentColor" /></svg></span>}
                            {downloading ? "Downloading…" : "Download PDF"}
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-4xl mx-auto space-y-6"
                        ref={reportRef}
                        id="report-print-area"
                        data-pdf-content
                    >
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">{cfg.label} Report</h2>
                            <p className="text-muted-foreground mt-1 text-sm">Report ID: {report._id}</p>
                        </div>

                        <Card>
                            <CardContent className="pt-6 flex flex-wrap gap-6 text-sm">
                                <div>
                                    <p className="text-muted-foreground mb-1">Created At</p>
                                    <p className="font-medium">{new Date(report.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-1">Total Files</p>
                                    <p className="font-medium">{data.total_files ?? 0}</p>
                                </div>
                                {!isAIDetection && !isTextAI && (
                                    <div>
                                        <p className="text-muted-foreground mb-1">Total Comparisons</p>
                                        <p className="font-medium">{data.total_comparisons ?? 0}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-muted-foreground mb-1">Type</p>
                                    <p className="font-medium">{type.replace(/_/g, " ")}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {isAIDetection && results && (() => {
                            const items = Array.isArray(results) ? results : [results];
                            const avgProb = items.reduce((s, r) => s + (r.ai_probability || 0), 0) / items.length;
                            const avgPct = (avgProb * 100).toFixed(1);
                            const sevColor = avgPct >= 70 ? "red" : avgPct >= 40 ? "amber" : "green";
                            const ringCls = sevColor === "red" ? "border-red-500/40" : sevColor === "amber" ? "border-amber-500/40" : "border-green-500/40";
                            const textCls = sevColor === "red" ? "text-red-600" : sevColor === "amber" ? "text-amber-600" : "text-green-600";
                            const barCls = sevColor === "red" ? "bg-red-500" : sevColor === "amber" ? "bg-amber-500" : "bg-green-500";
                            const highCount = items.filter(r => (r.ai_probability || 0) >= 0.7).length;
                            const modCount = items.filter(r => (r.ai_probability || 0) >= 0.4 && (r.ai_probability || 0) < 0.7).length;
                            const safeCount = items.length - highCount - modCount;

                            return (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-semibold">Detection Results</h3>

                                    {/* Summary Card */}
                                    <Card className={`overflow-hidden border-2 ${ringCls}`}>
                                        <CardContent className="pt-6 pb-5">
                                            <div className="flex items-center gap-6">
                                                <div className={`w-20 h-20 rounded-full border-4 ${ringCls} flex items-center justify-center shrink-0`}>
                                                    <div className="text-center">
                                                        <span className={`text-2xl font-bold font-mono ${textCls}`}>{avgPct}</span>
                                                        <span className="text-[10px] text-muted-foreground block -mt-0.5">% avg AI</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <p className="font-semibold text-lg">AI Code Detection Summary</p>
                                                    <p className="text-sm text-muted-foreground">{items.length} file{items.length !== 1 ? "s" : ""} analyzed</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {highCount > 0 && (
                                                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-600 border border-red-500/25">
                                                                {highCount} likely AI
                                                            </span>
                                                        )}
                                                        {modCount > 0 && (
                                                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/25">
                                                                {modCount} needs review
                                                            </span>
                                                        )}
                                                        {safeCount > 0 && (
                                                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-500/10 text-green-600 border border-green-500/25">
                                                                {safeCount} likely human
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="w-full max-w-sm">
                                                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                                                            <div className={`h-full rounded-full ${barCls}`} style={{ width: `${avgPct}%` }} />
                                                        </div>
                                                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                                            <span>Human-written</span>
                                                            <span>AI-generated</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Per-file cards */}
                                    {items.map((r, idx) => {
                                        const pct = (r.ai_probability * 100).toFixed(1);
                                        const sv = pct >= 70 ? "red" : pct >= 40 ? "amber" : "green";
                                        const tc = sv === "red" ? "text-red-600" : sv === "amber" ? "text-amber-600" : "text-green-600";
                                        const bc = sv === "red" ? "bg-red-500" : sv === "amber" ? "bg-amber-500" : "bg-green-500";
                                        const border = sv === "red" ? "border-red-500/30" : sv === "amber" ? "border-amber-500/30" : "border-green-500/30";
                                        const fname = (r.file_name || "File").split("/").pop().split("\\").pop();
                                        return (
                                            <Card key={idx} className={`border ${border}`}>
                                                <CardContent className="pt-5 pb-4 space-y-3 text-sm">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold truncate">{fname}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {r.language && (
                                                                    <span className="text-[10px] font-mono border rounded px-1.5 py-0.5 text-muted-foreground">{r.language}</span>
                                                                )}
                                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${sv === "red" ? "bg-red-500/10 text-red-600 border border-red-500/25"
                                                                    : sv === "amber" ? "bg-amber-500/10 text-amber-600 border border-amber-500/25"
                                                                        : "bg-green-500/10 text-green-600 border border-green-500/25"
                                                                    }`}>{r.verdict}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <span className={`text-2xl font-bold font-mono ${tc}`}>{pct}<span className="text-xs font-normal text-muted-foreground">%</span></span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                                            <div className={`h-full rounded-full ${bc}`} style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                                                            <span>Human</span>
                                                            <span>AI</span>
                                                        </div>
                                                    </div>

                                                    {r.explanations?.length > 0 && (
                                                        <div className="pt-1">
                                                            <p className="font-semibold text-xs mb-1.5">Analysis Notes</p>
                                                            <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground text-xs">
                                                                {r.explanations.map((exp, i) => <li key={i}>{exp}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {r.signal_details && (
                                                        <div className="pt-1">
                                                            <p className="font-semibold text-xs mb-2">Signal Breakdown</p>
                                                            <div className="space-y-1.5">
                                                                {Object.entries(r.signal_details).map(([key, s]) => {
                                                                    const sp = Math.min(s.value * 100, 100);
                                                                    return (
                                                                        <div key={key} className="flex items-center gap-3">
                                                                            <span className="text-[11px] text-muted-foreground w-44 shrink-0 truncate" title={s.tip}>{s.label || key}</span>
                                                                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                                                                <div
                                                                                    className={`h-full rounded-full ${sp >= 70 ? "bg-red-500" : sp >= 40 ? "bg-amber-500" : "bg-green-500"}`}
                                                                                    style={{ width: `${sp}%` }}
                                                                                />
                                                                            </div>
                                                                            <span className="text-[11px] font-mono w-9 text-right tabular-nums">{sp.toFixed(0)}%</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        {/* ── Text AI Detection ── */}
                        {isTextAI && Array.isArray(results) && results.length > 0 && (() => {
                            const avgScore = results.reduce((s, r) => s + (r.score || 0), 0) / results.length;
                            const avgPct = (avgScore * 100).toFixed(1);
                            const sv = avgPct >= 70 ? "red" : avgPct >= 40 ? "amber" : "green";
                            const ringCls = sv === "red" ? "border-red-500/40" : sv === "amber" ? "border-amber-500/40" : "border-green-500/40";
                            const textCls = sv === "red" ? "text-red-600 dark:text-red-400" : sv === "amber" ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400";
                            const progressCls = sv === "red" ? "[&>div]:bg-red-500" : sv === "amber" ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500";
                            const highCount = results.filter(r => (r.score || 0) >= 0.7).length;
                            const modCount = results.filter(r => (r.score || 0) >= 0.4 && (r.score || 0) < 0.7).length;
                            const safeCount = results.length - highCount - modCount;

                            return (
                                <div className="space-y-6">
                                    <h3 className="text-xl font-semibold">Text AI Detection Results</h3>

                                    {/* Summary Card */}
                                    <Card className={`overflow-hidden border-2 ${ringCls}`}>
                                        <CardContent className="pt-6 pb-5">
                                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                                <div className={`relative w-24 h-24 rounded-full border-4 flex items-center justify-center shrink-0 ${ringCls}`}>
                                                    <div className="text-center">
                                                        <span className={`text-2xl font-bold font-mono tabular-nums ${textCls}`}>{avgPct}</span>
                                                        <span className="text-[10px] text-muted-foreground block -mt-0.5">% avg AI</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 text-center sm:text-left space-y-2">
                                                    <p className="font-semibold text-lg">Multi-File Text AI Detection</p>
                                                    <p className="text-sm text-muted-foreground">{results.length} file{results.length !== 1 ? "s" : ""} analyzed</p>
                                                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                                        {highCount > 0 && (
                                                            <Badge variant="outline" className="text-[10px] font-semibold border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400">
                                                                {highCount} likely AI
                                                            </Badge>
                                                        )}
                                                        {modCount > 0 && (
                                                            <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                                {modCount} needs review
                                                            </Badge>
                                                        )}
                                                        {safeCount > 0 && (
                                                            <Badge variant="outline" className="text-[10px] font-semibold border-green-500/25 bg-green-500/10 text-green-600 dark:text-green-400">
                                                                {safeCount} likely human
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="w-full max-w-sm mx-auto sm:mx-0">
                                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> Human</span>
                                                            <span className="flex items-center gap-1">AI <Bot className="h-3 w-3" /></span>
                                                        </div>
                                                        <Progress value={parseFloat(avgPct)} className={`h-2.5 ${progressCls}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Per-file detailed cards */}
                                    {results.map((r, idx) => {
                                        const score = (r.score || 0) * 100;
                                        const scoreStr = score.toFixed(1);
                                        const verdict = r.verdict || "Unknown";
                                        const layers = r.layer_details || {};
                                        const explanations = r.explanations || {};
                                        const conclusions = explanations.conclusions || [];
                                        const summary = explanations.summary || "";
                                        const fname = r.filename?.split("/").pop() || `File ${idx + 1}`;

                                        const isLikelyAI = verdict === "Likely AI";
                                        const isReview = verdict === "Review Recommended";
                                        const VerdictIcon = isLikelyAI ? ShieldAlert : isReview ? ShieldQuestion : ShieldCheck;
                                        const verdictColor = isLikelyAI ? "text-red-600 dark:text-red-400" : isReview ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400";
                                        const pc = isLikelyAI ? "[&>div]:bg-red-500" : isReview ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500";
                                        const rc = isLikelyAI ? "border-red-500/40" : isReview ? "border-amber-500/40" : "border-green-500/40";

                                        const mainLayers = [
                                            { label: "ML Model Probability", value: layers.ml_probability ?? 0, weight: "55%" },
                                            { label: "Heuristic Score", value: layers.heuristic_score ?? 0, weight: "20%" },
                                        ];
                                        const patternScores = layers.pattern_scores || {};
                                        const patternEntries = [
                                            { label: "Semantic Drift Uniformity", value: patternScores.drift_uniformity ?? 0 },
                                            { label: "First-Last Paragraph Similarity", value: patternScores.first_last_sim ?? 0 },
                                            { label: "Logic Loop Score", value: patternScores.loop_score ?? 0 },
                                        ];

                                        return (
                                            <div key={idx} className="space-y-4">
                                                {/* File divider */}
                                                {results.length > 1 && (
                                                    <div className="flex items-center gap-3 pt-2">
                                                        <div className="h-px flex-1 bg-border" />
                                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">File {idx + 1} of {results.length}</span>
                                                        <div className="h-px flex-1 bg-border" />
                                                    </div>
                                                )}

                                                {/* Verdict Card */}
                                                <Card className={`overflow-hidden border ${rc}`}>
                                                    <CardContent className="pt-6 pb-5">
                                                        <div className="flex flex-col sm:flex-row items-center gap-6">
                                                            <div className="flex flex-col items-center gap-2 shrink-0">
                                                                <div className={`relative w-28 h-28 rounded-full border-4 flex items-center justify-center ${rc}`}>
                                                                    <div className="text-center">
                                                                        <span className={`text-3xl font-bold font-mono tabular-nums ${verdictColor}`}>{scoreStr}</span>
                                                                        <span className="text-xs text-muted-foreground block -mt-0.5">% AI</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 text-center sm:text-left space-y-2">
                                                                <div className="flex items-center gap-2 justify-center sm:justify-start">
                                                                    <VerdictIcon className={`h-5 w-5 shrink-0 ${verdictColor}`} />
                                                                    <h3 className={`text-lg font-bold ${verdictColor}`}>{verdict}</h3>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground">{fname}</p>
                                                                <div className="w-full max-w-sm mx-auto sm:mx-0">
                                                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                                                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> Human</span>
                                                                        <span className="flex items-center gap-1">AI <Bot className="h-3 w-3" /></span>
                                                                    </div>
                                                                    <Progress value={score} className={`h-2.5 ${pc}`} />
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
                                                            <CardDescription className="text-xs">Insights from vocabulary, style, rhythm, and semantic pattern analysis</CardDescription>
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
                                                                        const style = CONCLUSION_STYLES[c.severity] || CONCLUSION_STYLES.low;
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
                                                                                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${style.labelColor}`}>{style.label}</span>
                                                                                        <p className={`text-sm leading-relaxed mt-0.5 ${style.text}`}>{c.text}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </motion.div>
                                                                        );
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
                                                                const layerPct = layer.value * 100;
                                                                return (
                                                                    <div key={layer.label}>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="text-xs font-medium">
                                                                                {layer.label}
                                                                                <span className="text-muted-foreground ml-1.5">(weight: {layer.weight})</span>
                                                                            </span>
                                                                            <span className={`text-xs font-mono font-semibold tabular-nums ${textColor(layerPct)}`}>{layerPct.toFixed(1)}%</span>
                                                                        </div>
                                                                        <Progress value={Math.min(layerPct, 100)} className={`h-1.5 ${barColor(layerPct)}`} />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                                                Pattern Analysis <span className="normal-case">(weight: 25%)</span>
                                                            </p>
                                                            <div className="space-y-2.5">
                                                                {patternEntries.map((entry) => {
                                                                    const ep = entry.value * 100;
                                                                    return (
                                                                        <div key={entry.label}>
                                                                            <div className="flex items-center justify-between mb-1">
                                                                                <span className="text-xs font-medium">{entry.label}</span>
                                                                                <span className={`text-xs font-mono font-semibold tabular-nums ${textColor(ep)}`}>{ep.toFixed(1)}%</span>
                                                                            </div>
                                                                            <Progress value={Math.min(ep, 100)} className={`h-1.5 ${barColor(ep)}`} />
                                                                        </div>
                                                                    );
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
                                                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate" title={key}>
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
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        {!isAIDetection && !isTextAI && type !== "pdf_analysis" && Array.isArray(results) && results.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold">Comparison Results</h3>
                                {results.map((r, idx) => {
                                    if (type === "code_batch" || type === "ast_comparison") {
                                        return <CodeCheckReport key={idx} data={r} index={idx} scoreScale={cfg.scoreScale} />
                                    }
                                    if (type === "text_minhash" || type === "min_hash") {
                                        return <MinHashReport key={idx} data={r} index={idx} scoreScale={cfg.scoreScale} />
                                    }
                                    return <SemanticReport key={idx} data={r} index={idx} scoreScale={cfg.scoreScale} />
                                })}
                            </div>
                        )}

                        {type === "pdf_analysis" && (
                            <div className="space-y-4 mt-6">
                                <h3 className="text-xl font-semibold">Comparison Results</h3>
                                <PDFReport results={results} />
                            </div>
                        )}

                        {!isAIDetection && !isTextAI && type !== "pdf_analysis" && (!Array.isArray(results) || results.length === 0) && (
                            <p className="text-muted-foreground">No matches found.</p>
                        )}
                    </motion.div>
                </div>
            </div>
        </>
    )
}

export default ReportViewPage