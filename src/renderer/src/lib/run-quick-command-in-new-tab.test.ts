import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runQuickCommandInNewTab } from './run-quick-command-in-new-tab'

type MockStoreState = {
  createTab: ReturnType<typeof vi.fn>
  queueTabStartupCommand: ReturnType<typeof vi.fn>
  consumeTabStartupCommand: ReturnType<typeof vi.fn>
  setActiveTabType: ReturnType<typeof vi.fn>
  setTabBarOrder: ReturnType<typeof vi.fn>
  setRecentQuickCommandForGroup: ReturnType<typeof vi.fn>
  tabsByWorktree: Record<string, { id: string }[]>
  unifiedTabsByWorktree: Record<
    string,
    { entityId: string; contentType: string; groupId: string }[]
  >
  activeGroupIdByWorktree: Record<string, string>
  openFiles: { id: string; worktreeId: string }[]
  browserTabsByWorktree: Record<string, { id: string }[]>
  tabBarOrderByWorktree: Record<string, string[]>
}

const mocks = vi.hoisted(() => ({
  launchAgentInNewTab: vi.fn(),
  queueTerminalQuickCommandForTab: vi.fn()
}))

let mockState: MockStoreState

vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => mockState
  }
}))

vi.mock('@/lib/launch-agent-in-new-tab', () => ({
  launchAgentInNewTab: mocks.launchAgentInNewTab
}))

vi.mock('@/components/terminal-pane/terminal-quick-command-dispatch', () => ({
  queueTerminalQuickCommandForTab: mocks.queueTerminalQuickCommandForTab
}))

function createStoreState(): MockStoreState {
  return {
    createTab: vi.fn(() => ({ id: 'tab-new' })),
    queueTabStartupCommand: vi.fn(),
    consumeTabStartupCommand: vi.fn(),
    setActiveTabType: vi.fn(),
    setTabBarOrder: vi.fn(),
    setRecentQuickCommandForGroup: vi.fn(),
    tabsByWorktree: { 'wt-1': [{ id: 'tab-existing' }, { id: 'tab-new' }] },
    unifiedTabsByWorktree: {
      'wt-1': [{ entityId: 'tab-new', contentType: 'terminal', groupId: 'group-1' }]
    },
    activeGroupIdByWorktree: { 'wt-1': 'group-1' },
    openFiles: [],
    browserTabsByWorktree: {},
    tabBarOrderByWorktree: {}
  }
}

describe('runQuickCommandInNewTab', () => {
  beforeEach(() => {
    mockState = createStoreState()
    mocks.launchAgentInNewTab.mockReset()
    mocks.queueTerminalQuickCommandForTab.mockReset()
  })

  it('queues multiline quick commands for the connected tab', () => {
    const command = {
      id: 'build',
      label: 'Build',
      action: 'terminal-command' as const,
      command: 'cd packages\nbun run build\ncd ..',
      appendEnter: true
    }
    const result = runQuickCommandInNewTab({
      command,
      worktreeId: 'wt-1',
      groupId: 'group-1',
      startupCwd: 'packages/canvas'
    })

    expect(result).toEqual({ tabId: 'tab-new' })
    expect(mockState.createTab).toHaveBeenCalledWith('wt-1', 'group-1', undefined, {
      quickCommandLabel: 'Build',
      startupCwd: 'packages/canvas'
    })
    expect(mocks.queueTerminalQuickCommandForTab).toHaveBeenCalledWith('tab-new', command)
    expect(mockState.queueTabStartupCommand).not.toHaveBeenCalled()
    expect(mockState.setRecentQuickCommandForGroup).toHaveBeenCalledWith('group-1', 'build')
  })

  it('preserves agent identity while running a raw Canvas command', () => {
    runQuickCommandInNewTab({
      command: {
        id: 'canvas-agent',
        label: 'Canvas Agent',
        action: 'terminal-command',
        command: 'opencode --continue',
        appendEnter: true
      },
      worktreeId: 'wt-1',
      launchAgent: 'opencode'
    })

    expect(mockState.createTab).toHaveBeenCalledWith('wt-1', undefined, undefined, {
      launchAgent: 'opencode',
      quickCommandLabel: 'Canvas Agent'
    })
    expect(mocks.queueTerminalQuickCommandForTab).toHaveBeenCalledWith(
      'tab-new',
      expect.objectContaining({ command: 'opencode --continue' })
    )
  })

  it('keeps single-line quick commands unchanged', () => {
    runQuickCommandInNewTab({
      command: {
        id: 'status',
        label: 'Status',
        action: 'terminal-command',
        command: 'git status',
        appendEnter: true
      },
      worktreeId: 'wt-1',
      groupId: 'group-1'
    })

    expect(mocks.queueTerminalQuickCommandForTab).toHaveBeenCalledWith(
      'tab-new',
      expect.objectContaining({ command: 'git status' })
    )
  })

  it('launches agent quick commands through the programmatic agent prompt path', () => {
    mocks.launchAgentInNewTab.mockReturnValue({ tabId: 'tab-agent' })
    mockState.unifiedTabsByWorktree['repo::worktree'] = [
      { entityId: 'tab-agent', contentType: 'terminal', groupId: 'group-1' }
    ]

    const result = runQuickCommandInNewTab({
      command: {
        id: 'agent-review',
        label: 'Review',
        action: 'agent-prompt',
        agent: 'codex',
        prompt: 'Review this diff'
      },
      worktreeId: 'repo::worktree',
      groupId: 'group-1'
    })

    expect(result).toEqual({ tabId: 'tab-agent' })
    expect(mocks.launchAgentInNewTab).toHaveBeenCalledWith({
      agent: 'codex',
      prompt: 'Review this diff',
      worktreeId: 'repo::worktree',
      groupId: 'group-1',
      launchSource: 'quick_command',
      quickCommandLabel: 'Review'
    })
    expect(mockState.queueTabStartupCommand).not.toHaveBeenCalled()
    expect(mockState.setRecentQuickCommandForGroup).toHaveBeenCalledWith('group-1', 'agent-review')
  })

  it('falls back to the active group when context-menu group resolution is missing', () => {
    mockState.activeGroupIdByWorktree['repo::worktree'] = 'active-group'
    mocks.launchAgentInNewTab.mockReturnValue({ tabId: 'tab-agent' })

    const result = runQuickCommandInNewTab({
      command: {
        id: 'agent-review',
        label: 'Review',
        action: 'agent-prompt',
        agent: 'codex',
        prompt: 'Review this diff'
      },
      worktreeId: 'repo::worktree',
      groupId: null
    })

    expect(result).toEqual({ tabId: 'tab-agent' })
    expect(mocks.launchAgentInNewTab).toHaveBeenCalledWith({
      agent: 'codex',
      prompt: 'Review this diff',
      worktreeId: 'repo::worktree',
      groupId: undefined,
      launchSource: 'quick_command',
      quickCommandLabel: 'Review'
    })
    expect(mockState.setRecentQuickCommandForGroup).toHaveBeenCalledWith(
      'active-group',
      'agent-review'
    )
  })

  it('does not launch post-start-only agent quick commands', () => {
    const result = runQuickCommandInNewTab({
      command: {
        id: 'agent-aider',
        label: 'Aider',
        action: 'agent-prompt',
        agent: 'aider',
        prompt: 'Review this diff'
      },
      worktreeId: 'repo::worktree',
      groupId: 'group-1'
    })

    expect(result).toBeNull()
    expect(mocks.launchAgentInNewTab).not.toHaveBeenCalled()
    expect(mockState.queueTabStartupCommand).not.toHaveBeenCalled()
  })
})
