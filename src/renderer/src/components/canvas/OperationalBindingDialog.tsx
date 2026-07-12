import React, { useState } from 'react'
import { bindingStore } from './canvas-binding-store'

type BindingKind = 'context' | 'delegation' | 'output' | 'reporting'

interface OperatonalBindingDialogProps {
  sourceNodeId: string
  targetNodeId: string
  sourceType: string
  targetType: string
  onClose: () => void
  onCreated: () => void
}

export const OperationalBindingDialog: React.FC<OperatonalBindingDialogProps> = ({
  sourceNodeId,
  targetNodeId,
  sourceType,
  targetType,
  onClose,
  onCreated,
}) => {
  const [step, setStep] = useState<'choose' | 'configure' | 'confirm'>('choose')
  const [kind, setKind] = useState<BindingKind | null>(null)
  const [contextMode, setContextMode] = useState<string>('full-content')
  const [approvalMode, setApprovalMode] = useState<string>('always-review')
  const [error, setError] = useState<string | null>(null)

  const validCombinations: Array<{ kind: BindingKind; label: string; from: string; to: string }> = [
    { kind: 'context', label: 'Context', from: 'note,file,task,diff', to: 'agent' },
    { kind: 'delegation', label: 'Delegation', from: 'agent', to: 'agent' },
    { kind: 'output', label: 'Output', from: 'agent', to: 'note,sticky-note' },
    { kind: 'reporting', label: 'Reporting', from: 'agent', to: 'agent' },
  ]

  const isValid = (k: BindingKind): boolean => {
    const combo = validCombinations.find((c) => c.kind === k)
    if (!combo) return false
    const fromOk = combo.from.split(',').includes(sourceType)
    const toOk = combo.to.split(',').includes(targetType)
    return fromOk && toOk
  }

  const handleCreate = () => {
    if (!kind) return
    if (!isValid(kind)) {
      setError(`${sourceType} → ${targetType} is not a valid ${kind} binding`)
      return
    }
    try {
      switch (kind) {
        case 'context':
          bindingStore.createContextBinding(sourceNodeId, targetNodeId, contextMode as any)
          break
        case 'delegation':
          bindingStore.createDelegationBinding(sourceNodeId, targetNodeId)
          break
        case 'output':
          bindingStore.createOutputBinding(sourceNodeId, targetNodeId, 'append-progress', approvalMode as any)
          break
        case 'reporting':
          bindingStore.createReportingBinding(sourceNodeId, targetNodeId)
          break
      }
      onCreated()
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Create operational binding"
    >
      <div className="w-[440px] rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-worktree-sidebar-foreground">Create Operational Binding</h2>
          <button onClick={onClose} className="size-6 rounded text-worktree-sidebar-foreground/30 hover:text-worktree-sidebar-foreground/70" aria-label="Close">✕</button>
        </div>

        {error && (
          <div className="mb-3 rounded bg-red-500/10 px-3 py-2 text-[12px] text-red-400">{error}</div>
        )}

        {step === 'choose' && (
          <div className="space-y-2">
            <div className="text-[12px] text-worktree-sidebar-foreground/40">
              {sourceType} → {targetType}
            </div>
            {validCombinations.map((combo) => {
              const valid = isValid(combo.kind)
              return (
                <button
                  key={combo.kind}
                  onClick={() => { setKind(combo.kind); setStep('configure') }}
                  disabled={!valid}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                    valid
                      ? 'text-worktree-sidebar-foreground/70 hover:bg-worktree-sidebar-foreground/5'
                      : 'cursor-not-allowed text-worktree-sidebar-foreground/20'
                  }`}
                >
                  <BindingIcon kind={combo.kind} />
                  <div>
                    <div className="text-[13px] font-medium">{combo.label}</div>
                    <div className="text-[11px] text-worktree-sidebar-foreground/30">{combo.from} → {combo.to}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {step === 'configure' && kind === 'context' && (
          <div className="space-y-3">
            <div className="text-[12px] font-medium text-worktree-sidebar-foreground/50">Context Delivery Mode</div>
            {['full-content', 'selected-section', 'summary', 'reference-only'].map((mode) => (
              <label key={mode} className="flex items-center gap-2 rounded px-3 py-2 text-[13px] text-worktree-sidebar-foreground/70 cursor-pointer hover:bg-worktree-sidebar-foreground/5">
                <input type="radio" name="contextMode" value={mode} checked={contextMode === mode} onChange={() => setContextMode(mode)} />
                {mode.replace('-', ' ')}
              </label>
            ))}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setStep('choose')} className="px-3 py-1.5 text-[13px] text-worktree-sidebar-foreground/50">Back</button>
              <button onClick={handleCreate} className="rounded-lg bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white">Create Binding</button>
            </div>
          </div>
        )}

        {step === 'configure' && kind === 'output' && (
          <div className="space-y-3">
            <div className="text-[12px] font-medium text-worktree-sidebar-foreground/50">Approval Mode</div>
            {['always-review', 'auto-append-agent-section'].map((mode) => (
              <label key={mode} className="flex items-center gap-2 rounded px-3 py-2 text-[13px] text-worktree-sidebar-foreground/70 cursor-pointer hover:bg-worktree-sidebar-foreground/5">
                <input type="radio" name="approvalMode" value={mode} checked={approvalMode === mode} onChange={() => setApprovalMode(mode)} />
                {mode.replace('-', ' ')}
              </label>
            ))}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setStep('choose')} className="px-3 py-1.5 text-[13px] text-worktree-sidebar-foreground/50">Back</button>
              <button onClick={handleCreate} className="rounded-lg bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white">Create Binding</button>
            </div>
          </div>
        )}

        {kind && (kind === 'delegation' || kind === 'reporting') && (
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setStep('choose')} className="px-3 py-1.5 text-[13px] text-worktree-sidebar-foreground/50">Back</button>
            <button onClick={handleCreate} className="rounded-lg bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white">Create Binding</button>
          </div>
        )}
      </div>
    </div>
  )
}

const BindingIcon: React.FC<{ kind: string }> = ({ kind }) => {
  const styles: Record<string, { icon: string; bg: string }> = {
    context: { icon: '📄', bg: 'bg-blue-500/10' },
    delegation: { icon: '➡️', bg: 'bg-purple-500/10' },
    output: { icon: '📝', bg: 'bg-green-500/10' },
    reporting: { icon: '📊', bg: 'bg-orange-500/10' },
  }
  const s = styles[kind] ?? { icon: '🔗', bg: 'bg-gray-500/10' }
  return (
    <span className={`flex size-8 items-center justify-center rounded-lg ${s.bg}`} aria-hidden="true">
      {s.icon}
    </span>
  )
}
