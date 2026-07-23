import { useAppStore } from '@/store'
import type {
  AgentCanvasMessage,
  CanvasAgentTask,
  CollaborationSession,
  OutputBinding
} from '../../../../shared/canvas-agent-types'
import {
  transitionCanvasMessage,
  transitionCanvasTask,
  transitionCollaborationSession
} from '../../../../shared/canvas-state-machines'

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

function owningSession(taskId?: string): CollaborationSession | undefined {
  if (!taskId) return undefined
  return useAppStore.getState().canvasOrchestration.sessions.find((session) =>
    session.tasks.some((task) => task.id === taskId)
  )
}

function persistSession(session: CollaborationSession): void {
  useAppStore.getState().upsertCollaborationSession(session)
}

function persistTask(session: CollaborationSession, task: CanvasAgentTask): CollaborationSession {
  useAppStore.getState().upsertCanvasTask(task)
  const next = { ...session, tasks: session.tasks.map((item) => item.id === task.id ? task : item), updatedAt: new Date().toISOString() }
  persistSession(next)
  return next
}

function persistMessage(session: CollaborationSession, message: AgentCanvasMessage): CollaborationSession {
  useAppStore.getState().upsertCanvasMessage(message)
  const next = { ...session, messages: [...session.messages.filter((item) => item.id !== message.id), message], updatedAt: new Date().toISOString() }
  persistSession(next)
  return next
}

export function persistWorkflowMessage(message: AgentCanvasMessage): void {
  const session = owningSession(message.taskId)
  if (session) persistMessage(session, message)
  else useAppStore.getState().upsertCanvasMessage(message)
}

function awaitingMessage(message: Omit<AgentCanvasMessage, 'id' | 'createdAt' | 'deliveryState'>): AgentCanvasMessage {
  return transitionCanvasMessage({
    ...message,
    id: id('msg'),
    createdAt: new Date().toISOString(),
    deliveryState: 'draft'
  }, 'awaiting-approval', 'agent')
}

function parseDelegation(response: string, agentNodeId: string, index: number): string {
  const fenced = response.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  for (const candidate of [fenced, response]) {
    if (!candidate) continue
    try {
      const parsed = JSON.parse(candidate) as { delegations?: Array<{ agentNodeId?: string; task?: string }> }
      const exact = parsed.delegations?.find((item) => item.agentNodeId === agentNodeId)
      const positional = parsed.delegations?.[index]
      const task = exact?.task ?? positional?.task
      if (task?.trim()) return task.trim()
    } catch {
      // A provider may return prose despite the requested contract. The full
      // Lead plan is still authoritative and is preserved in the fallback.
    }
  }
  return `Implement workstream ${index + 1} for agent node ${agentNodeId}.\n\nLead plan:\n${response}`
}

export function activateTaskForDelivery(message: AgentCanvasMessage): void {
  const session = owningSession(message.taskId)
  if (!session || !message.taskId) return
  const task = session.tasks.find((item) => item.id === message.taskId)
  if (!task || !['awaiting-approval', 'ready', 'assigned', 'failed', 'blocked', 'interrupted'].includes(task.state)) return
  let active = task
  if (['failed', 'blocked', 'interrupted'].includes(active.state)) active = transitionCanvasTask(active, 'ready', 'user', 'Retry approved')
  if (active.state === 'awaiting-approval') active = transitionCanvasTask(active, 'ready', 'user')
  if (active.state === 'ready') active = transitionCanvasTask(active, 'assigned', 'system')
  if (active.state === 'assigned') active = transitionCanvasTask(active, 'running', 'system')
  persistTask(session, active)
}

export function failTaskForDelivery(message: AgentCanvasMessage, reason: string): void {
  let session = owningSession(message.taskId)
  if (!session || !message.taskId) return
  const task = session.tasks.find((item) => item.id === message.taskId)
  if (task?.state === 'running') session = persistTask(session, transitionCanvasTask(task, 'failed', 'system', reason))
  if (session.state === 'active') persistSession(transitionCollaborationSession(session, 'blocked', 'system', reason))
}

