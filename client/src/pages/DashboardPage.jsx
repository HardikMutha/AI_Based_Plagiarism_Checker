import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileSearch,
  ShieldAlert,
  Bot,
  FileMinus,
  Quote,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  FileText,
  Sparkles,
  Files,
  ArrowRight,
  Loader2,
  BookMarked,
  FileImage,
  TrendingUp,
  Clock,
  BarChart3,
  Activity,
  GraduationCap,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { SidebarTrigger } from "../components/ui/sidebar";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";

// ── Type config (matches ReportHistoryPage) ─────────────────────
const TYPE_CONFIG = {
  ast_comparison: {
    label: "Code  AST",
    shortLabel: "AST",
    icon: FileCode,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    badgeCls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
    gradient: "from-violet-500/10 to-violet-500/5",
    scoreScale: 100,
  },
  min_hash: {
    label: "Text  MinHash",
    shortLabel: "MinHash",
    icon: FileText,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    badgeCls: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
    gradient: "from-sky-500/10 to-sky-500/5",
    scoreScale: 1,
  },
  semantic_similarity: {
    label: "Text  Semantic",
    shortLabel: "Semantic",
    icon: Sparkles,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    badgeCls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    gradient: "from-amber-500/10 to-amber-500/5",
    scoreScale: 1,
  },
  code_ai_detection: {
    label: "AI Detection",
    shortLabel: "AI Det.",
    icon: Bot,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    badgeCls: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    gradient: "from-indigo-500/10 to-indigo-500/5",
    scoreScale: 100,
  },
};

const FALLBACK_CFG = {
  label: "Report",
  shortLabel: "Other",
  icon: Files,
  color: "text-muted-foreground",
  bg: "bg-muted",
  badgeCls: "bg-muted text-muted-foreground",
  gradient: "from-muted to-muted/50",
  scoreScale: 100,
};

// ── Helpers ─────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getMaxScore(report) {
  const data = report.report || {};
  const type = data.type || "";
  const cfg = TYPE_CONFIG[type] || FALLBACK_CFG;
  const results = data.results;

  if (type === "code_ai_detection" && results) {
    return (results.ai_probability ?? 0) * 100;
  }

  if (Array.isArray(results)) {
    let max = 0;
    for (const r of results) {
      const raw =
        r.overall_score ??
        r.similarity_score ??
        r.overall_similarity ??
        r.similarity ??
        r.jaccard_similarity ??
        0;
      const norm = cfg.scoreScale === 1 ? raw * 100 : raw;
      if (norm > max) max = norm;
    }
    return max;
  }
  return 0;
}

