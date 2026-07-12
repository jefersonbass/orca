# Canvas Mode Architecture Proposal

**Date:** 2026-07-11
**Version:** 1.0
**Status:** Draft for review
**Based on audit of:** `stablyai/orca` (v1.4.137-rc.0)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Canvas Domain Model](#2-canvas-domain-model)
3. [Resource Adapters](#3-resource-adapters)
4. [Persistence Strategy](#4-persistence-strategy)
5. [Rendering Strategy](#5-rendering-strategy)
6. [State Management](#6-state-management)
7. [IPC and Security](#7-ipc-and-security)
8. [User Experience](#8-user-experience)
9. [Performance Requirements](#9-performance-requirements)
10. [Cross-Platform Requirements](#10-cross-platform-requirements)
11. [Accessibility](#11-accessibility)
12. [Implementation Phases](#12-implementation-phases)
13. [Testing Strategy](#13-testing-strategy)
14. [Documentation Plan](#14-documentation-plan)

---

## 1. Architecture Overview

### Integration Model

Canvas Mode is implemented as a **first-class view mode** within Orca's existing renderer architecture. It does not create a separate Electron window, process, or application. It does not duplicate any existing Orca resource management systems.

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RENDERER (React + Canvas Engine)                   │
│                                                                           │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │   CanvasToolbar.tsx   │  │          InfiniteCanvas.tsx              │  │
│  │   (tools, zoom,       │  │  ┌──────────┐ ┌──────────┐ ┌─────────┐ │  │
│  │    view controls)     │  │  │CanvasNode│ │CanvasNode│ │CanvasNode│ │  │
│  └──────────────────────┘  │  │ (Terminal)│ │ (Browser)│ │  (Note)  │ │  │
│                            │  └──────────┘ └──────────┘ └─────────┘ │  │
│  ┌──────────────────────┐  │  ┌────────────────────────────────┐    │  │
│  │   Minimap.tsx         │  │  │    CanvasEdges (connections)   │    │  │
│  └──────────────────────┘  │  └────────────────────────────────┘    │  │
│                            └──────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                      RESOURCE ADAPTER LAYER                               │
│                                                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │AgentTerminal │ │ShellTerminal │ │   Browser    │ │     File       │  │
│  │  Adapter     │ │   Adapter    │ │   Adapter    │ │   Adapter      │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └───────┬────────┘  │
│         │                │                │                 │            │
├─────────┼────────────────┼────────────────┼─────────────────┼────────────┤
│         ▼                ▼                ▼                 ▼            │
│                      EXISTING ZUSTAND STORE (37 slices)                   │
│                                                                           │
│  ┌──────────┐ ┌────────────┐ ┌───────────┐ ┌─────────┐ ┌──────────────┐  │
│  │agent-    │ │ terminals  │ │ browser   │ │ editor  │ │ ... 33 more  │  │
│  │status    │ │            │ │           │ │         │ │              │  │
│  └──────────┘ └────────────┘ └───────────┘ └─────────┘ └──────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                        PRELOAD BRIDGE (window.api.*)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                         MAIN PROCESS (IPC Handlers)                       │
│                                                                           │
│  ┌─────────┐ ┌───────────┐ ┌────────┐ ┌────────┐ ┌──────────────────┐  │
│  │  PTY    │ │  Browser  │ │  Git   │ │  SSH   │ │  Canvas (NEW)    │  │
│  │  Mgmt   │ │  Manager  │ │        │ │        │ │  Persistence     │  │
│  └─────────┘ └───────────┘ └────────┘ └────────┘ └──────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                          SQLite PERSISTENCE LAYER                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Canvas Slice (New Store Slice)

```
CanvasSlice
├── canvasDocument?          # Optional single CanvasDocument (persisted)
├── ── Per Document: ──
│   ├── nodes: Map<nodeId, CanvasNodeRuntime>  # Node positions/sizes/statuses
│   ├── edges: Map<edgeId, CanvasEdge>         # Connection edges
│   ├── viewport: {x, y, zoom}                # Current viewport (persisted)
│   ├── selection: Set<nodeId>                 # Selected nodes (ephemeral)
│   ├── clipboard: CanvasClipboard             # Copy/paste buffer (ephemeral)
│   ├── interaction: {                         # Active interaction (ephemeral)
│   │     dragging: nodeId | null,
│   │     resizing: nodeId | null,
│   │     connecting: {source, edgeType} | null
│   │   }
│   └── undoStack: CanvasUndoEntry[]           # Undo/redo (ephemeral, capped)
```

### Component Tree (Milestone 1)

```
App
├── Sidebar
│   ├── Tasks
│   ├── Automations
│   ├── Orca Mobile
│   └── Canvas ← NEW sidebar item (activeView === 'canvas')
│
├── Terminal Workbench
│   └── Remains mounted using existing Orca behavior (CSS hidden)
│
└── Active Page
    └── CanvasPage (conditional render)
        ├── CanvasToolbar (Fit, Zoom, Reset)
        ├── ReactFlowProvider
        ├── CanvasSurface
        │   ├── TerminalSummaryNode
        │   ├── AgentSummaryNode
        │   └── MissingResourceNode
        └── CanvasEmptyState
```

### Future Target Architecture — Not Part of Milestone 1

The following components are deferred to future milestones:

```
CanvasNode (future — embedded resource)
├── NodeHeader (title, status, controls)
├── ResourceAdapter (future — imperative adapters not used in Milestone 1)
│   ├── TerminalPane (live terminal — Phase 2)
│   ├── BrowserView (interactive webview — Phase 2+)
│   ├── MonacoEditor (file node — Phase 2+)
│   ├── MarkdownEditor (note node — Phase 2+)
│   ├── DiffView (diff node — Phase 3)
│   └── TaskSummary (task node — Phase 3)
├── NodeResizeHandle
├── Minimap (Phase 2+)
└── NodeInspector (Phase 3)
```

### View Switching Protocol (code-validated — Strategy D)

**Actual behavior:** Orca's App.tsx keeps the Terminal workbench mounted once initialized, hiding it via CSS `hidden` class when other views are active. See `TERMINAL_LIFECYCLE_VALIDATION.md` for full analysis.

```
Layout (always rendered):
┌───────────────────────────────────────────────────────────┐
│  Sidebar  │  Terminal Workbench (CSS hidden when not     │
│  (always) │  activeView === 'terminal')                  │
│           │  ┌─────────────────────────────────────────┐  │
│           │  │  <Terminal /> always mounted             │  │
│           │  │  PaneManager + xterm + PTY active       │  │
│           │  └─────────────────────────────────────────┘  │
│           ├───────────────────────────────────────────────┤
│           │  Active Page (conditional render):            │
│           │  {activeView === 'canvas' && <CanvasView />}  │
│           │  {activeView === 'settings' && <Settings />}  │
│           │  ...                                          │
│           └───────────────────────────────────────────────┘
└───────────────────────────────────────────────────────────┘

Key: Terminal never unmounts. Canvas page is a conditional page overlay.
     No resources are restarted during view switching.
```

---

## 2. Canvas Domain Model

### Core Types

```typescript
// src/shared/canvas-types.ts

// ── Node Types ──

type CanvasNodeType =
  | 'agent-terminal'     // Agent session (Claude, Codex, etc.)
  | 'shell-terminal'     // Plain shell terminal
  | 'browser'            // Embedded browser page
  | 'file'               // Open file in editor
  | 'note'               // Markdown note
  | 'diff'               // Diff or pull request
  | 'task'               // Task page reference
  | 'group'              // Frame/group container
  | 'orchestrator';      // Orchestration controller (Phase 4+)

// ── Persisted Document State ──

interface CanvasNodeDocument {
  id: string;
  type: CanvasNodeType;
  resourceId?: string;           // Reference to existing Orca resource
  worktreeId?: string;           // Optional worktree association
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  minimized: boolean;
  locked: boolean;
  label: string;
  color?: string;                // Visual category color
  groupId?: string;              // Parent group/frame
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

// ── Edges ──

type CanvasEdgeType =
  | 'visual'           // Pure visual connection
  | 'context'          // Context-sharing relationship
  | 'delegation'       # Agent delegates to another
  | 'automation'       # Automated workflow edge
  | 'data-flow';       // Data dependency

interface CanvasEdgeDocument {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: CanvasEdgeType;
  label?: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
}

// ── Canvas Document ──

interface CanvasDocument {
  id: string;
  projectId: string;
  name: string;
  version: number;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  nodes: CanvasNodeDocument[];
  edges: CanvasEdgeDocument[];
  createdAt: number;
  updatedAt: number;
}

// ── Runtime (Ephemeral) State ──

interface CanvasNodeRuntime {
  document: CanvasNodeDocument;
  status: 'loading' | 'ready' | 'error' | 'missing';
  statusMessage?: string;
  resourceStatus?: ResourceStatus;  // Derived from existing store
}

interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

interface CanvasSelection {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

interface CanvasInteraction {
  dragging: { nodeId: string; offset: { x: number; y: number } } | null;
  resizing: { nodeId: string; handle: ResizeHandle } | null;
  connecting: { sourceNodeId: string; edgeType: CanvasEdgeType } | null;
  panning: boolean;
}

interface CanvasClipboard {
  nodes: CanvasNodeDocument[];
  edges: CanvasEdgeDocument[];
  operation: 'copy' | 'cut';
}

type CanvasUndoAction =
  | { type: 'move-node'; nodeId: string; from: Position; to: Position }
  | { type: 'resize-node'; nodeId: string; from: Size; to: Size }
  | { type: 'add-node'; node: CanvasNodeDocument }
  | { type: 'remove-node'; node: CanvasNodeDocument }
  | { type: 'add-edge'; edge: CanvasEdgeDocument }
  | { type: 'remove-edge'; edge: CanvasEdgeDocument }
  | { type: 'move-viewport'; from: Viewport; to: Viewport }
  | { type: 'change-z-index'; nodeId: string; from: number; to: number };
```

### Schema Versioning

```typescript
const CANVAS_SCHEMA_VERSION = 1;

interface CanvasDocumentV1 {
  // Above shape
}

type CanvasDocument = CanvasDocumentV1;  // Current version

// Migration registry pattern (following Orca's existing approach):
interface CanvasMigration {
  from: number;
  to: number;
  migrate(doc: unknown): CanvasDocument;
}
```

---

## 3. Resource Adapters

**Decision:** Declarative React Component Registry (Option B). See `CANVAS_RESOURCE_ADAPTERS.md` for rationale.

### Adapter Architecture

```typescript
// ── Component registry ──
// Maps each node type to its React component.
// Components receive node data as props and derive status from existing stores.
const canvasNodeComponentRegistry: Record<CanvasNodeType, React.ComponentType<CanvasNodeProps>> = {
  'agent-terminal': AgentTerminalNode,
  'shell-terminal': ShellTerminalNode,
  'browser': BrowserNode,
  'file': FileNode,
  'note': NoteNode,
  'diff': DiffNode,
  'task': TaskNode,
  'group': GroupNode,
  'orchestrator': OrchestratorNode,
};

// ── Status derivation hook ──
// Reads from existing Zustand store; no imperative mount/unmount needed.
function useNodeRuntimeStatus(ref: CanvasResourceReference): NodeRuntimeStatus {
  const agentStatus = useAppStore(s => s.agentStatusByPaneKey);
  const terminals = useAppStore(s => s.terminals);
  // ... derived from existing slice state
  return status;
}

// ── Resource resolution (not mounting) ──
function resolveResource(ref: CanvasResourceReference): ResolvedResource | null {
  // Look up by persistentId, fall back to runtimeId
  // Returns null if resource is missing or was deleted
}
```

**Why not imperative mount/unmount:**
- Would require `ReactDOM.createRoot()` per node — duplicate React roots
- Loses React Context propagation and error boundaries
- Cannot use Zustand hooks inside imperative lifecycle
- Orca's architecture uses declarative React throughout
- Status derivation from existing store is simpler and safer

### Agent Terminal Adapter

```
Adapter: AgentTerminalNodeAdapter
Type: 'agent-terminal'
Source: AgentStatusSlice.agentStatusByPaneKey + TerminalSlice
Key behavior:
  - Maps agent status (working/blocked/waiting/done) to node indicator
  - Embeds TerminalPane component with native chat
  - Uses existing agent-status IPC for real-time updates
  - Close = minimize (process continues)
  - Terminate = explicit agent kill
  - Underlying process continues when off-screen (persistentWhenInactive: true)
  - Duplicatable: false (cannot duplicate an agent session)
  - Supports SSH and remote agents through existing runtime abstraction
```

### Shell Terminal Adapter

```
Adapter: ShellTerminalNodeAdapter
Type: 'shell-terminal'
Source: TerminalSlice
Key behavior:
  - Embeds TerminalPane component (plain shell mode)
  - Close = warn if child processes exist, then kill
  - Underlying process continues when off-screen
  - Duplicatable: false
  - Supports local, SSH, and WSL terminals
```

### Browser Adapter

```
Adapter: BrowserNodeAdapter
Type: 'browser'
Source: BrowserSlice.browserTabsByWorktree + browserPagesByWorkspace
Key behavior:
  - Embeds <webview> via existing browser guest registration
  - Uses existing browser IPC for navigation, state updates
  - Close = minimize (webview preserved)
  - Terminate = destroy webview
  - Off-screen webviews: use visibility management to reduce resource usage
  - Duplicatable: true (creates new browser tab with same URL)
  - Session profiles and cookies preserved through existing partition system
```

### File Adapter

```
Adapter: FileNodeAdapter
Type: 'file'
Source: EditorSlice
Key behavior:
  - Embeds MonacoEditor component
  - Close = save/discard confirmation (reuses existing dirty-file dialog)
  - No underlying process
  - Duplicatable: true
  - Supports live tail for log files
```

### Note Adapter

```
Adapter: NoteNodeAdapter
Type: 'note'
Source: CanvasSlice (self-contained)
Key behavior:
  - Inline Markdown editor (TipTap-based, similar to existing Markdown editor)
  - Autosave to canvas document metadata
  - No underlying process
  - Duplicatable: true
  - Can be connected to agents for append operations
```

### Diff Adapter

```
Adapter: DiffNodeAdapter
Type: 'diff'
Source: DiffCommentsSlice + git IPC
Key behavior:
  - Shows diff summary with file changes
  - References existing diffs/PRs
  - Close = dismiss (no process to terminate)
  - No underlying process
  - Duplicatable: true (same diff in multiple locations)
```

### Task Adapter

```
Adapter: TaskNodeAdapter
Type: 'task'
Source: UISlice.taskPageData + GitHub/Linear/Jira slices
Key behavior:
  - Shows task summary with status, assignee, priority
  - Click opens full task page
  - No underlying process
  - Duplicatable: true
```

### Future: Group/Orchestrator Adapters

```
GroupAdapter: Pure visual container. No underlying resource.
OrchestratorAdapter: Workflow execution engine (Phase 4+).
```

---

## 4. Persistence Strategy

### What to Persist

| Data | Persisted? | Store | Schema |
|------|-----------|-------|--------|
| Node position/size | Yes | SQLite via CanvasDocument | `CanvasNodeDocument` |
| Node type & resource references | Yes | SQLite via CanvasDocument | `CanvasNodeDocument` |
| Edges & connections | Yes | SQLite via CanvasDocument | `CanvasEdgeDocument` |
| Viewport position/zoom | Yes | SQLite via CanvasDocument | `Viewport` |
| Groups/frames | Yes | SQLite via CanvasDocument | `CanvasNodeDocument` (type: 'group') |
| Notes (Markdown content) | Yes | SQLite via CanvasDocument.metadata | String |
| Visual settings (colors, grid) | Yes | SQLite via CanvasDocument.metadata | `CanvasSettings` |
| PTY handles | **Never** | — | — |
| BrowserWindow references | **Never** | — | — |
| WebContents references | **Never** | — | — |
| Process IDs | **Never** | — | — |
| Authentication secrets | **Never** | — | — |
| Credentials | **Never** | — | — |
| Full terminal output | **Never** | — | — |
| Browser DOM state | **Never** | — | — |

### Storage Model

```typescript
// Extension to workspace-session-schema.ts
const canvasDocumentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string(),
  name: z.string().max(200),
  version: z.number().int().positive(),
  viewport: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    zoom: z.number().min(0.1).max(5).default(1)
  }),
  nodes: z.array(canvasNodeSchema),
  edges: z.array(canvasEdgeSchema),
  createdAt: z.number(),
  updatedAt: z.number()
});

// Extension to WorkspaceSessionState
interface WorkspaceSessionState {
  // ... existing fields ...
  canvasDocument?: CanvasDocument;
}
```

### Persistence Flow

```
Auto-save (debounced 1s after change):
  Zustand CanvasSlice ──> serialize to JSON ──> window.api.settings.set()
                                                      │
                                              ┌───────┴───────┐
                                              │ Main process   │
                                              │ SQLite write   │
                                              └───────────────┘

Load:
  SQLite ──> window.api.settings.get() ──> Zod validate ──> CanvasSlice
                                                   │
                                              If invalid ──> graceful fallback
                                                              (discard bad doc)
```

### Migration Strategy

```typescript
const CANVAS_MIGRATIONS: Record<number, (doc: unknown) => unknown> = {
  1: (doc) => doc,  // Initial schema
  // Future migrations:
  // 2: (doc) => { ... add new fields }
  // 3: (doc) => { ... transform data }
};
```

---

## 5. Rendering Strategy

### ADR Summary: Canvas Engine Selection

**Selected: React Flow (xyflow/react) v12+**

See [ADR-001-CANVAS-ENGINE.md](./ADR-001-CANVAS-ENGINE.md) for the full evaluation.

### Why React Flow over alternatives:

1. **DOM-based node rendering** — Terminals and browsers are heavyweight DOM surfaces. React Flow renders nodes as React components, allowing direct embedding of `TerminalPane`, `<webview>`, and `MonacoEditor`.
2. **Built-in pan/zoom** — Mature, accessible, and customizable viewport with smooth transitions.
3. **Edge rendering** — Built-in SVG edge rendering with custom edge types and labels.
4. **Custom nodes** — Any React component can be a node. Resize handles, headers, and status indicators can be composed.
5. **Selection and interaction** — Built-in multi-select, marquee selection, drag-to-select.
6. **Serialization** — Nodes and edges are plain objects, trivially serializable to JSON.
7. **Accessibility** — Keyboard navigation, ARIA labels, focus management.
8. **License** — MIT license (compatible with Orca's MIT license).
9. **Bundle size** — ~200KB gzipped, acceptable for this feature.
10. **Maintenance** — Active development, large community, frequent releases.
11. **Electron compatibility** — Works within Electron's Chromium runtime; no WebGL requirement for basic operation.

### Rendering Architecture

```typescript
// InfiniteCanvas wraps React Flow
const InfiniteCanvas: React.FC = () => {
  const nodes = useAppStore(s => s.canvasNodes);
  const edges = useAppStore(s => s.canvasEdges);
  const onNodesChange = useAppStore(s => s.onNodesChange);
  const onEdgesChange = useAppStore(s => s.onEdgesChange);
  const onConnect = useAppStore(s => s.onConnect);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={NODE_TYPES}   // Custom node type registry
      edgeTypes={EDGE_TYPES}   // Custom edge type registry
      fitView
      minZoom={0.1}
      maxZoom={5}
      snapToGrid={snapEnabled}
      snapGrid={[20, 20]}
    >
      <Background variant="dots" gap={20} />
      <Controls showInteractive={false} />
      <MiniMap />
    </ReactFlow>
  );
};
```

### Node Component Architecture

```typescript
// Each canvas node renders through a component that:
// 1. Receives data from React Flow (position, selected, etc.)
// 2. Looks up the resource adapter for its type
// 3. Embeds the existing Orca component

const CanvasNode = React.memo(({ id, data, selected }) => {
  const adapter = getAdapter(data.nodeType);
  const resourceStatus = useAppStore(s =>
    selectResourceStatus(s, data.resourceId, data.nodeType)
  );

  return (
    <div className={cn('canvas-node', selected && 'selected')}>
      <NodeHeader
        label={data.label}
        status={resourceStatus}
        controls={nodeControls}
      />
      <div className="canvas-node-body" ref={mountRef}>
        {/* Adapter mounts existing component here */}
      </div>
      {!data.locked && <NodeResizeHandle />}
    </div>
  );
});
```

### Terminal Embedding in Canvas Nodes

Critical: Terminal components must remain mounted during canvas operations.

```typescript
// During drag: React Flow moves the node's DOM position
// The TerminalPane inside is NOT unmounted
// Only the wrapper div's transform changes

// During pan/zoom: React Flow transforms the viewport
// Node DOM elements stay mounted
// Transform is applied to the React Flow wrapper

// During minimize: Node shrinks to header-only
// TerminalPane is set to display:none, not unmounted
// PTY process continues in main process

// During off-screen: React Flow clips outside viewport
// DOM elements exist but are outside the visible area
// Browser may throttle off-screen iframes
```

### Edge Rendering

```typescript
// Edges use React Flow's built-in SVG rendering
// Custom edge types add labels and interactive elements
// Edges are rendered in a separate layer from nodes
// Large numbers of edges use a single <path> per edge

const CustomEdge = ({
  id, source, target, type, data, selected, markerEnd
}) => (
  <BaseEdge
    id={id}
    path={getBezierPath({ source, target })}
    markerEnd={markerEnd}
  >
    {data?.label && (
      <EdgeLabel
        label={data.label}
        type={type}
        selected={selected}
      />
    )}
  </BaseEdge>
);
```

---

## 6. State Management

### Store Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    ZUSTAND STORE                             │
│                                                              │
│  EXISTING SLICES (37):           NEW CANVAS SLICE:          │
│  ┌─────────────────────┐         ┌──────────────────────┐   │
│  │ repos, worktrees    │         │ CanvasDocument        │   │
│  │ terminals, tabs     │         │ ├── nodes (runtime)   │   │
│  │ browser, editor     │         │ ├── edges (runtime)   │   │
│  │ agent-status, ui    │         │ ├── viewport          │   │
│  │ settings, ...32     │         │ ├── selection (eph)   │   │
│  └─────────────────────┘         │ ├── interaction (eph) │   │
│                                  │ ├── clipboard (eph)   │   │
│  NOTE: The original audit        │ └── undoStack (eph)   │   │
│  stated 33 slices. The actual    └──────────────────────┘   │
│  codebase has 37 slices.                                     │
|  (See REPOSITORY_AUDIT.md for corrections.)                  │
│                                                              │
│  SEPARATION:                                                  │
│  - Canvas nodes reference resource IDs, not copies            │
│  - Terminal output, browser DOM → NEVER in canvas store       │
│  - Canvas position/size → ONLY in canvas store                │
│  - Agent status, terminal state → EXISTING slices             │
│  - Ephemeral interaction state → React Flow internal          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### State Separation Rules

| State Category | Store Location | Rationale |
|---------------|---------------|-----------|
| Node position, size, zIndex | CanvasSlice | Only canvas cares about spatial layout |
| Node selection, drag state | CanvasSlice (ephemeral) | Not persisted, not shared |
| Undo/redo history | CanvasSlice (ephemeral) | Canvas-specific operations |
| Viewport position/zoom | CanvasSlice | Persisted canvas-specific |
| Terminal buffer content | TerminalSlice (existing) | Must not be duplicated |
| Agent status (thinking/done/etc.) | AgentStatusSlice (existing) | Shared across views |
| Browser page title/URL | BrowserSlice (existing) | Shared across views |
| Worktree branch/status | WorktreeSlice (existing) | Shared across views |
| File content | EditorSlice (existing) | Shared across views |
| Canvas document vs. standard session | WorkspaceSessionSchema | Unified persistence |

### Selective Store Subscriptions

```typescript
// Canvas nodes subscribe to minimal selectors:
const useNodeStatus = (nodeId: string) => {
  return useAppStore(s => {
    const doc = s.canvasDocument;
    if (!doc) return null;
    const node = doc.nodes.find(n => n.id === nodeId);
    if (!node) return null;

    // Only derive the status, not the full terminal state
    if (node.type === 'agent-terminal') {
      return s.agentStatusByPaneKey[node.resourceId];
    }
    // ... other adapters
  });
};
```

---

## 7. IPC and Security

### IPC Strategy

**Decision:** Canvas persistence reuses the existing `window.api.settings` key-value store. No new dedicated `canvas:*` IPC handlers are needed for Milestone 1. Canvas documents are serialized as part of `WorkspaceSessionState` and persisted through the existing save/restore lifecycle.

```typescript
// ── Save (via existing session persistence) ──
// CanvasSlice serializes canvasDocument to JSON on state change
// Uses existing persistence.saveSessionState() mechanism
// No new IPC handlers needed

// ── Load (via existing hydration) ──
// WorkspaceSessionState includes optional canvasDocument
// Hydrated during application startup
// Zod validation at the hydration boundary

// ── Resource status (via existing store subscriptions) ──
// Canvas nodes derive status from existing Zustand slices
// No IPC needed for individual node status
```

### Security Rules

1. **No new preload APIs**: Canvas persistence uses `window.api.settings` (existing key-value store) through the existing session save/restore cycle. No new `contextBridge` entries needed.

2. **Payload validation**: Every canvas IPC payload is validated with Zod schemas at the main process boundary.

3. **Metadata sanitization**: All `CanvasNodeDocument.metadata` is validated:
   - Must be JSON-serializable (no functions, no symbols)
   - No field may contain `__proto__`, `constructor`, or `prototype`
   - String fields are capped at reasonable lengths (e.g., 10KB max)
   - Arrays are capped at 10,000 elements

4. **No code execution from metadata**: Canvas nodes and edges must never allow:
   - Arbitrary shell commands
   - Dynamic `eval()` or `new Function()`
   - Node.js require/import paths
   - Remote URLs in metadata that auto-execute

5. **Edge type permissions** (future):
   - `delegation` edges must pass through explicit command service
   - `automation` edges require user approval
   - `data-flow` edges are read-only

6. **Terminal injection prevention**: Canvas mode must never allow one agent to write into another agent's terminal input. All cross-node communication must go through:
   - Explicit permission prompts
   - An audit trail
   - Rate and recursion limits

---

## 8. User Experience

### Page Navigation

Canvas is opened from Orca's left sidebar, below Orca Mobile. See `CANVAS_NAVIGATION_INTEGRATION.md` for the full sidebar integration pattern.

```
┌───────────────────────────────────────────┐
│  Orca Sidebar                             │
│                                           │
│  Tasks                                    │
│  Automations                              │
│  Orca Mobile                              │
│  Canvas  ← active                         │
├───────────────────────────────────────────┤
│  Canvas Page                              │
│  ┌─────────────────────────────────────┐  │
│  │  Canvas Toolbar                     │  │
│  │  [Fit] [Zoom] [Reset]              │  │
│  ├─────────────────────────────────────┤  │
│  │                                     │  │
│  │  Terminal Summary Node              │  │
│  │  Agent Summary Node                 │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

### Canvas Toolbar

```
┌───────────────────────────────────────────────────────────────┐
│  [⊞ Fit]  [Zoom -]  [100%]  [Zoom +]  [⟲ Reset Layout]      │
│                                                               │
│  Currently: 4 terminal nodes, 2 agent nodes                   │
└───────────────────────────────────────────────────────────────┘
```

### Node Controls

```
┌──────────────────────────────┐
│  [●] My Terminal     ─ ☐ ✕  │  ← Header: status dot, title, actions
│                              │
│  ┌────────────────────────┐  │
│  │  $ git status          │  │  ← Embedded TerminalPane
│  │  On branch main        │  │
│  │  nothing to commit     │  │
│  └────────────────────────┘  │
│                              │
│  ──── resize ────            │  ← Resize handle
└──────────────────────────────┘

Controls:
  [●] Status indicator (green=idle, yellow=working, red=error, gray=offline)
  [─] Minimize (collapse to header)
  [☐] Maximize (fill viewport)
  [✕] Close (hide node, not terminate resource)
  
Context menu (right-click):
  ┌─────────────────────┐
  │ Rename              │
  │ Duplicate           │
  │ Lock Position       │
  │ Bring to Front      │
  │ Send to Back        │
  │ ─────────────────── │
  │ Color              │
  │ ─────────────────── │
  │ ✕ Close Node       │
  │ ⚠ Terminate Process│  ← Red/destructive for process-backed nodes
  └─────────────────────┘
```

### Keyboard Navigation

```
Pan:             Arrow keys (hold Shift for faster)
Zoom:            Ctrl/Cmd + Mouse wheel
Zoom to fit:     Ctrl/Cmd + 0
Reset zoom:      Ctrl/Cmd + Shift + 0
Select all:      Ctrl/Cmd + A
Multi-select:    Hold Shift + click
Marquee select:  Click drag on empty canvas
Move node:       Drag or Arrow keys (with node selected)
Resize node:     Drag resize handle
New agent:       A key
New shell:       S key
New browser:     B key
New note:        N key
Delete:          Delete/Backspace (with confirmation for process nodes)
Copy node:       Ctrl/Cmd + C
Paste node:      Ctrl/Cmd + V
Undo:            Ctrl/Cmd + Z
Redo:            Ctrl/Cmd + Shift + Z
Focus node:      Double-click
Context menu:    Shift + F10
```

---

## 9. Performance Requirements

### Target Metrics

| Scenario | Target | Measurement |
|----------|--------|-------------|
| 30 visible nodes, 10 terminal, 5 browser | 60fps pan/zoom | Chrome DevTools Performance tab |
| Node drag with active terminal | No input latency increase | xterm.js input latency |
| View switch (Standard ↔ Canvas) | < 100ms | `performance.now()` |
| Canvas load with 50 nodes | < 200ms | Zustand hydration timing |
| Canvas persist (50 nodes, 100 edges) | < 50ms | JSON serialize + IPC |
| Undo/redo with 50 entries | < 10ms per operation | In-memory operation |
| Pan with 50 nodes | 60fps | Compositor rasterization |

### Optimization Strategies

1. **Selective store subscriptions**:
   - Canvas nodes subscribe only to their resource status, not full terminal output
   - Use Zustand shallow equality checks
   - Memoize selectors with `useShallow` or custom equality

2. **Memoized node components**:
   - `React.memo` on every `CanvasNode`
   - `React.memo` on edge components
   - `useCallback` for all event handlers
   - `useMemo` for derived data (filtered nodes, edge paths)

3. **Edge rendering isolation**:
   - Use React Flow's built-in edge layer (SVG)
   - For >100 edges: consider `canvas`-based edge rendering
   - Defer invisible edge re-renders

4. **Throttled persistence**:
   - Viewport position: save every 5 seconds during pan/zoom
   - Node position: save 1 second after drag ends (debounced)
   - Node resize: save 1 second after resize ends (debounced)

5. **Visibility-aware rendering**:
   - Nodes outside viewport: can reduce update frequency
   - Minimized nodes: render header only, no resource component
   - Terminal components: never unmount during pan/zoom/drag

6. **Stable React keys**:
   - Node keys: `${nodeId}` (stable across canvas operations)
   - Edge keys: `${edgeId}` (stable across canvas operations)

7. **Cleanup guarantees**:
   - All `useEffect` cleanup functions unsubscribe IPC listeners
   - `ResizeObserver` cleanup on node unmount
   - `MutationObserver` cleanup where used

### What NOT to Do

- Do NOT virtualize or unmount live terminals during normal canvas movement
- Do NOT store terminal buffer content in canvas store
- Do NOT use WebGL for edge rendering (SVG is sufficient for target counts)
- Do NOT use `dangerouslySetInnerHTML` for node content
- Do NOT use `unstable_batchedUpdates` (React 18 handles this)

---

## 10. Cross-Platform Requirements

### Platform Support Matrix

| Feature | macOS | Windows | Linux |
|---------|-------|---------|-------|
| Pan (mouse drag) | ✓ | ✓ | ✓ |
| Pan (touchpad/swipe) | ✓ | ✓ | ✓ |
| Zoom (Cmd/Ctrl + wheel) | ✓ | ✓ | ✓ |
| Keyboard shortcuts | ⌘ symbols | Ctrl labels | Ctrl labels |
| Context menu | Right-click | Right-click | Right-click |
| Snap guides | ✓ | ✓ | ✓ |
| Grid | ✓ | ✓ | ✓ |
| Minimap | ✓ | ✓ | ✓ |
| Reduced motion | ✓ | ✓ | ✓ |

### Implementation Rules

1. **Shortcut labels**: Use `useShortcutLabel.ts` existing hook
2. **Electron accelerators**: Use `CmdOrCtrl` for cross-platform
3. **File paths**: Use Node/Electron `path` utilities
4. **No macOS-only APIs**: Guard with `process.platform` checks
5. **Touch support**: Use pointer events (not mouse events)
6. **Touchpad gestures**: Test two-finger scroll for pan on all platforms

---

## 11. Accessibility

### Requirements

| Requirement | Implementation |
|-------------|---------------|
| Keyboard navigation | Tab through nodes, Arrow keys to move, Enter to focus |
| Visible focus indicators | `:focus-visible` styles on all interactive elements |
| Screen reader labels | ARIA labels on nodes, toolbar, canvas |
| Reduced motion | `prefers-reduced-motion` disables animations |
| High zoom support | Canvas zoom independent of browser zoom |
| Light/dark mode | Uses existing Orca CSS variables |
| Non-color status | Status dots use shape + text labels, not just color |
| Context menu accessibility | ARIA menu pattern with keyboard navigation |

### ARIA Implementation

```typescript
// Canvas container
<div
  role="application"
  aria-label="Spatial Canvas - {canvasName}"
  aria-roledescription="canvas"
>
  {/* Toolbar */}
  <nav aria-label="Canvas tools">
    <button aria-label="Add agent terminal node">+ Agent</button>
    <button aria-label="Zoom in">+</button>
    <button aria-label="Zoom to fit">⊞</button>
  </nav>

  {/* Node */}
  <div
    role="button"
    aria-label="{nodeLabel}, {nodeType} node, {status}"
    aria-roledescription="canvas node"
    tabIndex={0}
  >
    {/* Node content */}
  </div>
</div>
```

---

## 12. Implementation Phases

### Phase 0: Audit and Prototype (Current)
**Goal: Validate approach, no production changes**

Deliverables:
- [x] Repository audit (this document)
- [x] Architecture proposal
- [x] Canvas engine ADR
- [ ] Disposable proof of concept (standalone HTML prototype)
- [ ] Performance measurements of terminal embedding
- [ ] Go/no-go recommendation

### Milestone 1: Canvas Page
**Goal: Add Canvas as a sidebar page with summary nodes, pan/zoom, and persistence.**

Files to create:
- `src/shared/canvas-types.ts`
- `src/renderer/src/store/slices/canvas.ts`
- `src/renderer/src/components/canvas/CanvasPage.tsx`
- `src/renderer/src/components/canvas/CanvasToolbar.tsx`
- `src/renderer/src/components/canvas/CanvasSurface.tsx`
- `src/renderer/src/components/canvas/CanvasEmptyState.tsx`
- `src/renderer/src/components/canvas/TerminalSummaryNode.tsx`
- `src/renderer/src/components/canvas/AgentSummaryNode.tsx`
- `src/renderer/src/components/canvas/MissingResourceNode.tsx`
- `src/renderer/src/components/canvas/use-canvas-resources.ts`

Files to modify:
- `src/renderer/src/App.tsx` (add CanvasPage conditional render)
- `src/renderer/src/store/index.ts` (add canvas slice)
- `src/renderer/src/store/types.ts` (add CanvasSlice type)
- `src/renderer/src/store/slices/ui.ts` (add 'canvas' to activeView)
- `src/renderer/src/components/sidebar/SidebarNav.tsx` (add Canvas button below Mobile)
- `src/shared/types.ts` (add showCanvasButton to GlobalSettings)
- `src/shared/constants.ts` (add showCanvasButton default)
- `src/shared/workspace-session-schema.ts` (add optional canvasDocument)

Constraints:
- No resource creation from canvas
- No live terminals, browsers, or editors in canvas nodes
- Canvas layout persists after reload (single canvasDocument in WorkspaceSessionState)
- Missing resources show placeholder
- No dedicated canvas IPC handlers or preload changes

### Future Milestones

See `CANVAS_ROADMAP.md` for the complete phased delivery plan. Key future milestones:

- **Phase 2 (Resource Creation):** Create terminals, browsers, notes, and files from canvas
- **Phase 3 (Grouping and Connections):** Edges, groups, auto-layout, snap guides, node inspector
- **Phase 4 (Safe Agent Handoffs):** Delegation edges, permission prompts, audit trail, cycle detection
- **Phase 5 (Workflow Execution):** Executable pipelines, triggers, retry policies, scheduling

---

## 13. Testing Strategy

### Test Levels

| Level | Focus | Tools |
|-------|-------|-------|
| Unit | Schema, adapters, edge validation, undo/redo | Vitest |
| Component | Node rendering, resize, context menu, keyboard nav | Vitest + Testing Library |
| Integration | View switching, terminal lifecycle, persistence | Vitest + mock IPC |
| E2E | Full workflows, cross-view resource consistency | Playwright |

### Priority Test Cases

1. **Schema validation**: CanvasDocument with invalid fields → Zod rejects
2. **Schema migration**: V1 doc → migration → V2 doc
3. **View switching**: Standard → Canvas → Standard, terminals continue
4. **Terminal lifecycle**: Canvas node with terminal → drag → no remount
5. **Browser lifecycle**: Canvas node with browser → close → webview not destroyed
6. **Missing resource**: Canvas node referencing deleted resource → placeholder shown
7. **Persistence**: Canvas layout → reload → layout restored
8. **Undo/redo**: Move node → undo → position restored → redo → position reapplied
9. **Keyboard navigation**: Tab through nodes → Arrow key move → Enter focus
10. **Theme**: Light mode → canvas → dark mode → canvas respects theme

---

## 14. Documentation Plan

### Architecture Documents (docs/canvas/)

| Document | Status | Purpose |
|----------|--------|---------|
| `REPOSITORY_AUDIT.md` | ✅ Complete | Full codebase analysis |
| `CANVAS_ARCHITECTURE.md` | ✅ This document | Architecture proposal |
| `ADR-001-CANVAS-ENGINE.md` | ✅ Complete | Canvas engine selection decision |
| `CANVAS_DATA_MODEL.md` | ✅ Complete | Complete type definitions and schema |
| `CANVAS_SECURITY.md` | ✅ Complete | Security boundary analysis |
| `CANVAS_TEST_PLAN.md` | ✅ Complete | Testing strategy |
| `CANVAS_ROADMAP.md` | ✅ Complete | Implementation timeline |
| `CANVAS_USER_GUIDE.md` | ✅ Complete | User-facing documentation |

### Migration Notes

- Canvas documents are a new addition to `WorkspaceSessionState`
- No migration needed for existing users (canvas is opt-in)
- If canvas feature flag is disabled, canvas documents are ignored during hydration
- Graceful handling of partial/corrupted canvas documents

### Known Limitations (Phase 1)

- No real-time collaboration on canvas
- No undirected node auto-layout (manual positioning only)
- No edge routing around nodes (straight/bezier only)
- No node templates or preset layouts
- No executable orchestration
- Canvas not available in web/runtime-only views (requires full renderer)

---

## Target Architecture — Maestri-Parity Canvas

The following architecture represents the long-term target for Canvas Mode. It is provided for reference and does not change the approved Milestone 1 implementation.

### Conceptual Architecture

```
Canvas Page
├── Spatial Surface
│   ├── Live Terminal Nodes           (M3)
│   ├── Agent Nodes                   (M3)
│   ├── Markdown Notes                (M2)
│   ├── Sticky Notes                  (M2)
│   ├── File and Folder Nodes         (M4)
│   ├── Diff and Pull Request Nodes   (M4)
│   ├── Task Nodes                    (M4)
│   ├── Browser Nodes                 (M4, conditional)
│   ├── Group Frames                  (M2)
│   ├── Orchestrator Nodes            (M7)
│   └── Drawing Elements              (M9)
│
├── Connection Layer
│   ├── Visual Edges                  (M2)
│   ├── Context Edges                 (M5)
│   ├── Output Edges                  (M5)
│   ├── Handoff Edges                 (M5/7)
│   └── Executable Workflow Edges     (M8)
│
├── Canvas Services
│   ├── Resource Resolution            (existing + future)
│   ├── Note Service                   (M5)
│   ├── Agent Handoff Service          (M5)
│   ├── Workflow Engine                (M8)
│   ├── Audit Log                      (M5+)
│   ├── Template Service               (M6)
│   └── Persistence                    (existing session state + future extensions)
│
└── Existing Orca Runtime
    ├── PTYs and Terminals
    ├── Agent Providers (Claude, Codex, Gemini, Cursor, ...)
    ├── Worktrees (local, SSH, remote)
    ├── Git and Diffs
    ├── Tasks (Orca, GitHub, GitLab, Linear, Jira)
    ├── Automations
    ├── Browsers (webview, screencast)
    ├── SSH Connections
    └── Remote Runtimes
```

### Key Architectural Principle

The Canvas **references and orchestrates** existing Orca resources. It never replaces their runtime ownership. PTYs are still owned by the main process. Agents are still owned by provider-specific services. Worktrees are still managed by the worktree system. The Canvas is a spatial view over these resources, not a duplicate management layer.

### Node-Service Mapping

| Future Node Type | Requires Service | State Source |
|-----------------|-----------------|--------------|
| Live Terminal (M3) | Terminal lifecycle service | Existing PTY + Terminal store |
| Agent Terminal (M3) | Terminal lifecycle service | Existing PTY + Agent status store |
| Markdown Note (M2) | Note store (Canvas metadata + optional file) | Canvas-own |
| Sticky Note (M2) | Note store (inline metadata) | Canvas-own |
| File Node (M4) | No new service | Editor store |
| Diff Node (M4) | No new service | Git store + diff IPC |
| PR Node (M4) | No new service | GitHub/GitLab store |
| Task Node (M4) | No new service | Task store |
| Browser Node (M4) | Browser screencast service | Browser store |
| Group Frame (M2) | No new service | Canvas-own |
| Orchestrator (M7) | Orchestration service (new) | Agent + Worktree + Task stores |

### Style Guide for Architecture Decisions

Future milestones should follow these principles:
1. **Canvas references, does not own** — The Canvas never duplicates lifecycle ownership
2. **Existing IPC first** — New IPC channels only when existing ones cannot serve the use case
3. **Declarative components** — No imperative mount/unmount adapters
4. **Separate ephemeral from persisted** — Runtime state in existing stores; layout in Canvas store
5. **Security at the boundary** — Every new capability validates IPC payloads
6. **Provider-neutral** — Agent interactions abstract over provider
