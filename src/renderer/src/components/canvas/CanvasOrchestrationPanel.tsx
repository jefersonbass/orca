import React from 'react'
import { useAppStore } from '@/store'
import { AgentInboxOutbox } from './AgentInboxOutbox'
import { approveCanvasOutput, deliverApprovedCanvasMessage, executableContextBindings, prepareContextDelivery } from './canvas-orchestration-runtime'

export const CanvasOrchestrationPanel: React.FC = () => {
  const orchestration = useAppStore((state) => state.canvasOrchestration)
  const upsertMessage = useAppStore((state) => state.upsertCanvasMessage)
  const contextBindings = executableContextBindings(orchestration.bindings)

  const approve = (id: string) => {
    const message = useAppStore.getState().canvasOrchestration.messages.find((item) => item.id === id)
    if (message?.type === 'result') approveCanvasOutput(id)
    else void deliverApprovedCanvasMessage(id)
  }
  const reject = (id: string) => {
    const message = useAppStore.getState().canvasOrchestration.messages.find((item) => item.id === id)
    if (message) upsertMessage({ ...message, deliveryState: 'cancelled' })
  }
  const retry = (id: string) => {
    const message = useAppStore.getState().canvasOrchestration.messages.find((item) => item.id === id)
    if (message) {
      upsertMessage({ ...message, deliveryState: 'awaiting-approval', deliveryError: undefined })
      void deliverApprovedCanvasMessage(id)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-worktree-sidebar-border p-3">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-worktree-sidebar-foreground/40">Executable context</div>
        {contextBindings.length === 0 ? (
          <p className="text-xs text-worktree-sidebar-foreground/40">Create a Note → Agent operational binding.</p>
        ) : contextBindings.map((binding) => (
          <button key={binding.id} type="button" onClick={() => prepareContextDelivery(binding)}
            className="mb-1 w-full rounded-md border border-worktree-sidebar-border px-2 py-1.5 text-left text-xs text-worktree-sidebar-foreground hover:bg-worktree-sidebar-foreground/5">
            Queue {binding.sourceNodeId} → {binding.targetAgentNodeId}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <AgentInboxOutbox messages={orchestration.messages} tasks={orchestration.tasks}
          onApproveMessage={approve} onRejectMessage={reject} onRetryMessage={retry} />
      </div>
    </div>
  )
}
