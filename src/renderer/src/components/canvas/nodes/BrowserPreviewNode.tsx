import React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { registerBrowserOverlaySlotViewport } from '../../browser-pane/browser-page-viewport'
import { getCanvasBrowserPortalTargets, setCanvasBrowserPortalTargets } from '../canvas-browser-portal'
import type { CanvasResourceReference } from '../../../../../shared/canvas-types'
import { CanvasNodeResizer } from '../CanvasNodeResizer'

type BrowserPreviewNodeType = Node<
  { label: string; url: string; favicon?: string; worktreeName?: string; resourceRef?: CanvasResourceReference; resizeEnabled?: boolean },
  'browser-preview'
>

export const BrowserPreviewNode: React.FC<NodeProps<BrowserPreviewNodeType>> = React.memo(
  ({ data, selected }) => {
    const targetRef = React.useRef<HTMLDivElement>(null)
    const browserRef = data.resourceRef?.kind === 'browser-preview' ? data.resourceRef : undefined
    const tabId = browserRef?.tabId
    const worktreeId = browserRef?.worktreeId ?? ''

    React.useEffect(() => {
      const target = targetRef.current
      if (!target || !tabId) return
      registerBrowserOverlaySlotViewport(tabId, target)
      const existing = getCanvasBrowserPortalTargets()
      setCanvasBrowserPortalTargets([
        ...existing.filter((entry) => entry.target !== target && entry.tabId !== tabId),
        { tabId, worktreeId, target },
      ])
      return () => {
        registerBrowserOverlaySlotViewport(tabId, null)
        setCanvasBrowserPortalTargets(getCanvasBrowserPortalTargets().filter((entry) => entry.target !== target))
      }
    }, [tabId, worktreeId])

    const hostname = React.useMemo(() => {
      try { return new URL(data.url).hostname } catch { return data.url }
    }, [data.url])

    return (
      <div
        className={`size-full min-w-0 min-h-0 overflow-hidden rounded-lg border bg-worktree-sidebar shadow-sm ${
          selected ? 'border-blue-500' : 'border-worktree-sidebar-border'
        }`}
        role="button"
        aria-label={`Browser: ${data.url}`}
        tabIndex={0}
      >
        {!tabId && <div className="flex items-center gap-2 border-b border-worktree-sidebar-border px-3 py-2">
          <span aria-hidden="true" className="text-[14px]">
            {data.favicon ? <img src={data.favicon} className="size-4" alt="" /> : '🌐'}
          </span>
          <span className="truncate text-[13px] font-medium text-worktree-sidebar-foreground">
            {data.label || hostname}
          </span>
        </div>}
        {!tabId && <div className="space-y-1 px-3 py-2">
          <div className="truncate text-[11px] text-blue-400/70 font-mono">
            {data.url}
          </div>
          <div className="flex text-[10px] text-worktree-sidebar-foreground/30">
            <span>{hostname}</span>
            {data.worktreeName && <span className="ml-auto">{data.worktreeName}</span>}
          </div>
        </div>}
        {tabId && <div ref={targetRef} className="relative flex size-full min-h-0 min-w-0 flex-col overflow-hidden" aria-label="Embedded browser" />}
        <CanvasNodeResizer visible={data.resizeEnabled} minWidth={280} minHeight={180} />
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
      </div>
    )
  }
)
BrowserPreviewNode.displayName = 'BrowserPreviewNode'
