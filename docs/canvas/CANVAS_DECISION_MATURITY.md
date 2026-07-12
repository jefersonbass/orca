# Canvas Decision Maturity Registry

**Date:** 2026-07-11
**Status:** Complete

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| **Target capability** | A product behavior that Orca Canvas intends to provide eventually. Not yet a technical decision. |
| **Proposed strategy** | A preferred technical approach that still requires a proof of concept, experiment, or architecture review. |
| **Validated architecture** | The approach has been confirmed by repository inspection, experiment, or automated test. |
| **Implementation-ready** | The architecture is sufficiently validated and scoped for implementation to begin. |
| **Implemented** | Production code exists and has passed the required validation. |
| **Deferred** | The capability or strategy remains planned but is intentionally postponed. |
| **Rejected** | The strategy was evaluated and should not be used. |

---

## Milestone 1 Decisions

| Decision | Status | Evidence | Next Validation | Related Document |
|----------|--------|----------|----------------|-----------------|
| Canvas sidebar integration | **Implementation-ready** | SidebarNav.tsx pattern confirmed; Automations/Mobile code inspected | Lightweight React Flow PoC | CANVAS_NAVIGATION_INTEGRATION.md |
| Lightweight React Flow summary canvas | **Proposed strategy** | ADR-001 written; library evaluated; PoC not yet run | Lightweight PoC (pan/zoom/drag/resize) | ADR-001-CANVAS-ENGINE.md |
| Summary node model (terminal-summary, agent-summary, missing-resource) | **Implementation-ready** | Architecture validated; store structure confirmed | Component tests | CANVAS_DATA_MODEL.md |
| Single `canvasDocument` persistence | **Implementation-ready** | WorkspaceSessionState pattern confirmed; Zod validation exists | Integration tests | CANVAS_PERSISTENCE_DECISION.md |
| No new IPC in Milestone 1 | **Validated architecture** | Existing settings API sufficient; code inspected | Confirmed by implementation | CANVAS_SECURITY.md |
| No preload changes in Milestone 1 | **Validated architecture** | Preload index inspected; no new contextBridge needed | Confirmed by implementation | CANVAS_SECURITY.md |
| Declarative component registry | **Validated architecture** | React Flow custom nodes pattern; existing Orca patterns | Component tests | CANVAS_RESOURCE_ADAPTERS.md |
| Sidebar under Orca Mobile | **Implementation-ready** | SidebarNav.tsx order confirmed | Visual test | CANVAS_NAVIGATION_INTEGRATION.md |
| Resource status from existing stores | **Validated architecture** | Store slices confirmed for terminal, agent-status | Integration tests | REPOSITORY_AUDIT.md |
| Discriminated resource references | **Implementation-ready** | Type design validated against Orca identity patterns | Code review | CANVAS_RESOURCE_IDENTITY.md |

## Notes Decisions

| Decision | Status | Evidence | Next Validation | Blocking Milestone |
|----------|--------|----------|----------------|-------------------|
| Markdown note nodes | **Target capability** | Product requirement | Design review | M2 |
| Hybrid note storage (Canvas metadata + `.md` file) | **Proposed strategy** | Options evaluated; filesystem conventions not yet checked | Orca filesystem convention validation | M2 |
| Sticky notes (inline content) | **Target capability** | Product requirement | Implementation plan | M2 |
| Agent writes to notes | **Target capability** | Product requirement | Service design | M5 |
| Note file path `.orca/canvas/notes/` | **Proposed strategy** | Not yet validated against Orca conventions | Check Orca directory conventions | M2 |

## Terminal Decisions

| Decision | Status | Evidence | Next Validation | Blocking Milestone |
|----------|--------|----------|----------------|-------------------|
| Live terminal nodes | **Target capability** | Product requirement | Terminal PoC | M3 |
| Snapshot-backed terminal recreation | **Proposed strategy** | Parking model exists; partially confirmed by code | React Flow terminal PoC (Stage B gates) | M3 |
| Secondary xterm surface (same PTY, two instances) | **Rejected** | Duplicate subscriptions, WebGL conflicts, memory | — | — |
| Stable hidden host with portal | **Proposed strategy** (alternative) | Activity portal pattern exists; needs Canvas integration | Terminal PoC comparison | M3 |
| Reuse workbench terminal surface | **Rejected** | CSS transform conflicts, z-index issues | — | — |
| Terminal close vs terminate distinction | **Target capability** | Product requirement | UX design | M3 |
| SSH terminal support | **Target capability** | Existing Orca SSH infrastructure | Terminal PoC with SSH | M3 |

## Browser Decisions

