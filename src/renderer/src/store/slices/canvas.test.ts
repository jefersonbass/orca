import { describe, expect, it } from 'vitest'
import { parseWorkspaceSession } from '../../../../shared/workspace-session-schema'
import { worktreeWorkspaceKey } from '../../../../shared/workspace-scope'
import { normalizeCanvasDocument, type CanvasDocument } from '../../../../shared/canvas-types'
import { createTestStore } from './store-test-helpers'

function documentWithLabel(label: string): CanvasDocument {
  return {
    version: 2,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [{
      id: `note-${label}`,
      type: 'note',
      position: { x: 10, y: 20 },
      size: { width: 240, height: 160 },
      zIndex: 1,
      label
    }],
    edges: []
  }
}

describe('CanvasSlice workspace ownership', () => {
  it('normalizes legacy canvas state before React Flow receives it', () => {
    const normalized = normalizeCanvasDocument({
      viewport: { x: Number.NaN, y: 'bad', zoom: 99 },
      nodes: [
        { id: 'note', type: 'note', position: { x: 10 }, size: { width: 0 }, label: 'Recovered' },
        { id: 'unknown', type: 'removed-node-type', position: {}, size: {}, label: 42 },
      ],
      edges: [
        { id: 'valid', sourceNodeId: 'note', targetNodeId: 'unknown', type: 'depends-on' },
        { id: 'orphan', sourceNodeId: 'missing', targetNodeId: 'note', type: 'visual' },
      ],
    })

    expect(normalized.viewport).toEqual({ x: 0, y: 0, zoom: 5 })
    expect(normalized.nodes.map((node) => node.type)).toEqual(['note', 'note'])
    expect(normalized.nodes[0]?.size).toEqual({ width: 40, height: 100 })
    expect(normalized.edges.map((edge) => edge.id)).toEqual(['valid'])
  })

  it('keeps documents isolated when the active workspace changes', () => {
    const store = createTestStore()
    store.setState({ activeWorktreeId: 'workspace-a', activeWorkspaceKey: worktreeWorkspaceKey('workspace-a') })
    store.getState().activateCanvasWorkspace()
    store.getState().setCanvasDocument(documentWithLabel('A'))

    store.setState({ activeWorktreeId: 'workspace-b', activeWorkspaceKey: worktreeWorkspaceKey('workspace-b') })
    store.getState().activateCanvasWorkspace()
    expect(store.getState().canvasDocument?.nodes).toEqual([])
    store.getState().setCanvasDocument(documentWithLabel('B'))

    store.setState({ activeWorktreeId: 'workspace-a', activeWorkspaceKey: worktreeWorkspaceKey('workspace-a') })
    store.getState().activateCanvasWorkspace()
    expect(store.getState().canvasDocument?.nodes[0]?.label).toBe('A')
  })

  it('hydrates persisted documents and rejects malformed documents', () => {
    const validSession = parseWorkspaceSession({
      activeRepoId: null,
      activeWorktreeId: null,
      activeTabId: null,
      tabsByWorktree: {},
      terminalLayoutsByTabId: {},
      canvasDocumentsByWorkspaceKey: { [worktreeWorkspaceKey('workspace-a')]: documentWithLabel('A') }
    })
    expect(validSession.ok).toBe(true)

    const invalidSession = parseWorkspaceSession({
      activeRepoId: null,
      activeWorktreeId: null,
      activeTabId: null,
      tabsByWorktree: {},
      terminalLayoutsByTabId: {},
      canvasDocumentsByWorkspaceKey: { broken: { version: 2, nodes: 'not-an-array' } }
    })
    expect(invalidSession.ok).toBe(false)
  })

  it('isolates executable bindings and messages with the workspace', () => {
    const store = createTestStore()
    store.setState({ activeWorktreeId: 'workspace-a', activeWorkspaceKey: worktreeWorkspaceKey('workspace-a') })
    store.getState().activateCanvasWorkspace()
    store.getState().addCanvasBinding({ id: 'ctx-a', kind: 'context', sourceNodeId: 'note-a', targetAgentNodeId: 'agent-a', contextMode: 'full-content', enabled: true, createdAt: new Date(0).toISOString() })
    store.setState({ activeWorktreeId: 'workspace-b', activeWorkspaceKey: worktreeWorkspaceKey('workspace-b') })
    store.getState().activateCanvasWorkspace()
    expect(store.getState().canvasOrchestration.bindings).toEqual([])
    store.setState({ activeWorktreeId: 'workspace-a', activeWorkspaceKey: worktreeWorkspaceKey('workspace-a') })
    store.getState().activateCanvasWorkspace()
    expect(store.getState().canvasOrchestration.bindings.map((binding) => binding.id)).toEqual(['ctx-a'])
  })
})
