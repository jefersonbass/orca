import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'

type AgentSummaryNodeType = Node<{
  label: string
  provider?: string
  status: 'working' | 'blocked' | 'waiting' | 'done' | 'idle' | 'disconnected'
  worktreeName?: string
}, 'agent-summary'>

const statusColors: Record<string, string> = {
  idle: 'bg-worktree-sidebar-foreground/30',
  working: 'bg-yellow-500',
  blocked: 'bg-red-500',
  waiting: 'bg-blue-500',
  done: 'bg-green-500',
  disconnected: 'bg-gray-500',
}

const statusLabels: Record<string, string> = {
  idle: 'Idle',
  working: 'Working',
  blocked: 'Blocked',
  waiting: 'Waiting',
  done: 'Done',
  disconnected: 'Disconnected',
}

export const AgentSummaryNode: React.FC<NodeProps<AgentSummaryNodeType>> =
  React.memo(({ data }) => {
    const dotColor = statusColors[data.status] ?? statusColors.idle
    const statusLabel = statusLabels[data.status] ?? data.status

    return (
      <div
        className="min-w-[180px] rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar shadow-sm"
        role="button"
        aria-label={`Agent summary: ${data.label}, ${statusLabel}`}
        tabIndex={0}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-worktree-sidebar-border px-3 py-2">
          <div
            className={`size-2 shrink-0 rounded-full ${dotColor}`}
            aria-hidden="true"
          />
          <span className="truncate text-[13px] font-medium text-worktree-sidebar-foreground">
            {data.label}
          </span>
        </div>

        {/* Body */}
        <div className="space-y-1 px-3 py-2">
          {data.worktreeName && (
            <span className="inline-block rounded bg-worktree-sidebar-foreground/5 px-1.5 py-0.5 text-[10px] text-worktree-sidebar-foreground/50">
              {data.worktreeName}
            </span>
          )}
          <div className="flex items-center gap-2 text-[11px] text-worktree-sidebar-foreground/40">
            <span>{statusLabel}</span>
            {data.provider && (
              <>
                <span aria-hidden="true">·</span>
                <span>{data.provider}</span>
              </>
            )}
          </div>
        </div>

        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
      </div>
    )
  })
AgentSummaryNode.displayName = 'AgentSummaryNode'
