import React, { useEffect, useRef, useCallback } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { setCanvasPortalTargets, getCanvasPortalTargets } from '../canvas-terminal-portal'
import type { CanvasResourceReference } from '../../../../../shared/canvas-types'

type LiveTerminalNodeType = Node<
  {
    label: string
    paneKey?: string
    resourceRef?: CanvasResourceReference
    sessionId?: string
    status?: 'connected' | 'disconnected' | 'connecting' | 'error'
    color?: string
  },
  'live-terminal'
>

export const LiveTerminalNode: React.FC<NodeProps<LiveTerminalNodeType>> =
  React.memo(({ id, data, selected }) => {
    const portalRef = useRef<HTMLDivElement>(null)
    const resourceRef = data.resourceRef
    const paneKey =
      data.paneKey ??
      (resourceRef?.kind === 'live-terminal' ? resourceRef.paneKey : undefined)
    const tabId =
      resourceRef?.kind === 'terminal-tab'
        ? resourceRef.tabId
        : paneKey?.split(':')[0]
    const worktreeId = resourceRef?.kind === 'terminal-tab' ? resourceRef.worktreeId : ''
    const statusColor =
      data.status === 'connected'
        ? '#22c55e'
        : data.status === 'disconnected'
          ? '#ef4444'
          : data.status === 'connecting'
            ? '#eab308'
            : '#6b7280'

    const borderColor = data.color ?? (selected ? '#3b82f6' : '#533483')
    const hasColor = !!data.color
    const hasTerminal = !!paneKey

    // Register portal target on mount, unregister on unmount
    useEffect(() => {
      if (!paneKey || !tabId || !portalRef.current) return
      const target = portalRef.current
      {
        const existing = getCanvasPortalTargets()
        setCanvasPortalTargets([
          ...existing.filter((entry) => entry.paneKey !== paneKey),
          { paneKey, tabId, worktreeId, target, active: true },
        ])
      }

      return () => {
        const remaining = getCanvasPortalTargets().filter((t) => t.paneKey !== paneKey)
        setCanvasPortalTargets(remaining)
      }
    }, [paneKey, tabId, worktreeId])

    // Keyboard focus handler — focus the terminal on click
    const handleFocus = useCallback(() => {
      if (!paneKey) return
      portalRef.current?.querySelector<HTMLElement>('.xterm-helper-textarea')?.focus()
    }, [paneKey])

    return (
      <div
        className={`min-w-[240px] min-h-[160px] rounded-lg border-2 bg-worktree-sidebar shadow-sm ${
          selected ? 'border-blue-500' : hasColor ? 'border-dashed' : 'border-worktree-sidebar-border'
        }`}
        style={{
          borderColor: hasColor ? borderColor : undefined,
        }}
        role="application"
        aria-label={`Live terminal: ${data.label}, ${data.status ?? 'connected'}`}
        onClickCapture={(event) => {
          const handle = (event.target as HTMLElement).closest('.react-flow__handle')
          if (!handle) return
          const handleType = handle.classList.contains('source') ? 'source' : 'target'
          window.dispatchEvent(new CustomEvent('orca:canvas-handle-click', { detail: { nodeId: id, handleType } }))
        }}
        tabIndex={0}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-worktree-sidebar-border px-3 py-1.5">
          <div
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: statusColor }}
            aria-hidden="true"
          />
          <span className="truncate text-[12px] font-medium text-worktree-sidebar-foreground">
            {data.label}
          </span>
          <span className="ml-auto text-[10px] text-worktree-sidebar-foreground/30">
            {data.status === 'connected'
              ? '●'
              : data.status === 'disconnected'
                ? '○'
                : '◌'}
          </span>
        </div>

        {/* Portal target — xterm surface renders here */}
        <div
          ref={portalRef}
          className="flex h-[calc(100%-32px)] w-full items-center justify-center"
          onClick={handleFocus}
          data-pane-key={paneKey}
        >
          {!paneKey && (
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <div className="text-xs text-worktree-sidebar-foreground/45">No terminal attached</div>
              <div className="text-[10px] text-worktree-sidebar-foreground/30">Add a terminal from the + menu to start working</div>
            </div>
          )}
        </div>

        <Handle type="source" position={Position.Bottom} className={`!size-3 !border-2 !border-blue-300 !bg-blue-500 ${hasTerminal ? '!opacity-100' : '!opacity-30'}`} />
        <Handle type="target" position={Position.Top} className={`!size-3 !border-2 !border-emerald-300 !bg-emerald-500 ${hasTerminal ? '!opacity-100' : '!opacity-30'}`} />
      </div>
    )
  })
LiveTerminalNode.displayName = 'LiveTerminalNode'
