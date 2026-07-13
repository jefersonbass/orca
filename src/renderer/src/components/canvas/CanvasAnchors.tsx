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
        // Handles stay in the DOM for connection hit-testing, but are visually
        // transparent. The selected outline/action bar is the node affordance;
        // the old green/blue dots added noise without communicating state.
        className={`!size-3 !border-0 !bg-transparent !opacity-0 ${active ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-label={`${type} ${String(position)}`}
      />
    ))}
  </>
)
