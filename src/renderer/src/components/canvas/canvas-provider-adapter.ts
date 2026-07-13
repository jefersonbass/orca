import type { AgentCanvasMessage, CanvasAgentReference } from '../../../../shared/canvas-agent-types'
import type { AgentStatusEntry, AgentType } from '../../../../shared/agent-status-types'
import type { NativeChatMessage } from '../../../../shared/native-chat-types'
import type { RuntimeTerminalSummary } from '../../../../shared/runtime-types'
import {
  getSettingsForAgentTabRuntimeOwner,
  pasteDraftToAgentPtyWhenReady,
  submitPromptToAgentTab
} from '@/lib/agent-paste-draft'
import { scrapeNativeChatSession } from '@/components/native-chat/native-chat-scrape-fallback'
import { useAppStore } from '@/store'
import { sendRuntimePtyInputVerified } from '@/runtime/runtime-terminal-inspection'
import { buildCanvasAgentContext } from './canvas-agent-context'

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
    if (ref.paneKey && directTabId && ref.agentSessionId && ref.provider && ref.provider !== 'unknown') {
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
    captureMode: ref.captureMode ?? (provider === 'opencode' ? 'terminal-scrape' : 'native-transcript')
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
    const content = formatAgentInstruction(
      message,
      terminalInventory ? formatCanvasRoutingInventory(terminalInventory) : ''
    )
    // OpenCode/Verboo does not expose the same native transcript + idle hook
    // lifecycle as Claude/Codex. Its Canvas identity is intentionally backed
    // by terminal scraping, so routing it through the native push-on-idle
    // mailbox can leave a valid message queued forever. Keep the native Orca
    // mailbox for transcript-backed agents and submit OpenCode directly to
    // its PTY instead.
    if (target.captureMode !== 'terminal-scrape') {
      const nativeDelivery = await sendThroughOrcaOrchestration(
        target,
        message,
        content,
        timestamp,
        terminalInventory
      )
      if (nativeDelivery) {
        return nativeDelivery
      }
    }
    const leafId = target.paneKey.startsWith(`${target.tabId}:`)
      ? target.paneKey.slice(target.tabId.length + 1)
      : null
    const ptyId = leafId
      ? useAppStore.getState().terminalLayoutsByTabId[target.tabId]?.ptyIdsByLeafId?.[leafId]
      : null
    const submitted = ptyId
      ? await pasteDraftToAgentPtyWhenReady({
          tabId: target.tabId,
          ptyId,
          content,
          agent: target.provider === 'codex' ? 'codex' : undefined,
          submit: true,
          timeoutMs: 15_000
        })
      : await submitPromptToAgentTab({ tabId: target.tabId, content })
    if (!submitted) {
      return { success: false, messageId: message.id, timestamp, error: 'Agent PTY did not accept the prompt' }
    }
    // Codex can consume the first Enter as the commit of a long bracketed-paste
    // placeholder in a background pane. A delayed confirmation submits that
    // committed composer value. An extra Enter after an already-submitted turn
    // is harmless, while omitting it strands orchestration prompts indefinitely.
    if (ptyId) {
      const confirmationDelayMs = content.length > 4_000 ? 2_000 : 500
      await new Promise<void>((resolve) => window.setTimeout(resolve, confirmationDelayMs))
      const confirmed = await sendRuntimePtyInputVerified(
        getSettingsForAgentTabRuntimeOwner(target.tabId),
        ptyId,
        '\r'
      )
      if (!confirmed) {
        return { success: false, messageId: message.id, timestamp, error: 'Agent PTY did not confirm prompt submission' }
      }
    }
    return {
      success: true,
      messageId: message.id,
      timestamp,
      providerReceipt: `pty-submitted:${target.paneKey}`
    }
  } catch (error) {
    return { success: false, messageId: message.id, timestamp, error: String(error) }
  }
}

/**
 * Use the same main-process mailbox that native Orca agents use. The Canvas
 * must not create a second communication universe: terminal handles, queued
 * delivery and push-on-idle behavior are already owned by the runtime.
 *
 * A null result means this runtime does not expose the RPC (for example the
 * browser fallback or an older packaged build); callers retain the existing
 * renderer PTY path in that case.
 */
