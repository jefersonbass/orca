import type { BrowserPage } from '../../../../shared/types'
import type { CanvasNodeDocument } from '../../../../shared/canvas-types'

const DISPATCH_METADATA_KEYS = [
  'content',
  'text',
  'relativePath',
  'url',
  'taskId',
  'diffId',
  'id',
  'sessionId',
  'refreshRequestedAt',
] as const

function dispatchMetadata(node: CanvasNodeDocument): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of DISPATCH_METADATA_KEYS) {
    const value = node.metadata?.[key]
    if (value !== undefined) result[key] = value
  }
  return result
}

function browserPageForNode(
  node: CanvasNodeDocument,
  pagesByWorkspace: Record<string, BrowserPage[]>
): BrowserPage | undefined {
  const ref = node.resourceRef
  return Object.values(pagesByWorkspace).flat().find((page) =>
    (ref?.kind === 'browser-preview' && (page.id === ref.tabId || page.workspaceId === ref.tabId)) ||
    (ref?.kind === 'browser-session' && page.workspaceId === ref.workspaceId)
  )
}

function semanticNodeSnapshot(node: CanvasNodeDocument): Record<string, unknown> {
  return {
    id: node.id,
    type: node.type,
    label: node.label,
    metadata: dispatchMetadata(node),
    resourceRef: node.resourceRef ?? null,
  }
}

/**
 * Return only the state that can change the content delivered to an agent.
 * Spatial edits, selection, browser loading, history buttons and favicons are
 * intentionally excluded so UI churn cannot spend agent tokens.
 */
export function canvasContextSourceSignature(
  source: CanvasNodeDocument,
  allNodes: CanvasNodeDocument[],
  pagesByWorkspace: Record<string, BrowserPage[]>
): string {
  const browserPage = source.type === 'browser-preview' || source.type === 'browser-session'
    ? browserPageForNode(source, pagesByWorkspace)
    : undefined
  const children = source.type === 'group'
    ? allNodes
        .filter((node) => node.groupId === source.id)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(semanticNodeSnapshot)
    : undefined

  return JSON.stringify({
    source: semanticNodeSnapshot(source),
    children,
    browser: browserPage
      ? { id: browserPage.id, url: browserPage.url, title: browserPage.title }
      : null,
  })
}
