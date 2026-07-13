import { useAppStore } from '@/store'
import type { AgentCanvasMessage, CanvasOperationalBinding, ContextBinding } from '../../../../shared/canvas-agent-types'
import type { CanvasAgentReference, DelegationBinding, OutputBinding, ReportingBinding } from '../../../../shared/canvas-agent-types'
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

function nodeContent(nodeId: string): string {
  const node = useAppStore.getState().canvasDocument?.nodes.find((item) => item.id === nodeId)
  const content = node?.metadata?.content
  return typeof content === 'string' ? content : ''
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
  return null
}

export function prepareContextDelivery(binding: ContextBinding, taskId?: string, contentOverride?: string): AgentCanvasMessage {
  const draft: AgentCanvasMessage = {
    id: messageId(), toAgentId: binding.targetAgentNodeId, taskId, type: 'instruction',
    content: contentOverride ?? nodeContent(binding.sourceNodeId),
    contextRefs: [{ nodeId: binding.sourceNodeId, resourceType: 'note' }],
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
