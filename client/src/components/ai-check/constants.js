import { FileCode, FileText, FileArchive } from "lucide-react"

export const DETECTION_TYPES = [
  {
    value: "code",
    label: "AI Code Detection",
    description: "Structural & textual AST-based analysis of source code",
    icon: FileCode,
    color: "text-violet-500",
    extensions: [".py", ".java", ".cpp", ".js", ".c", ".cs", ".zip"],
    extensionsLabel: ".py, .java, .cpp, .js, .c, .cs",
    pasteLabel: "Paste Code",
    placeholder: "Paste your code here…",
    hasLanguageSelector: true,
    mono: true,
  },
  {
    value: "text",
    label: "AI Text Detection",
    description: "Multi-layer ML pipeline detecting AI-generated essays & documents",
    icon: FileText,
    color: "text-sky-500",
    extensions: [".txt", ".pdf", ".docx", ".zip"],
    extensionsLabel: ".txt, .pdf, .docx",
    pasteLabel: "Paste Text",
    placeholder: "Paste your text here…",
    hasLanguageSelector: false,
    mono: false,
  },
]

export const LANGUAGE_OPTIONS = [
  { value: "python", label: "Python", ext: ".py" },
  { value: "java", label: "Java", ext: ".java" },
  { value: "cpp", label: "C++", ext: ".cpp" },
  { value: "javascript", label: "JavaScript", ext: ".js" },
  { value: "c", label: "C", ext: ".c" },
  { value: "csharp", label: "C#", ext: ".cs" },
]

export function formatBytes(bytes) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function getFileIcon(name) {
  const ext = name.split(".").pop().toLowerCase()
  if (ext === "zip") return FileArchive
  const codeExts = ["py", "java", "cpp", "js", "c", "cs"]
  if (codeExts.includes(ext)) return FileCode
  return FileText
}
