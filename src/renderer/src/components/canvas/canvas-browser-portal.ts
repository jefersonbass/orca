import { useCallback, useSyncExternalStore } from 'react'

export type CanvasBrowserPortalTarget = {
  tabId: string
  worktreeId: string
  target: HTMLDivElement
}

let currentTargets: CanvasBrowserPortalTarget[] = []
const emptyTargets: CanvasBrowserPortalTarget[] = []
const subscribers = new Set<() => void>()

export function setCanvasBrowserPortalTargets(targets: CanvasBrowserPortalTarget[]): void {
  currentTargets = targets
  for (const subscriber of subscribers) subscriber()
}

function subscribe(onStoreChange: () => void): () => void {
  subscribers.add(onStoreChange)
  return () => subscribers.delete(onStoreChange)
}

export function useCanvasBrowserPortals(enabled: boolean): CanvasBrowserPortalTarget[] {
  const subscribeSnapshot = useCallback(
    (onStoreChange: () => void) => (enabled ? subscribe(onStoreChange) : () => {}),
    [enabled]
  )
  const getSnapshot = useCallback(() => (enabled ? currentTargets : emptyTargets), [enabled])
  return useSyncExternalStore(subscribeSnapshot, getSnapshot, getSnapshot)
}

export function getCanvasBrowserPortalTargets(): CanvasBrowserPortalTarget[] {
  return [...currentTargets]
}

export function findCanvasBrowserPortal(
  targets: CanvasBrowserPortalTarget[],
  tabId: string
): CanvasBrowserPortalTarget | null {
  return targets.find((target) => target.tabId === tabId) ?? null
}
