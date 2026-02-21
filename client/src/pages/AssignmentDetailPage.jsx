import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    Upload,
    FileCode,
    FileText,
    FileImage,
    Loader2,
    Trash2,
    Users,
    Play,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Plus,
    X,
    BarChart3,
    ExternalLink,
    Trophy,
    ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

// ── Config ──────────────────────────────────────────────────────
const TYPE_META = {
    code: { icon: FileCode, color: "text-violet-500", bg: "bg-violet-500/10" },
    text: { icon: FileText, color: "text-sky-500", bg: "bg-sky-500/10" },
    pdf: { icon: FileImage, color: "text-pink-500", bg: "bg-pink-500/10" },
};

const ANALYSIS_OPTIONS = {
    code: [
        { type: "ast_comparison", label: "AST Comparison", desc: "Structural code plagiarism detection", minFiles: 2 },
        { type: "code_ai_detection", label: "AI Code Detection", desc: "Detect AI-generated code", minFiles: 1 },
    ],
    text: [
        { type: "min_hash", label: "MinHash", desc: "Fast approximate text similarity", minFiles: 2 },
        { type: "semantic_similarity", label: "Semantic Similarity", desc: "Deep meaning-based comparison", minFiles: 2 },
    ],
    pdf: [
        { type: "min_hash", label: "MinHash", desc: "Text similarity across PDFs", minFiles: 2 },
        { type: "semantic_similarity", label: "Semantic Similarity", desc: "Semantic comparison of PDFs", minFiles: 2 },
    ],
};

const ANALYSIS_TYPE_LABELS = {
    ast_comparison: "AST Comparison",
    min_hash: "MinHash",
    semantic_similarity: "Semantic Similarity",
    code_ai_detection: "AI Code Detection",
};

