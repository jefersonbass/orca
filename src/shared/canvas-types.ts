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
  | { kind: 'browser-preview'; url: string; title?: string; tabId?: string; worktreeId?: string }
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

const CANVAS_NODE_TYPES: ReadonlySet<string> = new Set([
  'terminal-summary', 'agent-summary', 'missing-resource', 'note', 'sticky-note',
  'group', 'label', 'rectangle', 'arrow', 'highlight', 'live-terminal',
  'agent-terminal', 'file', 'folder', 'diff', 'pull-request', 'task',
  'browser-preview', 'browser-session', 'orchestrator', 'drawing',
])

const CANVAS_EDGE_RELATIONSHIPS: ReadonlySet<string> = new Set([
  'implements', 'modifies', 'generates', 'documents', 'reviews', 'depends-on',
  'blocks', 'uses', 'created-from', 'related-to', 'assigned-to', 'owned-by',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/**
 * Makes persisted canvas state safe to render after schema changes or partial writes.
 * Unknown nodes are kept as notes so the user can recover their content instead of
 * crashing React Flow during startup.
 */
export function normalizeCanvasDocument(input: unknown): CanvasDocument {
  const rawDocument = isRecord(input) ? input : {}
  const rawNodes = Array.isArray(rawDocument.nodes) ? rawDocument.nodes : []
  const nodeIds = new Set<string>()
  const nodes: CanvasNodeDocument[] = rawNodes.flatMap((value, index) => {
    if (!isRecord(value)) return []
    const id = typeof value.id === 'string' && value.id.trim() ? value.id : `recovered_node_${index}`
    if (nodeIds.has(id)) return []
    nodeIds.add(id)
    const rawPosition = isRecord(value.position) ? value.position : {}
    const rawSize = isRecord(value.size) ? value.size : {}
    const rawMetadata = isRecord(value.metadata) ? value.metadata : undefined
    const rawType = typeof value.type === 'string' ? value.type : ''
    const type = (CANVAS_NODE_TYPES.has(rawType) ? rawType : 'note') as CanvasNodeType
    return [{
      id,
      type,
      position: {
        x: finiteNumber(rawPosition.x, 0),
        y: finiteNumber(rawPosition.y, 0),
      },
      size: {
        width: Math.max(40, finiteNumber(rawSize.width, 200)),
        height: Math.max(40, finiteNumber(rawSize.height, 100)),
      },
      zIndex: finiteNumber(value.zIndex, index + 1),
      label: typeof value.label === 'string' ? value.label : type,
      ...(typeof value.color === 'string' ? { color: value.color } : {}),
      ...(typeof value.groupId === 'string' && value.groupId.trim() ? { groupId: value.groupId } : {}),
      ...(rawMetadata ? { metadata: rawMetadata } : {}),
      ...(isRecord(value.resourceRef) ? { resourceRef: value.resourceRef as CanvasResourceReference } : {}),
    }]
  })

  const edges: CanvasEdgeDocument[] = (Array.isArray(rawDocument.edges) ? rawDocument.edges : []).flatMap((value, index) => {
    if (!isRecord(value)) return []
    const sourceNodeId = typeof value.sourceNodeId === 'string' ? value.sourceNodeId : ''
    const targetNodeId = typeof value.targetNodeId === 'string' ? value.targetNodeId : ''
    if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId || !nodeIds.has(sourceNodeId) || !nodeIds.has(targetNodeId)) return []
    const rawType = typeof value.type === 'string' ? value.type : 'visual'
    const type = rawType === 'visual' || CANVAS_EDGE_RELATIONSHIPS.has(rawType)
      ? rawType as CanvasEdgeDocument['type']
      : 'visual'
    const relationship = typeof value.relationship === 'string' && CANVAS_EDGE_RELATIONSHIPS.has(value.relationship)
      ? value.relationship as CanvasEdgeDocument['relationship']
      : undefined
    return [{
      id: typeof value.id === 'string' && value.id.trim() ? value.id : `recovered_edge_${index}`,
      sourceNodeId,
      targetNodeId,
      type,
      ...(relationship ? { relationship } : {}),
      ...(typeof value.label === 'string' ? { label: value.label } : {}),
      ...(typeof value.color === 'string' ? { color: value.color } : {}),
      ...(typeof value.comment === 'string' ? { comment: value.comment } : {}),
    }]
  })

  const rawViewport = isRecord(rawDocument.viewport) ? rawDocument.viewport : {}
  return {
    version: 2,
    viewport: {
      x: finiteNumber(rawViewport.x, 0),
      y: finiteNumber(rawViewport.y, 0),
      zoom: Math.min(5, Math.max(0.1, finiteNumber(rawViewport.zoom, 1))),
    },
    nodes,
    edges,
  }
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
