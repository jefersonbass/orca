import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { useDiffState } from '../use-canvas-integration'

type DiffNodeType = Node<
  { label: string; changedFiles?: number; additions?: number; deletions?: number; worktreeName?: string; worktreeId?: string; reviewStatus?: string },
  'diff'
>

const reviewStyles: Record<string, { color: string; label: string }> = {
  open: { color: '#eab308', label: 'Open' },
  approved: { color: '#22c55e', label: 'Approved' },
  'changes-requested': { color: '#ef4444', label: 'Changes' },
}

export const DiffNode: React.FC<NodeProps<DiffNodeType>> = React.memo(
  ({ data, selected }) => {
    const review = data.reviewStatus ? reviewStyles[data.reviewStatus] : null
    // Connect to real git store for live data
    const liveState = useDiffState(data.worktreeId)
    const files = data.changedFiles ?? liveState.filesChanged
    const adds = data.additions ?? liveState.additions
    const dels = data.deletions ?? liveState.deletions
    return (
      <div
        className={`size-full min-w-0 min-h-0 overflow-hidden rounded-lg border bg-worktree-sidebar shadow-sm ${
          selected ? 'border-blue-500' : 'border-worktree-sidebar-border'
        }`}
        role="button"
        aria-label={`Diff: ${data.label}`}
        tabIndex={0}
      >
        <div className="flex items-center gap-2 border-b border-worktree-sidebar-border px-3 py-2">
          <span aria-hidden="true" className="text-[14px]">📊</span>
          <span className="truncate text-[13px] font-medium text-worktree-sidebar-foreground">
            {data.label}
          </span>
          {review && (
            <span
              className="ml-auto rounded px-1.5 py-0.5 text-[10px]"
              style={{ background: `${review.color}20`, color: review.color }}
            >
              {review.label}
            </span>
          )}
        </div>
        <div className="space-y-1 px-3 py-2">
          <div className="flex items-center gap-3 text-[12px]">
            <span className="text-worktree-sidebar-foreground/60">{files} files</span>
            <span className="text-green-500">+{adds}</span>
            <span className="text-red-500">−{dels}</span>
          </div>
          {data.worktreeName && (
            <div className="text-[10px] text-worktree-sidebar-foreground/30">{data.worktreeName}</div>
          )}
        </div>
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
      </div>
    )
  }
)
DiffNode.displayName = 'DiffNode'
