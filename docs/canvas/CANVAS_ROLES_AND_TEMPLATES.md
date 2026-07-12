# Canvas Roles and Templates

**Date:** 2026-07-11
**Status:** Target specification — not implemented, Milestone 6

---

## Reusable Agent Roles

### Role Definition

```typescript
interface AgentRole {
  /** Unique role identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Role description */
  description: string;

  /** Preferred provider (optional — user can override) */
  preferredProvider?: 'claude' | 'codex' | 'gemini' | 'cursor' | string;

  /** Preferred model within provider */
  preferredModel?: string;

  /** System instructions for this role */
  systemInstructions: string;

  /** Tools this role may use */
  allowedTools: string[];

  /** Default working directory */
  defaultWorkingDirectory?: string;

  /** Worktree strategy */
  worktreeStrategy?: 'existing' | 'create-branch' | 'create-worktree';

  /** Permission policy */
  permissionPolicy?: 'standard' | 'relaxed' | 'restricted';

  /** Default note connections (created with role) */
  defaultNoteConnections?: {
    title: string;
    mode: 'append-progress' | 'append-summary';
  }[];

  /** Completion criteria */
  completionCriteria?: string;
}
```

### Suggested Roles

| Role | Description | Provider | Typical Tools |
|------|-------------|----------|---------------|
| Architect | Designs system architecture, produces specs | Claude, Codex | Read files, write notes, read issues |
| Backend Developer | Implements backend features | Claude, Codex | Read/write files, git, run tests |
| Frontend Developer | Implements frontend features | Claude, Codex | Read/write files, git, preview |
| Reviewer | Reviews code, provides feedback | Claude, Codex | Read files, read diffs, comment |
| Test Engineer | Writes and runs tests | Claude, Codex | Read/write files, run tests |
| Documentation Writer | Writes documentation | Claude | Read files, write notes, write docs |
| Security Reviewer | Reviews security posture | Claude | Read files, read config |
| Product Analyst | Analyzes requirements | Claude | Read issues, write notes |

### Role Creation UX

1. User opens role library from Canvas toolbar
2. Selects from predefined roles
3. Customizes provider, instructions, tools
4. Saves role to project or user scope
5. Drags role onto Canvas to create agent node with role applied

---

## Canvas Templates

### Template Definition

```typescript
interface CanvasTemplate {
  /** Unique template identifier */
  id: string;

  /** Template name */
  name: string;

  /** Template description */
  description: string;

  /** Template category */
  category: 'feature' | 'bug' | 'review' | 'architecture' | 'release' | 'documentation' | 'custom';

  /** Canvas elements to create */
  elements: TemplateElement[];
}

interface TemplateElement {
  type: 'group' | 'note' | 'agent-role' | 'connection' | 'task-placeholder';
  properties: Record<string, unknown>;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}
```

### Suggested Templates

#### Feature Development

Creates:
- Group "Feature: [Name]"
  - Architect Agent (empty note for spec)
  - Backend Agent (empty progress note)
  - Frontend Agent (empty progress note)
  - Review Agent
  - Connections: Architect → Backend, Architect → Frontend, Backend → Review, Frontend → Review
  - Empty note: "Architecture Decisions"

#### Bug Investigation

Creates:
- Group "Bug: [ID]"
  - Investigation Agent
  - Fix Agent
  - Test Agent
  - Connections: Investigation → Fix, Fix → Test
  - Empty note: "Investigation Findings"
  - Empty note: "Root Cause"
  - Empty note: "Fix Summary"

#### Pull Request Review

Creates:
- Group "PR: #[Number]"
  - Reviewer Agent
  - Connections: Diff/PR node → Reviewer
  - Empty note: "Review Notes"
  - Empty note: "Change Requests"

#### Architecture Exploration

Creates:
- Group "Architecture: [Topic]"
  - Architect Agent
  - Decision note
  - Options note
  - Trade-offs note

### Behavior Rules

- Templates must **never automatically start expensive agents** without explicit user approval
- Templates may auto-create groups, notes, and connections
- Agent role assignments are created but agents remain stopped until user launches them
- Scheduled/automated template instantiation requires explicit `Automations` configuration

---

## Priority for Implementation

| Feature | Milestone |
|---------|-----------|
| Agent role library UI | M6 |
| Role definition CRUD | M6 |
| Role application to agent nodes | M6 |
| Canvas template UI | M6 |
| Template instantiation | M6 |
| Template creation/editing | M6+ |
| Project-scoped roles | M6+ |
| User-scoped roles (shared across projects) | Future |
