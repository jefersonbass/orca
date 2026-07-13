import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CanvasToolbar } from './CanvasToolbar'
import { CanvasEmptyState } from './CanvasEmptyState'
import { KnowledgeArtifactDialog } from './KnowledgeArtifactDialog'
import { OperationalBindingDialog } from './OperationalBindingDialog'
import { BindingInspector } from './BindingInspector'
import { CanvasOrchestrationPanel } from './CanvasOrchestrationPanel'
import { allowedBindingKinds } from './canvas-operational-graph'
import { useAppStore } from '@/store'

const LEGACY_STORAGE_KEY = 'orca-canvas-document'

// Lazy-load React Flow surface to avoid eager bundle loading
const CanvasSurface = React.lazy(() =>
  import('./CanvasSurface').then((m) => ({ default: m.CanvasSurface }))
)

// Simple debounced save to localStorage (works across page navigations and reloads)
function loadFromDisk<T>(): T | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const CanvasPageInner: React.FC = () => {
  const storeCanvasDocument = useAppStore((s) => s.canvasDocument)
  const setCanvasDocument = useAppStore((s) => s.setCanvasDocument)
  const activateCanvasWorkspace = useAppStore((s) => s.activateCanvasWorkspace)
  const activeWorkspaceKey = useAppStore((s) => s.activeWorkspaceKey)
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const activeRepoId = useAppStore((s) => s.activeRepoId)
  const undoStack = useAppStore((s) => s.undoStack)
  const agentStatusByPaneKey = useAppStore((s) => s.agentStatusByPaneKey)
  const reactFlowRef = useRef<any>(null)
  const [rfReady, setRfReady] = useState(false)
  const [drawingMode, setDrawingMode] = useState(false)
  const nodeCount = storeCanvasDocument?.nodes?.length ?? 0

  // ── Persistence ──
  useEffect(() => {
    activateCanvasWorkspace()
    const saved = loadFromDisk<typeof storeCanvasDocument>()
    if (saved) {
      setCanvasDocument(saved)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
  }, [activateCanvasWorkspace, activeRepoId, activeWorkspaceKey, activeWorktreeId, setCanvasDocument])

  const syncDoc = useCallback(
    (updater: (doc: NonNullable<typeof storeCanvasDocument>) => typeof storeCanvasDocument) => {
      if (!storeCanvasDocument) return
      const updated = updater(storeCanvasDocument)
      setCanvasDocument(updated)
    },
    [storeCanvasDocument, setCanvasDocument]
  )

  // ── React Flow init ──
  const handleInit = useCallback((instance: any) => {
    reactFlowRef.current = instance
    setRfReady(true)
  }, [])

  const handleReactFlowReady = useCallback((instance: any) => {
    reactFlowRef.current = instance
  }, [])

  // ── Viewport (throttled) ──
  const handleViewportChange = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      if (!storeCanvasDocument) return
      setCanvasDocument({ ...storeCanvasDocument, viewport })
    },
    [storeCanvasDocument, setCanvasDocument]
  )

  // ── View actions ──
  const handleFitView = useCallback(() => reactFlowRef.current?.fitView(), [])
  const handleZoomIn = useCallback(() => reactFlowRef.current?.zoomIn(), [])
  const handleZoomOut = useCallback(() => reactFlowRef.current?.zoomOut(), [])
  const handleResetView = useCallback(() => {
    reactFlowRef.current?.zoomTo(1)
    reactFlowRef.current?.setCenter(0, 0, { zoom: 1 })
  }, [])

  // ── Add node ──
  const handleAddNode = useCallback(
    (type: import('./CanvasToolbar').AddNodeType) => {
      const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const base = (doc: NonNullable<typeof storeCanvasDocument>) => {
        const pos = {
          x: 80 + (doc.nodes.length % 3) * 600,
          y: 80 + Math.floor(doc.nodes.length / 3) * 380,
        }
        const appState = useAppStore.getState()
        const activeTabId = appState.activeTabId
        const activePane = activeTabId ? window.__paneManagers?.get(activeTabId)?.getActivePane?.() : undefined
        const activePaneKey = activeTabId && activePane?.leafId ? `${activeTabId}:${activePane.leafId}` : undefined
        const liveAgent = Object.values(appState.agentStatusByPaneKey).find((agent) => agent.tabId === activeTabId)
          ?? Object.values(appState.agentStatusByPaneKey)[0]
        const node: import('../../../../shared/canvas-types').CanvasNodeDocument = {
          id,
          type: type === 'drawing-freehand' || type === 'drawing-ellipse' || type === 'drawing-polygon'
            ? 'drawing' as any
            : type === 'sticky-note' ? 'sticky-note'
            : type as any,
          position: pos,
          size: type === 'group' ? { width: 300, height: 200 }
            : type === 'agent-terminal' || type === 'live-terminal' ? { width: 520, height: 320 }
            : { width: 200, height: 100 },
          zIndex: doc.nodes.length + 1,
          label: type === 'live-terminal' ? 'Terminal'
            : type === 'agent-terminal' ? liveAgent?.terminalTitle ?? liveAgent?.agentType ?? 'Agent'
            : type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '),
          ...(type === 'live-terminal' && activePaneKey
            ? { resourceRef: { kind: 'live-terminal' as const, paneKey: activePaneKey } }
            : {}),
          ...(type === 'agent-terminal' && liveAgent?.tabId
            ? { resourceRef: {
                kind: 'agent-pane' as const,
                tabId: liveAgent.tabId,
                paneKey: liveAgent.paneKey,
                ...(liveAgent.paneKey.startsWith(`${liveAgent.tabId}:`)
                  ? { leafId: liveAgent.paneKey.slice(liveAgent.tabId.length + 1) }
                  : {}),
                worktreeId: liveAgent.worktreeId ?? activeWorktreeId ?? ''
              } }
            : {}),
        }
        return { ...doc, nodes: [...doc.nodes, node] }
      }
      syncDoc(base)
    },
    [activeWorktreeId, syncDoc]
  )

  // ── Context menu state ──
  const [nodeCtx, setNodeCtx] = useState<{ nodeId: string; x: number; y: number } | null>(null)
  const [edgeCtx, setEdgeCtx] = useState<{ edgeId: string; x: number; y: number } | null>(null)
  const [showSendToNote, setShowSendToNote] = useState(false)
  const [showBindingInspector, setShowBindingInspector] = useState(false)
  const [showOrchestration, setShowOrchestration] = useState(false)
  const [bindingDraft, setBindingDraft] = useState<{
    sourceNodeId: string; targetNodeId: string; sourceType: string; targetType: string
  } | null>(null)

  const handleAttachAgent = useCallback((paneKey: string) => {
    if (!nodeCtx || !storeCanvasDocument) return
    const agent = agentStatusByPaneKey[paneKey]
    if (!agent?.tabId) return
    const leafId = paneKey.startsWith(`${agent.tabId}:`)
      ? paneKey.slice(agent.tabId.length + 1)
      : undefined
    setCanvasDocument({
      ...storeCanvasDocument,
      nodes: storeCanvasDocument.nodes.map((node) => node.id === nodeCtx.nodeId ? {
        ...node,
        type: 'agent-terminal',
        label: agent.terminalTitle ?? `${agent.agentType ?? 'Agent'} · ${paneKey}`,
        resourceRef: {
          kind: 'agent-pane', tabId: agent.tabId!, paneKey,
          ...(leafId ? { leafId } : {}), worktreeId: agent.worktreeId ?? activeWorktreeId ?? ''
        }
      } : node)
    })
    setNodeCtx(null)
  }, [activeWorktreeId, agentStatusByPaneKey, nodeCtx, setCanvasDocument, storeCanvasDocument])

  const handleCreateOperationalBinding = useCallback(() => {
    if (!edgeCtx || !storeCanvasDocument) return
    const edge = storeCanvasDocument.edges.find((item) => item.id === edgeCtx.edgeId)
    if (!edge) return
    const source = storeCanvasDocument.nodes.find((node) => node.id === edge.sourceNodeId)
    const target = storeCanvasDocument.nodes.find((node) => node.id === edge.targetNodeId)
    if (!source || !target || allowedBindingKinds(source.type, target.type).length === 0) return
    setBindingDraft({ sourceNodeId: source.id, targetNodeId: target.id, sourceType: source.type, targetType: target.type })
    setEdgeCtx(null)
  }, [edgeCtx, storeCanvasDocument])

  // ── Edge creation ──
  const handleEdgeCreated = useCallback(
    (edge: import('../../../../shared/canvas-types').CanvasEdgeDocument) => {
      if (!storeCanvasDocument) return
      setCanvasDocument({
        ...storeCanvasDocument,
        edges: [...(storeCanvasDocument.edges ?? []), edge],
      })
    },
    [storeCanvasDocument, setCanvasDocument]
  )

  // ── Edge deletion ──
  const handleDeleteEdge = useCallback(() => {
    if (!edgeCtx || !storeCanvasDocument) return
    const edges = storeCanvasDocument.edges ?? []
    setCanvasDocument({
      ...storeCanvasDocument,
      edges: edges.filter((e) => e.id !== edgeCtx.edgeId),
    })
    setEdgeCtx(null)
  }, [edgeCtx, storeCanvasDocument, setCanvasDocument])

  // ── Edge type change ──
  const handleChangeEdgeType = useCallback(
    (newType: string) => {
      if (!edgeCtx || !storeCanvasDocument) return
      const edges = storeCanvasDocument.edges ?? []
      setCanvasDocument({
        ...storeCanvasDocument,
        edges: edges.map((e) =>
          e.id === edgeCtx.edgeId
            ? { ...e, relationship: newType as any, type: newType as any }
            : e
        ),
      })
      setEdgeCtx(null)
    },
    [edgeCtx, storeCanvasDocument, setCanvasDocument]
  )

  // ── Undo / Redo ──
  const handleUndo = useCallback(() => {
    const action = undoStack.past[undoStack.past.length - 1]
    if (!action || !storeCanvasDocument) return
    if (action.type === 'move-node') {
      setCanvasDocument({
        ...storeCanvasDocument,
        nodes: storeCanvasDocument.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, position: action.from } : n
        ),
      })
    }
    if (action.type === 'resize-node') {
      setCanvasDocument({
        ...storeCanvasDocument,
        nodes: storeCanvasDocument.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, size: action.from } : n
        ),
      })
    }
  }, [undoStack, storeCanvasDocument, setCanvasDocument])

  const handleRedo = useCallback(() => {
    const action = undoStack.future[undoStack.future.length - 1]
    if (!action || !storeCanvasDocument) return
    if (action.type === 'move-node') {
      setCanvasDocument({
        ...storeCanvasDocument,
        nodes: storeCanvasDocument.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, position: action.to } : n
        ),
      })
    }
    if (action.type === 'resize-node') {
      setCanvasDocument({
        ...storeCanvasDocument,
        nodes: storeCanvasDocument.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, size: action.to } : n
        ),
      })
    }
  }, [undoStack, storeCanvasDocument, setCanvasDocument])

  const handleNodeContextMenu = useCallback(
    (evt: { nodeId: string; x: number; y: number }) => setNodeCtx(evt),
    []
  )

  const handleEdgeContextMenu = useCallback(
    (evt: { edgeId: string; x: number; y: number }) => setEdgeCtx(evt),
    []
  )

  const handleDeleteNode = useCallback(() => {
    if (!nodeCtx || !storeCanvasDocument) return
    setCanvasDocument({
      ...storeCanvasDocument,
      nodes: storeCanvasDocument.nodes.filter((n) => n.id !== nodeCtx.nodeId),
    })
    setNodeCtx(null)
  }, [nodeCtx, storeCanvasDocument, setCanvasDocument])

  const handleNodeColor = useCallback(
    (color: string) => {
      if (!nodeCtx || !storeCanvasDocument) return
      setCanvasDocument({
        ...storeCanvasDocument,
        nodes: storeCanvasDocument.nodes.map((n) =>
          n.id === nodeCtx.nodeId ? { ...n, color: color || undefined } : n
        ),
      })
      setNodeCtx(null)
    },
    [nodeCtx, storeCanvasDocument, setCanvasDocument]
  )

  // ── Drawing mode ──
  const handleToggleDrawingMode = useCallback(() => {
    setDrawingMode((m) => !m)
  }, [])

  // ── Context menu lifecycle: close on outside click, escape ──
  useEffect(() => {
    if (!nodeCtx && !edgeCtx) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isMenu = target.closest('[role="menu"]')
      if (!isMenu) { setNodeCtx(null); setEdgeCtx(null) }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setNodeCtx(null); setEdgeCtx(null) }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [nodeCtx, edgeCtx])

  // ── Export ──
  const handleExportSvg = useCallback(() => {
    const svg = document.querySelector('.react-flow__pane')?.parentElement
    if (!svg) return
    const html = svg.innerHTML
    const blob = new Blob([html], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'canvas-export.svg'; a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExportPng = useCallback(() => {
    // Simple SVG-to-PNG: serialize SVG to canvas then download
    const svgEl = document.querySelector('.react-flow__pane')?.parentElement?.querySelector('svg')
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    canvas.width = 1920; canvas.height = 1080
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url; a.download = 'canvas-export.png'; a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [])

  const hasNodes = (storeCanvasDocument?.nodes?.length ?? 0) > 0

  return (
    <div className="relative flex size-full flex-col overflow-hidden bg-worktree-sidebar">
      <CanvasToolbar
        nodeCount={nodeCount}
        drawingMode={drawingMode}
        onFitView={handleFitView}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onAddNode={handleAddNode}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleDrawingMode={handleToggleDrawingMode}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
      />


      {/* Context menus */}
      {nodeCtx && (
        <div
          className="fixed z-[9999] min-w-[140px] rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar py-1 shadow-lg"
          style={{ left: nodeCtx.x, top: nodeCtx.y }}
          role="menu"
          aria-label="Node context menu"
        >
          <ColorSubmenu onColor={(c) => { handleNodeColor(c); setNodeCtx(null) }} />
          {storeCanvasDocument?.nodes.find((node) => node.id === nodeCtx.nodeId)?.type === 'agent-terminal' && (
            <>
              <div className="border-t border-worktree-sidebar-border px-3 py-1 text-[10px] uppercase tracking-wider text-worktree-sidebar-foreground/30">
                Attach live agent
              </div>
              {Object.values(agentStatusByPaneKey).length === 0 ? (
                <div className="px-3 py-1.5 text-xs text-worktree-sidebar-foreground/40">No live agents</div>
              ) : Object.values(agentStatusByPaneKey).map((agent) => (
                <button key={agent.paneKey} type="button" role="menuitem"
                  onClick={() => handleAttachAgent(agent.paneKey)}
                  className="flex w-full px-3 py-1.5 text-left text-xs text-worktree-sidebar-foreground/70 hover:bg-worktree-sidebar-foreground/5">
                  {agent.terminalTitle ?? agent.agentType ?? agent.paneKey}
                </button>
              ))}
            </>
          )}
          <button
            onClick={() => { setShowSendToNote(true); setNodeCtx(null) }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-worktree-sidebar-foreground/70 transition-colors hover:bg-worktree-sidebar-foreground/5"
            role="menuitem"
          >📝 Send to Note</button>
          <div className="border-t border-worktree-sidebar-border" />
          <button
            onClick={handleCreateOperationalBinding}
            className="flex w-full items-center px-3 py-1.5 text-left text-[13px] text-blue-400 transition-colors hover:bg-blue-500/10"
            role="menuitem"
          >Create Operational Binding</button>
          <button
            onClick={handleDeleteNode}
            className="flex w-full items-center px-3 py-1.5 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
            role="menuitem"
          >🗑 Delete</button>
        </div>
      )}

      {edgeCtx && (
        <div
          className="fixed z-[9999] min-w-[180px] rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar py-1 shadow-lg"
          style={{ left: edgeCtx.x, top: edgeCtx.y }}
          role="menu"
          aria-label="Edge context menu"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] font-medium text-worktree-sidebar-foreground/30 uppercase tracking-wider">
            Relationship
          </div>
          {RELATIONSHIP_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleChangeEdgeType(type.value)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-worktree-sidebar-foreground/70 transition-colors hover:bg-worktree-sidebar-foreground/5"
              role="menuitem"
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: type.color }} aria-hidden="true" />
              {type.label}
            </button>
          ))}
          <div className="border-t border-worktree-sidebar-border" />
          <button
            onClick={handleDeleteEdge}
            className="flex w-full items-center px-3 py-1.5 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
            role="menuitem"
          >🗑 Delete Edge</button>
        </div>
      )}

      <div className="flex-1">
        {!rfReady && hasNodes && (
          <div className="flex size-full items-center justify-center">
            <div className="text-sm text-worktree-sidebar-foreground/40">
              Loading canvas…
            </div>
          </div>
        )}

        {hasNodes ? (
          <React.Suspense
            fallback={
              <div className="flex size-full items-center justify-center">
                <div className="text-sm text-worktree-sidebar-foreground/40">
                  Loading canvas…
                </div>
              </div>
            }
          >
            <CanvasSurface
              nodes={storeCanvasDocument?.nodes ?? []}
              edges={storeCanvasDocument?.edges ?? []}
              onViewportChange={handleViewportChange}
              onInit={handleInit}
              onReactFlowReady={handleReactFlowReady}
              onNodeContextMenu={handleNodeContextMenu}
              onEdgeContextMenu={handleEdgeContextMenu}
              onEdgeCreated={handleEdgeCreated}
            />
          </React.Suspense>
        ) : (
          <CanvasEmptyState />
        )}
      </div>

      {/* Send to Note dialog */}
      {showSendToNote && storeCanvasDocument && (
        <KnowledgeArtifactDialog
          source={{ sourceType: 'terminal-output', sourceId: 'canvas', sourceLabel: 'Canvas Node', author: 'user', authorType: 'user' }}
          content={''}
          availableNotes={(storeCanvasDocument.nodes ?? []).filter((n) => n.type === 'note' || n.type === 'sticky-note').map((n) => ({ id: n.id, label: n.label }))}
          onAppend={() => { setShowSendToNote(false) }}
          onCreateNote={() => { setShowSendToNote(false) }}
          onClose={() => setShowSendToNote(false)}
        />
      )}
      <button
        type="button"
        onClick={() => setShowBindingInspector((value) => !value)}
        className="absolute right-4 top-4 z-40 rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar/95 px-3 py-2 text-xs text-worktree-sidebar-foreground shadow-lg backdrop-blur"
      >Bindings</button>
      <button type="button" onClick={() => setShowOrchestration((value) => !value)}
        className="absolute right-28 top-4 z-40 rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar/95 px-3 py-2 text-xs text-worktree-sidebar-foreground shadow-lg backdrop-blur">
        Orchestrate
      </button>
      {showBindingInspector && (
        <div className="absolute bottom-4 right-4 top-14 z-40 w-[340px] rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar shadow-2xl">
          <BindingInspector />
        </div>
      )}
      {showOrchestration && (
        <div className="absolute bottom-4 right-4 top-14 z-40 w-[420px] rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar shadow-2xl">
          <CanvasOrchestrationPanel />
        </div>
      )}
      {bindingDraft && (
        <OperationalBindingDialog
          {...bindingDraft}
          onClose={() => setBindingDraft(null)}
          onCreated={() => { setBindingDraft(null); setShowBindingInspector(true) }}
        />
      )}
    </div>
  )
}

