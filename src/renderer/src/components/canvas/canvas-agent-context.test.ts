import { describe, expect, it } from 'vitest'
import { buildCanvasAgentContext, canvasAgentContextEnv, findCanvasAgentContextForTab } from './canvas-agent-context'

const document = {
  version: 2 as const,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [
    { id: 'note-1', type: 'note' as const, position: { x: 0, y: 0 }, size: { width: 200, height: 100 }, zIndex: 1, label: 'Instruction', metadata: { content: 'Say hello world' } },
    { id: 'agent-1', type: 'agent-terminal' as const, position: { x: 300, y: 0 }, size: { width: 400, height: 200 }, zIndex: 2, label: 'Manager', resourceRef: { kind: 'terminal-tab' as const, tabId: 'tab-1', worktreeId: 'worktree-1' } },
    { id: 'agent-2', type: 'agent-terminal' as const, position: { x: 800, y: 0 }, size: { width: 400, height: 200 }, zIndex: 3, label: 'Worker', resourceRef: { kind: 'terminal-tab' as const, tabId: 'tab-2', worktreeId: 'worktree-1' } }
  ],
  edges: []
}

const bindings = [
  { id: 'context', kind: 'context' as const, sourceNodeId: 'note-1', targetAgentNodeId: 'agent-1', contextMode: 'full-content' as const, enabled: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'delegation', kind: 'delegation' as const, sourceAgentNodeId: 'agent-1', targetAgentNodeId: 'agent-2', permission: 'assign-task' as const, requiresUserApproval: true, enabled: true, createdAt: '2026-01-01T00:00:00.000Z' }
]

describe('canvas agent context', () => {
  it('serializes notes and linked agents into the real PTY environment shape', () => {
    const context = buildCanvasAgentContext(document, bindings, 'agent-1')!
    const env = canvasAgentContextEnv(context)

    expect(env.ORCA_NOTE).toContain('Say hello world')
    expect(env.ORCA_AGENTS).toContain('Worker (agent-2)')
    expect(env.ORCA_LINKS).toContain('note-1 -> agent-1')
    expect(env.ORCA_LINKS).toContain('agent-1 -> agent-2')
    expect(JSON.parse(env.ORCA_CANVAS_CONTEXT).nodeId).toBe('agent-1')
  })

  it('resolves the Canvas agent by its terminal tab', () => {
    const context = findCanvasAgentContextForTab(
      { workspace: document },
      { workspace: { bindings } },
      'tab-1'
    )
    expect(context?.nodeId).toBe('agent-1')
  })
})
