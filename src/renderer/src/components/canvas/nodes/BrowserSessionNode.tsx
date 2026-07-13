import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { useBrowserSessionState } from '../use-canvas-integration'

type BrowserSessionNodeType = Node<
  { label: string; sessionId: string; activePage?: string; connected?: boolean; worktreeName?: string },
  'browser-session'
>

export const BrowserSessionNode: React.FC<NodeProps<BrowserSessionNodeType>> = React.memo(
  ({ data, selected }) => {
    const browserState = useBrowserSessionState(data.sessionId)
    const connected = data.connected ?? browserState.connected
    const activePage = data.activePage ?? browserState.activePage
    return (
      <div
        className={`size-full min-w-0 min-h-0 overflow-hidden rounded-lg border bg-worktree-sidebar shadow-sm ${
          selected ? 'border-blue-500' : 'border-worktree-sidebar-border'
        }`}
        role="button"
        aria-label={`Browser session: ${data.label}`}
        tabIndex={0}
      >
        <div className="flex items-center gap-2 border-b border-worktree-sidebar-border px-3 py-2">
          <div
            className={`size-2 shrink-0 rounded-full ${
              connected ? 'bg-green-500' : 'bg-gray-500'
            }`}
            aria-hidden="true"
          />
          <span className="truncate text-[13px] font-medium text-worktree-sidebar-foreground">
            {data.label}
          </span>
        </div>
        <div className="space-y-1 px-3 py-2">
          <div className="truncate text-[11px] text-worktree-sidebar-foreground/40">
            {activePage ?? 'No active page'}
          </div>
          <div className="flex gap-3 text-[10px] text-worktree-sidebar-foreground/30">
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
            <span>{data.sessionId}</span>
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
      </div>
    )
  }
)
BrowserSessionNode.displayName = 'BrowserSessionNode'
