import { describe, expect, it } from 'vitest'
import type { BrowserPage } from '../../../../shared/types'
import type { CanvasNodeDocument } from '../../../../shared/canvas-types'
import { canvasContextSourceSignature } from './canvas-context-signature'

const note: CanvasNodeDocument = {
  id: 'note-1', type: 'note', label: 'Instruction', position: { x: 10, y: 20 },
  size: { width: 300, height: 200 }, zIndex: 1, metadata: { content: 'Run tests' },
}

const browserPage: BrowserPage = {
  id: 'page-1', workspaceId: 'browser-1', worktreeId: 'worktree-1', url: 'https://example.com',
  title: 'Example', loading: false, faviconUrl: null, canGoBack: false, canGoForward: false,
  loadError: null, createdAt: 1,
}

describe('canvasContextSourceSignature', () => {
  it('ignores spatial and visual-only changes', () => {
    const changed = { ...note, position: { x: 900, y: -300 }, size: { width: 800, height: 600 }, color: '#ef4444', zIndex: 99 }
    expect(canvasContextSourceSignature(changed, [changed], {})).toBe(canvasContextSourceSignature(note, [note], {}))
  })

  it('changes when authoritative note content changes', () => {
    const changed = { ...note, metadata: { content: 'Deploy now' } }
    expect(canvasContextSourceSignature(changed, [changed], {})).not.toBe(canvasContextSourceSignature(note, [note], {}))
  })

  it('ignores volatile browser state but observes navigation', () => {
    const browser: CanvasNodeDocument = {
      ...note, id: 'browser-node', type: 'browser-preview', label: 'Browser',
      resourceRef: { kind: 'browser-preview', tabId: 'page-1', worktreeId: 'worktree-1', url: 'https://example.com' },
    }
    const first = canvasContextSourceSignature(browser, [browser], { 'browser-1': [browserPage] })
    const loading = canvasContextSourceSignature(browser, [browser], { 'browser-1': [{ ...browserPage, loading: true, canGoBack: true, faviconUrl: 'data:image/png;base64,x' }] })
    const navigated = canvasContextSourceSignature(browser, [browser], { 'browser-1': [{ ...browserPage, url: 'https://example.com/next', title: 'Next' }] })
    expect(loading).toBe(first)
    expect(navigated).not.toBe(first)
  })

  it('treats an explicit refresh request as a semantic change', () => {
    const refreshed = { ...note, metadata: { ...note.metadata, refreshRequestedAt: '2026-07-13T20:00:00Z' } }
    expect(canvasContextSourceSignature(refreshed, [refreshed], {})).not.toBe(canvasContextSourceSignature(note, [note], {}))
  })
})
