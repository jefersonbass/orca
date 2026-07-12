# Canvas Security Architecture

**Date:** 2026-07-11
**Version:** 1.0
**Status:** Draft for review

---

## Table of Contents

1. [Security Principles](#1-security-principles)
2. [Threat Model](#2-threat-model)
3. [IPC Security](#3-ipc-security)
4. [Payload Validation](#4-payload-validation)
5. [Metadata Sanitization](#5-metadata-sanitization)
6. [Edge Type Permissions](#6-edge-type-permissions)
7. [Cross-Node Communication Safety](#7-cross-node-communication-safety)
8. [Preload Boundary](#8-preload-boundary)
9. [Audit Trail](#9-audit-trail)

---

## 1. Security Principles

Canvas Mode follows the same security architecture as the rest of Orca:

### Principles

1. **Least privilege**: The canvas renderer has no more Node.js access than the standard renderer
2. **Defense in depth**: Multiple validation layers (Zod, sanitizers, permission checks)
3. **Fail secure**: Invalid data defaults to safe values, not permissive ones
4. **Complete mediation**: Every IPC payload is validated at the main process boundary
5. **Separation of concerns**: Canvas store never contains executable code, credentials, or raw file paths
6. **Auditability**: All cross-node and automated operations are logged

### Security Boundaries (Milestone 1)

Milestone 1 introduces no Canvas-specific IPC channels and no new preload namespace. Canvas layout is persisted through Orca's existing `WorkspaceSessionState` persistence flow. Canvas schemas are validated as part of the existing session-state validation boundary. Canvas reads terminal, agent and worktree information from existing renderer stores. Canvas cannot write to PTYs, execute commands, start agents or control browsers.

```
Existing Orca runtime and stores
        ↓
Canvas selectors and summary-node components (read-only)
        ↓
Canvas Zustand slice for layout state
        ↓
Existing WorkspaceSessionState serialization
        ↓
Existing validated persistence flow (SQLite + Zod)
```

**No new renderer-to-main-process IPC channels are introduced by Milestone 1.**

---

## 2. Threat Model

### Assets to Protect

| Asset | Risk if Compromised | Protection |
|-------|-------------------|------------|
| Terminal sessions | Arbitrary code execution | No canvas IPC can write to PTY; existing preload PTY API only |
| Browser sessions | Data exfiltration, XSS | Existing webview sandbox + navigation guards |
| Agent sessions | Unauthorized agent control | No canvas IPC can inject into agent input |
| File system access | Data exfiltration | Existing filesystem IPC guards unchanged |
| Authentication tokens | Account compromise | Canvas mode never handles auth tokens |
| Canvas documents | Layout manipulation | Zod validation at read/write boundaries |

### Threat Vectors

| Threat Vector | Severity | Mitigation |
|---------------|----------|------------|
| Malicious node metadata with shell commands | **High** | Metadata validated as JSON-serializable; no execution paths |
| Edge type bypass (visual → automation) | **High** | Edge type validated and permission-checked on creation |
| Canvas document injection | **Medium** | Zod schema validation + sanitization on load |
| Arbitrary resource reference | **Medium** | Resource IDs validated against existing resources |
| Canvas store memory exhaustion | **Low** | Cap enforcement (500 nodes, 500 edges, 50 undo entries) |
| Undo/redo of destructive operations | **Medium** | Undo does NOT restore terminated processes |
| Cross-node terminal injection | **Critical** | No canvas IPC allows writing to another node's terminal |

---

## 3. Milestone 1 IPC Security

### No New IPC Channels

Milestone 1 introduces **zero new IPC channels**. Canvas Mode reuses Orca's existing IPC infrastructure:

| IPC Channel | Canvas Use | Already Exists In |
|-------------|-----------|-------------------|
| `settings:get` | Load canvas layout from WorkspaceSessionState | Yes — existing persistence |
| `settings:set` | Save canvas layout | Yes — existing persistence |

Canvas reads terminal, agent, browser, and worktree state from existing Zustand renderer store slices. All resource state is already available in the renderer through the existing preload bridge.

**No `canvas:*` IPC channels are created.**
**No `window.api.canvas.*` preload namespace is created.**
**No `src/main/ipc/canvas.ts` handler file is created.**

### Existing IPC Used by Canvas (Read-Only)

| IPC Channel | Canvas Use | Notes |
|-------------|-----------|-------|
| `settings:get` / `settings:set` | Canvas document persistence | Existing session persistence |
| `agent-status:update` | Agent status display (read from store) | Already in Zustand agent-status slice |
| `worktrees:statusChanged` | Worktree status (read from store) | Already in Zustand worktree slice |

Canvas does **not** call any PTY, browser, agent, or git IPC directly. All resource information is derived from existing Zustand slices that are already populated by those IPC channels.

### Future IPC Requirements

If future milestones require Canvas-specific IPC (e.g., saving canvas documents independently, loading resource status on demand), each new channel must:
1. Be registered in the existing `register-core-handlers.ts` pattern
2. Validate payloads with Zod schemas at the main process boundary
3. Authenticate the sender as the trusted renderer
4. Be documented in a security review

---

## 4. Payload Validation

### Zod Validation Layers

```
Render → IPC → Zod parse → Sanitize → Persist
                           │
                      If invalid → Reject with error

Load ← IPC ← Zod parse ← Sanitize ← SQLite
               │
          If invalid → Return default/empty document
```

### Validation Rules

```typescript
const canvasNodeSchema = z.object({
  id: z.string().uuid(),              // Must be valid UUID v4
  type: canvasNodeTypeSchema,         // Must be known type
  // resourceId is optional but must be string if present
  resourceId: z.string().max(500).optional(),
  position: z.object({
    x: z.number().finite(),           // No NaN, Infinity
    y: z.number().finite()
  }),
  size: z.object({
    width: z.number().finite().positive(),  // Must be > 0
    height: z.number().finite().positive()
  }),
  zIndex: z.number().int().finite(),
  minimized: z.boolean().default(false),
  locked: z.boolean().default(false),
  label: z.string().max(200).default(''),
  color: z.string().max(50).optional()
    // Not validated as CSS color — design tokens are free-form
    // but must not contain executable content
    .refine(c => !c?.includes('<') && !c?.includes('>'), {
      message: 'Color must not contain HTML/XML'
    }),
  groupId: z.string().uuid().optional(),
  metadata: canvasNodeMetadataSchema,
  createdAt: z.number(),
  updatedAt: z.number()
});
```

---

## 5. Metadata Sanitization

### Sanitization Rules

```typescript
/**
 * Sanitize all metadata in a canvas document.
 * Called at the main process boundary before persistence.
 */
export function sanitizeCanvasDocument(
  doc: CanvasDocument
): CanvasDocument {
  return {
    ...doc,
    nodes: doc.nodes.map(sanitizeCanvasNode),
    edges: doc.edges.map(sanitizeCanvasEdge)
  };
}

function sanitizeCanvasNode(node: CanvasNodeDocument): CanvasNodeDocument {
  return {
    ...node,
    metadata: sanitizeMetadata(node.metadata),
    // Reject dangerous fields
    resourceId: sanitizeResourceId(node.resourceId, node.type),
    color: sanitizeColorValue(node.color)
  };
}

function sanitizeMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Reject prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    // Reject functions
    if (typeof value === 'function') {
      continue;
    }

    // Validate string lengths
    if (typeof value === 'string') {
      if (value.length > 10240) {  // 10KB max per string
        continue;
      }
    }

    // Validate array lengths
    if (Array.isArray(value)) {
      if (value.length > 10000) {
        continue;
      }
    }

    result[key] = value;
  }

  return result;
}
```

### What Metadata Cannot Contain

- ❌ Shell commands or command fragments
- ❌ JavaScript functions or eval() strings
- ❌ Node.js require() paths
- ❌ File system paths (use resourceId + worktreeId instead)
- ❌ Authentication tokens or credentials
- ❌ `__proto__`, `constructor`, `prototype` keys
- ❌ HTML/XML tags in string values (sanitized)
- ❌ URLs that auto-execute (javascript:, data: with HTML content)

---

## 6. Edge Type Permissions

### Permission Matrix

| Edge Type | Phase | Requires Permission | Requires Audit |
|-----------|-------|-------------------|----------------|
| `visual` | 3 | No | No |
| `context` | 3 | No | No |
| `delegation` | 4+ | Yes — user must approve | Yes |
| `automation` | 5+ | Yes — user must approve + configure | Yes |
| `data-flow` | 5+ | Yes — resource-specific | Yes |

### Permission Flow (Phase 4+)

```typescript
async function createDelegationEdge(
  sourceNodeId: string,
  targetNodeId: string,
  taskDescription: string,
  allowedActions: string[]
): Promise<boolean> {
  // 1. Validate both nodes exist and are agent terminals
  const sourceNode = getNode(sourceNodeId);
  const targetNode = getNode(targetNodeId);
  if (!sourceNode || !targetNode || sourceNode.type !== 'agent-terminal') {
    return false;
  }

  // 2. Check recursion limits
  if (!checkRecursionLimit(sourceNodeId, targetNodeId)) {
    return false;
  }

  // 3. Check rate limits
  if (!checkRateLimit(sourceNodeId, targetNodeId)) {
    return false;
  }

  // 4. Request user permission
  const approved = await requestPermission({
    type: 'delegation',
    source: sourceNode.label,
    target: targetNode.label,
    description: taskDescription,
    allowedActions
  });

  if (!approved) {
    auditLog('delegation_rejected', { sourceNodeId, targetNodeId });
    return false;
  }

  // 5. Create edge
  auditLog('delegation_created', { sourceNodeId, targetNodeId, taskDescription });
  return true;
}
```

---

## 7. Cross-Node Communication Safety

### Safe Communication Pattern

```typescript
/**
 * Channel-based communication between nodes.
 * One node cannot directly write to another node's terminal.
 * Instead, communication goes through explicit, auditable channels.
 */
interface NodeCommunicationChannel {
  /** Unique channel ID */
  id: string;

  /** Source node */
  sourceNodeId: string;

  /** Target node */
  targetNodeId: string;

  /** Messages on this channel */
  messages: ChannelMessage[];

  /** Current status */
  status: 'active' | 'paused' | 'closed';

  /** Rate limit (messages per minute) */
  rateLimit: number;
}

interface ChannelMessage {
  id: string;
  timestamp: number;
  content: string;
  type: 'task' | 'result' | 'review' | 'notification';
  approved: boolean;
}

/**
 * Rules:
 * 1. Channels must be created by user action (not auto-created)
 * 2. Each message requires user approval (Phase 4)
 * 3. Channels cannot execute commands — only structured text
 * 4. Source and target must be different nodes
 * 5. Cycle detection prevents A→B→A chains
 * 6. Rate limits prevent message storms
 * 7. All messages are logged to audit trail
 */
```

### Prohibited Patterns

- ❌ Node A writes to Node B's PTY directly
- ❌ Node A sends shell commands to Node B
- ❌ Node A reads Node B's terminal output without permission
- ❌ Inter-agent communication without user visibility
- ❌ Recursive delegation loops (A→B→A→B→...)

---

## 8. Preload Boundary

### No New Privileges in Milestone 1

**Canvas Mode adds zero new `contextBridge.exposeInMainWorld()` entries in Milestone 1.**

The existing `window.api` object is unchanged. Canvas Mode accesses:
- **Existing session persistence** via `window.api.settings` (already exists)
- **Existing Zustand store state** via `useAppStore()` hooks (already in renderer)

No new preload API namespace is needed because:
1. Canvas layout is persisted as part of `WorkspaceSessionState` through the existing `settings:get/set` pair
2. Canvas reads terminal, agent, and worktree state from Zustand — all data is already available
3. Canvas never writes to PTYs, browsers, or agents — no new IPC needed

### Future Milestones

If future milestones require new preload APIs (e.g., dedicated canvas document CRUD), they must go through the existing security review process and follow the same patterns as every existing API namespace:
1. Method takes serializable arguments
2. Returns a Promise resolving to serializable result
3. Passes through `ipcRenderer.invoke`  
4. Main process handler validates and sanitizes with Zod

---

## 9. Audit Trail

### Events to Log

| Event | Phase | Data Logged |
|-------|-------|-------------|
| Canvas created | 1 | canvasId, creation time |
| Canvas deleted | 1 | canvasId |
| Node added | 2 | nodeId, type, canvasId |
| Node removed | 2 | nodeId, type, canvasId (NOT resource termination) |
| Resource terminated | 2 | nodeId, resourceType, canvasId |
| Edge created | 3 | edgeId, type, source, target |
| Edge deleted | 3 | edgeId, type |
| Delegation created | 4 | edgeId, taskDescription summary |
| Delegation executed | 4 | edgeId, timestamp, result |
| Automation triggered | 5 | edgeId, trigger, result |
| Permission denied | 4+ | action, reason |

### Log Storage

Audit logs are stored in the existing SQLite store, not in canvas documents. This prevents log tampering through canvas document manipulation.

```typescript
interface CanvasAuditEntry {
  timestamp: number;
  event: string;
  canvasId?: string;
  nodeId?: string;
  edgeId?: string;
  data: Record<string, unknown>;
  // 'visual' events are not logged (too noisy)
  severity: 'info' | 'warning' | 'error';
}
```

## Future Security Domains — Not Implemented in Milestone 1

### Milestone 1 Security Model

Milestone 1 uses only the following reduced schema:
- **Node types:** `terminal-summary`, `agent-summary`, `missing-resource`
- **Resource references:** Discriminated (`terminal-tab` | `agent-pane`)
- **Viewport:** `x`, `y`, `zoom`
- **Nodes:** position and size only

Milestone 1 explicitly does NOT include:
- `groupId` (reserved for M2)
- Edges or edge type enums (reserved for M2)
- Automation metadata or executable edge types
- Terminal commands via node metadata
- Note bindings or writer identities
- Any IPC related to cross-node communication

### Validation Flow

Canvas document validation in Milestone 1 flows through the **existing WorkspaceSessionState Zod schema** — the same boundary that validates all persisted session state. No new main-process validation boundary is created.

---

The following security considerations apply to future milestones. They are documented here for reference and must be addressed before the corresponding features are implemented.

### Agent-to-Note Writes (Milestone 5)

- **Service boundary**: Agent writes to notes must go through an explicit note service, not hidden shell commands
- **Validation**: All note content validated for path traversal, size limits, and content type
- **Access control**: Append-only by default; replace only agent-owned sections
- **Content protection**: User content marked with `<!-- user -->` boundaries; agents must not overwrite
- **Audit**: Every write recorded with agent identity, timestamp, and mode
- **Rate limits**: Max 10 writes per minute per agent

### Agent-to-Agent Handoffs (Milestone 5)

- **Structured messages**: Handoffs use typed task objects, not raw terminal text
- **Allowed actions**: Handoff edges define which actions the target agent may take
- **User visibility**: Handoff requests are visible in the UI; user must approve or reject
- **Cancellation**: User may cancel any pending handoff
- **No hidden injection**: No agent may write to another agent's terminal input

### Executable Edges (Milestone 8)

- **Permission model**: User must explicitly enable executable edges per edge or per Canvas
- **Cycle detection**: A→B→A chains are detected and rejected
- **Recursion limits**: Maximum delegation depth (default: 3)
- **Cost limits**: Maximum agent invocations per workflow (default: 20)
- **Timeouts**: Per-edge timeout (default: 5 minutes)
- **Approval nodes**: Workflow pauses at approval nodes until user confirms
- **Kill switch**: User can stop all running workflows
- **Audit trail**: Full execution history retained

### Orchestrator Node (Milestone 7)

- **Maximum agents**: Hard limit on concurrent agents per orchestrator (default: 5)
- **Maximum depth**: Hard limit on delegation chain depth (default: 3)
- **Provider permissions**: Orchestrator uses existing provider account permissions
- **Worktree permissions**: Orchestrator creates worktrees through existing worktree IPC
- **Filesystem boundaries**: Worktree paths validated for path traversal
- **Merge permissions**: PR merge requires explicit user approval unless configured otherwise
- **Destructive actions**: Worktree deletion, branch force-push, and note deletion require confirmation

### Notes (Milestone 2+)

- **Workspace-relative paths**: Note file paths are relative to workspace root
- **Path traversal protection**: Reject `..` and absolute paths in note file paths
- **Symlink handling**: Validate symlinks resolve within workspace boundary
- **Remote filesystem**: Use existing Orca remote file system abstractions
- **Conflict handling**: Append-only mode prevents write conflicts; agent sections are sequential
- **Authorship metadata**: User and agent edits are tagged with identity and timestamp
