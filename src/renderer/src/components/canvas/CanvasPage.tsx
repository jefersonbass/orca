import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CanvasToolbar } from './CanvasToolbar'
import { CanvasEmptyState } from './CanvasEmptyState'
import { KnowledgeArtifactDialog } from './KnowledgeArtifactDialog'
import { OperationalBindingDialog } from './OperationalBindingDialog'
import { BindingInspector } from './BindingInspector'
import { CanvasOrchestrationPanel } from './CanvasOrchestrationPanel'
import { NewResourceDialog, NewTerminalDialog, type TerminalCreationDraft } from './CanvasCreationDialogs'
import { useAppStore } from '@/store'
import { launchAgentInNewTab } from '@/lib/launch-agent-in-new-tab'
import { runQuickCommandInNewTab } from '@/lib/run-quick-command-in-new-tab'
import { FLOATING_TERMINAL_WORKTREE_ID } from '../../../../shared/constants'
import type { CanvasEdgeDocument, CanvasResourceReference, CanvasUndoAction } from '../../../../shared/canvas-types'
import type { TuiAgent } from '../../../../shared/types'
import type { AddNodeType } from './CanvasToolbar'
import { CANVAS_DRAW_TO_ADD_NODE, type CanvasTool } from './canvas-tool-types'
import { exportCanvasPng, exportCanvasSvg } from './canvas-export'

const LEGACY_STORAGE_KEY = 'orca-canvas-document'

