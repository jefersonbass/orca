# Canvas Resource Adapters

**Date:** 2026-07-11
**Status:** Decided for Milestone 1

---

## 1. Decision: Option B — Declarative React Component Registry

### Milestone 1 Registry

The Milestone 1 component registry contains only summary node types:

```typescript
const milestone1CanvasNodeRegistry: Record<string, React.ComponentType<CanvasNodeProps>> = {
  'terminal-summary': TerminalSummaryNode,
  'agent-summary': AgentSummaryNode,
  'missing-resource': MissingResourceNode,
};
```

These components render lightweight status indicators and labels. They do not embed terminals, browsers, editors, or any other interactive resource surface.

### Future Target Registry

The following node types are reserved for future milestones and must not be implemented in Milestone 1:

```typescript
const futureCanvasNodeRegistry = {
  'shell-terminal': ShellTerminalNode,    // Phase 2
  'browser': BrowserNode,                 // Phase 2+
  'file': FileNode,                       // Phase 2+
  'note': NoteNode,                       // Phase 2+
  'diff': DiffNode,                       // Phase 3
  'task': TaskNode,                       // Phase 3
  'group': GroupNode,                     // Phase 3
  'orchestrator': OrchestratorNode,       // Phase 4+
};
```

**For Milestone 1, resource adapters use a declarative React component registry pattern, NOT imperative mount/unmount methods.**

---

## 2. Comparison

### Option A: Imperative adapter (REJECTED)

```typescript
interface CanvasResourceAdapter {
  mount(container: HTMLElement, resource: Resource): void;
  unmount(container: HTMLElement, resource: Resource): void;
}
```

**Problems:**
- Requires ReactDOM.createRoot() per node, creating duplicate React roots
- Loses React Context propagation
- Loses error boundary integration
- Hard to test — imperative DOM manipulation
- Breaks React's declarative model
- Must manually manage Provider access

### Option B: Declarative component registry (SELECTED)

```typescript
const canvasNodeComponentRegistry = {
  'agent-terminal': AgentTerminalNode,
  'shell-terminal': ShellTerminalNode,
  'browser': BrowserNode,
  'file': FileNode,
  'note': NoteNode,
  'diff': DiffNode,
  'task': TaskNode,
  'group': GroupNode,
  'orchestrator': OrchestratorNode,
} as const;
```

**Benefits:**
- Standard React composition — works within React Flow nodes
- React Context propagates naturally
- Error boundaries work as expected
- Zustand store access through existing hooks
- Easy to test with React Testing Library
- Same patterns as the rest of the codebase

### Option C: Resolver + renderer (PARTIALLY ADOPTED)

```typescript
interface CanvasResourceDefinition {
  resolveReference(node: CanvasNodeDocument): ResolvedResource;
  useStatus(reference: CanvasResourceReference): ResourceStatus;
  Component: React.ComponentType<CanvasResourceProps>;
}
```

The resolver pattern is adopted for the **status derivation** and **resource reference resolution** parts, but the rendering is done through the component registry.

---

## 3. Final Architecture

```typescript
// ── Type registry ──

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

// ── Status hook ──

function useNodeRuntimeStatus(ref: CanvasResourceReference): NodeRuntimeStatus {
  // Reads from existing Zustand store based on resource type
  // For agent-terminal: reads agentStatusByPaneKey
  // For shell-terminal: reads terminal state
  // For browser: reads browser page state
  // Returns: 'loading' | 'ready' | 'error' | 'missing' | 'disconnected'
}

// ── Resource node component ──
// NOTE: TerminalPaneEmbedded is a Phase 2 target, not Milestone 1.
// Milestone 1 always renders TerminalStatusSummary.

const ShellTerminalNode: React.FC<CanvasNodeProps> = ({ node, data }) => {
  const status = useNodeRuntimeStatus(data.resourceRef);

  if (status === 'missing') {
    return <MissingResourcePlaceholder />;
  }

  return (
    <div className="canvas-node">
      <NodeHeader label={data.label} status={status} />
      <div className="canvas-node-body">
        <TerminalStatusSummary status={status} label={data.label} />
      </div>
    </div>
  );
};
```

---

## 4. Milestone 1: No live terminal embedding

For Milestone 1, canvas nodes show a **status summary representation** (label, status dot, resource type icon) rather than a live embedded TerminalPane. The live TerminalPane remains mounted in the hidden terminal workspace workbench.

This eliminates:
- All terminal lifecycle risks during canvas interactions
- The need for extra xterm instances
- Focus management complexity
- Drag performance concerns with active terminals

Users click a canvas node to focus the terminal in terminal workspace.

### Milestone 1 component render:

```typescript
const ShellTerminalNode: React.FC<CanvasNodeProps> = ({ data }) => {
  return (
    <div className="canvas-node" onClick={() => switchToStandardView(data.resourceRef)}>
      <NodeIcon type="terminal" status={deriveStatus(data.resourceRef)} />
      <NodeLabel label={data.label} />
      <NodeStatusIndicator status={deriveStatus(data.resourceRef)} />
    </div>
  );
};
```

### Phase 2: Live terminal embedding

Once terminal lifecycle safety is proven with the phase 1 implementation, explore adding live TerminalPane embedding in canvas nodes via:
- React portals (reusing the Activity portal pattern)
- Additional TerminalPane instances connected to the same PTY
