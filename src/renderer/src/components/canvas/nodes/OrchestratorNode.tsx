import React, { useEffect, useRef } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import type { CanvasResourceReference } from '../../../../../shared/canvas-types'
import { CanvasNodeResizer } from '../CanvasNodeResizer'
import { getCanvasPortalTargets, setCanvasPortalTargets } from '../canvas-terminal-portal'

type OrchestratorNodeType = Node<
  {
    label: string
    title?: string
    status?: 'draft' | 'proposed' | 'active' | 'completed' | 'cancelled'
    agentStatus?: 'working' | 'blocked' | 'waiting' | 'done' | 'idle' | 'disconnected'
    agentCount?: number
    taskCount?: number
    resourceRef?: CanvasResourceReference
    color?: string
    resizeEnabled?: boolean
  },
  'orchestrator'
>

const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: '#6b7280', bg: '#6b728020', label: 'Draft' },
  proposed: { color: '#3b82f6', bg: '#3b82f620', label: 'Proposed' },
  active: { color: '#22c55e', bg: '#22c55e20', label: 'Active' },
  completed: { color: '#a855f7', bg: '#a855f720', label: 'Completed' },
  cancelled: { color: '#ef4444', bg: '#ef444420', label: 'Cancelled' },
}

export const OrchestratorNode: React.FC<NodeProps<OrchestratorNodeType>> = React.memo(
  ({ data, selected }) => {
    const portalRef = useRef<HTMLDivElement>(null)
    const terminalRef = data.resourceRef?.kind === 'terminal-tab' ? data.resourceRef : undefined
    const tabId = terminalRef?.tabId
    const worktreeId = terminalRef?.worktreeId ?? ''
    const portalKey = tabId ? `canvas-tab:${tabId}` : undefined
    const status = data.status ?? 'active'
    const st = statusStyles[status] ?? statusStyles.active
    const borderColor = data.color ?? (selected ? '#3b82f6' : '#533483')

    useEffect(() => {
      const target = portalRef.current
      if (!target || !portalKey || !tabId) return
      const existing = getCanvasPortalTargets()
      setCanvasPortalTargets([
        ...existing.filter((entry) => entry.target !== target && entry.paneKey !== portalKey),
        { paneKey: undefined, tabId, worktreeId, target, active: true },
      ])
      return () => setCanvasPortalTargets(getCanvasPortalTargets().filter((entry) => entry.target !== target))
    }, [portalKey, tabId, worktreeId])

    return (
      <div className={`size-full min-h-0 min-w-0 overflow-hidden rounded-lg border-2 bg-worktree-sidebar shadow-sm ${selected ? 'border-blue-500' : 'border-worktree-sidebar-border'}`} style={{ borderColor: data.color ? borderColor : undefined }} role="application" aria-label={`Orchestrator: ${data.label}`} tabIndex={0}>
        <div className="flex h-8 items-center gap-2 border-b border-worktree-sidebar-border px-3">
          <span aria-hidden="true">◎</span>
          <span className="truncate text-[12px] font-semibold text-worktree-sidebar-foreground">{data.title ?? data.label}</span>
          <span className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: st.bg, color: st.color }}>{st.label}</span>
        </div>
        <div className="flex h-[calc(100%-32px)] min-h-0 flex-col">
          <div className="flex h-7 shrink-0 items-center gap-4 border-b border-worktree-sidebar-border/60 px-3 text-[10px] text-worktree-sidebar-foreground/55">
            <span>{data.agentCount ?? 0} linked agents</span>
            <span>{data.taskCount ?? 0} tasks/context</span>
            <span className="ml-auto capitalize">{data.agentStatus ?? 'idle'}</span>
          </div>
          <div ref={portalRef} className="nodrag nopan nowheel relative flex min-h-0 flex-1 items-center justify-center" onPointerDown={(event) => event.stopPropagation()} data-pane-key={portalKey}>
            {!tabId && <div className="px-4 text-center text-xs text-worktree-sidebar-foreground/40">No coordinator terminal attached</div>}
          </div>
        </div>
        <CanvasNodeResizer visible={data.resizeEnabled} minWidth={300} minHeight={180} />
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
      </div>
    )
  }
)
OrchestratorNode.displayName = 'OrchestratorNode'
