import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  addEdge,
  ViewportPortal,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TerminalSummaryNode } from './TerminalSummaryNode'
import { AgentSummaryNode } from './AgentSummaryNode'
import { MissingResourceNode } from './MissingResourceNode'
import { NoteNode } from './nodes/NoteNode'
import { StickyNoteNode } from './nodes/StickyNoteNode'
import { GroupNode } from './nodes/GroupNode'
import { BasicShapeNode } from './nodes/BasicShapeNode'
import { LiveTerminalNode } from './nodes/LiveTerminalNode'
import { AgentTerminalNode } from './nodes/AgentTerminalNode'
import { FileNode } from './nodes/FileNode'
import { FolderNode } from './nodes/FolderNode'
import { DiffNode } from './nodes/DiffNode'
import { PullRequestNode } from './nodes/PullRequestNode'
import { TaskNode } from './nodes/TaskNode'
import { BrowserPreviewNode } from './nodes/BrowserPreviewNode'
import { BrowserSessionNode } from './nodes/BrowserSessionNode'
import { OrchestratorNode } from './nodes/OrchestratorNode'
import { DrawingNode } from './nodes/DrawingNode'
import { SemanticEdge } from './SemanticEdge'
import { VisualEdge } from './VisualEdge'
import { ArrowEdge } from './ArrowEdge'
import type { CanvasNodeDocument, CanvasEdgeDocument } from '../../../../shared/canvas-types'
import { useAppStore } from '@/store'
import type { CanvasTool } from './canvas-tool-types'

// ── Node type registry ──
interface NodeContextMenuEvent {
  nodeId: string
  x: number
  y: number
}

interface EdgeContextMenuEvent {
  edgeId: string
  x: number
  y: number
}

const nodeTypes = {
  'terminal-summary': TerminalSummaryNode,
  'agent-summary': AgentSummaryNode,
  'missing-resource': MissingResourceNode,
  note: NoteNode,
  'sticky-note': StickyNoteNode,
  group: GroupNode,
  label: BasicShapeNode,
  rectangle: BasicShapeNode,
  highlight: BasicShapeNode,
  'live-terminal': LiveTerminalNode,
  'agent-terminal': AgentTerminalNode,
  file: FileNode,
  folder: FolderNode,
  diff: DiffNode,
  'pull-request': PullRequestNode,
  task: TaskNode,
  'browser-preview': BrowserPreviewNode,
  'browser-session': BrowserSessionNode,
  orchestrator: OrchestratorNode,
  drawing: DrawingNode,
}

// ── Edge type registry ──
const edgeTypes = {
  'canvas-link': SemanticEdge,
  visual: VisualEdge,
  related: VisualEdge,
  'depends-on': SemanticEdge,
  arrow: ArrowEdge,
  implements: SemanticEdge,
  modifies: SemanticEdge,
  generates: SemanticEdge,
  documents: SemanticEdge,
  reviews: SemanticEdge,
  blocks: SemanticEdge,
  uses: SemanticEdge,
  'created-from': SemanticEdge,
  'related-to': SemanticEdge,
  'assigned-to': SemanticEdge,
  'owned-by': SemanticEdge,
}

const CanvasEdgeOverlay: React.FC<{ nodes: CanvasNodeDocument[]; edges: CanvasEdgeDocument[] }> = ({ nodes, edges }) => (
  <ViewportPortal>
    <svg className="pointer-events-none absolute left-0 top-0 size-px overflow-visible" aria-label="Canvas connections">
      {edges.map((edge) => {
        const source = nodes.find((node) => node.id === edge.sourceNodeId)
        const target = nodes.find((node) => node.id === edge.targetNodeId)
        if (!source || !target) return null
        const sourceCenter = { x: source.position.x + source.size.width / 2, y: source.position.y + source.size.height / 2 }
        const targetCenter = { x: target.position.x + target.size.width / 2, y: target.position.y + target.size.height / 2 }
        const horizontal = Math.abs(targetCenter.x - sourceCenter.x) > Math.abs(targetCenter.y - sourceCenter.y)
        const sourceRight = targetCenter.x >= sourceCenter.x
        const targetRight = targetCenter.x >= sourceCenter.x
        const sourceX = horizontal ? source.position.x + (sourceRight ? source.size.width : 0) : sourceCenter.x
        const sourceY = horizontal ? sourceCenter.y : source.position.y + (targetCenter.y >= sourceCenter.y ? source.size.height : 0)
        const targetX = horizontal ? target.position.x + (targetRight ? 0 : target.size.width) : targetCenter.x
        const targetY = horizontal ? targetCenter.y : target.position.y + (targetCenter.y >= sourceCenter.y ? 0 : target.size.height)
        const bend = Math.max(80, Math.abs(targetY - sourceY) * 0.5)
        const path = horizontal
          ? `M ${sourceX} ${sourceY} C ${sourceX + (sourceRight ? bend : -bend)} ${sourceY}, ${targetX + (sourceRight ? -bend : bend)} ${targetY}, ${targetX} ${targetY}`
          : `M ${sourceX} ${sourceY} C ${sourceX} ${sourceY + (targetCenter.y >= sourceCenter.y ? bend : -bend)}, ${targetX} ${targetY - (targetCenter.y >= sourceCenter.y ? bend : -bend)}, ${targetX} ${targetY}`
        return <path key={edge.id} className="canvas-edge-path" d={path} fill="none" stroke="#60a5fa" strokeWidth={3} strokeLinecap="round" />
      })}
    </svg>
  </ViewportPortal>
)

