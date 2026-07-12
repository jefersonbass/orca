/**
 * Portal registry for Strategy B — Stable Hidden Host + Portal.
 *
 * Maps terminal pane keys to Canvas node DOM elements where the terminal's
 * xterm surface is rendered via React portal. The PaneManager/xterm instance
 * lives in the hidden host (off-screen); the portal reflects its visual output
 * into the Canvas node.
 *
 * Key invariant: one PTY, one xterm instance, one terminal identity.
 * Multiple visual representations (workbench + canvas) are allowed via portals.
 * Multiple terminal instances are forbidden.
 */

// ── Portal target registry ──
// Maps paneKey → Canvas Node DOM element where terminal renders via portal.
const portalTargets = new Map<string, HTMLElement>()

// Maps paneKey → hidden host container element (for resize propagation).
const hiddenHosts = new Map<string, HTMLElement>()

// ── Hidden host element ──
let hiddenHostElement: HTMLElement | null = null

/**
 * Creates or returns the hidden host element. Called once when the Canvas page mounts.
 * The host is positioned off-screen and holds all PaneManager instances.
 */
export function ensureHiddenHost(): HTMLElement {
  if (!hiddenHostElement) {
    const host = document.createElement('div')
    host.id = 'canvas-terminal-hidden-host'
    host.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:800px;height:600px;opacity:0;pointer-events:none'
    document.body.appendChild(host)
    hiddenHostElement = host
  }
  return hiddenHostElement
}

/**
 * Removes the hidden host from the DOM. Called when the Canvas page unmounts
 * or the feature flag is disabled.
 */
export function removeHiddenHost(): void {
  if (hiddenHostElement) {
    hiddenHostElement.remove()
    hiddenHostElement = null
  }
}

/**
 * Returns the hidden host element, if it exists.
 */
export function getHiddenHost(): HTMLElement | null {
  return hiddenHostElement
}

// ── Portal target management ──

/**
 * Registers a Canvas node DOM element as the portal target for a given pane key.
 * The terminal's xterm content will be rendered into this element via React portal.
 */
export function registerPortalTarget(paneKey: string, target: HTMLElement): void {
  portalTargets.set(paneKey, target)
}

/**
 * Unregisters a Canvas node portal target. Called when the Canvas node unmounts.
 */
export function unregisterPortalTarget(paneKey: string): void {
  portalTargets.delete(paneKey)
}

/**
 * Returns the portal target DOM element for a pane key, or null if not registered.
 */
export function getPortalTarget(paneKey: string): HTMLElement | null {
  return portalTargets.get(paneKey) ?? null
}

/**
 * Returns true if the given pane key has an active Canvas portal target.
 * Used to suppress cold parking and to decide whether to portal terminal content.
 */
export function hasPortalTarget(paneKey: string): boolean {
  return portalTargets.has(paneKey)
}

/**
 * Returns all currently registered portal pane keys.
 */
export function getRegisteredPaneKeys(): string[] {
  return Array.from(portalTargets.keys())
}

// ── Hidden host container management ──

/**
 * Creates a hidden host container for a pane key. Each terminal node gets
 * its own container within the hidden host, used for resize calculations.
 */
export function ensureHiddenContainer(paneKey: string): HTMLElement {
  let container = hiddenHosts.get(paneKey)
  if (!container) {
    const host = ensureHiddenHost()
    container = document.createElement('div')
    container.id = `hidden-container-${paneKey}`
    container.style.cssText = 'width:100%;height:100%'
    host.appendChild(container)
    hiddenHosts.set(paneKey, container)
  }
  return container
}

/**
 * Removes a hidden host container for a pane key.
 */
export function removeHiddenContainer(paneKey: string): void {
  const container = hiddenHosts.get(paneKey)
  if (container) {
    container.remove()
    hiddenHosts.delete(paneKey)
  }
}

/**
 * Returns the hidden host container for a pane key, for resize propagation.
 */
export function getHiddenContainer(paneKey: string): HTMLElement | null {
  return hiddenHosts.get(paneKey) ?? null
}

/**
 * Updates hidden container dimensions to match the Canvas node size,
 * ensuring xterm.fit() calculates correctly.
 */
export function updateHiddenContainerSize(paneKey: string, width: number, height: number): void {
  const container = hiddenHosts.get(paneKey)
  if (container) {
    container.style.width = `${width}px`
    container.style.height = `${height}px`
  }
}

// ── Cleanup ──

/**
 * Clears all portal targets and hidden containers. Called on Canvas page unmount.
 */
export function clearPortalRegistry(): void {
  portalTargets.clear()
  for (const [, container] of hiddenHosts) {
    container.remove()
  }
  hiddenHosts.clear()
}
