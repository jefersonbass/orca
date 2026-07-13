import React from 'react'
import { Handle, Position } from '@xyflow/react'

const anchors = [
  ['source-top', 'source', Position.Top],
  ['source-right', 'source', Position.Right],
  ['source-bottom', 'source', Position.Bottom],
  ['source-left', 'source', Position.Left],
  ['target-top', 'target', Position.Top],
  ['target-right', 'target', Position.Right],
  ['target-bottom', 'target', Position.Bottom],
  ['target-left', 'target', Position.Left],
] as const

export const CanvasAnchors: React.FC<{ active?: boolean }> = ({ active = true }) => (
  <>
    {anchors.map(([id, type, position]) => (
      <Handle
        key={id}
        id={id}
        type={type}
        position={position}
        className={`!size-3 !border-2 ${type === 'source' ? '!border-blue-300 !bg-blue-500' : '!border-emerald-300 !bg-emerald-500'} ${active ? '!opacity-100' : '!opacity-0'}`}
        aria-label={`${type} ${String(position)}`}
      />
    ))}
  </>
)
