import React, { useState, useRef, useEffect } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'

type StickyNoteType = Node<
  { label: string; content?: string; color?: string },
  'sticky-note'
>

export const StickyNoteNode: React.FC<NodeProps<StickyNoteType>> = React.memo(
  ({ data }) => {
    const [editing, setEditing] = useState(false)
    const [text, setText] = useState(data.content ?? '')
    const bgColor = data.color ?? '#fef08a'
    const textColor = isLight(bgColor) ? '#1a1a2e' : '#e8e8e8'
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
      if (editing && inputRef.current) inputRef.current.focus()
    }, [editing])

    return (
      <div
        className="min-w-[120px] rounded-lg p-3 shadow-sm"
        style={{ background: bgColor, color: textColor }}
        onDoubleClick={() => setEditing(true)}
        role="textbox"
        aria-label={`Sticky note: ${data.label}`}
        tabIndex={0}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              setEditing(false)
              data.content = text
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditing(false)
                data.content = text
              }
            }}
            className="w-full bg-transparent text-[13px] outline-none"
            style={{ color: textColor }}
            aria-label="Sticky note text"
          />
        ) : (
          <span
            className="block cursor-text text-[13px] leading-relaxed"
            style={{ color: textColor }}
          >
            {text || (
              <span className="italic opacity-60">Double-click to edit…</span>
            )}
          </span>
        )}
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
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
