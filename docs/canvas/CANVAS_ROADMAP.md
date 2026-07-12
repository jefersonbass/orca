# Canvas Mode Implementation Roadmap

**Date:** 2026-07-11
**Version:** 1.0

---

## Overview

This roadmap describes the phased implementation of the Spatial Canvas Mode for Orca. The implementation is organized into 10 milestones, each building on the previous. No milestone is merged until its deliverables are complete, tested, and documented.

**Note on estimates:** This roadmap defines delivery order, not a reliable project duration. Each milestone must be independently estimated after its architecture and acceptance criteria are validated.

---

## Phase 0: Audit and Prototype (Week 1-2)

**Goal:** Validate the approach with architecture documents and a disposable proof of concept.

### Deliverables

| Item | Status |
|------|--------|
| Repository audit | ✅ Complete |
| Architecture validation | ✅ Complete |
| Documentation repair | ✅ Complete |
| Lightweight React Flow PoC (summary nodes) | ⬜ Pending |
| Heavyweight terminal/browser PoC | ⬜ Deferred |
| Performance measurements | ⬜ Pending |
| Dependency installation | ⬜ Pending (if unavailable) |
| Build validation | ⬜ Pending (if unavailable) |

### Proof of Concept Strategy

Two separate acceptance tracks:

**Lightweight PoC (Milestone 1 prerequisite):**
- React Flow renders summary nodes with pan/zoom/drag/resize
- Status derivation from existing Zustand stores
- Theme integration
- Accessibility validation

**Heavyweight PoC (Phase 2 prerequisite):**
- Real TerminalPane embedding in React Flow nodes
- `<webview>` embedding with CSS transform coordinate testing
- Focus management for live surfaces
- Performance with multiple terminal instances

---

## Milestone 1: Canvas Page (Week 3-5)

**Goal:** Add Canvas as a sidebar page with summary nodes, pan/zoom, persistence, and no live resource embedding.

### Files to Create

```
src/
├── shared/
│   └── canvas-types.ts                    # CanvasDocument, CanvasNodeDocument, CanvasNodeType
├── renderer/src/
│   ├── store/slices/canvas.ts             # Canvas Zustand slice (node layout, viewport)
│   └── components/canvas/
│       ├── CanvasPage.tsx                 # Main canvas page component
│       ├── CanvasToolbar.tsx              # Fit, zoom, reset controls
│       ├── CanvasSurface.tsx              # React Flow provider + surface
│       ├── CanvasEmptyState.tsx           # Empty state when no resources
│       ├── TerminalSummaryNode.tsx        # Terminal tab summary node
│       ├── AgentSummaryNode.tsx           # Agent pane summary node
│       ├── MissingResourceNode.tsx        # Missing resource placeholder
│       └── use-canvas-resources.ts        # Resource resolution hook
```

### Files to Modify

```
src/
├── shared/
│   └── workspace-session-schema.ts        # Add optional canvasDocument
├── shared/types.ts                        # Add showCanvasButton to GlobalSettings
├── shared/constants.ts                    # Add showCanvasButton default (false)
├── renderer/src/
│   ├── store/index.ts                     # Add canvas slice
│   ├── store/types.ts                     # Add CanvasSlice type
│   ├── store/slices/ui.ts                # Add 'canvas' to activeView, open/closeCanvasPage
│   ├── components/sidebar/SidebarNav.tsx  # Add Canvas button after Orca Mobile
│   └── App.tsx                            # Add CanvasPage conditional render
```

No main-process or preload changes are needed for Milestone 1.

### Feature Flag

Setting in `GlobalSettings` (default: `false`):

```typescript
showCanvasButton: boolean;
```

When disabled:
- Canvas sidebar item not rendered
- Canvas document ignored during session hydration
- No performance impact

### Key Behaviors

| Action | Behavior |
|--------|----------|
| Open Canvas from sidebar | Canvas page opens; terminal workbench continues running |
| Drag node | Node position changes; no terminal IPC is sent |
| Resize node | Node resizes; no terminal resize event |
| Remove node from canvas | Node hidden; underlying resource NOT terminated |
| Navigate away from Canvas | Terminal workbench unaffected; canvas state persisted |
| Return to Canvas | Layout restored from persistence |
| Reload app | Canvas layout restored from persistence |
| Missing resource | Shows "Resource not found" placeholder |

### Behavioural Rules