// ── Quick Action Card ───────────────────────────────────────────
const QuickActionCard = ({ icon: Icon, title, description, to, color, bg }) => {
  const navigate = useNavigate();
  return (
    <Card
      className="cursor-pointer group hover:shadow-md transition-all duration-300 border hover:border-primary/20"
      onClick={() => navigate(to)}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${bg} shrink-0 transition-transform group-hover:scale-110`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </CardContent>
    </Card>
  );
};

// ── Type Distribution Bar ───────────────────────────────────────
const TypeDistributionBar = ({ typeCounts, total }) => {
  if (total === 0) return null;

  const entries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {/* Visual bar */}
      <div className="h-3 rounded-full overflow-hidden flex bg-muted">
        {entries.map(([type, count]) => {
          const cfg = TYPE_CONFIG[type] || FALLBACK_CFG;
          const pct = (count / total) * 100;
          const bgColor = {
            ast_comparison: "bg-violet-500",
            min_hash: "bg-sky-500",
            semantic_similarity: "bg-amber-500",
            code_ai_detection: "bg-indigo-500",
          }[type] || "bg-gray-400";

          return (
            <div
              key={type}
              className={`${bgColor} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${cfg.shortLabel}: ${count} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.map(([type, count]) => {
          const cfg = TYPE_CONFIG[type] || FALLBACK_CFG;
          const Icon = cfg.icon;
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className={`h-3 w-3 ${cfg.color}`} />
              <span>{cfg.shortLabel}</span>
              <span className="font-semibold text-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main Dashboard Page ─────────────────────────────────────────
const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [repRes, asgRes] = await Promise.all([
          fetch("/api/reports", { headers }),
          fetch("/api/assignments", { headers }),
        ]);
        if (repRes.ok) {
          const d = await repRes.json();
          setReports(d.reports || []);
        }
        if (asgRes.ok) {
          const d = await asgRes.json();
          setAssignments(d.assignments || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Compute stats from real data ──────────────────────────────
  const totalReports = reports.length;

  const typeCounts = {};
  let totalComparisons = 0;
  let flaggedReports = 0; // reports with max score >= 50%
  let totalFilesScanned = 0;
  let allScores = [];
  let aiDetectionReports = 0;
  let aiScoresSum = 0;

  for (const r of reports) {
    const data = r.report || {};
    const type = data.type || "unknown";
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    totalFilesScanned += data.total_files ?? 0;
    totalComparisons += data.total_comparisons ?? 0;

    const maxScore = getMaxScore(r);
    if (maxScore >= 50) flaggedReports++;
    if (maxScore > 0) allScores.push(maxScore);

    if (type === "code_ai_detection" && data.results) {
      aiDetectionReports++;
      aiScoresSum += (data.results.ai_probability ?? 0) * 100;
    }
  }

  const avgSimilarity = allScores.length > 0
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 0;

  const avgAIProb = aiDetectionReports > 0 ? aiScoresSum / aiDetectionReports : null;

  // Recent 5 reports sorted by date
  const recentReports = [...reports]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Flagged reports (score >= 50)
  const highRiskReports = [...reports]
    .filter((r) => getMaxScore(r) >= 50)
    .sort((a, b) => getMaxScore(b) - getMaxScore(a))
    .slice(0, 4);

  // ── Animations ────────────────────────────────────────────────
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="p-2" />
          <h1 className="text-xl font-semibold hidden sm:block">Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="default" size="sm" className="hidden sm:flex gap-2" onClick={() => navigate("/batch-scan")}>
            <FileSearch className="h-4 w-4" />
            New Scan
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6">
          {/* Welcome Section */}
          <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Welcome back, {user?.username || "Admin"}!
              </h2>
              <p className="text-muted-foreground mt-1">
                Here's an overview of your plagiarism detection and analysis activity.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium border rounded-md px-3 py-1.5 flex items-center gap-2 bg-card">
                <Calendar size={16} className="text-primary" />
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </motion.div>

          {/* Stats Row */}
          {loading ? (
            <motion.div variants={item} className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </motion.div>
          ) : (
            <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Reports */}
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                  <BarChart3 className="text-primary" size={20} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalReports}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalFilesScanned} file{totalFilesScanned !== 1 ? "s" : ""} scanned
                  </p>
                </CardContent>
              </Card>

              {/* Flagged */}
              <Card className="border-none shadow-sm bg-gradient-to-br from-destructive/10 to-destructive/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High Risk</CardTitle>
                  <ShieldAlert className="text-destructive" size={20} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{flaggedReports}</div>
                  <p className="text-xs text-destructive mt-1">
                    Reports with ≥50% match score
                  </p>
                </CardContent>
              </Card>

              {/* Avg Similarity */}
              <Card className="border-none shadow-sm bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Max Score</CardTitle>
                  <TrendingUp className="text-amber-600" size={20} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {allScores.length > 0 ? `${avgSimilarity.toFixed(1)}%` : ""}
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    Across {allScores.length} scored report{allScores.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              {/* AI Detection */}
              <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-500/10 to-indigo-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Detection</CardTitle>
                  <Bot className="text-indigo-600" size={20} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {avgAIProb !== null ? `${avgAIProb.toFixed(1)}%` : ""}
                  </div>
                  <p className="text-xs text-indigo-600 mt-1">
                    {aiDetectionReports > 0
                      ? `Avg. across ${aiDetectionReports} scan${aiDetectionReports !== 1 ? "s" : ""}`
                      : "No AI scans yet"}
                  </p>
                </CardContent>
              </Card>

              {/* Assignments */}
              <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assignments</CardTitle>
                  <GraduationCap className="text-emerald-600" size={20} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{assignments.length}</div>
                  <p className="text-xs text-emerald-600 mt-1">
                    {assignments.reduce((acc, a) => acc + (a.submissions || []).length, 0)} total submission{assignments.reduce((acc, a) => acc + (a.submissions || []).length, 0) !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Report Type Distribution */}
          {!loading && totalReports > 0 && (
            <motion.div variants={item}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Report Distribution
                  </CardTitle>
                  <CardDescription>Breakdown of your scans by analysis type.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TypeDistributionBar typeCounts={typeCounts} total={totalReports} />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div variants={item}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <QuickActionCard
                icon={GraduationCap}
                title="Create Assignment"
                description="Organize submissions and run scans"
                to="/assignments"
                color="text-emerald-500"
                bg="bg-emerald-500/10"
              />
              <QuickActionCard
                icon={Files}
                title="Compare Files"
                description="Upload files and check for code plagiarism"
                to="/compare"
                color="text-violet-500"
                bg="bg-violet-500/10"
              />
              <QuickActionCard
                icon={Bot}
                title="AI Detection"
                description="Detect AI-generated code submissions"
                to="/ai-check"
                color="text-indigo-500"
                bg="bg-indigo-500/10"
              />
              <QuickActionCard
                icon={FileSearch}
                title="Batch Scan"
                description="Bulk scan multiple files or a zip archive"
                to="/batch-scan"
                color="text-emerald-500"
                bg="bg-emerald-500/10"
              />
              <QuickActionCard
                icon={BookMarked}
                title="Citation Check"
                description="Find missing citations in academic text"
                to="/citations"
                color="text-orange-500"
                bg="bg-orange-500/10"
              />
              <QuickActionCard
                icon={FileImage}
                title="PDF Analysis"
                description="Analyze PDF documents for plagiarism"
                to="/pdf-analysis"
                color="text-pink-500"
                bg="bg-pink-500/10"
              />
              <QuickActionCard
                icon={BarChart3}
                title="Report History"
                description="Browse all past scan reports"
                to="/reports"
                color="text-sky-500"
                bg="bg-sky-500/10"
              />
            </div>
          </motion.div>

          {/* Two-column: High Risk + Recent Reports */}
          {!loading && totalReports > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* High Risk Reports */}
              <motion.div variants={item}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                        High Risk Reports
                      </CardTitle>
                      {highRiskReports.length > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                          {flaggedReports} total
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      Reports with similarity or AI probability ≥ 50%
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {highRiskReports.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
                        <p className="text-sm font-medium">No high-risk reports</p>
                        <p className="text-xs mt-0.5">All scans are below the 50% threshold.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {highRiskReports.map((report) => {
                          const data = report.report || {};
                          const type = data.type || "unknown";
                          const cfg = TYPE_CONFIG[type] || FALLBACK_CFG;
                          const Icon = cfg.icon;
                          const maxScore = getMaxScore(report);

                          return (
                            <div
                              key={report._id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-destructive/5 hover:bg-destructive/10 cursor-pointer transition-colors"
                              onClick={() => navigate(`/reports/${report._id}`)}
                            >
                              <div className={`p-2 rounded-lg ${cfg.bg} shrink-0`}>
                                <Icon className={`h-4 w-4 ${cfg.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{cfg.label}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {timeAgo(report.created_at)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {data.total_files ?? 0} file{(data.total_files ?? 0) !== 1 ? "s" : ""}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p
                                  className={`text-lg font-bold font-mono tabular-nums ${maxScore >= 70
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-amber-600 dark:text-amber-400"
                                    }`}
                                >
                                  {maxScore.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Reports */}
              <motion.div variants={item}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Recent Reports
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary"
                        onClick={() => navigate("/reports")}
                      >
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recentReports.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Files className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No reports yet. Start a scan to get going!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentReports.map((report) => {
                          const data = report.report || {};
                          const type = data.type || "unknown";
                          const cfg = TYPE_CONFIG[type] || FALLBACK_CFG;
                          const Icon = cfg.icon;
                          const maxScore = getMaxScore(report);
                          const isFlagged = maxScore >= 50;

                          return (
                            <div
                              key={report._id}
                              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => navigate(`/reports/${report._id}`)}
                            >
                              <div className={`p-2 rounded-lg ${cfg.bg} shrink-0`}>
                                <Icon className={`h-4 w-4 ${cfg.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{cfg.label}</p>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${cfg.badgeCls}`}
                                  >
                                    {cfg.shortLabel}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {timeAgo(report.created_at)}
                                  <span className="mx-1">·</span>
                                  {data.total_files ?? 0} file{(data.total_files ?? 0) !== 1 ? "s" : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {maxScore > 0 && (
                                  <span
                                    className={`text-sm font-bold font-mono tabular-nums ${maxScore >= 70
                                      ? "text-red-600 dark:text-red-400"
                                      : maxScore >= 50
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-green-600 dark:text-green-400"
                                      }`}
                                  >
                                    {maxScore.toFixed(1)}%
                                  </span>
                                )}
                                {isFlagged ? (
                                  <AlertTriangle size={14} className="text-destructive" />
                                ) : (
                                  <CheckCircle2 size={14} className="text-green-500" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}

          {/* Recent Assignments */}
          {!loading && assignments.length > 0 && (
            <motion.div variants={item}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-emerald-500" />
                      Recent Assignments
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary"
                      onClick={() => navigate("/assignments")}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {assignments.slice(0, 4).map((a) => {
                      const subCount = (a.submissions || []).length;
                      const scanCount = (a.analyses || []).length;
                      return (
                        <div
                          key={a._id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => navigate(`/assignments/${a._id}`)}
                        >
                          <div className="p-2 rounded-lg bg-emerald-500/10">
                            <GraduationCap className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{a.title}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {subCount} submission{subCount !== 1 ? "s" : ""}
                              </span>
                              <span>{scanCount} scan{scanCount !== 1 ? "s" : ""}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {timeAgo(a.updated_at || a.created_at)}
                              </span>
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
