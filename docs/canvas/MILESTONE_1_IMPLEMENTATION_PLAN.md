# Canvas Milestone 1 Implementation Plan

**Date:** 2026-07-11
**Status:** Ready for implementation

---

## 1. Objective

Add Canvas Mode as a new sidebar navigation item in Orca, rendering existing terminal and agent resources as lightweight movable status-summary nodes on an infinite canvas.

---

## 2. Validated Scope

- Canvas experimental feature flag
- Sidebar item below Orca Mobile
- Canvas page with React Flow infinite surface
- Pan, zoom, fit view
- Terminal summary nodes (status dot + label, read from existing stores)
- Agent summary nodes (status derived from agent-status store)
- Missing resource placeholder
- Drag and resize
- Persisted node positions, sizes, viewport (single `canvasDocument` in WorkspaceSessionState)
- Light and dark theme
- Accessibility
- Unit, component, and integration tests

---

## 3. Explicit Non-Goals

- No dedicated `canvas:*` IPC handlers
- No `window.api.canvas.*` preload namespace
- No `src/main/ipc/canvas.ts` handler file
- No live terminal embedding (`TerminalPane` inside canvas nodes)
- No interactive browser nodes (`<webview>` inside canvas nodes)
- No edges, connections, or visual links between nodes
- No group/frame containers
- No resource creation from canvas
- No resource termination from canvas
- No orchestration or agent handoffs
- No notes, files, diffs, or tasks as canvas node types
- No multiple canvas documents per workspace
- No badge or unread-count indicators on sidebar item

---

## 4. Existing Orca Patterns to Reuse

| Pattern | Source File | Canvas Use |
|---------|-----------|------------|
| Sidebar navigation item | `SidebarNav.tsx` (Automations, Mobile pattern) | Canvas sidebar item |
| Page navigation | `ui.ts` (`open*Page`, `close*Page`, `activeView`) | Canvas page activation |
| Page rendering | `App.tsx` (`activeView === 'automations' ? <AutomationsPage />`) | Canvas page mount |
| Feature flag settings | `GlobalSettings` (showAutomationsButton, showMobileButton) | `showCanvasButton` |
| Persistence | `WorkspaceSessionState` via existing session save/restore | Canvas layout persistence |
| Zustand store slices | All 37 existing slices | Resource status derivation |
| Active view styling | `activeView === 'automations' ? 'bg-worktree-sidebar-accent'` | Canvas active styling |
| Accessibility | Existing `aria-current="page"` pattern | Canvas sidebar accessibility |
| Translation | `translate()` calls | Canvas labels |
| Context menu hide | `HideSidebarMenu` | Canvas hide from sidebar |

---

## 5. Sidebar Integration

### Pattern to follow

Insert a Canvas button in `SidebarNav.tsx` after the Orca Mobile button, using the exact same pattern as Automations:

```tsx
// In shouldShow functions
export function shouldShowCanvasButton(
  settings: Pick<GlobalSettings, 'showCanvasButton'> | null | undefined
): boolean {
  return settings?.showCanvasButton === true  // Default hidden behind flag
}

// In SidebarNav, after Mobile:
{showCanvasButton ? (
  <ContextMenu>
    <ContextMenuTrigger asChild>
      <button
        type="button"
        onClick={openCanvasPage}
        aria-current={canvasActive ? 'page' : undefined}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
          canvasActive
            ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
            : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
        )}
      >
        <Layout className={cn('size-4 shrink-0', !canvasActive && 'text-worktree-sidebar-foreground/30')} />
        <span className="flex-1">{translate('...', 'Canvas')}</span>
      </button>
    </ContextMenuTrigger>
    <HideSidebarMenu onHide={hideCanvasButton} />
  </ContextMenu>
) : null}
```

### Icon

Use `Layout` from `lucide-react` — it represents a grid/canvas layout, is already available in the lucide-react dependency, and follows the sidebar icon conventions.

### Sidebar order

1. `SetupGuideSidebarEntry`
2. `SidebarTaskNavButton` (Tasks)
3. Automations
4. Agents (optional, behind `experimentalActivity` flag)
5. Orca Mobile
6. **Canvas** ← NEW, inserted after Mobile
7. Search

### Active state

`activeView === 'canvas'` → CSS class `bg-worktree-sidebar-accent` and `aria-current="page"`

---

## 6. Feature Flag

### Setting

```typescript
// In GlobalSettings (src/shared/types.ts):
showCanvasButton?: boolean;  // default: false (hidden)

// Default in src/shared/constants.ts:
// Canvas defaults to false — must be explicitly enabled
```

