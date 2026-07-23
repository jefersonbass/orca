import { describe, expect, it } from 'vitest'
import { CanvasContextDeliveryGate } from './canvas-context-delivery-gate'

describe('CanvasContextDeliveryGate', () => {
  it('blocks duplicate queued and delivered updates', () => {
    const gate = new CanvasContextDeliveryGate()
    expect(gate.begin('binding-1', 'snapshot-a')).toBe(true)
    expect(gate.begin('binding-1', 'snapshot-a')).toBe(false)
    gate.complete('binding-1', 'snapshot-a')
    expect(gate.begin('binding-1', 'snapshot-a')).toBe(false)
    expect(gate.begin('binding-1', 'snapshot-b')).toBe(true)
  })

  it('allows a failed update to be attempted again', () => {
    const gate = new CanvasContextDeliveryGate()
    expect(gate.begin('binding-1', 'snapshot-a')).toBe(true)
    gate.fail('binding-1', 'snapshot-a')
    expect(gate.begin('binding-1', 'snapshot-a')).toBe(true)
  })
})
