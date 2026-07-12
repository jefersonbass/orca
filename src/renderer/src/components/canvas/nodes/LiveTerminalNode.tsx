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
  },
  'live-terminal'
>

/**
 * LiveTerminalNode renders a live terminal surface inside a Canvas node.
 *
 * Architecture (Strategy B):
 * 1. PaneManager + xterm instance lives in the hidden host (off-screen)
 * 2. This node registers a portal target in the registry
 * 3. The Terminal workbench detects the portal target and renders
 *    the terminal surface into this node via createPortal
 * 4. Result: one xterm instance, two visual representations
 *    (workbench + Canvas node)
 *
 * Resize events from the Canvas node are propagated to the hidden host
 * container so xterm.fit() calculates correct dimensions.
 */
export const LiveTerminalNode: React.FC<NodeProps<LiveTerminalNodeType>> =
  React.memo(({ data, selected }) => {
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
      // Why: relay focus to the PaneManager's xterm textarea.
      // The hidden host owns the actual xterm instance; we need
      // to focus its textarea when the Canvas node is clicked.
      portalRef.current?.querySelector<HTMLElement>('.xterm-helper-textarea')?.focus()
    }, [paneKey])

    return (
      <div
        className={`min-w-[240px] min-h-[160px] rounded-lg border-2 bg-worktree-sidebar shadow-sm ${
          selected ? 'border-blue-500' : 'border-worktree-sidebar-border'
        }`}
        role="application"
        aria-label={`Live terminal: ${data.label}, ${data.status ?? 'connected'}`}
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
          className="h-[calc(100%-32px)] w-full"
          onClick={handleFocus}
          data-pane-key={paneKey}
        />

        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
      </div>
    )
  })
LiveTerminalNode.displayName = 'LiveTerminalNode'
