import type { AgentCanvasMessage, CanvasAgentReference } from '../../../../shared/canvas-agent-types'
import type { AgentStatusEntry, AgentType } from '../../../../shared/agent-status-types'
import type { NativeChatMessage } from '../../../../shared/native-chat-types'
import type { RuntimeTerminalSummary } from '../../../../shared/runtime-types'
import { scrapeNativeChatSession } from '@/components/native-chat/native-chat-scrape-fallback'
import { useAppStore } from '@/store'

export type DeliveryResult = {
  success: boolean
  messageId: string
  timestamp: string
  error?: string
  providerReceipt?: string
}

export type ResolvedCanvasAgent = {
  ok: true
  sessionId: string
  paneKey: string
  tabId: string
  provider: AgentType
  transcriptPath?: string
  captureMode?: 'native-transcript' | 'terminal-scrape'
}

export type AgentResolutionResult =
  | ResolvedCanvasAgent
  | { ok: false; error: string }

export type CapturedAgentResponse = {
  messageId: string
  content: string
  timestamp: number | null
}

type CanvasRoutingTerminal = Pick<
  RuntimeTerminalSummary,
  'handle' | 'tabId' | 'leafId' | 'worktreeId' | 'worktreePath' | 'title' | 'connected' | 'writable'
>

/**
 * Only providers with an Orca-native transcript/hook integration can consume
 * orchestration.mail directly. Custom CLIs (including Verboo) are visible in
 * a terminal but do not poll that mailbox, so they must receive the prompt
 * through their live PTY.
 */
const NATIVE_TRANSCRIPT_PROVIDERS = new Set(['claude', 'codex', 'gemini'])

function defaultCaptureMode(provider: string): 'native-transcript' | 'terminal-scrape' {
  return NATIVE_TRANSCRIPT_PROVIDERS.has(provider.toLowerCase())
    ? 'native-transcript'
    : 'terminal-scrape'
}

/** Resolve only identities backed by a live Orca agent-status entry. */
export function resolveCanvasAgent(
  ref: CanvasAgentReference,
  agentStatusByPaneKey: Record<string, AgentStatusEntry>
): AgentResolutionResult {
  const exact = ref.paneKey ? agentStatusByPaneKey[ref.paneKey] : undefined
  const entry = exact ?? (ref.terminalTabId
    ? Object.values(agentStatusByPaneKey).find((candidate) => candidate.tabId === ref.terminalTabId)
    : undefined)
  if (!entry) {
    const directTabId = ref.terminalTabId ?? ref.paneKey?.split(':')[0]
    if (
      ref.paneKey && directTabId && ref.agentSessionId && ref.provider &&
      (ref.provider !== 'unknown' || ref.agentSessionId.startsWith('canvas-tab:'))
    ) {
      return {
        ok: true,
        sessionId: ref.agentSessionId,
        paneKey: ref.paneKey,
        tabId: directTabId,
        provider: ref.provider,
        transcriptPath: ref.transcriptPath,
        captureMode: ref.captureMode
      }
    }
    return { ok: false, error: 'Agent session not found' }
  }

  const tabId = entry.tabId ?? ref.terminalTabId
  const sessionId = entry.providerSession?.id ?? ref.agentSessionId
  const provider = entry.agentType ?? ref.provider
  if (!tabId || !sessionId || !provider) {
    return { ok: false, error: 'Agent identity is incomplete' }
  }
  return {
    ok: true,
    sessionId,
    paneKey: entry.paneKey,
    tabId,
    provider,
    ...(entry.providerSession?.transcriptPath
      ? { transcriptPath: entry.providerSession.transcriptPath }
      : {}),
    captureMode: ref.captureMode ?? defaultCaptureMode(provider)
  }
}

/** Deliver through Orca's verified bracketed-paste + submit path. */
export async function sendInstruction(
  target: ResolvedCanvasAgent,
  message: AgentCanvasMessage
): Promise<DeliveryResult> {
  const timestamp = new Date().toISOString()
  try {
    const terminalInventory = await loadCanvasRoutingTerminals()
    if (!terminalInventory) {
      return { success: false, messageId: message.id, timestamp, error: 'Orca runtime is unavailable' }
    }
    const terminal = findCanvasTerminal(target, terminalInventory)
    if (!terminal) {
      return { success: false, messageId: message.id, timestamp, error: 'Canvas target terminal handle is stale' }
    }
    const content = formatAgentInstruction(message, terminalInventory, terminal.handle)
    const method = target.captureMode === 'native-transcript' ? 'orchestration.send' : 'terminal.send'
    const params = method === 'terminal.send'
      ? {
          terminal: terminal.handle,
          text: content,
          enter: true,
          client: { id: 'canvas-orchestration', type: 'desktop' as const }
        }
      : {
          to: terminal.handle,
          from: `canvas:${message.fromAgentId ?? 'user'}`,
          subject: message.type === 'delegation' ? 'Canvas delegation' : 'Canvas resource dispatch',
          body: content,
          type: message.type === 'delegation' ? 'dispatch' as const : 'status' as const,
          priority: 'high' as const,
          threadId: `canvas:${message.id}`,
          payload: JSON.stringify({ canvasMessageId: message.id, contextRefs: message.contextRefs })
        }
    const sent = await window.api.runtime.call({ method, params })
    if (!sent.ok) {
      const error = typeof sent.error === 'string' ? sent.error : sent.error?.message
      return { success: false, messageId: message.id, timestamp, error: error ?? `Native ${method} failed` }
    }
    if (method === 'terminal.send') {
      const sendResult = sent.result as { send?: { accepted?: boolean; refusedReason?: string } } | undefined
      if (sendResult?.send?.accepted === false) {
        return {
          success: false,
          messageId: message.id,
          timestamp,
          error: sendResult.send.refusedReason ?? 'Canvas target terminal rejected the prompt'
        }
      }
    }
    return { success: true, messageId: message.id, timestamp, providerReceipt: `${method}:${terminal.handle}` }
  } catch (error) {
    return { success: false, messageId: message.id, timestamp, error: String(error) }
  }
}

