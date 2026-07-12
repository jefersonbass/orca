import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import type { CanvasOperationalBinding } from '../../../../shared/canvas-agent-types'
import { createSpecificationCollaboration, specificationWorkflowCandidates } from './canvas-collaboration-controller'

const now = '2026-07-12T00:00:00.000Z'
const bindings: CanvasOperationalBinding[] = [
  { id: 'spec-lead', kind: 'context', sourceNodeId: 'spec', targetAgentNodeId: 'lead', contextMode: 'full-content', enabled: true, createdAt: now },
  { id: 'lead-dev-a', kind: 'delegation', sourceAgentNodeId: 'lead', targetAgentNodeId: 'dev-a', permission: 'assign-task', requiresUserApproval: true, enabled: true, createdAt: now },
  { id: 'lead-dev-b', kind: 'delegation', sourceAgentNodeId: 'lead', targetAgentNodeId: 'dev-b', permission: 'assign-task', requiresUserApproval: true, enabled: true, createdAt: now },
  { id: 'dev-a-note', kind: 'output', sourceAgentNodeId: 'dev-a', targetNoteNodeId: 'progress-a', outputMode: 'append-progress', approvalMode: 'always-review', enabled: true, createdAt: now },
  { id: 'dev-b-note', kind: 'output', sourceAgentNodeId: 'dev-b', targetNoteNodeId: 'progress-b', outputMode: 'append-progress', approvalMode: 'always-review', enabled: true, createdAt: now },
  { id: 'dev-a-lead', kind: 'reporting', sourceAgentNodeId: 'dev-a', targetAgentNodeId: 'lead', reportMode: 'result', enabled: true, createdAt: now },
  { id: 'dev-b-lead', kind: 'reporting', sourceAgentNodeId: 'dev-b', targetAgentNodeId: 'lead', reportMode: 'result', enabled: true, createdAt: now },
  { id: 'lead-summary', kind: 'output', sourceAgentNodeId: 'lead', targetNoteNodeId: 'summary', outputMode: 'append-summary', approvalMode: 'always-review', enabled: true, createdAt: now }
]

beforeEach(() => {
  useAppStore.setState((state) => ({
    ...state,
    canvasOrchestration: { bindings: [], messages: [], tasks: [], sessions: [] },
    canvasOrchestrationByWorkspaceKey: {}
  }))
})

describe('specification collaboration graph', () => {
  it('rejects incomplete graphs and accepts the full two-developer workflow', () => {
    useAppStore.setState((state) => ({
      ...state,
      canvasOrchestration: { ...state.canvasOrchestration, bindings: bindings.slice(0, -1) }
    }))
    expect(specificationWorkflowCandidates()).toEqual([])

    useAppStore.setState((state) => ({
      ...state,
      canvasOrchestration: { ...state.canvasOrchestration, bindings }
    }))
    expect(specificationWorkflowCandidates()).toMatchObject([{
      leadAgentNodeId: 'lead', developerAgentNodeIds: ['dev-a', 'dev-b'],
      progressOutputBindingIds: ['dev-a-note', 'dev-b-note'], summaryOutputBindingId: 'lead-summary'
    }])
  })

  it('creates one lead task and two developer workstreams', () => {
    useAppStore.setState((state) => ({
      ...state,
      canvasOrchestration: { ...state.canvasOrchestration, bindings }
    }))
    const session = createSpecificationCollaboration(specificationWorkflowCandidates()[0]!)
    expect(session.subordinateAgentNodeIds).toEqual(['dev-a', 'dev-b'])
    expect(session.tasks).toHaveLength(3)
    expect(session.tasks.filter((task) => task.parentTaskId)).toHaveLength(2)
    expect(useAppStore.getState().canvasOrchestration.tasks).toHaveLength(3)
  })
})
