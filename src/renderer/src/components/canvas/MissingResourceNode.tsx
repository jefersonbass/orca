import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'

type MissingResourceNodeType = Node<{
  label?: string
  resourceId?: string
}, 'missing-resource'>

export const MissingResourceNode: React.FC<NodeProps<MissingResourceNodeType>> =
  React.memo(({ data }) => {
    return (
      <div
        className="min-w-[160px] rounded-lg border border-dashed border-red-500/40 bg-worktree-sidebar shadow-sm"
        role="button"
        aria-label={`Missing resource: ${data.label ?? 'unknown'}`}
        tabIndex={0}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-red-400" aria-hidden="true">
            ⚠
          </span>
          <span className="text-[13px] font-medium text-worktree-sidebar-foreground/60">
            {data.label ?? 'Resource not found'}
          </span>
        </div>

        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
      </div>
    )
  })
MissingResourceNode.displayName = 'MissingResourceNode'
