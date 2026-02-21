import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen,
    Upload,
    FileText,
    X,
    ExternalLink,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Search,
    Loader2,
    Copy,
    Check,
    Quote,
    Users,
    RotateCcw,
    GraduationCap,
    Library
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import { Textarea } from "../components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "../components/ui/tooltip";
import { Skeleton } from "../components/ui/skeleton";
import { SidebarTrigger } from "../components/ui/sidebar";
import { toast } from "sonner";

const MIN_CHARS = 300;

// Animated loading component
const AnalysisLoader = () => {
    const loadingMessages = [
        "Splitting text into sentences...",
        "Running citation detection model...",
        "Identifying claims that need sources...",
        "Querying academic databases...",
        "Matching with research papers...",
        "Compiling citation suggestions...",
    ];
    const [msgIndex, setMsgIndex] = useState(0);
    const [progressValue, setProgressValue] = useState(0);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setMsgIndex((prev) => (prev + 1) % loadingMessages.length);
        }, 2800);
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setProgressValue((prev) => {
                if (prev >= 95) return prev;
                return prev + Math.random() * 3;
            });
        }, 400);
        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-6"
        >
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-muted animate-spin border-t-indigo-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen size={20} className="text-indigo-500" />
                </div>
            </div>

            <div className="text-center space-y-2 max-w-sm">
                <h3 className="text-lg font-semibold">Analyzing Document</h3>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={msgIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="text-sm text-muted-foreground"
                    >
                        {loadingMessages[msgIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>

            <div className="w-64">
                <Progress value={progressValue} className="h-1.5" />
            </div>

            <div className="flex gap-4">
                <Skeleton className="w-40 h-4 rounded" />
                <Skeleton className="w-24 h-4 rounded" />
            </div>
        </motion.div>
    );
};

// Group flat candidate_papers by unique paper (title + doi)
// Backend now sends `matched_sentences` (array) per paper after deduplication.
// This function still groups if needed (backward compat), and normalizes the format.
const groupPapers = (papers) => {
    if (!papers || papers.length === 0) return [];
    const map = new Map();

    for (const p of papers) {
        const key = `${(p.title || "").toLowerCase().trim()}||${p.doi || ""}`;

        // Extract sentences  new format uses matched_sentences (array),
        // old format used matched_sentence (string) or sentence (string)
        let incomingSentences = [];
        if (Array.isArray(p.matched_sentences)) {
            incomingSentences = p.matched_sentences.filter(Boolean);
        } else if (p.matched_sentence) {
            incomingSentences = [p.matched_sentence];
        } else if (p.sentence) {
            incomingSentences = [p.sentence];
        }

        if (map.has(key)) {
            const existing = map.get(key);
            for (const s of incomingSentences) {
                if (s && !existing.sentences.includes(s)) {
                    existing.sentences.push(s);
                }
            }
            if ((p.similarity || 0) > existing.similarity) {
                existing.similarity = p.similarity || 0;
                existing.source = p.source || existing.source;
            }
        } else {
            map.set(key, {
                title: p.title,
                authors: p.authors,
                year: p.year,
                doi: p.doi,
                pdfLink: p.pdfLink,
                abstract: p.abstract,
                similarity: p.similarity || 0,
                source: p.source || "openalex",
                sentences: incomingSentences,
            });
        }
    }

    const grouped = Array.from(map.values());
    grouped.sort((a, b) => b.similarity - a.similarity);
    return grouped;
};

// Similarity score as a percentage label with color
const SimilarityBadge = ({ score }) => {
    const pct = Math.round(score * 100);
    let colorClass = "bg-red-500/10 text-red-600 border-red-500/30";
    if (pct >= 70) colorClass = "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30";
    else if (pct >= 50) colorClass = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge variant="outline" className={`text-[10px] ${colorClass}`}>
                    {pct}% match
                </Badge>
            </TooltipTrigger>
            <TooltipContent>
                <p>Semantic similarity to flagged sentence context</p>
            </TooltipContent>
        </Tooltip>
    );
};

