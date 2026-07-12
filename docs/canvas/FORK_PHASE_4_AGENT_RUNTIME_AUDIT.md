# Fork Phase 4 — Agent Runtime Audit

**Date:** 2026-07-12

---

## Agent Runtime Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| `agentStatusByPaneKey` | Zustand store slice | Real-time agent status keyed by `paneKey` |
| `AgentStatusEntry` | `shared/agent-status-types.ts` | Agent state, prompt, type, timestamps |
| `setAgentStatus` | Store action | Update agent status |
| `AgentStatusState` | `'working' | 'blocked' | 'waiting' | 'done'` | Agent lifecycle states |

## Agent Identity

| Identifier | Format | Durable? |
|-----------|--------|:--------:|
| `paneKey` | `${tabId}:${leafId}` | Session-level |
| `tabId` | UUID | ✅ Yes |
| `agentSessionId` | Provider-specific | Provider-dependent |
| `provider` | string | ✅ Yes |

## Provider Adapter Architecture

| Provider | Structured API | Terminal Fallback | Status |
|----------|:--------------:|:-----------------:|:------:|
| Any (provider-neutral) | `window.api.pty.write()` | Terminal text delivery | Implemented |

## Operational Binding Store

| Capability | Status |
|-----------|:------:|
| ContextBinding CRUD | ✅ |
| DelegationBinding CRUD | ✅ |
| OutputBinding CRUD | ✅ |
| ReportingBinding CRUD | ✅ |
| Module-level store with subscriber pattern | ✅ |

## Note → Agent → Note Flow

The smallest viable flow uses:
1. `bindingStore.createContextBinding()` — connect note to agent
2. `sendInstruction()` — deliver context via provider adapter
3. Agent processes and produces result
4. `bindingStore.createOutputBinding()` — connect agent to output note
5. Append agent result to note via existing note-insertion-service

## Files Created

| File | Purpose |
|------|---------|
| `shared/canvas-agent-types.ts` | Agent reference, operational bindings, messages, tasks, sessions |
| `canvas-binding-store.ts` | Module-level binding store with CRUD |
| `canvas-provider-adapter.ts` | Provider-neutral message delivery, agent resolution, context payload |

## Remaining Work

| Item | Status |
|------|:------:|
| Operational binding creation UI | Pending |
| Agent inbox/outbox UI panels | Pending |
| Lead Agent coordination panel | Pending |
| Collaboration session state machine | Pending |
| Real Orca app runtime validation | Pending |
| Multi-provider adapter support | Pending |
