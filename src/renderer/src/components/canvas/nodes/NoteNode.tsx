import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'

type NoteNodeType = Node<{ label: string; content?: string; color?: string }, 'note'>

export const NoteNode: React.FC<NodeProps<NoteNodeType>> = React.memo(
  ({ data, selected }) => {
    const [editing, setEditing] = useState(false)
    const [content, setContent] = useState(data.content ?? '')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
      if (editing && textareaRef.current) {
        textareaRef.current.focus()
      }
    }, [editing])

    const handleDoubleClick = useCallback(() => setEditing(true), [])
    const handleBlur = useCallback(() => {
      setEditing(false)
      data.content = content
    }, [content, data])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          setEditing(false)
          data.content = content
        }
      },
      [content, data]
    )

    return (
      <div
        className={`min-w-[200px] rounded-lg border-2 bg-worktree-sidebar shadow-sm ${
          selected ? 'border-blue-500' : 'border-worktree-sidebar-border'
        }`}
        style={{ borderColor: data.color ?? (selected ? '#3b82f6' : undefined) }}
        onDoubleClick={handleDoubleClick}
        role="textbox"
        aria-label={`Note: ${data.label}`}
        aria-multiline="true"
        tabIndex={0}
      >
        <div className="border-b border-worktree-sidebar-border px-3 py-1.5 text-[11px] font-medium text-worktree-sidebar-foreground/50">
          {data.label || 'Note'}
        </div>
        <div className="px-3 py-2">
          {editing ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] w-full resize-none bg-transparent text-[13px] text-worktree-sidebar-foreground outline-none"
              aria-label="Note content"
            />
          ) : (
            <div className="min-h-[24px] whitespace-pre-wrap text-[13px] text-worktree-sidebar-foreground/80">
              {content || (
                <span className="text-worktree-sidebar-foreground/30 italic">
                  Double-click to edit…
                </span>
              )}
            </div>
          )}
        </div>
        <Handle type="source" position={Position.Bottom} className="!opacity-40" />
        <Handle type="target" position={Position.Top} className="!opacity-40" />
      </div>
    )
  }
)
NoteNode.displayName = 'NoteNode'
