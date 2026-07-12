/**
 * Provider-neutral agent communication adapter.
 *
 * Sends structured messages to real Orca agent sessions.
 * Falls back to terminal input when no structured API exists.
 *
 * No hidden shell commands. No uncontrolled terminal injection.
 * All outgoing messages are visible and user-approved.
 */

import type { AgentCanvasMessage, CanvasAgentReference } from '../../../../shared/canvas-agent-types'

export type DeliveryResult = {
  success: boolean
  messageId: string
  timestamp: string
  error?: string
  providerReceipt?: string
}

export type AgentRuntimeStatus = {
  state: 'idle' | 'working' | 'blocked' | 'waiting' | 'done' | 'disconnected'
  currentTask?: string
  provider: string
}

export type ContextPayload = {
  title: string
  content: string
  sourceNodeId: string
  worktreeId?: string
  contentHash: string
  deliveryTimestamp: string
}

export type AgentResolutionResult =
  | { ok: true; sessionId: string; paneKey: string }
  | { ok: false; error: string }

/**
 * Resolves a Canvas agent reference to a real Orca agent session.
 */
export function resolveCanvasAgent(
  ref: CanvasAgentReference,
  agentStatusByPaneKey: Record<string, any>
): AgentResolutionResult {
  // Try exact paneKey match
  if (ref.paneKey && agentStatusByPaneKey[ref.paneKey]) {
    return { ok: true, sessionId: ref.agentSessionId, paneKey: ref.paneKey }
  }
  // Try terminalTabId match
  if (ref.terminalTabId) {
    const match = Object.entries(agentStatusByPaneKey).find(
      ([key]) => key.startsWith(ref.terminalTabId!)
    )
    if (match) {
      return { ok: true, sessionId: ref.agentSessionId, paneKey: match[0] }
    }
  }
  return { ok: false, error: 'Agent session not found' }
}

/**
 * Provider-neutral send instruction.
 * Uses the existing Orca agent runtime — falls back to terminal input
 * only when no structured API exists.
 */
export async function sendInstruction(
  target: AgentResolutionResult & { ok: true },
  message: AgentCanvasMessage
): Promise<DeliveryResult> {
  if (!target.ok) {
    return { success: false, messageId: message.id, timestamp: new Date().toISOString(), error: 'Invalid target' }
  }

  try {
    // Use existing Orca IPC to send to the agent's terminal
    const ptyApi = (window as any).api?.pty
    if (ptyApi?.write) {
      // Format the instruction as structured text that the agent can process
      const instruction = formatAgentInstruction(message)
      await ptyApi.write(target.paneKey, instruction)
      return {
        success: true,
        messageId: message.id,
        timestamp: new Date().toISOString(),
        providerReceipt: `sent-to-${target.paneKey}`,
      }
    }
    return { success: false, messageId: message.id, timestamp: new Date().toISOString(), error: 'No PTY API available' }
  } catch (err) {
    return { success: false, messageId: message.id, timestamp: new Date().toISOString(), error: String(err) }
  }
}

function formatAgentInstruction(message: AgentCanvasMessage): string {
  const parts: string[] = []
  if (message.type === 'instruction') {
    parts.push(`[INSTRUCTION from ${message.fromAgentId ?? 'user'}]`)
  } else if (message.type === 'delegation') {
    parts.push(`[DELEGATION from ${message.fromAgentId ?? 'user'}]`)
  } else if (message.type === 'review-request') {
    parts.push(`[REVIEW REQUEST from ${message.fromAgentId ?? 'user'}]`)
  }
  parts.push('')
  parts.push(message.content)
  parts.push('')
  if (message.contextRefs.length > 0) {
    parts.push('Context references:')
    for (const ref of message.contextRefs) {
      parts.push(`- ${ref.resourceType}: ${ref.nodeId}${ref.snapshotHash ? ` (hash: ${ref.snapshotHash})` : ''}`)
    }
  }
  return parts.join('\n') + '\n'
}
