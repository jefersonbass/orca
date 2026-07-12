import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'

type ShapeType = 'label' | 'rectangle' | 'arrow' | 'highlight'
type ShapeNodeType = Node<
  { label?: string; color?: string; shapeType: ShapeType; width?: number; height?: number },
  ShapeType
>

export const BasicShapeNode: React.FC<NodeProps<ShapeNodeType>> = React.memo(
  ({ data, selected }) => {
    const borderColor = data.color ?? (selected ? '#3b82f6' : '#533483')
    const bgOpacity = data.shapeType === 'highlight' ? 0.1 : 0.02

    switch (data.shapeType) {
      case 'label':
        return (
          <div
            className="flex items-center justify-center rounded px-3 py-1.5"
            style={{ minWidth: 60, minHeight: 24 }}
            role="img"
            aria-label={`Label: ${data.label}`}
          >
            <span
              className="select-none text-[13px] font-medium"
              style={{ color: borderColor }}
            >
              {data.label}
            </span>
          </div>
        )
      case 'rectangle':
        return (
          <div
            className="rounded-lg border-2"
            style={{
              borderColor,
              background: `${borderColor}${Math.round(bgOpacity * 255)
                .toString(16)
                .padStart(2, '0')}`,
              minWidth: 60,
              minHeight: 40,
              width: data.width ?? 120,
              height: data.height ?? 80,
            }}
            role="img"
            aria-label={`Rectangle: ${data.label ?? ''}`}
          />
        )
      case 'highlight':
        return (
          <div
            className="rounded-lg"
            style={{
              background: `${borderColor}20`,
              borderLeft: `3px solid ${borderColor}`,
              minWidth: 100,
              minHeight: 40,
              width: data.width ?? 160,
              height: data.height ?? 60,
            }}
            role="img"
            aria-label={`Highlight: ${data.label ?? ''}`}
          />
        )
      default:
        return null
    }
  }
)
BasicShapeNode.displayName = 'BasicShapeNode'
