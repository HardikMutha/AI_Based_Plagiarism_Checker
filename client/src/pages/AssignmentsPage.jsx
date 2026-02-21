import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    GraduationCap,
    FileCode,
    FileText,
    FileImage,
    Loader2,
    Inbox,
    Clock,
    Users,
    BarChart3,
    MoreVertical,
    Trash2,
    Pencil,
    ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";

// ── Config ──────────────────────────────────────────────────────
const TYPE_ICONS = {
    code: { icon: FileCode, color: "text-violet-500", bg: "bg-violet-500/10" },
    text: { icon: FileText, color: "text-sky-500", bg: "bg-sky-500/10" },
    pdf: { icon: FileImage, color: "text-pink-500", bg: "bg-pink-500/10" },
};

function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

// ── Main Page ───────────────────────────────────────────────────
const AssignmentsPage = () => {
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(null);

    // Form state
    const [form, setForm] = useState({
        title: "",
        description: "",
        submission_type: "code",
        filename_format: "",
    });

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/assignments", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error("Failed to load assignments");
            const data = await res.json();
            setAssignments(data.assignments || []);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

    const handleCreate = async () => {
        if (!form.title.trim()) {
            toast.error("Title is required.");
            return;
        }
        setCreating(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/assignments", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    ...form,
                    filename_format: form.filename_format.trim() || null,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create");
            }
            const created = await res.json();
            setAssignments((prev) => [created, ...prev]);
            setCreateOpen(false);
            setForm({ title: "", description: "", submission_type: "code", filename_format: "" });
            toast.success("Assignment created!");
            navigate(`/assignments/${created._id}`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        setDeleting(id);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/assignments/${id}`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error("Failed to delete");
            setAssignments((prev) => prev.filter((a) => a._id !== id));
            toast.success("Assignment deleted.");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleting(null);
        }
    };

    // Animations
    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06 } },
    };
    const item = {
        hidden: { y: 14, opacity: 0 },
        show: { y: 0, opacity: 1 },
    };

    return (
        <div className="flex flex-col min-h-screen bg-transparent">
            {/* Header */}
            <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0 shrink-0">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="p-2" />
                    <h1 className="text-xl font-semibold hidden sm:block">Assignments</h1>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    New Assignment
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
                        <h2 className="text-3xl font-bold tracking-tight">Your Assignments</h2>
                        <p className="text-muted-foreground mt-1">
                            Create assignments, upload student submissions, and run plagiarism or AI scans.
                        </p>
                    </motion.div>

                    {/* Loading */}
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 text-muted-foreground"
                        >
                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                            <p className="text-sm font-medium">Loading assignments…</p>
                        </motion.div>
                    )}

                    {/* Empty */}
                    {!loading && assignments.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-20 text-muted-foreground"
                        >
                            <div className="p-4 rounded-full bg-muted mb-4">
                                <Inbox className="h-10 w-10 opacity-40" />
                            </div>
                            <p className="text-lg font-medium">No assignments yet</p>
                            <p className="text-sm mt-1 max-w-sm text-center">
                                Create your first assignment to start organizing student submissions and running scans.
                            </p>
                            <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
                                <Plus className="h-4 w-4" />
                                Create Assignment
                            </Button>
                        </motion.div>
                    )}

                    {/* Assignment Grid */}
                    {!loading && assignments.length > 0 && (
                        <motion.div
                            variants={container}
                            initial="hidden"
                            animate="show"
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                        >
                            {/* Create New Card */}
                            <motion.div variants={item}>
                                <Card
                                    className="border-dashed cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all h-full flex items-center justify-center min-h-[180px]"
                                    onClick={() => setCreateOpen(true)}
                                >
                                    <CardContent className="flex flex-col items-center gap-2 text-muted-foreground p-6">
                                        <Plus className="h-8 w-8" />
                                        <p className="font-medium text-sm">New Assignment</p>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Assignment Cards */}
                            {assignments.map((a) => {
                                const cfg = TYPE_ICONS[a.submission_type] || TYPE_ICONS.code;
                                const Icon = cfg.icon;
                                const subCount = (a.submissions || []).length;
                                const analysisCount = (a.analyses || []).length;

                                return (
                                    <motion.div key={a._id} variants={item}>
                                        <Card
                                            className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all h-full group"
                                            onClick={() => navigate(`/assignments/${a._id}`)}
                                        >
                                            <CardContent className="p-5 flex flex-col h-full">
                                                {/* Top row */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className={`p-2.5 rounded-lg ${cfg.bg}`}>
                                                        <Icon className={`h-5 w-5 ${cfg.color}`} />
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => handleDelete(a._id, e)}
                                                        disabled={deleting === a._id}
                                                    >
                                                        {deleting === a._id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                </div>

                                                {/* Title + description */}
                                                <h3 className="font-semibold text-sm line-clamp-1">{a.title}</h3>
                                                {a.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {a.description}
                                                    </p>
                                                )}

                                                {/* Spacer */}
                                                <div className="flex-1" />

                                                {/* Bottom stats */}
                                                <div className="flex items-center gap-3 mt-4 text-[11px] text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {subCount} submission{subCount !== 1 ? "s" : ""}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <BarChart3 className="h-3 w-3" />
                                                        {analysisCount} scan{analysisCount !== 1 ? "s" : ""}
                                                    </span>
                                                    <span className="flex items-center gap-1 ml-auto">
                                                        <Clock className="h-3 w-3" />
                                                        {timeAgo(a.updated_at || a.created_at)}
                                                    </span>
                                                </div>

                                                {/* Type badge */}
                                                <div className="mt-3">
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {a.submission_type}
                                                    </Badge>
                                                    {a.filename_format && (
                                                        <Badge variant="outline" className="text-[10px] ml-1.5">
                                                            format: {a.filename_format}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Assignment</DialogTitle>
                        <DialogDescription>
                            Set up a new assignment to collect and analyze submissions.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div>
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g. DSA Lab 3  Binary Trees"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="mt-1.5"
                            />
                        </div>

                        <div>
                            <Label htmlFor="desc">Description</Label>
                            <Textarea
                                id="desc"
                                placeholder="Optional description…"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                className="mt-1.5 min-h-[80px]"
                            />
                        </div>

                        <div>
                            <Label>Submission Type</Label>
                            <Select
                                value={form.submission_type}
                                onValueChange={(v) => setForm({ ...form, submission_type: v })}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="code">
                                        <span className="flex items-center gap-2">
                                            <FileCode className="h-4 w-4 text-violet-500" /> Code
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="text">
                                        <span className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-sky-500" /> Text / Document
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="pdf">
                                        <span className="flex items-center gap-2">
                                            <FileImage className="h-4 w-4 text-pink-500" /> PDF
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="format">Filename Format (optional)</Label>
                            <Input
                                id="format"
                                placeholder="e.g. rollno_name"
                                value={form.filename_format}
                                onChange={(e) => setForm({ ...form, filename_format: e.target.value })}
                                className="mt-1.5"
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">
                                If set, roll numbers and names will be extracted from filenames.
                                Example: <code className="bg-muted px-1 rounded">rollno_name</code> extracts "CS101" and "John" from <code className="bg-muted px-1 rounded">CS101_John.py</code>
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={creating} className="gap-2">
                            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssignmentsPage;
