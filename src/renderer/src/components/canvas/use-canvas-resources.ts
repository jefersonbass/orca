import { useMemo } from 'react'
import { useAppStore } from '@/store'
import type { CanvasNodeDocument } from '../../../../shared/canvas-types'

export interface ResolvedCanvasNode {
  node: CanvasNodeDocument
  runtime: {
    status: 'idle' | 'working' | 'blocked' | 'waiting' | 'done' | 'disconnected' | 'missing'
    label: string
    worktreeName?: string
    provider?: string
  }
}

export function useCanvasResources(
  canvasNodes: CanvasNodeDocument[]
): ResolvedCanvasNode[] {
  const agentStatusByPaneKey = useAppStore((s) => (s as any).agentStatusByPaneKey)

  return useMemo(() => {
    return canvasNodes.map((node) => {
      const ref = node.resourceRef
      if (!ref) {
        return {
          node,
          runtime: { status: 'missing' as const, label: node.label },
        }
      }

      if (ref.kind === 'agent-pane') {
        const paneKey = ref.leafId ? `${ref.tabId}:${ref.leafId}` : ref.tabId
        const agentStatus = agentStatusByPaneKey?.[paneKey]
        if (agentStatus) {
          return {
            node,
            runtime: {
              status: (agentStatus as any).state ?? 'idle',
              label: (agentStatus as any).label ?? node.label,
              worktreeName: ref.worktreeId,
              provider: (agentStatus as any).provider,
            },
          }
        }
      }

      if (ref.kind === 'terminal-tab') {
        return {
          node,
          runtime: {
            status: 'idle' as const,
            label: node.label,
            worktreeName: ref.worktreeId,
          },
        }
      }

      return {
        node,
        runtime: { status: 'missing' as const, label: node.label },
      }
    })
  }, [canvasNodes, agentStatusByPaneKey])
}
