import React from 'react'
import type { EdgeProps } from '@xyflow/react'
import { BaseEdge, getBezierPath } from '@xyflow/react'

export const VisualEdge: React.FC<EdgeProps> = React.memo(
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
    const dashed = (data as any)?.type === 'depends-on'

    return (
      <g>
        <BaseEdge
          id={id}
          path={path}
          style={{
            stroke: color,
            strokeWidth: selected ? 2 : 1.5,
            strokeDasharray: dashed ? '5 5' : undefined,
          }}
        />
        {(data as any)?.label && (
          <text
            x={(sourceX + targetX) / 2}
            y={(sourceY + targetY) / 2}
            fill={color}
            fontSize={10}
            textAnchor="middle"
            dy={-4}
            className="select-none"
          >
            {(data as any).label}
          </text>
        )}
      </g>
    )
  }
)
VisualEdge.displayName = 'VisualEdge'
