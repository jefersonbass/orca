import React, { useCallback, useState, useMemo } from 'react'
import { NoteAppendPreview } from './NoteAppendPreview'
import { NoteSourceMetadata } from './NoteSourceMetadata'
import { createInsertionPreview } from './note-insertion-service'
import type { NoteInsertionSource, NoteInsertionPreview } from './note-insertion-types'

export type DialogMode = 'select-action' | 'select-note' | 'preview' | 'create-note'

interface KnowledgeArtifactDialogProps {
  source: NoteInsertionSource
  content: string
  availableNotes: Array<{ id: string; label: string }>
  onAppend: (noteId: string, preview: NoteInsertionPreview) => void
  onCreateNote: (label: string, preview: NoteInsertionPreview) => void
  onClose: () => void
}

/**
 * KnowledgeArtifactDialog guides the user through the workflow:
 *   Resource → User action → Preview → Approval → Insert → Audit
 *
 * No shortcuts are allowed. Every insertion goes through the full flow.
 */
export const KnowledgeArtifactDialog: React.FC<KnowledgeArtifactDialogProps> = ({
  source,
  content,
  availableNotes,
  onAppend,
  onCreateNote,
  onClose,
}) => {
  const [mode, setMode] = useState<DialogMode>('select-action')
  const [selectedNoteId, setSelectedNoteId] = useState<string>('')
  const [newNoteLabel, setNewNoteLabel] = useState('')

  const preview = useMemo(
    () => createInsertionPreview({ source, content, mode: 'append' }),
    [source, content]
  )

  const handleAppend = useCallback(() => {
    if (!selectedNoteId) return
    onAppend(selectedNoteId, preview)
    onClose()
  }, [selectedNoteId, preview, onAppend, onClose])

  const handleCreate = useCallback(() => {
    const label = newNoteLabel || `${source.sourceLabel} — ${new Date().toLocaleDateString()}`
    onCreateNote(label, preview)
    onClose()
  }, [newNoteLabel, source.sourceLabel, preview, onCreateNote, onClose])

  // ── Step 1: Choose action ──
  if (mode === 'select-action') {
    return (
      <DialogShell title="Send to Note" onClose={onClose}>
        <div className="space-y-2">
          <DialogButton
            label={
              <span>
                Create New Note
                <span className="ml-2 text-worktree-sidebar-foreground/30 text-[11px]">
                  Creates a new note node on the canvas
                </span>
              </span>
            }
            onClick={() => setMode('create-note')}
          />
          {availableNotes.length > 0 && (
            <DialogButton
              label={
                <span>
                  Append to Existing Note
                  <span className="ml-2 text-worktree-sidebar-foreground/30 text-[11px]">
                    Adds content to an existing note
                  </span>
                </span>
              }
              onClick={() => setMode('select-note')}
            />
          )}
          <DialogButton label="Cancel" onClick={onClose} />
        </div>
      </DialogShell>
    )
  }

  // ── Step 2a: Select target note ──
  if (mode === 'select-note') {
    return (
      <DialogShell title="Select Note" onClose={onClose}>
        <NoteSourceMetadata source={source} />
        <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">
          {availableNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => {
                setSelectedNoteId(note.id)
                setMode('preview')
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[13px] text-worktree-sidebar-foreground/70 transition-colors hover:bg-worktree-sidebar-foreground/5"
            >
              <span className="text-worktree-sidebar-foreground/30">📝</span>
              {note.label}
            </button>
          ))}
        </div>
      </DialogShell>
    )
  }

  // ── Step 2b: Create new note ──
  if (mode === 'create-note') {
    return (
      <DialogShell title="Create Note" onClose={onClose}>
        <NoteSourceMetadata source={source} />
        <div className="mt-3">
          <label className="text-[12px] text-worktree-sidebar-foreground/50" htmlFor="note-label">
            Note label
          </label>
          <input
            id="note-label"
            value={newNoteLabel}
            onChange={(e) => setNewNoteLabel(e.target.value)}
            placeholder={source.sourceLabel}
            className="mt-1 w-full rounded border border-worktree-sidebar-border bg-worktree-sidebar px-3 py-1.5 text-[13px] text-worktree-sidebar-foreground outline-none focus:border-blue-500"
            autoFocus
          />
        </div>
        <NoteAppendPreview
          source={source}
          preview={preview}
          existingContentLength={0}
        />
        <div className="mt-4 flex justify-end gap-2">
          <DialogButton label="Back" onClick={() => setMode('select-action')} />
          <DialogButton label="Create Note" onClick={handleCreate} variant="primary" />
        </div>
      </DialogShell>
    )
  }

  // ── Step 3: Preview ──
  if (mode === 'preview') {
    return (
      <DialogShell title="Preview Insertion" onClose={onClose}>
        <NoteAppendPreview
          source={source}
          preview={preview}
          existingContentLength={0}
        />
        <div className="mt-4 flex justify-end gap-2">
          <DialogButton label="Back" onClick={() => setMode('select-note')} />
          <DialogButton label="Approve & Insert" onClick={handleAppend} variant="primary" />
        </div>
      </DialogShell>
    )
  }

  return null
}

// ── Dialog Shell ──

const DialogShell: React.FC<{
  title: string
  onClose: () => void
  children: React.ReactNode
}> = ({ title, onClose, children }) => (
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}
    onKeyDown={(e) => {
      if (e.key === 'Escape') onClose()
    }}
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <div className="w-[480px] rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-worktree-sidebar-foreground">{title}</h2>
        <button
          onClick={onClose}
          className="size-6 rounded text-worktree-sidebar-foreground/30 hover:text-worktree-sidebar-foreground/70"
          aria-label="Close dialog"
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
)

// ── Dialog Button ──

interface DialogButtonProps {
  label: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'primary'
}

const DialogButton: React.FC<DialogButtonProps> = ({ label, onClick, variant = 'default' }) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center rounded-lg px-4 py-2.5 text-left text-[13px] font-medium transition-colors ${
      variant === 'primary'
        ? 'bg-blue-600 text-white hover:bg-blue-500'
        : 'text-worktree-sidebar-foreground/70 hover:bg-worktree-sidebar-foreground/5'
    }`}
  >
    {label}
  </button>
)
