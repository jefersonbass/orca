import { describe, expect, it } from 'vitest'
import { reconcileCanvasOrchestrationAfterRestart, transitionCanvasMessage, transitionCanvasTask, transitionCollaborationSession } from './canvas-state-machines'
import type { AgentCanvasMessage, CanvasAgentTask, CollaborationSession } from './canvas-agent-types'

const now = new Date(0).toISOString()
const message = (state: AgentCanvasMessage['deliveryState']): AgentCanvasMessage => ({ id: 'm', toAgentId: 'a', type: 'instruction', content: 'x', contextRefs: [], createdAt: now, deliveryState: state })
const task = (state: CanvasAgentTask['state']): CanvasAgentTask => ({ id: 't', title: 'T', description: 'x', createdBy: 'user', contextBindingIds: [], outputBindingIds: [], state, createdAt: now, updatedAt: now })
const session = (state: CollaborationSession['state']): CollaborationSession => ({ id: 's', leadAgentNodeId: 'lead', subordinateAgentNodeIds: [], tasks: [], messages: [], state, createdAt: now, updatedAt: now })

describe('Canvas state machines', () => {
  it('records valid transitions and rejects skips', () => {
    const awaiting = transitionCanvasMessage(message('draft'), 'awaiting-approval', 'user')
    expect(awaiting.transitions).toHaveLength(1)
    expect(() => transitionCanvasMessage(awaiting, 'delivering', 'system')).toThrow('Invalid Canvas state transition')
    expect(transitionCanvasMessage(awaiting, 'queued', 'user').deliveryState).toBe('queued')
  })

  it('interrupts unreconciled work after restart without replaying messages', () => {
    const reconciled = reconcileCanvasOrchestrationAfterRestart({
      bindings: [], messages: [message('delivering')], tasks: [task('running')], sessions: [session('active')]
    })
    expect(reconciled.messages[0]?.deliveryState).toBe('failed')
    expect(reconciled.tasks[0]?.state).toBe('interrupted')
    expect(reconciled.sessions[0]?.state).toBe('interrupted')
  })

  it('supports pause, resume and cancellation through explicit transitions', () => {
    const active = transitionCollaborationSession(transitionCollaborationSession(session('draft'), 'awaiting-approval', 'user'), 'active', 'user')
    const paused = transitionCollaborationSession(active, 'paused', 'user')
    expect(transitionCollaborationSession(paused, 'active', 'user').state).toBe('active')
    expect(transitionCanvasTask(task('running'), 'cancelled', 'user').state).toBe('cancelled')
  })
})