async function sendThroughOrcaOrchestration(
  target: ResolvedCanvasAgent,
  message: AgentCanvasMessage,
  content: string,
  timestamp: string,
  knownTerminals: CanvasRoutingTerminal[] | null
): Promise<DeliveryResult | null> {
  if (typeof window.api?.runtime?.call !== 'function') {
    return null
  }
  try {
    const terminals = knownTerminals ?? await loadCanvasRoutingTerminals()
    if (!terminals) return null
    const targetLeafId = target.paneKey.startsWith(`${target.tabId}:`)
      ? target.paneKey.slice(target.tabId.length + 1)
      : undefined
    const terminal = terminals.find((candidate) =>
      candidate.tabId === target.tabId &&
      (targetLeafId === undefined || candidate.leafId === targetLeafId)
    )
    if (!terminal) {
      return null
    }

    const sent = await window.api.runtime.call({
      method: 'orchestration.send',
      params: {
        to: terminal.handle,
        from: `canvas:${message.fromAgentId ?? 'user'}`,
        subject: message.type === 'delegation' ? 'Canvas delegation' : 'Canvas context',
        body: content,
        type: message.type === 'delegation' ? 'dispatch' : 'status',
        priority: 'high',
        threadId: `canvas:${message.id}`,
        payload: JSON.stringify({
          canvasMessageId: message.id,
          canvasNodeId: message.toAgentId,
          contextRefs: message.contextRefs
        })
      }
    })
    if (!sent.ok) {
      // A runtime may be reachable while its orchestration schema is older
      // than the renderer. Fall back to the verified PTY path instead of
      // losing the user instruction.
      return null
    }

    return {
      success: true,
      messageId: message.id,
      timestamp,
      providerReceipt: `orca-orchestration:${terminal.handle}`
    }
  } catch {
    // Older packaged builds and disconnected remote runtimes can reject the
    // RPC. The renderer delivery path remains a safe compatibility fallback.
    return null
  }
}

/** Read the same live terminal inventory exposed to Orca's CLI. This is the
 * cross-worktree bridge: a Canvas agent can address a running terminal or
 * agent by its native handle without creating a duplicate Canvas node or
 * searching AppData/workspace files. */
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

function formatCanvasRoutingInventory(terminals: CanvasRoutingTerminal[]): string {
  const state = useAppStore.getState()
  const statuses = Object.values(state.agentStatusByPaneKey)
  const live = terminals.filter((terminal) => terminal.connected).slice(0, 80)
  const lines = live.map((terminal) => {
    const paneKey = `${terminal.tabId}:${terminal.leafId}`
    const status = statuses.find((candidate) =>
      candidate.paneKey === paneKey ||
      (candidate.tabId === terminal.tabId && candidate.worktreeId === terminal.worktreeId)
    )
    const role = status
      ? `${status.agentType ?? 'agent'} / ${status.state}`
      : 'terminal'
    const title = terminal.title?.trim() || 'untitled'
    const path = terminal.worktreePath || terminal.worktreeId
    return `- handle=${terminal.handle} | role=${role} | title=${title} | worktree=${terminal.worktreeId} | path=${path} | pane=${paneKey} | writable=${terminal.writable}`
  })
  if (lines.length === 0) {
    return '\n\nLive Orca routing inventory: no connected terminals were returned.'
  }
  return `\n\nLive Orca routing inventory (all visible worktrees; use these native handles):\n${lines.join('\n')}\n\nWhen the user asks you to send work to another live Agent, use the native Orca mailbox with the matching handle, for example:\norca orchestration send --to HANDLE --subject "Canvas task" --body "task details"\nWhen the target is a plain terminal, use:\norca terminal send --terminal HANDLE --text "command or task" --enter\nYou may also use @worktree:WORKTREE_ID, @idle, or @all when the request is a group operation. Do not search AppData or the workspace filesystem for another Agent's communication channel.`
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

export function formatAgentInstruction(message: AgentCanvasMessage, routingInventory = ''): string {
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
  const canvasContext = state.canvasDocument
    ? buildCanvasAgentContext(state.canvasDocument, state.canvasOrchestration.bindings, message.toAgentId)
    : null
  const routes = state.canvasOrchestration.bindings
    .filter((binding) => binding.enabled)
    .flatMap((binding) => {
      if (binding.kind !== 'delegation' && binding.kind !== 'reporting') return []
      if (binding.sourceAgentNodeId !== message.toAgentId) return []
      const target = state.canvasDocument?.nodes.find((node) => node.id === binding.targetAgentNodeId)
      return [`- ${target?.label ?? binding.targetAgentNodeId} (${binding.targetAgentNodeId}) via ${binding.kind}`]
    })
  const routeContext = routes.length > 0
    ? `\n\nCanvas orchestration routes available from this agent:\n${routes.join('\n')}\nUse the linked route when this instruction asks you to delegate or report work; the target node id is included above. To delegate autonomously, emit exactly <orca-delegate target="TARGET_NODE_ID">task for the linked agent</orca-delegate>. The Canvas runtime will deliver that block through the existing binding.`
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
  const canvasEnvelope = `\n\nOrca Canvas context (authoritative for this turn; do not infer it from the shell environment):\nORCA_NOTE=${JSON.stringify(incomingContext.join('\n'))}\nORCA_AGENTS=${JSON.stringify(linkedAgents.join(', '))}\nORCA_LINKS=${JSON.stringify(links.join('; '))}${canvasContext ? `\nORCA_CANVAS_NODE_ID=${canvasContext.nodeId}\nORCA_CANVAS_CONTEXT=${canvasContext.serialized}` : ''}${incomingContext.length > 0 ? `\n\nLinked Canvas content:\n${incomingContext.join('\n')}` : ''}`
  return `[${heading} from ${message.fromAgentId ?? 'user'}]\n\n${message.content}${context}${routeContext}${canvasEnvelope}${routingInventory}`
}
