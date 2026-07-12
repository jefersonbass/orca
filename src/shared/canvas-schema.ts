import { z } from 'zod'
import type { CanvasDocument } from './canvas-types'

const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() })
const sizeSchema = z.object({
  width: z.number().finite().positive(),
  height: z.number().finite().positive()
})
const relationshipSchema = z.enum([
  'implements', 'modifies', 'generates', 'documents', 'reviews', 'depends-on',
  'blocks', 'uses', 'created-from', 'related-to', 'assigned-to', 'owned-by'
])
const resourceReferenceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('terminal-tab'), tabId: z.string(), worktreeId: z.string() }),
  z.object({ kind: z.literal('agent-pane'), tabId: z.string(), leafId: z.string().optional(), worktreeId: z.string(), paneKey: z.string().optional() }),
  z.object({ kind: z.literal('live-terminal'), paneKey: z.string(), sessionId: z.string().optional() }),
  z.object({ kind: z.literal('agent-terminal'), paneKey: z.string(), provider: z.string().optional(), sessionId: z.string().optional() }),
  z.object({ kind: z.literal('file'), worktreeId: z.string(), relativePath: z.string() }),
  z.object({ kind: z.literal('folder'), worktreeId: z.string(), relativePath: z.string() }),
  z.object({ kind: z.literal('diff'), worktreeId: z.string(), diffId: z.string() }),
  z.object({ kind: z.literal('pull-request'), source: z.enum(['github', 'gitlab']), id: z.string() }),
  z.object({ kind: z.literal('task'), source: z.enum(['orca', 'github', 'gitlab', 'linear', 'jira']), taskId: z.string() }),
  z.object({ kind: z.literal('browser-preview'), url: z.string(), title: z.string().optional() }),
  z.object({ kind: z.literal('browser-session'), sessionId: z.string(), workspaceId: z.string().optional() })
])

export const canvasDocumentSchema: z.ZodType<CanvasDocument> = z.object({
  version: z.literal(2),
  viewport: z.object({ x: z.number().finite(), y: z.number().finite(), zoom: z.number().finite().positive() }),
  nodes: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(['terminal-summary', 'agent-summary', 'missing-resource', 'note', 'sticky-note', 'group', 'label', 'rectangle', 'arrow', 'highlight', 'live-terminal', 'agent-terminal', 'file', 'folder', 'diff', 'pull-request', 'task', 'browser-preview', 'browser-session', 'orchestrator', 'drawing']),
    resourceRef: resourceReferenceSchema.optional(),
    position: pointSchema,
    size: sizeSchema,
    zIndex: z.number().finite(),
    label: z.string(),
    color: z.string().optional(),
    groupId: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })),
  edges: z.array(z.object({
    id: z.string().min(1), sourceNodeId: z.string().min(1), targetNodeId: z.string().min(1),
    type: z.union([z.literal('visual'), relationshipSchema]), label: z.string().optional(),
    color: z.string().optional(), relationship: relationshipSchema.optional(),
    createdBy: z.enum(['user', 'agent', 'system']).optional(), timestamp: z.string().optional(),
    worktreeId: z.string().optional(), comment: z.string().optional()
  }))
})
