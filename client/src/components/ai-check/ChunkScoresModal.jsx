import { motion } from "framer-motion"
import { ChevronRight, Layers } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

function barColor(pct) {
  if (pct >= 65) return "[&>div]:bg-red-500"
  if (pct >= 40) return "[&>div]:bg-amber-500"
  return "[&>div]:bg-green-500"
}

function textColor(pct) {
  if (pct >= 65) return "text-red-600 dark:text-red-400"
  if (pct >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-muted-foreground"
}

function verdictBadgeClasses(verdict) {
  if (verdict === "Likely AI")
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
  if (verdict === "Review Recommended")
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
  return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
}

function ChunkTextPreview({ text }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs text-primary font-medium select-none flex items-center gap-1">
        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
        Show text
      </summary>
      <div className="mt-2 p-3 rounded-md bg-muted/50 border border-border/50 max-h-60 overflow-y-auto">
        <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
          {text}
        </p>
      </div>
    </details>
  )
}

export default function ChunkScoresModal({ open, onOpenChange, chunkScores, overallScore }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Chunk-wise Analysis
          </DialogTitle>
          <DialogDescription>
            The document was split into {chunkScores.length} chunks and each was analyzed independently.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-3 py-1">
          {chunkScores.map((chunk) => {
            const pct = chunk.score * 100
            return (
              <motion.div
                key={chunk.chunk_index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: chunk.chunk_index * 0.05 }}
                className="p-4 rounded-lg border bg-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      Chunk {chunk.chunk_index + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({chunk.word_count} words)
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${verdictBadgeClasses(chunk.verdict)}`}
                  >
                    {chunk.verdict}
                  </Badge>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">AI Probability</span>
                    <span className={`text-xs font-mono font-semibold tabular-nums ${textColor(pct)}`}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(pct, 100)}
                    className={`h-2 ${barColor(pct)}`}
                  />
                </div>

                {chunk.text && <ChunkTextPreview text={chunk.text} />}
              </motion.div>
            )
          })}
        </div>

        <div className="border-t pt-4 -mx-6 px-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Aggregated Score</span>
            <span className={`text-sm font-mono font-bold tabular-nums ${textColor(overallScore * 100)}`}>
              {(overallScore * 100).toFixed(1)}%
            </span>
          </div>
          <Progress
            value={Math.min(overallScore * 100, 100)}
            className={`h-2 mt-1.5 ${barColor(overallScore * 100)}`}
          />
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
