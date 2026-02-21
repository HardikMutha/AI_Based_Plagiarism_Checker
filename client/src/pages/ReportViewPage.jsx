import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, AlertTriangle, FileCode, FileText, Sparkles, Bot, Files, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
}
const FALLBACK_CONFIG = { label: "Report", icon: Files, scoreScale: 100 }

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

    const handlePrint = () => window.print()

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
                        <Button variant="outline" onClick={handlePrint} className="gap-2">
                            <Printer className="h-4 w-4" />
                            <span className="hidden sm:inline">Print</span>
                        </Button>
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
                                {!isAIDetection && (
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

                        {!isAIDetection && type !== "pdf_analysis" && Array.isArray(results) && results.length > 0 && (
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

                        {!isAIDetection && type !== "pdf_analysis" && (!Array.isArray(results) || results.length === 0) && (
                            <p className="text-muted-foreground">No matches found.</p>
                        )}
                    </motion.div>
                </div>
            </div>
        </>
    )
}

export default ReportViewPage