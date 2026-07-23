import type { TerminalQuickCommand } from '../../../../shared/types'
import {
  buildTerminalQuickCommandInput,
  flattenTerminalQuickCommand,
  isTerminalAgentQuickCommand
} from '../../../../shared/terminal-quick-commands'
import { recordTerminalUserInputForLeaf } from './terminal-input-activity'

type QuickCommandPane = {
  leafId: string
  terminal: {
    focus: () => void
  }
}

type QuickCommandTransport = {
  sendInput: (data: string) => boolean
}

type DeferredQuickCommandTarget = (command: TerminalQuickCommand) => boolean

const DEFERRED_QUICK_COMMAND_RETRY_MS = 50
const DEFERRED_QUICK_COMMAND_TIMEOUT_MS = 30_000
const deferredCommands = new Map<string, { command: TerminalQuickCommand; expiresAt: number }>()
const deferredTargets = new Map<string, DeferredQuickCommandTarget>()
const deferredRetryTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearDeferredQuickCommand(tabId: string): void {
  deferredCommands.delete(tabId)
  const timer = deferredRetryTimers.get(tabId)
  if (timer !== undefined) {
    clearTimeout(timer)
    deferredRetryTimers.delete(tabId)
  }
}

function tryDeferredQuickCommand(tabId: string): void {
  const pending = deferredCommands.get(tabId)
  if (!pending) {
    return
  }
  if (Date.now() >= pending.expiresAt) {
    clearDeferredQuickCommand(tabId)
    return
  }

  const target = deferredTargets.get(tabId)
  if (target?.(pending.command)) {
    clearDeferredQuickCommand(tabId)
    return
  }

  if (!deferredRetryTimers.has(tabId)) {
    deferredRetryTimers.set(
      tabId,
      setTimeout(() => {
        deferredRetryTimers.delete(tabId)
        tryDeferredQuickCommand(tabId)
      }, DEFERRED_QUICK_COMMAND_RETRY_MS)
    )
  }
}

/** Queue a one-shot command until the tab owns a connected, prompt-ready PTY. */
export function queueTerminalQuickCommandForTab(
  tabId: string,
  command: TerminalQuickCommand
): void {
  deferredCommands.set(tabId, {
    command,
    expiresAt: Date.now() + DEFERRED_QUICK_COMMAND_TIMEOUT_MS
  })
  tryDeferredQuickCommand(tabId)
}

/** Register the live pane dispatcher. The callback returns false until its
 * transport and first shell prompt are ready to accept user input. */
export function registerTerminalQuickCommandTarget(
  tabId: string,
  target: DeferredQuickCommandTarget
): () => void {
  deferredTargets.set(tabId, target)
  tryDeferredQuickCommand(tabId)
  return () => {
    if (deferredTargets.get(tabId) === target) {
      deferredTargets.delete(tabId)
    }
  }
}

export function sendTerminalQuickCommandToPane({
  command,
  pane,
  tabId,
  transport
}: {
  command: TerminalQuickCommand
  pane: QuickCommandPane
  tabId: string
  transport: QuickCommandTransport | null | undefined
}): boolean {
  if (isTerminalAgentQuickCommand(command)) {
    return false
  }
  if (!transport) {
    return false
  }

  const sent = transport.sendInput(
    buildTerminalQuickCommandInput(flattenTerminalQuickCommand(command))
  )
  if (sent) {
    recordTerminalUserInputForLeaf(tabId, pane.leafId)
    pane.terminal.focus()
  }
  return sent
}
