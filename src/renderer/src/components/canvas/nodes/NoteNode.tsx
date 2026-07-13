import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { useAppStore } from '@/store'

type NoteNodeType = Node<{ label: string; content?: string; color?: string }, 'note'>

export const NoteNode: React.FC<NodeProps<NoteNodeType>> = React.memo(
  ({ id, data, selected }) => {
    const [editing, setEditing] = useState(false)
    const [content, setContent] = useState(data.content ?? '')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const setCanvasDocument = useAppStore((state) => state.setCanvasDocument)

    const persistContent = useCallback(() => {
      const document = useAppStore.getState().canvasDocument
      if (!document) return
      setCanvasDocument({ ...document, nodes: document.nodes.map((node) =>
        node.id === id ? { ...node, metadata: { ...node.metadata, content } } : node
      ) })
    }, [content, id, setCanvasDocument])

    useEffect(() => {
      if (editing && textareaRef.current) {
        textareaRef.current.focus()
      }
    }, [editing])

    const handleDoubleClick = useCallback(() => setEditing(true), [])
    const handleBlur = useCallback(() => {
      setEditing(false)
      persistContent()
    }, [persistContent])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          setEditing(false)
          persistContent()
        }
      },
      [persistContent]
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
        onClickCapture={(event) => {
          const handle = (event.target as HTMLElement).closest('.react-flow__handle')
          if (!handle) return
          const handleType = handle.classList.contains('source') ? 'source' : 'target'
          window.dispatchEvent(new CustomEvent('orca:canvas-handle-click', { detail: { nodeId: id, handleType } }))
        }}
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
        <Handle type="source" position={Position.Bottom} className="!size-3 !border-2 !border-blue-300 !bg-blue-500 !opacity-100" />
        <Handle type="target" position={Position.Top} className="!size-3 !border-2 !border-emerald-300 !bg-emerald-500 !opacity-100" />
      </div>
    )
  }
)
NoteNode.displayName = 'NoteNode'
