import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  recordTerminalUserInputForLeaf: vi.fn()
}))

vi.mock('./terminal-input-activity', () => ({
  recordTerminalUserInputForLeaf: mocks.recordTerminalUserInputForLeaf
}))
import {
  queueTerminalQuickCommandForTab,
  registerTerminalQuickCommandTarget,
  sendTerminalQuickCommandToPane
} from './terminal-quick-command-dispatch'

function createPane() {
  return {
    leafId: 'leaf-1',
    terminal: {
      focus: vi.fn()
    }
  }
}

describe('sendTerminalQuickCommandToPane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes the formatted command to the PTY transport and refocuses the terminal', () => {
    const sendInput = vi.fn(() => true)
    const pane = createPane()

    const sent = sendTerminalQuickCommandToPane({
      command: {
        id: 'status',
        label: 'Status',
        command: 'git status',
        appendEnter: true
      },
      pane,
      tabId: 'tab-1',
      transport: { sendInput }
    })

    expect(sent).toBe(true)
    expect(sendInput).toHaveBeenCalledWith('git status\r')
    expect(pane.terminal.focus).toHaveBeenCalledOnce()
    expect(mocks.recordTerminalUserInputForLeaf).toHaveBeenCalledWith('tab-1', 'leaf-1')
  })

  it('does not focus the terminal when no connected transport accepts input', () => {
    const sendInput = vi.fn(() => false)
    const pane = createPane()

    const sent = sendTerminalQuickCommandToPane({
      command: {
        id: 'draft',
        label: 'Draft',
        command: 'npm test',
        appendEnter: false
      },
      pane,
      tabId: 'tab-1',
      transport: { sendInput }
    })

    expect(sent).toBe(false)
    expect(sendInput).toHaveBeenCalledWith('npm test')
    expect(pane.terminal.focus).not.toHaveBeenCalled()
    expect(mocks.recordTerminalUserInputForLeaf).not.toHaveBeenCalled()
  })

  it('flattens multiline commands with semicolons before sending', () => {
    const sendInput = vi.fn(() => true)
    const pane = createPane()
    const commandText = 'cd packages\nbun run build\ncd ..'

    const sent = sendTerminalQuickCommandToPane({
      command: {
        id: 'build',
        label: 'Build',
        command: commandText,
        appendEnter: true
      },
      pane,
      tabId: 'tab-1',
      transport: { sendInput }
    })

    expect(sent).toBe(true)
    expect(sendInput).toHaveBeenCalledWith('cd packages; bun run build; cd ..\r')
    expect(pane.terminal.focus).toHaveBeenCalledOnce()
  })

  it('flattens multiline insert-only commands without submitting', () => {
    const sendInput = vi.fn(() => true)
    const pane = createPane()
    const commandText = 'echo one\necho two'

    const sent = sendTerminalQuickCommandToPane({
      command: {
        id: 'insert',
        label: 'Insert',
        command: commandText,
        appendEnter: false
      },
      pane,
      tabId: 'tab-1',
      transport: { sendInput }
    })

    expect(sent).toBe(true)
    expect(sendInput).toHaveBeenCalledWith('echo one; echo two')
    expect(pane.terminal.focus).toHaveBeenCalledOnce()
  })

  it('does not write agent prompt quick commands into the current pane', () => {
    const sendInput = vi.fn(() => true)
    const focus = vi.fn()

    const sent = sendTerminalQuickCommandToPane({
      command: {
        id: 'agent',
        label: 'Agent',
        action: 'agent-prompt',
        agent: 'codex',
        prompt: 'Review this'
      },
      pane: { leafId: 'leaf-1', terminal: { focus } },
      tabId: 'tab-1',
      transport: { sendInput }
    })

    expect(sent).toBe(false)
    expect(sendInput).not.toHaveBeenCalled()
    expect(focus).not.toHaveBeenCalled()
    expect(mocks.recordTerminalUserInputForLeaf).not.toHaveBeenCalled()
  })
})

describe('deferred terminal quick-command dispatch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('retries until the terminal transport and shell prompt are ready', () => {
    const command = {
      id: 'canvas-agent',
      label: 'Canvas Agent',
      action: 'terminal-command' as const,
      command: 'opencode',
      appendEnter: true
    }
    const target = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)

    queueTerminalQuickCommandForTab('tab-deferred', command)
    const unregister = registerTerminalQuickCommandTarget('tab-deferred', target)
    expect(target).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(50)
    expect(target).toHaveBeenCalledTimes(2)
    expect(target).toHaveBeenLastCalledWith(command)
    unregister()
  })

  it('dispatches immediately when a ready target is already registered', () => {
    const target = vi.fn(() => true)
    const unregister = registerTerminalQuickCommandTarget('tab-ready', target)
    const command = {
      id: 'status',
      label: 'Status',
      action: 'terminal-command' as const,
      command: 'git status',
      appendEnter: true
    }

    queueTerminalQuickCommandForTab('tab-ready', command)
    expect(target).toHaveBeenCalledWith(command)
    unregister()
  })
})
