import React, { useState } from 'react'
import type { AgentCanvasMessage, CanvasAgentTask } from '../../../../shared/canvas-agent-types'

interface AgentInboxOutboxProps {
  messages: AgentCanvasMessage[]
  tasks: CanvasAgentTask[]
  onApproveMessage: (messageId: string) => void
  onRejectMessage: (messageId: string) => void
  onRetryMessage: (messageId: string) => void
}

export const AgentInboxOutbox: React.FC<AgentInboxOutboxProps> = React.memo(({
  messages,
  tasks,
  onApproveMessage,
  onRejectMessage,
  onRetryMessage,
}) => {
  const [tab, setTab] = useState<'inbox' | 'outbox'>('inbox')

  const inboxMessages = messages.filter((m) => ['awaiting-approval', 'queued', 'delivering', 'delivered'].includes(m.deliveryState))
  const outboxMessages = messages

  return (
    <div className="flex h-full flex-col" role="region" aria-label="Agent Messages">
      <div className="flex border-b border-worktree-sidebar-border">
        <button
          onClick={() => setTab('inbox')}
          className={`flex-1 px-3 py-2 text-[12px] font-medium transition-colors ${
            tab === 'inbox' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-worktree-sidebar-foreground/40'
          }`}
        >
          Inbox ({inboxMessages.length})
        </button>
        <button
          onClick={() => setTab('outbox')}
          className={`flex-1 px-3 py-2 text-[12px] font-medium transition-colors ${
            tab === 'outbox' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-worktree-sidebar-foreground/40'
          }`}
        >
          Outbox ({outboxMessages.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {(tab === 'inbox' ? inboxMessages : outboxMessages).length === 0 && (
          <div className="flex items-center justify-center h-full text-[12px] text-worktree-sidebar-foreground/30">
            No messages
          </div>
        )}

        {(tab === 'inbox' ? inboxMessages : outboxMessages).map((msg) => (
          <div key={msg.id} data-testid="canvas-message-card" data-message-id={msg.id}
            className="mb-2 rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar/50 p-3 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-worktree-sidebar-foreground/70">{msg.type}</span>
              <DeliveryStateBadge state={msg.deliveryState} />
            </div>
            <div className="mt-1 text-[11px] text-worktree-sidebar-foreground/40">
              {msg.fromAgentId ? `From: ${msg.fromAgentId}` : 'From: user'} → To: {msg.toAgentId}
            </div>
            <div className="mt-1 line-clamp-2 text-[11px] text-worktree-sidebar-foreground/50">
              {msg.content}
            </div>
            <div className="mt-1 text-[10px] text-worktree-sidebar-foreground/30">
              {new Date(msg.createdAt).toLocaleString()} · {msg.id}
            </div>

            {tab === 'inbox' && msg.deliveryState === 'awaiting-approval' && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onApproveMessage(msg.id)}
                  aria-label={`Approve message ${msg.id}`}
                  className="rounded bg-green-600 px-3 py-1 text-[11px] text-white hover:bg-green-500"
                >
                  Approve
                </button>
                <button
                  onClick={() => onRejectMessage(msg.id)}
                  aria-label={`Reject message ${msg.id}`}
                  className="rounded bg-red-600 px-3 py-1 text-[11px] text-white hover:bg-red-500"
                >
                  Reject
                </button>
              </div>
            )}

            {tab === 'outbox' && msg.deliveryState === 'failed' && (
              <button
                onClick={() => onRetryMessage(msg.id)}
                aria-label={`Retry message ${msg.id}`}
                className="mt-2 rounded bg-yellow-600 px-3 py-1 text-[11px] text-white hover:bg-yellow-500"
              >
                Retry
              </button>
            )}
          </div>
        ))}
      </div>

      {tasks.length > 0 && (
        <div className="border-t border-worktree-sidebar-border p-3">
          <div className="text-[11px] font-medium text-worktree-sidebar-foreground/40 uppercase tracking-wider mb-2">
            Tasks ({tasks.length})
          </div>
          {tasks.map((t) => (
            <div key={t.id} className="mb-1 flex items-center gap-2 rounded px-2 py-1 text-[11px]">
              <TaskStateDot state={t.state} />
              <span className="flex-1 truncate text-worktree-sidebar-foreground/70">{t.title}</span>
              <span className="text-worktree-sidebar-foreground/30">{t.state}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
AgentInboxOutbox.displayName = 'AgentInboxOutbox'

const DeliveryStateBadge: React.FC<{ state: string }> = ({ state }) => {
  const colors: Record<string, string> = {
    draft: 'text-gray-400',
    'awaiting-approval': 'text-yellow-400',
    queued: 'text-blue-400',
    delivering: 'text-blue-300',
    delivered: 'text-green-400',
    acknowledged: 'text-green-400',
    failed: 'text-red-400',
    cancelled: 'text-gray-500',
  }
  return <span className={`text-[10px] font-medium ${colors[state] ?? ''}`}>{state}</span>
}

const TaskStateDot: React.FC<{ state: string }> = ({ state }) => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-500',
    'awaiting-approval': 'bg-yellow-500',
    ready: 'bg-blue-500',
    assigned: 'bg-purple-500',
    running: 'bg-green-500',
    blocked: 'bg-red-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    cancelled: 'bg-gray-500',
  }
  return <span className={`size-2 rounded-full ${colors[state] ?? 'bg-gray-500'}`} aria-hidden="true" />
}
