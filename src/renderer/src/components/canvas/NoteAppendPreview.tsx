import React from 'react'
import type { NoteInsertionPreview, NoteInsertionSource } from './note-insertion-types'
import { NoteSourceMetadata } from './NoteSourceMetadata'

interface NoteAppendPreviewProps {
  source: NoteInsertionSource
  preview: NoteInsertionPreview
  existingContentLength: number
}

/**
 * Shows a preview of what will be inserted into a note, including
 * the formatted content and metadata. The user reviews this before
 * approving the insertion.
 */
export const NoteAppendPreview: React.FC<NoteAppendPreviewProps> = React.memo(
  ({ source, preview, existingContentLength }) => {
    return (
      <div className="space-y-3" role="region" aria-label="Insertion preview">
        {/* Source metadata */}
        <NoteSourceMetadata source={source} />

        {/* Stats */}
        <div className="flex gap-4 text-[11px] text-worktree-sidebar-foreground/40">
          <span>Lines: {preview.lineCount}</span>
          <span>Characters: {preview.characterCount}</span>
          <span>
            Note size: {(existingContentLength + preview.characterCount).toLocaleString()} chars
          </span>
        </div>

        {/* Preview content */}
        <div className="max-h-64 overflow-y-auto rounded border border-worktree-sidebar-border bg-worktree-sidebar/30 p-3">
          <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-worktree-sidebar-foreground/80">
            {preview.fullContent}
          </pre>
        </div>
      </div>
    )
  }
)
NoteAppendPreview.displayName = 'NoteAppendPreview'
