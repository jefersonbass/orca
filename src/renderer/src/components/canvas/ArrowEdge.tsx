import React from 'react'
import type { EdgeProps } from '@xyflow/react'
import { BaseEdge, getBezierPath } from '@xyflow/react'

export const ArrowEdge: React.FC<EdgeProps> = React.memo(
  ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }) => {
    const [path] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })

    const color = (data as any)?.color ?? (selected ? '#3b82f6' : '#533483')

    return (
      <g>
        <BaseEdge
          id={id}
          path={path}
          style={{
            stroke: color,
            strokeWidth: selected ? 2 : 1.5,
          }}
          markerEnd={`url(#arrowhead-${color.replace('#', '')})`}
        />
        <defs>
          <marker
            id={`arrowhead-${color.replace('#', '')}`}
            markerWidth={10}
            markerHeight={7}
            refX={10}
            refY={3.5}
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={color} />
          </marker>
        </defs>
      </g>
    )
  }
)
ArrowEdge.displayName = 'ArrowEdge'
