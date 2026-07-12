import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'

type DrawingNodeType = Node<
  {
    label?: string
    drawingType: 'freehand' | 'ellipse' | 'polygon'
    points?: Array<{ x: number; y: number }>
    strokeColor?: string
    strokeWidth?: number
    fillColor?: string
    opacity?: number
    lineStyle?: 'solid' | 'dashed' | 'dotted'
  },
  'drawing'
>

export const DrawingNode: React.FC<NodeProps<DrawingNodeType>> = React.memo(
  ({ data }) => {
    const strokeColor = data.strokeColor ?? '#533483'
    const strokeWidth = data.strokeWidth ?? 2
    const fillColor = data.fillColor ?? 'transparent'
    const opacity = data.opacity ?? 1
    const lineStyle = data.lineStyle ?? 'solid'

    const strokeDasharray =
      lineStyle === 'dashed' ? '6 3' : lineStyle === 'dotted' ? '2 2' : undefined

    const renderShape = () => {
      switch (data.drawingType) {
        case 'freehand':
          return data.points ? (
            <polyline
              points={data.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              opacity={opacity}
              style={{ pointerEvents: 'none' }}
            />
          ) : null

        case 'ellipse':
          return (
            <ellipse
              cx="50%"
              cy="50%"
              rx="45%"
              ry="35%"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              opacity={opacity}
            />
          )

        case 'polygon':
          return data.points ? (
            <polygon
              points={data.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              opacity={opacity}
            />
          ) : null

        default:
          return null
      }
    }

    return (
      <svg
        className="size-full"
        style={{ minWidth: 40, minHeight: 40, overflow: 'visible' }}
        role="img"
        aria-label={data.drawingType === 'freehand' ? 'Freehand drawing' : `${data.drawingType} shape`}
      >
        {renderShape()}
      </svg>
    )
  }
)
DrawingNode.displayName = 'DrawingNode'
