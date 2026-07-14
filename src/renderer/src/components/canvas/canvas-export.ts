import type { CanvasDocument, CanvasNodeDocument } from '../../../../shared/canvas-types'
import { toPng, toSvg } from 'html-to-image'

const SVG_NS = 'http://www.w3.org/2000/svg'
const PADDING = 40

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function textLines(text: string, x: number, y: number, color: string, size = 13, lineHeight = 18): string {
  return text.split(/\r?\n/).slice(0, 40).map((line, index) =>
    `<text x="${x}" y="${y + index * lineHeight}" fill="${color}" font-family="Inter,Segoe UI,sans-serif" font-size="${size}">${escapeXml(line)}</text>`
  ).join('')
}

function getBounds(document: CanvasDocument): { minX: number; minY: number; width: number; height: number } {
  if (document.nodes.length === 0) return { minX: 0, minY: 0, width: 640, height: 360 }
  const minX = Math.min(...document.nodes.map((node) => node.position.x))
  const minY = Math.min(...document.nodes.map((node) => node.position.y))
  const maxX = Math.max(...document.nodes.map((node) => node.position.x + node.size.width))
  const maxY = Math.max(...document.nodes.map((node) => node.position.y + node.size.height))
  return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
}

function nodeAnchor(node: CanvasNodeDocument, other: CanvasNodeDocument): { x: number; y: number } {
  const center = { x: node.position.x + node.size.width / 2, y: node.position.y + node.size.height / 2 }
  const otherCenter = { x: other.position.x + other.size.width / 2, y: other.position.y + other.size.height / 2 }
  const horizontal = Math.abs(otherCenter.x - center.x) > Math.abs(otherCenter.y - center.y)
  if (horizontal) return { x: node.position.x + (otherCenter.x >= center.x ? node.size.width : 0), y: center.y }
  return { x: center.x, y: node.position.y + (otherCenter.y >= center.y ? node.size.height : 0) }
}

