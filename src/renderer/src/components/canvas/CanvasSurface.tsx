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

function nearestNodeAnchor(node: CanvasNodeDocument, point: { x: number; y: number }): { x: number; y: number } {
  const centerX = node.position.x + node.size.width / 2
  const centerY = node.position.y + node.size.height / 2
  const normalizedX = (point.x - centerX) / Math.max(1, node.size.width / 2)
  const normalizedY = (point.y - centerY) / Math.max(1, node.size.height / 2)
  if (Math.abs(normalizedX) >= Math.abs(normalizedY)) {
    return { x: normalizedX >= 0 ? node.position.x + node.size.width : node.position.x, y: centerY }
  }
  return { x: centerX, y: normalizedY >= 0 ? node.position.y + node.size.height : node.position.y }
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
  onCreateRect?: (tool: CanvasTool, rect: { x: number; y: number; width: number; height: number }, metadata?: Record<string, unknown>) => void
  onConnectingChange?: (connecting: boolean) => void
  onConnectionSourceChange?: (nodeId: string | null) => void
  onConnectionFinished?: () => void
  onPaneClick?: () => void
  resizeNodeId?: string | null
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
  onConnectingChange,
  onConnectionSourceChange,
  onConnectionFinished,
  onPaneClick,
  resizeNodeId,
}) => {
  const [connecting, setConnecting] = useState(false)
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null)
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [draftPoints, setDraftPoints] = useState<Array<{ x: number; y: number }>>([])
  const [linkPointer, setLinkPointer] = useState<{ x: number; y: number } | null>(null)
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null)
  const [connectionTargetId, setConnectionTargetId] = useState<string | null>(null)
  const reactFlowInstanceRef = useRef<any>(null)
  const connectionSourceRef = useRef<string | null>(null)
  const linkPointerRef = useRef<{ x: number; y: number } | null>(null)
  const selectedNodeIdsRef = useRef<Set<string>>(new Set())
  const drawingRef = useRef<{ x: number; y: number } | null>(null)
  const draftRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const draftPointsRef = useRef<Array<{ x: number; y: number }>>([])
  const [isDark, setIsDark] = useState(true)
  const onEdgeCreatedRef = useRef(onEdgeCreated)

  useEffect(() => {
    onConnectingChange?.(connecting)
  }, [connecting, onConnectingChange])

  useEffect(() => {
    onConnectionSourceChange?.(connectionSourceId)
  }, [connectionSourceId, onConnectionSourceChange])

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
    data: { ...docNode, ...docNode.metadata, resizeEnabled: resizeNodeId === docNode.id, childCount: canvasDocumentNodes.filter((node) => node.groupId === docNode.id).length } as any,
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
      data: { ...docNode, ...docNode.metadata, resizeEnabled: resizeNodeId === docNode.id, childCount: canvasDocumentNodes.filter((node) => node.groupId === docNode.id).length } as any,
      selected: selectedNodeIdsRef.current.has(docNode.id)
    }))
    flowNodesRef.current = nextNodes
    setFlowNodes(nextNodes)
  }, [canvasDocumentNodes, resizeNodeId, setFlowNodes])

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
    const gestureInProgress = changes.some((change) =>
      (change.type === 'position' && change.dragging === true)
      || (change.type === 'dimensions' && change.resizing === true)
    )
    const dimensionsByNodeId = new Map<string, { width: number; height: number }>(
      changes.flatMap((change) =>
        change.type === 'dimensions' && change.dimensions
          ? [[change.id, change.dimensions] as const]
          : []
      )
    )

    if (document && hasGeometryChange) {
      const groupDeltas = new Map<string, { dx: number; dy: number }>()
      for (const change of changes) {
        if (change.type !== 'position') continue
        const before = flowNodesRef.current.find((node) => node.id === change.id)
        const documentNode = document.nodes.find((node) => node.id === change.id)
        const after = next.find((node) => node.id === change.id)
        if (!before || documentNode?.type !== 'group' || !after) continue
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

    if (document && hasGeometryChange && !gestureInProgress) {
      useAppStore.getState().setCanvasDocument({
        ...document,
        nodes: document.nodes.map((node) => {
          const flowNode = next.find((candidate) => candidate.id === node.id)
          if (!flowNode) return node
          const changedDimensions = dimensionsByNodeId.get(node.id)
          const width = changedDimensions?.width ?? flowNode.width ?? flowNode.measured?.width
          const height = changedDimensions?.height ?? flowNode.height ?? flowNode.measured?.height
          return {
            ...node,
            position: flowNode.position,
            size: width && height
              ? { width, height }
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
        fitView: () => instance.fitView({ maxZoom: 1 }),
        zoomIn: () => instance.zoomIn(),
        zoomOut: () => instance.zoomOut(),
        zoomTo: (zoom: number) => instance.zoomTo(zoom),
      })
    },
    [onInit, onReactFlowReady]
  )

  const snap = useCallback((value: number) => Math.round(value / 20) * 20, [])
  const toCanvasPoint = useCallback((event: any, snapToGrid = true) => {
    const instance = reactFlowInstanceRef.current
    if (instance?.screenToFlowPosition) {
      const point = instance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      return snapToGrid ? { x: snap(point.x), y: snap(point.y) } : point
    }
    const viewport = instance?.getViewport?.() ?? { x: 0, y: 0, zoom: 1 }
    const point = {
      x: (event.clientX - viewport.x) / viewport.zoom,
      y: (event.clientY - viewport.y) / viewport.zoom,
    }
    return snapToGrid ? { x: snap(point.x), y: snap(point.y) } : point
  }, [snap])

  const scheduleLinkPointer = useCallback((point: { x: number; y: number }) => {
    linkPointerRef.current = point
    // Pointer movement must remain observable even when Chromium throttles
    // animation frames (for example while an embedded terminal has focus).
    // This update is event-driven, so it cannot create a render loop.
    setLinkPointer(point)
  }, [])

  useEffect(() => {
    if (activeTool !== 'link') return
    const trackPointer = (event: PointerEvent | MouseEvent) => scheduleLinkPointer(toCanvasPoint(event, false))
    window.addEventListener('pointermove', trackPointer, true)
    window.addEventListener('mousemove', trackPointer, true)
    return () => {
      window.removeEventListener('pointermove', trackPointer, true)
      window.removeEventListener('mousemove', trackPointer, true)
    }
  }, [activeTool, scheduleLinkPointer, toCanvasPoint])

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

  const finishDrawing = useCallback(() => {
    const completedRect = draftRectRef.current
    if (!drawingRef.current || !completedRect) return
    const completedPoints = draftPointsRef.current
    drawingRef.current = null
    draftRectRef.current = null
    draftPointsRef.current = []
    setDrawing(null)
    setDraftRect(null)
    setDraftPoints([])
    if (activeTool === 'freehand' && completedPoints.length >= 2) {
      const padding = 4
      const minX = Math.min(...completedPoints.map((point) => point.x))
      const minY = Math.min(...completedPoints.map((point) => point.y))
      const maxX = Math.max(...completedPoints.map((point) => point.x))
      const maxY = Math.max(...completedPoints.map((point) => point.y))
      const rect = {
        x: minX - padding,
        y: minY - padding,
        width: Math.max(40, maxX - minX + padding * 2),
        height: Math.max(40, maxY - minY + padding * 2),
      }
      onCreateRect?.(activeTool, rect, {
        points: completedPoints.map((point) => ({
          x: ((point.x - rect.x) / rect.width) * 100,
          y: ((point.y - rect.y) / rect.height) * 100,
        })),
      })
      return
    }
    if (completedRect.width < 40 || completedRect.height < 40) return
    onCreateRect?.(activeTool, completedRect)
  }, [activeTool, onCreateRect])

  const onCanvasPointerDownCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || activeTool === 'link' || event.button !== 0) return
    const target = event.target as Element | null
    if (!target?.closest('.react-flow') || target.closest('.react-flow__node') || target.closest('.react-flow__minimap') || target.closest('.react-flow__controls')) return
    const start = toCanvasPoint(event, activeTool !== 'freehand')
    drawingRef.current = start
    draftPointsRef.current = activeTool === 'freehand' ? [start] : []
    draftRectRef.current = { x: start.x, y: start.y, width: 0, height: 0 }
    setDrawing(start)
    setDraftPoints(draftPointsRef.current)
    setDraftRect(draftRectRef.current)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
    event.stopPropagation()
  }, [activeTool, toCanvasPoint])

  const onCanvasPointerMoveCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'link') scheduleLinkPointer(toCanvasPoint(event, false))
    const start = drawingRef.current
    if (!start) return
    if (activeTool === 'freehand') {
      const current = toCanvasPoint(event, false)
      const previous = draftPointsRef.current[draftPointsRef.current.length - 1]
      if (!previous || Math.hypot(current.x - previous.x, current.y - previous.y) >= 2) {
        draftPointsRef.current = [...draftPointsRef.current, current]
        setDraftPoints(draftPointsRef.current)
      }
      updateDraftRect(start, current)
      event.preventDefault()
      event.stopPropagation()
      return
    }
    updateDraftRect(start, toCanvasPoint(event))
    event.preventDefault()
    event.stopPropagation()
  }, [activeTool, scheduleLinkPointer, toCanvasPoint, updateDraftRect])

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
    for (const draggedId of [...draggedIds]) {
      if (canvasDocumentNodes.find((candidate) => candidate.id === draggedId)?.type !== 'group') continue
      for (const child of canvasDocumentNodes.filter((candidate) => candidate.groupId === draggedId)) {
        draggedIds.add(child.id)
      }
    }
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

  const setConnectionSource = useCallback((nodeId: string | null) => {
    if (connectionSourceRef.current === nodeId) return
    connectionSourceRef.current = nodeId
    setConnectionSourceId(nodeId)
    setConnecting(nodeId !== null)
    setConnectionTargetId(null)
    if (!nodeId) {
      linkPointerRef.current = null
      setLinkPointer(null)
      return
    }
    const source = canvasDocumentNodes.find((node) => node.id === nodeId)
    if (!source) return
    const center = {
      x: source.position.x + source.size.width / 2,
      y: source.position.y + source.size.height / 2,
    }
    linkPointerRef.current = center
    setLinkPointer(center)
  }, [canvasDocumentNodes])

  const cancelConnection = useCallback((notifyParent = true) => {
    setConnectionSource(null)
    if (notifyParent) onConnectionFinished?.()
  }, [onConnectionFinished, setConnectionSource])

  useEffect(() => {
    if (!drawing && activeTool !== 'link') return
    const cancelTransientGesture = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      drawingRef.current = null
      draftRectRef.current = null
      draftPointsRef.current = []
      setDrawing(null)
      setDraftRect(null)
      setDraftPoints([])
      if (activeTool === 'link') cancelConnection()
    }
    window.addEventListener('keydown', cancelTransientGesture)
    return () => window.removeEventListener('keydown', cancelTransientGesture)
  }, [activeTool, cancelConnection, drawing])

  useEffect(() => {
    if (!linkStartNodeId || activeTool !== 'link') return
    setConnectionSource(linkStartNodeId)
  }, [activeTool, linkStartNodeId, setConnectionSource])

  useEffect(() => {
    if (activeTool === 'link') {
      setConnecting(true)
      return
    }
    setConnectionSource(null)
  }, [activeTool, setConnectionSource])

  const createEdge = useCallback((source: string, target: string) => {
    if (!source || !target || source === target) return
    if (canvasEdges.some((edge) => edge.sourceNodeId === source && edge.targetNodeId === target)) return
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
  }, [canvasEdges, setFlowEdges])

  const handleConnect = useCallback((connection: any) => {
    if (!connection.source || !connection.target) return
    createEdge(connection.source, connection.target)
    cancelConnection()
  }, [cancelConnection, createEdge])

  const handleConnectStart = useCallback(() => setConnecting(true), [])
  const handleConnectEnd = useCallback(() => {
    if (!connectionSourceRef.current) setConnecting(false)
  }, [])

  const handleConnectionNodeClick = useCallback((nodeId: string) => {
    const source = connectionSourceRef.current
    if (!source) {
      setConnectionSource(nodeId)
      return
    }
    if (source === nodeId) {
      cancelConnection()
      return
    }
    createEdge(source, nodeId)
    cancelConnection()
  }, [cancelConnection, createEdge, setConnectionSource])

  // Grid color based on theme
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(0, 0, 0, 0.06)'

  const handleSelectionChange = useCallback((selection: { nodes?: Array<{ id: string }> }) => {
    const ids = (selection.nodes ?? []).map((node) => node.id)
    selectedNodeIdsRef.current = new Set(ids)
    onSelectionChange?.(ids)
  }, [onSelectionChange])

  const handleNodeClick = useCallback((event: any) => {
    // React Flow owns selection. Connection clicks are captured by the
    // full-node overlays rendered below, including browser/terminal portals.
    if (activeTool === 'link') event.preventDefault?.()
  }, [activeTool])

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
    fitViewOptions: { maxZoom: 1 },
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
    onPointerMove: (event: React.PointerEvent) => {
      if (activeTool === 'link') scheduleLinkPointer(toCanvasPoint(event, false))
    },
    onMouseMove: (event: React.MouseEvent) => {
      if (activeTool === 'link') scheduleLinkPointer(toCanvasPoint(event, false))
    },
    onPaneClick: () => {
      if (activeTool === 'link') cancelConnection()
      onPaneClick?.()
    },
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
    onNodeDragStop,
  }
  return (
    <div
      className="relative size-full overflow-hidden"
      style={{ background: isDark ? '#1a1a2e' : '#f5f5f5' }}
      onPointerDownCapture={onCanvasPointerDownCapture}
      onPointerMoveCapture={onCanvasPointerMoveCapture}
      onMouseMoveCapture={(event) => {
        if (activeTool === 'link') scheduleLinkPointer(toCanvasPoint(event, false))
      }}
      onPointerUpCapture={onCanvasPointerUpCapture}
      onPointerCancel={onCanvasPointerUpCapture}
    >
      {React.createElement(ReactFlow as any, flowProps,
        React.createElement(Background, {
          variant: BackgroundVariant.Lines,
          gap: 20,
          size: 1,
          color: gridColor,
        }),
        React.createElement(CanvasEdgeOverlay, { nodes: canvasDocumentNodes, edges: canvasEdges }),
        draftRect && activeTool !== 'freehand' && React.createElement(ViewportPortal, null,
          React.createElement('div', {
            className: 'pointer-events-none absolute rounded-md border-2 border-blue-400 bg-blue-400/10 shadow-[0_0_0_1px_rgba(96,165,250,0.2)]',
            style: { left: draftRect.x, top: draftRect.y, width: draftRect.width, height: draftRect.height },
            'aria-label': `New ${activeTool} ${draftRect.width} by ${draftRect.height}`,
          },
          React.createElement('span', { className: 'absolute -top-6 left-0 rounded bg-blue-500 px-1.5 py-0.5 text-[10px] text-white' }, `${draftRect.width} × ${draftRect.height}`)
          )
        ),
        draftPoints.length > 1 && activeTool === 'freehand' && React.createElement(ViewportPortal, null,
          React.createElement('svg', { className: 'pointer-events-none absolute left-0 top-0 size-px overflow-visible' },
            React.createElement('polyline', {
              className: 'canvas-freehand-preview',
              points: draftPoints.map((point) => `${point.x},${point.y}`).join(' '),
              fill: 'none',
              stroke: '#60a5fa',
              strokeWidth: 3,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            })
          )
        ),
        activeTool === 'link' && React.createElement(ViewportPortal, null,
          React.createElement(React.Fragment, null,
            canvasDocumentNodes.map((node) => React.createElement('div', {
              key: `connection-target-${node.id}`,
              className: `canvas-connection-target pointer-events-none absolute rounded-lg border-2 bg-transparent transition-colors ${
                connectionSourceId === node.id
                  ? 'border-blue-400 shadow-[0_0_0_3px_rgba(96,165,250,0.18)]'
                  : connectionTargetId === node.id
                    ? 'border-cyan-300 bg-cyan-300/10 shadow-[0_0_0_3px_rgba(103,232,249,0.16)]'
                    : 'border-transparent'
              }`,
              style: { left: node.position.x, top: node.position.y, width: node.size.width, height: node.size.height, zIndex: node.zIndex + 10_000 },
              'aria-hidden': true,
            }))
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
      {connecting && linkPointer && connectionSourceId && (() => {
        const source = canvasDocumentNodes.find((node) => node.id === connectionSourceId)
        if (!source) return null
        const viewport = reactFlowInstanceRef.current?.getViewport?.() ?? { x: 0, y: 0, zoom: 1 }
        const startFlow = nearestNodeAnchor(source, linkPointer)
        const start = {
          x: startFlow.x * viewport.zoom + viewport.x,
          y: startFlow.y * viewport.zoom + viewport.y,
        }
        const end = {
          x: linkPointer.x * viewport.zoom + viewport.x,
          y: linkPointer.y * viewport.zoom + viewport.y,
        }
        const bend = Math.max(40, Math.abs(end.x - start.x) * 0.35)
        const direction = end.x >= start.x ? 1 : -1
        const path = `M ${start.x} ${start.y} C ${start.x + direction * bend} ${start.y}, ${end.x - direction * bend} ${end.y}, ${end.x} ${end.y}`
        return (
          <svg className="pointer-events-none absolute inset-0 z-[45] size-full overflow-visible" aria-hidden="true">
            <path className="canvas-connection-preview" d={path} fill="none" stroke="#93c5fd" strokeWidth={3} strokeDasharray="8 5" strokeLinecap="round" />
            <circle className="canvas-connection-pointer" cx={end.x} cy={end.y} r={5} fill="#93c5fd" stroke="#eff6ff" strokeWidth={2} />
          </svg>
        )
      })()}
      {activeTool === 'link' && (
        <div
          className="canvas-connection-capture absolute inset-0 z-40 cursor-crosshair"
          role="button"
          tabIndex={0}
          aria-label="Canvas connection target picker"
          onPointerMove={(event) => {
            const point = toCanvasPoint(event, false)
            scheduleLinkPointer(point)
            const target = [...canvasDocumentNodes]
              .sort((a, b) => b.zIndex - a.zIndex)
              .find((node) => point.x >= node.position.x && point.x <= node.position.x + node.size.width && point.y >= node.position.y && point.y <= node.position.y + node.size.height)
            setConnectionTargetId(target?.id ?? null)
          }}
          onPointerLeave={() => setConnectionTargetId(null)}
          onClick={(event) => {
            const point = toCanvasPoint(event, false)
            const target = [...canvasDocumentNodes]
              .sort((a, b) => b.zIndex - a.zIndex)
              .find((node) => point.x >= node.position.x && point.x <= node.position.x + node.size.width && point.y >= node.position.y && point.y <= node.position.y + node.size.height)
            if (target) handleConnectionNodeClick(target.id)
            else cancelConnection()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') cancelConnection()
          }}
        />
      )}
    </div>
  )
}
