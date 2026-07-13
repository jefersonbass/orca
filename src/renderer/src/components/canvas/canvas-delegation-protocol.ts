export type CanvasDelegationRequest = {
  targetAgentNodeId: string
  content: string
}

const DELEGATION_RE = /<orca-delegate\s+target=["']([^"']+)["']\s*>([\s\S]*?)<\/orca-delegate>/gi

/** Parse the small, provider-neutral envelope that lets one linked agent ask
 * the Canvas runtime to deliver work to another linked agent. */
export function parseCanvasDelegationRequests(content: string): CanvasDelegationRequest[] {
  const requests: CanvasDelegationRequest[] = []
  for (const match of content.matchAll(DELEGATION_RE)) {
    const targetAgentNodeId = match[1]?.trim()
    const delegatedContent = match[2]?.trim()
    if (targetAgentNodeId && delegatedContent) {
      requests.push({ targetAgentNodeId, content: delegatedContent })
    }
  }
  return requests
}
