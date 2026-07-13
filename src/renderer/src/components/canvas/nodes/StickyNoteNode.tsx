import React, { useState, useRef, useEffect } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { useAppStore } from '@/store'
import { CanvasAnchors } from '../CanvasAnchors'

type StickyNoteType = Node<
  { label: string; content?: string; color?: string },
  'sticky-note'
>

export const StickyNoteNode: React.FC<NodeProps<StickyNoteType>> = React.memo(
  ({ id, data, selected }) => {
    const [editing, setEditing] = useState(false)
    const [text, setText] = useState(data.content ?? '')
    const bgColor = data.color ?? '#fef08a'
    const textColor = isLight(bgColor) ? '#1a1a2e' : '#e8e8e8'
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const setCanvasDocument = useAppStore((state) => state.setCanvasDocument)
    const persistText = () => {
      const document = useAppStore.getState().canvasDocument
      if (!document) return
      setCanvasDocument({ ...document, nodes: document.nodes.map((node) =>
        node.id === id ? { ...node, metadata: { ...node.metadata, content: text } } : node
      ) })
    }

    useEffect(() => {
      if (editing && inputRef.current) inputRef.current.focus()
    }, [editing])

    const borderColor = data.color ?? (selected ? '#3b82f6' : 'transparent')
    const hasColor = !!data.color

    return (
      <div
        className={`size-full min-w-0 min-h-0 overflow-hidden rounded-lg border-2 p-0 shadow-sm ${
          !hasColor ? (selected ? 'border-blue-500' : 'border-transparent') : 'border-dashed'
        }`}
        style={{
          background: bgColor,
          color: textColor,
          borderColor: hasColor ? borderColor : undefined,
        }}
        onDoubleClick={() => setEditing(true)}
        role="textbox"
        aria-label={`Sticky note: ${data.label}`}
        tabIndex={0}
      >
        <div className="rounded-t-md bg-yellow-600/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-yellow-950">{data.label || 'Sticky Note'}</div>
        <div className="h-[calc(100%-28px)] min-h-0 overflow-auto p-3">
          {editing ? (
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => {
                setEditing(false)
                persistText()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditing(false)
                  persistText()
                }
              }}
              className="size-full min-h-0 resize-none bg-transparent text-[13px] outline-none"
              style={{ color: textColor }}
              aria-label="Sticky note text"
            />
          ) : (
            <span
              className="block cursor-text whitespace-pre-wrap text-[13px] leading-relaxed"
              style={{ color: textColor }}
            >
              {text || (
                <span className="italic opacity-60">Double-click to edit…</span>
              )}
            </span>
          )}
        </div>
        <CanvasAnchors active={selected || !!text} />
      </div>
    )
  }
)
StickyNoteNode.displayName = 'StickyNoteNode'

function isLight(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length < 6) return true
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return r * 0.299 + g * 0.587 + b * 0.114 > 128
}