function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main Page ───────────────────────────────────────────────────
const AssignmentDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(null);
    const [deletingSub, setDeletingSub] = useState(null);
    const [textDialogOpen, setTextDialogOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [rankings, setRankings] = useState(null);
    const [loadingRankings, setLoadingRankings] = useState(false);

    // Text submission form
    const [textForm, setTextForm] = useState({
        text_content: "",
        roll_no: "",
        student_name: "",
        original_name: "",
    });

    const fetchAssignment = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/assignments/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error("Failed to load assignment");
            const data = await res.json();
            setAssignment(data);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignment();
    }, [id]);

    // ── File upload ─────────────────────────────────────────────
    const handleFileUpload = async (files) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();

            if (files.length === 1 && files[0].name.endsWith(".zip")) {
                formData.append("file", files[0]);
            } else {
                for (const f of files) {
                    formData.append("files", f);
                }
            }

            const res = await fetch(`/api/assignments/${id}/submissions`, {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Upload failed");
            }

            const data = await res.json();
            setAssignment(data);
            toast.success("Files uploaded!");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUploading(false);
        }
    };

    // ── Text submission ─────────────────────────────────────────
    const handleTextSubmit = async () => {
        if (!textForm.text_content.trim()) {
            toast.error("Text content is required.");
            return;
        }
        setUploading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/assignments/${id}/submissions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    submissions: [
                        {
                            text_content: textForm.text_content,
                            roll_no: textForm.roll_no.trim() || null,
                            student_name: textForm.student_name.trim() || null,
                            original_name: textForm.original_name.trim() || null,
                        },
                    ],
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to add submission");
            }

            const data = await res.json();
            setAssignment(data);
            setTextDialogOpen(false);
            setTextForm({ text_content: "", roll_no: "", student_name: "", original_name: "" });
            toast.success("Text submission added!");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUploading(false);
        }
    };

    // ── Delete submission ───────────────────────────────────────
    const handleDeleteSub = async (subId) => {
        setDeletingSub(subId);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/assignments/${id}/submissions/${subId}`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error("Failed to remove submission");
            setAssignment((prev) => ({
                ...prev,
                submissions: prev.submissions.filter((s) => s.id !== subId),
            }));
            toast.success("Submission removed.");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeletingSub(null);
        }
    };

    // ── Run analysis ────────────────────────────────────────────
    const handleAnalyze = async (analysisType) => {
        setAnalyzing(analysisType);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/assignments/${id}/analyze`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ type: analysisType }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Analysis failed");
            }

            const report = await res.json();
            toast.success(`${ANALYSIS_TYPE_LABELS[analysisType]} completed!`);

            // Refresh assignment to get updated analyses list
            await fetchAssignment();
            // Refresh rankings
            fetchRankings();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setAnalyzing(null);
        }
    };

    // ── Rankings computation ──────────────────────────────────────
    const fetchRankings = async () => {
        const doc = assignment || (await (async () => {
            const token = localStorage.getItem("token");
            const r = await fetch(`/api/assignments/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return r.ok ? r.json() : null;
        })());
        if (!doc) return;
        const theAnalyses = doc.analyses || [];
        if (theAnalyses.length === 0) { setRankings(null); return; }

        setLoadingRankings(true);
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const subs = doc.submissions || [];

            // Build filename → student lookup
            const fileToStudent = {};
            for (const s of subs) {
                if (s.original_name) {
                    // The backend uses the original_name as the temp filename
                    fileToStudent[s.original_name] = {
                        roll_no: s.roll_no,
                        student_name: s.student_name,
                        original_name: s.original_name,
                    };
                }
            }

            // Helper: match a filepath (may be /tmp/xxx/filename.py) to a student
            const matchStudent = (filepath) => {
                if (!filepath) return null;
                const fname = filepath.split("/").pop().split("\\").pop();
                return fileToStudent[fname] || { original_name: fname };
            };

            // Accumulate per-student scores across all analyses
            const studentMap = {}; // key = original_name

            const getOrCreate = (student) => {
                const key = student?.original_name || "unknown";
                if (!studentMap[key]) {
                    studentMap[key] = {
                        roll_no: student?.roll_no || null,
                        student_name: student?.student_name || null,
                        original_name: key,
                        flagged_pairs: 0,
                        max_score: 0,
                        scores: [],
                        ai_probability: null,
                        ai_verdict: null,
                    };
                }
                return studentMap[key];
            };

            for (const analysis of theAnalyses) {
                if (!analysis.report_id) continue;
                try {
                    const res = await fetch(`/api/reports/${analysis.report_id}`, { headers });
                    if (!res.ok) continue;
                    const report = await res.json();
                    const data = report.report || report;
                    const type = data.type || analysis.type;
                    const results = data.results;

                    if (type === "code_ai_detection") {
                        // results is an array of per-file AI detections
                        const items = Array.isArray(results) ? results : [results];
                        for (const item of items) {
                            const student = matchStudent(item.file_name);
                            const entry = getOrCreate(student);
                            entry.ai_probability = item.ai_probability;
                            entry.ai_verdict = item.verdict;
                        }
                    } else if (Array.isArray(results)) {
                        // Pairwise comparison results
                        const THRESHOLD = 0.5;
                        for (const pair of results) {
                            const studentA = matchStudent(pair.file_a);
                            const studentB = matchStudent(pair.file_b);
                            let score = pair.overall_score ?? 0;
                            // Normalize: if score is 0-1 range, convert to percentage
                            if (score > 0 && score <= 1) score = score * 100;

                            const entryA = getOrCreate(studentA);
                            const entryB = getOrCreate(studentB);

                            entryA.scores.push(score);
                            entryB.scores.push(score);
                            entryA.max_score = Math.max(entryA.max_score, score);
                            entryB.max_score = Math.max(entryB.max_score, score);

                            if (score >= THRESHOLD * 100) {
                                entryA.flagged_pairs++;
                                entryB.flagged_pairs++;
                            }
                        }
                    }
                } catch { /* skip failed report fetches */ }
            }

            // Build sorted array
            const ranked = Object.values(studentMap).map((s) => ({
                ...s,
                avg_score: s.scores.length > 0
                    ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length
                    : 0,
            }));

            // Sort: flagged pairs desc, then max_score desc, then ai_probability desc
            ranked.sort((a, b) => {
                const aRisk = (a.flagged_pairs * 1000) + a.max_score + (a.ai_probability || 0) * 100;
                const bRisk = (b.flagged_pairs * 1000) + b.max_score + (b.ai_probability || 0) * 100;
                return bRisk - aRisk;
            });

            setRankings(ranked);
        } catch (err) {
            console.error("Rankings error:", err);
        } finally {
            setLoadingRankings(false);
        }
    };

    // Fetch rankings when assignment loads with analyses
    useEffect(() => {
        if (assignment && (assignment.analyses || []).length > 0) {
            fetchRankings();
        }
    }, [assignment?._id, (assignment?.analyses || []).length]);

    // ── Drag & Drop ─────────────────────────────────────────────
    const onDragOver = (e) => { e.preventDefault(); setDragActive(true); };
    const onDragLeave = () => setDragActive(false);
    const onDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        handleFileUpload(Array.from(e.dataTransfer.files));
    };

    // ── Loading / Error ─────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!assignment) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <AlertTriangle className="h-10 w-10 text-destructive" />
                <p className="font-semibold text-lg">Assignment not found</p>
                <Button variant="outline" onClick={() => navigate("/assignments")}>
                    Go back
                </Button>
            </div>
        );
    }

    const subType = assignment.submission_type || "code";
    const meta = TYPE_META[subType] || TYPE_META.code;
    const Icon = meta.icon;
    const submissions = assignment.submissions || [];
    const analyses = assignment.analyses || [];
    const options = ANALYSIS_OPTIONS[subType] || [];

    return (
        <div className="flex flex-col min-h-screen bg-transparent">
            {/* Header */}
            <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0 shrink-0">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="p-2" />
                    <Button variant="ghost" size="icon" onClick={() => navigate("/assignments")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-semibold hidden sm:block truncate max-w-[300px]">
                        {assignment.title}
                    </h1>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-5xl mx-auto space-y-6"
                >
                    {/* Assignment Info */}
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2.5 rounded-lg ${meta.bg}`}>
                                <Icon className={`h-5 w-5 ${meta.color}`} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">{assignment.title}</h2>
                                {assignment.description && (
                                    <p className="text-sm text-muted-foreground mt-0.5">{assignment.description}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <Badge variant="outline">{subType}</Badge>
                            {assignment.filename_format && (
                                <Badge variant="outline">Format: {assignment.filename_format}</Badge>
                            )}
                            <Badge variant="outline" className="text-muted-foreground">
                                <Users className="h-3 w-3 mr-1" />
                                {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
                            </Badge>
                            <Badge variant="outline" className="text-muted-foreground">
                                <BarChart3 className="h-3 w-3 mr-1" />
                                {analyses.length} scan{analyses.length !== 1 ? "s" : ""}
                            </Badge>
                        </div>
                    </div>

                    <Tabs defaultValue="submissions" className="w-full">
                        <TabsList>
                            <TabsTrigger value="submissions">Submissions</TabsTrigger>
                            <TabsTrigger value="analyze">Run Scans</TabsTrigger>
                            <TabsTrigger value="history">Scan History</TabsTrigger>
                            <TabsTrigger value="rankings" className="gap-1.5">
                                <Trophy className="h-3.5 w-3.5" />
                                Rankings
                            </TabsTrigger>
                        </TabsList>

                        {/* ── Submissions Tab ──────────────────────────────── */}
                        <TabsContent value="submissions" className="space-y-4 mt-4">
                            {/* Upload Zone */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Add Submissions</CardTitle>
                                    <CardDescription>Upload files or add text submissions.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* File drop zone */}
                                    <div
                                        onDragOver={onDragOver}
                                        onDragLeave={onDragLeave}
                                        onDrop={onDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`
                      border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                      ${dragActive
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/40 hover:bg-muted/30"
                                            }
                    `}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            className="hidden"
                                            accept={subType === "code" ? ".py,.java,.cpp,.js,.c,.cs,.zip" : subType === "pdf" ? ".pdf,.zip" : ".txt,.pdf,.docx,.zip"}
                                            onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                                        />
                                        {uploading ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <p className="text-sm font-medium">Uploading…</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <Upload className="h-8 w-8 text-muted-foreground" />
                                                <p className="text-sm font-medium">
                                                    Drop files here or click to browse
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Upload individual files or a ZIP archive
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Add text submission button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => setTextDialogOpen(true)}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Text Submission
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Submissions Table */}
                            {submissions.length > 0 && (
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Users className="h-4 w-4 text-primary" />
                                            Submissions ({submissions.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="border rounded-lg overflow-hidden">
                                            {/* Header */}
                                            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                                                <div className="col-span-1">#</div>
                                                <div className="col-span-2">Roll No.</div>
                                                <div className="col-span-3">Name</div>
                                                <div className="col-span-3">File / Source</div>
                                                <div className="col-span-2">Added</div>
                                                <div className="col-span-1"></div>
                                            </div>
                                            {/* Rows */}
                                            <div className="divide-y max-h-[400px] overflow-y-auto">
                                                {submissions.map((sub, idx) => (
                                                    <div
                                                        key={sub.id}
                                                        className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-muted/20 transition-colors"
                                                    >
                                                        <div className="col-span-1 text-xs text-muted-foreground">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="col-span-2 font-mono text-xs">
                                                            {sub.roll_no || (
                                                                <span className="text-muted-foreground italic"></span>
                                                            )}
                                                        </div>
                                                        <div className="col-span-3 truncate">
                                                            {sub.student_name || (
                                                                <span className="text-muted-foreground italic"></span>
                                                            )}
                                                        </div>
                                                        <div className="col-span-3 truncate">
                                                            {sub.type === "file" ? (
                                                                <span className="flex items-center gap-1">
                                                                    <Icon className={`h-3 w-3 ${meta.color} shrink-0`} />
                                                                    <span className="truncate text-xs">
                                                                        {sub.original_name || "file"}
                                                                    </span>
                                                                </span>
                                                            ) : (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/30"
                                                                >
                                                                    Text
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="col-span-2 text-xs text-muted-foreground">
                                                            {timeAgo(sub.uploaded_at)}
                                                        </div>
                                                        <div className="col-span-1 flex justify-end">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => handleDeleteSub(sub.id)}
                                                                disabled={deletingSub === sub.id}
                                                            >
                                                                {deletingSub === sub.id ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {submissions.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Upload className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">No submissions yet</p>
                                    <p className="text-sm mt-1">Upload files or add text above.</p>
                                </div>
                            )}
                        </TabsContent>

                        {/* ── Run Scans Tab ────────────────────────────────── */}
                        <TabsContent value="analyze" className="space-y-4 mt-4">
                            {submissions.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">Add submissions first</p>
                                    <p className="text-sm mt-1">
                                        Go to the Submissions tab and upload files before running scans.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-sm text-muted-foreground">
                                        Choose which analysis to run on the {submissions.length} submission{submissions.length !== 1 ? "s" : ""} in this assignment.
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {options.map((opt) => {
                                            const disabled = submissions.length < opt.minFiles;
                                            const isRunning = analyzing === opt.type;
                                            return (
                                                <Card key={opt.type} className={disabled ? "opacity-50" : ""}>
                                                    <CardContent className="p-5">
                                                        <h4 className="font-semibold text-sm">{opt.label}</h4>
                                                        <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                                                        {disabled && (
                                                            <p className="text-[11px] text-amber-600 mt-2">
                                                                Requires at least {opt.minFiles} submissions.
                                                            </p>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            className="mt-3 gap-2"
                                                            disabled={disabled || analyzing !== null}
                                                            onClick={() => handleAnalyze(opt.type)}
                                                        >
                                                            {isRunning ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Play className="h-4 w-4" />
                                                            )}
                                                            {isRunning ? "Running…" : "Run Scan"}
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        {/* ── Scan History Tab ─────────────────────────────── */}
                        <TabsContent value="history" className="space-y-4 mt-4">
                            {analyses.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">No scans yet</p>
                                    <p className="text-sm mt-1">
                                        Run an analysis from the "Run Scans" tab to see results here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {analyses
                                        .slice()
                                        .reverse()
                                        .map((a, idx) => (
                                            <Card
                                                key={idx}
                                                className="cursor-pointer hover:bg-muted/30 transition-colors"
                                                onClick={() => navigate(`/reports/${a.report_id}`)}
                                            >
                                                <CardContent className="p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-primary/10">
                                                            <BarChart3 className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {ANALYSIS_TYPE_LABELS[a.type] || a.type}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {timeAgo(a.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                                                        View Report
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* ── Rankings Tab ───────────────────────────────── */}
                        <TabsContent value="rankings" className="space-y-4 mt-4">
                            {loadingRankings ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
                                    <p className="text-sm text-muted-foreground">Computing rankings…</p>
                                </div>
                            ) : !rankings || rankings.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">No rankings available</p>
                                    <p className="text-sm mt-1">
                                        Run at least one scan to see student rankings.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-sm text-muted-foreground">
                                        Students ranked by suspicion level across all completed scans.
                                    </div>
                                    <Card>
                                        <CardContent className="p-0">
                                            <div className="border rounded-lg overflow-hidden">
                                                {/* Header */}
                                                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                                                    <div className="col-span-1">#</div>
                                                    <div className="col-span-2">Roll No.</div>
                                                    <div className="col-span-3">Student</div>
                                                    <div className="col-span-2 text-center">Flagged Pairs</div>
                                                    <div className="col-span-2 text-center">Max Score</div>
                                                    <div className="col-span-2 text-center">AI Prob.</div>
                                                </div>
                                                {/* Rows */}
                                                <div className="divide-y max-h-[500px] overflow-y-auto">
                                                    {rankings.map((s, idx) => {
                                                        const risk = s.flagged_pairs > 0 || s.max_score >= 50 || (s.ai_probability !== null && s.ai_probability >= 0.5);
                                                        const high = s.flagged_pairs >= 2 || s.max_score >= 70 || (s.ai_probability !== null && s.ai_probability >= 0.7);
                                                        return (
                                                            <div
                                                                key={s.original_name}
                                                                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm transition-colors ${high ? "bg-red-500/5" : risk ? "bg-amber-500/5" : ""
                                                                    }`}
                                                            >
                                                                <div className="col-span-1">
                                                                    {idx === 0 && rankings.length > 1 && (s.flagged_pairs > 0 || s.max_score > 0 || s.ai_probability > 0) ? (
                                                                        <span className="text-amber-500">🏆</span>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">{idx + 1}</span>
                                                                    )}
                                                                </div>
                                                                <div className="col-span-2 font-mono text-xs">
                                                                    {s.roll_no || <span className="text-muted-foreground italic">—</span>}
                                                                </div>
                                                                <div className="col-span-3 truncate">
                                                                    <p className="truncate text-sm">{s.student_name || s.original_name}</p>
                                                                </div>
                                                                <div className="col-span-2 text-center">
                                                                    {s.flagged_pairs > 0 ? (
                                                                        <Badge variant="outline" className={`text-[10px] ${s.flagged_pairs >= 2
                                                                                ? "bg-red-500/10 text-red-600 border-red-500/30"
                                                                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                                                            }`}>
                                                                            {s.flagged_pairs} pair{s.flagged_pairs !== 1 ? "s" : ""}
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">0</span>
                                                                    )}
                                                                </div>
                                                                <div className="col-span-2 text-center">
                                                                    {s.max_score > 0 ? (
                                                                        <span className={`text-xs font-bold font-mono ${s.max_score >= 70 ? "text-red-600"
                                                                                : s.max_score >= 50 ? "text-amber-600"
                                                                                    : "text-green-600"
                                                                            }`}>
                                                                            {s.max_score.toFixed(1)}%
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">—</span>
                                                                    )}
                                                                </div>
                                                                <div className="col-span-2 text-center">
                                                                    {s.ai_probability !== null ? (
                                                                        <span className={`text-xs font-bold font-mono ${s.ai_probability >= 0.7 ? "text-red-600"
                                                                                : s.ai_probability >= 0.5 ? "text-amber-600"
                                                                                    : "text-green-600"
                                                                            }`}>
                                                                            {(s.ai_probability * 100).toFixed(1)}%
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">—</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </div>

            {/* Text Submission Dialog */}
            <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Text Submission</DialogTitle>
                        <DialogDescription>
                            Paste student text content directly.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="txt-roll">Roll No. (optional)</Label>
                                <Input
                                    id="txt-roll"
                                    placeholder="e.g. CS101"
                                    value={textForm.roll_no}
                                    onChange={(e) => setTextForm({ ...textForm, roll_no: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="txt-name">Student Name (optional)</Label>
                                <Input
                                    id="txt-name"
                                    placeholder="e.g. John Doe"
                                    value={textForm.student_name}
                                    onChange={(e) => setTextForm({ ...textForm, student_name: e.target.value })}
                                    className="mt-1.5"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="txt-fname">Label / Filename (optional)</Label>
                            <Input
                                id="txt-fname"
                                placeholder="e.g. essay_draft.txt"
                                value={textForm.original_name}
                                onChange={(e) => setTextForm({ ...textForm, original_name: e.target.value })}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="txt-content">Content *</Label>
                            <Textarea
                                id="txt-content"
                                placeholder="Paste the student's submission text here…"
                                value={textForm.text_content}
                                onChange={(e) => setTextForm({ ...textForm, text_content: e.target.value })}
                                className="mt-1.5 min-h-[200px] font-mono text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTextDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleTextSubmit} disabled={uploading} className="gap-2">
                            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Add Submission
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssignmentDetailPage;
