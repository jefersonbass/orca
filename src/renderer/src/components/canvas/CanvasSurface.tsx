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

const CANVAS_SNAP_GRID: [number, number] = [20, 20]
const CANVAS_DEFAULT_EDGE_OPTIONS = {
  type: 'default',
  style: { stroke: '#60a5fa', strokeWidth: 2.5 },
}
const CANVAS_CONNECTION_LINE_STYLE = { stroke: '#60a5fa', strokeWidth: 3 }
const CANVAS_COLLISION_GAP = 0
const CANVAS_SNAP_DISTANCE = 24

type CanvasRect = { x: number; y: number; width: number; height: number }

function flowNodeRect(node: Node): CanvasRect {
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.width ?? node.measured?.width ?? 0,
    height: node.height ?? node.measured?.height ?? 0,
  }
}

function rectsOverlap(a: CanvasRect, b: CanvasRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function resolveDraggedNodePositions(nodes: Node[], draggedIds: Set<string>): Map<string, { x: number; y: number }> {
  const positions = new Map(nodes.map((node) => [node.id, { ...node.position }]))
  const dragged = nodes.filter((node) => draggedIds.has(node.id))
  const obstacles = nodes.filter((node) => !draggedIds.has(node.id) && node.type !== 'group')

  // Move the whole selected set away from the nearest collision. Resolving in
  // stable order also prevents two selected nodes from ending up on top of one
  // another when they were already close before a multi-drag.
  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false
    for (const node of dragged) {
      const position = positions.get(node.id)
      if (!position) continue
      let rect = { ...flowNodeRect(node), x: position.x, y: position.y }
      const priorDragged = dragged
        .slice(0, dragged.indexOf(node))
        .map((prior) => {
          const priorPosition = positions.get(prior.id) ?? prior.position
          return { ...flowNodeRect(prior), x: priorPosition.x, y: priorPosition.y }
        })
      const blockingRects = [...obstacles.map(flowNodeRect), ...priorDragged]
      for (const fixed of blockingRects) {
        if (!rectsOverlap(rect, fixed)) {
          const verticallyAligned = rect.y < fixed.y + fixed.height && rect.y + rect.height > fixed.y
          const horizontallyAligned = rect.x < fixed.x + fixed.width && rect.x + rect.width > fixed.x
          const snapX = verticallyAligned && Math.abs(rect.x + rect.width - fixed.x) <= CANVAS_SNAP_DISTANCE
            ? fixed.x - rect.width - CANVAS_COLLISION_GAP
            : verticallyAligned && Math.abs(fixed.x + fixed.width - rect.x) <= CANVAS_SNAP_DISTANCE
              ? fixed.x + fixed.width + CANVAS_COLLISION_GAP
              : null
          const snapY = horizontallyAligned && Math.abs(rect.y + rect.height - fixed.y) <= CANVAS_SNAP_DISTANCE
            ? fixed.y - rect.height - CANVAS_COLLISION_GAP
            : horizontallyAligned && Math.abs(fixed.y + fixed.height - rect.y) <= CANVAS_SNAP_DISTANCE
              ? fixed.y + fixed.height + CANVAS_COLLISION_GAP
              : null
          if (snapX !== null) {
            position.x = snapX
            rect = { ...rect, x: snapX }
            changed = true
          } else if (snapY !== null) {
            position.y = snapY
            rect = { ...rect, y: snapY }
            changed = true
          }
          continue
        }
        const candidates = [
          { dx: fixed.x + fixed.width + CANVAS_COLLISION_GAP - rect.x, dy: 0 },
          { dx: fixed.x - (rect.x + rect.width) - CANVAS_COLLISION_GAP, dy: 0 },
          { dx: 0, dy: fixed.y + fixed.height + CANVAS_COLLISION_GAP - rect.y },
          { dx: 0, dy: fixed.y - (rect.y + rect.height) - CANVAS_COLLISION_GAP },
        ]
        const correction = candidates.sort((a, b) => Math.abs(a.dx) + Math.abs(a.dy) - Math.abs(b.dx) - Math.abs(b.dy))[0]
        position.x += correction.dx
        position.y += correction.dy
        rect = { ...rect, x: position.x, y: position.y }
        changed = true
      }
    }
    if (!changed) break
  }
  return positions
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
  onNodeDroppedOnFrame?: (nodeId: string, frameId: string | null) => void
  onSelectionChange?: (nodeIds: string[]) => void
  linkStartNodeId?: string | null
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
  onSelectionChange,
  linkStartNodeId,
  activeTool = 'select',
  onCreateRect,
}) => {
  const [connecting, setConnecting] = useState(false)
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null)
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [linkPointer, setLinkPointer] = useState<{ x: number; y: number } | null>(null)
  const reactFlowInstanceRef = useRef<any>(null)
  const pendingClickSourceRef = useRef<string | null>(null)
  const selectedNodeIdsRef = useRef<Set<string>>(new Set())
  const drawingRef = useRef<{ x: number; y: number } | null>(null)
  const draftRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const [isDark, setIsDark] = useState(true)
  const onEdgeCreatedRef = useRef(onEdgeCreated)

  useEffect(() => {
    onEdgeCreatedRef.current = onEdgeCreated
  }, [onEdgeCreated])

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
    zIndex: docNode.type === 'group' ? docNode.zIndex - 1000 : docNode.zIndex,
    data: { ...docNode, ...docNode.metadata, childCount: canvasDocumentNodes.filter((node) => node.groupId === docNode.id).length } as any,
    selected: selectedNodeIdsRef.current.has(docNode.id),
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
  const flowNodesRef = useRef<Node[]>(initialNodes)

  useEffect(() => {
    const nextNodes = canvasDocumentNodes.map((docNode) => ({
      id: docNode.id, type: docNode.type, position: docNode.position,
      width: docNode.size.width, height: docNode.size.height,
      zIndex: docNode.type === 'group' ? docNode.zIndex - 1000 : docNode.zIndex,
      data: { ...docNode, ...docNode.metadata, childCount: canvasDocumentNodes.filter((node) => node.groupId === docNode.id).length } as any,
      selected: selectedNodeIdsRef.current.has(docNode.id)
    }))
    flowNodesRef.current = nextNodes
    setFlowNodes(nextNodes)
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
    let next = applyNodeChanges(changes, flowNodesRef.current)
    const document = useAppStore.getState().canvasDocument
    const hasGeometryChange = changes.some((change) => change.type === 'position' || change.type === 'dimensions')

    if (document && hasGeometryChange) {
      const groupDeltas = new Map<string, { dx: number; dy: number }>()
      for (const change of changes) {
        if (change.type !== 'position') continue
        const before = document.nodes.find((node) => node.id === change.id)
        const after = next.find((node) => node.id === change.id)
        if (!before || before.type !== 'group' || !after) continue
        groupDeltas.set(change.id, { dx: after.position.x - before.position.x, dy: after.position.y - before.position.y })
      }
      if (groupDeltas.size > 0) {
        next = next.map((flowNode) => {
          const group = document.nodes.find((node) => node.id === flowNode.id)?.groupId
          const delta = group ? groupDeltas.get(group) : undefined
          return delta ? { ...flowNode, position: { x: flowNode.position.x + delta.dx, y: flowNode.position.y + delta.dy } } : flowNode
        })
      }
    }

    // Keep the updater pure: React may invoke it during render/commit.
    flowNodesRef.current = next
    setFlowNodes(next)

    if (document && hasGeometryChange) {
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
    const nextRect = {
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y),
    }
    draftRectRef.current = nextRect
    setDraftRect(nextRect)
  }, [])

  const onPaneMouseMove = useCallback((event: any) => {
    const point = toCanvasPoint(event)
    if (activeTool === 'link') setLinkPointer(point)
  }, [activeTool, toCanvasPoint])

  const finishDrawing = useCallback(() => {
    const completedRect = draftRectRef.current
    if (!drawingRef.current || !completedRect) return
    drawingRef.current = null
    draftRectRef.current = null
    setDrawing(null)
    setDraftRect(null)
    if (completedRect.width < 40 || completedRect.height < 40) return
    onCreateRect?.(activeTool, completedRect)
  }, [activeTool, onCreateRect])

  const onCanvasPointerDownCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || activeTool === 'link' || event.button !== 0) return
    const target = event.target as Element | null
    if (!target?.closest('.react-flow__pane') || target.closest('.react-flow__node') || target.closest('.react-flow__minimap')) return
    const start = toCanvasPoint(event)
    drawingRef.current = start
    draftRectRef.current = { x: start.x, y: start.y, width: 0, height: 0 }
    setDrawing(start)
    setDraftRect(draftRectRef.current)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
    event.stopPropagation()
  }, [activeTool, toCanvasPoint])

  const onCanvasPointerMoveCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'link') setLinkPointer(toCanvasPoint(event))
    const start = drawingRef.current
    if (!start) return
    updateDraftRect(start, toCanvasPoint(event))
    event.preventDefault()
    event.stopPropagation()
  }, [activeTool, toCanvasPoint, updateDraftRect])

  const onCanvasPointerUpCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingRef.current) return
    finishDrawing()
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    event.preventDefault()
    event.stopPropagation()
  }, [finishDrawing])

  const onNodeDragStop = useCallback((_event: any, node: any) => {
    if (node.type === 'group') return
    const currentNodes = flowNodesRef.current
    const draggedIds = new Set(currentNodes.filter((candidate) => candidate.selected).map((candidate) => candidate.id))
    draggedIds.add(node.id)
    const correctedPositions = resolveDraggedNodePositions(currentNodes, draggedIds)
    const correctedNodes = currentNodes.map((candidate) => {
      const position = correctedPositions.get(candidate.id)
      return position ? { ...candidate, position } : candidate
    })
    const corrected = correctedNodes.some((candidate) => {
      const previous = currentNodes.find((item) => item.id === candidate.id)
      return previous && (previous.position.x !== candidate.position.x || previous.position.y !== candidate.position.y)
    })
    if (corrected) {
      flowNodesRef.current = correctedNodes
      setFlowNodes(correctedNodes)
    }
    const correctedNode = correctedNodes.find((candidate) => candidate.id === node.id) ?? node
    const correctedRect = flowNodeRect(correctedNode)
    const frame = canvasDocumentNodes.find((candidate) => {
      if (candidate.type !== 'group' || candidate.id === node.id) return false
      const center = {
        x: correctedRect.x + correctedRect.width / 2,
        y: correctedRect.y + correctedRect.height / 2,
      }
      return center.x >= candidate.position.x && center.x <= candidate.position.x + candidate.size.width
        && center.y >= candidate.position.y && center.y <= candidate.position.y + candidate.size.height
    })
    onNodeDroppedOnFrame?.(node.id, frame?.id ?? null)
    if (corrected) {
      const document = useAppStore.getState().canvasDocument
      if (document) {
        useAppStore.getState().setCanvasDocument({
          ...document,
          nodes: document.nodes.map((documentNode) => {
            const correctedNode = correctedNodes.find((candidate) => candidate.id === documentNode.id)
            return correctedNode ? { ...documentNode, position: correctedNode.position } : documentNode
          }),
        })
      }
    }
  }, [canvasDocumentNodes, onNodeDroppedOnFrame, setFlowNodes])

  useEffect(() => {
    if (!drawing) return
    const cancelDrawing = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      drawingRef.current = null
      draftRectRef.current = null
      setDrawing(null)
      setDraftRect(null)
    }
    window.addEventListener('keydown', cancelDrawing)
    return () => window.removeEventListener('keydown', cancelDrawing)
  }, [drawing])

  useEffect(() => {
    if (!linkStartNodeId) return
    pendingClickSourceRef.current = linkStartNodeId
    setConnecting(true)
    const source = canvasDocumentNodes.find((node) => node.id === linkStartNodeId)
    if (source) {
      setLinkPointer({
        x: source.position.x + source.size.width / 2,
        y: source.position.y + source.size.height / 2,
      })
    }
  }, [canvasDocumentNodes, linkStartNodeId])

  useEffect(() => {
    if (activeTool === 'link') return
    pendingClickSourceRef.current = null
    setConnecting(false)
    setLinkPointer(null)
  }, [activeTool])

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
    onEdgeCreatedRef.current?.({
      id: edgeId,
      sourceNodeId: source,
      targetNodeId: target,
      relationship: 'depends-on',
      type: 'depends-on',
    })
  }, [setFlowEdges])

  const handleConnect = useCallback((connection: any) => {
    setConnecting(false)
    if (!connection.source || !connection.target) return
    createEdge(connection.source, connection.target)
  }, [createEdge])

  const handleConnectStart = useCallback(() => setConnecting(true), [])
  const handleConnectEnd = useCallback(() => {
    if (!pendingClickSourceRef.current) setConnecting(false)
  }, [])

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

  const handleSelectionChange = useCallback((selection: { nodes?: Array<{ id: string }> }) => {
    const ids = (selection.nodes ?? []).map((node) => node.id)
    selectedNodeIdsRef.current = new Set(ids)
    onSelectionChange?.(ids)
  }, [onSelectionChange])

  const handleNodeClick = useCallback((_event: any, node: any) => {
    if (activeTool !== 'link') {
      selectedNodeIdsRef.current = new Set([node.id])
      onSelectionChange?.([node.id])
      return
    }
    const source = pendingClickSourceRef.current
    if (!source) {
      pendingClickSourceRef.current = node.id
      setConnecting(true)
      return
    }
    createEdge(source, node.id)
    pendingClickSourceRef.current = null
    setConnecting(false)
    setLinkPointer(null)
  }, [activeTool, createEdge, onSelectionChange])

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
    snapGrid: CANVAS_SNAP_GRID,
    nodesResizable: true,
    nodesFocusable: true,
    edgesFocusable: true,
    deleteKeyCode: 'Delete',
    multiSelectionKeyCode: 'Shift',
    selectionOnDrag: activeTool === 'select',
    selectNodesOnDrag: true,
    selectionMode: 'partial',
    ariaLabel: 'Canvas workspace',
    onNodeContextMenu: (event: any, node: any) => {
      event.preventDefault()
      onNodeContextMenu?.({ nodeId: node.id, x: event.clientX, y: event.clientY })
    },
    onSelectionChange: handleSelectionChange,
    onNodeClick: handleNodeClick,
    onEdgeContextMenu: (event: any, edge: any) => {
      event.preventDefault()
      onEdgeContextMenu?.({ edgeId: edge.id, x: event.clientX, y: event.clientY })
    },
    onConnect: handleConnect,
    onConnectStart: handleConnectStart,
    onConnectEnd: handleConnectEnd,
    defaultEdgeOptions: CANVAS_DEFAULT_EDGE_OPTIONS,
    connectionLineStyle: CANVAS_CONNECTION_LINE_STYLE,
    connectionLineType: 'bezier',
    colorMode: isDark ? 'dark' : 'light',
    className: 'canvas-flow',
    // Left-drag on empty canvas is the marquee selector. Middle/right drag
    // remains available for panning, which keeps the pointer tool useful for
    // both selection and navigation.
    panOnDrag: activeTool === 'select' ? [1, 2] : false,
    onPaneMouseMove,
    onNodeDragStop,
  }
  return (
    <div
      className="relative size-full overflow-hidden"
      style={{ background: isDark ? '#1a1a2e' : '#f5f5f5' }}
      onPointerDownCapture={onCanvasPointerDownCapture}
      onPointerMoveCapture={onCanvasPointerMoveCapture}
      onPointerUpCapture={onCanvasPointerUpCapture}
      onPointerCancel={onCanvasPointerUpCapture}
    >
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
        connecting && linkPointer && pendingClickSourceRef.current && React.createElement(ViewportPortal, null,
          (() => {
            const source = canvasDocumentNodes.find((node) => node.id === pendingClickSourceRef.current)
            if (!source) return null
            const x1 = source.position.x + source.size.width / 2
            const y1 = source.position.y + source.size.height / 2
            return React.createElement('svg', { className: 'pointer-events-none absolute left-0 top-0 size-px overflow-visible' },
              React.createElement('path', { d: `M ${x1} ${y1} L ${linkPointer.x} ${linkPointer.y}`, fill: 'none', stroke: '#93c5fd', strokeWidth: 3, strokeDasharray: '8 5' })
            )
          })()
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
