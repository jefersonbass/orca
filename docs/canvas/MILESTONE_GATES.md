# Milestone Gates

**Date:** 2026-07-11
**Status:** Defined — not yet validated

---

## Milestone 1 — Canvas Foundation

### Entry Criteria
- [ ] Documentation complete and consistent (all stale references removed)
- [ ] Sidebar integration pattern validated against SidebarNav.tsx
- [ ] UI store activeView type confirmed to accept 'canvas'
- [ ] Lightweight React Flow PoC passes (pan, zoom, drag, resize, accessibility)
- [ ] No future services introduced

### Required PoCs
- [ ] Lightweight React Flow PoC (pan/zoom/drag/resize with summary nodes)

### Required Tests
- [ ] Sidebar navigation tests (visible when enabled, absent when disabled)
- [ ] Canvas page mounting and empty state
- [ ] Summary node resolution and rendering
- [ ] Node position and viewport persistence
- [ ] Feature flag behavior

### Security Review
- [ ] No new IPC handlers confirmed
- [ ] No preload changes confirmed
- [ ] Canvas document schema validated through existing WorkspaceSessionState

### Exit Criteria
- [ ] All tests pass (lint, typecheck, test, build)
- [ ] Feature flag works correctly
- [ ] Canvas page renders with React Flow on fresh and restored sessions
- [ ] Terminal workbench unaffected by Canvas navigation
- [ ] No live resources embedded in Canvas nodes
- [ ] Layout persists through navigation and reload

### Prohibited Features
- Live terminal embedding
- Browser embedding
- Edges and groups
- Resource creation or termination
- Dedicated canvas IPC
- Notes, files, diffs, tasks

---

## Milestone 2 — Notes, Frames and Basic Visual Tools

### Entry Criteria
- [ ] M1 implementation complete and stable
- [ ] Note storage strategy PoC completed
- [ ] Orca filesystem conventions validated for `.md` file storage
- [ ] Remote workspace and SSH note behavior evaluated

### Required PoCs
- [ ] Note persistence PoC (inline + file-backed in workspace)
- [ ] Basic visual tools PoC (React Flow annotations or simple SVG)

### Required Tests
- [ ] Note creation, editing, autosave, deletion
- [ ] Note content persistence and restoration
- [ ] Group frame creation and child management
- [ ] Visual connection rendering (decorative only)
- [ ] Copy/paste and undo/redo

### Security Review
- [ ] Note content validation (path traversal for file-backed notes)
- [ ] Note content size limits

### Exit Criteria
- [ ] Markdown notes editable and persistent
- [ ] Group frames functional
- [ ] Visual connections render correctly
- [ ] Basic shapes (text, rectangle, arrow, highlight) work
- [ ] Undo/redo and copy/paste work
- [ ] No agent writes to notes (deferred to M4)

### Prohibited Features
- Agent writes to notes
- Automatic terminal-to-note bindings
- Freehand drawing
- Executable edges

---

## Milestone 3 — Live Terminal Nodes

### Entry Criteria
- [ ] M2 implementation complete and stable
- [ ] Terminal PoC (Stage B gates from ADR-001) passes
- [ ] Snapshot-backed recreation compared against at least one alternative strategy

### Required PoCs
- [ ] Full terminal embedding PoC (14 gates from ADR-001 Stage B)

### Required Tests
- [ ] Terminal input, output, selection, scrollback in Canvas node
- [ ] Node drag does not remount terminal
- [ ] Node resize triggers correct xterm fit
- [ ] Focus management (terminal focus after interaction)
- [ ] Keyboard shortcut conflicts (Canvas vs terminal)
- [ ] SSH terminal lifecycle (connect, use, disconnect, reconnect)
- [ ] Close vs terminate behavior

### Security Review
- [ ] Terminal lifecycle IPC usage review (no new dangerous channels)

### Exit Criteria
- [ ] Real terminals render and operate inside Canvas nodes
- [ ] Local and SSH terminals work
- [ ] PTY identity unchanged after Canvas interactions
- [ ] No subscription leaks
- [ ] Performance acceptable (10 terminal nodes)

### Prohibited Features
- [ ] Terminal-to-note output (M4)
- [ ] Executable edges (M9)

---

## Milestone 4 — Manual Agent/Terminal to Note Integration

### Entry Criteria
- [ ] M3 implementation complete and stable
- [ ] Note service design reviewed
- [ ] Human-content protection mechanism defined
- [ ] Audit format defined

### Required PoCs
- [ ] Note append service PoC

### Required Tests
- [ ] Manual "send update" action from agent node
- [ ] Manual "send update" from terminal node
- [ ] Content protection (user content not overwritten)
- [ ] Agent attribution and timestamping
- [ ] Approval dialog
- [ ] Rejected write handling

### Security Review
- [ ] Note write service review (no silent writes, no content injection)
- [ ] Path traversal protection for file-backed notes

### Exit Criteria
- [ ] Users can manually send agent/terminal output to notes
- [ ] Content protection works correctly
- [ ] All writes are auditable
- [ ] User must approve writes by default

