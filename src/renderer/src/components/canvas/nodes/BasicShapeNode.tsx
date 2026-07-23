import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { CanvasAnchors } from '../CanvasAnchors'
import { useAppStore } from '@/store'
import { CanvasNodeResizer } from '../CanvasNodeResizer'

type ShapeType = 'label' | 'rectangle' | 'arrow' | 'highlight'
type ShapeNodeType = Node<
  { label?: string; color?: string; shapeType: ShapeType; type?: string; width?: number; height?: number; fontSize?: number; resizeEnabled?: boolean },
  ShapeType
>

export const BasicShapeNode: React.FC<NodeProps<ShapeNodeType>> = React.memo(
  ({ id, data, selected }) => {
    const [editing, setEditing] = useState(false)
    const [text, setText] = useState(data.label ?? '')
    const editorRef = useRef<HTMLTextAreaElement>(null)
    const setCanvasDocument = useAppStore((state) => state.setCanvasDocument)
    const shapeType = (data.shapeType ?? data.type ?? 'label') as ShapeType
    const borderColor = data.color ?? (selected ? '#3b82f6' : '#533483')
    const bgOpacity = shapeType === 'highlight' ? 0.12 : 0.03

    const bgWithOpacity = `${borderColor}${Math.round(bgOpacity * 255).toString(16).padStart(2, '0')}`

    useEffect(() => {
      if (editing) editorRef.current?.focus()
    }, [editing])

    const persistText = useCallback(() => {
      const document = useAppStore.getState().canvasDocument
      if (!document) return
      setCanvasDocument({
        ...document,
        nodes: document.nodes.map((node) => node.id === id
          ? { ...node, label: text, metadata: { ...node.metadata, text } }
          : node),
      })
      setEditing(false)
    }, [id, setCanvasDocument, text])

    const editableText = editing ? (
      <textarea
        ref={editorRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={persistText}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setText(data.label ?? '')
            setEditing(false)
          }
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') persistText()
        }}
        className="nodrag nowheel min-h-[28px] w-full resize-none bg-transparent px-2 py-1 text-center text-[13px] text-worktree-sidebar-foreground outline-none"
        aria-label={`Edit ${shapeType}`}
      />
    ) : (
      <span className="block whitespace-pre-wrap">{text || data.label || shapeType}</span>
    )

    const renderContent = () => {
      switch (shapeType) {
        case 'label':
          return (
            <div
              className="flex size-full items-center justify-center rounded px-3 py-1.5"
              style={{ fontSize: data.fontSize ?? 16 }}
              role="img"
              aria-label={`Label: ${data.label}`}
            >
              <span className="select-none font-medium" style={{ color: borderColor, fontSize: data.fontSize ?? 16 }} onDoubleClick={() => setEditing(true)}>
                {editableText}
              </span>
            </div>
          )
        case 'rectangle':
          return (
            <div
              className="size-full rounded-lg border-2 border-dashed"
              style={{ borderColor, background: bgWithOpacity }}
              role="button"
              aria-label={`Rectangle: ${data.label ?? ''}`}
              onDoubleClick={() => setEditing(true)}
            >{editableText}</div>
          )
        case 'highlight':
          return (
            <div
              className="size-full rounded-lg"
              style={{
                background: bgWithOpacity,
                borderLeft: `3px solid ${borderColor}`,
              }}
              role="button"
              aria-label={`Highlight: ${data.label ?? ''}`}
              onDoubleClick={() => setEditing(true)}
            >
              <span className="inline-block px-3 pt-2 text-[13px] font-medium" style={{ color: borderColor }}>{editableText}</span>
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
        onDoubleClick={() => setEditing(true)}
      >
        {renderContent()}
        <CanvasNodeResizer visible={data.resizeEnabled} minWidth={80} minHeight={32} />
        <CanvasAnchors active={selected} />
      </div>
    )
  }
)
BasicShapeNode.displayName = 'BasicShapeNode'
