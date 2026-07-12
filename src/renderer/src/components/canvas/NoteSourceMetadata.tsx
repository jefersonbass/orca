import React from 'react'
import type { NoteInsertionSource } from './note-insertion-types'

interface NoteSourceMetadataProps {
  source: NoteInsertionSource
}

/**
 * Displays source provenance metadata in a compact inline format.
 * Shown in the preview dialog and in the note after insertion.
 */
export const NoteSourceMetadata: React.FC<NoteSourceMetadataProps> = React.memo(
  ({ source }) => {
    return (
      <div
        className="rounded border border-worktree-sidebar-border bg-worktree-sidebar/50 px-3 py-2 text-[11px] leading-relaxed text-worktree-sidebar-foreground/50"
        role="contentinfo"
        aria-label="Source information"
      >
        <div className="flex items-center gap-2">
          <SourceBadge type={source.sourceType} />
          <span>{source.sourceLabel}</span>
        </div>
        <div className="mt-1 flex gap-4">
          <span>
            Author: <span className="text-worktree-sidebar-foreground/70">{source.author}</span>
          </span>
          <span>
            Type: <span className="text-worktree-sidebar-foreground/70">{source.sourceType}</span>
          </span>
          {source.worktreeId && (
            <span>
              Worktree:{' '}
              <span className="text-worktree-sidebar-foreground/70">{source.worktreeId}</span>
            </span>
          )}
        </div>
      </div>
    )
  }
)
NoteSourceMetadata.displayName = 'NoteSourceMetadata'

const SourceBadge: React.FC<{ type: string }> = ({ type }) => {
  const colors: Record<string, string> = {
    'terminal-output': 'bg-green-500/20 text-green-400',
    'terminal-selection': 'bg-green-500/20 text-green-400',
    'agent-response': 'bg-yellow-500/20 text-yellow-400',
    'agent-summary': 'bg-yellow-500/20 text-yellow-400',
    'task-summary': 'bg-blue-500/20 text-blue-400',
    'error-report': 'bg-red-500/20 text-red-400',
    'diff-summary': 'bg-purple-500/20 text-purple-400',
  }
  const label: Record<string, string> = {
    'terminal-output': 'Terminal',
    'terminal-selection': 'Selection',
    'agent-response': 'Agent',
    'agent-summary': 'Agent Summary',
    'task-summary': 'Task',
    'error-report': 'Error',
    'diff-summary': 'Diff',
  }
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
        colors[type] ?? 'bg-gray-500/20 text-gray-400'
      }`}
    >
      {label[type] ?? type}
    </span>
  )
}
