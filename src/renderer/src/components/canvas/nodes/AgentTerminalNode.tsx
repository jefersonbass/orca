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

type AgentTerminalNodeType = Node<
  {
    label: string
    paneKey?: string
    provider?: string
    agentStatus?: 'working' | 'blocked' | 'waiting' | 'done' | 'idle' | 'disconnected'
    sessionId?: string
  },
  'agent-terminal'
>

const statusColors: Record<string, string> = {
  idle: '#6b7280',
  working: '#eab308',
  blocked: '#ef4444',
  waiting: '#3b82f6',
  done: '#22c55e',
  disconnected: '#6b7280',
}

const statusLabels: Record<string, string> = {
  idle: 'Idle',
  working: 'Working',
  blocked: 'Blocked',
  waiting: 'Waiting',
  done: 'Done',
  disconnected: 'Disconnected',
}

/**
 * AgentTerminalNode renders an agent terminal surface inside a Canvas node.
 *
 * Like LiveTerminalNode, the actual xterm instance lives in the hidden host.
 * This node registers a portal target so the Terminal workbench can render
 * the terminal surface into it via createPortal.
 *
 * Additional status display shows the agent's current state (working, blocked,
 * waiting, done, etc.) using existing Orca agent status conventions.
 */
export const AgentTerminalNode: React.FC<NodeProps<AgentTerminalNodeType>> =
  React.memo(({ data, selected }) => {
    const portalRef = useRef<HTMLDivElement>(null)
    const [, setDimensions] = useState({ width: 0, height: 0 })
    const paneKey = data.paneKey
    const statusColor = statusColors[data.agentStatus ?? 'idle'] ?? statusColors.idle
    const statusLabel = statusLabels[data.agentStatus ?? 'idle'] ?? 'Unknown'

    // Register portal target on mount
    useEffect(() => {
      if (!paneKey) return
      ensureHiddenContainer(paneKey)
      if (portalRef.current) {
        registerPortalTarget(paneKey, portalRef.current)
      }
      return () => {
        unregisterPortalTarget(paneKey)
        removeHiddenContainer(paneKey)
      }
    }, [paneKey])

    // ResizeObserver for dimension propagation
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

    const handleFocus = useCallback(() => {
      const target = document.getElementById(`term-${paneKey}-focus-target`)
      target?.focus()
    }, [paneKey])

    return (
      <div
        className={`min-w-[240px] min-h-[160px] rounded-lg border-2 bg-worktree-sidebar shadow-sm ${
          selected ? 'border-blue-500' : 'border-worktree-sidebar-border'
        }`}
        role="application"
        aria-label={`Agent terminal: ${data.label}, ${statusLabel}`}
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
AgentTerminalNode.displayName = 'AgentTerminalNode'
