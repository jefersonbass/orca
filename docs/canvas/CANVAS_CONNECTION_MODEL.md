# Canvas Connection Model

**Date:** 2026-07-11
**Status:** Target specification — not implemented

---

## Connection Categories

Connections are divided into five categories with increasing capabilities and security requirements. Visual and context connections can be implemented early. Output, handoff, and executable connections require dedicated services and permission models.

| Category | Milestone | Security Required | User Approval Required |
|----------|-----------|-----------------|----------------------|
| Visual connections | M2 | No | No |
| Context connections | M5 | Yes (read-only) | No |
| Output connections | M5 | Yes (write) | Yes (configurable) |
| Handoff connections | M5/7 | Yes (structured) | Yes |
| Executable workflow connections | M8 | Yes (full) | Yes (configurable) |

---

## Visual Connections

These organize information but perform no action. They are purely decorative/descriptive.

| Type | Visual Style | Meaning |
|------|-------------|---------|
| Related to | Solid line | General relationship |
| Depends on | Solid line with arrow | Dependency direction |
| Implements | Dashed line | Implementation relationship |
| Documents | Dotted line | Documentation relationship |
| Reviews | Arrow with review icon | Review relationship |
| Tests | Arrow with test icon | Test relationship |
| Belongs to | Line with dot | Membership |
| Preview of | Dashed arrow | Preview relationship |

**Edge data:**

```typescript
interface VisualEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: 'related' | 'depends-on' | 'implements' | 'documents' | 'reviews' | 'tests' | 'belongs-to' | 'preview-of';
  label?: string;
  color?: string;
}
```

**No action is taken when a visual edge is created.** Visual edges are metadata only.

---

## Context Connections

These define what context is available to an agent. A context connection allows the user to send a structured reference to an agent.

| Source | Target | Behavior |
|--------|--------|----------|
| File Node | Agent Node | Attach file path as context |
| Note Node | Agent Node | Attach note content as context |
| Diff Node | Reviewer Agent | Attach diff summary as context |
| Task Node | Developer Agent | Attach task description as context |

**Rules:**
- Context is sent as a structured reference, not raw terminal text
- The user must explicitly trigger the context send or have configured auto-context
- The agent receives the context through the agent's existing tool interface
- No hidden terminal injection

```typescript
interface ContextEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: 'context';
  contextMode: 'manual' | 'auto-on-active';
  allowedContentTypes: ('file' | 'note' | 'diff' | 'task')[];
}
```

---

## Output Connections

These define where agent output is written. An output connection creates a channel from an agent to a note.

| Source | Target | Behavior |
|--------|--------|----------|
| Agent Node | Note Node | Append structured output to note |
| Terminal Node | Note Node | Append command output to note |
| Reviewer Agent | Review Note | Append review findings to note |
| Test Agent | Test Results Note | Append test results to note |

**Supported output modes:**

| Mode | Behavior |
|------|----------|
| `append-progress` | Append status update as new section |
| `append-summary` | Append completion summary |
| `append-decisions` | Append architecture decisions |
| `append-errors` | Append error report |
| `replace-agent-section` | Replace agent-owned section only |

**Safety rules:**
- Human-written text is protected by default (marked with `<!-- user -->` comments or section boundaries)
- Agent writes are timestamped and attributed to the agent identity
- Writes are auditable
- User can approve changes before application (default for first use)
- User can enable auto-append for trusted agents
- No hidden shell command is used to update the note
- Agents use an explicit note service or tool

```typescript
interface OutputEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: 'output';
  mode: 'append-progress' | 'append-summary' | 'append-decisions' | 'append-errors' | 'replace-agent-section';
  trigger: 'manual' | 'on-status-change' | 'on-task-complete' | 'on-error' | 'scheduled';
  requireApproval: boolean;  // default: true
}
```

---

## Handoff Connections

These enable structured agent-to-agent communication.

| Source | Target | Behavior |
|--------|--------|----------|
| Developer Agent | Reviewer Agent | Send code for review |
| Reviewer Agent | Fix Agent | Send review with fix requests |
| Architect Agent | Implementation Agent | Send architecture spec for implementation |

**Handoff data:**

```typescript
interface HandoffMessage {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  type: 'review' | 'implement' | 'test' | 'document';
  taskDescription: string;
  attachments: {
    worktreeId?: string;
    filePaths?: string[];
    diffRef?: string;
    taskRef?: string;
    noteRef?: string;
  };
  allowedActions: ('read-files' | 'write-notes' | 'create-branches' | 'create-prs')[];
  requireApproval: boolean;
  createdAt: number;
}
```

**Safety rules:**
- All handoffs require user approval (configurable)
- Rate limits prevent message storms (max 10 handoffs/min per edge)
- Recursion limits prevent A→B→A chains
- Cycle detection
- Cancellation support
- Timeout (default 5 minutes per handoff)
- Full audit trail

---

## Executable Workflow Connections

These define automated triggers between nodes. They remain disabled until the dedicated orchestration service is implemented.

| Trigger | Behavior |
|---------|----------|
| On upstream completion | Start downstream node when upstream finishes |
| On tests pass | Execute next step |
| On review approved | Merge or deploy |
| On failure | Retry or notify |
| Manual approval | Pause until approved |
| Scheduled | Execute at specified time |

**Safety rules:**
- Permission model — user must explicitly enable executable edges
- Cycle detection
- Recursion limits
- Cost limits (max agent invocations per workflow)
- Timeouts
- Approval nodes (pause and wait for user)
- Kill switch (stop all running workflows)
- Full audit trail

```typescript
interface ExecutableEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: 'executable';
  trigger: 'on-complete' | 'on-success' | 'on-failure' | 'manual-approval' | 'scheduled';
  condition?: {
    field: string;
    operator: 'eq' | 'neq' | 'contains';
    value: string;
  };
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  timeoutMs: number;
  requireApproval: boolean;
}
```

**Executable edges are NOT implemented in Milestones 1-6. Their implementation requires a dedicated orchestration service (Milestone 8).**
