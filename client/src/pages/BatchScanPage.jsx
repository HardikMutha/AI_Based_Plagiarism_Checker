import React, { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  FileArchive,
  FileCode,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Info,
  Trash2,
  Type,
} from "lucide-react"
import JSZip from "jszip"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarTrigger } from "@/components/ui/sidebar"

// ── Route config ────────────────────────────────────────────────
const SCAN_OPTIONS = [
  {
    value: "code_batch",
    label: "Code Plagiarism",
    description: "AST-based structural comparison for source code",
    route: "/api/code/batch_compare",
    icon: FileCode,
    color: "text-violet-500",
    extensions: ".py, .java, .cpp, .js, .c, .cs",
    scoreScale: 100, // score comes as 0–100
  },
  {
    value: "text_minhash",
    label: "Text — MinHash",
    description: "Fast approximate duplicate detection using MinHash signatures",
    route: "/api/text/minhash",
    icon: FileText,
    color: "text-sky-500",
    extensions: ".txt, .pdf, .docx, .doc, .odt",
    scoreScale: 1, // score comes as 0–1
  },
  {
    value: "text_semantic",
    label: "Text — Semantic",
    description: "Deep learning-based semantic similarity comparison",
    route: "/api/text/semantic_similarity",
    icon: Sparkles,
    color: "text-amber-500",
    extensions: ".txt, .pdf, .docx, .doc, .odt",
    scoreScale: 1, // score comes as 0–1
  },
]

function formatBytes(bytes) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function getFileIcon(name) {
  const ext = name.split(".").pop().toLowerCase()
  const codeExts = ["py", "java", "cpp", "js", "c", "cs", "jsx", "ts", "tsx"]
  if (ext === "zip") return FileArchive
  if (codeExts.includes(ext)) return FileCode
  return FileText
}

/** Normalize score to 0–100 percentage */
function normalizeScore(score, scale) {
  if (score == null) return null
  return scale === 1 ? (score * 100) : score
}

function getSeverity(pct) {
  if (pct == null) return "low"
  if (pct >= 60) return "high"
  if (pct >= 40) return "moderate"
  return "low"
}

const SEVERITY_STYLES = {
  high: {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/8",
    border: "border-red-500/25",
    bar: "[&>div]:bg-red-500",
    badge: "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/8",
  },
  moderate: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-amber-500/25",
    bar: "[&>div]:bg-amber-500",
    badge: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/8",
  },
  low: {
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/8",
    border: "border-green-500/25",
    bar: "[&>div]:bg-green-500",
    badge: "border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/8",
  },
}

const CODE_LANG_OPTIONS = [
  { value: "py", label: "Python", ext: ".py" },
  { value: "java", label: "Java", ext: ".java" },
  { value: "cpp", label: "C++", ext: ".cpp" },
  { value: "js", label: "JavaScript", ext: ".js" },
  { value: "c", label: "C", ext: ".c" },
  { value: "cs", label: "C#", ext: ".cs" },
]

