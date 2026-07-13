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
})