- Canvas cannot spawn, attach, detach, resize, or terminate PTYs
- Canvas cannot write to any terminal or agent input
- Canvas cannot register browser guests
- Canvas cannot execute commands
- Canvas reads resource state from existing Zustand stores

### Testing Focus

1. **Sidebar navigation**: Canvas item visible when enabled, absent when disabled
2. **Canvas page**: Mounts correctly, shows summary nodes, toolbar functional
3. **Persistence**: Node positions, sizes, and viewport survive reload
4. **Missing resources**: Show placeholder without breaking hydration
5. **Feature flag**: Disabled = no sidebar item, no performance impact
6. **Performance**: Selective selectors, no unnecessary re-renders

### Definition of Done

- [ ] Feature flag works (sidebar item hidden from / shown in sidebar)
- [ ] Canvas sidebar item appears below Orca Mobile when enabled
- [ ] Clicking Canvas opens the Canvas page
- [ ] Existing terminals appear as TerminalSummaryNode on canvas
- [ ] Agent status indicators work for active agents
- [ ] Missing resources show placeholder
- [ ] Pan, zoom, fit view work
- [ ] Nodes draggable and resizable
- [ ] Layout persists through navigation and reload
- [ ] Terminal workbench is not affected by Canvas page
- [ ] Light and dark theme work correctly
- [ ] Sidebar tooltip, keyboard navigation, and aria-labels work
- [ ] No new IPC handlers or preload APIs
- [ ] Lint, typecheck, and tests pass
- [ ] Feature flag disabled = no impact on existing behavior
- [ ] Canvas layout persists after reload
- [ ] Missing resources show placeholder
- [ ] Canvas respects Orca light/dark theme
- [ ] No new unrestricted IPC or Node.js renderer capabilities
- [ ] All tests pass (lint, typecheck, test, build)

---

---

## Milestone 2 — Notes, Frames and Basic Visual Tools

**Goal:** Add Markdown notes, sticky notes, group frames, visual connections, and basic shapes. Enable spatial organization and visual planning.

| Capability | Details |
|-----------|---------|
| Markdown note nodes | Full Markdown editor with preview. Hybrid storage (inline + `.md` file) is **proposed**, not yet validated. |
| Sticky note nodes | Lightweight colored notes (inline content) |
| Group frames | Visual containers with title and color |
| Visual connections | Lines between nodes (decorative only — no action performed) |
| Text labels | Inline text on the canvas surface |
| Rectangles and basic arrows | Simple shape annotations |
| Highlight regions | Colored highlight areas |
| Node colors | Visual categorization |
| Node locking | Prevent accidental movement |
| Undo/redo | Canvas action history |
| Copy/paste | Node copy/paste across canvas |
| Node context menu | Rename, color, lock, minimize, remove |

**Key constraint:** Note storage strategy (hybrid) is **proposed pending validation** of Orca filesystem conventions, remote workspace behavior, and concurrent write handling. See CANVAS_NOTES_ARCHITECTURE.md. Freehand drawing is **not included** in M2 — deferred to M10.

## Milestone 3 — Live Terminal Nodes

**Goal:** Replace summary nodes with real interactive terminal nodes.

| Capability | Details |
|-----------|---------|
| Shell terminal nodes | Real xterm surface inside Canvas nodes |
| Agent terminal nodes | Real xterm with agent integration |
| Terminal input, output, selection, scrollback | Full terminal interaction |
| Resize | Terminal reflows to node dimensions |
| Minimize/maximize | Lifecycle-preserving minimize |
| Close vs terminate | Explicit distinction |
| SSH terminal nodes | Remote terminals in Canvas |
| Local terminal nodes | Local PTY in Canvas |

**Prerequisites:** Terminal PoC acceptance gates (ADR-001, Stage B). Snapshot-backed recreation is a **proposed first PoC strategy**, not a final architecture decision.

## Milestone 4 — Manual Agent and Terminal to Note Integration

**Goal:** Enable users to manually send agent and terminal output to Canvas notes with user approval.

| Capability | Details |
|-----------|---------|
| "Send update to note" action | Manual trigger from agent/terminal context menu |
| "Append summary to note" | Agent writes structured summary to connected note |
| "Append current task status" | Agent writes current progress |
| "Append error" | Agent writes error details |
| User selects target note | Explicit user choice per send action |
| Approval required | User approves each write (default) |
| Timestamp and agent attribution | Every write is marked with agent identity and timestamp |
| No automatic triggers | All writes are user-initiated |
| No workflow engine | Simple append-only writes |
| No silent note writes | All writes are visible to the user |

