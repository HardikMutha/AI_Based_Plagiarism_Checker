import React, { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ImageIcon,
  Table2,
  Download,
  Trash2,
  Layers,
  ChevronRight,
  Globe,
  ExternalLink,
  Printer,
} from "lucide-react"
import JSZip from "jszip"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { PDFReport } from "@/components/reports/PDFReport"

function formatBytes(bytes) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

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

// ── Main Page ───────────────────────────────────────────────────
const PDFAnalysisPage = () => {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [activeTab, setActiveTab] = useState("images")
  const [downloading, setDownloading] = useState(false)
  const inputRef = useRef(null)

  // ── File handling ─────────────────────────────────────────────
  const addFiles = useCallback(
    (incoming) => {
      const pdfFiles = Array.from(incoming).filter(
        (f) => f.name.toLowerCase().endsWith(".pdf")
      )
      if (pdfFiles.length === 0) {
        toast.error("Only PDF files are supported.")
        return
      }
      const newFiles = pdfFiles.filter(
        (f) => !files.some((ex) => ex.name === f.name && ex.size === f.size)
      )
      if (newFiles.length === 0) {
        toast.info("These files are already in the list.")
        return
      }
      setFiles((prev) => [...prev, ...newFiles])
      setResults(null)
      setError(null)
    },
    [files]
  )

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setFiles([])
    setResults(null)
    setError(null)
    setProgress(0)
  }

  // ── Drag & drop ───────────────────────────────────────────────
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)
  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  // ── Upload logic ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (files.length < 2) {
      toast.error("Please add at least 2 PDF files for comparison.")
      return
    }

    setUploading(true)
    setProgress(0)
    setResults(null)
    setError(null)

    try {
      // Zip all PDFs together
      toast.info("Zipping PDFs…")
      const zip = new JSZip()
      for (const file of files) {
        const buf = await file.arrayBuffer()
        zip.file(file.name, buf)
      }
      const blob = await zip.generateAsync({ type: "blob" })

      const formData = new FormData()
      formData.append("file", blob, "pdfs.zip")

      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", "/api/pdf/compare")
        // Add Authorization header with JWT token
        const token = localStorage.getItem("token")
        if (token) {
          xhr.setRequestHeader("Authorization", "Bearer " + token)
        }

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            try {
              const err = JSON.parse(xhr.responseText)
              reject(new Error(err.error || `Server error ${xhr.status}`))
            } catch {
              reject(new Error(`Server error ${xhr.status}`))
            }
          }
        })

        xhr.addEventListener("error", () => reject(new Error("Network error")))
        xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))
        xhr.send(formData)
      })

      setResults(result)
      const totalMatches = (result.total_image_matches || 0) + (result.total_table_matches || 0)
      toast.success(`Scan complete  ${totalMatches} match${totalMatches !== 1 ? "es" : ""} found across ${result.total_files} PDFs.`)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!results || !results.report_id) {
      toast.error("Report ID not found")
      return
    }
    setDownloading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/reports/${results.report_id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error("Failed to download PDF")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `report-${results.report_id}.pdf`
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

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }
  const item = {
    hidden: { y: 16, opacity: 0 },
    show: { y: 0, opacity: 1 },
  }

  return (
    <>
      <style>{`
        @media print {
            body * { visibility: hidden; }
            #pdf-report-print-area, #pdf-report-print-area * { visibility: visible; }
            #pdf-report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
            .print-hidden { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col min-h-screen bg-transparent">
        <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0 shrink-0 print-hidden">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="p-2" />
            <h1 className="text-xl font-semibold hidden sm:block">PDF Analysis</h1>
          </div>
          {results && !uploading && results.report_id && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button onClick={handleDownloadPDF} className="gap-2" disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloading ? "Downloading…" : "Download PDF"}
              </Button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-6">

            <motion.div variants={item}>
              <h2 className="text-3xl font-bold tracking-tight">PDF Image & Table Comparison</h2>
              <p className="text-muted-foreground mt-1">
                Upload multiple PDFs — we'll detect copied, screenshotted, or identical images and tables across documents.
              </p>
            </motion.div>

            {/* ── Upload Area ─────────────────────────────────────── */}
            <motion.div variants={item}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">1. Upload PDFs (minimum 2)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    id="pdf-drop-zone"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed p-10 flex flex-col items-center justify-center gap-3 transition-all duration-200 ${dragOver
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40"
                      }`}
                  >
                    <motion.div
                      animate={dragOver ? { scale: 1.15, rotate: -5 } : { scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <div className="p-4 rounded-full bg-primary/10">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                    </motion.div>
                    <div className="text-center">
                      <p className="font-medium">{dragOver ? "Drop PDFs here" : "Click or drag PDF files here"}</p>
                      <p className="text-sm text-muted-foreground mt-1">Upload 2 or more PDFs to compare images and tables</p>
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => { if (e.target.files.length) addFiles(e.target.files); e.target.value = "" }}
                    />
                  </div>

                  {/* File list */}
                  <AnimatePresence>
                    {files.length > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">
                            {files.length} PDF{files.length !== 1 && "s"} selected
                            <span className="text-muted-foreground ml-2">({formatBytes(files.reduce((s, f) => s + f.size, 0))} total)</span>
                          </p>
                          <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive gap-1" onClick={(e) => { e.stopPropagation(); clearAll() }}>
                            <Trash2 className="h-3 w-3" /> Clear all
                          </Button>
                        </div>
                        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                          {files.map((file, idx) => (
                            <motion.div
                              key={`${file.name}-${file.size}`}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 12 }}
                              transition={{ delay: idx * 0.03 }}
                              className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 rounded-md bg-red-500/10">
                                  <FileText className="h-4 w-4 text-red-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{file.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
                                </div>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); removeFile(idx) }} className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all">
                                <X className="h-4 w-4 text-destructive" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Progress ────────────────────────────────────────── */}
            <AnimatePresence>
              {uploading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm font-medium">
                          {progress < 100 ? `Uploading… ${progress}%` : "Comparing images & tables across PDFs…"}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Submit ──────────────────────────────────────────── */}
            <motion.div variants={item} className="flex justify-end">
              <Button id="compare-pdfs-btn" size="lg" disabled={uploading || files.length < 2} onClick={handleSubmit} className="gap-2 px-8">
                {uploading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Comparing…</>) : (<>Compare PDFs <ArrowRight className="h-4 w-4" /></>)}
              </Button>
            </motion.div>

            {/* ── Error ───────────────────────────────────────────── */}
            <AnimatePresence>
              {error && !uploading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className="border-destructive/50">
                    <CardContent className="pt-6 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive">Comparison failed</p>
                        <p className="text-sm text-muted-foreground mt-1">{error}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Results ─────────────────────────────────────────── */}
            <AnimatePresence>
              {results && !uploading && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4" id="pdf-report-print-area" data-pdf-content>

                  <PDFReport results={results} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </>
  )
}



export default PDFAnalysisPage
