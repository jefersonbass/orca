import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'

type GroupNodeType = Node<
  { label: string; color?: string },
  'group'
>

export const GroupNode: React.FC<NodeProps<GroupNodeType>> = React.memo(
  ({ data, selected }) => {
    const borderColor = data.color ?? (selected ? '#3b82f6' : '#533483')

    return (
      <div
        className="min-w-[200px] min-h-[120px] rounded-xl border-2 border-dashed bg-worktree-sidebar/5 shadow-inner"
        style={{ borderColor }}
        role="region"
        aria-label={`Group: ${data.label}`}
      >
        <div
          className="inline-block rounded-br-lg rounded-tl-xl px-3 py-1 text-[11px] font-medium"
          style={{ background: borderColor, color: '#fff' }}
        >
          {data.label || 'Group'}
        </div>
      </div>
    )
  }
)
GroupNode.displayName = 'GroupNode'