// ── Main Page ───────────────────────────────────────────────────
const BatchScanPage = () => {
  const [inputMode, setInputMode] = useState("file") // "file" | "editor"
  // File mode
  const [files, setFiles] = useState([])
  // Editor mode
  const [codeA, setCodeA] = useState("")
  const [codeB, setCodeB] = useState("")
  const [langA, setLangA] = useState("")
  const [langB, setLangB] = useState("")

  const [scanType, setScanType] = useState("")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const selectedOption = SCAN_OPTIONS.find((o) => o.value === scanType)

  // ── File handling ─────────────────────────────────────────────
  const addFiles = useCallback(
    (incoming) => {
      const newFiles = Array.from(incoming).filter(
        (f) => !files.some((existing) => existing.name === f.name && existing.size === f.size)
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
  const onDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }
  const onDragLeave = () => setDragOver(false)
  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  // ── Upload logic ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!scanType) {
      toast.error("Please select a scan type first.")
      return
    }
    if (inputMode === "file" && files.length === 0) {
      toast.error("Please add at least one file.")
      return
    }
    if (inputMode === "editor" && (!codeA.trim() || !codeB.trim())) {
      toast.error("Please paste code in both text areas.")
      return
    }
    if (inputMode === "editor" && scanType === "code_batch" && (!langA || !langB)) {
      toast.error("Please select a language for each code snippet.")
      return
    }

    setUploading(true)
    setProgress(0)
    setResults(null)
    setError(null)

    try {
      let blob

      if (inputMode === "editor") {
        // Create two files from pasted text and zip them
        const zip = new JSZip()
        if (scanType === "code_batch") {
          const optA = CODE_LANG_OPTIONS.find((l) => l.value === langA)
          const optB = CODE_LANG_OPTIONS.find((l) => l.value === langB)
          zip.file(`file_a${optA?.ext || ".py"}`, codeA)
          zip.file(`file_b${optB?.ext || ".py"}`, codeB)
        } else {
          zip.file("text_a.txt", codeA)
          zip.file("text_b.txt", codeB)
        }
        blob = await zip.generateAsync({ type: "blob" })
      } else {
        const isSingleZip =
          files.length === 1 && files[0].name.toLowerCase().endsWith(".zip")

        if (isSingleZip) {
          blob = files[0]
        } else {
          toast.info("Zipping files…")
          const zip = new JSZip()
          for (const file of files) {
            const buf = await file.arrayBuffer()
            zip.file(file.name, buf)
          }
          blob = await zip.generateAsync({ type: "blob" })
        }
      }

      const formData = new FormData()
      formData.append("file", blob, "upload.zip")

      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", selectedOption.route)

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
      toast.success(`Scan complete — ${result.total_comparisons} comparisons made.`)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  // ── Animations ────────────────────────────────────────────────
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }
  const item = {
    hidden: { y: 16, opacity: 0 },
    show: { y: 0, opacity: 1 },
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      {/* Header */}
      <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="p-2" />
          <h1 className="text-xl font-semibold hidden sm:block">Batch Scan</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-4xl mx-auto space-y-6"
        >
          {/* Title */}
          <motion.div variants={item}>
            <h2 className="text-3xl font-bold tracking-tight">Batch Plagiarism Scan</h2>
            <p className="text-muted-foreground mt-1">
              Upload multiple files or a zip archive — we'll handle the rest.
            </p>
          </motion.div>

          {/* ── Step 1: Scan Type ─────────────────────────────────── */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">1. Choose scan type</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={scanType} onValueChange={setScanType}>
                  <SelectTrigger className="w-full md:w-96" id="scan-type-select">
                    <SelectValue placeholder="Select a scan method…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCAN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.icon className={`h-4 w-4 ${opt.color}`} />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedOption && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p>{selectedOption.description}</p>
                      <p className="mt-1">
                        <span className="font-medium text-foreground">Accepted: </span>
                        {selectedOption.extensions}
                      </p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Step 2: Upload / Paste ─────────────────────────────── */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">2. Provide content</CardTitle>
                <div className="flex gap-1 mt-2 p-1 bg-muted/50 rounded-lg w-fit">
                  <button
                    onClick={() => { setInputMode("file"); setResults(null); setError(null) }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      inputMode === "file"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload Files
                  </button>
                  <button
                    onClick={() => { setInputMode("editor"); setResults(null); setError(null) }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      inputMode === "editor"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Type className="h-3.5 w-3.5" /> Paste Text
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {inputMode === "file" ? (
                  <>
                    <div
                      id="file-drop-zone"
                      onClick={() => inputRef.current?.click()}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      className={`
                        relative cursor-pointer rounded-xl border-2 border-dashed p-10
                        flex flex-col items-center justify-center gap-3
                        transition-all duration-200
                        ${
                          dragOver
                            ? "border-primary bg-primary/5 scale-[1.01]"
                            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40"
                        }
                      `}
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
                        <p className="font-medium">
                          {dragOver ? "Drop files here" : "Click or drag files here"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Supports any file type — multiple files will be zipped automatically
                        </p>
                      </div>
                      <input
                        ref={inputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files.length) addFiles(e.target.files)
                          e.target.value = ""
                        }}
                      />
                    </div>

                    {/* File list */}
                    <AnimatePresence>
                      {files.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-2"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">
                              {files.length} file{files.length !== 1 && "s"} selected
                              <span className="text-muted-foreground ml-2">
                                ({formatBytes(files.reduce((s, f) => s + f.size, 0))} total)
                              </span>
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-destructive hover:text-destructive gap-1"
                              onClick={(e) => { e.stopPropagation(); clearAll() }}
                            >
                              <Trash2 className="h-3 w-3" />
                              Clear all
                            </Button>
                          </div>

                          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                            {files.map((file, idx) => {
                              const Icon = getFileIcon(file.name)
                              return (
                                <motion.div
                                  key={`${file.name}-${file.size}`}
                                  initial={{ opacity: 0, x: -12 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 12 }}
                                  transition={{ delay: idx * 0.03 }}
                                  className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-1.5 rounded-md bg-muted">
                                      <Icon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{file.name}</p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {formatBytes(file.size)}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeFile(idx) }}
                                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </button>
                                </motion.div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-muted-foreground">Text A</label>
                          {scanType === "code_batch" && (
                            <Select value={langA} onValueChange={setLangA}>
                              <SelectTrigger className="w-36 h-7 text-xs">
                                <SelectValue placeholder="Language…" />
                              </SelectTrigger>
                              <SelectContent>
                                {CODE_LANG_OPTIONS.map((lang) => (
                                  <SelectItem key={lang.value} value={lang.value}>
                                    {lang.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <textarea
                          value={codeA}
                          onChange={(e) => setCodeA(e.target.value)}
                          placeholder="Paste first text/code here…"
                          spellCheck={false}
                          className="w-full h-52 p-3 rounded-lg border bg-muted/30 font-mono text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
                        />
                        {codeA.trim() && (
                          <p className="text-[10px] text-muted-foreground">
                            {codeA.split("\n").length} lines · {codeA.length} chars
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-muted-foreground">Text B</label>
                          {scanType === "code_batch" && (
                            <Select value={langB} onValueChange={setLangB}>
                              <SelectTrigger className="w-36 h-7 text-xs">
                                <SelectValue placeholder="Language…" />
                              </SelectTrigger>
                              <SelectContent>
                                {CODE_LANG_OPTIONS.map((lang) => (
                                  <SelectItem key={lang.value} value={lang.value}>
                                    {lang.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <textarea
                          value={codeB}
                          onChange={(e) => setCodeB(e.target.value)}
                          placeholder="Paste second text/code here…"
                          spellCheck={false}
                          className="w-full h-52 p-3 rounded-lg border bg-muted/30 font-mono text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
                        />
                        {codeB.trim() && (
                          <p className="text-[10px] text-muted-foreground">
                            {codeB.split("\n").length} lines · {codeB.length} chars
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Upload Progress ───────────────────────────────────── */}
          <AnimatePresence>
            {uploading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm font-medium">
                        {progress < 100
                          ? `Uploading… ${progress}%`
                          : "Processing on server…"}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Submit ────────────────────────────────────────────── */}
          <motion.div variants={item} className="flex justify-end">
            <Button
              id="start-scan-btn"
              size="lg"
              disabled={uploading || !scanType || (inputMode === "file" ? files.length === 0 : (!codeA.trim() || !codeB.trim()))}
              onClick={handleSubmit}
              className="gap-2 px-8"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning…
                </>
              ) : (
                <>
                  Start Scan
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>

          {/* ── Error Panel ───────────────────────────────────────── */}
          <AnimatePresence>
            {error && !uploading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-destructive/50">
                  <CardContent className="pt-6 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Scan failed</p>
                      <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Results ──────────────────────────────────────────── */}
          <AnimatePresence>
            {results && !uploading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Summary */}
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                        <div>
                          <p className="font-semibold">Scan Complete</p>
                          <p className="text-sm text-muted-foreground">
                            {results.total_files} files analyzed, {results.total_comparisons} pairwise comparisons
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {selectedOption?.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Comparison cards */}
                {results.results && results.results.length > 0 ? (
                  <div className="space-y-3">
                    {results.results.map((r, idx) => (
                      <ComparisonCard
                        key={idx}
                        data={r}
                        index={idx}
                        scoreScale={selectedOption?.scoreScale ?? 100}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No matches found</p>
                      <p className="text-sm mt-1">All files appear to be original.</p>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Comparison Card ────────────────────────────────────────────
function ComparisonCard({ data: r, index, scoreScale }) {
  const fileA = (r.file_a || r.file1 || "").split("/").pop() || "File A"
  const fileB = (r.file_b || r.file2 || "").split("/").pop() || "File B"

  const rawScore = r.overall_score ?? r.similarity_score ?? r.overall_similarity ?? r.similarity ?? r.jaccard_similarity ?? null
  const pct = rawScore != null ? normalizeScore(rawScore, scoreScale) : null
  const pctStr = pct != null ? pct.toFixed(1) : null

  const severity = getSeverity(pct)
  const styles = SEVERITY_STYLES[severity]

  const verdict = r.verdict || (severity === "high" ? "HIGH SIMILARITY" : severity === "moderate" ? "MODERATE SIMILARITY" : "LOW SIMILARITY")

  const similarLines = r.similar_lines || []
  const similarChunks = r.similar_chunks || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
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

          {/* Side-by-side diff: Similar Lines (code) */}
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
                          <span className={`text-[10px] font-mono font-semibold ${
                            isHighMatch ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
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

export default BatchScanPage
