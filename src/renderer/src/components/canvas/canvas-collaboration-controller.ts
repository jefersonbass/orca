import { useAppStore } from '@/store'
import type { CollaborationSession, CollaborationSessionState, DelegationBinding } from '../../../../shared/canvas-agent-types'
import { transitionCollaborationSession } from '../../../../shared/canvas-state-machines'

export function createCollaborationFromBindings(leadAgentNodeId: string): CollaborationSession {
  const store = useAppStore.getState()
  const subordinateAgentNodeIds = store.canvasOrchestration.bindings
    .filter((binding): binding is DelegationBinding => binding.kind === 'delegation' && binding.sourceAgentNodeId === leadAgentNodeId && binding.enabled)
    .map((binding) => binding.targetAgentNodeId)
  const now = new Date().toISOString()
  const session: CollaborationSession = {
    id: `collab_${crypto.randomUUID()}`, leadAgentNodeId,
    subordinateAgentNodeIds: [...new Set(subordinateAgentNodeIds)], tasks: [], messages: [],
    state: 'draft', createdAt: now, updatedAt: now
  }
  store.upsertCollaborationSession(session)
  return session
}

export function transitionCanvasCollaboration(id: string, to: CollaborationSessionState): void {
  const store = useAppStore.getState()
  const session = store.canvasOrchestration.sessions.find((item) => item.id === id)
  if (!session) return
  store.upsertCollaborationSession(transitionCollaborationSession(session, to, 'user'))
}
