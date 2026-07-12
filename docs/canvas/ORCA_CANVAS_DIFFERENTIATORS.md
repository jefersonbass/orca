# Orca Canvas Differentiators

**Date:** 2026-07-11
**Status:** Target specification — individual features across milestones

---

## Overview

The Orca Canvas should go beyond direct Maestri parity by integrating deeply with Orca's unique capabilities. These differentiators turn the Canvas from a visual agent organizer into a complete engineering workflow environment.

---

## 1. Worktree-Native Canvas

| Capability | Status | Milestone |
|-----------|--------|-----------|
| Agent nodes display worktree and branch | Planned | M3 |
| Groups automatically represent worktrees | Planned | M2 |
| Diff nodes derive from worktree state | Planned | M4 |
| Review agents compare worktrees | Planned | M5 |
| Orchestrator creates isolated worktrees | Planned | M7 |

**Why this matters:** Every agent in Orca can operate in its own worktree. The Canvas visualizes this naturally — each agent node shows the branch and worktree it's working on. Groups can represent worktrees. Diff nodes derive from worktree state. This makes multi-agent development spatially organized by default.

---

## 2. Git-Native Workflows

| Capability | Status | Milestone |
|-----------|--------|-----------|
| Canvas shows commit status on nodes | Planned | M4 |
| Changed files listed in agent output | Planned | M4 |
| Diffs rendered as Canvas nodes | Planned | M4 |
| Pull requests as Canvas nodes | Planned | M4 |
| Review state visible on edges | Planned | M5 |
| Merge readiness indicator | Planned | M5 |
| CI check status on workflow edges | Planned | M8 |

**Why this matters:** The Canvas doesn't just show agents — it shows engineering state. Diff nodes, PR nodes, and CI status indicators make the Canvas the single view for understanding development progress.

---

## 3. Multi-Provider Agents

| Capability | Status | Milestone |
|-----------|--------|-----------|
| Provider-neutral node model | Architecture validated | M1 |
| Provider icon on agent nodes | Planned | M3 |
| Provider-specific status | Planned | M3 |
| Mixed-provider orchestration | Planned | M7 |

**Why this matters:** Orca supports Claude, Codex, Gemini, Cursor, and other providers. The Canvas is provider-neutral — any agent, regardless of backend, appears as a node with the same interaction patterns.

---

## 4. Remote and SSH Support

| Capability | Status | Milestone |
|-----------|--------|-----------|
| Remote worktrees as Canvas nodes | Planned | M3+ |
| Remote terminals as Canvas nodes | Planned | M3+ |
| SSH connection status indicator | Planned | M3+ |
| Connection-loss handling on nodes | Planned | M3+ |
| Reconnect behavior | Planned | M3+ |
| Resource locality indicator | Planned | M3+ |

**Why this matters:** Orca works with local, SSH, and remote worktrees. The Canvas shows where each resource lives — a terminal running on a remote server, an agent working in an SSH worktree, etc.

---

## 5. Tasks and Automations Integration

| Capability | Status | Milestone |
|-----------|--------|-----------|
| Task nodes linked to agents | Planned | M4 |
| Scheduled Canvas workflows | Planned | M8 |
| Automation-triggered workflows | Planned | M8 |
| Mobile monitoring from Orca Mobile | Planned | M8+ |
| User approval from mobile | Planned | M8+ |

**Why this matters:** Orca already has Tasks and Automations. The Canvas integrates with them — tasks appear as nodes, automations trigger workflows, and users can monitor progress from Orca Mobile.

---

## 6. Auditable Engineering Workflow

| Capability | Status | Milestone |
|-----------|--------|-----------|
| Structured handoffs | Planned | M5 |
| Decision notes | Planned | M5 |
| Review notes with diff context | Planned | M5 |
| Test evidence in notes | Planned | M5 |
| Provenance tracking | Planned | M5+ |
| Worktree references in audit log | Planned | M5+ |
| Diff references in audit log | Planned | M5+ |
| Full workflow history | Planned | M7+ |
| Exportable audit trail | Planned | M8+ |

**Why this matters:** Every action in the Canvas is recorded with context — which agent did what, in which worktree, on which branch, with which diff. This creates a complete engineering record that can be reviewed, inspected, and exported.

---

## 7. Provider-Neutral Orchestration

| Capability | Status | Milestone |
|-----------|--------|-----------|
| Orchestrator works with any provider | Planned | M7 |
| Provider selection per agent role | Planned | M6 |
| Cost-aware orchestrator | Planned | M7+ |
| Provider fallback on failure | Planned | M7+ |

**Why this matters:** Unlike single-provider agent environments, the Orca Orchestrator can assign Claude to architecture, Codex to implementation, and Gemini to testing — all within the same workflow.

---

## Summary

| Differentiator | Impact | Maestri Parity? |
|---------------|--------|----------------|
| Worktree-native | Multiple worktrees visualized on one Canvas | No — Orca advantage |
| Git-native workflows | Diffs, PRs, CI as Canvas nodes | Partial — deeper integration |
| Multi-provider | Mix Claude, Codex, Gemini on one Canvas | No — Orca advantage |
| Remote and SSH | Remote resources on Canvas | No — Orca advantage |
| Tasks and Automations | End-to-end workflow from Canvas | Partial |
| Auditable workflow | Complete engineering record | No — Orca advantage |
| Provider-neutral orchestration | Best provider for each role | No — Orca advantage |