const CanvasSurface = React.lazy(() =>
  import('./CanvasSurface').then((m) => ({ default: m.CanvasSurface }))
)

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
  const agentStatusByPaneKey = useAppStore((s) => s.agentStatusByPaneKey)
  const reactFlowRef = useRef<any>(null)
  const [rfReady, setRfReady] = useState(false)
  const [activeTool, setActiveTool] = useState<CanvasTool>('select')
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [resizeNodeId, setResizeNodeId] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [linkStartNodeId, setLinkStartNodeId] = useState<string | null>(null)
  const [terminalDraft, setTerminalDraft] = useState<{ kind: 'terminal' | 'agent'; rect: { x: number; y: number; width: number; height: number } } | null>(null)
  const [resourceDraft, setResourceDraft] = useState<{ kind: 'file' | 'folder' | 'browser'; rect: { x: number; y: number; width: number; height: number } } | null>(null)
  const canvasRuntimeWorktreeId = activeWorktreeId ?? FLOATING_TERMINAL_WORKTREE_ID
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

  // ── Viewport ──
  const handleViewportChange = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      if (!storeCanvasDocument) return
      setCanvasDocument({ ...storeCanvasDocument, viewport })
    },
    [storeCanvasDocument, setCanvasDocument]
  )

  const handleFitView = useCallback(() => reactFlowRef.current?.fitView({ padding: 0.15 }), [])
  const handleZoomIn = useCallback(() => reactFlowRef.current?.zoomIn(), [])
  const handleZoomOut = useCallback(() => reactFlowRef.current?.zoomOut(), [])
  const handleResetView = useCallback(() => {
    reactFlowRef.current?.zoomTo(1)
    reactFlowRef.current?.setCenter(0, 0, { zoom: 1 })
  }, [])

  // ── Add node ──
  const handleAddNode = useCallback(
    (type: AddNodeType, position?: { x: number; y: number }, size?: { width: number; height: number }, extraMetadata?: Record<string, unknown>, labelOverride?: string, resourceRefOverride?: CanvasResourceReference) => {
      const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const base = (doc: NonNullable<typeof storeCanvasDocument>) => {
        const pos = position ?? {
          x: 80 + (doc.nodes.length % 3) * 600,
          y: 80 + Math.floor(doc.nodes.length / 3) * 380,
        }
        const appState = useAppStore.getState()
        let resourceRef: CanvasResourceReference | undefined = resourceRefOverride

        // Direct callers still get a real backing terminal/agent. The drawn
        // creation flow passes its resourceRef explicitly, but the fallback
        // keeps the empty-state and keyboard affordances functional too.
        if (type === 'live-terminal' && !resourceRef) {
          appState.ensureWorktreeRootGroup(canvasRuntimeWorktreeId)
          const command = typeof extraMetadata?.command === 'string' ? extraMetadata.command.trim() : ''
          const cwd = typeof extraMetadata?.cwd === 'string' ? extraMetadata.cwd.trim() : ''
          const result = command
            ? runQuickCommandInNewTab({ command: { id: `canvas_${id}`, label: labelOverride ?? 'Canvas terminal', command, appendEnter: true }, worktreeId: canvasRuntimeWorktreeId })
            : null
          const tabId = result?.tabId ?? (() => {
            const tab = appState.createTab(canvasRuntimeWorktreeId, undefined, undefined, cwd ? { startupCwd: cwd } : undefined)
            appState.setActiveTabType('terminal')
            return tab.id
          })()
          resourceRef = { kind: 'terminal-tab', tabId, worktreeId: canvasRuntimeWorktreeId }
        }
        if (type === 'agent-terminal' && !resourceRef) {
          appState.ensureWorktreeRootGroup(canvasRuntimeWorktreeId)
          const requestedAgent = extraMetadata?.agent
          const agent: TuiAgent = typeof requestedAgent === 'string' ? requestedAgent as TuiAgent : 'codex'
          const result = launchAgentInNewTab({ agent, worktreeId: canvasRuntimeWorktreeId, launchSource: 'canvas' })
          if (result?.tabId) resourceRef = { kind: 'terminal-tab', tabId: result.tabId, worktreeId: canvasRuntimeWorktreeId }
        }

        // Drawing type metadata
        let drawingMetadata: Record<string, unknown> | undefined = undefined
        if (type === 'drawing-freehand') drawingMetadata = { drawingType: 'freehand' }
        else if (type === 'drawing-ellipse') drawingMetadata = { drawingType: 'ellipse' }
        else if (type === 'drawing-polygon') drawingMetadata = { drawingType: 'polygon' }

        const nodeType = type === 'drawing-freehand' || type === 'drawing-ellipse' || type === 'drawing-polygon'
          ? 'drawing' as const
          : type === 'sticky-note' ? 'sticky-note' as const
          : type === 'live-terminal' ? 'live-terminal' as const
          : type === 'agent-terminal' ? 'agent-terminal' as const
          : type as any

        const node: Record<string, unknown> = {
          id,
          type: nodeType,
          position: pos,
          size: size ?? (type === 'group' ? { width: 300, height: 200 }
            : type === 'agent-terminal' || type === 'live-terminal' ? { width: 520, height: 320 }
            : { width: 200, height: 100 }),
          zIndex: doc.nodes.length + 1,
          label: labelOverride ?? (type === 'live-terminal' ? 'Terminal'
            : type === 'agent-terminal' ? 'Agent'
            : type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ').replace('drawing', 'Drawing')),
        }
        if (resourceRef) node.resourceRef = resourceRef
        if (drawingMetadata || extraMetadata) node.metadata = { ...drawingMetadata, ...extraMetadata }
        const store = useAppStore.getState()
        store.pushUndo({ type: 'add-node', node: node as any })
        return { ...doc, nodes: [...doc.nodes, node as any] }
      }
      syncDoc(base)
    },
    [canvasRuntimeWorktreeId, syncDoc]
  )

  const handleCreateRect = useCallback((tool: CanvasTool, rect: { x: number; y: number; width: number; height: number }) => {
    if (tool === 'terminal' || tool === 'agent') {
      setTerminalDraft({ kind: tool, rect })
      setActiveTool('select')
      return
    }
    if (tool === 'file' || tool === 'folder' || tool === 'browser') {
      setResourceDraft({ kind: tool, rect })
      setActiveTool('select')
      return
    }
    const nodeType = CANVAS_DRAW_TO_ADD_NODE[tool] as AddNodeType | undefined
    if (!nodeType) return
    handleAddNode(nodeType, { x: rect.x, y: rect.y }, { width: rect.width, height: rect.height })
    setActiveTool('select')
  }, [handleAddNode])

  const handleCreateResource = useCallback((draft: { label: string; value: string }) => {
    if (!resourceDraft) return
    const { kind, rect } = resourceDraft
    const type: AddNodeType = kind === 'file' ? 'file' : kind === 'folder' ? 'folder' : 'browser-preview'
    const metadata = kind === 'browser' ? { url: draft.value } : { relativePath: draft.value }
    let resourceRef: CanvasResourceReference
    if (kind === 'file') {
      resourceRef = { kind: 'file', worktreeId: activeWorktreeId ?? '', relativePath: draft.value }
    } else if (kind === 'folder') {
      resourceRef = { kind: 'folder', worktreeId: activeWorktreeId ?? '', relativePath: draft.value }
    } else {
      const state = useAppStore.getState()
      const worktreeId = activeWorktreeId ?? FLOATING_TERMINAL_WORKTREE_ID
      const targetGroupId = state.ensureWorktreeRootGroup(worktreeId)
      const browserTab = state.createBrowserTab(worktreeId, draft.value, {
        title: draft.label,
        activate: false,
        targetGroupId,
      })
      resourceRef = {
        kind: 'browser-preview',
        url: draft.value,
        title: draft.label,
        tabId: browserTab.id,
        worktreeId,
      }
    }
    handleAddNode(type, { x: rect.x, y: rect.y }, { width: rect.width, height: rect.height }, metadata, draft.label, resourceRef)
    setResourceDraft(null)
  }, [activeWorktreeId, handleAddNode, resourceDraft])

  const handleCreateTerminal = useCallback((draft: TerminalCreationDraft) => {
    if (!terminalDraft) return
    const type: AddNodeType = terminalDraft.kind === 'agent' ? 'agent-terminal' : 'live-terminal'
    let resourceRef: CanvasResourceReference | undefined
    useAppStore.getState().ensureWorktreeRootGroup(canvasRuntimeWorktreeId)
    if (terminalDraft.kind === 'agent') {
      const result = launchAgentInNewTab({
        agent: draft.agent ?? 'codex',
        worktreeId: canvasRuntimeWorktreeId,
        launchSource: 'canvas',
      })
      if (result?.tabId) {
        resourceRef = { kind: 'terminal-tab', tabId: result.tabId, worktreeId: canvasRuntimeWorktreeId }
      }
    } else {
      const command = draft.command.trim()
      const result = command
        ? runQuickCommandInNewTab({
            command: { id: `canvas_${Date.now()}`, label: draft.name, command, appendEnter: true },
            worktreeId: canvasRuntimeWorktreeId,
          })
        : null
      const tabId = result?.tabId ?? (() => {
        const state = useAppStore.getState()
        const tab = state.createTab(canvasRuntimeWorktreeId, undefined, undefined, draft.cwd.trim() ? { startupCwd: draft.cwd.trim() } : undefined)
        state.setActiveTabType('terminal')
        return tab.id
      })()
      resourceRef = { kind: 'terminal-tab', tabId, worktreeId: canvasRuntimeWorktreeId }
    }
    handleAddNode(type, { x: terminalDraft.rect.x, y: terminalDraft.rect.y }, { width: terminalDraft.rect.width, height: terminalDraft.rect.height }, {
      command: draft.command,
      cwd: draft.cwd,
      monitorActivity: draft.monitorActivity,
      preset: draft.name,
      agent: draft.agent,
    }, draft.name, resourceRef)
    setTerminalDraft(null)
  }, [canvasRuntimeWorktreeId, handleAddNode, terminalDraft])

  const handleNodeDroppedOnFrame = useCallback((nodeId: string, frameId: string | null) => {
    if (!storeCanvasDocument || nodeId === frameId) return
    setCanvasDocument({
      ...storeCanvasDocument,
      nodes: storeCanvasDocument.nodes.map((node) => {
        if (node.id !== nodeId) return node
        if (frameId) return { ...node, groupId: frameId }
        const nextNode = { ...node }
        delete nextNode.groupId
        return nextNode
      }),
    })
  }, [setCanvasDocument, storeCanvasDocument])

  const handleToolChange = useCallback((tool: CanvasTool) => {
    setActiveTool(tool)
    if (tool !== 'select') setResizeNodeId(null)
    if (tool !== 'link') setLinkStartNodeId(null)
  }, [])

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

  // handleCreateOperationalBinding was removed — edge context menu handles bindings via edgeCtx

  // ── Edge creation ──
  const handleEdgeCreated = useCallback(
    (edge: CanvasEdgeDocument) => {
      if (!storeCanvasDocument) return
      useAppStore.getState().pushUndo({ type: 'add-edge', edge })
      setCanvasDocument({
        ...storeCanvasDocument,
        edges: [...(storeCanvasDocument.edges ?? []), edge],
      })
    },
    [storeCanvasDocument, setCanvasDocument]
  )

  // ── Edge deletion ──
  const handleDeleteEdge = useCallback((edgeIdToDelete: string) => {
    if (!storeCanvasDocument) return
    const edges = storeCanvasDocument.edges ?? []
    const edge = edges.find((e) => e.id === edgeIdToDelete)
    if (edge) useAppStore.getState().pushUndo({ type: 'remove-edge', edge })
    setCanvasDocument({
      ...storeCanvasDocument,
      edges: edges.filter((e) => e.id !== edgeIdToDelete),
    })
    setEdgeCtx(null)
    setNodeCtx(null)
  }, [storeCanvasDocument, setCanvasDocument])

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
    const stack = useAppStore.getState().undoStack
    const action = stack.past[stack.past.length - 1]
    if (!action || !storeCanvasDocument) return
    const store = useAppStore.getState()
    applyUndoAction(action, storeCanvasDocument, store)
    store.undo()
  }, [storeCanvasDocument])

  const handleRedo = useCallback(() => {
    const stack = useAppStore.getState().undoStack
    const action = stack.future[stack.future.length - 1]
    if (!action || !storeCanvasDocument) return
    const store = useAppStore.getState()
    applyRedoAction(action, storeCanvasDocument, store)
    store.redo()
  }, [storeCanvasDocument])

  const handleNodeContextMenu = useCallback(
    (evt: { nodeId: string; x: number; y: number }) => setNodeCtx(evt),
    []
  )

  const handleEdgeContextMenu = useCallback(
    (evt: { edgeId: string; x: number; y: number }) => setEdgeCtx(evt),
    []
  )

  const handleDeleteNodeById = useCallback((nodeId: string) => {
    if (!storeCanvasDocument) return
    const node = storeCanvasDocument.nodes.find((n) => n.id === nodeId)
    const edges = storeCanvasDocument.edges ?? []
    const connectedEdges = edges.filter((e) => e.sourceNodeId === nodeId || e.targetNodeId === nodeId)
    const store = useAppStore.getState()
    if (node) store.pushUndo({ type: 'remove-node', node })
    connectedEdges.forEach((e) => store.pushUndo({ type: 'remove-edge', edge: e }))
    setCanvasDocument({
      ...storeCanvasDocument,
      nodes: storeCanvasDocument.nodes.filter((n) => n.id !== nodeId),
      edges: edges.filter((e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId),
    })
    setSelectedNodeIds((ids) => ids.filter((id) => id !== nodeId))
  }, [setCanvasDocument, storeCanvasDocument])

  const handleDeleteNode = useCallback(() => {
    if (!nodeCtx) return
    handleDeleteNodeById(nodeCtx.nodeId)
    setNodeCtx(null)
  }, [handleDeleteNodeById, nodeCtx])

  const handleEditSelectedNode = useCallback(() => {
    const selectedId = selectedNodeIds[0]
    if (!selectedId) return
    setResizeNodeId((current) => current === selectedId ? null : selectedId)
    const element = Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node')).find((candidate) => candidate.dataset.id === selectedId)
    element?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  }, [selectedNodeIds])

  const handleRefreshSelectedNode = useCallback(() => {
    const selectedId = selectedNodeIds[0]
    if (!selectedId || !storeCanvasDocument) return
    setCanvasDocument({
      ...storeCanvasDocument,
      nodes: storeCanvasDocument.nodes.map((node) => node.id === selectedId
        ? { ...node, metadata: { ...node.metadata, refreshRequestedAt: new Date().toISOString() } }
        : node),
    })
  }, [selectedNodeIds, setCanvasDocument, storeCanvasDocument])

  const handleNodeColor = useCallback(
    (color: string) => {
      if (!nodeCtx || !storeCanvasDocument) return
      const node = storeCanvasDocument.nodes.find((n) => n.id === nodeCtx.nodeId)
      if (!node) return
      const store = useAppStore.getState()
      store.pushUndo({ type: 'edit-node', nodeId: nodeCtx.nodeId, from: { color: node.color ?? '' }, to: { color: color || undefined } })
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

  // ── Context menu lifecycle ──
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
    if (storeCanvasDocument) exportCanvasSvg(storeCanvasDocument)
  }, [storeCanvasDocument])

  const handleExportPng = useCallback(() => {
    if (storeCanvasDocument) exportCanvasPng(storeCanvasDocument)
  }, [storeCanvasDocument])

  const hasNodes = (storeCanvasDocument?.nodes?.length ?? 0) > 0
  const connectedEdges = nodeCtx ? (storeCanvasDocument?.edges ?? []).filter(
    (e) => e.sourceNodeId === nodeCtx.nodeId || e.targetNodeId === nodeCtx.nodeId
  ) : []

  return (
    <div className="relative flex size-full flex-col overflow-hidden bg-worktree-sidebar">
      <CanvasToolbar
        nodeCount={nodeCount}
        showBindings={showBindingInspector}
        showOrchestration={showOrchestration}
        onFitView={handleFitView}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onAddNode={handleAddNode}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
        onToggleBindings={() => setShowBindingInspector((v) => !v)}
        onToggleOrchestration={() => setShowOrchestration((v) => !v)}
        activeTool={activeTool}
        onToolChange={handleToolChange}
      />
      {selectedNodeIds.length > 0 && (
        <div className="absolute left-1/2 top-10 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-blue-400/30 bg-worktree-sidebar/95 px-1.5 py-1 shadow-xl backdrop-blur" role="toolbar" aria-label="Selected node actions" onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={handleEditSelectedNode} className="rounded px-2 py-1 text-[11px] text-worktree-sidebar-foreground/70 hover:bg-worktree-sidebar-foreground/10" aria-label="Edit selected node">✎ Edit</button>
          <button type="button" onClick={() => { setLinkStartNodeId(selectedNodeIds[0]); handleToolChange('link') }} className="rounded px-2 py-1 text-[11px] text-blue-300 hover:bg-blue-500/15" aria-label="Link selected node">🔗 Link</button>
          <button type="button" onClick={handleRefreshSelectedNode} className="rounded px-2 py-1 text-[11px] text-worktree-sidebar-foreground/70 hover:bg-worktree-sidebar-foreground/10" aria-label="Refresh selected node">↻ Refresh</button>
          <button type="button" onClick={() => handleDeleteNodeById(selectedNodeIds[0])} className="rounded px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/15" aria-label="Delete selected node">⌫ Delete</button>
        </div>
      )}

      {/* Node context menu */}
      {nodeCtx && (
        <div
          className="fixed z-[9999] min-w-[180px] rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar py-1 shadow-lg"
          style={{ left: nodeCtx.x, top: nodeCtx.y }}
          role="menu"
          aria-label="Node context menu"
        >
          <ColorSubmenu onColor={(c) => { handleNodeColor(c); setNodeCtx(null) }} />

          {/* Attach live agent section */}
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

          {/* Connected edges section */}
          {connectedEdges.length > 0 && (
            <>
              <div className="border-t border-worktree-sidebar-border px-3 py-1 text-[10px] font-medium text-worktree-sidebar-foreground/30 uppercase tracking-wider">
                Connected edges ({connectedEdges.length})
              </div>
              {connectedEdges.map((edge) => {
                const otherNodeId = edge.sourceNodeId === nodeCtx!.nodeId ? edge.targetNodeId : edge.sourceNodeId
                const otherNode = storeCanvasDocument?.nodes.find((n) => n.id === otherNodeId)
                const otherLabel = otherNode?.label ?? otherNodeId.slice(0, 8)
                return (
                  <div key={edge.id} className="flex items-center px-3 py-1">
                    <span className="flex-1 truncate text-[11px] text-worktree-sidebar-foreground/50">
                      {edge.sourceNodeId === nodeCtx!.nodeId ? '→' : '←'} {otherLabel}
                    </span>
                    <button
                      onClick={() => { handleDeleteEdge(edge.id); setNodeCtx(null); }}
                      className="text-[10px] text-red-400/60 hover:text-red-400"
                      title="Delete edge"
                    >✕</button>
                  </div>
                )
              })}
            </>
          )}

          <div className="border-t border-worktree-sidebar-border" />
          <button
            onClick={() => { setNodeCtx(null); setEdgeCtx({ edgeId: '', x: nodeCtx.x, y: nodeCtx.y }) }}
            className="flex w-full items-center px-3 py-1.5 text-left text-[13px] text-blue-400 transition-colors hover:bg-blue-500/10"
            role="menuitem"
          >Create Operational Binding</button>
          <button
            onClick={handleDeleteNode}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
            role="menuitem"
          >🗑 Delete Node</button>
        </div>
      )}

      {/* Edge context menu */}
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
            onClick={() => edgeCtx?.edgeId && handleDeleteEdge(edgeCtx.edgeId)}
            className="flex w-full items-center px-3 py-1.5 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
            role="menuitem"
          >🗑 Delete Edge</button>
        </div>
      )}

      <div className="relative flex-1">
        {!rfReady && hasNodes && (
          <div className="flex size-full items-center justify-center">
            <div className="text-sm text-worktree-sidebar-foreground/40">Loading canvas…</div>
          </div>
        )}

        <React.Suspense
          fallback={
            <div className="flex size-full items-center justify-center">
              <div className="text-sm text-worktree-sidebar-foreground/40">Loading canvas…</div>
            </div>
          }
        >
          <CanvasSurface
            nodes={storeCanvasDocument?.nodes ?? []}
            edges={storeCanvasDocument?.edges ?? []}
            activeTool={activeTool}
            onCreateRect={handleCreateRect}
            onNodeDroppedOnFrame={handleNodeDroppedOnFrame}
            onSelectionChange={setSelectedNodeIds}
            onConnectingChange={setIsConnecting}
            resizeNodeId={resizeNodeId}
            linkStartNodeId={linkStartNodeId}
            onViewportChange={handleViewportChange}
            onInit={handleInit}
            onReactFlowReady={handleReactFlowReady}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeContextMenu={handleEdgeContextMenu}
            onEdgeCreated={handleEdgeCreated}
          />
        </React.Suspense>
        {isConnecting && (
          <div className="pointer-events-none absolute left-1/2 top-[76px] z-30 -translate-x-1/2 rounded-full border border-blue-400/40 bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-300 shadow-lg backdrop-blur">
            Connecting… drag or click a target handle
          </div>
        )}
        {!hasNodes && (
          <div className="pointer-events-none absolute inset-0">
            <div className="size-full">
              <CanvasEmptyState
          onAddTerminal={() => handleToolChange('terminal')}
          onAddAgent={() => handleToolChange('agent')}
          onAddNote={() => handleToolChange('note')}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dialogs and panels */}
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

      {showBindingInspector && (
        <div className="absolute bottom-4 right-4 top-14 z-40 w-[340px] rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar shadow-2xl">
          <BindingInspector onClose={() => setShowBindingInspector(false)} />
        </div>
      )}
      {showOrchestration && (
        <div className="absolute bottom-4 right-4 top-14 z-40 w-[420px] rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar shadow-2xl">
          <CanvasOrchestrationPanel onClose={() => setShowOrchestration(false)} />
        </div>
      )}
      {bindingDraft && (
        <OperationalBindingDialog
          {...bindingDraft}
          onClose={() => setBindingDraft(null)}
          onCreated={() => { setBindingDraft(null); setShowBindingInspector(true) }}
        />
      )}
      {terminalDraft && (
        <NewTerminalDialog
          kind={terminalDraft.kind}
          onCancel={() => setTerminalDraft(null)}
          onCreate={handleCreateTerminal}
        />
      )}
      {resourceDraft && (
        <NewResourceDialog
          kind={resourceDraft.kind}
          onCancel={() => setResourceDraft(null)}
          onCreate={handleCreateResource}
        />
      )}
    </div>
  )
}

