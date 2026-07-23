/**
 * NoteInsertionService
 *
 * Handles manual insertion of terminal output, agent responses, and other
 * resource content into Canvas notes. Every insertion is:
 *
 * 1. User-initiated (no automatic triggers)
 * 2. Previewed before approval
 * 3. Explicitly approved by the user
 * 4. Timestamped and attributed
 * 5. Auditable
 *
 * Product principle: Notes are human-owned knowledge. Agents contribute with
 * permission. No silent modification.
 */

import type {
  NoteInsertionRequest,
  NoteInsertionResult,
  NoteInsertionPreview,
  NoteInsertionSource,
  NoteInsertionHistoryEntry,
} from './note-insertion-types'

let insertionCounter = 0
const HISTORY_KEY = 'canvas-insertion-history'

// ── History Store (persisted to localStorage) ──

function hasLocalStorage(): boolean {
  try { return typeof localStorage !== 'undefined' } catch { return false }
}

function loadHistory(): NoteInsertionHistoryEntry[] {
  if (!hasLocalStorage()) return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(entries: NoteInsertionHistoryEntry[]): void {
  if (!hasLocalStorage()) return
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
  } catch {
    // localStorage may be full
  }
}

let insertionHistory: NoteInsertionHistoryEntry[] = loadHistory()

export function getInsertionHistory(): NoteInsertionHistoryEntry[] {
  return [...insertionHistory]
}

export function clearInsertionHistory(): void {
  insertionHistory = []
  if (hasLocalStorage()) {
    localStorage.removeItem(HISTORY_KEY)
  }
}

// ── Formatting ──

function formatTimestamp(): string {
  return new Date().toISOString()
}

function formatHeading(sourceType: string): string {
  const headings: Record<string, string> = {
    'terminal-output': '## Terminal Output',
    'terminal-selection': '## Terminal Selection',
    'agent-response': '## Agent Response',
    'agent-summary': '## Agent Summary',
    'task-summary': '## Task Summary',
    'error-report': '## Error Report',
    'diff-summary': '## Diff Summary',
  }
  return headings[sourceType] ?? '## Note'
}

function buildMetadataBlock(source: NoteInsertionSource): string {
  const lines: string[] = []
  lines.push(`Source: ${source.sourceLabel}`)
  lines.push(`Author: ${source.author}`)
  lines.push(`Timestamp: ${formatTimestamp()}`)
  if (source.worktreeId) lines.push(`Worktree: ${source.worktreeId}`)
  return lines.map((l) => `> ${l}`).join('\n')
}

/**
 * Formats source content with attribution metadata.
 */
export function formatInsertion(
  source: NoteInsertionSource,
  content: string
): NoteInsertionPreview {
  const heading = formatHeading(source.sourceType)
  const metadataBlock = buildMetadataBlock(source)
  const contentBlock = content.trim() ? `\`\`\`\n${content.trim()}\n\`\`\`` : ''

  const parts = [heading, '', metadataBlock, '']
  if (contentBlock) parts.push(contentBlock)

  const fullContent = parts.join('\n')

  return {
    formattedContent: contentBlock,
    metadataBlock,
    fullContent,
    characterCount: fullContent.length,
    lineCount: fullContent.split('\n').length,
  }
}

/**
 * Creates a preview of what will be inserted into a note.
 */
export function createInsertionPreview(
  request: NoteInsertionRequest
): NoteInsertionPreview {
  return formatInsertion(request.source, request.content)
}

// ── Insertion ──

function generateInsertionId(): string {
  insertionCounter++
  return `insert_${Date.now()}_${insertionCounter}`
}

/**
 * Appends formatted content to a note node's metadata content.
 * Returns the updated content string.
 */
export function appendToNoteContent(
  existingContent: string | undefined,
  preview: NoteInsertionPreview
): string {
  const separator = existingContent ? '\n\n---\n\n' : ''
  return `${existingContent ?? ''}${separator}${preview.fullContent}`
}

/**
 * Executes a note insertion: formats content, appends to the target note,
 * and creates an audit record.
 */
export function executeInsertion(
  request: NoteInsertionRequest,
  preview: NoteInsertionPreview,
  targetNoteId: string
): NoteInsertionResult {
  const insertionId = generateInsertionId()
  const timestamp = formatTimestamp()

  const result: NoteInsertionResult = {
    insertionId,
    sourceType: request.source.sourceType,
    sourceId: request.source.sourceId,
    targetNoteId,
    approvedBy: 'user',
    timestamp,
    author: request.source.author,
    mode: request.source.sourceType === 'terminal-output' ? 'append' : 'append',
  }

  // Record in history and persist
  insertionHistory.push({
    insertionId,
    sourceType: request.source.sourceType,
    sourceLabel: request.source.sourceLabel,
    targetNoteId,
    targetNoteLabel: '',
    timestamp,
    author: request.source.author,
    contentPreview: preview.fullContent.substring(0, 120),
  })
  saveHistory(insertionHistory)

  return result
}

// ── Note Creation ──

/**
 * Creates a new NoteNode document from source content.
 */
export function createNoteFromSource(
  source: NoteInsertionSource,
  preview: NoteInsertionPreview,
  label: string
): {
  id: string
  type: 'note'
  label: string
  content: string
  color?: string
} {
  const noteId = `note_${Date.now()}_${insertionCounter++}`
  return {
    id: noteId,
    type: 'note',
    label,
    content: preview.fullContent,
    color: source.sourceType === 'error-report' ? '#ef4444' : undefined,
  }
}

// ── Source Helpers ──

export function buildTerminalSource(
  label: string,
  terminalId: string,
  worktreeId?: string
): NoteInsertionSource {
  return {
    sourceType: 'terminal-output',
    sourceId: terminalId,
    sourceLabel: label,
    author: label,
    authorType: 'user',
    worktreeId,
  }
}

export function buildAgentSource(
  label: string,
  agentId: string,
  provider?: string,
  worktreeId?: string
): NoteInsertionSource {
  return {
    sourceType: 'agent-response',
    sourceId: agentId,
    sourceLabel: `${label}${provider ? ` (${provider})` : ''}`,
    author: label,
    authorType: 'agent',
    worktreeId,
  }
}
