import React, { useCallback, useEffect, useRef } from 'react'
import { useNodeId, useReactFlow } from '@xyflow/react'
import { useAppStore } from '@/store'

type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

const HANDLE_LAYOUT: ReadonlyArray<{
  direction: ResizeDirection
  className: string
  cursor: string
}> = [
  { direction: 'nw', className: '-left-1 -top-1', cursor: 'nwse-resize' },
  { direction: 'n', className: 'left-1/2 -top-1 -translate-x-1/2', cursor: 'ns-resize' },
  { direction: 'ne', className: '-right-1 -top-1', cursor: 'nesw-resize' },
  { direction: 'e', className: '-right-1 top-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  { direction: 'se', className: '-bottom-1 -right-1', cursor: 'nwse-resize' },
  { direction: 's', className: '-bottom-1 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
  { direction: 'sw', className: '-bottom-1 -left-1', cursor: 'nesw-resize' },
  { direction: 'w', className: '-left-1 top-1/2 -translate-y-1/2', cursor: 'ew-resize' },
]

type Geometry = {
  position: { x: number; y: number }
  size: { width: number; height: number }
}

export const CanvasNodeResizer: React.FC<{ visible?: boolean; minWidth?: number; minHeight?: number }> = ({
  visible = false,
  minWidth = 120,
  minHeight = 64,
}) => {
  const nodeId = useNodeId()
  const reactFlow = useReactFlow()
  const cleanupRef = useRef<(() => void) | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const latestGeometryRef = useRef<Geometry | null>(null)

  useEffect(() => () => {
    cleanupRef.current?.()
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
  }, [])

  const beginResize = useCallback((event: React.PointerEvent<HTMLButtonElement>, direction: ResizeDirection) => {
    if (!nodeId || event.button !== 0) return
    const canvasDocument = useAppStore.getState().canvasDocument
    const documentNode = canvasDocument?.nodes.find((node) => node.id === nodeId)
    if (!canvasDocument || !documentNode) return

    event.preventDefault()
    event.stopPropagation()
    const start = {
      clientX: event.clientX,
      clientY: event.clientY,
      position: { ...documentNode.position },
      size: { ...documentNode.size },
      zoom: Math.max(reactFlow.getViewport().zoom, 0.01),
    }
    latestGeometryRef.current = { position: start.position, size: start.size }
    const previousCursor = document.body.style.cursor
    document.body.style.cursor = getComputedStyle(event.currentTarget).cursor

    const applyGeometry = (geometry: Geometry) => {
      reactFlow.setNodes((nodes) => nodes.map((node) => node.id === nodeId
        ? { ...node, position: geometry.position, width: geometry.size.width, height: geometry.size.height }
        : node))
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - start.clientX) / start.zoom
      const dy = (moveEvent.clientY - start.clientY) / start.zoom
      const west = direction.includes('w')
      const east = direction.includes('e')
      const north = direction.includes('n')
      const south = direction.includes('s')
      const width = west || east
        ? Math.max(minWidth, start.size.width + (east ? dx : -dx))
        : start.size.width
      const height = north || south
        ? Math.max(minHeight, start.size.height + (south ? dy : -dy))
        : start.size.height
      const geometry = {
        position: {
          x: west ? start.position.x + start.size.width - width : start.position.x,
          y: north ? start.position.y + start.size.height - height : start.position.y,
        },
        size: { width, height },
      }
      latestGeometryRef.current = geometry
      if (animationFrameRef.current !== null) return
      animationFrameRef.current = requestAnimationFrame(() => {
        animationFrameRef.current = null
        if (latestGeometryRef.current) applyGeometry(latestGeometryRef.current)
      })
    }

    const finish = () => {
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerup', finish, true)
      window.removeEventListener('pointercancel', finish, true)
      document.body.style.cursor = previousCursor
      cleanupRef.current = null
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      const geometry = latestGeometryRef.current
      if (!geometry) return
      applyGeometry(geometry)
      const currentDocument = useAppStore.getState().canvasDocument
      if (!currentDocument) return
      useAppStore.getState().setCanvasDocument({
        ...currentDocument,
        nodes: currentDocument.nodes.map((node) => node.id === nodeId
          ? { ...node, position: geometry.position, size: geometry.size }
          : node),
      })
    }

    cleanupRef.current?.()
    cleanupRef.current = finish
    window.addEventListener('pointermove', onPointerMove, true)
    window.addEventListener('pointerup', finish, true)
    window.addEventListener('pointercancel', finish, true)
  }, [minHeight, minWidth, nodeId, reactFlow])

  if (!visible) return null

  return (
    <div className="canvas-node-resize-line pointer-events-none absolute inset-0 z-30 rounded-[inherit] border border-blue-400">
      {HANDLE_LAYOUT.map(({ direction, className, cursor }) => (
        <button
          key={direction}
          type="button"
          className={`canvas-node-resize-handle nodrag nopan pointer-events-auto absolute size-2 rounded-sm border border-white bg-blue-400 ${className}`}
          style={{ cursor }}
          aria-label={`Resize ${direction}`}
          onPointerDown={(event) => beginResize(event, direction)}
        />
      ))}
    </div>
  )
}
