import { describe, expect, it } from 'vitest'
import { parseWorkspaceSession } from '../../../../shared/workspace-session-schema'
import { worktreeWorkspaceKey } from '../../../../shared/workspace-scope'
import type { CanvasDocument } from '../../../../shared/canvas-types'
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
