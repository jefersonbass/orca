import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/store'
import type { CanvasOperationalBinding } from '../../../../shared/canvas-agent-types'
import { createSpecificationCollaboration, specificationWorkflowCandidates, transitionCanvasCollaboration } from './canvas-collaboration-controller'
import { activateTaskForDelivery, advanceSpecificationWorkflow } from './canvas-workflow-progression'
import { deliverApprovedCanvasMessage } from './canvas-orchestration-runtime'

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

function setBindings(nextBindings: CanvasOperationalBinding[]): void {
  const orchestration = { bindings: nextBindings, messages: [], tasks: [], sessions: [] }
  useAppStore.setState((state) => ({
    ...state,
    canvasOrchestration: orchestration,
    canvasOrchestrationByWorkspaceKey: { 'canvas:unscoped': orchestration }
  }))
}

beforeEach(() => {
  useAppStore.setState((state) => ({
    ...state,
    canvasOrchestration: { bindings: [], messages: [], tasks: [], sessions: [] },
    canvasOrchestrationByWorkspaceKey: {}
  }))
})

describe('specification collaboration graph', () => {
  it('rejects incomplete graphs and accepts the full two-developer workflow', () => {
    setBindings(bindings.slice(0, -1))
    expect(specificationWorkflowCandidates()).toEqual([])

    setBindings(bindings)
    expect(specificationWorkflowCandidates()).toMatchObject([{
      leadAgentNodeId: 'lead', developerAgentNodeIds: ['dev-a', 'dev-b'],
      progressOutputBindingIds: ['dev-a-note', 'dev-b-note'], summaryOutputBindingId: 'lead-summary'
    }])
  })

  it('creates one lead task and two developer workstreams', () => {
    setBindings(bindings)
    const session = createSpecificationCollaboration(specificationWorkflowCandidates()[0]!)
    expect(session.subordinateAgentNodeIds).toEqual(['dev-a', 'dev-b'])
    expect(session.tasks).toHaveLength(3)
    expect(session.tasks.filter((task) => task.parentTaskId)).toHaveLength(2)
    expect(useAppStore.getState().canvasOrchestration.tasks).toHaveLength(3)
  })

  it('progresses Lead planning through two developer results to final synthesis approval', () => {
    setBindings(bindings)
    useAppStore.setState((state) => ({
      ...state,
      canvasDocument: {
        version: 2, viewport: { x: 0, y: 0, zoom: 1 }, edges: [],
        nodes: [
          { id: 'spec', type: 'note', position: { x: 0, y: 0 }, size: { width: 200, height: 100 }, zIndex: 1, label: 'Spec', metadata: { content: 'Build it' } },
          { id: 'progress-a', type: 'note', position: { x: 0, y: 0 }, size: { width: 200, height: 100 }, zIndex: 2, label: 'A' },
          { id: 'progress-b', type: 'note', position: { x: 0, y: 0 }, size: { width: 200, height: 100 }, zIndex: 3, label: 'B' },
          { id: 'summary', type: 'note', position: { x: 0, y: 0 }, size: { width: 200, height: 100 }, zIndex: 4, label: 'Summary' }
        ]
      }
    }))
    const created = createSpecificationCollaboration(specificationWorkflowCandidates()[0]!)
    transitionCanvasCollaboration(created.id, 'awaiting-approval')
    transitionCanvasCollaboration(created.id, 'active')
    const planning = useAppStore.getState().canvasOrchestration.messages.find((message) => message.type === 'instruction')!
    expect(planning.content).toContain('exactly 2 non-overlapping workstreams')

    advanceSpecificationWorkflow(planning, {
      content: JSON.stringify({ delegations: [
        { agentNodeId: 'dev-a', task: 'Implement A' },
        { agentNodeId: 'dev-b', task: 'Implement B' }
      ] }), messageId: 'lead-plan', timestamp: 1
    })
    const delegations = useAppStore.getState().canvasOrchestration.messages.filter((message) => message.type === 'delegation')
    expect(delegations.map((message) => message.content)).toEqual(['Implement A', 'Implement B'])

    delegations.forEach((message, index) => {
      activateTaskForDelivery(message)
      advanceSpecificationWorkflow(message, { content: `Developer ${index + 1} result`, messageId: `dev-${index}`, timestamp: 2 })
    })
    const state = useAppStore.getState().canvasOrchestration
    expect(state.tasks.filter((task) => task.parentTaskId).every((task) => task.state === 'completed')).toBe(true)
    expect(state.messages.filter((message) => message.type === 'result')).toHaveLength(2)
    expect(state.messages.find((message) => message.type === 'review-request')?.content).toContain('Developer 2 result')

    const synthesis = state.messages.find((message) => message.type === 'review-request')!
    advanceSpecificationWorkflow(synthesis, { content: 'Final summary', messageId: 'lead-summary', timestamp: 3 })
    expect(useAppStore.getState().canvasOrchestration.messages.find(
      (message) => message.type === 'result' && message.toAgentId === 'summary'
    )).toMatchObject({ content: 'Final summary', deliveryState: 'awaiting-approval' })
  })

  it('blocks delivery while paused and cascades cancellation to work and messages', async () => {
    setBindings(bindings)
    const session = createSpecificationCollaboration(specificationWorkflowCandidates()[0]!)
    transitionCanvasCollaboration(session.id, 'awaiting-approval')
    transitionCanvasCollaboration(session.id, 'active')
    const planning = useAppStore.getState().canvasOrchestration.messages.find((message) => message.type === 'instruction')!

    transitionCanvasCollaboration(session.id, 'paused')
    await deliverApprovedCanvasMessage(planning.id)
    expect(useAppStore.getState().canvasOrchestration.messages.find((message) => message.id === planning.id)?.deliveryState)
      .toBe('awaiting-approval')

    transitionCanvasCollaboration(session.id, 'cancelled')
    const state = useAppStore.getState().canvasOrchestration
    expect(state.sessions.find((item) => item.id === session.id)?.state).toBe('cancelled')
    expect(state.tasks.every((task) => task.state === 'cancelled')).toBe(true)
    expect(state.messages.every((message) => message.deliveryState === 'cancelled')).toBe(true)
  })
})
