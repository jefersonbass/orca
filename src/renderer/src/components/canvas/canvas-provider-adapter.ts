import type { AgentCanvasMessage, CanvasAgentReference } from '../../../../shared/canvas-agent-types'
import type { AgentStatusEntry, AgentType } from '../../../../shared/agent-status-types'
import type { NativeChatMessage } from '../../../../shared/native-chat-types'
import { submitPromptToAgentTab } from '@/lib/agent-paste-draft'

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
  if (!entry) return { ok: false, error: 'Agent session not found' }

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
      : {})
  }
}

/** Deliver through Orca's verified bracketed-paste + submit path. */
export async function sendInstruction(
  target: ResolvedCanvasAgent,
  message: AgentCanvasMessage
): Promise<DeliveryResult> {
  const timestamp = new Date().toISOString()
  try {
    const submitted = await submitPromptToAgentTab({
      tabId: target.tabId,
      content: formatAgentInstruction(message)
    })
    if (!submitted) {
      return { success: false, messageId: message.id, timestamp, error: 'Agent PTY did not accept the prompt' }
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
  const result = await window.api.nativeChat.readSession(
    target.provider,
    target.sessionId,
    200,
    target.transcriptPath
  )
  if ('error' in result) throw new Error(result.error)
  return new Set(result.messages.map((message) => message.id))
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
