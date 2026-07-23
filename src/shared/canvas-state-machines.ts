import type {
  AgentCanvasMessage, CanvasAgentTask, CanvasAgentTaskState, CanvasTransitionActor,
  CollaborationSession, CollaborationSessionState, MessageDeliveryState
} from './canvas-agent-types'

const MESSAGE_TRANSITIONS: Record<MessageDeliveryState, readonly MessageDeliveryState[]> = {
  draft: ['awaiting-approval', 'cancelled'],
  'awaiting-approval': ['queued', 'cancelled'],
  queued: ['delivering', 'cancelled'],
  delivering: ['delivered', 'failed', 'cancelled'],
  delivered: ['acknowledged', 'failed', 'cancelled'],
  acknowledged: [], failed: ['queued', 'cancelled'], cancelled: []
}
const TASK_TRANSITIONS: Record<CanvasAgentTaskState, readonly CanvasAgentTaskState[]> = {
  draft: ['awaiting-approval', 'cancelled'], 'awaiting-approval': ['ready', 'cancelled'],
  ready: ['assigned', 'cancelled'], assigned: ['running', 'blocked', 'cancelled'],
  running: ['waiting-for-input', 'blocked', 'completed', 'failed', 'cancelled', 'interrupted'],
  'waiting-for-input': ['running', 'blocked', 'cancelled', 'interrupted'],
  blocked: ['ready', 'assigned', 'running', 'failed', 'cancelled', 'interrupted'],
  completed: [], failed: ['ready', 'cancelled'], cancelled: [], interrupted: ['ready', 'cancelled']
}
const SESSION_TRANSITIONS: Record<CollaborationSessionState, readonly CollaborationSessionState[]> = {
  draft: ['awaiting-approval', 'cancelled'], 'awaiting-approval': ['active', 'cancelled'],
  active: ['paused', 'blocked', 'completed', 'failed', 'cancelled', 'interrupted'],
  paused: ['active', 'cancelled', 'interrupted'], blocked: ['active', 'failed', 'cancelled', 'interrupted'],
  completed: [], failed: [], cancelled: [], interrupted: ['active', 'cancelled']
}

function assertTransition<S extends string>(table: Record<S, readonly S[]>, from: S, to: S): void {
  if (!table[from].includes(to)) throw new Error(`Invalid Canvas state transition: ${from} -> ${to}`)
}
function audit(from: string, to: string, actor: CanvasTransitionActor, reason?: string) {
  return { from, to, actor, at: new Date().toISOString(), ...(reason ? { reason } : {}) }
}
export function transitionCanvasMessage(message: AgentCanvasMessage, to: MessageDeliveryState, actor: CanvasTransitionActor, reason?: string): AgentCanvasMessage {
  assertTransition(MESSAGE_TRANSITIONS, message.deliveryState, to)
  return { ...message, deliveryState: to, transitions: [...(message.transitions ?? []), audit(message.deliveryState, to, actor, reason)] }
}
export function transitionCanvasTask(task: CanvasAgentTask, to: CanvasAgentTaskState, actor: CanvasTransitionActor, reason?: string): CanvasAgentTask {
  assertTransition(TASK_TRANSITIONS, task.state, to)
  return { ...task, state: to, updatedAt: new Date().toISOString(), transitions: [...(task.transitions ?? []), audit(task.state, to, actor, reason)] }
}
export function transitionCollaborationSession(session: CollaborationSession, to: CollaborationSessionState, actor: CanvasTransitionActor, reason?: string): CollaborationSession {
  assertTransition(SESSION_TRANSITIONS, session.state, to)
  return { ...session, state: to, updatedAt: new Date().toISOString(), transitions: [...(session.transitions ?? []), audit(session.state, to, actor, reason)] }
}

export function reconcileCanvasOrchestrationAfterRestart<T extends { messages: AgentCanvasMessage[]; tasks: CanvasAgentTask[]; sessions: CollaborationSession[] }>(state: T): T {
  return {
    ...state,
    messages: state.messages.map((message) => message.deliveryState === 'delivering'
      ? transitionCanvasMessage(message, 'failed', 'system', 'Application restarted before delivery completed')
      : message),
    tasks: state.tasks.map((task) => ['running', 'waiting-for-input', 'blocked'].includes(task.state)
      ? transitionCanvasTask(task, 'interrupted', 'system', 'Application restarted with unreconciled work')
      : task),
    sessions: state.sessions.map((session) => ['active', 'paused', 'blocked'].includes(session.state)
      ? transitionCollaborationSession(session, 'interrupted', 'system', 'Application restarted with unreconciled collaboration')
      : session)
  }
}
