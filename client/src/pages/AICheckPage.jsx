import React, { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  FileCode,
  FileArchive,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ChevronRight,
  Info,
  Bot,
  User,
  Type,
  Trash2,
} from "lucide-react"
import JSZip from "jszip"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const SUPPORTED_EXTENSIONS = [".py", ".java", ".cpp", ".js", ".c", ".cs", ".zip"]

const LANGUAGE_OPTIONS = [
  { value: "python", label: "Python", ext: ".py" },
  { value: "java", label: "Java", ext: ".java" },
  { value: "cpp", label: "C++", ext: ".cpp" },
  { value: "javascript", label: "JavaScript", ext: ".js" },
  { value: "c", label: "C", ext: ".c" },
  { value: "csharp", label: "C#", ext: ".cs" },
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
  if (ext === "zip") return FileArchive
  return FileCode
}

// ── Main Page ───────────────────────────────────────────────────
const AICheckPage = () => {
  const [inputMode, setInputMode] = useState("file") // "file" | "editor"
  const [files, setFiles] = useState([])
  const [codeText, setCodeText] = useState("")
  const [language, setLanguage] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  // ── File handling (multi-file) ─────────────────────────────
  const addFiles = useCallback(
    (incoming) => {
      const newFiles = Array.from(incoming).filter((f) => {
        const ext = "." + f.name.split(".").pop().toLowerCase()
        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
          toast.error(`Unsupported: ${f.name}. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`)
          return false
        }
        return !files.some((existing) => existing.name === f.name && existing.size === f.size)
      })
      if (newFiles.length === 0) return
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
  }

  const switchMode = (mode) => {
    setInputMode(mode)
    setResults(null)
    setError(null)
  }

  const canSubmit = inputMode === "file"
    ? files.length > 0
    : codeText.trim().length > 0 && !!language

  // ── Drag & drop ─────────────────────────────────────────────
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)
  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) {
      if (inputMode === "editor" && !language) toast.error("Please select a language.")
      else toast.error("Please provide code to analyze.")
      return
    }

    setAnalyzing(true)
    setResults(null)
    setError(null)

    try {
      const formData = new FormData()

      if (inputMode === "file") {
        // Single zip? Send directly. Multiple files? Auto-zip.
        const isSingleZip =
          files.length === 1 && files[0].name.toLowerCase().endsWith(".zip")

        if (isSingleZip) {
          formData.append("file", files[0], files[0].name)
        } else if (files.length === 1) {
          formData.append("file", files[0], files[0].name)
        } else {
          toast.info("Zipping files…")
          const zip = new JSZip()
          for (const file of files) {
            const buf = await file.arrayBuffer()
            zip.file(file.name, buf)
          }
          const blob = await zip.generateAsync({ type: "blob" })
          formData.append("file", blob, "upload.zip")
        }
      } else {
        const langOpt = LANGUAGE_OPTIONS.find((l) => l.value === language)
        const filename = `input${langOpt?.ext || ".py"}`
        const blob = new Blob([codeText], { type: "text/plain" })
        formData.append("file", blob, filename)
      }

      const token = localStorage.getItem("token")
      const res = await fetch("/api/code/ai_detect", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Server error ${res.status}`)
      }

      setResults(data.results)
      toast.success(`Analysis complete  ${data.total_files} file${data.total_files !== 1 ? "s" : ""} analyzed.`)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Animations ──────────────────────────────────────────────
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }
  const item = {
    hidden: { y: 16, opacity: 0 },
    show: { y: 0, opacity: 1 },
  }

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      {/* Header */}
      <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="p-2" />
          <h1 className="text-xl font-semibold hidden sm:block">AI Code Detection</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-3xl mx-auto space-y-6"
        >
          {/* Title */}
          <motion.div variants={item}>
            <h2 className="text-3xl font-bold tracking-tight">AI Code Detector</h2>
            <p className="text-muted-foreground mt-1">
              Upload code files (or a .zip) to analyze whether they were generated by AI.
            </p>
          </motion.div>

          {/* Input Card */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Provide Code</CardTitle>
                <div className="flex gap-1 mt-2 p-1 bg-muted/50 rounded-lg w-fit">
                  <button
                    onClick={() => switchMode("file")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${inputMode === "file"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload Files
                  </button>
                  <button
                    onClick={() => switchMode("editor")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${inputMode === "editor"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <Type className="h-3.5 w-3.5" /> Paste Code
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {inputMode === "file" ? (
                  <div>
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
                        ${dragOver
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
                          {dragOver ? "Drop files here" : "Click or drag code files here"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Supports {SUPPORTED_EXTENSIONS.join(", ")}  multiple files will be zipped automatically
                        </p>
                      </div>
                      <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept={SUPPORTED_EXTENSIONS.join(",")}
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files.length) addFiles(e.target.files)
                          e.target.value = ""
                        }}
                      />
                    </div>

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
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full md:w-56">
                        <SelectValue placeholder="Select language…" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <textarea
                      value={codeText}
                      onChange={(e) => setCodeText(e.target.value)}
                      placeholder="Paste your code here…"
                      spellCheck={false}
                      className="w-full h-64 p-4 rounded-lg border bg-muted/30 font-mono text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
                    />
                    {codeText.trim() && (
                      <p className="text-[11px] text-muted-foreground">
                        {codeText.split("\n").length} lines · {codeText.length} characters
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Analyze Button */}
          <motion.div variants={item} className="flex justify-end">
            <Button
              id="analyze-btn"
              size="lg"
              disabled={analyzing || !canSubmit}
              onClick={handleSubmit}
              className="gap-2 px-8"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  Analyze Code
                  <ShieldCheck className="h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && !analyzing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-destructive/50">
                  <CardContent className="pt-6 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Analysis failed</p>
                      <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {results && !analyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {results.map((r, idx) => (
                  <div key={idx} className="space-y-4">
                    {results.length > 1 && (
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        File {idx + 1} of {results.length}: <span className="text-foreground font-semibold">{r.file_name?.split("/").pop()}</span>
                      </h3>
                    )}
                    <ResultsPanel result={r} />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Conclusion generator ───────────────────────────────────────
function generateConclusions(result) {
  const s = result.signals || {}
  const prob = result.ai_probability
  const conclusions = []

  // Helper: add a conclusion with severity
  const add = (severity, text) => conclusions.push({ severity, text })

  // ── Structural conclusions ──────────────────────────────────
  if (s.depth_uniformity >= 0.7 && s.subtree_symmetry >= 0.6) {
    add("high", "The code's AST is unusually uniform  function bodies, conditional branches, and loops are all structured at similar depths with symmetric subtrees. This level of structural regularity is a strong indicator of machine-generated code.")
  } else if (s.depth_uniformity >= 0.6) {
    add("medium", "The AST depth uniformity is moderately high, suggesting the code might follow rigid templates. Human code typically shows more varied nesting patterns.")
  }

  if (s.func_size_uniformity >= 0.7) {
    add("high", "All functions in this file are suspiciously close in size  a hallmark of AI generators that produce cookie-cutter function bodies with consistent structure.")
  } else if (s.func_size_uniformity >= 0.5) {
    add("medium", "Functions are fairly uniform in size. While not conclusive, this pattern is more common in AI-generated code than in hand-written code where function complexity naturally varies.")
  }

  if (s.pattern_repetition >= 0.6) {
    add("high", "A significant portion of the AST subtrees repeat the exact same structural shape. This mechanical repetition is characteristic of AI models that reuse learned code patterns.")
  }

  if (s.error_handling_density >= 0.6) {
    add("medium", "The code contains disproportionately heavy error-handling scaffolding (try/catch/throw). AI assistants tend to over-engineer error handling even when not strictly necessary.")
  }

  if (s.guard_clause_ratio >= 0.7) {
    add("medium", "Most functions begin with guard clauses (early return on invalid input). While a good practice, AI models apply this pattern systematically to nearly every function, unlike typical human code.")
  }

  if (s.branching_consistency >= 0.75) {
    add("low", "Branching factors are highly consistent across all depths of the code, which can indicate templated generation.")
  }

  // ── Textual conclusions ─────────────────────────────────────
  if (s.comment_pattern >= 0.6) {
    add("high", "Comments match typical AI phrasing patterns  expressions like \"this function\", \"helper method\", \"handle the error\", and \"return the result\" appear frequently. These formulaic comments are a strong textual indicator.")
  } else if (s.comment_pattern >= 0.4) {
    add("medium", "Some comments use phrasing commonly associated with AI assistants, though not enough to be conclusive on their own.")
  }

  if (s.naming_convention >= 0.7) {
    add("high", "Variable and function names are uniformly descriptive and follow a rigid naming convention. AI generators tend to produce consistently verbose, well-structured identifiers, whereas humans typically mix short and long names.")
  }

  if (s.docstring_density >= 0.7) {
    add("medium", "Nearly every function has a docstring/javadoc comment. While good practice, AI models do this systematically, even for trivially obvious functions.")
  }

  if (s.import_style >= 0.7) {
    add("medium", "Imports are perfectly organized  alphabetized, grouped by category, with clean separation. This level of import hygiene is typical of AI-generated Python code.")
  }

  if (s.line_length_uniformity >= 0.7) {
    add("medium", "Line lengths are remarkably consistent, suggesting the code was formatted to a strict column width by an AI. Human-written code usually has more variation in line lengths.")
  }

  if (s.code_to_logic_ratio >= 0.6) {
    add("low", "The ratio of boilerplate (comments, docstrings, imports, blanks) to actual logic is in the range typically seen in AI output, where structure and documentation often outweigh core logic.")
  }

  if (s.variable_name_entropy >= 0.65) {
    add("low", "Variable names show low lexical entropy  the same word components (e.g. \"data\", \"result\", \"value\") are reused throughout, which is a subtle pattern in AI-generated code.")
  }

  if (s.f_string_consistency >= 0.7) {
    add("low", "All string formatting uses a single style consistently. AI generators pick one approach and apply it everywhere, whereas humans often mix f-strings, .format(), and concatenation.")
  }

  if (s.emoji_usage >= 0.5) {
    add("high", "The code contains emoji characters in comments or strings  a notable AI signature, especially from conversational AI assistants.")
  }

  if (s.em_dash_usage >= 0.5) {
    add("high", "Em-dashes () were found in comments or strings. This Unicode punctuation is extremely common in AI-generated text but rare in human-written code.")
  }

  // ── Overall summary ─────────────────────────────────────────
  const highCount = conclusions.filter(c => c.severity === "high").length
  const medCount = conclusions.filter(c => c.severity === "medium").length

  let summary = ""
  if (prob >= 0.7) {
    summary = `This code exhibits ${highCount} strong and ${medCount} moderate AI indicators across both structural and textual analysis. The combination of these signals strongly suggests the code was generated by an AI assistant.`
  } else if (prob >= 0.4) {
    summary = `The analysis detected ${highCount + medCount} notable signals. While some patterns align with AI generation, the evidence is not conclusive  the code may be human-written with some AI assistance, or written by a developer following strict coding conventions.`
  } else {
    if (conclusions.length === 0) {
      summary = "No significant AI generation indicators were detected. The code structure, naming patterns, and comment style are all consistent with human-authored code."
    } else {
      summary = `Only minor signals were detected. The code predominantly exhibits characteristics of human-written code, with natural variation in structure and style.`
    }
  }

  return { conclusions, summary }
}

// ─── Severity styles for conclusion items ───────────────────────
const CONCLUSION_STYLES = {
  high: {
    icon: AlertTriangle,
    dot: "bg-red-500",
    text: "text-foreground",
    border: "border-red-500/20",
    bg: "bg-red-500/[0.04] dark:bg-red-500/[0.06]",
    label: "Strong signal",
    labelColor: "text-red-600 dark:text-red-400",
  },
  medium: {
    icon: Info,
    dot: "bg-amber-500",
    text: "text-foreground",
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]",
    label: "Moderate signal",
    labelColor: "text-amber-600 dark:text-amber-400",
  },
  low: {
    icon: Info,
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    border: "border-border/50",
    bg: "",
    label: "Minor signal",
    labelColor: "text-muted-foreground",
  },
}

// ─── Results Panel ──────────────────────────────────────────────
function ResultsPanel({ result }) {
  const prob = (result.ai_probability * 100)
  const probStr = prob.toFixed(1)

  const isLikelyAI = prob >= 70
  const isPossiblyAI = prob >= 40

  const VerdictIcon = isLikelyAI ? ShieldAlert : isPossiblyAI ? ShieldQuestion : ShieldCheck
  const verdictColor = isLikelyAI
    ? "text-red-600 dark:text-red-400"
    : isPossiblyAI
      ? "text-amber-600 dark:text-amber-400"
      : "text-green-600 dark:text-green-400"
  const barColor = isLikelyAI
    ? "[&>div]:bg-red-500"
    : isPossiblyAI
      ? "[&>div]:bg-amber-500"
      : "[&>div]:bg-green-500"
  const ringColor = isLikelyAI
    ? "border-red-500/40"
    : isPossiblyAI
      ? "border-amber-500/40"
      : "border-green-500/40"

  // Group signals
  const signalDetails = result.signal_details || {}
  const structural = Object.entries(signalDetails).filter(([, d]) => d.group === "structural")
  const textual = Object.entries(signalDetails).filter(([, d]) => d.group === "textual")

  // Generate conclusions
  const { conclusions, summary } = generateConclusions(result)

  return (
    <>
      {/* Main verdict card */}
      <Card className={`overflow-hidden ${ringColor}`}>
        <CardContent className="pt-6 pb-5">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Probability gauge */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className={`relative w-28 h-28 rounded-full border-4 flex items-center justify-center ${ringColor}`}>
                <div className="text-center">
                  <span className={`text-3xl font-bold font-mono tabular-nums ${verdictColor}`}>
                    {probStr}
                  </span>
                  <span className="text-xs text-muted-foreground block -mt-0.5">% AI</span>
                </div>
              </div>
            </div>

            {/* Verdict info */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <VerdictIcon className={`h-5 w-5 shrink-0 ${verdictColor}`} />
                <h3 className={`text-lg font-bold ${verdictColor}`}>{result.verdict}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {result.file_name?.split("/").pop() || "Unknown"}{" "}
                <Badge variant="outline" className="text-[10px] font-mono ml-1 px-1.5 py-0">{result.language}</Badge>
              </p>
              <div className="w-full max-w-sm mx-auto sm:mx-0">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> Human</span>
                  <span className="flex items-center gap-1">AI <Bot className="h-3 w-3" /></span>
                </div>
                <Progress value={prob} className={`h-2.5 ${barColor}`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conclusions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Analysis Conclusions</CardTitle>
          <CardDescription className="text-xs">Insights generated from 18 structural and textual signals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary paragraph */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
            <p className="text-sm leading-relaxed">{summary}</p>
          </div>

          {/* Individual conclusions */}
          {conclusions.length > 0 && (
            <div className="space-y-2">
              {conclusions.map((c, i) => {
                const style = CONCLUSION_STYLES[c.severity]
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

      {/* Signal Breakdown (collapsible) */}
      <Card>
        <details className="group">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-1.5">
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                <CardTitle className="text-sm">Signal Breakdown</CardTitle>
              </div>
              <CardDescription className="text-xs ml-5.5">Click to view all 18 individual signal scores</CardDescription>
            </CardHeader>
          </summary>
          <CardContent className="space-y-5 pt-0">
            {structural.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Structural (AST-based)
                </p>
                <div className="space-y-2.5">
                  {structural.map(([key, detail]) => (
                    <SignalBar key={key} detail={detail} />
                  ))}
                </div>
              </div>
            )}
            {textual.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Textual (Source-level)
                </p>
                <div className="space-y-2.5">
                  {textual.map(([key, detail]) => (
                    <SignalBar key={key} detail={detail} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </details>
      </Card>
    </>
  )
}

// ─── Signal Bar ─────────────────────────────────────────────────
function SignalBar({ detail }) {
  const pct = (detail.value * 100)
  const isHigh = pct >= 65
  const isMed = pct >= 40

  const barColor = isHigh
    ? "[&>div]:bg-red-500"
    : isMed
      ? "[&>div]:bg-amber-500"
      : "[&>div]:bg-green-500"

  const textColor = isHigh
    ? "text-red-600 dark:text-red-400"
    : isMed
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground"

  return (
    <div className="group" title={detail.tip}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium truncate pr-2">{detail.label}</span>
        <span className={`text-xs font-mono font-semibold tabular-nums ${textColor}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <Progress value={Math.min(pct, 100)} className={`h-1.5 ${barColor}`} />
    </div>
  )
}

export default AICheckPage