**Key design:** Human-written content is protected. Agent writes append only. See TERMINAL_NOTE_INTEGRATION.md.

## Milestone 5 — Files, Diffs, Tasks, and Browser Representations

**Goal:** Add reference nodes for files, diffs, PRs, tasks, and browser previews.

| Capability | Details |
|-----------|---------|
| File nodes | Workspace-relative file references |
| Folder nodes | Folder tree references |
| Diff nodes | Worktree diff summaries |
| Pull request nodes | PR status from GitHub/GitLab |
| Task nodes | Orca Tasks + GitHub/GitLab/Linear/Jira |
| Browser nodes (screenshot) | URL + screenshot preview (interactive browser remains conditional) |
| Worktree-aware grouping | Auto-group nodes by worktree |

**Conditional:** Interactive browser nodes are subject to technical validation. Screenshot/screencast mode is the default representation.

## Milestone 6 — Functional Connections

**Goal:** Add automatic and structured connections between nodes.

| Capability | Details |
|-----------|---------|
| Agent-to-note output bindings | Automatic output to connected notes |
| Terminal-to-note output bindings | Automatic terminal output to notes |
| Context connections | File-to-agent, task-to-agent context edges |
| Structured handoffs | Agent-to-agent with typed task objects |
| Automatic triggers | On status change, on task complete, on error |
| Approval configuration | Per-edge approval policy |
| Audit history | Log of all writes, handoffs, and approvals |

## Milestone 7 — Reusable Roles and Templates

**Goal:** Define and reuse agent roles and Canvas templates.

| Capability | Details |
|-----------|---------|
| Agent role library | Architect, Developer, Reviewer, etc. |
| Role definition CRUD | Create/edit/delete role definitions |
| Role application | Apply role to agent from Canvas |
| Canvas templates | Feature, bug, review, architecture templates |
| Template instantiation | Create Canvas from template |
| Template creation UI | Save current Canvas as template |

## Milestone 8 — Orchestrator Node

**Goal:** Add a manager agent that coordinates multi-agent workflows.

| Capability | Details |
|-----------|---------|
| Orchestrator node | Manager agent on Canvas |
| Team proposal | Orchestrator proposes agent team |
| Task assignment | Structured task creation and assignment |
| Worktree creation | Create worktrees for agents |
| Progress monitoring | Track agent state and blockers |
| Review/test/documentation requests | Orchestrated handoffs |
| Approval gates | User approval for key actions |
| Cancellation | Stop running orchestrations |
| Limits | Recursion, depth, cost, and time limits |

## Milestone 9 — Executable Workflows

**Goal:** Add automated workflow edges with dependencies, conditions, and retry.

| Capability | Details |
|-----------|---------|
| Executable edges | Automated trigger edges |
| Dependency graph | Visual workflow dependencies |
| Conditional branches | Branch on success/failure |
| Retry policies | Automatic retry on failure |
| Manual approval nodes | Pause for user approval |
| Run history | Per-workflow execution log |
| Per-node execution state | Green/yellow/red/gray status |
| Integration with Orca Automations | Scheduled and triggered workflows |

## Milestone 10 — Advanced Whiteboard Layer

**Goal:** Add freehand drawing, advanced shapes, and presentation tools for visual planning.

| Capability | Details |
|-----------|---------|
| Freehand drawing | Pen/pointer drawing |
| Ellipses and advanced shapes | Beyond rectangles and arrows |
| Eraser | Remove drawing elements |
| Stroke styling | Width, color, opacity |
| Selection and manipulation | Move, resize, group drawings |
| Export image | PNG/SVG export |
| Drawing mode toggle | Separate from node interaction mode |
| Presentation mode | Full-screen Canvas view |
| Advanced annotation styling | Rich text, callouts, pins |

---

## Protected Product Capabilities

The following capabilities are required long-term product features. They may be delayed because of technical risk, but they must not be silently removed from the product vision.

