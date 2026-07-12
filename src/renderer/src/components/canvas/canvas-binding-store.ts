/**
 * Operational Binding Store
 *
 * Manages context, delegation, output, and reporting bindings.
 * Separate from semantic edges — bindings have different lifecycle rules.
 * Persisted per workspace alongside the Canvas document.
 */

import type {
  CanvasOperationalBinding,
  ContextBinding,
  DelegationBinding,
  OutputBinding,
  ReportingBinding,
  ContextMode,
  DelegationPermission,
  OutputMode,
  ApprovalMode,
  ReportMode,
} from '../../../../shared/canvas-agent-types'

class BindingStore {
  private bindings: Map<string, CanvasOperationalBinding> = new Map()
  private onChangeListeners: Set<() => void> = new Set()

  subscribe(listener: () => void): () => void {
    this.onChangeListeners.add(listener)
    return () => this.onChangeListeners.delete(listener)
  }

  private notify(): void {
    for (const listener of this.onChangeListeners) listener()
  }

  // ── CRUD ──

  getAll(): CanvasOperationalBinding[] {
    return Array.from(this.bindings.values())
  }

  getById(id: string): CanvasOperationalBinding | undefined {
    return this.bindings.get(id)
  }

  getByNode(nodeId: string): CanvasOperationalBinding[] {
    return this.getAll().filter(
      (b) =>
        ('sourceNodeId' in b && (b as any).sourceNodeId === nodeId) ||
        ('targetAgentNodeId' in b && (b as any).targetAgentNodeId === nodeId) ||
        ('targetNoteNodeId' in b && (b as any).targetNoteNodeId === nodeId)
    )
  }

  getByKind(kind: string): CanvasOperationalBinding[] {
    return this.getAll().filter((b) => b.kind === kind)
  }

  add(binding: CanvasOperationalBinding): void {
    this.bindings.set(binding.id, binding)
    this.notify()
  }

  update(id: string, updates: Partial<CanvasOperationalBinding>): void {
    const existing = this.bindings.get(id)
    if (existing) {
      this.bindings.set(id, { ...existing, ...updates } as CanvasOperationalBinding)
      this.notify()
    }
  }

  remove(id: string): void {
    this.bindings.delete(id)
    this.notify()
  }

  enable(id: string): void {
    this.update(id, { enabled: true } as any)
  }

  disable(id: string): void {
    this.update(id, { enabled: false } as any)
  }

  // ── Factory ──

  createContextBinding(
    sourceNodeId: string,
    targetAgentNodeId: string,
    contextMode: ContextMode = 'full-content'
  ): ContextBinding {
    return {
      id: `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      kind: 'context',
      sourceNodeId,
      targetAgentNodeId,
      contextMode,
      enabled: true,
      createdAt: new Date().toISOString(),
    }
  }

  createDelegationBinding(
    sourceAgentNodeId: string,
    targetAgentNodeId: string,
    permission: DelegationPermission = 'assign-task',
    requiresUserApproval = true
  ): DelegationBinding {
    return {
      id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      kind: 'delegation',
      sourceAgentNodeId,
      targetAgentNodeId,
      permission,
      requiresUserApproval,
      enabled: true,
      createdAt: new Date().toISOString(),
    }
  }

  createOutputBinding(
    sourceAgentNodeId: string,
    targetNoteNodeId: string,
    outputMode: OutputMode = 'append-progress',
    approvalMode: ApprovalMode = 'always-review'
  ): OutputBinding {
    return {
      id: `out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      kind: 'output',
      sourceAgentNodeId,
      targetNoteNodeId,
      outputMode,
      approvalMode,
      enabled: true,
      createdAt: new Date().toISOString(),
    }
  }

  createReportingBinding(
    sourceAgentNodeId: string,
    targetAgentNodeId: string,
    reportMode: ReportMode = 'status'
  ): ReportingBinding {
    return {
      id: `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      kind: 'reporting',
      sourceAgentNodeId,
      targetAgentNodeId,
      reportMode,
      enabled: true,
      createdAt: new Date().toISOString(),
    }
  }
}

export const bindingStore = new BindingStore()