export type CanvasSurfaceProps = {
  nodes: CanvasNodeDocument[]
  edges?: CanvasEdgeDocument[]
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void
  onInit: (instance: { fitView: () => void; zoomIn: () => void; zoomOut: () => void; zoomTo: (zoom: number) => void }) => void
  onReactFlowReady: (instance: any) => void
  onNodeContextMenu?: (event: NodeContextMenuEvent) => void
  onEdgeContextMenu?: (event: EdgeContextMenuEvent) => void
  onEdgeCreated?: (edge: import('../../../../shared/canvas-types').CanvasEdgeDocument) => void
  onNodeDroppedOnFrame?: (nodeId: string, frameId: string) => void
  activeTool?: CanvasTool
  onCreateRect?: (tool: CanvasTool, rect: { x: number; y: number; width: number; height: number }) => void
}


export const CanvasSurface: React.FC<CanvasSurfaceProps> = ({
  nodes: canvasDocumentNodes,
  edges: canvasEdges = [],
  onViewportChange,
  onInit,
  onReactFlowReady,
  onNodeContextMenu,
  onEdgeContextMenu,
  onEdgeCreated,
  onNodeDroppedOnFrame,
  activeTool = 'select',
  onCreateRect,
}) => {
  const [connecting, setConnecting] = useState(false)
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null)
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const reactFlowInstanceRef = useRef<any>(null)
  const pendingClickSourceRef = useRef<string | null>(null)
  const [isDark, setIsDark] = useState(true)

  // Detect theme from CSS custom property
  useEffect(() => {
    const checkTheme = () => {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--worktree-sidebar').trim()
      setIsDark(bg.startsWith('#') ? parseInt(bg.slice(1, 3), 16) < 128 : true)
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] })
    return () => observer.disconnect()
  }, [])

  const initialNodes = canvasDocumentNodes.map((docNode) => ({
    id: docNode.id,
    type: docNode.type,
    position: docNode.position,
    width: docNode.size.width,
    height: docNode.size.height,
    data: { ...docNode, ...docNode.metadata } as any,
    selected: false,
  }))

  // Create React Flow edges from CanvasEdgeDocument data
  const initialEdges: Edge[] = canvasEdges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    type: 'default',
    data: { relationship: e.relationship, comment: e.comment },
  }))

  const [flowNodes, setFlowNodes] = useNodesState<Node>(initialNodes)
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges)

  useEffect(() => {
    setFlowNodes(canvasDocumentNodes.map((docNode) => ({
      id: docNode.id, type: docNode.type, position: docNode.position,
      width: docNode.size.width, height: docNode.size.height,
      data: { ...docNode, ...docNode.metadata } as any, selected: false
    })))
  }, [canvasDocumentNodes, setFlowNodes])

  useEffect(() => {
    setFlowEdges(canvasEdges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      type: 'default',
      data: { relationship: edge.relationship, comment: edge.comment },
    })))
  }, [canvasEdges, setFlowEdges])

  const onNodesChangeAny = useCallback((changes: any[]) => {
    setFlowNodes((current) => {
      const next = applyNodeChanges(changes, current)
      const document = useAppStore.getState().canvasDocument
      if (document && changes.some((change) => change.type === 'position' || change.type === 'dimensions')) {
        useAppStore.getState().setCanvasDocument({
          ...document,
          nodes: document.nodes.map((node) => {
            const flowNode = next.find((candidate) => candidate.id === node.id)
            if (!flowNode) return node
            const measured = flowNode.measured
            return {
              ...node,
              position: flowNode.position,
              size: measured?.width && measured?.height
                ? { width: measured.width, height: measured.height }
                : node.size
            }
          })
        })
      }
      return next
    })
  }, [setFlowNodes])

  const onEdgesChangeAny = onEdgesChange as any

  const onViewportChangeHandler = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      onViewportChange(viewport)
    },
    [onViewportChange]
  )

  const onInitHandler = useCallback(
    (instance: any) => {
      reactFlowInstanceRef.current = instance
      onReactFlowReady(instance)
      onInit({
        fitView: () => instance.fitView(),
        zoomIn: () => instance.zoomIn(),
        zoomOut: () => instance.zoomOut(),
        zoomTo: (zoom: number) => instance.zoomTo(zoom),
      })
    },
    [onInit, onReactFlowReady]
  )

  const snap = useCallback((value: number) => Math.round(value / 20) * 20, [])
  const toCanvasPoint = useCallback((event: any) => {
    const instance = reactFlowInstanceRef.current
    if (instance?.screenToFlowPosition) {
      const point = instance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      return { x: snap(point.x), y: snap(point.y) }
    }
    const viewport = instance?.getViewport?.() ?? { x: 0, y: 0, zoom: 1 }
    return {
      x: snap((event.clientX - viewport.x) / viewport.zoom),
      y: snap((event.clientY - viewport.y) / viewport.zoom),
    }
  }, [snap])

  const updateDraftRect = useCallback((start: { x: number; y: number }, current: { x: number; y: number }) => {
    setDraftRect({
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y),
    })
  }, [])

  const onPaneMouseDown = useCallback((event: any) => {
    if (activeTool === 'select' || activeTool === 'link' || event.button !== 0) return
    const start = toCanvasPoint(event)
    setDrawing(start)
    setDraftRect({ x: start.x, y: start.y, width: 0, height: 0 })
  }, [activeTool, toCanvasPoint])

  const onPaneMouseMove = useCallback((event: any) => {
    if (!drawing) return
    updateDraftRect(drawing, toCanvasPoint(event))
  }, [drawing, toCanvasPoint, updateDraftRect])

  const finishDrawing = useCallback(() => {
    if (!drawing || !draftRect) return
    const completedRect = draftRect
    setDrawing(null)
    setDraftRect(null)
    if (completedRect.width < 40 || completedRect.height < 40) return
    onCreateRect?.(activeTool, completedRect)
  }, [activeTool, draftRect, drawing, onCreateRect])

  const onPaneMouseUp = useCallback(() => finishDrawing(), [finishDrawing])

  const onNodeDragStop = useCallback((_event: any, node: any) => {
    if (node.type === 'group') return
    const center = {
      x: node.position.x + (node.width ?? node.measured?.width ?? 0) / 2,
      y: node.position.y + (node.height ?? node.measured?.height ?? 0) / 2,
    }
    const frame = canvasDocumentNodes.find((candidate) => {
      if (candidate.type !== 'group' || candidate.id === node.id) return false
      return center.x >= candidate.position.x && center.x <= candidate.position.x + candidate.size.width
        && center.y >= candidate.position.y && center.y <= candidate.position.y + candidate.size.height
    })
    if (frame) onNodeDroppedOnFrame?.(node.id, frame.id)
  }, [canvasDocumentNodes, onNodeDroppedOnFrame])

  useEffect(() => {
    if (!drawing) return
    const cancelDrawing = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setDrawing(null)
      setDraftRect(null)
    }
    window.addEventListener('keydown', cancelDrawing)
    return () => window.removeEventListener('keydown', cancelDrawing)
  }, [drawing])

  const createEdge = useCallback((source: string, target: string) => {
    if (!source || !target || source === target) return
    const now = new Date().toISOString()
    const edgeId = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setFlowEdges((edges) => addEdge({
      id: edgeId,
      source,
      target,
      type: 'default',
      data: { relationship: 'depends-on', createdBy: 'user', timestamp: now },
    }, edges))
    onEdgeCreated?.({
      id: edgeId,
      sourceNodeId: source,
      targetNodeId: target,
      relationship: 'depends-on',
      type: 'depends-on',
    })
  }, [onEdgeCreated, setFlowEdges])

  useEffect(() => {
    const applyClickConnection = (detail: { nodeId: string; handleType: 'source' | 'target' }) => {
      if (detail.handleType === 'source') {
        pendingClickSourceRef.current = detail.nodeId
        setConnecting(true)
        return
      }
      const source = pendingClickSourceRef.current
      if (!source) return
      createEdge(source, detail.nodeId)
      pendingClickSourceRef.current = null
      setConnecting(false)
    }
    const handleClickConnection = (event: Event) => {
      applyClickConnection((event as CustomEvent<{ nodeId: string; handleType: 'source' | 'target' }>).detail)
    }
    const handleNativeHandleClick = (event: MouseEvent) => {
      const handle = (event.target as HTMLElement | null)?.closest<HTMLElement>('.react-flow__handle')
      const nodeId = handle?.dataset.nodeid
      if (!handle || !nodeId) return
      applyClickConnection({ nodeId, handleType: handle.classList.contains('source') ? 'source' : 'target' })
    }
    window.addEventListener('orca:canvas-handle-click', handleClickConnection)
    document.addEventListener('click', handleNativeHandleClick, true)
    return () => {
      window.removeEventListener('orca:canvas-handle-click', handleClickConnection)
      document.removeEventListener('click', handleNativeHandleClick, true)
    }
  }, [createEdge])

  // Grid color based on theme
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(0, 0, 0, 0.06)'

  const flowProps: Record<string, unknown> = {
    nodes: flowNodes,
    edges: flowEdges,
    onNodesChange: onNodesChangeAny,
    onEdgesChange: onEdgesChangeAny,
    onInit: onInitHandler,
    onViewportChange: onViewportChangeHandler,
    nodeTypes,
    edgeTypes,
    fitView: true,
    minZoom: 0.1,
    maxZoom: 5,
    snapToGrid: true,
    snapGrid: [20, 20],
    nodesResizable: true,
    nodesFocusable: true,
    edgesFocusable: true,
    deleteKeyCode: 'Delete',
    multiSelectionKeyCode: 'Shift',
    selectionOnDrag: true,
    selectNodesOnDrag: true,
    ariaLabel: 'Canvas workspace',
    onNodeContextMenu: (event: any, node: any) => {
      event.preventDefault()
      onNodeContextMenu?.({ nodeId: node.id, x: event.clientX, y: event.clientY })
    },
    onEdgeContextMenu: (event: any, edge: any) => {
      event.preventDefault()
      onEdgeContextMenu?.({ edgeId: edge.id, x: event.clientX, y: event.clientY })
    },
    onConnect: (connection: any) => {
      setConnecting(false)
      if (!connection.source || !connection.target) return
      createEdge(connection.source, connection.target)
    },
    onConnectStart: () => setConnecting(true),
    onConnectEnd: () => { if (!pendingClickSourceRef.current) setConnecting(false) },
    defaultEdgeOptions: { type: 'default', style: { stroke: '#60a5fa', strokeWidth: 2.5 } },
    connectionLineStyle: { stroke: '#60a5fa', strokeWidth: 3 },
    connectionLineType: 'bezier',
    colorMode: isDark ? 'dark' : 'light',
    className: 'canvas-flow',
    panOnDrag: activeTool === 'select',
    onPaneMouseDown,
    onPaneMouseMove,
    onPaneMouseUp,
    onNodeDragStop,
  }
  return (
    <div className="relative size-full overflow-hidden" style={{ background: isDark ? '#1a1a2e' : '#f5f5f5' }}>
      {connecting && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-blue-400/40 bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-300 shadow-lg backdrop-blur">
          Connecting… drag or click a target handle
        </div>
      )}
      {React.createElement(ReactFlow as any, flowProps,
        React.createElement(Background, {
          variant: BackgroundVariant.Lines,
          gap: 20,
          size: 1,
          color: gridColor,
        }),
        React.createElement(CanvasEdgeOverlay, { nodes: canvasDocumentNodes, edges: canvasEdges }),
        draftRect && React.createElement(ViewportPortal, null,
          React.createElement('div', {
            className: 'pointer-events-none absolute rounded-md border-2 border-blue-400 bg-blue-400/10 shadow-[0_0_0_1px_rgba(96,165,250,0.2)]',
            style: { left: draftRect.x, top: draftRect.y, width: draftRect.width, height: draftRect.height },
            'aria-label': `New ${activeTool} ${draftRect.width} by ${draftRect.height}`,
          },
          React.createElement('span', { className: 'absolute -top-6 left-0 rounded bg-blue-500 px-1.5 py-0.5 text-[10px] text-white' }, `${draftRect.width} × ${draftRect.height}`)
          )
        ),
        React.createElement(MiniMap, {
          nodeColor: (node: any) => {
            if (node.selected) return '#e94560'
            if (node.type === 'agent-summary') return '#f39c12'
            if (node.type === 'note') return '#22c55e'
            if (node.type === 'sticky-note') return '#eab308'
            if (node.type === 'group') return '#a855f7'
            if (node.type === 'terminal-summary') return '#0f3460'
            return '#533483'
          },
          maskColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
          pannable: true,
          zoomable: true,
          ariaLabel: 'Canvas minimap',
        })
      )}
    </div>
  )
}
