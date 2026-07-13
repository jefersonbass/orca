import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { CanvasAnchors } from '../CanvasAnchors'
import { useAppStore } from '@/store'

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
    color?: string
  },
  'drawing'
>

export const DrawingNode: React.FC<NodeProps<DrawingNodeType>> = React.memo(
  ({ id, data, selected }) => {
    const [editing, setEditing] = useState(false)
    const [label, setLabel] = useState(data.label ?? '')
    const editorRef = useRef<HTMLTextAreaElement>(null)
    const setCanvasDocument = useAppStore((state) => state.setCanvasDocument)
    const strokeColor = data.strokeColor ?? data.color ?? '#533483'
    const strokeWidth = data.strokeWidth ?? 2
    const fillColor = data.fillColor ?? 'transparent'
    const opacity = data.opacity ?? 1
    const lineStyle = data.lineStyle ?? 'solid'
    const hasColor = !!data.color
    const defaultPoints = data.drawingType === 'polygon'
      ? [{ x: 50, y: 12 }, { x: 88, y: 82 }, { x: 12, y: 82 }]
      : [{ x: 8, y: 64 }, { x: 24, y: 38 }, { x: 40, y: 58 }, { x: 58, y: 24 }, { x: 76, y: 48 }, { x: 92, y: 20 }]
    const points = data.points ?? defaultPoints

    const strokeDasharray =
      lineStyle === 'dashed' ? '6 3' : lineStyle === 'dotted' ? '2 2' : undefined

    useEffect(() => {
      if (editing) editorRef.current?.focus()
    }, [editing])

    const persistLabel = useCallback(() => {
      const document = useAppStore.getState().canvasDocument
      if (!document) return
      setCanvasDocument({ ...document, nodes: document.nodes.map((node) => node.id === id ? { ...node, label, metadata: { ...node.metadata, text: label } } : node) })
      setEditing(false)
    }, [id, label, setCanvasDocument])

    const renderShape = () => {
      switch (data.drawingType) {
        case 'freehand':
          return (
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              opacity={opacity}
              style={{ pointerEvents: 'none' }}
            />
          )

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
          return (
            <polygon
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              opacity={opacity}
            />
          )

        default:
          return null
      }
    }

    return (
      <div
        className={`relative size-full rounded-lg border-2 bg-worktree-sidebar/20 ${
          selected ? 'border-blue-500' : hasColor ? 'border-dashed' : 'border-worktree-sidebar-border'
        }`}
        style={{
          borderColor: hasColor ? data.color : undefined,
        }}
        role="img"
        aria-label={`${data.drawingType ?? 'Drawing'} shape`}
        onDoubleClick={() => setEditing(true)}
      >
        <svg
          className="size-full"
          viewBox={!data.points ? '0 0 100 100' : undefined}
          preserveAspectRatio="none"
          style={{ minWidth: 40, minHeight: 40, overflow: 'visible' }}
        >
          {renderShape()}
        </svg>
        {(editing || label) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3">
            {editing ? (
              <textarea
                ref={editorRef}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                onBlur={persistLabel}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setEditing(false)
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') persistLabel()
                }}
                className="pointer-events-auto nodrag nowheel min-h-[28px] w-full resize-none bg-transparent text-center text-[13px] text-worktree-sidebar-foreground outline-none"
                aria-label="Edit drawing label"
              />
            ) : <span className="text-center text-[13px] text-worktree-sidebar-foreground">{label}</span>}
          </div>
        )}
        <CanvasAnchors active={selected} />
      </div>
    )
  }
)
DrawingNode.displayName = 'DrawingNode'
