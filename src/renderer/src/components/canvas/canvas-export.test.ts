import { describe, expect, it } from 'vitest'
import { renderCanvasSvg } from './canvas-export'
import type { CanvasDocument } from '../../../../shared/canvas-types'

const fixture: CanvasDocument = {
  version: 2,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [
    { id: 'note', type: 'note', position: { x: 40, y: 60 }, size: { width: 240, height: 140 }, zIndex: 1, label: 'Especificação', metadata: { content: 'Linha 1\nLinha 2' } },
    { id: 'label', type: 'label', position: { x: 360, y: 80 }, size: { width: 160, height: 60 }, zIndex: 2, label: 'Review', color: '#60a5fa' },
  ],
  edges: [{ id: 'edge', sourceNodeId: 'note', targetNodeId: 'label', type: 'depends-on', relationship: 'depends-on' }],
}

describe('canvas export', () => {
  it('renders persisted nodes, text and edges as standalone SVG', () => {
    const result = renderCanvasSvg(fixture)
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
    expect(result.svg).toContain('Especificação')
    expect(result.svg).toContain('Linha 2')
    expect(result.svg).toContain('canvas-grid')
    expect(result.svg).toContain('<path')
    expect(result.svg).not.toContain('foreignObject')
  })
})
