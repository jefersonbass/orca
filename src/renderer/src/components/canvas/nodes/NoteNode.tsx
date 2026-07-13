import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '@/store'
import { CanvasAnchors } from '../CanvasAnchors'

type NoteNodeType = Node<{ label: string; content?: string; color?: string }, 'note'>

// Simple markdown component for note display
const NoteMarkdown: React.FC<{ content: string }> = ({ content }) => (
  <div className="prose prose-sm max-w-none text-amber-950">
    <Markdown remarkPlugins={[remarkGfm]}>
      {content}
    </Markdown>
  </div>
)

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

    const borderColor = data.color ?? (selected ? '#3b82f6' : undefined)
    const hasColor = !!data.color
    const isEmpty = !content || content.trim() === ''

    return (
      <div
        className={`size-full min-w-0 min-h-0 overflow-hidden rounded-lg border-2 bg-amber-50 shadow-sm ${
          selected && !hasColor ? 'border-blue-500' : hasColor ? 'border-dashed' : 'border-worktree-sidebar-border'
        }`}
        style={{
          borderColor: hasColor ? borderColor : undefined,
        }}
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
        <div className="flex items-center gap-2 border-b border-amber-300 bg-amber-200 px-3 py-1.5">
          <span className="text-[11px] font-medium text-amber-950/75">
            {data.label || 'Note'}
          </span>
          {!editing && !isEmpty && (
              <span className="ml-auto text-[9px] text-amber-950/45">
              Double-click to edit
            </span>
          )}
        </div>
        <div className="h-[calc(100%-36px)] min-h-0 overflow-auto px-3 py-2 text-amber-950">
          {editing ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="size-full min-h-0 resize-none bg-transparent text-[13px] text-amber-950 outline-none"
              aria-label="Note content"
              placeholder="Write your note in markdown..."
            />
          ) : isEmpty ? (
            <div className="min-h-[24px] whitespace-pre-wrap text-[13px] text-amber-950/45 italic">
              Double-click to edit…
            </div>
          ) : (
            <NoteMarkdown content={content} />
          )}
        </div>
        <CanvasAnchors active={selected || !!content} />
      </div>
    )
  }
)
NoteNode.displayName = 'NoteNode'
