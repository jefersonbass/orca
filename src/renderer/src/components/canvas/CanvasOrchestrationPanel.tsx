import React, { useState } from 'react'
import { useAppStore } from '@/store'
import { AgentInboxOutbox } from './AgentInboxOutbox'
import { approveCanvasOutput, deliverApprovedCanvasMessage, executableContextBindings, executableDelegationBindings, prepareContextDelivery, prepareDelegationDelivery } from './canvas-orchestration-runtime'
import { transitionCanvasMessage } from '../../../../shared/canvas-state-machines'
import { createSpecificationCollaboration, specificationWorkflowCandidates, transitionCanvasCollaboration } from './canvas-collaboration-controller'

export const CanvasOrchestrationPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const orchestration = useAppStore((state) => state.canvasOrchestration)
  const upsertMessage = useAppStore((state) => state.upsertCanvasMessage)
  const contextBindings = executableContextBindings(orchestration.bindings)
  const delegationBindings = executableDelegationBindings(orchestration.bindings)
  const [delegationText, setDelegationText] = useState('')
  const workflowCandidates = specificationWorkflowCandidates()

  const approve = (id: string) => {
    const message = useAppStore.getState().canvasOrchestration.messages.find((item) => item.id === id)
    const targetNode = useAppStore.getState().canvasDocument?.nodes.find((node) => node.id === message?.toAgentId)
    if (message?.type === 'result' && (targetNode?.type === 'note' || targetNode?.type === 'sticky-note')) approveCanvasOutput(id)
    else void deliverApprovedCanvasMessage(id)
  }
  const reject = (id: string) => {
    const message = useAppStore.getState().canvasOrchestration.messages.find((item) => item.id === id)
    if (message) upsertMessage(transitionCanvasMessage(message, 'cancelled', 'user'))
  }
  const retry = (id: string) => {
    const message = useAppStore.getState().canvasOrchestration.messages.find((item) => item.id === id)
    if (message) {
      const queued = transitionCanvasMessage(message, 'queued', 'user', 'Retry approved')
      upsertMessage({ ...queued, deliveryError: undefined })
      void deliverApprovedCanvasMessage(id)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-worktree-sidebar-border p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-worktree-sidebar-foreground/40">
          <span>Executable context</span>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded px-1 text-sm text-worktree-sidebar-foreground/45 hover:bg-worktree-sidebar-foreground/10 hover:text-worktree-sidebar-foreground" aria-label="Close executable context">
              ×
            </button>
          )}
        </div>
        {contextBindings.length === 0 ? (
          <p className="text-xs text-worktree-sidebar-foreground/40">Create a Note → Agent operational binding.</p>
        ) : contextBindings.map((binding) => (
          <button key={binding.id} type="button" onClick={() => prepareContextDelivery(binding)}
            className="mb-1 w-full rounded-md border border-worktree-sidebar-border px-2 py-1.5 text-left text-xs text-worktree-sidebar-foreground hover:bg-worktree-sidebar-foreground/5">
            Queue {binding.sourceNodeId} → {binding.targetAgentNodeId}
          </button>
        ))}
        {delegationBindings.length > 0 && (
          <div className="mt-3 border-t border-worktree-sidebar-border pt-3">
            <textarea value={delegationText} onChange={(event) => setDelegationText(event.target.value)}
              placeholder="Task or instruction for the delegated agent"
              className="mb-2 min-h-20 w-full rounded-md border border-worktree-sidebar-border bg-transparent p-2 text-xs text-worktree-sidebar-foreground outline-none" />
            {delegationBindings.map((binding) => (
              <button key={binding.id} type="button" disabled={!delegationText.trim()}
                onClick={() => { prepareDelegationDelivery(binding, delegationText.trim()); setDelegationText('') }}
                className="mb-1 w-full rounded-md border border-worktree-sidebar-border px-2 py-1.5 text-left text-xs text-worktree-sidebar-foreground disabled:opacity-40">
                Delegate {binding.sourceAgentNodeId} → {binding.targetAgentNodeId}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <AgentInboxOutbox messages={orchestration.messages} tasks={orchestration.tasks}
          onApproveMessage={approve} onRejectMessage={reject} onRetryMessage={retry} />
      </div>
      <div className="border-t border-worktree-sidebar-border p-3">
        {orchestration.sessions.length === 0 ? workflowCandidates.map((candidate) => (
          <button key={candidate.contextBinding.id} type="button" onClick={() => createSpecificationCollaboration(candidate)}
            className="w-full rounded-md border border-worktree-sidebar-border px-2 py-1.5 text-xs text-worktree-sidebar-foreground">
            Create specification workflow for {candidate.leadAgentNodeId} + {candidate.developerAgentNodeIds.length} developers
          </button>
        )) : orchestration.sessions.map((session) => (
          <div key={session.id} className="mb-2 rounded-md border border-worktree-sidebar-border p-2 text-xs">
            <div className="mb-2 text-worktree-sidebar-foreground">{session.leadAgentNodeId} · {session.state}</div>
            <div className="flex flex-wrap gap-1">
              {session.state === 'draft' && <button onClick={() => transitionCanvasCollaboration(session.id, 'awaiting-approval')}>Request start</button>}
              {session.state === 'awaiting-approval' && <button onClick={() => transitionCanvasCollaboration(session.id, 'active')}>Approve start</button>}
              {session.state === 'active' && <button onClick={() => transitionCanvasCollaboration(session.id, 'paused')}>Pause</button>}
              {session.state === 'paused' && <button onClick={() => transitionCanvasCollaboration(session.id, 'active')}>Resume</button>}
              {session.state === 'blocked' && <button onClick={() => transitionCanvasCollaboration(session.id, 'active')}>Resume</button>}
              {!['completed', 'cancelled', 'failed'].includes(session.state) && <button onClick={() => transitionCanvasCollaboration(session.id, 'cancelled')}>Cancel</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
