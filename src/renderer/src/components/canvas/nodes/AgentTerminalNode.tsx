import React, { useEffect, useRef, useCallback } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position, useStore } from '@xyflow/react'
import { getCanvasPortalTargets, setCanvasPortalTargets } from '../canvas-terminal-portal'
import type { CanvasResourceReference } from '../../../../../shared/canvas-types'
import { CanvasNodeResizer } from '../CanvasNodeResizer'
import {
  canvasTerminalPortalStyle,
  normalizeCanvasTerminalZoom
} from '../canvas-terminal-portal-geometry'

type AgentTerminalNodeType = Node<
  {
    label: string
    paneKey?: string
    resourceRef?: CanvasResourceReference
    provider?: string
    agentStatus?: 'working' | 'blocked' | 'waiting' | 'done' | 'idle' | 'disconnected'
    sessionId?: string
    color?: string
    monitorActivity?: boolean
    resizeEnabled?: boolean
  },
  'agent-terminal'
>

const statusColors: Record<string, string> = {
  idle: '#6b7280',
  working: '#eab308',
  blocked: '#ef4444',
  waiting: '#3b82f6',
  done: '#22c55e',
  disconnected: '#6b7280'
}

const statusLabels: Record<string, string> = {
  idle: 'Idle',
  working: 'Working',
  blocked: 'Blocked',
  waiting: 'Waiting',
  done: 'Done',
  disconnected: 'Disconnected'
}

export const AgentTerminalNode: React.FC<NodeProps<AgentTerminalNodeType>> = React.memo(
  ({ id, data, selected }) => {
    const portalRef = useRef<HTMLDivElement>(null)
    const zoom = useStore((state) => state.transform[2])
    const resourceRef = data.resourceRef
    const paneKey =
      data.paneKey ??
      (resourceRef?.kind === 'agent-pane'
        ? (resourceRef.paneKey ??
          `${resourceRef.tabId}:${resourceRef.leafId ?? ''}`.replace(/:$/, ''))
        : resourceRef?.kind === 'agent-terminal'
          ? resourceRef.paneKey
          : undefined)
    const tabId =
      resourceRef?.kind === 'agent-pane'
        ? resourceRef.tabId
        : resourceRef?.kind === 'terminal-tab'
          ? resourceRef.tabId
          : paneKey?.split(':')[0]
    const worktreeId =
      resourceRef?.kind === 'agent-pane'
        ? resourceRef.worktreeId
        : resourceRef?.kind === 'terminal-tab'
          ? resourceRef.worktreeId
          : ''
    const portalKey = paneKey ?? (tabId ? `canvas-tab:${tabId}` : undefined)
    const statusColor = statusColors[data.agentStatus ?? 'idle'] ?? statusColors.idle
    const statusLabel =
      data.monitorActivity === false
        ? 'Monitoring off'
        : (statusLabels[data.agentStatus ?? 'idle'] ?? 'Unknown')

    const borderColor = data.color ?? (selected ? '#3b82f6' : '#533483')
    const hasColor = !!data.color
    const hasAgent = !!(paneKey || tabId)

    // Register portal target on mount
    useEffect(() => {
      if (!portalKey || !tabId || !portalRef.current) {
        return
      }
      const target = portalRef.current
      const existing = getCanvasPortalTargets()
      setCanvasPortalTargets([
        ...existing.filter((entry) => entry.target !== target && entry.paneKey !== portalKey),
        {
          paneKey,
          tabId,
          worktreeId,
          target,
          active: true,
          displayScale: normalizeCanvasTerminalZoom(zoom)
        }
      ])
      return () =>
        setCanvasPortalTargets(getCanvasPortalTargets().filter((entry) => entry.target !== target))
    }, [paneKey, portalKey, tabId, worktreeId, zoom])

    const handleFocus = useCallback(() => {
      portalRef.current?.querySelector<HTMLElement>('.xterm-helper-textarea')?.focus()
    }, [])

    return (
      <div
        className={`size-full min-w-0 min-h-0 overflow-hidden rounded-lg border-2 bg-worktree-sidebar shadow-sm ${
          selected
            ? 'border-blue-500'
            : hasColor
              ? 'border-dashed'
              : 'border-worktree-sidebar-border'
        }`}
        style={{
          borderColor: hasColor ? borderColor : undefined
        }}
        role="application"
        aria-label={`Agent terminal: ${data.label}, ${statusLabel}`}
        onClickCapture={(event) => {
          const handle = (event.target as HTMLElement).closest('.react-flow__handle')
          if (!handle) {
            return
          }
          const handleType = handle.classList.contains('source') ? 'source' : 'target'
          window.dispatchEvent(
            new CustomEvent('orca:canvas-handle-click', { detail: { nodeId: id, handleType } })
          )
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
          {data.provider && (
            <span className="rounded bg-worktree-sidebar-foreground/5 px-1.5 py-0.5 text-[10px] text-worktree-sidebar-foreground/40">
              {data.provider}
            </span>
          )}
          <span className="ml-auto text-[10px] text-worktree-sidebar-foreground/40">
            {statusLabel}
          </span>
        </div>

        {/* Portal target — agent terminal xterm surface renders here */}
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
          {!hasAgent && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="text-xs text-worktree-sidebar-foreground/45">
                No live agent attached
              </div>
              <div className="text-[10px] text-worktree-sidebar-foreground/30">
                Add an agent from the + menu to start working
              </div>
            </div>
          )}
        </div>

        <CanvasNodeResizer visible={data.resizeEnabled} minWidth={260} minHeight={150} />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-3 !border-0 !bg-transparent !opacity-0"
        />
        <Handle
          type="target"
          position={Position.Top}
          className="!size-3 !border-0 !bg-transparent !opacity-0"
        />
      </div>
    )
  }
)
AgentTerminalNode.displayName = 'AgentTerminalNode'
