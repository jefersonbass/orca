import { describe, expect, it } from 'vitest'
import { allowedBindingKinds, createOperationalBinding } from './canvas-operational-graph'

describe('canvas operational graph', () => {
  it('supports the Maestri-style composable connection matrix', () => {
    expect(allowedBindingKinds('note', 'agent-terminal')).toEqual(['context'])
    expect(allowedBindingKinds('agent-terminal', 'agent-terminal')).toEqual(['delegation', 'reporting'])
    expect(allowedBindingKinds('agent-terminal', 'note')).toEqual(['output'])
    expect(allowedBindingKinds('browser-preview', 'agent-terminal')).toEqual(['context'])
    expect(allowedBindingKinds('pull-request', 'live-terminal')).toEqual(['context'])
    expect(allowedBindingKinds('highlight', 'agent-terminal')).toEqual(['context'])
    expect(allowedBindingKinds('note', 'note')).toEqual([])
  })

  it('creates behavior-bearing bindings separately from semantic edges', () => {
    expect(createOperationalBinding({ kind: 'delegation', sourceNodeId: 'lead', targetNodeId: 'dev' }))
      .toMatchObject({ kind: 'delegation', sourceAgentNodeId: 'lead', targetAgentNodeId: 'dev', requiresUserApproval: true })
  })
})