// Source badge (arXiv vs OpenAlex)
const SourceBadge = ({ source }) => {
    if (source === "arxiv") {
        return (
            <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30">
                <GraduationCap size={10} className="mr-1" />
                arXiv
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
            <Library size={10} className="mr-1" />
            OpenAlex
        </Badge>
    );
};

// Expandable citation result card (grouped)
const CitationCard = ({ group, index }) => {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const formatAuthors = (authors) => {
        if (!authors || authors.length === 0) return "Unknown Author";
        if (authors.length <= 3) return authors.join(", ");
        return `${authors.slice(0, 3).join(", ")} et al.`;
    };

    const generateAPACitation = () => {
        const authors = formatAuthors(group.authors);
        const year = group.year || "n.d.";
        const title = group.title || "Untitled";
        return `${authors} (${year}). ${title}.${group.doi ? ` ${group.doi}` : ""}`;
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generateAPACitation());
            setCopied(true);
            toast.success("Citation copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy citation");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
        >
            <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300 border-l-4 border-l-indigo-500/60">
                <CardContent className="p-5 space-y-3">
                    {/* Top row: source + similarity */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <SourceBadge source={group.source} />
                            {group.sentences.length > 1 && (
                                <Badge variant="outline" className="text-[10px]">
                                    Referenced by {group.sentences.length} sentences
                                </Badge>
                            )}
                        </div>
                        <SimilarityBadge score={group.similarity} />
                    </div>

                    {/* Paper title */}
                    <h4 className="font-semibold text-base leading-snug text-foreground">
                        {group.title || "Untitled Paper"}
                    </h4>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {group.year && (
                            <span className="flex items-center gap-1">
                                <BookOpen size={12} />
                                {group.year}
                            </span>
                        )}
                        {group.authors && group.authors.length > 0 && (
                            <span className="flex items-center gap-1">
                                <Users size={12} />
                                {formatAuthors(group.authors)}
                            </span>
                        )}
                    </div>

                    {/* Matched sentences */}
                    {group.sentences.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {group.sentences.map((sentence, i) => (
                                <Badge
                                    key={i}
                                    variant="secondary"
                                    className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 font-normal max-w-full"
                                >
                                    <AlertCircle size={12} className="mr-1 shrink-0" />
                                    <span className="truncate">"{sentence}"</span>
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? (
                                <ChevronUp size={14} className="mr-1" />
                            ) : (
                                <ChevronDown size={14} className="mr-1" />
                            )}
                            {expanded ? "Less" : "Details"}
                        </Button>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-8"
                                    onClick={handleCopy}
                                >
                                    {copied ? (
                                        <Check size={14} className="mr-1 text-green-500" />
                                    ) : (
                                        <Copy size={14} className="mr-1" />
                                    )}
                                    {copied ? "Copied" : "Copy APA"}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Copy APA formatted citation</p>
                            </TooltipContent>
                        </Tooltip>

                        {group.doi && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <a
                                        href={group.doi}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Button variant="outline" size="sm" className="text-xs h-8">
                                            <ExternalLink size={14} className="mr-1" />
                                            DOI
                                        </Button>
                                    </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Open DOI link</p>
                                </TooltipContent>
                            </Tooltip>
                        )}

                        {group.pdfLink && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <a
                                        href={group.pdfLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-8 text-indigo-600"
                                        >
                                            <FileText size={14} className="mr-1" />
                                            PDF
                                        </Button>
                                    </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>View open access PDF</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    {/* Expandable abstract */}
                    <AnimatePresence>
                        {expanded && group.abstract && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                            >
                                <Separator className="my-3" />
                                <div>
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Abstract
                                    </Label>
                                    <p className="text-sm text-foreground/80 leading-relaxed mt-1">
                                        {group.abstract}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </motion.div>
    );
};

const CitationPage = () => {
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const charCount = text.length;
    const charProgress = Math.min((charCount / MIN_CHARS) * 100, 100);
    const isValid = charCount >= MIN_CHARS || file !== null;

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            const validTypes = [".txt", ".pdf", ".docx"];
            const ext = "." + droppedFile.name.split(".").pop().toLowerCase();
            if (validTypes.includes(ext)) {
                setFile(droppedFile);
                toast.success(`File "${droppedFile.name}" attached`);
            } else {
                toast.error("Unsupported file type. Use .txt, .pdf, or .docx");
            }
        }
    }, []);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            toast.success(`File "${e.target.files[0].name}" attached`);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        toast.info("File removed");
    };

    const handleAnalyze = async () => {
        if (!isValid) {
            toast.error(
                `Please provide at least ${MIN_CHARS} characters or upload a file.`
            );
            return;
        }

        setLoading(true);
        setResults(null);

        try {
            const token = localStorage.getItem("token");
            let res;

            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                if (text.trim()) {
                    formData.append("text", text);
                }
                res = await fetch("/api/citations/check", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });
            } else {
                res = await fetch("/api/citations/check", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ text }),
                });
            }

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Analysis failed. Please try again.");
                setLoading(false);
                return;
            }

            setResults(data);

            if (data.candidate_papers && data.candidate_papers.length > 0) {
                const grouped = groupPapers(data.candidate_papers);
                toast.success(
                    `Found ${grouped.length} unique paper(s) across ${data.candidate_papers.length} match(es)`
                );
            } else if (data.message) {
                toast.info(data.message);
            } else {
                toast.info("No citations needed for the provided text.");
            }
        } catch (err) {
            toast.error("Network error. Is the backend running?");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setText("");
        setFile(null);
        setResults(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="flex flex-col min-h-screen bg-transparent">
            {/* Header */}
            <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0 shrink-0">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="p-2" />
                    <h1 className="text-xl font-semibold hidden sm:block">
                        Citation Suggestions
                    </h1>
                </div>
            </header>

            <div className="flex-1 p-4 md:p-6 lg:p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-5xl mx-auto space-y-6"
                >
                    {/* Page Intro */}
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">
                            Citation Analysis
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Paste text or upload a document to identify statements that require
                            academic citations. The system will suggest relevant papers for
                            each flagged sentence.
                        </p>
                    </div>

                    {/* Input Section */}
                    {!loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Quote size={20} className="text-indigo-500" />
                                        Document Input
                                    </CardTitle>
                                    <CardDescription>
                                        Enter your text directly or upload a .txt, .pdf, or .docx
                                        file. Minimum {MIN_CHARS} characters for text input.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    {/* Text Editor */}
                                    <div className="space-y-2">
                                        <Label htmlFor="citation-text">Document Text</Label>
                                        <Textarea
                                            id="citation-text"
                                            className="min-h-[220px] font-mono text-sm leading-relaxed resize-vertical"
                                            placeholder="Paste your document text here... Machine learning has fundamentally transformed how we approach complex computational problems. Deep learning architectures such as transformers have shown remarkable performance across natural language processing tasks..."
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                        />

                                        {/* Character counter */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Progress
                                                    value={charProgress}
                                                    className="w-32 h-1.5"
                                                />
                                                <span
                                                    className={`text-xs font-medium ${charCount >= MIN_CHARS
                                                        ? "text-green-600"
                                                        : "text-muted-foreground"
                                                        }`}
                                                >
                                                    {charCount} / {MIN_CHARS} min
                                                </span>
                                            </div>
                                            {text && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs h-7 text-muted-foreground"
                                                    onClick={() => setText("")}
                                                >
                                                    Clear text
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="flex items-center gap-3">
                                        <Separator className="flex-1" />
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                            or upload a file
                                        </span>
                                        <Separator className="flex-1" />
                                    </div>

                                    {/* File Upload Zone */}
                                    {!file ? (
                                        <div
                                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${dragActive
                                                ? "border-indigo-500 bg-indigo-500/5"
                                                : "border-border hover:border-indigo-500/40 hover:bg-muted/30"
                                                }`}
                                            onDragEnter={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDragOver={handleDrag}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload
                                                size={32}
                                                className="mx-auto mb-3 text-muted-foreground"
                                            />
                                            <p className="text-sm font-medium">
                                                Drop your file here or{" "}
                                                <span className="text-indigo-600 dark:text-indigo-400">
                                                    browse
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Supports .txt, .pdf, .docx
                                            </p>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".txt,.pdf,.docx"
                                                className="hidden"
                                                onChange={handleFileSelect}
                                            />
                                        </div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                        >
                                            <Card className="bg-indigo-500/5 border-indigo-500/20">
                                                <CardContent className="flex items-center justify-between p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                                            <FileText
                                                                size={20}
                                                                className="text-indigo-600 dark:text-indigo-400"
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">{file.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {(file.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-muted-foreground hover:text-destructive"
                                                                onClick={handleRemoveFile}
                                                            >
                                                                <X size={16} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Remove file</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-3 pt-1">
                                        <Button
                                            onClick={handleAnalyze}
                                            disabled={!isValid || loading}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-6 gap-2"
                                        >
                                            {loading ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Search size={16} />
                                            )}
                                            Analyze Citations
                                        </Button>
                                        {(text || file || results) && (
                                            <Button
                                                variant="outline"
                                                onClick={handleReset}
                                                className="h-11 gap-2"
                                            >
                                                <RotateCcw size={14} />
                                                Reset
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Loading State */}
                    {loading && <AnalysisLoader />}

                    {/* Results Section */}
                    <AnimatePresence>
                        {results && !loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                className="space-y-6"
                            >
                                {/* Summary Card */}
                                {(() => {
                                    const grouped = groupPapers(results.candidate_papers);
                                    return (
                                        <>
                                            <Card className="border-indigo-500/20">
                                                <CardContent className="p-5">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div>
                                                            <CardTitle className="text-lg">
                                                                Analysis Complete
                                                            </CardTitle>
                                                            <CardDescription className="mt-1">
                                                                Found{" "}
                                                                {results.suspicious_sentences?.length || 0} sentence(s)
                                                                needing citations, matched to{" "}
                                                                {grouped.length} unique paper(s).
                                                            </CardDescription>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                                            >
                                                                <AlertCircle size={12} className="mr-1" />
                                                                {results.suspicious_sentences?.length || 0} flagged
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                                                            >
                                                                <BookOpen size={12} className="mr-1" />
                                                                {grouped.length} papers
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Flagged Sentences Overview */}
                                            {results.suspicious_sentences &&
                                                results.suspicious_sentences.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: 0.2 }}
                                                    >
                                                        <Card>
                                                            <CardHeader>
                                                                <CardTitle className="text-base">
                                                                    Sentences Requiring Citations
                                                                </CardTitle>
                                                                <CardDescription>
                                                                    These statements contain claims or findings that
                                                                    should be backed by a reference.
                                                                </CardDescription>
                                                            </CardHeader>
                                                            <CardContent className="space-y-2">
                                                                {results.suspicious_sentences.map((item, i) => {
                                                                    // Handle both object {sentence, context} and plain string format
                                                                    const sentenceText = typeof item === "string" ? item : item.sentence;
                                                                    return (
                                                                        <motion.div
                                                                            key={i}
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: i * 0.05 }}
                                                                            className="flex gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15"
                                                                        >
                                                                            <AlertCircle
                                                                                size={16}
                                                                                className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
                                                                            />
                                                                            <p className="text-sm text-foreground/80 leading-relaxed">
                                                                                {sentenceText}
                                                                            </p>
                                                                        </motion.div>
                                                                    );
                                                                })}
                                                            </CardContent>
                                                        </Card>
                                                    </motion.div>
                                                )}

                                            {/* Citation Suggestions (grouped) */}
                                            {grouped.length > 0 && (
                                                <div className="space-y-3">
                                                    <h3 className="text-lg font-semibold ml-1">
                                                        Suggested Citations
                                                    </h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {grouped.map((group, index) => (
                                                            <CitationCard
                                                                key={index}
                                                                group={group}
                                                                index={index}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}

                                {/* No results message */}
                                {results.candidate_papers &&
                                    results.candidate_papers.length === 0 && (
                                        <Card>
                                            <CardContent className="py-12 text-center">
                                                <BookOpen
                                                    size={40}
                                                    className="mx-auto mb-4 text-muted-foreground/30"
                                                />
                                                <CardTitle className="text-lg mb-1">All Clear</CardTitle>
                                                <CardDescription>
                                                    {results.message ||
                                                        "No sentences in the provided text require additional citations."}
                                                </CardDescription>
                                            </CardContent>
                                        </Card>
                                    )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

export default CitationPage;
