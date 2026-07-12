# Canvas Node Catalog

**Date:** 2026-07-11
**Status:** Target specification — individual milestones and implementation statuses documented in each section

---

## Terminal Node

| Property | Milestone 1 | Target |
|----------|------------|--------|
| Surface | Status summary (label + dot) | Real interactive xterm |
| Input | Click navigates to terminal workspace | Full keyboard input |
| Output | Status indicator only | Full terminal output |
| Text selection | Not available | Full selection |
| Search | Not available | xterm search addon |
| Scrollback | Not available | Full scrollback |
| Resize | Canvas node size | Terminal reflows to node |
| Minimize | Node header | Node header + lifecycle preservation |
| Maximize | Not available | Fill viewport |
| Hidden behavior | Node removed; terminal continues | Node removed; terminal continues |
| Close vs Terminate | Close only | Close (hide) and Terminate (kill) |
| Local terminals | Status summary | Full |
| SSH terminals | Status summary | Full |
| Remote runtime terminals | Status summary | Full |
| Agent terminals | Status summary | Full (with native chat) |
| Shell terminals | Status summary | Full |
| Status indicators | ✅ | ✅ |
| Context menu | Milestone 2 | ✅ |
| Rename | Milestone 2 | ✅ |
| Lock position | Milestone 2 | ✅ |

**Target milestone:** M3
**Architecture required:** Live terminal embedding PoC (Acceptance Stage B from ADR-001)
**Key risk:** xterm lifecycle, focus management, keyboard shortcut conflicts

---

## Agent Node

| Property | Milestone 1 | Target |
|----------|------------|--------|
| Surface | Status summary (provider + status) | Terminal surface OR native agent view |
| Provider shown | Via status derivation | Provider icon + name |
| Agent role shown | Not available | Role name and description |
| Current state | Status dot | State label + details |
| Current task | Not available | Task description |
| Worktree shown | Not available | Worktree name + branch |
| Agent status | Derived from existing store | Real-time with rich details |
| Waiting state | Status indicator | Permission request display |
| Errors | Status indicator | Error detail panel |
| Completion state | Status indicator | Summary + result |
| Child agents | Not available | Tree or list |
| Handoff actions | Not available | Context menu entries |

**Target milestone:** M3 (live), M5 (handoffs), M7 (orchestration)
**Key risk:** Terminal embedding PoC

---

## Markdown Note Node

| Property | Target |
|----------|--------|
| Markdown source editing | ✅ |
| Rendered preview | ✅ |
| Autosave | ✅ (2s debounce) |
| Title | ✅ |
| Tags | Desired |
| Resize | ✅ |
| Minimize | ✅ |
| Search | ✅ |
| User-written content | ✅ (protected by default) |
| Agent-written content | ✅ (timestamped, attributed) |
| Append-only mode | ✅ (agents append, not overwrite) |
| Protected user sections | ✅ (user content boundaries) |
| Version history | Desired |
| File/Diff links | ✅ (connection handles) |
| Connection handles | ✅ (drag to connect agents) |

**Target milestone:** M2
**Architecture required:** Note service (see CANVAS_NOTES_ARCHITECTURE.md)
**Key decisions:** Hybrid storage (metadata in Canvas, body in `.md` files)

---

## Sticky Note Node

| Property | Target |
|----------|--------|
| Content | Short text (no Markdown rendering) |
| Color | ✅ (color categorization) |
| Resize | ✅ |
| Use cases | Reminders, labels, warnings, agent instructions |
| Persistence | In Canvas document metadata |

**Target milestone:** M2
**Architecture required:** Simple inline storage

---

## File Node

| Property | Target |
|----------|--------|
| Identity | Workspace-relative path |
| File preview | ✅ |
| Open in Orca editor | ✅ |
| Inline editing | Desired |
| File status | ✅ (added, modified, deleted) |
| Git status | ✅ (unstaged, staged, committed) |
| Missing file handling | ✅ (placeholder state) |
| Rename handling | ✅ (resolve by path) |
| Worktree context | ✅ |

**Target milestone:** M4
**Architecture required:** Resource resolution from editor store

---

