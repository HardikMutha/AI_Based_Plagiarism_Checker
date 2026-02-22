import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileCode,
  FileText,
  X,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Info,
  Type,
  Trash2,
} from "lucide-react";
import JSZip from "jszip";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DETECTION_TYPES,
  LANGUAGE_OPTIONS,
  formatBytes,
  getFileIcon,
} from "@/components/ai-check/constants";
import CodeResultsPanel from "@/components/ai-check/CodeResultsPanel";
import TextResultsPanel from "@/components/ai-check/TextResultsPanel";

<<<<<<< HEAD
const LANGUAGE_OPTIONS = [
  { value: "python", label: "Python", ext: ".py" },
  { value: "java", label: "Java", ext: ".java" },
  { value: "cpp", label: "C++", ext: ".cpp" },
  { value: "c", label: "C", ext: ".c" }
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
=======
// ── Main Page ────────────────────────────────────────────────────
>>>>>>> 2ae9a99b65f0197a8efcc8e0b418314dee369655
const AICheckPage = () => {
  const [detectionType, setDetectionType] = useState("");
  const [inputMode, setInputMode] = useState("file");
  const [files, setFiles] = useState([]);
  const [pasteText, setPasteText] = useState("");
  const [language, setLanguage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [resultType, setResultType] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const selectedType = DETECTION_TYPES.find((t) => t.value === detectionType);

  const changeDetectionType = (type) => {
    setDetectionType(type);
    setFiles([]);
    setPasteText("");
    setLanguage("");
    setResults(null);
    setResultType(null);
    setError(null);
  };

  // ── File handling ──────────────────────────────────────────────
  const addFiles = useCallback(
    (incoming) => {
      if (!selectedType) {
        toast.error("Please select a detection type first.");
        return;
      }
      const newFiles = Array.from(incoming).filter((f) => {
        const ext = "." + f.name.split(".").pop().toLowerCase();
        if (!selectedType.extensions.includes(ext)) {
          toast.error(
            `Unsupported: ${f.name}. Supported: ${selectedType.extensionsLabel}, .zip`,
          );
          return false;
        }
        return !files.some(
          (existing) => existing.name === f.name && existing.size === f.size,
        );
      });
      if (newFiles.length === 0) return;
      setFiles((prev) => [...prev, ...newFiles]);
      setResults(null);
      setError(null);
    },
    [files, selectedType],
  );

  const removeFile = (index) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const clearAll = () => {
    setFiles([]);
    setResults(null);
    setError(null);
  };

  const switchMode = (mode) => {
    setInputMode(mode);
    setResults(null);
    setError(null);
  };

  const canSubmit =
    !!detectionType &&
    (inputMode === "file"
      ? files.length > 0
      : pasteText.trim().length > 0 &&
        (detectionType === "text" || !!language));

  // ── Drag & drop ────────────────────────────────────────────────
  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!detectionType) toast.error("Please select a detection type.");
      else if (inputMode === "editor" && detectionType === "code" && !language)
        toast.error("Please select a language.");
      else toast.error("Please provide content to analyze.");
      return;
    }

    setAnalyzing(true);
    setResults(null);
    setResultType(null);
    setError(null);

    try {
      const formData = new FormData();
      let endpoint;

      if (detectionType === "code") {
        if (inputMode === "file") {
          const isSingleZip =
            files.length === 1 && files[0].name.toLowerCase().endsWith(".zip");
          if (isSingleZip || files.length === 1) {
            formData.append("file", files[0], files[0].name);
          } else {
            toast.info("Zipping files…");
            const zip = new JSZip();
            for (const file of files) {
              const buf = await file.arrayBuffer();
              zip.file(file.name, buf);
            }
            const blob = await zip.generateAsync({ type: "blob" });
            formData.append("file", blob, "upload.zip");
          }
        } else {
          const langOpt = LANGUAGE_OPTIONS.find((l) => l.value === language);
          const filename = `input${langOpt?.ext || ".py"}`;
          formData.append(
            "file",
            new Blob([pasteText], { type: "text/plain" }),
            filename,
          );
        }
        endpoint = "/api/code/ai_detect";
      } else {
        const isSingleNonZip =
          inputMode === "editor" ||
          (files.length === 1 && !files[0].name.toLowerCase().endsWith(".zip"));

        if (isSingleNonZip) {
          if (inputMode === "editor") {
            formData.append(
              "file",
              new Blob([pasteText], { type: "text/plain" }),
              "input.txt",
            );
          } else {
            formData.append("file", files[0], files[0].name);
          }
          endpoint = "/api/ai-text/predict";
        } else {
          if (
            files.length === 1 &&
            files[0].name.toLowerCase().endsWith(".zip")
          ) {
            formData.append("file", files[0], files[0].name);
          } else {
            toast.info("Zipping files…");
            const zip = new JSZip();
            for (const file of files) {
              const buf = await file.arrayBuffer();
              zip.file(file.name, buf);
            }
            const blob = await zip.generateAsync({ type: "blob" });
            formData.append("file", blob, "upload.zip");
          }
          endpoint = "/api/ai-text/batch-process/";
        }
      }

      const token = localStorage.getItem("token");
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      if (detectionType === "code") {
        setResults(data.results);
        setResultType("code");
        toast.success(
          `Analysis complete — ${data.total_files} file${data.total_files !== 1 ? "s" : ""} analyzed.`,
        );
      } else {
        const wrapper = data.result || [];
        let normalized;
        if (wrapper[0]?.results) {
          normalized = wrapper[0].results;
        } else {
          normalized = wrapper.map((r, i) => ({
            ...r,
            filename: r.filename || files[i]?.name || "input.txt",
          }));
        }
        setResults(normalized);
        setResultType("text");
        toast.success(
          `Analysis complete — ${normalized.length} file${normalized.length !== 1 ? "s" : ""} analyzed.`,
        );
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { y: 16, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="p-2" />
          <h1 className="text-xl font-semibold hidden sm:block">
            AI Detection
          </h1>
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
            <h2 className="text-3xl font-bold tracking-tight">
              AI-Generated Content Detector
            </h2>
            <p className="text-muted-foreground mt-1">
              Detect AI-generated code or text using multi-layer analysis
              pipelines.
            </p>
          </motion.div>

          {/* Step 1: Detection Type */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  1. Choose detection type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={detectionType}
                  onValueChange={changeDetectionType}
                >
                  <SelectTrigger
                    className="w-full md:w-96"
                    id="detection-type-select"
                  >
                    <SelectValue placeholder="Select detection type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {DETECTION_TYPES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.icon className={`h-4 w-4 ${opt.color}`} />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedType && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p>{selectedType.description}</p>
                      <p className="mt-1">
                        <span className="font-medium text-foreground">
                          Accepted:{" "}
                        </span>
                        {selectedType.extensionsLabel}
                      </p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 2: Input */}
          <AnimatePresence>
            {selectedType && (
              <motion.div
                variants={item}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      2. Provide content
                    </CardTitle>
                    <div className="flex gap-1 mt-2 p-1 bg-muted/50 rounded-lg w-fit">
                      <button
                        onClick={() => switchMode("file")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                          inputMode === "file"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Upload className="h-3.5 w-3.5" /> Upload Files
                      </button>
                      <button
                        onClick={() => switchMode("editor")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                          inputMode === "editor"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Type className="h-3.5 w-3.5" />{" "}
                        {selectedType.pasteLabel}
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {inputMode === "file" ? (
                      <FileUploadArea
                        inputRef={inputRef}
                        files={files}
                        dragOver={dragOver}
                        selectedType={selectedType}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        addFiles={addFiles}
                        removeFile={removeFile}
                        clearAll={clearAll}
                      />
                    ) : (
                      <PasteEditor
                        selectedType={selectedType}
                        language={language}
                        setLanguage={setLanguage}
                        pasteText={pasteText}
                        setPasteText={setPasteText}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

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
                  Analyze
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
                      <p className="font-medium text-destructive">
                        Analysis failed
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {error}
                      </p>
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
                {resultType === "code"
                  ? results.map((r, idx) => (
                      <div key={idx} className="space-y-4">
                        {results.length > 1 && (
                          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <FileCode className="h-4 w-4" />
                            File {idx + 1} of {results.length}:{" "}
                            <span className="text-foreground font-semibold">
                              {r.file_name?.split("/").pop()}
                            </span>
                          </h3>
                        )}
                        <CodeResultsPanel result={r} />
                      </div>
                    ))
                  : results.map((r, idx) => (
                      <div key={idx} className="space-y-4">
                        {results.length > 1 && (
                          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            File {idx + 1} of {results.length}:{" "}
                            <span className="text-foreground font-semibold">
                              {r.filename}
                            </span>
                          </h3>
                        )}
                        <TextResultsPanel result={r} />
                      </div>
                    ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

// ── File Upload sub-component ────────────────────────────────────

function FileUploadArea({
  inputRef,
  files,
  dragOver,
  selectedType,
  onDragOver,
  onDragLeave,
  onDrop,
  addFiles,
  removeFile,
  clearAll,
}) {
  return (
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
          ${
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40"
          }
        `}
      >
        <motion.div
          animate={
            dragOver ? { scale: 1.15, rotate: -5 } : { scale: 1, rotate: 0 }
          }
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
            Supports {selectedType.extensionsLabel} — multiple files will be
            zipped automatically
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={selectedType.extensions.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files.length) addFiles(e.target.files);
            e.target.value = "";
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
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </Button>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {files.map((file, idx) => {
                const Icon = getFileIcon(file.name);
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
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatBytes(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                      className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Paste Editor sub-component ───────────────────────────────────

function PasteEditor({
  selectedType,
  language,
  setLanguage,
  pasteText,
  setPasteText,
}) {
  return (
    <div className="space-y-3">
      {selectedType.hasLanguageSelector && (
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
      )}
      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        placeholder={selectedType.placeholder}
        spellCheck={!selectedType.mono}
        className={`w-full h-64 p-4 rounded-lg border bg-muted/30 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50 ${
          selectedType.mono ? "font-mono" : ""
        }`}
      />
      {pasteText.trim() && (
        <p className="text-[11px] text-muted-foreground">
          {pasteText.split("\n").length} lines · {pasteText.length} characters
        </p>
      )}
    </div>
  );
}

export default AICheckPage;
