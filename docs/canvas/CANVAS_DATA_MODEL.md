# Canvas Data Model

**Date:** 2026-07-11
**Version:** 1.0
**Schema Version:** 1

---

## Table of Contents

1. [Complete Type Definitions](#1-complete-type-definitions)
2. [Zod Validation Schemas](#2-zod-validation-schemas)
3. [Schema Versioning and Migrations](#3-schema-versioning-and-migrations)
4. [State Separation Model](#4-state-separation-model)
5. [Resource Reference Model](#5-resource-reference-model)

---

## 1. Complete Type Definitions

### 1.1 Node Types (Milestone 1)

```typescript
// src/shared/canvas-types.ts

/**
 * Milestone 1 canvas node types.
 * Only lightweight summary nodes — no live terminals, browsers, or editors.
 */
export type CanvasNodeType =
  | 'terminal-summary'
  | 'agent-summary'
  | 'missing-resource';
```

### 1.2 Resource Reference (Milestone 1)

```typescript
/**
 * Discriminated resource reference.
 * Each kind requires different identity fields.
 * No generic `resourceId?: string` — resource types have distinct identity structures.
 */
export type CanvasResourceReference =
  | {
      kind: 'terminal-tab';
      tabId: string;
      worktreeId: string;
    }
  | {
      kind: 'agent-pane';
      tabId: string;
      leafId?: string;
      worktreeId: string;
    };
```

### 1.3 Node Document (Persisted, Milestone 1)

```typescript
/**
 * Persisted state for a single canvas summary node.
 * Contains spatial positioning and resource references only.
 */
export interface CanvasNodeDocument {
  /** UUID v4 */
  id: string;

  /** Node type determines rendering component */
  type: CanvasNodeType;

  /** Durable resource reference (discriminated by kind) */
  resourceRef: CanvasResourceReference;

  /** Position in canvas coordinate space */
  position: { x: number; y: number };

  /** Display size in canvas coordinate space */
  size: { width: number; height: number };

  /** Stacking order (higher = on top) */
  zIndex: number;

  /** User-visible label */
  label: string;
}
```

### 1.4 Canvas Document (Persisted, Milestone 1)

```typescript
/**
 * Milestone 1 canvas document.
 * Contains only nodes and viewport — no edges in Milestone 1.
 * Optional field in WorkspaceSessionState — at most one per workspace.
 */
export interface CanvasDocument {
  /** Schema version for migration support */
  version: 1;

  /** Current viewport state */
  viewport: {
    x: number;
    y: number;
    zoom: number;  // 0.1 to 5.0, default 1.0
  };

  /** All summary nodes in the document */
  nodes: CanvasNodeDocument[];
}
```

### 1.5 WorkspaceSessionState Extension

```typescript
// Extension to existing WorkspaceSessionState (Milestone 1):
interface WorkspaceSessionState {
  // ... existing fields ...
  /** Optional canvas layout. At most 1 per workspace. */
  canvasDocument?: CanvasDocument;
}
```

---

## Future Schema Extensions — Not Implemented in Milestone 1

The following types are reserved for future milestones. They must not be built during Milestone 1 implementation.

```typescript
// ── Future node types (Phase 2+) ──
export type FutureCanvasNodeType =
  | 'shell-terminal'      // Live terminal node (Phase 2)
  | 'browser'             // Interactive webview node (Phase 2+)
  | 'file'                // File editor node (Phase 2+)
  | 'note'                // Markdown note node (Phase 2+)
  | 'diff'                // Diff/PR node (Phase 3)
  | 'task'                // Task reference node (Phase 3)
  | 'group'               // Frame/group container (Phase 3)
  | 'orchestrator';       // Workflow controller (Phase 4+)

// ── Future edge types (Phase 3+) ──
export type CanvasEdgeType =
  | 'visual'
  | 'context'
  | 'delegation'
  | 'automation'
  | 'data-flow';

export interface CanvasEdgeDocument {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: CanvasEdgeType;
  label?: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
}

// ── Future full canvas document ──
export interface FutureCanvasDocument {
  // Not implemented in Milestone 1
  id: string;
  projectId: string;
  name: string;
  version: number;
  viewport: { x: number; y: number; zoom: number };
  nodes: CanvasNodeDocument[];
  edges: CanvasEdgeDocument[];
  createdAt: number;
  updatedAt: number;
}
```
```

### 1.5 Runtime State (Ephemeral)

```typescript
/**
 * Runtime status of a resource node.
 * Derived from existing Orca store slices, never persisted directly.
 */
export type CanvasNodeRuntimeStatus =
  | 'loading'
  | 'ready'
  | 'error'
  | 'missing'       // Resource no longer exists
  | 'disconnected'; // SSH connection lost

/**
 * Runtime state for a canvas node.
 * Added to canvas node during rendering, not persisted.
 */
export interface CanvasNodeRuntime {
  /** Current resource status */
  status: CanvasNodeRuntimeStatus;

  /** Human-readable status message */
  statusMessage?: string;
}
```

### 1.6 Selection and Interaction State (Ephemeral)

```typescript
/**
 * Current user selection on the canvas.
 * Managed in React Flow state, mirrored to canvas slice for undo/redo.
 */
export interface CanvasSelection {
  /** Selected node IDs */
  nodeIds: Set<string>;

  /** Selected edge IDs */
  edgeIds: Set<string>;
}

/**
 * Active user interaction.
 * Used to prevent conflicting interactions.
 */
export interface CanvasInteraction {
  /** Currently dragging a node */
  dragging: {
    nodeId: string;
    /** Offset from pointer to node origin */
    offset: { x: number; y: number };
  } | null;

  /** Currently resizing a node */
  resizing: {
    nodeId: string;
    /** Which edge/handle is being dragged */
    handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
  } | null;

  /** Currently drawing a connection */
  connecting: {
    /** Source node ID */
    sourceNodeId: string;
    /** Edge type being created */
    edgeType: CanvasEdgeType;
  } | null;

  /** Currently panning the canvas */
  panning: boolean;
}

/**
 * Clipboard content for copy/paste within canvas.
 */
export interface CanvasClipboard {
  /** Copied nodes */
  nodes: CanvasNodeDocument[];

  /** Copied edges (only those whose source AND target are in nodes) */
  edges: CanvasEdgeDocument[];

  /** Copy or cut operation */
  operation: 'copy' | 'cut';
}
```

### 1.7 Undo/Redo (Ephemeral)

```typescript
/**
 * Individual undoable action.
 * Only canvas-specific actions are tracked.
 * Undo does NOT restore terminated resources.
 */
export type CanvasUndoEntry =
  | { type: 'move-node'; nodeId: string; from: Position; to: Position }
  | { type: 'resize-node'; nodeId: string; from: Size; to: Size; }
  | { type: 'add-node'; node: CanvasNodeDocument }
  | { type: 'remove-node'; node: CanvasNodeDocument; edges: CanvasEdgeDocument[] }
  | { type: 'add-edge'; edge: CanvasEdgeDocument }
  | { type: 'remove-edge'; edge: CanvasEdgeDocument }
  | { type: 'change-z-index'; nodeId: string; from: number; to: number }
  | { type: 'change-label'; nodeId: string; from: string; to: string }
  | { type: 'group-nodes'; groupId: string; childIds: string[] }
  | { type: 'ungroup-nodes'; groupId: string; childIds: string[] };

/**
 * Undo/redo stack with capacity limit.
 */
export interface CanvasUndoStack {
  /** Past entries (oldest first, max 50) */
  past: CanvasUndoEntry[];

  /** Future entries for redo (cleared on new action) */
  future: CanvasUndoEntry[];

  /** Maximum entries before oldest is evicted */
  maxSize: number;
}
```

### 1.8 Settings

```typescript
/**
 * Canvas-specific settings.
 * Stored in Orca's GlobalSettings, not in canvas document.
 */
export interface CanvasSettings {
  /** Whether to show background grid */
  gridVisible: boolean;

  /** Grid spacing in canvas pixels */
  gridSize: number;

  /** Whether snap-to-grid is enabled */
  snapToGrid: boolean;

  /** Whether minimap is visible */
  minimapVisible: boolean;

  /** Default zoom level for new canvas */
  defaultZoom: number;

  /** Whether to show edge labels */
  edgeLabelsVisible: boolean;

  /** Whether to auto-layout new nodes */
  autoLayoutNewNodes: boolean;

  /** Background grid color (design token reference) */
  gridColor: string;
}

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  gridVisible: true,
  gridSize: 20,
  snapToGrid: true,
  minimapVisible: true,
  defaultZoom: 1,
  edgeLabelsVisible: true,
  autoLayoutNewNodes: false,
  gridColor: 'var(--border)'
};
```

---

## 2. Zod Validation Schemas

```typescript
// src/shared/workspace-session-schema.ts (extension)

import { z } from 'zod';

// ── Position / Size ──

const positionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite()
});

const sizeSchema = z.object({
  width: z.number().finite().positive(),
  height: z.number().finite().positive()
});

// ── Node Type ──

const canvasNodeTypeSchema = z.enum([
  'agent-terminal',
  'shell-terminal',
  'browser',
  'file',
  'note',
  'diff',
  'task',
  'group',
  'orchestrator'
]);

// ── Metadata ──

const canvasNodeMetadataSchema: z.ZodType<Record<string, unknown>> = z
  .record(z.unknown())
  .refine(
    (val) => {
      try {
        JSON.parse(JSON.stringify(val));
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Metadata must be JSON-serializable' }
  )
  .default({});

// ── Node Document ──

const canvasNodeSchema = z.object({
  id: z.string().uuid(),
  type: canvasNodeTypeSchema,
  resourceId: z.string().optional(),
  worktreeId: z.string().optional(),
  position: positionSchema,
  size: sizeSchema,
  zIndex: z.number().int().finite(),
  minimized: z.boolean().default(false),
  locked: z.boolean().default(false),
  label: z.string().max(200).default(''),
  color: z.string().max(50).optional(),
  groupId: z.string().uuid().optional(),
  metadata: canvasNodeMetadataSchema,
  createdAt: z.number(),
  updatedAt: z.number()
});

// ── Edge Type ──

const canvasEdgeTypeSchema = z.enum([
  'visual',
  'context',
  'delegation',
  'automation',
  'data-flow'
]);

// ── Edge Document ──

const canvasEdgeSchema = z.object({
  id: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  type: canvasEdgeTypeSchema.default('visual'),
  label: z.string().max(100).optional(),
  enabled: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({})
}).refine(
  (edge) => edge.sourceNodeId !== edge.targetNodeId,
  { message: 'Edge source and target must be different nodes' }
);

// ── Canvas Document ──

const canvasDocumentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string(),
  name: z.string().max(200).default('Untitled Canvas'),
  version: z.number().int().positive(),
  viewport: z.object({
    x: z.number().finite().default(0),
    y: z.number().finite().default(0),
    zoom: z.number().min(0.1).max(5).default(1)
  }),
  nodes: z.array(canvasNodeSchema).default([]),
  edges: z.array(canvasEdgeSchema).default([]),
  createdAt: z.number(),
  updatedAt: z.number()
});

// ── Extension to WorkspaceSessionState ──

// Add to existing workspaceSessionStateSchema:
const workspaceSessionStateSchema = z.object({
  // ... existing fields ...
  canvasDocument: canvasDocumentSchema.optional(),
});
```

---

## 3. Schema Versioning and Migrations

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-07-11 | Initial canvas document schema |

### Migration Framework

```typescript
// src/shared/canvas-migrations.ts

export interface CanvasMigration {
  from: number;
  to: number;
  migrate(doc: unknown): unknown;
}

export const CANVAS_MIGRATIONS: CanvasMigration[] = [
  // Version 1: Initial schema
  // No migrations yet; this is the first version
];

export function migrateCanvasDocument(
  doc: unknown,
  targetVersion: number = CANVAS_SCHEMA_VERSION
): CanvasDocument {
  let current = doc;
  let currentVersion = (doc as any)?.version ?? 1;

  while (currentVersion < targetVersion) {
    const migration = CANVAS_MIGRATIONS.find(
      (m) => m.from === currentVersion && m.to <= targetVersion
    );

    if (!migration) {
      throw new Error(
        `No migration path from version ${currentVersion} to ${targetVersion}`
      );
    }

    current = migration.migrate(current);
    currentVersion = migration.to;
  }

  return canvasDocumentSchema.parse(current);
}
```

---

## 4. State Separation Model

```
PERSISTED STATE                    EPHEMERAL STATE
─────────────────                  ────────────────

CanvasDocument (in SQLite)         CanvasSelection (in Zustand)
├── id                             ├── selectedNodeIds
├── projectId                      ├── selectedEdgeIds
├── name                           └── lastSelectedNodeId
├── version
├── viewport                       CanvasInteraction (in Zustand)
├── nodes                          ├── dragging
│   ├── id                         ├── resizing
│   ├── type                       ├── connecting
│   ├── resourceId                 └── panning
│   ├── position
│   ├── size                       CanvasClipboard (in Zustand)
│   ├── zIndex                     ├── nodes (copied docs)
│   ├── minimized                  ├── edges (copied docs)
│   ├── locked                     └── operation (copy/cut)
│   ├── label
│   ├── color                      CanvasUndoStack (in Zustand)
│   ├── groupId                    ├── past[50]
│   └── metadata                   └── future[]
├── edges
│   ├── id                         CanvasNodeRuntime (derived, not stored)
│   ├── sourceNodeId               ├── status (derived from resource store)
│   ├── targetNodeId               └── statusMessage
│   ├── type
│   ├── label                      React Flow Internal State
│   ├── enabled                    ├── node positions (synced with Zustand)
│   └── metadata                   ├── viewport state (synced with Zustand)
├── createdAt                      ├── scroll/zoom animations
└── updatedAt                      └── drag transition state
```

### Separation Rules

1. **Persisted state** goes through Zod validation at read/write boundaries
2. **Ephemeral state** lives in Zustand or React Flow internal state
3. **Derived state** (runtime status) is computed from existing store slices
4. **Never persisted**: PTY handles, WebContents IDs, browser DOM state, process IDs
5. **Terminal output**: Never enters canvas store (exists in terminal slice/PTY)

---

## 5. Resource Reference Model

### Resource Identity Resolution

```typescript
/**
 * How each node type resolves its resourceId:
 */
const RESOURCE_ID_FORMATS: Record<CanvasNodeType, string> = {
  'agent-terminal':  '${tabId}',             // Terminal tab UUID (paneKey runtime-resolved)
  'shell-terminal':  '${tabId}',             // TerminalSlice tab ID (UUID)
  'browser':         '${browserWorkspaceId}', // BrowserSlice workspace ID (UUID)
  'file':            '${worktreeId}:${path}', // EditorSlice file path
  'note':            'note-${uuid}',          // Canvas-managed note ID
  'diff':            'diff-${uuid}',          // Diff/snapshot ID
  'task':            '${source}:${id}',       // Task source identifier
  'group':           undefined,               // No resource reference
  'orchestrator':    'run-${uuid}',           // Orchestration run ID
};
```

### Validation Rules

1. All `resourceId` strings are validated by their corresponding adapter
2. If a resource ID does not match any existing resource, the node shows a "missing resource" placeholder
3. Resource IDs are durable identifiers (tab UUIDs, workspace IDs, structured references) — never PTY handles, webContents IDs, volatile process IDs, or absolute file paths
4. Runtime-only identifiers (paneKey, ptyId) are resolved from durable IDs at canvas load time
5. The canvas document may reference resources that exist on the local machine, SSH targets, or remote runtimes — the adapter handles the abstraction