| Capability | Milestone | Risk | Rationale |
|-----------|-----------|------|-----------|
| Live terminal nodes | M3 | High | Terminal lifecycle PoC required; fundamental to spatial agent workflow |
| Markdown notes | M2 | Low | Core knowledge management on Canvas |
| Terminal-to-note connections | M5 | Medium | Agent output to notes; requires explicit note service |
| Agent-to-note output | M5 | Medium | Structured agent writes; requires audit and content protection |
| Agent-to-agent handoffs | M5 | Medium | Structured delegation; requires permission system |
| Group frames | M2 | Low | Visual organization and worktree association |
| Visual connections | M2 | Low | Relationship visualization |
| Functional connections | M5 | Medium | Edges that perform actions |
| File nodes | M4 | Low | Workspace file references |
| Diff and PR nodes | M4 | Low | Git-native workflow integration |
| Task nodes | M4 | Low | Task-aware workflows |
| Reusable roles | M6 | Medium | Agent role templates |
| Canvas templates | M6 | Medium | Workflow templates |
| Orchestrator Node | M7 | High | Multi-agent coordination; requires limits and permissions |
| Executable workflows | M8 | High | Automated workflow execution |
| Drawing and annotation layer | M9 | Medium | Visual planning tools |

**Removal of any protected capability requires:**
1. Documented technical reason
2. Architecture review and sign-off
3. Product decision documented
4. Roadmap update
5. Replacement experience defined where appropriate

---

## Release Plan

### Milestone 1: Canvas Foundation

**Target:** First release
**What's included:**
- Canvas sidebar item below Orca Mobile
- Terminal and agent summary nodes
- Pan, zoom, fit, drag, resize
- Canvas layout persistence (single canvasDocument)
- Light and dark theme
- Accessibility
- Feature flag

### Milestone 2: Notes, Frames and Basic Visual Tools

**Target:** After M1
**What's included:**
- Markdown note nodes with editing and preview
- Sticky note nodes (inline content)
- Group frames with titles and colors
- Visual connection edges (decorative)
- Text labels, rectangles, arrows, highlight regions
- Node colors and locking
- Undo/redo, copy/paste
- Node context menus

### Milestone 3: Live Terminal Nodes

**Target:** After M2
**What's included:**
- Real shell terminal nodes
- Real agent terminal nodes
- Full terminal interaction (input, output, selection, scrollback)
- Terminal resize and reflow
- SSH and remote terminal support
- Close vs. terminate behavior
- Minimize/maximize lifecycle preservation
- Terminal lifecycle PoC acceptance

### Milestone 4: Manual Agent and Terminal to Note Integration

**Target:** After M3
**What's included:**
- "Send update to note" action
- "Append summary" with agent attribution
- User selects target note manually
- Approval required by default
- No automatic triggers
- No silent writes

### Milestone 5: Files, Diffs, Tasks, Browsers

**Target:** After M4
**What's included:**
- File, folder, diff, PR, and task nodes
- Browser screenshot/screencast nodes
- Worktree-aware grouping

### Milestone 6: Functional Connections

**Target:** After M5
**What's included:**
- Agent-to-note and terminal-to-note output bindings
- Context connections
- Structured handoffs with typed tasks
- Automatic triggers with approval
- Audit history

### Milestone 7-10: See milestone definitions above

---

## Dependencies

### External Dependencies

| Dependency | Version | Phase | Purpose |
|-----------|---------|-------|---------|
| `@xyflow/react` | ^12.0.0 | 1 | Canvas engine |
| `zustand` | (existing) | 1 | State management |
| `zod` | (existing) | 1 | Schema validation |

### Internal Dependencies

| Dependency | Phase | Notes |
|-----------|-------|-------|
| UI store (activeView) | 1 | Already supports extension |
| Agent status store | 1 | Existing, no changes needed |
| Terminal store | 1 | Existing, no changes needed |
| Browser store | 1 | Existing, no changes needed |
| Worktree store | 1 | Existing, no changes needed |
| Persistence system | 1 | Existing, schema extension only |
| Preload bridge | 1 | Minimal extension |
| IPC handlers | 1 | New handler file |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Terminal remounting during drag | Low | High | Test early with xterm.js + React Flow |
| Browser webview lifecycle issues | Medium | High | Verify guest registration in Phase 0 PoC |
| Performance regression in Standard view | Low | Medium | Feature flag isolates canvas code |
| Schema migration complexity | Low | Medium | Start with version 1, plan for extensions |
| React Flow breaking changes | Low | Medium | Pin exact version, test upgrades | 
