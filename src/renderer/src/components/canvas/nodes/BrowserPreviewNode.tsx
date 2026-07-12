import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'

type BrowserPreviewNodeType = Node<
  { label: string; url: string; favicon?: string; worktreeName?: string },
  'browser-preview'
>

export const BrowserPreviewNode: React.FC<NodeProps<BrowserPreviewNodeType>> = React.memo(
  ({ data, selected }) => {
    const hostname = React.useMemo(() => {
      try { return new URL(data.url).hostname } catch { return data.url }
    }, [data.url])

    return (
      <div
        className={`min-w-[200px] rounded-lg border bg-worktree-sidebar shadow-sm ${
          selected ? 'border-blue-500' : 'border-worktree-sidebar-border'
        }`}
        role="button"
        aria-label={`Browser: ${data.url}`}
        tabIndex={0}
      >
        <div className="flex items-center gap-2 border-b border-worktree-sidebar-border px-3 py-2">
          <span aria-hidden="true" className="text-[14px]">
            {data.favicon ? <img src={data.favicon} className="size-4" alt="" /> : '🌐'}
          </span>
          <span className="truncate text-[13px] font-medium text-worktree-sidebar-foreground">
            {data.label || hostname}
          </span>
        </div>
        <div className="space-y-1 px-3 py-2">
          <div className="truncate text-[11px] text-blue-400/70 font-mono">
            {data.url}
          </div>
          <div className="flex text-[10px] text-worktree-sidebar-foreground/30">
            <span>{hostname}</span>
            {data.worktreeName && <span className="ml-auto">{data.worktreeName}</span>}
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
      </div>
    )
  }
)
BrowserPreviewNode.displayName = 'BrowserPreviewNode'
