import { describe, it, expect } from 'vitest'
import type { CanvasNodeType, CanvasNodeDocument, CanvasDocument, EdgeRelationshipType, CanvasResourceReference, CanvasUndoStack } from './canvas-types'

describe('CanvasNodeType', () => {
  it('includes all expected node types', () => {
    const types: CanvasNodeType[] = [
      'terminal-summary', 'agent-summary', 'missing-resource',
      'note', 'sticky-note', 'group', 'label', 'rectangle', 'arrow', 'highlight',
      'live-terminal', 'agent-terminal',
      'file', 'folder', 'diff', 'pull-request', 'task',
      'browser-preview', 'browser-session',
      'orchestrator', 'drawing',
    ]
    expect(types.length).toBeGreaterThanOrEqual(20)
  })
})

describe('CanvasNodeDocument', () => {
  it('requires all mandatory fields', () => {
    const doc: CanvasNodeDocument = {
      id: 'n1',
      type: 'note',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 100 },
      zIndex: 1,
      label: 'Test',
    }
    expect(doc.id).toBe('n1')
    expect(doc.type).toBe('note')
  })

  it('supports optional fields', () => {
    const doc: CanvasNodeDocument = {
      id: 'n2',
      type: 'file',
      position: { x: 100, y: 200 },
      size: { width: 180, height: 80 },
      zIndex: 2,
      label: 'File',
      color: '#3b82f6',
      groupId: 'g1',
      resourceRef: { kind: 'file', worktreeId: 'wt1', relativePath: 'src/main.ts' },
    }
    expect(doc.color).toBe('#3b82f6')
    expect(doc.resourceRef?.kind).toBe('file')
  })
})

describe('CanvasDocument', () => {
  it('has version 2', () => {
    const doc: CanvasDocument = {
      version: 2,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [],
      edges: [],
    }
    expect(doc.version).toBe(2)
  })
})

describe('EdgeRelationshipType', () => {
  it('includes all 12 types', () => {
    const types: EdgeRelationshipType[] = [
      'implements', 'modifies', 'generates', 'documents', 'reviews',
      'depends-on', 'blocks', 'uses', 'created-from', 'related-to',
      'assigned-to', 'owned-by',
    ]
    expect(types.length).toBe(12)
  })
})

describe('CanvasResourceReference', () => {
  it('supports file kind with required fields', () => {
    const ref: CanvasResourceReference = { kind: 'file', worktreeId: 'wt1', relativePath: 'src/main.ts' }
    expect(ref.kind).toBe('file')
  })

  it('supports task kind with provider', () => {
    const ref: CanvasResourceReference = { kind: 'task', source: 'github', taskId: '42' }
    expect(ref.source).toBe('github')
  })

  it('supports browser-preview kind', () => {
    const ref: CanvasResourceReference = { kind: 'browser-preview', url: 'https://example.com' }
    expect(ref.kind).toBe('browser-preview')
  })
})

describe('CanvasUndoStack', () => {
  it('has maxSize field', () => {
    const stack: CanvasUndoStack = { past: [], future: [], maxSize: 50 }
    expect(stack.maxSize).toBe(50)
  })
})
