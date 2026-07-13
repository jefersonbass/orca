// ── Canvas Node Types ──

export type CanvasNodeType =
  | 'terminal-summary'
  | 'agent-summary'
  | 'missing-resource'
  | 'note'
  | 'sticky-note'
  | 'group'
  | 'label'
  | 'rectangle'
  | 'arrow'
  | 'highlight'
  | 'live-terminal'
  | 'agent-terminal'
  | 'file'
  | 'folder'
  | 'diff'
  | 'pull-request'
  | 'task'
  | 'browser-preview'
  | 'browser-session'
  | 'orchestrator'
  | 'drawing'

// ── Resource References ──

export type CanvasResourceReference =
  | { kind: 'terminal-tab'; tabId: string; worktreeId: string }
  | { kind: 'agent-pane'; tabId: string; leafId?: string; worktreeId: string; paneKey?: string }
  | { kind: 'live-terminal'; paneKey: string; sessionId?: string }
  | { kind: 'agent-terminal'; paneKey: string; provider?: string; sessionId?: string; transcriptPath?: string; captureMode?: 'native-transcript' | 'terminal-scrape' }
  | { kind: 'file'; worktreeId: string; relativePath: string }
  | { kind: 'folder'; worktreeId: string; relativePath: string }
  | { kind: 'diff'; worktreeId: string; diffId: string }
  | { kind: 'pull-request'; source: 'github' | 'gitlab'; id: string }
  | { kind: 'task'; source: 'orca' | 'github' | 'gitlab' | 'linear' | 'jira'; taskId: string }
  | { kind: 'browser-preview'; url: string; title?: string }
  | { kind: 'browser-session'; sessionId: string; workspaceId?: string }

// ── Semantic Edge ──

export type EdgeRelationshipType =
  | 'implements'
  | 'modifies'
  | 'generates'
  | 'documents'
  | 'reviews'
  | 'depends-on'
  | 'blocks'
  | 'uses'
  | 'created-from'
  | 'related-to'
  | 'assigned-to'
  | 'owned-by'

export type CanvasEdgeDocument = {
  id: string
  sourceNodeId: string
  targetNodeId: string
  type: 'visual' | EdgeRelationshipType
  label?: string
  color?: string
  /** Semantic metadata */
  relationship?: EdgeRelationshipType
  createdBy?: 'user' | 'agent' | 'system'
  timestamp?: string
  worktreeId?: string
  comment?: string
}

// ── Node Document ──

export type CanvasNodeDocument = {
  id: string
  type: CanvasNodeType
  resourceRef?: CanvasResourceReference
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  label: string
  color?: string
  groupId?: string
  /** Type-specific metadata (note content, shape style, etc.) */
  metadata?: Record<string, unknown>
}

// ── Canvas Document ──

export type CanvasDocument = {
  version: 2
  viewport: { x: number; y: number; zoom: number }
  nodes: CanvasNodeDocument[]
  edges: CanvasEdgeDocument[]
}

// ── Undo/Redo ──

export type CanvasUndoAction =
  | { type: 'move-node'; nodeId: string; from: { x: number; y: number }; to: { x: number; y: number } }
  | { type: 'resize-node'; nodeId: string; from: { width: number; height: number }; to: { width: number; height: number } }
  | { type: 'add-node'; node: CanvasNodeDocument }
  | { type: 'remove-node'; node: CanvasNodeDocument }
  | { type: 'add-edge'; edge: CanvasEdgeDocument }
  | { type: 'remove-edge'; edge: CanvasEdgeDocument }
  | { type: 'edit-node'; nodeId: string; from: Partial<CanvasNodeDocument>; to: Partial<CanvasNodeDocument> }

export type CanvasUndoStack = {
  past: CanvasUndoAction[]
  future: CanvasUndoAction[]
  maxSize: number
}
