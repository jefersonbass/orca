import React, { useEffect, useRef, useCallback } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position, useStore } from '@xyflow/react'
import { setCanvasPortalTargets, getCanvasPortalTargets } from '../canvas-terminal-portal'
import type { CanvasResourceReference } from '../../../../../shared/canvas-types'
import { CanvasNodeResizer } from '../CanvasNodeResizer'
import { canvasTerminalPortalStyle } from '../canvas-terminal-portal-geometry'

type LiveTerminalNodeType = Node<
  {
    label: string
    paneKey?: string
    resourceRef?: CanvasResourceReference
    sessionId?: string
    status?: 'connected' | 'disconnected' | 'connecting' | 'error'
    color?: string
    resizeEnabled?: boolean
  },
  'live-terminal'
>

export const LiveTerminalNode: React.FC<NodeProps<LiveTerminalNodeType>> =
  React.memo(({ id, data, selected }) => {
    const portalRef = useRef<HTMLDivElement>(null)
    const zoom = useStore((state) => state.transform[2])
    const resourceRef = data.resourceRef
    const paneKey =
      data.paneKey ??
      (resourceRef?.kind === 'live-terminal' ? resourceRef.paneKey : undefined)
    const tabId =
      resourceRef?.kind === 'terminal-tab'
        ? resourceRef.tabId
        : paneKey?.split(':')[0]
    const worktreeId = resourceRef?.kind === 'terminal-tab' ? resourceRef.worktreeId : ''
    const portalKey = paneKey ?? (tabId ? `canvas-tab:${tabId}` : undefined)
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
    const hasTerminal = !!(paneKey || tabId)

    // Register portal target on mount, unregister on unmount
    useEffect(() => {
      if (!portalKey || !tabId || !portalRef.current) return
      const target = portalRef.current
      {
        const existing = getCanvasPortalTargets()
        setCanvasPortalTargets([
          ...existing.filter((entry) => entry.target !== target && entry.paneKey !== portalKey),
          { paneKey, tabId, worktreeId, target, active: true },
        ])
      }

      return () => {
        const remaining = getCanvasPortalTargets().filter((t) => t.target !== target)
        setCanvasPortalTargets(remaining)
      }
    }, [paneKey, portalKey, tabId, worktreeId])

    // Keyboard focus handler — focus the terminal on click
    const handleFocus = useCallback(() => {
      portalRef.current?.querySelector<HTMLElement>('.xterm-helper-textarea')?.focus()
    }, [])

    return (
      <div
        className={`size-full min-w-0 min-h-0 overflow-hidden rounded-lg border-2 bg-worktree-sidebar shadow-sm ${
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
          className="nodrag nopan nowheel relative flex h-[calc(100%-32px)] w-full min-h-0 items-center justify-center"
          onClick={handleFocus}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div
            ref={portalRef}
            className="absolute left-0 top-0 flex min-h-0 items-center justify-center overflow-hidden"
            style={canvasTerminalPortalStyle(zoom)}
            data-pane-key={paneKey}
          />
          {!hasTerminal && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="text-xs text-worktree-sidebar-foreground/45">No terminal attached</div>
              <div className="text-[10px] text-worktree-sidebar-foreground/30">Add a terminal from the + menu to start working</div>
            </div>
          )}
        </div>

        <CanvasNodeResizer visible={data.resizeEnabled} minWidth={260} minHeight={150} />
        <Handle type="source" position={Position.Bottom} className="!size-3 !border-0 !bg-transparent !opacity-0" />
        <Handle type="target" position={Position.Top} className="!size-3 !border-0 !bg-transparent !opacity-0" />
      </div>
    )
  })
LiveTerminalNode.displayName = 'LiveTerminalNode'
