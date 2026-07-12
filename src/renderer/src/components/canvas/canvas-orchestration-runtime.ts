import { useAppStore } from '@/store'
import type { AgentCanvasMessage, CanvasOperationalBinding, ContextBinding } from '../../../../shared/canvas-agent-types'
import type { CanvasAgentReference, DelegationBinding, OutputBinding, ReportingBinding } from '../../../../shared/canvas-agent-types'
import { readAgentMessageIds, resolveCanvasAgent, sendInstruction, waitForAgentResponse } from './canvas-provider-adapter'
import { transitionCanvasMessage } from '../../../../shared/canvas-state-machines'

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
    return { agentSessionId: ref.sessionId ?? '', paneKey: ref.paneKey, provider: ref.provider ?? 'unknown' }
  }
  return null
}

export function prepareContextDelivery(binding: ContextBinding): AgentCanvasMessage {
  const draft: AgentCanvasMessage = {
    id: messageId(), toAgentId: binding.targetAgentNodeId, type: 'instruction',
    content: nodeContent(binding.sourceNodeId),
    contextRefs: [{ nodeId: binding.sourceNodeId, resourceType: 'note' }],
    createdAt: new Date().toISOString(), deliveryState: 'draft'
  }
  const message = transitionCanvasMessage(draft, 'awaiting-approval', 'user')
  useAppStore.getState().upsertCanvasMessage(message)
  return message
}

export function prepareDelegationDelivery(binding: DelegationBinding, content: string): AgentCanvasMessage {
  const draft: AgentCanvasMessage = {
    id: messageId(), fromAgentId: binding.sourceAgentNodeId, toAgentId: binding.targetAgentNodeId,
    type: 'delegation', content, contextRefs: [], createdAt: new Date().toISOString(), deliveryState: 'draft'
  }
  const message = transitionCanvasMessage(draft, 'awaiting-approval', 'user')
  useAppStore.getState().upsertCanvasMessage(message)
  return message
}

export async function deliverApprovedCanvasMessage(messageIdToDeliver: string): Promise<void> {
  const store = useAppStore.getState()
  const message = store.canvasOrchestration.messages.find((item) => item.id === messageIdToDeliver)
  if (!message || !['awaiting-approval', 'queued'].includes(message.deliveryState)) return
  const queued = message.deliveryState === 'queued'
    ? message
    : transitionCanvasMessage(message, 'queued', 'user')
  const ref = referenceForAgentNode(message.toAgentId)
  if (!ref) {
    const delivering = transitionCanvasMessage(queued, 'delivering', 'system')
    store.upsertCanvasMessage({ ...transitionCanvasMessage(delivering, 'failed', 'system'), deliveryError: 'Target agent node has no live resource reference' })
    return
  }
  const target = resolveCanvasAgent(ref, store.agentStatusByPaneKey)
  if (!target.ok) {
    const delivering = transitionCanvasMessage(queued, 'delivering', 'system')
    store.upsertCanvasMessage({ ...transitionCanvasMessage(delivering, 'failed', 'system'), deliveryError: target.error })
    return
  }
  const delivering = transitionCanvasMessage(queued, 'delivering', 'system')
  store.upsertCanvasMessage(delivering)
  try {
    const baseline = await readAgentMessageIds(target)
    const delivery = await sendInstruction(target, message)
    if (!delivery.success) {
      store.upsertCanvasMessage({ ...transitionCanvasMessage(delivering, 'failed', 'system'), deliveryError: delivery.error })
      return
    }
    const delivered = { ...transitionCanvasMessage(delivering, 'delivered', 'system'), providerReceipt: delivery.providerReceipt, deliveredAt: delivery.timestamp }
    store.upsertCanvasMessage(delivered)
    const response = await waitForAgentResponse({ target, baselineMessageIds: baseline })
    const output = useAppStore.getState().canvasOrchestration.bindings.find((binding): binding is OutputBinding =>
      binding.kind === 'output' && binding.sourceAgentNodeId === message.toAgentId && binding.enabled
    )
    const reporting = useAppStore.getState().canvasOrchestration.bindings.find((binding): binding is ReportingBinding =>
      binding.kind === 'reporting' && binding.sourceAgentNodeId === message.toAgentId && binding.enabled
    )
    const responseDraft: AgentCanvasMessage = {
      id: messageId(), fromAgentId: message.toAgentId,
      toAgentId: output?.targetNoteNodeId ?? reporting?.targetAgentNodeId ?? 'unbound-output', type: 'result', content: response.content,
      contextRefs: [{ nodeId: message.toAgentId, resourceType: 'agent-response', snapshotHash: response.messageId }],
      createdAt: new Date(response.timestamp ?? Date.now()).toISOString(),
      deliveryState: output || reporting ? 'draft' : 'delivered'
    }
    const responseMessage = output || reporting
      ? transitionCanvasMessage(responseDraft, 'awaiting-approval', 'system')
      : responseDraft
    useAppStore.getState().upsertCanvasMessage(responseMessage)
    useAppStore.getState().upsertCanvasMessage(transitionCanvasMessage(delivered, 'acknowledged', 'system'))
  } catch (error) {
    useAppStore.getState().upsertCanvasMessage({ ...transitionCanvasMessage(delivering, 'failed', 'system'), deliveryError: String(error) })
  }
}

export function approveCanvasOutput(messageIdToAppend: string): void {
  const store = useAppStore.getState()
  const message = store.canvasOrchestration.messages.find((item) => item.id === messageIdToAppend)
  const document = store.canvasDocument
  if (!message || message.type !== 'result' || !document || message.deliveryState !== 'awaiting-approval') return
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
  store.upsertCanvasMessage({ ...transitionCanvasMessage(delivered, 'acknowledged', 'system'), deliveredAt: new Date().toISOString() })
}

export function executableContextBindings(bindings: CanvasOperationalBinding[]): ContextBinding[] {
  return bindings.filter((binding): binding is ContextBinding => binding.kind === 'context' && binding.enabled)
}

export function executableDelegationBindings(bindings: CanvasOperationalBinding[]): DelegationBinding[] {
  return bindings.filter((binding): binding is DelegationBinding => binding.kind === 'delegation' && binding.enabled)
}
