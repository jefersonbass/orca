import { describe, expect, it } from 'vitest'
import {
  canvasTerminalPortalStyle,
  normalizeCanvasTerminalZoom
} from './canvas-terminal-portal-geometry'

describe('canvasTerminalPortalStyle', () => {
  it('counter-scales xterm while preserving its visible bounds', () => {
    expect(canvasTerminalPortalStyle(0.5)).toMatchObject({
      width: '50%',
      height: '50%',
      transform: 'scale(2)'
    })
    expect(canvasTerminalPortalStyle(2)).toMatchObject({
      width: '200%',
      height: '200%',
      transform: 'scale(0.5)'
    })
  })

  it('clamps invalid or extreme zoom values', () => {
    expect(canvasTerminalPortalStyle(Number.NaN).transform).toBe('scale(1)')
    expect(canvasTerminalPortalStyle(0).transform).toBe('scale(10)')
    expect(canvasTerminalPortalStyle(99).transform).toBe('scale(0.2)')
  })

  it('publishes the same safe scale for xterm font and cell metrics', () => {
    expect(normalizeCanvasTerminalZoom(0.5)).toBe(0.5)
    expect(normalizeCanvasTerminalZoom(Number.NaN)).toBe(1)
    expect(normalizeCanvasTerminalZoom(0)).toBe(0.1)
    expect(normalizeCanvasTerminalZoom(99)).toBe(5)
  })
})
