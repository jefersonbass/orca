import type { AgentCanvasMessage, CanvasAgentReference } from '../../../../shared/canvas-agent-types'
import type { AgentStatusEntry, AgentType } from '../../../../shared/agent-status-types'
import type { NativeChatMessage } from '../../../../shared/native-chat-types'
import {
  getSettingsForAgentTabRuntimeOwner,
  pasteDraftToAgentPtyWhenReady,
  submitPromptToAgentTab
} from '@/lib/agent-paste-draft'
import { scrapeNativeChatSession } from '@/components/native-chat/native-chat-scrape-fallback'
import { useAppStore } from '@/store'
import { sendRuntimePtyInputVerified } from '@/runtime/runtime-terminal-inspection'

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
    captureMode: ref.captureMode ?? 'native-transcript'
  }
}

/** Deliver through Orca's verified bracketed-paste + submit path. */
export async function sendInstruction(
  target: ResolvedCanvasAgent,
  message: AgentCanvasMessage
): Promise<DeliveryResult> {
  const timestamp = new Date().toISOString()
  try {
    const content = formatAgentInstruction(message)
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

function formatAgentInstruction(message: AgentCanvasMessage): string {
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
  return `[${heading} from ${message.fromAgentId ?? 'user'}]\n\n${message.content}${context}`
}