async function loadCanvasRoutingTerminals(): Promise<CanvasRoutingTerminal[] | null> {
  if (typeof window.api?.runtime?.call !== 'function') return null
  try {
    const listed = await window.api.runtime.call({
      method: 'terminal.list',
      params: { limit: 500 }
    })
    if (!listed.ok) return null
    const result = listed.result as { terminals?: CanvasRoutingTerminal[] }
    return result.terminals ?? []
  } catch {
    return null
  }
}

function findCanvasTerminal(target: ResolvedCanvasAgent, terminals: CanvasRoutingTerminal[]): CanvasRoutingTerminal | null {
  const targetLeafId = target.paneKey.startsWith(`${target.tabId}:`)
    ? target.paneKey.slice(target.tabId.length + 1)
    : undefined
  return terminals.find((candidate) =>
    candidate.connected && candidate.tabId === target.tabId &&
    (targetLeafId === undefined || candidate.leafId === targetLeafId)
  ) ?? terminals.find((candidate) => candidate.connected && candidate.handle === target.paneKey) ?? null
}

/**
 * Wait for an assistant transcript message that did not exist before delivery.
 * A successful PTY write alone is never treated as an agent response.
 */
export async function waitForAgentResponse(args: {
  target: ResolvedCanvasAgent
  baselineMessageIds: ReadonlySet<string>
  timeoutMs?: number
  pollMs?: number
}): Promise<CapturedAgentResponse> {
  if (args.target.captureMode === 'terminal-scrape') {
    return waitForScrapedAgentResponse(args)
  }
  const timeoutMs = args.timeoutMs ?? 120_000
  const pollMs = args.pollMs ?? 750
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await window.api.nativeChat.readSession(
      args.target.provider,
      args.target.sessionId,
      200,
      args.target.transcriptPath
    )
    if ('error' in result) throw new Error(result.error)
    const response = [...result.messages]
      .reverse()
      .find((candidate) => candidate.role === 'assistant' && !args.baselineMessageIds.has(candidate.id))
    if (response) {
      return {
        messageId: response.id,
        content: nativeChatMessageText(response),
        timestamp: response.timestamp
      }
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, pollMs))
  }
  throw new Error('Timed out waiting for an agent transcript response')
}

export async function readAgentMessageIds(target: ResolvedCanvasAgent): Promise<Set<string>> {
  if (target.captureMode === 'terminal-scrape') {
    return new Set(scrapeTerminalMessages(target).map((message) => message.id))
  }
  const result = await window.api.nativeChat.readSession(
    target.provider,
    target.sessionId,
    200,
    target.transcriptPath
  )
  if ('error' in result) throw new Error(result.error)
  return new Set(result.messages.map((message) => message.id))
}

function terminalScrollback(tabId: string): string {
  const manager = window.__paneManagers?.get(tabId)
  const pane = manager?.getActivePane?.() ?? manager?.getPanes?.()[0]
  return pane?.serializeAddon?.serialize?.() ?? ''
}

function scrapeTerminalMessages(target: ResolvedCanvasAgent): NativeChatMessage[] {
  return scrapeNativeChatSession(terminalScrollback(target.tabId), target.provider).session.messages
}

async function waitForScrapedAgentResponse(args: {
  target: ResolvedCanvasAgent
  baselineMessageIds: ReadonlySet<string>
  timeoutMs?: number
  pollMs?: number
}): Promise<CapturedAgentResponse> {
  const deadline = Date.now() + (args.timeoutMs ?? 120_000)
  const pollMs = args.pollMs ?? 500
  let stableKey = ''
  let stableSince = 0
  while (Date.now() < deadline) {
    const response = [...scrapeTerminalMessages(args.target)]
      .reverse()
      .find((candidate) => candidate.role === 'assistant' && !args.baselineMessageIds.has(candidate.id))
    if (response) {
      const content = nativeChatMessageText(response)
      const key = `${response.id}:${content}`
      if (key !== stableKey) {
        stableKey = key
        stableSince = Date.now()
      } else if (content && Date.now() - stableSince >= 1_000) {
        return { messageId: response.id, content, timestamp: response.timestamp }
      }
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, pollMs))
  }
  throw new Error('Timed out waiting for a scraped agent response')
}

