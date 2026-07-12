import { useAppStore } from '@/store'
import type {
  CanvasAgentTask,
  CollaborationSession,
  CollaborationSessionState,
  ContextBinding,
  DelegationBinding,
  OutputBinding,
  ReportingBinding
} from '../../../../shared/canvas-agent-types'
import {
  transitionCanvasTask,
  transitionCollaborationSession
} from '../../../../shared/canvas-state-machines'
import { prepareContextDelivery } from './canvas-orchestration-runtime'

export type SpecificationWorkflowCandidate = {
  contextBinding: ContextBinding
  leadAgentNodeId: string
  developerAgentNodeIds: string[]
  progressOutputBindingIds: string[]
  summaryOutputBindingId: string
}

export function specificationWorkflowCandidates(): SpecificationWorkflowCandidate[] {
  const bindings = useAppStore.getState().canvasOrchestration.bindings
  return bindings
    .filter((binding): binding is ContextBinding => binding.kind === 'context' && binding.enabled)
    .flatMap((contextBinding) => {
      const leadAgentNodeId = contextBinding.targetAgentNodeId
      const delegations = bindings.filter(
        (binding): binding is DelegationBinding =>
          binding.kind === 'delegation' && binding.enabled && binding.sourceAgentNodeId === leadAgentNodeId
      )
      const developerAgentNodeIds = [...new Set(delegations.map((binding) => binding.targetAgentNodeId))]
      if (developerAgentNodeIds.length < 2) return []
      const progressOutputs = developerAgentNodeIds.map((developerId) =>
        bindings.find(
          (binding): binding is OutputBinding =>
            binding.kind === 'output' && binding.enabled && binding.sourceAgentNodeId === developerId
        )
      )
      const reportsToLead = developerAgentNodeIds.every((developerId) =>
        bindings.some(
          (binding): binding is ReportingBinding =>
            binding.kind === 'reporting' && binding.enabled &&
            binding.sourceAgentNodeId === developerId && binding.targetAgentNodeId === leadAgentNodeId
        )
      )
      const summaryOutput = bindings.find(
        (binding): binding is OutputBinding =>
          binding.kind === 'output' && binding.enabled &&
          binding.sourceAgentNodeId === leadAgentNodeId && binding.outputMode === 'append-summary'
      )
      if (progressOutputs.some((binding) => !binding) || !reportsToLead || !summaryOutput) return []
      return [{
        contextBinding,
        leadAgentNodeId,
        developerAgentNodeIds,
        progressOutputBindingIds: progressOutputs.map((binding) => binding!.id),
        summaryOutputBindingId: summaryOutput.id
      }]
    })
}

function draftTask(args: Omit<CanvasAgentTask, 'id' | 'state' | 'createdAt' | 'updatedAt'>): CanvasAgentTask {
  const now = new Date().toISOString()
  return { ...args, id: `task_${crypto.randomUUID()}`, state: 'draft', createdAt: now, updatedAt: now }
}

export function createSpecificationCollaboration(candidate: SpecificationWorkflowCandidate): CollaborationSession {
  const store = useAppStore.getState()
  const rootTask = draftTask({
    title: 'Plan and synthesize specification',
    description: 'Lead reads the specification, delegates implementation, reviews reports, and writes the final summary.',
    createdBy: 'user', assignedAgentId: candidate.leadAgentNodeId,
    contextBindingIds: [candidate.contextBinding.id], outputBindingIds: [candidate.summaryOutputBindingId]
  })
  const developerTasks = candidate.developerAgentNodeIds.map((agentId, index) => draftTask({
    title: `Developer workstream ${index + 1}`,
    description: 'Assignment will be proposed by the Lead after reading the specification.',
    createdBy: 'lead-agent', assignedAgentId: agentId, parentTaskId: rootTask.id,
    contextBindingIds: [candidate.contextBinding.id],
    outputBindingIds: [candidate.progressOutputBindingIds[index]!]
  }))
  const now = new Date().toISOString()
  const session: CollaborationSession = {
    id: `collab_${crypto.randomUUID()}`, leadAgentNodeId: candidate.leadAgentNodeId,
    subordinateAgentNodeIds: candidate.developerAgentNodeIds,
    tasks: [rootTask, ...developerTasks], messages: [], state: 'draft', createdAt: now, updatedAt: now
  }
  for (const task of session.tasks) store.upsertCanvasTask(task)
  store.upsertCollaborationSession(session)
  return session
}

function updateSessionTask(session: CollaborationSession, task: CanvasAgentTask): CollaborationSession {
  useAppStore.getState().upsertCanvasTask(task)
  return { ...session, tasks: session.tasks.map((item) => item.id === task.id ? task : item) }
}

export function transitionCanvasCollaboration(id: string, to: CollaborationSessionState): void {
  const store = useAppStore.getState()
  const current = store.canvasOrchestration.sessions.find((item) => item.id === id)
  if (!current) return
  let session = transitionCollaborationSession(current, to, 'user')
  const rootTask = session.tasks.find((task) => !task.parentTaskId)
  if (rootTask && to === 'awaiting-approval' && rootTask.state === 'draft') {
    session = updateSessionTask(session, transitionCanvasTask(rootTask, 'awaiting-approval', 'user'))
  }
  if (rootTask && to === 'active' && rootTask.state === 'awaiting-approval') {
    let running = transitionCanvasTask(rootTask, 'ready', 'user')
    running = transitionCanvasTask(running, 'assigned', 'system')
    running = transitionCanvasTask(running, 'running', 'system')
    session = updateSessionTask(session, running)
    const contextBinding = store.canvasOrchestration.bindings.find(
      (binding): binding is ContextBinding => binding.kind === 'context' && running.contextBindingIds.includes(binding.id)
    )
    if (contextBinding) prepareContextDelivery(contextBinding, running.id)
  }
  store.upsertCollaborationSession(session)
}
