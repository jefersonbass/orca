// ── Agent Reference ──

export type CanvasAgentReference = {
  agentSessionId: string
  terminalTabId?: string
  paneKey?: string
  provider: string
  model?: string
  worktreeId?: string
}

// ── Operational Bindings ──

export type ContextMode = 'full-content' | 'selected-section' | 'summary' | 'reference-only'

export type ContextBinding = {
  id: string
  kind: 'context'
  sourceNodeId: string
  targetAgentNodeId: string
  contextMode: ContextMode
  lastContentHash?: string
  enabled: boolean
  createdAt: string
}

export type DelegationPermission = 'propose-task' | 'assign-task' | 'request-review' | 'request-fix'

export type DelegationBinding = {
  id: string
  kind: 'delegation'
  sourceAgentNodeId: string
  targetAgentNodeId: string
  permission: DelegationPermission
  requiresUserApproval: boolean
  enabled: boolean
  createdAt: string
}

export type OutputMode = 'append-progress' | 'append-decisions' | 'append-errors' | 'append-summary' | 'replace-agent-owned-section'
export type ApprovalMode = 'always-review' | 'auto-append-agent-section'

export type OutputBinding = {
  id: string
  kind: 'output'
  sourceAgentNodeId: string
  targetNoteNodeId: string
  outputMode: OutputMode
  approvalMode: ApprovalMode
  enabled: boolean
  createdAt: string
}

export type ReportMode = 'status' | 'result' | 'blocked' | 'review-result'

export type ReportingBinding = {
  id: string
  kind: 'reporting'
  sourceAgentNodeId: string
  targetAgentNodeId: string
  reportMode: ReportMode
  enabled: boolean
  createdAt: string
}

export type CanvasOperationalBinding = ContextBinding | DelegationBinding | OutputBinding | ReportingBinding

// ── Agent Messages ──

export type AgentMessageType = 'instruction' | 'delegation' | 'review-request' | 'fix-request' | 'status' | 'blocked' | 'result' | 'question'
export type MessageDeliveryState = 'draft' | 'awaiting-approval' | 'queued' | 'delivering' | 'delivered' | 'acknowledged' | 'failed' | 'cancelled'
export type CanvasTransitionActor = 'user' | 'agent' | 'system'
export type CanvasStateTransition = { from: string; to: string; at: string; actor: CanvasTransitionActor; reason?: string }

export type AgentCanvasMessage = {
  id: string
  fromAgentId?: string
  toAgentId: string
  taskId?: string
  type: AgentMessageType
  content: string
  contextRefs: Array<{ nodeId: string; resourceType: string; snapshotHash?: string }>
  createdAt: string
  deliveryState: MessageDeliveryState
  deliveryError?: string
  providerReceipt?: string
  deliveredAt?: string
  transitions?: CanvasStateTransition[]
}

// ── Agent Tasks ──

export type CanvasAgentTaskState = 'draft' | 'awaiting-approval' | 'ready' | 'assigned' | 'running' | 'waiting-for-input' | 'blocked' | 'completed' | 'failed' | 'cancelled' | 'interrupted'

export type CanvasAgentTask = {
  id: string
  title: string
  description: string
  createdBy: 'user' | 'lead-agent'
  assignedAgentId?: string
  parentTaskId?: string
  worktreeId?: string
  contextBindingIds: string[]
  outputBindingIds: string[]
  state: CanvasAgentTaskState
  resultSummary?: string
  createdAt: string
  updatedAt: string
  transitions?: CanvasStateTransition[]
}

// ── Collaboration Session ──

export type CollaborationSessionState = 'draft' | 'awaiting-approval' | 'active' | 'paused' | 'blocked' | 'completed' | 'failed' | 'cancelled' | 'interrupted'

export type CollaborationSession = {
  id: string
  leadAgentNodeId: string
  subordinateAgentNodeIds: string[]
  tasks: CanvasAgentTask[]
  messages: AgentCanvasMessage[]
  state: CollaborationSessionState
  createdAt: string
  updatedAt: string
  transitions?: CanvasStateTransition[]
}

export type CanvasWorkspaceOrchestration = {
  bindings: CanvasOperationalBinding[]
  messages: AgentCanvasMessage[]
  tasks: CanvasAgentTask[]
  sessions: CollaborationSession[]
}
