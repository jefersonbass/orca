import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'

type PullRequestNodeType = Node<
  {
    label: string
    prNumber: number
    state: 'open' | 'merged' | 'closed' | 'draft'
    checks?: { passed: number; failed: number; pending: number }
    reviewerCount?: number
    commentCount?: number
    worktreeName?: string
    source?: 'github' | 'gitlab'
  },
  'pull-request'
>

const stateStyles: Record<string, { color: string; bg: string; label: string }> = {
  open: { color: '#22c55e', bg: '#22c55e20', label: 'Open' },
  merged: { color: '#a855f7', bg: '#a855f720', label: 'Merged' },
  closed: { color: '#6b7280', bg: '#6b728020', label: 'Closed' },
  draft: { color: '#eab308', bg: '#eab30820', label: 'Draft' },
}

export const PullRequestNode: React.FC<NodeProps<PullRequestNodeType>> = React.memo(
  ({ data, selected }) => {
    const st = stateStyles[data.state] ?? stateStyles.open
    const checksTotal = data.checks
      ? data.checks.passed + data.checks.failed + data.checks.pending
      : 0

    return (
      <div
        className={`size-full min-w-0 min-h-0 overflow-hidden rounded-lg border bg-worktree-sidebar shadow-sm ${
          selected ? 'border-blue-500' : 'border-worktree-sidebar-border'
        }`}
        role="button"
        aria-label={`Pull request #${data.prNumber}: ${data.label}`}
        tabIndex={0}
      >
        <div className="flex items-center gap-2 border-b border-worktree-sidebar-border px-3 py-2">
          <span aria-hidden="true" className="text-[14px]">
            {data.state === 'merged' ? '✅' : '🔀'}
          </span>
          <span className="truncate text-[13px] font-medium text-worktree-sidebar-foreground">
            #{data.prNumber} {data.label}
          </span>
          <span
            className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: st.bg, color: st.color }}
          >
            {st.label}
          </span>
        </div>
        <div className="space-y-1 px-3 py-2">
          <div className="flex items-center gap-3 text-[11px] text-worktree-sidebar-foreground/50">
            {data.reviewerCount !== undefined && <span>👤 {data.reviewerCount}</span>}
            {data.commentCount !== undefined && <span>💬 {data.commentCount}</span>}
            {checksTotal > 0 && (
              <span title={`${data.checks!.passed} passed, ${data.checks!.failed} failed, ${data.checks!.pending} pending`}>
                ✅ {data.checks!.passed} ⏳ {data.checks!.pending}
              </span>
            )}
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
PullRequestNode.displayName = 'PullRequestNode'
