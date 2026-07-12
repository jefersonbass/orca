# Orchestrator Node Specification

**Date:** 2026-07-11
**Status:** Target specification — not implemented, Milestone 7

---

## Overview

The Orchestrator Node is the Orca equivalent of a manager or Maestro-style agent. It coordinates multiple agents, worktrees, and tasks within the Canvas.

---

## Capabilities

The Orchestrator Node can:

| Capability | Behavior |
|-----------|----------|
| Inspect available tasks | List tasks from Orca Tasks, GitHub, GitLab, Linear, Jira |
| Propose a team of agents | Suggest agent roles and count based on task scope |
| Create worktrees | Create branches or worktrees for implementation |
| Assign roles | Assign Architect, Developer, Reviewer roles to specific agents |
| Send structured tasks | Create task descriptions with context, files, and acceptance criteria |
| Link agents to notes | Create output connections for progress and decisions |
| Monitor progress | Track agent state, detect blocked agents |
| Request user input | Ask user when decisions are needed |
| Request code review | Send task + diff to reviewer agent |
| Request tests | Send implementation to test agent |
| Request documentation | Send completed work to documentation agent |
| Collect results | Gather completion reports from all agents |
| Produce final summary | Aggregate all results into a decision note |
| Stop/hibernate agents | With approval, stop or hibernate completed agents |
| Preserve audit log | Full history of all actions and decisions |

---

## Safety Constraints

The Orchestrator must **never**:

| Prohibited Action | Reason |
|-------------------|--------|
| Create unbounded agent loops | Must have recursion and depth limits |
| Spawn unlimited agents | Must have max active agent limit |
| Hide costs | Must display estimated usage before executing |
| Bypass permissions | Must go through existing permission system |
| Inject arbitrary commands silently | All actions must be explicit and auditable |
| Merge code without configured approval | Merge gate must respect user settings |
| Delete worktrees without confirmation | Destructive action requires explicit approval |
| Rewrite user notes silently | Note writes must be append-only by default |

---

## Limits

| Limit | Default | Maximum |
|-------|---------|---------|
| Max active agents per orchestrator | 5 | 20 |
| Max delegation depth | 3 | 10 |
| Max tasks per agent | 10 | 50 |
| Max concurrent orchestrators | 2 | 10 |
| Handoffs per minute | 10 | 60 |
| Worktrees per orchestration | 3 | 20 |
| Execution timeout (total) | 30 minutes | 120 minutes |

---

## Structured Task Format

```typescript
interface OrchestratorTask {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  targetAgentRole: string;
  attachments: {
    worktreeId?: string;
    filePaths?: string[];
    diffRef?: string;
    taskRef?: string;
    noteRef?: string;
    specRef?: string;
  };
  dependencies: string[];  // Task IDs that must complete first
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}
```

---

## Orchestration Flow

```
1. User creates Orchestrator Node on Canvas
2. User configures:
   - Available agent providers
   - Max concurrent agents
   - Permission level (auto-approve vs confirm each)
   - Default worktree strategy
3. Orchestrator inspects available tasks
4. Orchestrator proposes team:
   - [User reviews and approves / modifies]
5. Orchestrator creates worktrees
6. Orchestrator assigns tasks to agents
7. Agents execute:
   - Orchestrator monitors progress
   - Orchestrator detects blockers
   - Orchestrator requests user input when needed
8. On completion, orchestrator:
   - Requests review
   - Requests tests
   - Requests documentation
   - Collects results
9. Orchestrator produces final summary
10. User reviews and approves final state
```

---

## Audit Events

| Event | Data |
|-------|------|
| Orchestrator created | Node ID, config |
| Team proposed | Agent roles, count |
| Team approved/rejected | User action |
| Worktree created | Worktree ID, branch |
| Task assigned | Agent ID, task ID |
| Task completed | Agent ID, task ID, summary |
| Task failed | Agent ID, task ID, error |
| Review requested | Reviewer agent, diff ref |
| Review completed | Reviewer agent, result |
| Approval requested | Action type, context |
| Approval granted/denied | User action |
| Workflow completed | Final summary |
| Workflow cancelled | User or timeout reason |
| Error | Error details |

---

## Integration Points

| Orca System | Integration Point |
|-------------|-------------------|
| Agent providers | Create agents via existing agent creation API |
| Worktrees | Create worktrees via existing worktree IPC |
| Tasks | Read/create tasks via existing task bridges |
| Notes | Write to notes via note service (M5) |
| Git | Read diffs, commit status, PR state |
| Permissions | Through existing permission system |
| Automations | Trigger automated workflows |
