import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  addEdge,
  ViewportPortal,
  type Node,
  type Edge,
  type BackgroundVariant,
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
        const sourceX = source.position.x + source.size.width / 2
        const sourceY = source.position.y + source.size.height
        const targetX = target.position.x + target.size.width / 2
        const targetY = target.position.y
        const bend = Math.max(80, Math.abs(targetY - sourceY) * 0.5)
        return <path key={edge.id} className="canvas-edge-path" d={`M ${sourceX} ${sourceY} C ${sourceX} ${sourceY + bend}, ${targetX} ${targetY - bend}, ${targetX} ${targetY}`} fill="none" stroke="#60a5fa" strokeWidth={3} strokeLinecap="round" />
      })}
    </svg>
  </ViewportPortal>
)

export type CanvasSurfaceProps = {
  nodes: CanvasNodeDocument[]
  edges?: CanvasEdgeDocument[]
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void
  onInit: (instance: { fitView: () => void; zoomIn: () => void; zoomOut: () => void; zoomTo: (zoom: number) => void }) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onReactFlowReady: (instance: any) => void
  onNodeContextMenu?: (event: NodeContextMenuEvent) => void
  onEdgeContextMenu?: (event: EdgeContextMenuEvent) => void
  onEdgeCreated?: (edge: import('../../../../shared/canvas-types').CanvasEdgeDocument) => void
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
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
}) => {
  const [connecting, setConnecting] = useState(false)
  const pendingClickSourceRef = useRef<string | null>(null)
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onEdgesChangeAny = onEdgesChange as any

  const onViewportChangeHandler = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      onViewportChange(viewport)
    },
    [onViewportChange]
  )

  const onInitHandler = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (instance: any) => {
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
    colorMode: 'dark',
    className: 'bg-worktree-sidebar',
  }
  return (
    <div className="relative size-full overflow-hidden bg-worktree-sidebar">
      {connecting && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-blue-400/40 bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-300 shadow-lg backdrop-blur">
          Connecting… drag or click a target handle
        </div>
      )}
      {React.createElement(ReactFlow as any, flowProps,
        React.createElement(CanvasEdgeOverlay, { nodes: canvasDocumentNodes, edges: canvasEdges }),
        React.createElement(Controls, { showInteractive: false, className: '!border-worktree-sidebar-border !bg-worktree-sidebar [&>button]:!border-worktree-sidebar-border [&>button]:!bg-worktree-sidebar [&>button]:!fill-worktree-sidebar-foreground [&>button:hover]:!bg-worktree-sidebar-foreground/10' }),
        React.createElement(Background, { variant: 'dots' as BackgroundVariant, gap: 20, size: 1, color: 'rgba(148, 163, 184, 0.24)' }),
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
          maskColor: 'rgba(0,0,0,0.3)',
          pannable: true,
          zoomable: true,
          ariaLabel: 'Canvas minimap',
        })
      )}
    </div>
  )
}