### Visibility function

```typescript
export function shouldShowCanvasButton(
  settings: Pick<GlobalSettings, 'showCanvasButton'> | null | undefined
): boolean {
  return settings?.showCanvasButton === true;
}
```

### Behavior when disabled

- Canvas sidebar item is not rendered
- Canvas page is not mounted
- Canvas layout in session data is ignored during hydration (gracefully omitted)

### Behavior when enabled

- Canvas sidebar item appears below Orca Mobile
- Clicking opens Canvas page
- Canvas reads existing resources and creates summary nodes
- Canvas does not spawn, attach, detach, resize, or terminate PTYs

---

## 7. Navigation State

### UI slice additions (`src/renderer/src/store/slices/ui.ts`)

```typescript
// activeView union type — add 'canvas':
activeView:
  | 'terminal'
  | 'settings'
  | 'tasks'
  | 'activity'
  | 'automations'
  | 'space'
  | 'skills'
  | 'mobile'
  | 'canvas'          // NEW

// previousViewBeforeCanvas — add:
previousViewBeforeCanvas:
  | 'terminal'
  | 'settings'
  | 'tasks'
  | 'activity'
  | 'automations'
  | 'space'
  | 'skills'
  | 'mobile'

// Methods:
openCanvasPage: () =>
  set((state) => ({
    activeView: 'canvas',
    previousViewBeforeCanvas:
      state.activeView === 'canvas' ? state.previousViewBeforeCanvas : state.activeView
  }))

closeCanvasPage: () =>
  set((state) => ({
    activeView: state.previousViewBeforeCanvas
  }))
```

---

## 8. Canvas Page Architecture

### Component tree

```
CanvasPage.tsx
├── CanvasToolbar.tsx (Fit, Zoom, Reset)
├── ReactFlowProvider (@xyflow/react)
├── CanvasSurface.tsx
│   ├── TerminalSummaryNode.tsx
│   ├── AgentSummaryNode.tsx
│   └── MissingResourceNode.tsx
└── CanvasEmptyState.tsx (shown when no resources)
```

### CanvasPage rendering in App.tsx

```typescript
// In App.tsx, alongside other page renders:
{activeView === 'canvas' ? <CanvasPage /> : null}
```

This follows the exact same pattern as `{activeView === 'automations' ? <AutomationsPage /> : null}`.

---

## 9. Summary Node Architecture

### Node type

```typescript
type CanvasNodeType = 'terminal-summary' | 'agent-summary' | 'missing-resource';
```

### Resource reference

```typescript
interface CanvasResourceReference {
  kind: 'terminal-tab' | 'agent-pane';
  tabId: string;              // Durable terminal tab UUID
  leafId?: string;            // Runtime leaf ID (for agent panes)
  worktreeId?: string;
  paneKey?: string;           // Resolved at runtime from tabId + leafId
}
```

### Status derivation

```typescript
function useNodeRuntime(ref: CanvasResourceReference): {
  status: 'idle' | 'working' | 'blocked' | 'waiting' | 'done' | 'disconnected' | 'missing';
  label: string;
  worktreeName?: string;
} {
  // For terminal-summary: read from terminal store
  // For agent-summary: read from agent-status store via paneKey
  // For missing-resource: return { status: 'missing', ... }
}
```

### Component (Milestone 1 — status summary only)

```typescript
const TerminalSummaryNode = React.memo(({ data }: { data: CanvasNodeData }) => {
  const runtime = useNodeRuntime(data.resourceRef);
  
  if (runtime.status === 'missing') {
    return <MissingResourceNode />;
  }

  return (
    <div className="canvas-summary-node">
      <NodeStatusDot status={runtime.status} />
      <span className="canvas-node-label">{runtime.label}</span>
      {runtime.worktreeName && (
        <span className="canvas-node-worktree">{runtime.worktreeName}</span>
      )}
    </div>
  );
});
```

---

## 10. Resource Resolution

### Resolution flow

```typescript
function resolveResources(): CanvasResourceNode[] {
  const store = useAppStore.getState();
  const nodes: CanvasResourceNode[] = [];

  // 1. Iterate terminals from terminal store
  for (const tab of Object.values(store.terminals)) {
    nodes.push({
      id: `term-${tab.id}`,
      type: 'terminal-summary',
      resourceRef: { kind: 'terminal-tab', tabId: tab.id },
      label: tab.label ?? `Terminal ${tab.id}`,
    });
  }

  // 2. Iterate agents from agent-status store
  for (const [paneKey, agent] of Object.entries(store.agentStatusByPaneKey)) {
    nodes.push({
      id: `agent-${paneKey}`,
      type: 'agent-summary',
      resourceRef: { kind: 'agent-pane', tabId: agent.tabId, leafId: agent.leafId, paneKey },
      label: agent.label ?? getAgentLabel(agent),
      status: agent.state,
    });
  }

  return nodes;
}
```

