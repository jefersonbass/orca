import React, { useEffect, useRef, useCallback, useState } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import {
  ensureHiddenContainer,
  removeHiddenContainer,
  registerPortalTarget,
  unregisterPortalTarget,
  updateHiddenContainerSize,
} from '../terminal-portal-registry'
import { setCanvasPortalTargets, getCanvasPortalTargets } from '../canvas-terminal-portal'

type LiveTerminalNodeType = Node<
  {
    label: string
    paneKey?: string
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
    const [, setDimensions] = useState({ width: 0, height: 0 })
    const paneKey = data.paneKey
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
      if (!paneKey) return

      // Ensure hidden container exists for resize propagation
      ensureHiddenContainer(paneKey)

      // Register portal target
      if (portalRef.current) {
        registerPortalTarget(paneKey, portalRef.current)
        // Also publish to the Canvas portal target module for Terminal.tsx consumption
        const existing = getCanvasPortalTargets()
        setCanvasPortalTargets([
          ...existing,
          { paneKey, tabId: paneKey.split(':')[0], worktreeId: '', target: portalRef.current, active: true },
        ])
      }

      return () => {
        unregisterPortalTarget(paneKey)
        removeHiddenContainer(paneKey)
        // Remove this target from Canvas portal registry
        const remaining = getCanvasPortalTargets().filter((t) => t.paneKey !== paneKey)
        setCanvasPortalTargets(remaining)
      }
    }, [paneKey])

    // ResizeObserver to propagate Canvas node dimensions to hidden host
    useEffect(() => {
      if (!portalRef.current || !paneKey) return

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          if (width > 0 && height > 0) {
            setDimensions({ width, height })
            updateHiddenContainerSize(paneKey, width, height)
          }
        }
      })

      observer.observe(portalRef.current)
      return () => observer.disconnect()
    }, [paneKey])

    // Keyboard focus handler — focus the terminal on click
    const handleFocus = useCallback(() => {
      if (!paneKey) return
      // Why: relay focus to the PaneManager's xterm textarea.
      // The hidden host owns the actual xterm instance; we need
      // to focus its textarea when the Canvas node is clicked.
      const hiddenContainer = document.getElementById(
        `term-${paneKey}-focus-target`
      )
      hiddenContainer?.focus()
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