// ── Relationship Types ──
const RELATIONSHIP_TYPES = [
  { value: 'implements', label: 'Implements', color: '#22c55e' },
  { value: 'modifies', label: 'Modifies', color: '#3b82f6' },
  { value: 'generates', label: 'Generates', color: '#a855f7' },
  { value: 'documents', label: 'Documents', color: '#06b6d4' },
  { value: 'reviews', label: 'Reviews', color: '#f59e0b' },
  { value: 'depends-on', label: 'Depends On', color: '#ef4444' },
  { value: 'blocks', label: 'Blocks', color: '#dc2626' },
  { value: 'uses', label: 'Uses', color: '#8b5cf6' },
  { value: 'created-from', label: 'Created From', color: '#84cc16' },
  { value: 'related-to', label: 'Related To', color: '#6b7280' },
  { value: 'assigned-to', label: 'Assigned To', color: '#ec4899' },
  { value: 'owned-by', label: 'Owned By', color: '#f97316' },
]

// ── Color Submenu ──
const COLORS = [
  { label: 'None', value: '' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Pink', value: '#ec4899' },
]

const ColorSubmenu: React.FC<{ onColor: (color: string) => void }> = ({ onColor }) => {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-worktree-sidebar-foreground/70 transition-colors hover:bg-worktree-sidebar-foreground/5"
        role="menuitem"
      >
        🎨 Color
      </button>
      {open && (
        <div className="flex flex-wrap gap-1 px-3 pb-1.5">
          {COLORS.map((c) => (
            <button
              key={c.label}
              onClick={() => { onColor(c.value); setOpen(false) }}
              className="size-5 rounded-full border border-worktree-sidebar-border transition-transform hover:scale-110"
              style={{ background: c.value || 'var(--worktree-sidebar)' }}
              aria-label={c.label}
              title={c.label}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CanvasPageInner
