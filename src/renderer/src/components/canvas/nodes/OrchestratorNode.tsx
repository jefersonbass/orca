import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'

type OrchestratorNodeType = Node<
  {
    label: string
    data?: {
      title?: string
      status?: 'draft' | 'proposed' | 'active' | 'completed' | 'cancelled'
      agentCount?: number
      taskCount?: number
    }
    color?: string
  },
  'orchestrator'
>

const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: '#6b7280', bg: '#6b728020', label: 'Draft' },
  proposed: { color: '#3b82f6', bg: '#3b82f620', label: 'Proposed' },
  active: { color: '#22c55e', bg: '#22c55e20', label: 'Active' },
  completed: { color: '#a855f7', bg: '#a855f720', label: 'Completed' },
  cancelled: { color: '#ef4444', bg: '#ef444420', label: 'Cancelled' },
}

export const OrchestratorNode: React.FC<NodeProps<OrchestratorNodeType>> = React.memo(
  ({ data, selected }) => {
    const st = statusStyles[data.data?.status ?? 'draft'] ?? statusStyles.draft
    const agentCount = data.data?.agentCount ?? 0
    const taskCount = data.data?.taskCount ?? 0
    const borderColor = data.color ?? (selected ? '#3b82f6' : '#533483')
    const hasColor = !!data.color

    return (
      <div
        className={`size-full min-w-0 min-h-0 overflow-hidden rounded-lg border-2 bg-worktree-sidebar shadow-sm ${
          selected && !hasColor ? 'border-blue-500' : hasColor ? 'border-dashed' : 'border-worktree-sidebar-border'
        }`}
        style={{
          borderColor: hasColor ? borderColor : undefined,
        }}
        role="region"
        aria-label={`Orchestrator: ${data.label}`}
        tabIndex={0}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-worktree-sidebar-border px-3 py-2">
          <span aria-hidden="true" className="text-[16px]">🎯</span>
          <span className="truncate text-[13px] font-semibold text-worktree-sidebar-foreground">
            {data.data?.title ?? data.label}
          </span>
          <span
            className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: st.bg, color: st.color }}
          >
            {st.label}
          </span>
        </div>

        {/* Body */}
        <div className="space-y-2 px-3 py-2">
          <div className="flex items-center gap-4 text-[12px] text-worktree-sidebar-foreground/60">
            <span>👤 {agentCount} agent{agentCount !== 1 ? 's' : ''}</span>
            <span>📋 {taskCount} task{taskCount !== 1 ? 's' : ''}</span>
          </div>
          {data.data?.status === 'proposed' && (
            <div className="rounded bg-blue-500/10 px-2 py-1 text-[10px] text-blue-400">
              Plan ready — review and approve to activate
            </div>
          )}
          {data.data?.status === 'active' && (
            <div className="rounded bg-green-500/10 px-2 py-1 text-[10px] text-green-400">
              Orchestration in progress
            </div>
          )}
        </div>

        <Handle type="source" position={Position.Bottom} className="!opacity-40" />
        <Handle type="target" position={Position.Top} className="!opacity-40" />
      </div>
    )
  }
)
OrchestratorNode.displayName = 'OrchestratorNode'
