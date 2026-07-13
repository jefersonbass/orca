import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { CanvasAnchors } from '../CanvasAnchors'

type ShapeType = 'label' | 'rectangle' | 'arrow' | 'highlight'
type ShapeNodeType = Node<
  { label?: string; color?: string; shapeType: ShapeType; type?: string; width?: number; height?: number },
  ShapeType
>

export const BasicShapeNode: React.FC<NodeProps<ShapeNodeType>> = React.memo(
  ({ data, selected }) => {
    const shapeType = (data.shapeType ?? data.type ?? 'label') as ShapeType
    const borderColor = data.color ?? (selected ? '#3b82f6' : '#533483')
    const bgOpacity = shapeType === 'highlight' ? 0.12 : 0.03

    const bgWithOpacity = `${borderColor}${Math.round(bgOpacity * 255).toString(16).padStart(2, '0')}`

    const renderContent = () => {
      switch (shapeType) {
        case 'label':
          return (
            <div
              className="flex size-full items-center justify-center rounded px-3 py-1.5"
              role="img"
              aria-label={`Label: ${data.label}`}
            >
              <span className="select-none text-[13px] font-medium" style={{ color: borderColor }}>
                {data.label || 'Label'}
              </span>
            </div>
          )
        case 'rectangle':
          return (
            <div
              className="size-full rounded-lg border-2 border-dashed"
              style={{ borderColor, background: bgWithOpacity }}
              role="img"
              aria-label={`Rectangle: ${data.label ?? ''}`}
            />
          )
        case 'highlight':
          return (
            <div
              className="size-full rounded-lg"
              style={{
                background: bgWithOpacity,
                borderLeft: `3px solid ${borderColor}`,
              }}
              role="img"
              aria-label={`Highlight: ${data.label ?? ''}`}
            >
              {data.label && (
                <span className="inline-block px-3 pt-2 text-[13px] font-medium" style={{ color: borderColor }}>
                  {data.label}
                </span>
              )}
            </div>
          )
        default:
          return null
      }
    }

    const containerClass = shapeType === 'label'
      ? `rounded-lg ${selected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent' : ''}`
      : 'size-full'

    return (
      <div
        className={containerClass}
        style={{
          borderColor: undefined,
          width: '100%',
          height: '100%',
        }}
      >
        {renderContent()}
        <CanvasAnchors active={selected} />
      </div>
    )
  }
)
BasicShapeNode.displayName = 'BasicShapeNode'