### Prohibited Features
- Automatic triggers
- Workflow engine
- Agent-to-agent handoffs

---

## Milestone 5 — Files, Diffs, Tasks, Browsers

### Entry Criteria
- [ ] M4 implementation complete and stable
- [ ] Browser screenshot/screencast integration validated

### Required PoCs (conditional)
- [ ] Browser embedding PoC (if interactive browser is attempted)

### Required Tests
- [ ] File node resolution from editor store
- [ ] Diff node from worktree store
- [ ] PR node from GitHub/GitLab bridges
- [ ] Task node from task store
- [ ] Browser screenshot capture and display

### Security Review
- [ ] File path validation (workspace-relative)
- [ ] Diff/PR data access (existing permissions)

### Exit Criteria
- [ ] File, folder, diff, PR, and task nodes render correctly
- [ ] Browser screenshot/screencast displays
- [ ] Interactive browser not shipped unless PoC passes

### Prohibited Features
- Interactive browser unless PoC passes
- Functional edges (M6)

---

## Milestone 6 — Functional Connections

### Entry Criteria
- [ ] M5 implementation complete and stable
- [ ] Functional edge security review completed
- [ ] Structured handoff schema designed
- [ ] Automatic write controls designed

### Required PoCs
- [ ] Structured handoff PoC

### Required Tests
- [ ] Agent-to-note automatic output binding
- [ ] Context connection (file-to-agent)
- [ ] Structured handoff between agents
- [ ] Approval configuration
- [ ] Rate limiting

### Security Review
- [ ] Handoff service review
- [ ] Structured message validation
- [ ] Permission model review
- [ ] Rate and recursion limits

### Exit Criteria
- [ ] Functional connections operate correctly
- [ ] Handoffs use structured task objects, never hidden terminal injection
- [ ] All writes auditable

### Prohibited Features
- Orchestrator Node (M8)
- Executable workflow edges (M9)

---

## Milestone 7 — Roles and Templates

### Entry Criteria
- [ ] M6 implementation complete and stable
- [ ] Role schema designed
- [ ] Template schema designed

### Required Tests
- [ ] Role CRUD operations
- [ ] Role application to agent node
- [ ] Template instantiation
- [ ] Template creation and editing

### Security Review
- [ ] Role permission scoping
- [ ] Template content validation

### Exit Criteria
- [ ] Roles can be defined, saved, and applied
- [ ] Templates can be created and instantiated
- [ ] Templates do not auto-start expensive agents without user approval

---

## Milestone 8 — Orchestrator Node

### Entry Criteria
- [ ] M7 implementation complete and stable
- [ ] Orchestrator threat model completed
- [ ] Cost limits defined
- [ ] Worktree permissions reviewed

### Required PoCs
- [ ] Orchestrator agent interaction PoC

### Required Tests
- [ ] Team proposal and approval flow
- [ ] Task assignment and tracking
- [ ] Worktree creation
- [ ] Progress monitoring
- [ ] Review/test/documentation handoffs
- [ ] Cancellation
- [ ] Limit enforcement (agents, depth, time)

### Security Review
- [ ] Orchestrator permission model
- [ ] Worktree creation boundaries
- [ ] Destructive action confirmations
- [ ] Maximum agent limits

### Exit Criteria
- [ ] Orchestrator can coordinate multi-agent workflows
- [ ] All actions require user approval where configured
- [ ] Limits enforced correctly

---

## Milestone 9 — Executable Workflows

### Entry Criteria
- [ ] M8 implementation complete and stable
- [ ] Workflow engine threat model completed
- [ ] Cycle detection implemented
- [ ] Timeout design reviewed
- [ ] Approval node design reviewed

### Required PoCs
- [ ] Workflow execution engine PoC

### Required Tests
- [ ] Executable edge triggers
- [ ] Dependency graph execution order
- [ ] Conditional branching
- [ ] Retry on failure
- [ ] Approval node pause/resume
- [ ] Kill switch
- [ ] Run history

### Security Review
- [ ] Workflow engine security review
- [ ] Cycle detection validation
- [ ] Recursion and cost limits
- [ ] Integration with Orca Automations

### Exit Criteria
- [ ] Workflows execute correctly with dependencies
- [ ] Conditional branches work
- [ ] Retry policies function
- [ ] Kill switch stops all running workflows

---

## Milestone 10 — Advanced Whiteboard Layer

### Entry Criteria
- [ ] M2 basic visual tools stable
- [ ] Drawing library PoC completed
- [ ] Non-interference with terminal/navigation validated

### Required PoCs
- [ ] Drawing library PoC (SVG overlay or annotation library)

### Required Tests
- [ ] Freehand drawing
- [ ] Advanced shapes and styling
- [ ] Drawing mode toggle
- [ ] Non-interference with terminal input and node selection
- [ ] Export

### Security Review
- [ ] Drawing data persistence (metadata validation)
- [ ] Export content validation

### Exit Criteria
- [ ] Freehand drawing and advanced shapes work
- [ ] Drawing mode toggle works correctly
- [ ] Terminal input not affected when drawing mode disabled
- [ ] Export produces valid output