### Missing resource handling

If a persisted canvas node references a `tabId` that no longer exists in the terminal store:
- Show `MissingResourceNode` with "Resource not found" label
- User can remove the node from canvas
- Persisted reference is preserved in case the resource returns (session restore)

---

## 11. Persistence

### Schema

```typescript
// In WorkspaceSessionState:
canvasDocument?: CanvasDocument;
```

### Save triggers

| Event | Trigger | Debounce |
|-------|---------|---------|
| Node drag end | onNodesChange (React Flow) | 1s debounce |
| Node resize end | onNodesChange | 1s debounce |
| Viewport change end | onMoveEnd (React Flow) | 5s throttle |
| Initial resolution | Canvas page mount | Immediate |

### Load flow

```typescript
// On Canvas page mount:
function useCanvasHydration() {
  const canvasDocument = useAppStore(s => s.ui.persistedUI?.canvasDocument);
  
  useEffect(() => {
    if (canvasDocument) {
      // Hydrate nodes, viewport from persisted document
      // Resolve resource references (tabId → actual resource)
      // Mark unresolvable references as 'missing'
    } else {
      // Create initial nodes from current resources
    }
  }, [canvasDocument]);
}
```

### Migration behavior

| Scenario | Behavior |
|----------|----------|
| No canvas data | Empty canvas with "no resources" state |
| Corrupt canvas data | Zod rejects → empty canvas, no crash |
| Old schema version | Migration applied during deserialization |
| Missing resource (tabId gone) | MissingResourceNode shown |
| Deleted worktree | Nodes referencing it show as missing |
| Feature flag disabled | Canvas document ignored during hydration |

---

## 12. Theme Integration

Canvas components use Orca's existing CSS variable system:

```css
/* Canvas nodes use existing theme tokens */
.canvas-summary-node {
  background: var(--worktree-sidebar-accent);
  color: var(--worktree-sidebar-accent-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
```

React Flow theme integration:
```typescript
<ReactFlow
  colorMode={theme === 'dark' ? 'dark' : 'light'}
  // Background grid uses Orca's border color token:
  // 'var(--border)' → configured in React Flow's Background component
>
```

---

## 13. Accessibility

- All sidebar buttons have `aria-current="page"` when active
- Canvas nodes have `role="button"` and `aria-label`
- Keyboard navigation through arrow keys (React Flow supports this)
- Visible focus indicators through Orca's existing `focus-visible` styles
- Reduced motion respected via `prefers-reduced-motion` CSS
- Status dots accompanied by text labels (not color-only)

---

## 14. Performance Strategy

- `React.memo` on all summary node components
- Selective Zustand selectors (`useAppStore(s => s.agentStatusByPaneKey[paneKey])`)
- Viewport persistence throttled to 5s during active pan/zoom
- `@xyflow/react` bundle loaded lazily (via `React.lazy` + `Suspense`) when Canvas page mounts
- No eager bundle loading for users who never open Canvas

---

## 15. Files to Create

```
src/renderer/src/components/canvas/
├── CanvasPage.tsx                  # Main canvas page component
├── CanvasToolbar.tsx               # Fit, zoom, reset controls
├── CanvasSurface.tsx               # React Flow provider + surface
├── CanvasEmptyState.tsx            # Empty state when no resources
├── TerminalSummaryNode.tsx         # Terminal summary node component
├── AgentSummaryNode.tsx            # Agent summary node component
├── MissingResourceNode.tsx         # Missing resource placeholder
└── use-canvas-resources.ts         # Resource resolution hook
```

Plus TypeScript types:
```
src/shared/canvas-types.ts          # CanvasNodeDocument, CanvasResourceReference, etc.
```

---

## 16. Files to Modify

