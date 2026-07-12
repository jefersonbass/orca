# Canvas Mode Product Specification

**Date:** 2026-07-11
**Version:** 1.0 (Target specification)

> **Status:** Target product experience. Features described here belong to future milestones and are not all implemented in Milestone 1. See [CANVAS_ROADMAP.md](./CANVAS_ROADMAP.md) for the phased delivery plan and [ARCHITECTURE_VALIDATION.md](./ARCHITECTURE_VALIDATION.md) for current validation status.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Canvas Navigation](#3-canvas-navigation)
4. [Working with Nodes](#4-working-with-nodes)
5. [Managing Resources](#5-managing-resources)
6. [Visual Organization](#6-visual-organization)
7. [Keyboard Shortcuts](#7-keyboard-shortcuts)
8. [Frequently Asked Questions](#8-frequently-asked-questions)
9. [Target Experience — Spatial Agent Workspace](#9-target-experience--spatial-agent-workspace)
10. [Target Product Completion Criteria](#10-target-product-completion-criteria)

---

## 1. Introduction

Canvas Mode is a spatial page for Orca that lets you organize your coding agents and terminals on an infinite canvas. Instead of the traditional tab-and-split terminal workspace, you can position each resource anywhere, resize it, and visually map your workflow.

**Canvas Mode is not a separate application.** It's a dedicated page opened from the left sidebar. Your terminals keep running, your agents keep working, and you can navigate back to the terminal workspace at any time.

### When to Use Canvas Mode

- **Multi-agent workflows**: Visually organize several agents working on different tasks
- **Complex projects**: Map out your worktrees, services, and dependencies
- **Design + development**: Keep a browser preview, editor, and terminal side by side
- **Code review**: Arrange diffs, PRs, and terminals in a comparison layout
- **Planning**: Use notes and connections to sketch out architecture

---

## 2. Getting Started

### Enabling Canvas Mode

Canvas Mode is behind a feature flag in the initial release:

1. Open Orca Settings (Cmd/Ctrl + ,)
2. Navigate to **Experimental Features**
3. Toggle **Canvas Mode** on
4. The **Canvas** item appears in the left sidebar below **Orca Mobile**

### Opening Canvas

Click **Canvas** in the left sidebar to open the Canvas page. Navigate back to the terminal workspace or other pages using the same sidebar.

Opening Canvas does NOT restart your terminals or interrupt your agents. The terminal workbench continues running in the background.

### First Time Opening Canvas

Existing terminal tabs and active agents appear as lightweight status-summary nodes. They are automatically arranged based on their worktree groupings.

---

## 3. Canvas Navigation

### Panning

| Method | Action |
|--------|--------|
| Click and drag empty space | Pan the canvas |
| Scroll (two fingers on trackpad) | Pan the canvas |
| Arrow keys | Pan by small increments |
| Shift + Arrow keys | Pan by larger increments |

### Zooming

| Method | Action |
|--------|--------|
| Ctrl/Cmd + Mouse wheel | Zoom in/out |
| Ctrl/Cmd + 0 | Zoom to fit all nodes |
| Ctrl/Cmd + Shift + 0 | Reset zoom to 100% |
| Zoom controls in toolbar | Click +/- buttons |

### Minimap

The minimap in the bottom-right corner shows an overview of all nodes. Click and drag the minimap viewport to navigate. The minimap can be hidden from the toolbar.

### Grid

The background grid helps with alignment. Toggle grid visibility and snap-to-grid from the toolbar.

---

## 4. Working with Nodes

### Creating Nodes

Click the **+ Add Node** button in the toolbar to see available node types:

| Node Type | Description |
|-----------|-------------|
| Agent Terminal | Start a new agent session (Claude, Codex, etc.) |
| Shell Terminal | Open a new shell terminal |
| Browser | Open a new browser tab |
| Note | Create a Markdown note |
| File | Open a file from your workspace |
| Diff | View a diff or pull request |
| Task | Link to a task or issue |
| Group/Frame | Create a visual container for organization |

### Selecting Nodes

| Action | Method |
|--------|--------|
| Select one node | Click on it |
| Select multiple nodes | Shift + click, or drag a selection box |
| Select all nodes | Ctrl/Cmd + A |
| Deselect | Click empty space |

### Moving Nodes

- **Drag** any node to move it
- **Arrow keys** move the selected node (hold Shift for larger steps)
- Nodes snap to grid when snap-to-grid is enabled

### Resizing Nodes

- Drag the resize handle at the bottom-right corner of any node
- Terminal and browser nodes resize their content to fit

### Minimizing and Maximizing

- Click the **minimize** button (─) to collapse a node to its header
- Click the **maximize** button (☐) to expand a node to fill the viewport
- Press **Escape** to restore a maximized node

### Node Context Menu

Right-click any node to:

| Option | Description |
|--------|-------------|
| Rename | Change the node's label |
| Duplicate | Create a copy (where applicable) |
| Lock Position | Prevent accidental moves |
| Bring to Front | Move on top of other nodes |
| Send to Back | Move behind other nodes |
| Color | Choose a visual category color |
| Close | Hide the node (resource continues running) |
| Terminate | Stop the resource (with confirmation) |

---

## 5. Managing Resources

### Close vs. Terminate

Canvas Mode distinguishes between **closing a node** and **terminating a resource**:

| Action | What Happens | Resource State |
|--------|-------------|----------------|
| Close node (✕) | Node is hidden from canvas | Resource continues running |
| Terminate (context menu) | Resource is stopped | Process ends |

- **Agent terminals**: Close hides the node; the agent continues. Terminate stops the agent.
- **Shell terminals**: Close hides the node. Terminate kills the shell.
- **Browser tabs**: Close hides the node. Terminate destroys the webview.
- **Files, notes, diffs, tasks**: Close hides the node. There is nothing to terminate.

### Missing Resources

If a node references a resource that no longer exists (e.g., a deleted worktree), the node shows a "Resource not found" placeholder. You can remove the placeholder node or recreate the resource.

---

## 6. Visual Organization

### Groups/Frames

Create a group frame to organize related nodes:

1. Click **+ Add Node → Group/Frame**
2. Resize the frame to surround related nodes
3. Drag nodes into the frame
4. Rename the frame (e.g., "Frontend", "Backend", "API")

When you move a frame, its child nodes move with it (optional).

### Colors

Assign colors to nodes for visual categorization:

- Right-click a node → **Color**
- Choose from the Orca color palette
- Colors use Orca's design tokens and respect light/dark mode

### Edges (Connections)

Draw connections between nodes to show relationships:

1. Click the connection handle on a node's edge
2. Drag to another node
3. Choose the connection type:

| Edge Type | Visual | Meaning |
|-----------|--------|---------|
| Visual | Solid line | General relationship |
| Context | Dotted line | Context sharing |
| Delegation | Arrow | Work is delegated |
| Automation | Dashed arrow | Automated workflow |
| Data Flow | Line with circle | Data dependency |

### Auto-Layout

Select multiple nodes and use **Auto-Layout** from the toolbar to automatically arrange them in a neat grid.

---

## 7. Keyboard Shortcuts

### Global Canvas Shortcuts

| Shortcut | Action |
|----------|--------|
| Arrow keys | Pan canvas / move selected node |
| Shift + Arrow keys | Pan/move faster |
| Ctrl/Cmd + 0 | Zoom to fit all nodes |
| Ctrl/Cmd + Shift + 0 | Reset zoom |
| Ctrl/Cmd + Mouse wheel | Zoom in/out |
| Ctrl/Cmd + A | Select all nodes |
| Delete / Backspace | Remove selected nodes (confirms for process nodes) |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + C | Copy selected nodes |
| Ctrl/Cmd + V | Paste nodes |
| Escape | Deselect all / exit maximize |

### Quick Create Shortcuts

| Shortcut | Action |
|----------|--------|
| A | Create agent terminal |
| S | Create shell terminal |
| B | Create browser |
| N | Create note |
| G | Create group/frame |
| F | Open file |

### Node Shortcuts (with node selected)

| Shortcut | Action |
|----------|--------|
| R | Rename node |
| L | Lock/unlock position |
| M | Minimize/restore |
| . (period) | Toggle maximize |
| ] (bracket) | Bring to front |
| [ (bracket) | Send to back |
| Enter | Focus node (click into its content) |

---

## 8. Frequently Asked Questions

**Q: Does switching to Canvas page restart my terminals?**

No. Switching views preserves all running processes. Terminals, agents, and browsers continue running regardless of which view you're in.

**Q: Can I use Canvas page on a remote/SSH worktree?**

Yes. Canvas nodes reference existing resources, including SSH terminals, remote agents, and runtime environments. The canvas itself is agnostic to where resources are running.

**Q: Does Canvas Mode work on all platforms?**

Yes. Canvas Mode works on macOS, Windows, and Linux. Keyboard shortcuts adapt to each platform (⌘ on Mac, Ctrl on Windows/Linux).

**Q: What happens to my canvas layout when the app restarts?**

Canvas layout is persisted to Orca's storage. After restart, opening Canvas page restores your last layout including node positions, sizes, and viewport.

**Q: Can I have multiple canvas documents?**

Milestone 1 supports a single canvas document per workspace. Multiple canvases are a planned future feature.

**Q: Can I use Canvas Mode with many nodes?**

Canvas Mode is designed to be responsive with approximately 30 visible nodes, 10 active terminals, 5 browser nodes, and 100 edges. Performance may degrade with significantly more nodes.

**Q: Are automated agent handoffs supported?**

The initial release supports visual connections only. Automated agent handoffs and executable workflows are planned for a later phase.

**Q: Can I undo canvas actions?**

Yes. Canvas operations (move, resize, add, remove) support undo (Ctrl/Cmd+Z) and redo (Ctrl/Cmd+Shift+Z) up to 50 actions.

**Q: Can I share my canvas layout with others?**

Not in the initial release. Canvas sharing and collaboration are future features.

**Q: How do I report issues with Canvas Mode?**

Report issues through Orca's usual feedback channels. Include "Canvas Mode" in your description.

---

## 9. Target Experience — Spatial Agent Workspace

This section describes the complete Canvas product vision. Capabilities are ordered from Milestone 1 (current) through final target. See [CANVAS_ROADMAP.md](./CANVAS_ROADMAP.md) for the phased delivery plan.

### Milestone 1 Capabilities (Implemented)

| Capability | Status |
|------------|--------|
| Sidebar navigation item (Canvas below Orca Mobile) | Architecture approved |
| Infinite canvas with pan, zoom, fit | Architecture approved |
| Terminal summary nodes (label + status dot) | Architecture approved |
| Agent summary nodes (status from existing store) | Architecture approved |
| Missing resource placeholder | Architecture approved |
| Drag and resize | Architecture approved |
| Node position, size, and viewport persistence | Architecture approved |
| Light and dark theme | Architecture approved |
| Accessibility | Architecture approved |

### Milestone 2+ Capabilities (Planned)

| Capability | Milestone |
|------------|-----------|
| Markdown note nodes | M2 |
| Sticky note nodes | M2 |
| Group frames | M2 |
| Visual connections | M2 |
| Undo/redo | M2 |
| Copy/paste | M2 |
| Real shell terminal nodes | M3 |
| Real agent terminal nodes | M3 |
| Terminal input, output, selection, scrollback | M3 |
| File and folder nodes | M4 |
| Diff and pull request nodes | M4 |
| Task nodes | M4 |
| Browser preview/screencast nodes | M4 |
| Terminal-to-note connections | M5 |
| Agent-to-note output | M5 |
| Agent-to-agent handoffs | M5 |
| Reusable agent roles | M6 |
| Canvas templates | M6 |
| Orchestrator/manager agent | M7 |
| Executable workflow edges | M8 |
| Drawing and annotation tools | M9 |

### Target User Experience

In its final form, the Canvas enables users to:

1. **Open and interact with real terminals** directly on the Canvas — type, select, scroll, and search within any terminal node.

2. **Create multiple agent terminals** — run Claude, Codex, Gemini, or other providers simultaneously on the same Canvas.

3. **Create Markdown notes** — write planning documents, architecture decisions, progress logs, and bug reports directly on the Canvas.

4. **Connect agents and terminals to notes** — drag a connection from an agent to a note to establish a channel for structured updates.

5. **Allow agents to append structured updates** to connected notes — progress summaries, error logs, completion reports — without overwriting user content.

6. **Connect one agent to another** for review, testing, or documentation handoffs with structured task descriptions.

7. **Group resources** by worktree, feature, service, task, or pull request using visual frames.

8. **Place files, folders, diffs, and pull requests** on the Canvas as reference nodes.

9. **Draw arrows, boxes, freehand annotations, and architectural sketches** for planning and communication.

10. **Create reusable Canvas templates** — "Feature Development", "Bug Investigation", "Pull Request Review" — that instantiate groups, notes, agent roles, and connections.

11. **Define reusable agent roles** — Architect, Backend Developer, Reviewer, Test Engineer — with provider preferences, system instructions, and tool policies.

12. **Promote an agent to an orchestrator role** that can propose a team, assign worktrees, send structured tasks, and monitor progress.

13. **Execute multi-agent workflows** — implementation → review → test → documentation — with dependency tracking, approval gates, and retry policies.

14. **Inspect execution status** directly on nodes and edges — green for complete, yellow for running, red for failed, gray for waiting.

15. **Restore the complete Canvas** after restarting Orca — all nodes, positions, connections, note content, and agent assignments.

### Orca-Specific Advantages

The Orca Canvas goes beyond Maestri parity by integrating deeply with Orca's unique capabilities:

- **Worktree-native**: Every agent can have a dedicated worktree. Nodes display branch and worktree context. Groups can represent worktrees. Diff nodes derive naturally from worktree state.

- **Git-native workflows**: Commit status, changed files, diffs, pull requests, reviews, checks, and merge readiness are first-class Canvas citizens.

- **Multi-provider agents**: Claude, Codex, Gemini, Cursor, and other providers can coexist on the same Canvas. The model remains provider-neutral.

- **Remote and SSH**: Remote worktrees, remote terminals, SSH status indicators, connection-loss handling, and reconnect work seamlessly with the Canvas.

- **Tasks and Automations**: Task nodes link to agents. Scheduled Canvas workflows integrate with Orca Automations. Mobile monitoring support.

- **Auditable engineering workflow**: Structured handoffs, decision notes, review notes, test evidence, provenance tracking, worktree references, diff references, and full workflow history.

---

## 10. Target Product Completion Criteria

The Canvas should not be considered feature-complete until users can:

1. Create and interact with real terminal nodes on the Canvas
2. Create Markdown notes with full editing and rendering support
3. Connect terminals and agents to notes
4. Allow agents to append safe, auditable updates to notes without overwriting user content
5. Connect agents for structured handoffs (review, test, documentation)
6. Group nodes spatially with frames
7. Create files, diffs, tasks, and worktree references as Canvas nodes
8. Use reusable agent roles with configurable provider and instruction preferences
9. Use Canvas templates to instantiate common workflow patterns
10. Operate an Orchestrator Node that coordinates multi-agent work
11. Execute a controlled workflow graph with dependencies and approval gates
12. Restore the complete Canvas after application restart
13. Use the core features locally and through supported remote runtimes
14. Inspect a complete activity and audit history
15. Use visual annotations and drawing tools for planning

**Milestone 1 completion must not be confused with target product completion.**
