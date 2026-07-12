import { useAppStore } from '@/store'
import type { AgentCanvasMessage, CanvasOperationalBinding, ContextBinding } from '../../../../shared/canvas-agent-types'
import type { CanvasAgentReference, OutputBinding } from '../../../../shared/canvas-agent-types'
import { readAgentMessageIds, resolveCanvasAgent, sendInstruction, waitForAgentResponse } from './canvas-provider-adapter'

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
  const message: AgentCanvasMessage = {
    id: messageId(), toAgentId: binding.targetAgentNodeId, type: 'instruction',
    content: nodeContent(binding.sourceNodeId),
    contextRefs: [{ nodeId: binding.sourceNodeId, resourceType: 'note' }],
    createdAt: new Date().toISOString(), deliveryState: 'awaiting-approval'
  }
  useAppStore.getState().upsertCanvasMessage(message)
  return message
}

export async function deliverApprovedCanvasMessage(messageIdToDeliver: string): Promise<void> {
  const store = useAppStore.getState()
  const message = store.canvasOrchestration.messages.find((item) => item.id === messageIdToDeliver)
  if (!message || message.deliveryState !== 'awaiting-approval') return
  const ref = referenceForAgentNode(message.toAgentId)
  if (!ref) {
    store.upsertCanvasMessage({ ...message, deliveryState: 'failed', deliveryError: 'Target agent node has no live resource reference' })
    return
  }
  const target = resolveCanvasAgent(ref, store.agentStatusByPaneKey)
  if (!target.ok) {
    store.upsertCanvasMessage({ ...message, deliveryState: 'failed', deliveryError: target.error })
    return
  }
  store.upsertCanvasMessage({ ...message, deliveryState: 'delivering' })
  try {
    const baseline = await readAgentMessageIds(target)
    const delivery = await sendInstruction(target, message)
    if (!delivery.success) {
      store.upsertCanvasMessage({ ...message, deliveryState: 'failed', deliveryError: delivery.error })
      return
    }
    store.upsertCanvasMessage({ ...message, deliveryState: 'delivered', providerReceipt: delivery.providerReceipt, deliveredAt: delivery.timestamp })
    const response = await waitForAgentResponse({ target, baselineMessageIds: baseline })
    const output = useAppStore.getState().canvasOrchestration.bindings.find((binding): binding is OutputBinding =>
      binding.kind === 'output' && binding.sourceAgentNodeId === message.toAgentId && binding.enabled
    )
    const responseMessage: AgentCanvasMessage = {
      id: messageId(), fromAgentId: message.toAgentId,
      toAgentId: output?.targetNoteNodeId ?? 'unbound-output', type: 'result', content: response.content,
      contextRefs: [{ nodeId: message.toAgentId, resourceType: 'agent-response', snapshotHash: response.messageId }],
      createdAt: new Date(response.timestamp ?? Date.now()).toISOString(),
      deliveryState: output ? 'awaiting-approval' : 'delivered'
    }
    useAppStore.getState().upsertCanvasMessage(responseMessage)
    useAppStore.getState().upsertCanvasMessage({ ...message, deliveryState: 'acknowledged' })
  } catch (error) {
    useAppStore.getState().upsertCanvasMessage({ ...message, deliveryState: 'failed', deliveryError: String(error) })
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
  store.upsertCanvasMessage({ ...message, deliveryState: 'acknowledged', deliveredAt: new Date().toISOString() })
}

export function executableContextBindings(bindings: CanvasOperationalBinding[]): ContextBinding[] {
  return bindings.filter((binding): binding is ContextBinding => binding.kind === 'context' && binding.enabled)
}
