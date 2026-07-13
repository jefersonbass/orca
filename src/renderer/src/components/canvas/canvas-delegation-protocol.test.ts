import { describe, expect, it } from 'vitest'
import { parseCanvasDelegationRequests } from './canvas-delegation-protocol'

describe('parseCanvasDelegationRequests', () => {
  it('parses a provider-neutral linked-agent request', () => {
    expect(parseCanvasDelegationRequests(
      'I will ask the worker.\n<orca-delegate target="agent-2">Say hello world</orca-delegate>'
    )).toEqual([{ targetAgentNodeId: 'agent-2', content: 'Say hello world' }])
  })

  it('ignores malformed or empty requests', () => {
    expect(parseCanvasDelegationRequests('<orca-delegate>missing target</orca-delegate>')).toEqual([])
  })
})
