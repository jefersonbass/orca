import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { useFileState, useOpenFileAction } from '../use-canvas-integration'

type FileNodeType = Node<
  { label: string; relativePath: string; gitStatus?: string; worktreeName?: string; worktreeId?: string },
  'file'
>

const gitStatusStyles: Record<string, { color: string; label: string }> = {
  modified: { color: '#eab308', label: 'M' },
  added: { color: '#22c55e', label: 'A' },
  deleted: { color: '#ef4444', label: 'D' },
  untracked: { color: '#6b7280', label: '?' },
  staged: { color: '#22c55e', label: 'S' },
}

export const FileNode: React.FC<NodeProps<FileNodeType>> = React.memo(
  ({ data, selected }) => {
    // Connect to real Orca store
    const fileState = useFileState(data.relativePath, data.worktreeId)
    const openFile = useOpenFileAction()
    const effectiveStatus = data.gitStatus ?? fileState.gitStatus
    const git = effectiveStatus ? (gitStatusStyles[effectiveStatus] ?? gitStatusStyles.modified) : null
    return (
      <div
        className={`min-w-[180px] rounded-lg border bg-worktree-sidebar shadow-sm ${
          selected ? 'border-blue-500' : 'border-worktree-sidebar-border'
        }`}
        role="button"
        aria-label={`File: ${data.relativePath}`}
        tabIndex={0}
        onClick={() => openFile(data.relativePath, data.worktreeId)}
      >
        <div className="flex items-center gap-2 border-b border-worktree-sidebar-border px-3 py-2">
          <span aria-hidden="true" className="text-[14px]">📄</span>
          <span className="truncate text-[13px] font-medium text-worktree-sidebar-foreground">
            {data.label}
          </span>
          {git && (
            <span
              className="ml-auto rounded px-1 py-0.5 text-[10px] font-bold"
              style={{ background: `${git.color}20`, color: git.color }}
              title={data.gitStatus}
            >
              {git.label}
            </span>
          )}
        </div>
        <div className="space-y-1 px-3 py-2">
          <div className="truncate text-[11px] text-worktree-sidebar-foreground/40 font-mono">
            {data.relativePath}
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
FileNode.displayName = 'FileNode'
