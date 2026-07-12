# Canvas Test Plan

**Date:** 2026-07-11
**Version:** 1.0

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Test Levels](#2-test-levels)
3. [Unit Tests](#3-unit-tests)
4. [Component Tests](#4-component-tests)
5. [Integration Tests](#5-integration-tests)
6. [End-to-End Tests](#6-end-to-end-tests)
7. [Performance Tests](#7-performance-tests)
8. [Test Running Instructions](#8-test-running-instructions)

---

## 1. Testing Philosophy

Follow Orca's existing testing practices:
- **Co-located tests**: Test files next to source files
- **Vitest** for unit/component tests
- **Playwright** for E2E tests
- **Zod schema validation**: Primary defense for persistence boundary
- **Behavioral testing**: Test what the user experiences, not implementation details
- **Terminal lifecycle tests**: Critical — must not be mocked

---

## 2. Test Levels

| Level | Time to Run | Frequency | Target Coverage |
|-------|-------------|-----------|----------------|
| Unit | < 1s | Every save | Schema, validation, adapters, edge cases |
| Component | < 30s | Every commit | Node rendering, interactions, keyboard nav |
| Integration | < 3min | Every PR | View switching, persistence, terminal lifecycle |
| E2E | < 15min | Before merge | Full workflows, cross-view consistency |

---

## 3. Unit Tests

### Schema Tests

```typescript
// canvas-schema.test.ts

describe('CanvasDocument Schema', () => {
  it('validates a minimal canvas document', () => {
    const doc = createMinimalCanvasDocument();
    expect(() => canvasDocumentSchema.parse(doc)).not.toThrow();
  });

  it('rejects node with NaN position', () => {
    const doc = createMinimalCanvasDocument();
    doc.nodes[0].position.x = NaN;
    expect(() => canvasDocumentSchema.parse(doc)).toThrow();
  });

  it('rejects node with negative size', () => {
    const doc = createMinimalCanvasDocument();
    doc.nodes[0].size.width = -100;
    expect(() => canvasDocumentSchema.parse(doc)).toThrow();
  });

  it('rejects edges connecting a node to itself', () => {
    const doc = createMinimalCanvasDocument();
    doc.edges.push({
      id: uuid(),
      sourceNodeId: doc.nodes[0].id,
      targetNodeId: doc.nodes[0].id,
      type: 'visual',
      enabled: true,
      metadata: {}
    });
    expect(() => canvasDocumentSchema.parse(doc)).toThrow();
  });

  it('applies defaults for missing optional fields', () => {
    const doc = canvasDocumentSchema.parse({
      id: uuid(),
      projectId: 'test',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    expect(doc.viewport.zoom).toBe(1);
    expect(doc.nodes).toEqual([]);
    expect(doc.edges).toEqual([]);
    expect(doc.name).toBe('Untitled Canvas');
  });

  it('rejects zoom outside valid range', () => {
    const doc = createMinimalCanvasDocument();
    doc.viewport.zoom = 10;
    expect(() => canvasDocumentSchema.parse(doc)).toThrow();
  });

  it('rejects metadata with non-serializable values', () => {
    const doc = createMinimalCanvasDocument();
    doc.nodes[0].metadata.circular = {};
    (doc.nodes[0].metadata.circular as any).self = doc.nodes[0].metadata;
    expect(() => canvasDocumentSchema.parse(doc)).toThrow();
  });
});
```

### Schema Migration Tests

```typescript
// canvas-migrations.test.ts

describe('Canvas Migrations', () => {
  it('returns document unchanged for current version', () => {
    const doc = createMinimalCanvasDocument();
    const result = migrateCanvasDocument(doc, CANVAS_SCHEMA_VERSION);
    expect(result).toEqual(doc);
  });

  it('throws for unknown source version', () => {
    const doc = { ...createMinimalCanvasDocument(), version: 999 };
    expect(() => migrateCanvasDocument(doc)).toThrow(/No migration path/);
  });
});
```

### Adapter Unit Tests

```typescript
// adapters/agent-terminal-adapter.test.ts

describe('AgentTerminalNodeAdapter', () => {
  it('resolves agent status from existing slice', () => {
    const adapter = new AgentTerminalNodeAdapter();
    const status = adapter.getState({ resourceId: 'tab1:leaf1' });
    expect(status).toHaveProperty('state');
  });

  it('returns null for missing resource', () => {
    const adapter = new AgentTerminalNodeAdapter();
    expect(adapter.resolveResource({ resourceId: 'nonexistent' })).toBeNull();
  });

  it('requires explicit termination', () => {
    const adapter = new AgentTerminalNodeAdapter();
    expect(adapter.requiresExplicitTermination).toBe(true);
  });

  it('is not duplicatable', () => {
    const adapter = new AgentTerminalNodeAdapter();
    expect(adapter.duplicatable).toBe(false);
  });
});
```

### Edge Validation Tests

```typescript
// canvas-edge-validation.test.ts

describe('Edge Validation', () => {
  it('validates edge types', () => {
    expect(() => canvasEdgeTypeSchema.parse('invalid')).toThrow();
    expect(() => canvasEdgeTypeSchema.parse('visual')).not.toThrow();
  });

  it('prevents duplicate edges between same nodes', () => {
    const edges = [
      { id: 'a', sourceNodeId: '1', targetNodeId: '2', type: 'visual' },
      { id: 'b', sourceNodeId: '1', targetNodeId: '2', type: 'visual' }
    ];
    expect(hasDuplicateEdges(edges)).toBe(true);
  });
});
```

### Undo/Redo Tests

```typescript
// canvas-undo-redo.test.ts

describe('Canvas Undo/Redo', () => {
  it('applies and reverses a move-node action', () => {
    const state = createInitialCanvasState();
    const moveAction: CanvasUndoEntry = {
      type: 'move-node',
      nodeId: 'node-1',
      from: { x: 0, y: 0 },
      to: { x: 100, y: 200 }
    };
    applyUndo(state, moveAction);
    expect(getNode(state, 'node-1').position).toEqual({ x: 0, y: 0 });
  });

  it('caps undo stack at 50 entries', () => {
    const state = createInitialCanvasState();
    for (let i = 0; i < 60; i++) {
      pushUndo(state, createMoveAction(i));
    }
    expect(state.canvasUndoStack.past.length).toBe(50);
  });

  it('clears redo stack on new action', () => {
    const state = createInitialCanvasState();
    // ... perform and undo an action
    expect(state.canvasUndoStack.future.length).toBe(1);
    performNewAction(state);
    expect(state.canvasUndoStack.future.length).toBe(0);
  });
});
```

### Permission Validation Tests (Phase 4+)

```typescript
// canvas-permissions.test.ts

describe('Canvas Permission Validation', () => {
  it('rejects delegation edge without user approval', async () => {
    const result = await createDelegationEdge('node-1', 'node-2', 'test task', []);
    expect(result).toBe(false);
  });

  it('detects delegation cycles', () => {
    expect(checkCycle(['a', 'b', 'c', 'a'])).toBe(true);
    expect(checkCycle(['a', 'b', 'c', 'd'])).toBe(false);
  });
});
```

---

## 3. Milestone 1 Required Tests

### Navigation

- Canvas sidebar item absent when feature flag disabled
- Canvas sidebar item present below Orca Mobile when feature flag enabled
- Clicking Canvas activates the Canvas page (`activeView === 'canvas'`)
- `aria-current="page"` is set correctly on the Canvas sidebar item
- Hide-from-sidebar behavior works (if implemented)
- Collapsed sidebar tooltip shows "Canvas"
- Keyboard navigation reaches Canvas sidebar item
- Canvas has an accessible label

### Canvas Page

- Canvas page mounts when `activeView === 'canvas'`
- Empty state appears when no terminal/agent resources exist
- Existing terminal tab resolves to a TerminalSummaryNode
- Active agent resolves to an AgentSummaryNode
- Missing resource reference resolves safely to MissingResourceNode
- Status changes update only the relevant node (not all nodes)
- Drag and resize affect layout state only
- No terminal IPC is sent by Canvas interactions
- No browser registration occurs

### Persistence

- Node positions persist through navigation and reload
- Node sizes persist through navigation and reload
- Viewport state persists through navigation and reload
- Invalid/corrupt data falls back safely (empty canvas, no crash)
- Missing resources do not break hydration
- Feature-disabled state safely ignores persisted Canvas data

### Performance

- Node selectors are selective (one node change does not rerender all others)
- Viewport persistence is throttled (not every pointer event)
- Drag persistence fires on drag end, not every pixel

---

## Future Milestone Tests — Not Required for Milestone 1

### Edges and Groups

- Tests for visual edges, context edges, delegation edges, automation edges
- Group/frame membership tests
- Group move affects children
- Auto-layout

### Resource Lifecycle

- Live terminal embedding tests
- Browser/webview lifecycle tests
- Terminal create/terminate from canvas
- Resource termination confirmation dialog
- Process-backed node lifecycle (close vs terminate)

### Orchestration

- Delegation edge permission prompt
- Cycle detection
- Rate limiting
- Audit trail
- Workflow execution

---

## 4. Component Tests

### Node Rendering

```typescript
// CanvasNode.test.tsx

describe('CanvasNode', () => {
  it('renders with correct label', () => {
    render(<CanvasNode id="1" data={{ label: 'My Terminal' }} />);
    expect(screen.getByText('My Terminal')).toBeInTheDocument();
  });

  it('shows status indicator for agent terminal', () => {
    render(
      <CanvasNode
        id="1"
        data={{ nodeType: 'agent-terminal', resourceId: 'tab1:leaf1' }}
      />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows placeholder for missing resource', () => {
    render(
      <CanvasNode
        id="1"
        data={{ resourceId: 'nonexistent', resourceStatus: 'missing' }}
      />
    );
    expect(screen.getByText(/resource not found/i)).toBeInTheDocument();
  });
});
```

### Node Resize

```typescript
// CanvasNodeResize.test.tsx

describe('CanvasNode Resize', () => {
  it('renders resize handles when not locked', () => {
    render(<CanvasNode id="1" data={{ locked: false }} />);
    const handles = screen.getAllByRole('presentation', { hidden: true });
    expect(handles.length).toBeGreaterThan(0);
  });

  it('hides resize handles when locked', () => {
    render(<CanvasNode id="1" data={{ locked: true }} />);
    expect(screen.queryByTitle('Resize')).not.toBeInTheDocument();
  });
});
```

### Status Transitions

```typescript
// CanvasNodeStatus.test.tsx

describe('CanvasNode Status Transitions', () => {
  it('shows working state for active agent', () => {
    const { rerender } = render(<NodeStatus state="working" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Working');

    rerender(<NodeStatus state="done" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Done');
  });
});
```

### Context Menus

```typescript
// CanvasNodeContextMenu.test.tsx

describe('CanvasNode Context Menu', () => {
  it('shows terminate option for process-backed nodes', () => {
    render(
      <CanvasNodeContextMenu
        nodeType="agent-terminal"
        onTerminate={jest.fn()}
      />
    );
    expect(screen.getByText('Terminate Process')).toBeInTheDocument();
  });

  it('does not show terminate for file nodes', () => {
    render(
      <CanvasNodeContextMenu
        nodeType="file"
        onTerminate={jest.fn()}
      />
    );
    expect(screen.queryByText('Terminate Process')).not.toBeInTheDocument();
  });
});
```

### Keyboard Navigation

```typescript
// CanvasKeyboardNav.test.tsx

describe('Canvas Keyboard Navigation', () => {
  it('selects next node with Tab key', async () => {
    const user = userEvent.setup();
    render(<CanvasView />);
    await user.tab();
    expect(screen.getByRole('button', { name: /node-1/i })).toHaveFocus();
  });

  it('moves selected node with arrow keys', async () => {
    const user = userEvent.setup();
    render(<CanvasView />);
    const node = screen.getByRole('button', { name: /node-1/i });
    node.focus();
    await user.keyboard('{ArrowRight}');
    // Verify position updated
  });
});
```

### Theme Behavior

```typescript
// CanvasTheme.test.tsx

describe('Canvas Theme', () => {
  it('uses Orca CSS variables for colors', () => {
    render(<CanvasView />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveStyle({
      backgroundColor: 'var(--background)'
    });
  });

  it('applies reduced motion when preferred', () => {
    window.matchMedia = createMatchMedia('(prefers-reduced-motion: reduce)');
    render(<CanvasView />);
    expect(screen.getByRole('application')).toHaveClass('reduce-motion');
  });
});
```

---

## 5. Integration Tests Requiring Real Terminal Infrastructure

The following tests **cannot use mocked PTY or xterm instances**. They must run against real Orca terminal infrastructure to prove terminal lifecycle correctness. Mock-based tests can verify schema and UI behavior but cannot prove process continuity.

### Test Requirements

For each test below, the test setup must provide:
- A real PTY process (via `window.api.pty.spawn()`)
- A real `TerminalPane` component with PaneManager + xterm.js
- Real Zustand store with `agent-status` and `terminals` slices
- Real IPC transport (not mocked)

### Instrumentation

Each test must track:
- **PTY identity**: `ptyId` before/after view switch must match
- **Mount count**: `PaneManager` construction count — must not increase from view switching
- **Subscription count**: IPC listener count — must not leak
- **xterm identity**: Terminal object reference — must not be recreated
- **Scrollback buffer**: Buffer length must be preserved
- **Scroll position**: Visible row offset must be preserved
- **Focus target**: Active element before/after switch
- **Output continuity**: All output produced during the switch must be received

### View Switching

```typescript
// canvas-view-switching.integration.test.ts

describe('Canvas page Switching', () => {
  it('switches from Standard to Canvas view without restarting terminals', async () => {
    const { store } = setupTestStore({ activeView: 'terminal' });
    store.getState().openCanvasView();
    expect(store.getState().activeView).toBe('canvas');
    // Verify terminals not restarted
    expect(terminalSpawnCount).toBe(0);
  });

  it('restores last canvas viewport on switch back', async () => {
    const { store } = setupTestStore();
    store.getState().openCanvasView();
    store.getState().moveViewport({ x: 500, y: 300, zoom: 1.5 });
    store.getState().openStandardView();
    store.getState().openCanvasView();
    expect(store.getState().canvasViewport).toEqual({ x: 500, y: 300, zoom: 1.5 });
  });
});
```

### Terminal Lifecycle (Real Infrastructure Required)

```typescript
// canvas-terminal-lifecycle.real-infrastructure.test.ts
//
// These tests require REAL PTY + REAL xterm. They CANNOT be mocked.
// They validate that terminal processes survive canvas interactions.

describe('Canvas Terminal Lifecycle (Real Infrastructure)', () => {
  it('terminal PTY identity is unchanged after Standard→Canvas→Standard', async () => {
    // 1. Create a real terminal (spawns PTY via pty:spawn IPC)
    // 2. Record ptyId from terminal tab state
    // 3. Switch to Canvas page (activeView = 'canvas')
    // 4. Verify Terminal workbench DID NOT unmount (hasMountedTerminalWorkbenchRef)
    // 5. Verify PTY process is still alive
    // 6. Switch back to terminal workspace
    // 7. Verify ptyId is unchanged
    // 8. Verify xterm instance is unchanged (same PaneManager)
    // 9. Type a command and verify output
    // 10. Verify no duplicate subscriptions
  });

  it('output during Canvas page is received when returning to terminal workspace', async () => {
    // 1. Create a real terminal
    // 2. Start a long-running command (e.g., `while true; do echo "tick"; sleep 1; done`)
    // 3. Switch to Canvas page
    // 4. Wait 3 seconds (output accumulates during this time)
    // 5. Switch back to terminal workspace
    // 6. Verify all accumulated output is in the terminal buffer
    // 7. No output was lost
  });

  it('switching views does not create duplicate subscriptions', async () => {
    // 1. Create a real terminal
    // 2. Record IPC listener count from pty:data channel
    // 3. Switch to Canvas page
    // 4. Verify listener count did not increase
    // 5. Switch back to terminal workspace
    // 6. Verify listener count still unchanged
  });

  it('pane manager is not recreated during view switch', () => {
    // 1. Create a terminal
    // 2. Get PaneManager reference from TerminalPane
    // 3. Switch to Canvas page
    // 4. Switch back
    // 5. Verify PaneManager reference is the same object
  });
});
```

### Persistence

```typescript
// canvas-persistence.integration.test.ts

describe('Canvas Persistence', () => {
  it('persists and restores canvas layout', async () => {
    const { store } = setupTestStore();
    store.getState().addNode({ id: 'n1', position: { x: 100, y: 200 } });
    const serialized = serializeCanvasState(store.getState());
    store.getState().resetCanvas();
    deserializeCanvasState(store.getState(), serialized);
    const node = store.getState().canvasNodes.find(n => n.id === 'n1');
    expect(node.position).toEqual({ x: 100, y: 200 });
  });

  it('handles corrupt canvas document gracefully', async () => {
    const result = parseCanvasDocument({ invalid: true });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
```

### SSH Terminal Persistence

```typescript
// canvas-ssh-persistence.integration.test.ts

describe('Canvas SSH Terminal Persistence', () => {
  it('SSH terminal remains connected after view switch', () => {
    // Create SSH terminal in standard view
    // Switch to canvas view
    // Move terminal node
    // Switch back to standard view
    // Verify SSH connection still active
  });
});
```

---

## 6. End-to-End Tests

### Workflow Tests

```typescript
// canvas-e2e.spec.ts (Playwright)

describe('Canvas E2E', () => {
  test('complete workflow: create worktree → start agent → open canvas → interact', async () => {
    await app.createWorktree('my-feature');
    await app.startAgent('codex');
    await app.openCanvasView();

    // Verify existing resources appear as nodes
    const nodes = app.canvas.getNodes();
    expect(nodes).toContainEqual(
      expect.objectContaining({ type: 'agent-terminal' })
    );

    // Move a node
    await app.canvas.dragNode(0, { x: 200, y: 300 });

    // Create a browser node
    await app.canvas.createNode('browser');
    await app.canvas.navigateBrowser(1, 'https://example.com');

    // Create a note
    await app.canvas.createNode('note');
    await app.canvas.typeNote(2, '# Design Notes\n\n- Item 1');

    // Switch views
    await app.switchToStandardView();
    await app.switchToCanvasView();
    // Verify layout preserved
    expect(app.canvas.getNodePosition(0)).toEqual({ x: 200, y: 300 });

    // Reload app
    await app.reload();
    // Verify layout persisted
    expect(app.canvas.getNodePosition(0)).toEqual({ x: 200, y: 300 });
  });
});
```

### Regression Tests

```typescript
// canvas-regression.spec.ts

describe('Canvas Regression', () => {
  test('standard view terminal still works after canvas interaction', async () => {
    await app.openCanvasView();
    await app.canvas.dragNode(0, { x: 100, y: 100 });
    await app.switchToStandardView();
    await app.terminal.type('echo "hello"');
    const output = await app.terminal.waitForOutput('hello');
    expect(output).toBeTruthy();
  });

  test('closing canvas node does not affect other views', async () => {
    await app.createAgentTerminal();
    await app.openCanvasView();
    await app.canvas.closeNode(0);  // Close, not terminate
    await app.switchToStandardView();
    expect(app.getAgentTerminalCount()).toBe(1);  // Still there
  });
});
```

---

## 7. Performance Tests

```typescript
// canvas-perf.test.ts

describe('Canvas Performance', () => {
  it('maintains 60fps during pan with 30 nodes', async () => {
    const canvas = setupCanvasWithNNodes(30);
    const fps = await measureFpsDuring(() => canvas.pan(1000, 500, 2000));
    expect(fps).toBeGreaterThan(55);
  });

  it('no terminal input latency during node drag', async () => {
    const canvas = setupCanvasWithTerminalNode();
    const latencyBefore = await measureTerminalInputLatency();
    await canvas.startDragging(0);
    const latencyDuring = await measureTerminalInputLatency();
    await canvas.stopDragging();
    expect(latencyDuring).toBeLessThan(latencyBefore * 1.2);
  });

  it('canvas persists in under 50ms for 50 nodes', async () => {
    const canvas = setupCanvasWithNNodes(50);
    const duration = await measureAsync(canvas.persist);
    expect(duration).toBeLessThan(50);
  });
});
```

---

## 8. Test Running Instructions

```bash
# Run all canvas tests
# Run canvas tests (co-located with source files)
pnpm test -- canvas-

# Run specific test categories
pnpm test -- canvas-schema
pnpm test -- canvas-adapters
pnpm test -- canvas-persistence

# Run component tests
pnpm test -- CanvasNode
pnpm test -- CanvasToolbar

# Run integration tests
pnpm test -- canvas-view-switching
pnpm test -- canvas-terminal-lifecycle

# Run E2E tests
pnpm test:e2e -- canvas

# Run typecheck
pnpm typecheck

# Run lint
pnpm lint

# Full build
pnpm build
```
