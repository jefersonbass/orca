import type { CanvasNodeType } from '../../../../shared/canvas-types'
import type { CanvasOperationalBinding, ContextMode, ApprovalMode } from '../../../../shared/canvas-agent-types'

export type BindingKind = CanvasOperationalBinding['kind']
type OperationalCategory = 'note' | 'agent' | 'context-resource' | 'unsupported'

function category(type: CanvasNodeType): OperationalCategory {
  if (type === 'note' || type === 'sticky-note') return 'note'
  // A terminal created with an agent preset (OpenCode, Codex, Claude, etc.)
  // is persisted as `live-terminal`; it still participates in the agent graph.
  if (type === 'live-terminal' || type === 'agent-terminal' || type === 'agent-summary' || type === 'orchestrator') return 'agent'
  if (
    type === 'file' || type === 'folder' || type === 'task' || type === 'diff' ||
    type === 'pull-request' || type === 'browser-preview' || type === 'browser-session' ||
    type === 'label' || type === 'rectangle' || type === 'highlight' || type === 'drawing' ||
    type === 'terminal-summary' || type === 'missing-resource'
  ) return 'context-resource'
  return 'unsupported'
}

export function allowedBindingKinds(source: CanvasNodeType, target: CanvasNodeType): BindingKind[] {
  const from = category(source)
  const to = category(target)
  if ((from === 'note' || from === 'context-resource') && to === 'agent') return ['context']
  if (from === 'agent' && to === 'note') return ['output']
  if (from === 'agent' && to === 'agent') return ['delegation', 'reporting']
  return []
}

export function createOperationalBinding(args: {
  kind: BindingKind
  sourceNodeId: string
  targetNodeId: string
  contextMode?: ContextMode
  approvalMode?: ApprovalMode
}): CanvasOperationalBinding {
  const common = { id: `${args.kind}_${crypto.randomUUID()}`, enabled: true, createdAt: new Date().toISOString() }
  switch (args.kind) {
    case 'context': return { ...common, kind: 'context', sourceNodeId: args.sourceNodeId, targetAgentNodeId: args.targetNodeId, contextMode: args.contextMode ?? 'full-content' }
    case 'delegation': return { ...common, kind: 'delegation', sourceAgentNodeId: args.sourceNodeId, targetAgentNodeId: args.targetNodeId, permission: 'assign-task', requiresUserApproval: true }
    case 'output': return { ...common, kind: 'output', sourceAgentNodeId: args.sourceNodeId, targetNoteNodeId: args.targetNodeId, outputMode: 'append-progress', approvalMode: args.approvalMode ?? 'always-review' }
    case 'reporting': return { ...common, kind: 'reporting', sourceAgentNodeId: args.sourceNodeId, targetAgentNodeId: args.targetNodeId, reportMode: 'status' }
  }
}
