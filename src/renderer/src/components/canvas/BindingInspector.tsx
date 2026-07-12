import React, { useState } from 'react'
import { useAppStore } from '@/store'

export const BindingInspector: React.FC = React.memo(() => {
  const bindings = useAppStore((state) => state.canvasOrchestration.bindings)
  const removeCanvasBinding = useAppStore((state) => state.removeCanvasBinding)
  const [selected, setSelected] = useState<string | null>(null)

  const sel = selected ? bindings.find((b) => b.id === selected) : null

  return (
    <div className="flex h-full flex-col" role="region" aria-label="Binding Inspector">
      <div className="border-b border-worktree-sidebar-border px-3 py-2 text-[11px] font-medium text-worktree-sidebar-foreground/40 uppercase tracking-wider">
        Operational Bindings ({bindings.length})
      </div>

      <div className="flex-1 overflow-y-auto">
        {bindings.length === 0 && (
          <div className="p-4 text-center text-[12px] text-worktree-sidebar-foreground/30">
            No operational bindings. Connect nodes to create bindings.
          </div>
        )}

        {bindings.map((b) => (
          <div
            key={b.id}
            onClick={() => setSelected(b.id)}
            className={`mx-2 mt-1 rounded-lg border px-3 py-2 text-[12px] cursor-pointer transition-colors ${
              selected === b.id
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-worktree-sidebar-border bg-worktree-sidebar/50 hover:border-worktree-sidebar-foreground/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <BindingBadge kind={b.kind} />
              <span className="font-medium text-worktree-sidebar-foreground/70">{b.kind}</span>
              <span className={`ml-auto size-2 rounded-full ${b.enabled ? 'bg-green-500' : 'bg-gray-500'}`} aria-label={b.enabled ? 'enabled' : 'disabled'} />
            </div>
            <div className="mt-1 text-[10px] text-worktree-sidebar-foreground/30 font-mono">
              {b.id} · {b.createdAt?.split('T')[0]}
            </div>
          </div>
        ))}
      </div>

      {sel && (
        <div className="border-t border-worktree-sidebar-border p-3">
          <div className="text-[12px] font-medium text-worktree-sidebar-foreground/70">Details</div>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-worktree-sidebar-foreground/5 p-2 text-[10px] text-worktree-sidebar-foreground/50">
            {JSON.stringify(sel, null, 2)}
          </pre>
          <button
            onClick={() => { removeCanvasBinding(sel.id); setSelected(null) }}
            className="mt-2 w-full rounded px-3 py-1.5 text-[12px] text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete Binding
          </button>
        </div>
      )}
    </div>
  )
})
BindingInspector.displayName = 'BindingInspector'

const BindingBadge: React.FC<{ kind: string }> = ({ kind }) => {
  const colors: Record<string, string> = {
    context: 'bg-blue-500/20 text-blue-400',
    delegation: 'bg-purple-500/20 text-purple-400',
    output: 'bg-green-500/20 text-green-400',
    reporting: 'bg-orange-500/20 text-orange-400',
  }
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase ${colors[kind] ?? 'bg-gray-500/20 text-gray-400'}`}>
      {kind}
    </span>
  )
}
