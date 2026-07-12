# Agent Communication Architecture

**Date:** 2026-07-12

---

## Communication Model

```
┌──────────────────────────────────────────────────────────┐
│                     Canvas                                │
│                                                          │
│  Agent Inbox ◄── Messages ──► Agent Outbox              │
│       │                          │                       │
│       │                          │                       │
│  Existing Orca Agent Runtime ────┘                       │
│  (Claude, Codex, Gemini, etc.)                           │
└──────────────────────────────────────────────────────────┘
```

## Message Bus

Messages flow through a structured bus:

1. Agent A posts a message to Agent B's inbox
2. User can view, approve, or reject the message
3. Approved message is delivered via provider adapter
4. Provider adapter sends the message using Orca's existing agent API
5. Receipt is acknowledged
6. Message history is persisted

## Provider Adapter Interface

```typescript
interface AgentCommunicationAdapter {
  provider: string
  sendInstruction(target: AgentReference, message: AgentCanvasMessage): Promise<DeliveryResult>
  sendContext(target: AgentReference, context: ContextPayload): Promise<DeliveryResult>
  requestStatus(target: AgentReference): Promise<AgentStatus>
  cancelTask(target: AgentReference, taskId: string): Promise<void>
  parseStatus(output: string): AgentStatus
}
```

## No Hidden Communication

- Every message is visible in the agent inbox/outbox UI
- Every delivery is approved by the user (configurable)
- Every delivery is audited
- No terminal injection without user visibility
