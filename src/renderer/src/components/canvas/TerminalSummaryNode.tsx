import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'

type TerminalSummaryNodeType = Node<{
  label: string
  status: 'idle' | 'working' | 'blocked' | 'waiting' | 'done' | 'disconnected'
  worktreeName?: string
}, 'terminal-summary'>

const statusColors: Record<string, string> = {
  idle: 'bg-worktree-sidebar-foreground/30',
  working: 'bg-yellow-500',
  blocked: 'bg-red-500',
  waiting: 'bg-blue-500',
  done: 'bg-green-500',
  disconnected: 'bg-gray-500',
}

export const TerminalSummaryNode: React.FC<NodeProps<TerminalSummaryNodeType>> =
  React.memo(({ data }) => {
    const dotColor = statusColors[data.status] ?? statusColors.idle

    return (
      <div
        className="min-w-[160px] rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar shadow-sm"
        role="button"
        aria-label={`Terminal summary: ${data.label}, ${data.status}`}
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
          <div className="text-[11px] text-worktree-sidebar-foreground/40">
            Status: {data.status}
          </div>
        </div>

        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
      </div>
    )
  })
TerminalSummaryNode.displayName = 'TerminalSummaryNode'