// ── Undo action apply helpers ──

function applyUndoAction(
  action: CanvasUndoAction,
  document: NonNullable<ReturnType<typeof useAppStore.getState>['canvasDocument']>,
  store: ReturnType<typeof useAppStore.getState>
): void {
  switch (action.type) {
    case 'move-node':
      store.setCanvasDocument({
        ...document,
        nodes: document.nodes.map((n) => n.id === action.nodeId ? { ...n, position: action.from } : n)
      })
      break
    case 'resize-node':
      store.setCanvasDocument({
        ...document,
        nodes: document.nodes.map((n) => n.id === action.nodeId ? { ...n, size: action.from } : n)
      })
      break
    case 'add-node':
      store.setCanvasDocument({
        ...document,
        nodes: document.nodes.filter((n) => n.id !== action.node.id)
      })
      break
    case 'remove-node':
      store.setCanvasDocument({
        ...document,
        nodes: [...document.nodes, action.node]
      })
      break
    case 'add-edge':
      store.setCanvasDocument({
        ...document,
        edges: (document.edges ?? []).filter((e) => e.id !== action.edge.id)
      })
      break
    case 'remove-edge':
      store.setCanvasDocument({
        ...document,
        edges: [...(document.edges ?? []), action.edge]
      })
      break
    case 'edit-node':
      store.setCanvasDocument({
        ...document,
        nodes: document.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, ...action.from } : n
        )
      })
      break
  }
}

