import type { CSSProperties } from 'react'

export function canvasTerminalPortalStyle(zoom: number): CSSProperties {
  const safeZoom = Number.isFinite(zoom) ? Math.min(5, Math.max(0.1, zoom)) : 1
  return {
    width: `${safeZoom * 100}%`,
    height: `${safeZoom * 100}%`,
    transform: `scale(${1 / safeZoom})`,
    transformOrigin: 'top left',
  }
}