function renderNode(node: CanvasNodeDocument, offsetX: number, offsetY: number): string {
  const x = node.position.x - offsetX
  const y = node.position.y - offsetY
  const { width, height } = node.size
  const metadata = node.metadata ?? {}
  const label = escapeXml(node.label)
  const color = node.color ?? '#60a5fa'
  const content = String(metadata.content ?? '')
  const textColor = node.type === 'note' || node.type === 'sticky-note' ? '#422006' : '#e5e7eb'

  if (node.type === 'label') return textLines(node.label, x + 8, y + Math.max(18, height / 2), color, Number(metadata.fontSize ?? 14), 18)
  if (node.type === 'group') return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="#a855f708" stroke="${color}" stroke-width="2" stroke-dasharray="8 5"/><rect x="${x}" y="${y}" width="${Math.min(width, 180)}" height="26" rx="10" fill="${color}"/><text x="${x + 12}" y="${y + 18}" fill="#fff" font-family="Inter,Segoe UI,sans-serif" font-size="12" font-weight="600">${label}</text>`
  if (node.type === 'highlight') return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="${color}20" stroke="${color}" stroke-width="2"/><text x="${x + 12}" y="${y + 24}" fill="${color}" font-family="Inter,Segoe UI,sans-serif" font-size="13">${label}</text>`
  if (node.type === 'rectangle') return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="${color}12" stroke="${color}" stroke-width="2"/><text x="${x + 12}" y="${y + 24}" fill="${textColor}" font-family="Inter,Segoe UI,sans-serif" font-size="13">${label}</text>`
  if (node.type === 'drawing') {
    const drawingType = String(metadata.drawingType ?? 'ellipse')
    const stroke = escapeXml(String(metadata.strokeColor ?? color))
    const fill = escapeXml(String(metadata.fillColor ?? 'none'))
    if (drawingType === 'ellipse') return `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${Math.max(1, width / 2 - 4)}" ry="${Math.max(1, height / 2 - 4)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
    const points = Array.isArray(metadata.points) ? metadata.points.map((point) => `${x + (Number((point as { x?: number }).x ?? 0) / 100) * width},${y + (Number((point as { y?: number }).y ?? 0) / 100) * height}`).join(' ') : `${x},${y} ${x + width},${y + height}`
    return drawingType === 'freehand'
      ? `<polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
  }

  const fill = node.type === 'note' ? '#fef3c7' : node.type === 'sticky-note' ? '#fef08a' : '#111827'
  const header = node.type === 'note' ? '#fcd34d' : node.type === 'sticky-note' ? '#ca8a04' : '#1f2937'
  const body = content || (node.type === 'live-terminal' || node.type === 'agent-terminal' ? '>_ Ready' : label)
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="${fill}" stroke="${color}" stroke-width="2"/><rect x="${x}" y="${y}" width="${width}" height="28" rx="8" fill="${header}"/><text x="${x + 10}" y="${y + 19}" fill="${node.type === 'note' || node.type === 'sticky-note' ? '#422006' : '#f9fafb'}" font-family="Inter,Segoe UI,sans-serif" font-size="12" font-weight="600">${label}</text>${textLines(body, x + 12, y + 52, textColor, 13, 18)}`
}

export function renderCanvasSvg(document: CanvasDocument, includeGrid = true): { svg: string; width: number; height: number } {
  const bounds = getBounds(document)
  const width = Math.ceil(bounds.width + PADDING * 2)
  const height = Math.ceil(bounds.height + PADDING * 2)
  const offsetX = bounds.minX - PADDING
  const offsetY = bounds.minY - PADDING
  const nodeById = new Map(document.nodes.map((node) => [node.id, node]))
  const grid = includeGrid ? `<defs><pattern id="canvas-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#64748b" stroke-opacity="0.18" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#canvas-grid)"/>` : ''
  const edges = document.edges.map((edge) => {
    const source = nodeById.get(edge.sourceNodeId)
    const target = nodeById.get(edge.targetNodeId)
    if (!source || !target) return ''
    const start = nodeAnchor(source, target)
    const end = nodeAnchor(target, source)
    const sx = start.x - offsetX
    const sy = start.y - offsetY
    const ex = end.x - offsetX
    const ey = end.y - offsetY
    const bend = Math.max(60, Math.abs(ex - sx) * 0.35, Math.abs(ey - sy) * 0.35)
    const horizontal = Math.abs(ex - sx) > Math.abs(ey - sy)
    const path = horizontal ? `M ${sx} ${sy} C ${sx + (ex > sx ? bend : -bend)} ${sy}, ${ex - (ex > sx ? bend : -bend)} ${ey}, ${ex} ${ey}` : `M ${sx} ${sy} C ${sx} ${sy + (ey > sy ? bend : -bend)}, ${ex} ${ey - (ey > sy ? bend : -bend)}, ${ex} ${ey}`
    return `<path d="${path}" fill="none" stroke="${escapeXml(edge.color ?? '#60a5fa')}" stroke-width="3" stroke-linecap="round"/>`
  }).join('')
  const nodes = [...document.nodes].sort((a, b) => a.zIndex - b.zIndex).map((node) => renderNode(node, offsetX, offsetY)).join('')
  const svg = `<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${grid}<rect width="100%" height="100%" fill="#0f172a" fill-opacity="0.96"/>${includeGrid ? '<rect width="100%" height="100%" fill="url(#canvas-grid)"/>' : ''}${edges}${nodes}</svg>`
  return { svg, width, height }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = filename
  anchor.click()
}

async function captureRenderedCanvas(doc: CanvasDocument, format: 'png' | 'svg'): Promise<string | null> {
  const viewport = document.querySelector<HTMLElement>('.canvas-flow .react-flow__viewport')
  if (!viewport || doc.nodes.length === 0) return null
  const bounds = getBounds(doc)
  const width = Math.ceil(bounds.width + PADDING * 2)
  const height = Math.ceil(bounds.height + PADDING * 2)
  const pixelRatio = format === 'png'
    ? Math.max(1, Math.min(2, Math.sqrt(16_000_000 / Math.max(1, width * height))))
    : 1
  const options = {
    width,
    height,
    pixelRatio,
    backgroundColor: '#0f172a',
    cacheBust: true,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${PADDING - bounds.minX}px, ${PADDING - bounds.minY}px)`,
      transformOrigin: '0 0',
    },
  }
  return format === 'png' ? toPng(viewport, options) : toSvg(viewport, options)
}

export async function exportCanvasSvg(doc: CanvasDocument): Promise<void> {
  try {
    const rendered = await captureRenderedCanvas(doc, 'svg')
    if (rendered) {
      downloadDataUrl(rendered, 'orca-canvas.svg')
      return
    }
  } catch {
    // Fall back to the deterministic document renderer when a live web surface
    // contains a cross-origin asset that cannot be serialized.
  }
  const { svg } = renderCanvasSvg(doc)
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), 'orca-canvas.svg')
}

export async function exportCanvasPng(doc: CanvasDocument): Promise<void> {
  try {
    const rendered = await captureRenderedCanvas(doc, 'png')
    if (rendered) {
      downloadDataUrl(rendered, 'orca-canvas.png')
      return
    }
  } catch {
    // Keep a useful export available even if a browser page blocks capture.
  }
  const { svg, width, height } = renderCanvasSvg(doc)
  const image = new Image()
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  image.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = width * 2
    canvas.height = height * 2
    const context = canvas.getContext('2d')
    if (!context) return
    context.scale(2, 2)
    context.fillStyle = '#0f172a'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'orca-canvas.png')
      URL.revokeObjectURL(svgUrl)
    }, 'image/png')
  }
  image.onerror = () => URL.revokeObjectURL(svgUrl)
  image.src = svgUrl
}
