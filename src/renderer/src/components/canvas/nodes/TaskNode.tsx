import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { useTaskState } from '../use-canvas-integration'

type TaskNodeType = Node<
  {
    label: string
    taskId: string
    status?: 'todo' | 'in-progress' | 'done' | 'blocked'
    priority?: string
    assignee?: string
    provider?: string
    worktreeName?: string
  },
  'task'
>

const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
  todo: { color: '#6b7280', bg: '#6b728020', label: 'To Do' },
  'in-progress': { color: '#eab308', bg: '#eab30820', label: 'In Progress' },
  done: { color: '#22c55e', bg: '#22c55e20', label: 'Done' },
  blocked: { color: '#ef4444', bg: '#ef444420', label: 'Blocked' },
}

const providerIcons: Record<string, string> = {
  orca: '📋',
  github: '🐙',
  gitlab: '🦊',
  linear: '⏱',
  jira: '📌',
}

const priorityColors: Record<string, string> = {
  low: '#6b7280',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
}

export const TaskNode: React.FC<NodeProps<TaskNodeType>> = React.memo(
  ({ data, selected }) => {
    // Connect to real task store
    const taskState = useTaskState(data.taskId)
    const status = data.status ?? (taskState.taskStatus as any)
    const priority = data.priority ?? taskState.taskPriority
    const assignee = data.assignee ?? taskState.assignee
    const provider = data.provider ?? taskState.provider
    const st = statusStyles[status] ?? statusStyles.todo
    const providerIcon = providerIcons[provider] ?? '📋'
    return (
      <div
        className={`size-full min-w-0 min-h-0 overflow-hidden rounded-lg border bg-worktree-sidebar shadow-sm ${
          selected ? 'border-blue-500' : 'border-worktree-sidebar-border'
        }`}
        role="button"
        aria-label={`Task: ${data.label}, ${st.label}`}
        tabIndex={0}
      >
        <div className="flex items-center gap-2 border-b border-worktree-sidebar-border px-3 py-2">
          <span aria-hidden="true" className="text-[14px]">{providerIcon}</span>
          <span className="truncate text-[13px] font-medium text-worktree-sidebar-foreground">
            {data.label}
          </span>
          {priority && priorityColors[priority] && (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: priorityColors[priority] }}
              title={`${data.priority} priority`}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="space-y-1 px-3 py-2">
          <div className="flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: st.bg, color: st.color }}
            >
              {st.label}
            </span>
            {assignee && (
              <span className="text-[11px] text-worktree-sidebar-foreground/40">
                {assignee}
              </span>
            )}
          </div>
          <div className="flex gap-3 text-[10px] text-worktree-sidebar-foreground/30">
            <span>{provider}</span>
            <span>{data.taskId}</span>
            {data.worktreeName && <span>{data.worktreeName}</span>}
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
      </div>
    )
  }
)
TaskNode.displayName = 'TaskNode'
