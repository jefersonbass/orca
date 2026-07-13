import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { CanvasAnchors } from '../CanvasAnchors'

type GroupNodeType = Node<
  { label: string; color?: string },
  'group'
>

export const GroupNode: React.FC<NodeProps<GroupNodeType>> = React.memo(
  ({ data, selected }) => {
    const borderColor = data.color ?? (selected ? '#3b82f6' : '#533483')
    const hasColor = !!data.color

    return (
      <div
        className={`size-full rounded-xl border-2 border-dashed bg-worktree-sidebar/5 shadow-inner ${
          selected && !hasColor ? 'border-blue-500' : ''
        }`}
        style={{
          borderColor: hasColor ? borderColor : undefined,
        }}
        role="region"
        aria-label={`Group: ${data.label}`}
      >
        <div
          className="inline-block rounded-br-lg rounded-tl-xl px-3 py-1 text-[11px] font-medium"
          style={{ background: borderColor, color: '#fff' }}
        >
          {data.label || 'Group'}
        </div>
        <div className="flex size-full items-center justify-center" style={{ height: 'calc(100% - 28px)' }}>
          <span className="text-[10px] text-worktree-sidebar-foreground/20 select-none">
            Drag nodes into this frame to group them
          </span>
        </div>
        <CanvasAnchors active={selected} />
      </div>
    )
  }
)
GroupNode.displayName = 'GroupNode'