| File | Change |
|------|--------|
| `src/renderer/src/store/slices/ui.ts` | Add `'canvas'` to `activeView`, add `openCanvasPage`, `closeCanvasPage`, `previousViewBeforeCanvas` |
| `src/renderer/src/store/types.ts` | Ensure `activeView` type includes `'canvas'` |
| `src/renderer/src/components/sidebar/SidebarNav.tsx` | Add Canvas button after Mobile, import `Layout` icon |
| `src/shared/types.ts` | Add `showCanvasButton` to `GlobalSettings` |
| `src/shared/constants.ts` | Add default for `showCanvasButton` (false) |
| `src/renderer/src/App.tsx` | Add `{activeView === 'canvas' ? <CanvasPage /> : null}` |
| `src/shared/workspace-session-schema.ts` | Add optional `canvasDocument` field |

---

## 17. Unit Tests

### CanvasStore tests
- Canvas document can be created, updated, and cleared
- Terminal resources are correctly resolved to summary nodes
- Agent resources are correctly resolved to summary nodes
- Missing resources produce MissingResourceNode references
- Canvas document serializes and deserializes correctly
- Corrupt document is rejected by Zod

### Component tests
- TerminalSummaryNode renders with correct status dot
- AgentSummaryNode renders agent status correctly
- MissingResourceNode shows "Resource not found" text
- CanvasEmptyState renders when no resources

### Sidebar tests
- Canvas item absent when feature flag disabled
- Canvas item renders when feature flag enabled
- Canvas item has correct aria-label and aria-current
- Clicking Canvas item sets activeView to 'canvas'

---

## 18. Component Tests

### CanvasPage
- Renders React Flow surface when resources exist
- Renders empty state when no resources
- Toolbar controls (fit, zoom in, zoom out) are functional
- Light and dark theme are respected

### SummaryNodes
- Nodes are draggable
- Nodes are resizable
- Status updates are reflected in real-time (from store)
- Multiple nodes can coexist on canvas

---

## 19. Integration Tests

- View switching: Standard→Canvas→Terminal preserves running terminals
- View switching: Canvas→Tasks→Canvas preserves canvas layout
- Persistence: Canvas layout survives app reload
- Feature flag: Disabling flag removes sidebar item
- Feature flag: Canvas data ignored when flag is off

---

## 20. Manual Test Checklist

- [ ] Feature flag disabled → no Canvas item in sidebar
- [ ] Feature flag enabled → Canvas appears below Orca Mobile
- [ ] Clicking Canvas → Canvas page opens with resource nodes
- [ ] Existing terminals shown as summary nodes
- [ ] Agents shown with correct status indicator
- [ ] Pan works (click drag on empty space)
- [ ] Zoom works (Ctrl/Cmd + wheel)
- [ ] Fit view works (toolbar button)
- [ ] Nodes can be dragged and repositioned
- [ ] Nodes can be resized
- [ ] Layout persists after navigating away and back
- [ ] Layout persists after app reload
- [ ] Terminal workbench is unaffected (terminals still running)
- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] Collapsed sidebar tooltip shows "Canvas"
- [ ] Keyboard navigation reaches Canvas in sidebar
- [ ] Canvas cannot write to terminals or agents

---

## 21. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| React Flow bundle size on Canvas page load | First load delay | `React.lazy` + `Suspense` |
| xterm.fit() with Terminal in CSS hidden | Terminal layout issue (existing behavior) | Not new — already handled by existing CSS hidden pattern |
| Canvas document grows large | Serialization latency | Cap at 500KB |
| `showMobileButton` gap in sidebar | Visual break | Use same conditional rendering as Mobile |
| Canvas page hydration timing | Race with terminal store | Ensure store is hydrated before Canvas mounts |

---

## 22. Rollback Strategy

- **Feature flag:** Disable `showCanvasButton` to remove Canvas from sidebar
- **Existing data:** Canvas documents in session state are ignored when flag is off
- **Code:** Remove the Canvas sidebar button and page render
- **No database migration:** Canvas data is optional in session schema

---

## 23. Definition of Done

- [ ] Feature flag works (sidebar item hidden/shown)
- [ ] Canvas sidebar item appears below Orca Mobile
- [ ] Active state shown correctly
- [ ] Canvas page renders with React Flow surface
- [ ] Existing terminals appear as summary nodes
- [ ] Agent status indicators work
- [ ] Missing resources show placeholder
- [ ] Pan, zoom, fit work
- [ ] Nodes are draggable and resizable
- [ ] Canvas layout persists through navigation and reload
- [ ] Terminal workbench is not affected
- [ ] Light and dark theme work
- [ ] Collapsed sidebar shows tooltip
- [ ] Keyboard navigation works
- [ ] Accessibility labels are correct
- [ ] No new IPC handlers or preload APIs
- [ ] Lint, typecheck, and tests pass
- [ ] Feature flag disabled = no impact on existing behavior
