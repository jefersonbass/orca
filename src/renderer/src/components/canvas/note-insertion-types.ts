// ── Source Types ──

export type NoteInsertionSourceType =
  | 'terminal-output'
  | 'terminal-selection'
  | 'agent-response'
  | 'agent-summary'
  | 'task-summary'
  | 'error-report'
  | 'diff-summary'

// ── Source Reference ──

export interface NoteInsertionSource {
  sourceType: NoteInsertionSourceType
  sourceId: string
  sourceLabel: string
  author: string
  authorType: 'user' | 'agent'
  worktreeId?: string
  workspaceId?: string
}

// ── Insertion Mode ──

export type NoteInsertionMode = 'append' | 'new-note'

// ── Insertion Request ──

export interface NoteInsertionRequest {
  source: NoteInsertionSource
  content: string
  targetNoteId?: string // undefined when creating new note
  mode: NoteInsertionMode
}

// ── Insertion Result ──

export interface NoteInsertionResult {
  insertionId: string
  sourceType: NoteInsertionSourceType
  sourceId: string
  targetNoteId: string
  approvedBy: 'user'
  timestamp: string
  author: string
  mode: NoteInsertionMode
}

// ── Insertion History Entry ──

export interface NoteInsertionHistoryEntry {
  insertionId: string
  sourceType: NoteInsertionSourceType
  sourceLabel: string
  targetNoteId: string
  targetNoteLabel: string
  timestamp: string
  author: string
  contentPreview: string
}

// ── Preview ──

export interface NoteInsertionPreview {
  formattedContent: string
  metadataBlock: string
  fullContent: string
  characterCount: number
  lineCount: number
}