function applyRedoAction(
  action: CanvasUndoAction,
  document: NonNullable<ReturnType<typeof useAppStore.getState>['canvasDocument']>,
  store: ReturnType<typeof useAppStore.getState>
): void {
  switch (action.type) {
    case 'move-node':
      store.setCanvasDocument({
        ...document,
        nodes: document.nodes.map((n) => n.id === action.nodeId ? { ...n, position: action.to } : n)
      })
      break
    case 'resize-node':
      store.setCanvasDocument({
        ...document,
        nodes: document.nodes.map((n) => n.id === action.nodeId ? { ...n, size: action.to } : n)
      })
      break
    case 'add-node':
      store.setCanvasDocument({
        ...document,
        nodes: [...document.nodes, action.node]
      })
      break
    case 'remove-node':
      store.setCanvasDocument({
        ...document,
        nodes: document.nodes.filter((n) => n.id !== action.node.id)
      })
      break
    case 'add-edge':
      store.setCanvasDocument({
        ...document,
        edges: [...(document.edges ?? []), action.edge]
      })
      break
    case 'remove-edge':
      store.setCanvasDocument({
        ...document,
        edges: (document.edges ?? []).filter((e) => e.id !== action.edge.id)
      })
      break
    case 'edit-node':
      store.setCanvasDocument({
        ...document,
        nodes: document.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, ...action.to } : n
        )
      })
      break
  }
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