export function advanceSpecificationWorkflow(
  original: AgentCanvasMessage,
  response: { content: string; messageId: string; timestamp: number | null }
): boolean {
  let session = owningSession(original.taskId)
  if (!session || !original.taskId) return false
  if (!['active', 'paused'].includes(session.state)) return true
  const task = session.tasks.find((item) => item.id === original.taskId)
  if (!task) return false
  const root = !task.parentTaskId

  if (root && original.type === 'instruction') {
    const children = session.tasks.filter((item) => item.parentTaskId === task.id)
    children.forEach((child, index) => {
      if (child.state !== 'draft' || !child.assignedAgentId) return
      const proposed = transitionCanvasTask(child, 'awaiting-approval', 'agent', 'Lead proposed developer assignment')
      session = persistTask(session!, proposed)
      const delegation = awaitingMessage({
        fromAgentId: session!.leadAgentNodeId,
        toAgentId: child.assignedAgentId,
        taskId: child.id,
        type: 'delegation',
        content: parseDelegation(response.content, child.assignedAgentId, index),
        contextRefs: [{ nodeId: session!.leadAgentNodeId, resourceType: 'lead-plan', snapshotHash: response.messageId }]
      })
      session = persistMessage(session!, delegation)
    })
    return true
  }

  if (!root && original.type === 'delegation') {
    if (task.state === 'running') {
      session = persistTask(session, {
        ...transitionCanvasTask(task, 'completed', 'agent'),
        resultSummary: response.content
      })
    }
    const output = useAppStore.getState().canvasOrchestration.bindings.find(
      (binding): binding is OutputBinding => binding.kind === 'output' && binding.enabled &&
        binding.sourceAgentNodeId === original.toAgentId && task.outputBindingIds.includes(binding.id)
    )
    if (output) {
      session = persistMessage(session, awaitingMessage({
        fromAgentId: original.toAgentId,
        toAgentId: output.targetNoteNodeId,
        taskId: task.id,
        type: 'result',
        content: response.content,
        contextRefs: [{ nodeId: original.toAgentId, resourceType: 'developer-response', snapshotHash: response.messageId }]
      }))
    }
    const children = session.tasks.filter((item) => item.parentTaskId === task.parentTaskId)
    if (children.length >= 2 && children.every((item) => item.state === 'completed')) {
      const existingSynthesis = session.messages.some((item) => item.taskId === task.parentTaskId && item.type === 'review-request')
      if (!existingSynthesis) {
        const reports = children.map((item) => `## ${item.title} (${item.assignedAgentId})\n\n${item.resultSummary ?? ''}`).join('\n\n')
        session = persistMessage(session, awaitingMessage({
          toAgentId: session.leadAgentNodeId,
          taskId: task.parentTaskId,
          type: 'review-request',
          content: `Synthesize the completed developer workstreams into a final implementation summary. Include decisions, completed work, validation, risks, and next actions.\n\n${reports}`,
          contextRefs: children.map((item) => ({ nodeId: item.assignedAgentId!, resourceType: 'developer-result' }))
        }))
      }
    }
    return true
  }

  if (root && original.type === 'review-request') {
    const summaryOutput = useAppStore.getState().canvasOrchestration.bindings.find(
      (binding): binding is OutputBinding => binding.kind === 'output' && binding.enabled &&
        binding.sourceAgentNodeId === session!.leadAgentNodeId && task.outputBindingIds.includes(binding.id)
    )
    if (summaryOutput) {
      persistMessage(session, awaitingMessage({
        fromAgentId: session.leadAgentNodeId,
        toAgentId: summaryOutput.targetNoteNodeId,
        taskId: task.id,
        type: 'result',
        content: response.content,
        contextRefs: [{ nodeId: session.leadAgentNodeId, resourceType: 'lead-summary', snapshotHash: response.messageId }]
      }))
    }
    return true
  }
  return false
}

export function completeSpecificationWorkflowAfterOutput(message: AgentCanvasMessage): void {
  let session = owningSession(message.taskId)
  if (!session || !message.taskId) return
  const task = session.tasks.find((item) => item.id === message.taskId)
  if (!task || task.parentTaskId || task.state !== 'running') return
  session = persistTask(session, { ...transitionCanvasTask(task, 'completed', 'user'), resultSummary: message.content })
  if (session.state === 'active') persistSession(transitionCollaborationSession(session, 'completed', 'system'))
}

export function planningPrompt(specification: string, developerAgentNodeIds: string[]): string {
  return `You are the Lead Agent for an Orca Spatial Canvas collaboration. Analyze the specification and divide the implementation into exactly ${developerAgentNodeIds.length} non-overlapping workstreams. Return a JSON object with a delegations array; each item must contain agentNodeId and task. Use these exact agentNodeIds: ${developerAgentNodeIds.join(', ')}. You may add a short rationale after the JSON.\n\n# Specification\n\n${specification}`
}