export function nativeChatMessageText(message: NativeChatMessage): string {
  return message.blocks
    .filter((block): block is Extract<NativeChatMessage['blocks'][number], { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('\n\n')
    .trim()
}

export function formatAgentInstruction(
  message: AgentCanvasMessage,
  terminals: CanvasRoutingTerminal[] = [],
  targetHandle?: string
): string {
  const heading = message.type === 'delegation'
    ? 'DELEGATION'
    : message.type === 'review-request'
      ? 'REVIEW REQUEST'
      : 'INSTRUCTION'
  const context = message.contextRefs.length > 0
    ? `\n\nContext references:\n${message.contextRefs.map((ref) =>
        `- ${ref.resourceType}: ${ref.nodeId}${ref.snapshotHash ? ` (hash: ${ref.snapshotHash})` : ''}`
      ).join('\n')}`
    : ''
  const state = useAppStore.getState()
  const routes = state.canvasOrchestration.bindings
    .filter((binding) => binding.enabled)
    .flatMap((binding) => {
      if (binding.kind !== 'delegation' && binding.kind !== 'reporting') return []
      if (binding.sourceAgentNodeId !== message.toAgentId) return []
      const target = state.canvasDocument?.nodes.find((node) => node.id === binding.targetAgentNodeId)
      const targetRef = target?.resourceRef
      const targetTabId = targetRef?.kind === 'agent-terminal' || targetRef?.kind === 'live-terminal'
        ? targetRef.paneKey.split(':')[0]
        : targetRef?.kind === 'terminal-tab' || targetRef?.kind === 'agent-pane'
          ? targetRef.tabId
          : undefined
      const targetLeafId = targetRef?.kind === 'agent-terminal' || targetRef?.kind === 'live-terminal'
        ? targetRef.paneKey.split(':')[1]
        : targetRef?.kind === 'agent-pane' ? targetRef.leafId : undefined
      const handle = targetTabId
        ? terminals.find((terminal) => terminal.tabId === targetTabId && (!targetLeafId || terminal.leafId === targetLeafId))?.handle
        : undefined
      return [`- ${target?.label ?? binding.targetAgentNodeId} (${binding.targetAgentNodeId})${handle ? ` handle=${handle}` : ''} via ${binding.kind}`]
    })
  const routeContext = routes.length > 0
    ? `\n\nNative Orca routes available from this agent:\n${routes.join('\n')}\nThe route is already a native terminal handle. On Windows use: orca.cmd orchestration send --to HANDLE --subject Canvas-task --body task-details. For a plain terminal use: orca.cmd terminal send --terminal HANDLE --text task-details --enter. On POSIX use the equivalent orca command. Do not search AppData or create environment variables.`
    : ''
  const incomingContext = state.canvasOrchestration.bindings
    .filter((binding) => binding.enabled)
    .flatMap((binding) => {
      if (binding.kind !== 'context' || binding.targetAgentNodeId !== message.toAgentId) return []
      const source = state.canvasDocument?.nodes.find((node) => node.id === binding.sourceNodeId)
      const sourceContent = typeof source?.metadata?.content === 'string'
        ? source.metadata.content
        : typeof source?.metadata?.text === 'string'
          ? source.metadata.text
          : source?.label ?? binding.sourceNodeId
      return [`- ${source?.type ?? 'context'} ${source?.label ?? binding.sourceNodeId} (${binding.sourceNodeId}): ${sourceContent}`]
    })
  const linkedAgents = state.canvasOrchestration.bindings
    .filter((binding) => binding.enabled)
    .flatMap((binding) => {
      if ((binding.kind !== 'delegation' && binding.kind !== 'reporting') || binding.sourceAgentNodeId !== message.toAgentId) return []
      const target = state.canvasDocument?.nodes.find((node) => node.id === binding.targetAgentNodeId)
      return [`${target?.label ?? binding.targetAgentNodeId} (${binding.targetAgentNodeId})`]
    })
  const links = [
    ...incomingContext.map((entry) => `${entry.split(': ')[0]} -> ${message.toAgentId}`),
    ...linkedAgents.map((target) => `${message.toAgentId} -> ${target}`)
  ]
  const targetContext = targetHandle ? `\n\nNative target handle: ${targetHandle}` : ''
  const linkedContext = incomingContext.length > 0 ? `\n\nLinked Canvas resources (authoritative for this dispatch):\n${incomingContext.join('\n')}` : ''
  const linkContext = links.length > 0 ? `\n\nCanvas links in this dispatch:\n${links.join('\n')}` : ''
  return `[${heading} from ${message.fromAgentId ?? 'user'}]\n\n${message.content}${context}${routeContext}${targetContext}${linkedContext}${linkContext}`
}
