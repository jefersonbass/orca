import { useAppStore } from '@/store'
import type { AgentCanvasMessage, CanvasOperationalBinding, ContextBinding } from '../../../../shared/canvas-agent-types'
import type { CanvasAgentReference, DelegationBinding, OutputBinding, ReportingBinding } from '../../../../shared/canvas-agent-types'
import type { CanvasNodeDocument } from '../../../../shared/canvas-types'
import { readAgentMessageIds, resolveCanvasAgent, sendInstruction, waitForAgentResponse } from './canvas-provider-adapter'
import { transitionCanvasMessage } from '../../../../shared/canvas-state-machines'
import {
  activateTaskForDelivery,
  advanceSpecificationWorkflow,
  completeSpecificationWorkflowAfterOutput,
  failTaskForDelivery,
  persistWorkflowMessage
} from './canvas-workflow-progression'

function messageId(): string {
  return `msg_${crypto.randomUUID()}`
}

function metadataText(node: CanvasNodeDocument, key: string): string {
  const value = node.metadata?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function nodeContent(nodeId: string): { content: string; resourceType: string } {
  const node = useAppStore.getState().canvasDocument?.nodes.find((item) => item.id === nodeId)
  if (!node) return { content: '', resourceType: 'unknown' }
  const ref = node.resourceRef
  const content = metadataText(node, 'content') || metadataText(node, 'text')
  if (content) return { content, resourceType: node.type }

  switch (node.type) {
    case 'file':
    case 'folder':
      return { content: `Workspace ${node.type}: ${metadataText(node, 'relativePath') || node.label}`, resourceType: node.type }
    case 'diff':
      return { content: `Diff: ${node.label}${metadataText(node, 'diffId') ? `\nID: ${metadataText(node, 'diffId')}` : ''}`, resourceType: node.type }
    case 'pull-request':
      return { content: `Pull request: ${node.label}${metadataText(node, 'id') ? `\nID: ${metadataText(node, 'id')}` : ''}`, resourceType: node.type }
    case 'task':
      return { content: `Task: ${node.label}${metadataText(node, 'taskId') ? `\nID: ${metadataText(node, 'taskId')}` : ''}`, resourceType: node.type }
    case 'browser-preview':
      return { content: `Browser page: ${metadataText(node, 'url') || (ref?.kind === 'browser-preview' ? ref.url : node.label)}`, resourceType: node.type }
    case 'browser-session':
      return { content: `Browser session: ${node.label}${ref?.kind === 'browser-session' ? `\nSession: ${ref.sessionId}` : ''}`, resourceType: node.type }
    default:
      return { content: node.label, resourceType: node.type }
  }
}

function referenceForAgentNode(nodeId: string): CanvasAgentReference | null {
  const node = useAppStore.getState().canvasDocument?.nodes.find((item) => item.id === nodeId)
  const ref = node?.resourceRef
  if (ref?.kind === 'agent-pane') {
    return {
      agentSessionId: '', terminalTabId: ref.tabId,
      paneKey: ref.paneKey ?? (ref.leafId ? `${ref.tabId}:${ref.leafId}` : undefined),
      provider: 'unknown', worktreeId: ref.worktreeId
    }
  }
  if (ref?.kind === 'agent-terminal') {
    return {
      agentSessionId: ref.sessionId ?? '',
      terminalTabId: ref.paneKey.split(':')[0],
      paneKey: ref.paneKey,
      provider: ref.provider ?? 'unknown',
      transcriptPath: ref.transcriptPath,
      captureMode: ref.captureMode
    }
  }
  // Agents created from the Canvas dialog initially point at their terminal
  // tab. The live agent-status index is the authoritative source for the
  // pane/session/provider that appears after the CLI starts, so preserve the
  // tab identity here instead of treating the node as an unbound terminal.
  if (
    ref?.kind === 'terminal-tab' &&
    (node?.type === 'agent-terminal' ||
      (node?.type === 'live-terminal' && typeof node.metadata?.agent === 'string'))
  ) {
    const provider = typeof node.metadata?.agent === 'string' ? node.metadata.agent : 'unknown'
    return {
      // A live terminal can be addressed before its provider publishes a
      // native session record. OpenCode is supported through terminal scrape
      // in that state, so keep a stable synthetic identity for delivery.
      agentSessionId: `canvas-tab:${ref.tabId}`,
      terminalTabId: ref.tabId,
      paneKey: ref.tabId,
      provider,
      worktreeId: ref.worktreeId,
      captureMode: 'terminal-scrape'
    }
  }
  return null
}

export function prepareContextDelivery(binding: ContextBinding, taskId?: string, contentOverride?: string): AgentCanvasMessage {
  const source = nodeContent(binding.sourceNodeId)
  const draft: AgentCanvasMessage = {
    id: messageId(), toAgentId: binding.targetAgentNodeId, taskId, type: 'instruction',
    content: contentOverride ?? source.content,
    contextRefs: [{ nodeId: binding.sourceNodeId, resourceType: source.resourceType }],
    createdAt: new Date().toISOString(), deliveryState: 'draft'
  }
  const message = transitionCanvasMessage(draft, 'awaiting-approval', 'user')
  persistWorkflowMessage(message)
  return message
}

export function prepareDelegationDelivery(binding: DelegationBinding, content: string): AgentCanvasMessage {
  const draft: AgentCanvasMessage = {
    id: messageId(), fromAgentId: binding.sourceAgentNodeId, toAgentId: binding.targetAgentNodeId,
    type: 'delegation', content, contextRefs: [], createdAt: new Date().toISOString(), deliveryState: 'draft'
  }
  const message = transitionCanvasMessage(draft, 'awaiting-approval', 'user')
  persistWorkflowMessage(message)
  return message
}

function contextMessageForBinding(binding: ContextBinding): AgentCanvasMessage | undefined {
  return useAppStore.getState().canvasOrchestration.messages.find((message) =>
    message.type === 'instruction' &&
    message.toAgentId === binding.targetAgentNodeId &&
    message.contextRefs.some((reference) => reference.nodeId === binding.sourceNodeId)
  )
}

/**
 * A context link is useful only when the target agent actually receives the
 * note. Creating a visual edge therefore queues and delivers the first
 * context snapshot automatically. A short retry window covers the normal
 * launch race where the CLI tab exists before its agent hook reports a live
 * session.
 */
export function autoDeliverContextBinding(binding: ContextBinding, attempt = 0): void {
  const existing = contextMessageForBinding(binding)
  if (existing && ['queued', 'delivering', 'delivered', 'acknowledged'].includes(existing.deliveryState)) {
    return
  }
  const message = existing?.deliveryState === 'awaiting-approval'
    ? existing
    : prepareContextDelivery(binding)

  void deliverApprovedCanvasMessage(message.id).then(() => {
    const latest = contextMessageForBinding(binding)
    if (attempt >= 8 || latest?.deliveryState !== 'failed') return
    window.setTimeout(() => autoDeliverContextBinding(binding, attempt + 1), 1_500)
  }).catch(() => {
    if (attempt < 8) {
      window.setTimeout(() => autoDeliverContextBinding(binding, attempt + 1), 1_500)
    }
  })
}

export async function deliverApprovedCanvasMessage(messageIdToDeliver: string): Promise<void> {
  const store = useAppStore.getState()
  const message = store.canvasOrchestration.messages.find((item) => item.id === messageIdToDeliver)
  if (!message || !['awaiting-approval', 'queued'].includes(message.deliveryState)) return
  const owningSession = message.taskId
    ? store.canvasOrchestration.sessions.find((session) => session.tasks.some((task) => task.id === message.taskId))
    : undefined
  if (owningSession && owningSession.state !== 'active') return
  activateTaskForDelivery(message)
  const queued = message.deliveryState === 'queued'
    ? message
    : transitionCanvasMessage(message, 'queued', 'user')
  const ref = referenceForAgentNode(message.toAgentId)
  if (!ref) {
    const delivering = transitionCanvasMessage(queued, 'delivering', 'system')
    persistWorkflowMessage({ ...transitionCanvasMessage(delivering, 'failed', 'system'), deliveryError: 'Target agent node has no live resource reference' })
    failTaskForDelivery(message, 'Target agent node has no live resource reference')
    return
  }
  const target = resolveCanvasAgent(ref, store.agentStatusByPaneKey)
  if (!target.ok) {
    const delivering = transitionCanvasMessage(queued, 'delivering', 'system')
    persistWorkflowMessage({ ...transitionCanvasMessage(delivering, 'failed', 'system'), deliveryError: target.error })
    failTaskForDelivery(message, target.error)
    return
  }
  const delivering = transitionCanvasMessage(queued, 'delivering', 'system')
  persistWorkflowMessage(delivering)
  try {
    const baseline = await readAgentMessageIds(target)
    const delivery = await sendInstruction(target, message)
    if (!delivery.success) {
      persistWorkflowMessage({ ...transitionCanvasMessage(delivering, 'failed', 'system'), deliveryError: delivery.error })
      failTaskForDelivery(message, delivery.error ?? 'Provider delivery failed')
      return
    }
    const delivered = { ...transitionCanvasMessage(delivering, 'delivered', 'system'), providerReceipt: delivery.providerReceipt, deliveredAt: delivery.timestamp }
    persistWorkflowMessage(delivered)
    const response = await waitForAgentResponse({ target, baselineMessageIds: baseline })
    const handledByWorkflow = advanceSpecificationWorkflow(message, response)
    const output = useAppStore.getState().canvasOrchestration.bindings.find((binding): binding is OutputBinding =>
      binding.kind === 'output' && binding.sourceAgentNodeId === message.toAgentId && binding.enabled
    )
    const reporting = useAppStore.getState().canvasOrchestration.bindings.find((binding): binding is ReportingBinding =>
      binding.kind === 'reporting' && binding.sourceAgentNodeId === message.toAgentId && binding.enabled
    )
    const responseDraft: AgentCanvasMessage = {
      id: messageId(), fromAgentId: message.toAgentId,
      toAgentId: output?.targetNoteNodeId ?? reporting?.targetAgentNodeId ?? 'unbound-output', taskId: message.taskId, type: 'result', content: response.content,
      contextRefs: [{ nodeId: message.toAgentId, resourceType: 'agent-response', snapshotHash: response.messageId }],
      createdAt: new Date(response.timestamp ?? Date.now()).toISOString(),
      deliveryState: output || reporting ? 'draft' : 'delivered'
    }
    const responseMessage = output || reporting
      ? transitionCanvasMessage(responseDraft, 'awaiting-approval', 'system')
      : responseDraft
    if (!handledByWorkflow) persistWorkflowMessage(responseMessage)
    persistWorkflowMessage(transitionCanvasMessage(delivered, 'acknowledged', 'system'))
  } catch (error) {
    persistWorkflowMessage({ ...transitionCanvasMessage(delivering, 'failed', 'system'), deliveryError: String(error) })
    failTaskForDelivery(message, String(error))
  }
}

export function approveCanvasOutput(messageIdToAppend: string): void {
  const store = useAppStore.getState()
  const message = store.canvasOrchestration.messages.find((item) => item.id === messageIdToAppend)
  const document = store.canvasDocument
  if (!message || message.type !== 'result' || !document || message.deliveryState !== 'awaiting-approval') return
  const owningSession = message.taskId
    ? store.canvasOrchestration.sessions.find((session) => session.tasks.some((task) => task.id === message.taskId))
    : undefined
  if (owningSession && owningSession.state !== 'active') return
  store.setCanvasDocument({
    ...document,
    nodes: document.nodes.map((node) => {
      if (node.id !== message.toAgentId) return node
      const previous = typeof node.metadata?.content === 'string' ? node.metadata.content : ''
      const section = `## Agent output — ${new Date(message.createdAt).toLocaleString()}\n\n${message.content}`
      return { ...node, metadata: { ...node.metadata, content: previous ? `${previous}\n\n${section}` : section } }
    })
  })
  const queued = transitionCanvasMessage(message, 'queued', 'user')
  const delivering = transitionCanvasMessage(queued, 'delivering', 'system')
  const delivered = transitionCanvasMessage(delivering, 'delivered', 'system')
  const acknowledged = { ...transitionCanvasMessage(delivered, 'acknowledged', 'system'), deliveredAt: new Date().toISOString() }
  persistWorkflowMessage(acknowledged)
  completeSpecificationWorkflowAfterOutput(acknowledged)
}

export function executableContextBindings(bindings: CanvasOperationalBinding[]): ContextBinding[] {
  return bindings.filter((binding): binding is ContextBinding => binding.kind === 'context' && binding.enabled)
}

export function executableDelegationBindings(bindings: CanvasOperationalBinding[]): DelegationBinding[] {
  return bindings.filter((binding): binding is DelegationBinding => binding.kind === 'delegation' && binding.enabled)
}
