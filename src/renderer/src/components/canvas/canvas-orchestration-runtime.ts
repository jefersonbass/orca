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
import { CanvasContextDeliveryGate } from './canvas-context-delivery-gate'

function messageId(): string {
  return `msg_${crypto.randomUUID()}`
}

function metadataText(node: CanvasNodeDocument, key: string): string {
  const value = node.metadata?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function canvasNodeDescriptor(node: CanvasNodeDocument): string {
  const metadata = Object.entries(node.metadata ?? {})
    .filter(([key, value]) => key !== 'content' && key !== 'text' && typeof value !== 'object')
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(', ')
  return `Canvas element: ${node.type} | label=${node.label} | position=${Math.round(node.position.x)},${Math.round(node.position.y)} | size=${Math.round(node.size.width)}x${Math.round(node.size.height)}${node.color ? ` | color=${node.color}` : ''}${metadata ? ` | ${metadata}` : ''}`
}

function nodeContent(nodeId: string): { content: string; resourceType: string } {
  const node = useAppStore.getState().canvasDocument?.nodes.find((item) => item.id === nodeId)
  if (!node) return { content: '', resourceType: 'unknown' }
  const ref = node.resourceRef
  const content = metadataText(node, 'content') || metadataText(node, 'text')
  if (content) return { content: `${canvasNodeDescriptor(node)}\n\n${content}`, resourceType: node.type }

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
      return { content: `Browser page: ${metadataText(node, 'url') || (ref?.kind === 'browser-preview' ? ref.url : node.label)}\nLive rendered content is requested by the native Canvas dispatcher.`, resourceType: node.type }
    case 'browser-session':
      return { content: `Browser session: ${node.label}${ref?.kind === 'browser-session' ? `\nSession: ${ref.sessionId}` : ''}`, resourceType: node.type }
    case 'group': {
      const children = useAppStore.getState().canvasDocument?.nodes
        .filter((child) => child.groupId === node.id)
        .map((child) => `- ${canvasNodeDescriptor(child)}`)
        .join('\n')
      return { content: `${canvasNodeDescriptor(node)}${children ? `\nChildren:\n${children}` : ''}`, resourceType: node.type }
    }
    default:
      return { content: canvasNodeDescriptor(node), resourceType: node.type }
  }
}

/** Read the resource at dispatch time. Browser nodes are intentionally not
 * represented by a URL alone: the native browser RPC returns the current
 * rendered accessibility snapshot, including the page state an agent sees. */
