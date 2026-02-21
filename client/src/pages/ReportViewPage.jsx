import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, AlertTriangle, FileCode, FileText, Sparkles, Bot, Files, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { ComparisonCard } from "@/components/ComparisonCard"

const TYPE_CONFIG = {
    ast_comparison: { label: "Code — AST", icon: FileCode, scoreScale: 100 },
    min_hash: { label: "Text — MinHash", icon: FileText, scoreScale: 1 },
    semantic_similarity: { label: "Text — Semantic", icon: Sparkles, scoreScale: 1 },
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
                const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/reports/${id}`, {
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
            const res = await fetch(import.meta.env.VITE_SERVER_URL + `/api/reports/${id}/pdf`, {
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
                            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span><svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1v10M8 11l3-3M8 11l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="13" width="10" height="2" rx="1" fill="currentColor"/></svg></span>}
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

                        {isAIDetection && results && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold">Detection Results</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-3 text-sm">
                                        <div className="flex flex-wrap gap-x-8 gap-y-3">
                                            <div>
                                                <p className="text-muted-foreground mb-0.5">File</p>
                                                <p className="font-medium font-mono text-xs break-all">{results.file_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground mb-0.5">Language</p>
                                                <p className="font-medium">{results.language}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground mb-0.5">Verdict</p>
                                                <p className={`font-bold ${results.ai_probability >= 0.7 ? "text-red-600" : results.ai_probability >= 0.4 ? "text-amber-600" : "text-green-600"}`}>
                                                    {results.verdict}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground mb-0.5">AI Probability</p>
                                                <p className={`font-bold text-lg font-mono ${results.ai_probability >= 0.7 ? "text-red-600" : results.ai_probability >= 0.4 ? "text-amber-600" : "text-green-600"}`}>
                                                    {(results.ai_probability * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${results.ai_probability >= 0.7 ? "bg-red-500" : results.ai_probability >= 0.4 ? "bg-amber-500" : "bg-green-500"}`}
                                                    style={{ width: `${(results.ai_probability * 100).toFixed(1)}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                                <span>Human-written</span>
                                                <span>AI-generated</span>
                                            </div>
                                        </div>

                                        {results.explanations?.length > 0 && (
                                            <div className="pt-2">
                                                <p className="font-semibold mb-2">Analysis Notes</p>
                                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                                    {results.explanations.map((exp, i) => <li key={i}>{exp}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        {results.signal_details && (
                                            <div className="pt-2">
                                                <p className="font-semibold mb-3">Signal Breakdown</p>
                                                <div className="space-y-2">
                                                    {Object.entries(results.signal_details).map(([key, s]) => {
                                                        const pct = Math.min(s.value * 100, 100)
                                                        return (
                                                            <div key={key} className="flex items-center gap-3">
                                                                <span className="text-xs text-muted-foreground w-48 shrink-0 truncate" title={s.tip}>{s.label || key}</span>
                                                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-amber-500" : "bg-green-500"}`}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-mono w-10 text-right tabular-nums">{pct.toFixed(0)}%</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {!isAIDetection && Array.isArray(results) && results.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold">Comparison Results</h3>
                                {results.map((r, idx) => (
                                    <ComparisonCard key={idx} data={r} index={idx} scoreScale={cfg.scoreScale} />
                                ))}
                            </div>
                        )}

                        {!isAIDetection && (!Array.isArray(results) || results.length === 0) && (
                            <p className="text-muted-foreground">No matches found.</p>
                        )}
                    </motion.div>
                </div>
            </div>
        </>
    )
}

export default ReportViewPage