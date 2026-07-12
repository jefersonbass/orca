import React from 'react'
import { getInsertionHistory } from './note-insertion-service'

/**
 * Displays a history of all note insertions.
 * Each entry shows source, target, timestamp, and author.
 * Used for audit and provenance tracking.
 */
export const NoteInsertionHistory: React.FC = React.memo(() => {
  const entries = getInsertionHistory()

  if (entries.length === 0) {
    return (
      <div className="p-4 text-center text-[12px] text-worktree-sidebar-foreground/30">
        No insertions yet
      </div>
    )
  }

  return (
    <div className="space-y-2" role="log" aria-label="Note insertion history">
      <div className="px-3 py-1.5 text-[11px] font-medium text-worktree-sidebar-foreground/40">
        Insertion History
      </div>
      {entries.map((entry) => (
        <div
          key={entry.insertionId}
          className="rounded border border-worktree-sidebar-border/50 px-3 py-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SourceTypeIcon type={entry.sourceType} />
              <span className="text-[12px] text-worktree-sidebar-foreground/70">
                {entry.sourceLabel}
              </span>
            </div>
            <span className="text-[10px] text-worktree-sidebar-foreground/30">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-worktree-sidebar-foreground/40">
            → {entry.targetNoteLabel || entry.targetNoteId}
          </div>
          <div className="mt-0.5 text-[10px] text-worktree-sidebar-foreground/30">
            by {entry.author}
          </div>
        </div>
      ))}
    </div>
  )
})
NoteInsertionHistory.displayName = 'NoteInsertionHistory'

const SourceTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  const icons: Record<string, string> = {
    'terminal-output': '💻',
    'terminal-selection': '🔍',
    'agent-response': '🤖',
    'agent-summary': '📋',
    'task-summary': '📌',
    'error-report': '⚠️',
    'diff-summary': '📊',
  }
  return <span aria-hidden="true">{icons[type] ?? '📝'}</span>
}