## Folder Node

| Property | Target |
|----------|--------|
| Summary | ✅ (file count, total size) |
| Expandable children | ✅ |
| Identity | Workspace-relative path |
| Open in file explorer | ✅ |
| Agent context attachment | ✅ |

**Target milestone:** M4

---

## Diff Node

| Property | Target |
|----------|--------|
| Worktree diff | ✅ |
| Selected files | ✅ (file list with change type) |
| Summary | ✅ (files changed, insertions, deletions) |
| Open full review | ✅ |
| Link to review agent | ✅ |
| Approve/request changes | Where supported by provider |

**Target milestone:** M4

---

## Pull Request Node

| Property | Target |
|----------|--------|
| Title | ✅ |
| Status | ✅ (open, merged, closed, draft) |
| CI checks | ✅ |
| Review state | ✅ (approved, changes requested, pending) |
| Comments | ✅ (count + summary) |
| Link to worktree | ✅ |
| Link to review agents | ✅ |

**Target milestone:** M4
**Integration:** GitHub, GitLab via existing Orca bridges

---

## Task Node

| Property | Target |
|----------|--------|
| Orca Tasks | ✅ |
| GitHub Issues | ✅ |
| GitLab Issues | ✅ |
| Linear | ✅ |
| Jira | ✅ |
| Status | ✅ (todo, in progress, done, blocked) |
| Assignee | ✅ |
| Related agents | ✅ |
| Related worktrees | ✅ |

**Target milestone:** M4
**Integration:** Existing Orca task provider bridges

---

## Browser Node

| Property | Milestone 4 (Screenshot) | Phase 2+ (Interactive) |
|----------|-------------------------|----------------------|
| Surface | Screenshot + URL + title | Interactive `<webview>` |
| URL display | ✅ | ✅ |
| Navigation | Open in external browser | In-node navigation |
| Interactive | ❌ | Subject to PoC |
| Dev server preview | Via URL | Via URL |
| Worktree association | ✅ | ✅ |

**Target milestone:** M4 (screenshot), Phase 2+ (interactive, conditional)
**Key risk:** CSS transform coordinate mapping, webview lifecycle (see BROWSER_LIFECYCLE_VALIDATION.md)
**Status:** Interactive browser NOT approved — screenshot mode only until PoC validates embedding

---

## Group / Frame Node

| Property | Target |
|----------|--------|
| Visual containment | ✅ |
| Title | ✅ |
| Color | ✅ |
| Move children together | ✅ |
| Collapse | ✅ |
| Worktree grouping | ✅ |
| Feature grouping | ✅ |
| Service grouping | ✅ |
| Team / role grouping | ✅ |

**Target milestone:** M2

---

## Orchestrator Node

| Property | Target |
|----------|--------|
| Structured task creation | ✅ |
| Task assignment to agents | ✅ |
| Dependency tracking | ✅ |
| Agent state monitoring | ✅ |
| Review requests | ✅ |
| Test requests | ✅ |
| Documentation requests | ✅ |
| Failure handling | ✅ |
| Cancellation | ✅ |
| Retry policy | ✅ |
| Audit trail | ✅ |

**Target milestone:** M7
**Security:** See ORCHESTRATOR_NODE_SPEC.md for rate limits, recursion limits, and safety mechanisms

---

## Drawing Elements

| Element | Target |
|---------|--------|
| Freehand line | ✅ |
| Arrow | ✅ |
| Rectangle | ✅ |
| Ellipse | ✅ |
| Text label | ✅ |
| Highlight area | ✅ |
| Connector label | ✅ |
| Comment pin | ✅ |
| Colors | ✅ |
| Stroke width | ✅ |
| Eraser | ✅ |
| Selection | ✅ |
| Bring forward/send backward | ✅ |
| Lock | ✅ |
| Group | ✅ |
| Copy/paste | ✅ |
| Undo/redo | ✅ |
| Export image | ✅ |
| Drawing mode toggle | ✅ |

**Target milestone:** M9
**Architecture:** Drawing elements must remain separate from executable workflow edges. Drawing must not interfere with terminal input, node selection, or canvas navigation.
