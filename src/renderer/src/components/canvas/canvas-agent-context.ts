import type { CanvasOperationalBinding } from '../../../../shared/canvas-agent-types'
import type { CanvasDocument, CanvasNodeDocument } from '../../../../shared/canvas-types'

export type CanvasAgentContext = {
  nodeId: string
  note: string
  agents: string
  links: string
  serialized: string
}

export function canvasNodeContextText(node: CanvasNodeDocument): string {
  const content = node.metadata?.content
  if (typeof content === 'string' && content.trim()) return content.trim()
  const text = node.metadata?.text
  if (typeof text === 'string' && text.trim()) return text.trim()
  return node.label
}

function tabIdForNode(node: CanvasNodeDocument): string | null {
  const ref = node.resourceRef
  if (ref?.kind === 'terminal-tab' || ref?.kind === 'agent-pane') return ref.tabId
  if (ref?.kind === 'live-terminal' || ref?.kind === 'agent-terminal') return ref.paneKey.split(':')[0] ?? null
  return null
}

function isAgentNode(node: CanvasNodeDocument): boolean {
  return node.type === 'agent-terminal' ||
    (node.type === 'live-terminal' && typeof node.metadata?.agent === 'string' && node.metadata.agent.trim().length > 0)
}

export function buildCanvasAgentContext(
  document: CanvasDocument,
  bindings: readonly CanvasOperationalBinding[],
  agentNodeId: string
): CanvasAgentContext | null {
  const agent = document.nodes.find((node) => node.id === agentNodeId)
  if (!agent || !isAgentNode(agent)) return null

  const activeBindings = bindings.filter((binding) => binding.enabled)
  const noteEntries = activeBindings.flatMap((binding) => {
    if (binding.kind !== 'context' || binding.targetAgentNodeId !== agentNodeId) return []
    const source = document.nodes.find((node) => node.id === binding.sourceNodeId)
    return [`${source?.label ?? binding.sourceNodeId} (${binding.sourceNodeId}): ${source ? canvasNodeContextText(source) : 'missing canvas node'}`]
  })
  const agentEntries = activeBindings.flatMap((binding) => {
    if (binding.kind !== 'delegation' && binding.kind !== 'reporting') return []
    const peerNodeId = binding.sourceAgentNodeId === agentNodeId
      ? binding.targetAgentNodeId
      : binding.targetAgentNodeId === agentNodeId
        ? binding.sourceAgentNodeId
        : null
    if (!peerNodeId) return []
    const peer = document.nodes.find((node) => node.id === peerNodeId)
    return [`${peer?.label ?? peerNodeId} (${peerNodeId})`]
  })
  const links = activeBindings.flatMap((binding) => {
    if (binding.kind === 'context' && binding.targetAgentNodeId === agentNodeId) {
      return [`${binding.sourceNodeId} -> ${agentNodeId}`]
    }
    if ((binding.kind === 'delegation' || binding.kind === 'reporting') &&
      (binding.sourceAgentNodeId === agentNodeId || binding.targetAgentNodeId === agentNodeId)) {
      return [`${binding.sourceAgentNodeId} -> ${binding.targetAgentNodeId}`]
    }
    return []
  })

  const context: CanvasAgentContext = {
    nodeId: agentNodeId,
    note: noteEntries.join('\n'),
    agents: [...new Set(agentEntries)].join(', '),
    links: links.join('; '),
    serialized: JSON.stringify({ nodeId: agentNodeId, notes: noteEntries, agents: [...new Set(agentEntries)], links })
  }
  return context
}

export function findCanvasAgentContextForTab(
  documentsByWorkspace: Record<string, CanvasDocument>,
  orchestrationsByWorkspace: Record<string, { bindings: readonly CanvasOperationalBinding[] }>,
  tabId: string
): CanvasAgentContext | null {
  for (const [workspaceKey, document] of Object.entries(documentsByWorkspace)) {
    const agent = document.nodes.find((node) => isAgentNode(node) && tabIdForNode(node) === tabId)
    if (!agent) continue
    const orchestration = orchestrationsByWorkspace[workspaceKey]
    return buildCanvasAgentContext(document, orchestration?.bindings ?? [], agent.id)
  }
  return null
}

export function canvasAgentContextEnv(context: CanvasAgentContext | null): Record<string, string> {
  if (!context) return {}
  return {
    ORCA_CANVAS_NODE_ID: context.nodeId,
    ORCA_NOTE: context.note,
    ORCA_AGENTS: context.agents,
    ORCA_LINKS: context.links,
    ORCA_CANVAS_CONTEXT: context.serialized
  }
}
