import { describe, expect, it } from 'vitest'
import { resolveCanvasAgent } from './canvas-provider-adapter'

describe('resolveCanvasAgent', () => {
  it('preserves an explicitly discovered transcript when agent hooks are unavailable', () => {
    const resolved = resolveCanvasAgent({
      agentSessionId: 'session-123',
      paneKey: 'tab-1:leaf-1',
      provider: 'codex',
      transcriptPath: 'C:\\Users\\tester\\.codex\\sessions\\session-123.jsonl',
      captureMode: 'native-transcript'
    }, {})

    expect(resolved).toEqual({
      ok: true,
      sessionId: 'session-123',
      paneKey: 'tab-1:leaf-1',
      tabId: 'tab-1',
      provider: 'codex',
      transcriptPath: 'C:\\Users\\tester\\.codex\\sessions\\session-123.jsonl',
      captureMode: 'native-transcript'
    })
  })

  it('resolves an OpenCode terminal through scrape when hooks are unavailable', () => {
    const resolved = resolveCanvasAgent({
      agentSessionId: 'canvas-tab:tab-1',
      paneKey: 'tab-1',
      terminalTabId: 'tab-1',
      provider: 'opencode',
      captureMode: 'terminal-scrape'
    }, {})

    expect(resolved).toMatchObject({
      ok: true,
      sessionId: 'canvas-tab:tab-1',
      paneKey: 'tab-1',
      tabId: 'tab-1',
      provider: 'opencode',
      captureMode: 'terminal-scrape'
    })
  })

  it('keeps custom CLI agents on the PTY delivery path', () => {
    const resolved = resolveCanvasAgent({
      agentSessionId: 'verboo-session',
      paneKey: 'tab-2:leaf-2',
      terminalTabId: 'tab-2',
      provider: 'verboo'
    }, {
      'tab-2:leaf-2': {
        state: 'done',
        prompt: '',
        updatedAt: Date.now(),
        stateStartedAt: Date.now(),
        paneKey: 'tab-2:leaf-2',
        tabId: 'tab-2',
        agentType: 'verboo',
        stateHistory: []
      }
    })

    expect(resolved).toMatchObject({
      ok: true,
      provider: 'verboo',
      captureMode: 'terminal-scrape'
    })
  })
})
