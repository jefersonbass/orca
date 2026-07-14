import type { CSSProperties } from 'react'

export function normalizeCanvasTerminalZoom(zoom: number): number {
  return Number.isFinite(zoom) ? Math.min(5, Math.max(0.1, zoom)) : 1
}

export function canvasTerminalPortalStyle(zoom: number): CSSProperties {
  const safeZoom = normalizeCanvasTerminalZoom(zoom)
  return {
    width: `${safeZoom * 100}%`,
    height: `${safeZoom * 100}%`,
    transform: `scale(${1 / safeZoom})`,
    transformOrigin: 'top left'
  }
}