| Decision | Status | Evidence | Next Validation | Blocking Milestone |
|----------|--------|----------|----------------|-------------------|
| Interactive browser node | **Target capability** (conditional) | Product requirement; subject to technical validation | Browser embedding PoC | M5 |
| Screenshot/screencast browser node | **Proposed strategy** | Browser screencast infrastructure exists | Screencast integration | M5 |
| `<webview>` inside React Flow | **Proposed strategy** (heavy caution) | CSS transform coordinate issues known | Browser embedding PoC | M5 |
| Browser as placeholder | **Implementation-ready** | Status summary representation matches M1 pattern | — | M5 |

## Connection Decisions

| Decision | Status | Evidence | Next Validation | Blocking Milestone |
|----------|--------|----------|----------------|-------------------|
| Visual edges (decorative lines) | **Target capability** | Product requirement | React Flow edge implementation | M2 |
| Context edges (file-to-agent) | **Target capability** | Product requirement | Structured context design | M6 |
| Output edges (agent-to-note) | **Target capability** | Product requirement | Note service design | M6 |
| Handoff edges (agent-to-agent) | **Target capability** | Product requirement | Handoff service design | M6 |
| Executable workflow edges | **Deferred target capability** | Product requirement; requires workflow engine | Workflow engine design | M9 |

## Drawing Decisions

| Decision | Status | Evidence | Next Validation | Blocking Milestone |
|----------|--------|----------|----------------|-------------------|
| Basic shapes (text, rectangle, arrow, highlight) | **Target capability** | Product requirement | React Flow annotation evaluation | M2 |
| Freehand drawing | **Target capability** | Product requirement | Drawing library PoC | M10 |
| SVG overlay layer | **Proposed strategy** | Not evaluated against annotation libraries | Drawing layer PoC | M10 |
| Excalidraw | **Rejected** | Canvas2D rendering; cannot embed DOM nodes | — | — |
| tldraw | **Rejected** | License incompatibility; shape override model | — | — |

## Orchestrator Decisions

| Decision | Status | Evidence | Next Validation | Blocking Milestone |
|----------|--------|----------|----------------|-------------------|
| Orchestrator Node | **Target capability** | Product requirement | Design review | M8 |
| Structured task assignment | **Target capability** | Product requirement | Service design | M8 |
| Worktree creation | **Target capability** | Existing worktree IPC | Permission design | M8 |
| Progress monitoring | **Target capability** | Existing agent-status store | Store integration design | M8 |

## Workflow Decisions

| Decision | Status | Evidence | Next Validation | Blocking Milestone |
|----------|--------|----------|----------------|-------------------|
| Workflow engine | **Deferred target capability** | Product requirement; requires orchestrator first | Architecture design | M9 |
| Scheduled workflows | **Deferred target capability** | Orca Automations integration | Integration design | M9+ |
| Conditional workflow branches | **Deferred target capability** | Product requirement | Workflow engine design | M9 |
| Approval gates | **Deferred target capability** | Product requirement | Permission service design | M9 |

## Rejected Strategies

| Strategy | Reason | Evidence |
|----------|--------|----------|
| Imperative mount/unmount resource adapters | Duplicate React roots; loses Context | CANVAS_RESOURCE_ADAPTERS.md |
| Dedicated canvas IPC in Milestone 1 | Not needed; adds security surface without benefit | CANVAS_PERSISTENCE_DECISION.md |
| `window.api.canvas.*` preload namespace | Not needed; existing APIs sufficient | CANVAS_SECURITY.md |
| `canvasDocuments[]` array for Milestone 1 | One canvas per workspace is sufficient | CANVAS_PERSISTENCE_DECISION.md |
| `paneKey` as durable persisted identity | Runtime-only; leaf IDs not stable across PaneManager recreation | CANVAS_RESOURCE_IDENTITY.md |
| Standard View / Canvas View toolbar toggle | Product decision: sidebar navigation | CANVAS_NAVIGATION_INTEGRATION.md |

## Open Validation Gates

| Gate | Required For | Type | Current Status |
|------|-------------|------|----------------|
| Lightweight React Flow PoC (pan/zoom/drag/resize with summary nodes) | Milestone 1 ADR acceptance | Lightweight PoC | Pending |
| Terminal embedding PoC (14 Stage B gates) | Milestone 3 ADR acceptance | Heavyweight PoC | Pending |
| Browser embedding PoC (CSS transform coordinate mapping) | Interactive browser nodes | Heavyweight PoC | Pending |
| Note persistence PoC (file-backed in workspace) | Milestone 2 note implementation | Design PoC | Pending |
| Orca filesystem convention validation (`.orca/` directory) | Note storage path decision | Code inspection | Pending |
| Handoff service security review | Agent-to-agent interactions | Security review | Pending |
| Orchestrator threat model | Orchestrator node | Security review | Pending |
| Workflow engine security review | Executable edges | Security review | Pending |