export async function resolveCanvasNodeContent(nodeId: string): Promise<{ content: string; resourceType: string }> {
  const state = useAppStore.getState()
  const node = state.canvasDocument?.nodes.find((item) => item.id === nodeId)
  if (!node) return { content: 'Missing Canvas node', resourceType: 'missing' }
  const base = nodeContent(nodeId)
  if (node.type !== 'browser-preview' && node.type !== 'browser-session') return base

  const ref = node.resourceRef
  const browserPages = Object.values(state.browserPagesByWorkspace ?? {}).flat()
  const browserPage = browserPages.find((page) =>
    (ref?.kind === 'browser-preview' && (page.id === ref.tabId || page.workspaceId === ref.tabId)) ||
    (ref?.kind === 'browser-session' && page.workspaceId === ref.workspaceId)
  )
  const pageId = browserPage?.id ?? (ref?.kind === 'browser-preview' ? ref.tabId : undefined)
  const worktreeId = browserPage?.worktreeId ?? (ref?.kind === 'browser-preview' ? ref.worktreeId : undefined)
  if (!pageId && !worktreeId) return base
  try {
    const worktreeSelector = worktreeId && (worktreeId.startsWith('id:') || worktreeId.startsWith('path:') || worktreeId.startsWith('branch:'))
      ? worktreeId
      : worktreeId
        ? `id:${worktreeId}`
        : undefined
    const result = await window.api.runtime.call({
      method: 'browser.snapshot',
      params: { ...(worktreeSelector ? { worktree: worktreeSelector } : {}), ...(pageId ? { page: pageId } : {}) }
    })
    if (result.ok) {
      const snapshot = result.result as { snapshot?: string; url?: string; title?: string }
      const rendered = typeof snapshot.snapshot === 'string' ? snapshot.snapshot.slice(0, 50_000) : ''
      if (rendered) {
        return {
          resourceType: node.type,
          content: `Browser rendered snapshot (live native RPC)\nURL: ${snapshot.url ?? browserPage?.url ?? ''}\nTitle: ${snapshot.title ?? browserPage?.title ?? node.label}\n\n${rendered}`
        }
      }
    }
  } catch {
    // A closed page should not prevent other Canvas resources from dispatching.
  }
  return base
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
  if (ref?.kind === 'terminal-tab') {
    const provider = typeof node?.metadata?.agent === 'string' ? node.metadata.agent : 'unknown'
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

const contextUpdateQueues = new Map<string, Promise<void>>()
const autoContextDeliveryInFlight = new Set<string>()
const contextDeliveryGate = new CanvasContextDeliveryGate()

async function deliverCanvasContextUpdate(
  binding: ContextBinding,
  changeToken: string,
  attempt = 0
): Promise<void> {
  const store = useAppStore.getState()
  const liveSource = await resolveCanvasNodeContent(binding.sourceNodeId)
  if (liveSource.resourceType === 'missing') return
  const deliverySignature = `${liveSource.resourceType}\0${liveSource.content}\0${changeToken}`
  if (!contextDeliveryGate.begin(binding.id, deliverySignature, attempt > 0)) return

  try {
    const message = prepareContextDelivery(
      binding,
      undefined,
      `[Canvas resource update]\nThe linked ${binding.sourceNodeId} item changed. Treat this as the latest authoritative content and act on it if it contains an instruction.\n\n${liveSource.content}`
    )
    const queued = transitionCanvasMessage(message, 'queued', 'system')
    persistWorkflowMessage(queued)
    const ref = referenceForAgentNode(binding.targetAgentNodeId)
    const target = ref ? resolveCanvasAgent(ref, store.agentStatusByPaneKey) : { ok: false as const, error: 'Target agent node has no live resource reference' }
    if (!target.ok) {
      if (attempt < 8) {
        window.setTimeout(() => { void deliverCanvasContextUpdate(binding, changeToken, attempt + 1) }, 1_500)
        return
      }
      persistWorkflowMessage({ ...transitionCanvasMessage(queued, 'failed', 'system'), deliveryError: target.error })
      contextDeliveryGate.fail(binding.id, deliverySignature)
      return
    }

    const baseline = await readAgentMessageIds(target).catch(() => new Set<string>())
    const delivering = transitionCanvasMessage(queued, 'delivering', 'system')
    persistWorkflowMessage(delivering)
    const delivery = await sendInstruction(target, await hydrateCanvasMessageForDispatch(message))
    if (!delivery.success) {
      const failed = { ...transitionCanvasMessage(delivering, 'failed', 'system'), deliveryError: delivery.error }
      persistWorkflowMessage(failed)
      if (attempt < 8) {
        window.setTimeout(() => { void deliverCanvasContextUpdate(binding, changeToken, attempt + 1) }, 1_500)
      } else {
        contextDeliveryGate.fail(binding.id, deliverySignature)
      }
      return
    }
    const delivered = {
      ...transitionCanvasMessage(delivering, 'delivered', 'system'),
      providerReceipt: delivery.providerReceipt,
      deliveredAt: delivery.timestamp
    }
    persistWorkflowMessage(transitionCanvasMessage(delivered, 'acknowledged', 'system'))
    contextDeliveryGate.complete(binding.id, deliverySignature)
    try {
      await dispatchCanvasDelegations(binding.targetAgentNodeId, message.content)
      const response = await waitForAgentResponse({ target, baselineMessageIds: baseline, timeoutMs: 30_000 })
      await dispatchCanvasDelegations(binding.targetAgentNodeId, response.content)
    } catch {
      // Context delivery remains acknowledged even when the provider is busy or
      // does not emit a parseable assistant response for this update.
    }
  } catch (error) {
    contextDeliveryGate.fail(binding.id, deliverySignature)
    throw error
  }
}

/** Broadcast a changed Canvas item to its already-linked agent without asking
 * the user to copy/paste the note or approve a second time. The binding itself
 * is the durable user-created permission boundary. Updates are serialized per
 * target so fast note edits cannot arrive out of order. */
export function publishCanvasContextUpdate(binding: ContextBinding, changeToken: string): void {
  const previous = contextUpdateQueues.get(binding.targetAgentNodeId) ?? Promise.resolve()
  const next = previous
    .catch(() => undefined)
    .then(() => deliverCanvasContextUpdate(binding, changeToken))
  contextUpdateQueues.set(binding.targetAgentNodeId, next)
  void next.finally(() => {
    if (contextUpdateQueues.get(binding.targetAgentNodeId) === next) {
      contextUpdateQueues.delete(binding.targetAgentNodeId)
    }
  })
}

/** Forward a dispatch through the user-created Canvas delegation graph using
 * native Orca handles. This is deliberately graph-driven: it does not parse
 * assistant text or inject a private markup protocol, and the visited set
 * makes A -> B -> A safe. */
export async function dispatchCanvasDelegations(
  sourceAgentNodeId: string,
  content: string,
  visited = new Set<string>()
): Promise<void> {
  if (visited.has(sourceAgentNodeId)) return
  visited.add(sourceAgentNodeId)
  const state = useAppStore.getState()
  const bindings = state.canvasOrchestration.bindings.filter((binding): binding is DelegationBinding =>
    binding.kind === 'delegation' && binding.enabled && binding.sourceAgentNodeId === sourceAgentNodeId
  )
  for (const binding of bindings) {
    const targetRef = referenceForAgentNode(binding.targetAgentNodeId)
    const target = targetRef
      ? resolveCanvasAgent(targetRef, state.agentStatusByPaneKey)
      : { ok: false as const, error: 'Delegation target has no live resource reference' }
    const message = prepareDelegationDelivery(
      binding,
      `[Native Canvas delegation]\nThe Canvas graph routed this dispatch from ${sourceAgentNodeId}. Execute the linked work if it is actionable.\n\n${content}`
    )
    const queued = transitionCanvasMessage(message, 'queued', 'system')
    persistWorkflowMessage(queued)
    if (!target.ok) {
      persistWorkflowMessage({
        ...transitionCanvasMessage(queued, 'failed', 'system'),
        deliveryError: target.error
      })
      continue
    }
    const delivering = transitionCanvasMessage(queued, 'delivering', 'system')
    persistWorkflowMessage(delivering)
    const delivery = await sendInstruction(target, message)
    if (delivery.success) {
      const delivered = {
        ...transitionCanvasMessage(delivering, 'delivered', 'system'),
        providerReceipt: delivery.providerReceipt,
        deliveredAt: delivery.timestamp
      }
      persistWorkflowMessage(transitionCanvasMessage(delivered, 'acknowledged', 'system'))
      await dispatchCanvasDelegations(binding.targetAgentNodeId, content, visited)
    } else {
      persistWorkflowMessage({
        ...transitionCanvasMessage(delivering, 'failed', 'system'),
        deliveryError: delivery.error
      })
    }
  }
}

/**
 * A context link is useful only when the target agent actually receives the
 * note. Creating a visual edge therefore queues and delivers the first
 * context snapshot automatically. A short retry window covers the normal
 * launch race where the CLI tab exists before its agent hook reports a live
 * session.
 */
export function autoDeliverContextBinding(binding: ContextBinding, attempt = 0): void {
  if (autoContextDeliveryInFlight.has(binding.id)) return
  const existing = contextMessageForBinding(binding)
  if (existing && ['queued', 'delivering', 'delivered', 'acknowledged'].includes(existing.deliveryState)) {
    return
  }
  const message = existing?.deliveryState === 'awaiting-approval'
    ? existing
    : prepareContextDelivery(binding)

  autoContextDeliveryInFlight.add(binding.id)
  void deliverApprovedCanvasMessage(message.id).then(() => {
    const latest = contextMessageForBinding(binding)
    if (attempt >= 8 || latest?.deliveryState !== 'failed') return
    window.setTimeout(() => autoDeliverContextBinding(binding, attempt + 1), 1_500)
  }).catch(() => {
    if (attempt < 8) {
      window.setTimeout(() => autoDeliverContextBinding(binding, attempt + 1), 1_500)
    }
  }).finally(() => {
    autoContextDeliveryInFlight.delete(binding.id)
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
    const hydratedMessage = await hydrateCanvasMessageForDispatch(message)
    const delivery = await sendInstruction(target, hydratedMessage)
    if (!delivery.success) {
      persistWorkflowMessage({ ...transitionCanvasMessage(delivering, 'failed', 'system'), deliveryError: delivery.error })
      failTaskForDelivery(message, delivery.error ?? 'Provider delivery failed')
      return
    }
    const delivered = { ...transitionCanvasMessage(delivering, 'delivered', 'system'), providerReceipt: delivery.providerReceipt, deliveredAt: delivery.timestamp }
    persistWorkflowMessage(delivered)
    await dispatchCanvasDelegations(message.toAgentId, hydratedMessage.content)
    const response = await waitForAgentResponse({ target, baselineMessageIds: baseline })
    await dispatchCanvasDelegations(message.toAgentId, response.content)
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

async function hydrateCanvasMessageForDispatch(message: AgentCanvasMessage): Promise<AgentCanvasMessage> {
  if (message.contextRefs.length === 0) return message
  const snapshots = await Promise.all(message.contextRefs.map(async (ref) => {
    const resolved = await resolveCanvasNodeContent(ref.nodeId)
    return `## Canvas resource: ${resolved.resourceType} (${ref.nodeId})\n${resolved.content}`
  }))
  const marker = '\n\n--- Native Canvas resource snapshots ---\n'
  const contentWithoutPreviousSnapshot = message.content.split(marker)[0]
  return { ...message, content: `${contentWithoutPreviousSnapshot}${marker}${snapshots.join('\n\n')}` }
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
