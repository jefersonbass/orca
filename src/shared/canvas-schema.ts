import { z } from 'zod'
import type { CanvasDocument } from './canvas-types'
import type { CanvasWorkspaceOrchestration } from './canvas-agent-types'

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

const bindingBase = { id: z.string(), enabled: z.boolean(), createdAt: z.string() }
const operationalBindingSchema = z.discriminatedUnion('kind', [
  z.object({ ...bindingBase, kind: z.literal('context'), sourceNodeId: z.string(), targetAgentNodeId: z.string(), contextMode: z.enum(['full-content', 'selected-section', 'summary', 'reference-only']), lastContentHash: z.string().optional() }),
  z.object({ ...bindingBase, kind: z.literal('delegation'), sourceAgentNodeId: z.string(), targetAgentNodeId: z.string(), permission: z.enum(['propose-task', 'assign-task', 'request-review', 'request-fix']), requiresUserApproval: z.boolean() }),
  z.object({ ...bindingBase, kind: z.literal('output'), sourceAgentNodeId: z.string(), targetNoteNodeId: z.string(), outputMode: z.enum(['append-progress', 'append-decisions', 'append-errors', 'append-summary', 'replace-agent-owned-section']), approvalMode: z.enum(['always-review', 'auto-append-agent-section']) }),
  z.object({ ...bindingBase, kind: z.literal('reporting'), sourceAgentNodeId: z.string(), targetAgentNodeId: z.string(), reportMode: z.enum(['status', 'result', 'blocked', 'review-result']) })
])
const messageSchema = z.object({
  id: z.string(), fromAgentId: z.string().optional(), toAgentId: z.string(), taskId: z.string().optional(),
  type: z.enum(['instruction', 'delegation', 'review-request', 'fix-request', 'status', 'blocked', 'result', 'question']),
  content: z.string(), contextRefs: z.array(z.object({ nodeId: z.string(), resourceType: z.string(), snapshotHash: z.string().optional() })),
  createdAt: z.string(), deliveryState: z.enum(['draft', 'awaiting-approval', 'queued', 'delivering', 'delivered', 'acknowledged', 'failed', 'cancelled']),
  deliveryError: z.string().optional(), providerReceipt: z.string().optional(), deliveredAt: z.string().optional()
})
const taskSchema = z.object({
  id: z.string(), title: z.string(), description: z.string(), createdBy: z.enum(['user', 'lead-agent']), assignedAgentId: z.string().optional(),
  parentTaskId: z.string().optional(), worktreeId: z.string().optional(), contextBindingIds: z.array(z.string()), outputBindingIds: z.array(z.string()),
  state: z.enum(['draft', 'awaiting-approval', 'ready', 'assigned', 'running', 'waiting-for-input', 'blocked', 'completed', 'failed', 'cancelled', 'interrupted']),
  resultSummary: z.string().optional(), createdAt: z.string(), updatedAt: z.string()
})
const sessionSchema = z.object({
  id: z.string(), leadAgentNodeId: z.string(), subordinateAgentNodeIds: z.array(z.string()), tasks: z.array(taskSchema), messages: z.array(messageSchema),
  state: z.enum(['draft', 'awaiting-approval', 'active', 'paused', 'blocked', 'completed', 'failed', 'cancelled', 'interrupted']), createdAt: z.string(), updatedAt: z.string()
})

export const canvasWorkspaceOrchestrationSchema: z.ZodType<CanvasWorkspaceOrchestration> = z.object({
  bindings: z.array(operationalBindingSchema), messages: z.array(messageSchema), tasks: z.array(taskSchema), sessions: z.array(sessionSchema)
})
