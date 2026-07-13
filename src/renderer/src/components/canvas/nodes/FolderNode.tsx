import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'

type FolderNodeType = Node<
  { label: string; relativePath: string; childCount?: number; worktreeName?: string },
  'folder'
>

export const FolderNode: React.FC<NodeProps<FolderNodeType>> = React.memo(
  ({ data, selected }) => {
    return (
      <div
        className={`size-full min-w-0 min-h-0 overflow-hidden rounded-lg border bg-worktree-sidebar shadow-sm ${
          selected ? 'border-blue-500' : 'border-worktree-sidebar-border'
        }`}
        role="button"
        aria-label={`Folder: ${data.relativePath}`}
        tabIndex={0}
      >
        <div className="flex items-center gap-2 border-b border-worktree-sidebar-border px-3 py-2">
          <span aria-hidden="true" className="text-[14px]">📁</span>
          <span className="truncate text-[13px] font-medium text-worktree-sidebar-foreground">
            {data.label}
          </span>
        </div>
        <div className="space-y-1 px-3 py-2">
          <div className="truncate text-[11px] text-worktree-sidebar-foreground/40 font-mono">
            {data.relativePath}
          </div>
          <div className="flex gap-3 text-[10px] text-worktree-sidebar-foreground/30">
            {data.childCount !== undefined && <span>{data.childCount} items</span>}
            {data.worktreeName && <span>{data.worktreeName}</span>}
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
      </div>
    )
  }
)
FolderNode.displayName = 'FolderNode'
