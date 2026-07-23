import React, { useState } from 'react'
import type { TuiAgent } from '../../../../shared/types'

export type TerminalCreationDraft = {
  name: string
  command: string
  cwd: string
  monitorActivity: boolean
  agent?: TuiAgent
}

const PRESETS = [
  { id: 'claude', label: 'Claude Code', command: 'claude', name: 'Claude Code', agent: 'claude' as const },
  { id: 'codex', label: 'Codex', command: 'codex', name: 'Codex', agent: 'codex' as const },
  { id: 'gemini', label: 'Gemini CLI', command: 'gemini', name: 'Gemini CLI', agent: 'gemini' as const },
  { id: 'opencode', label: 'OpenCode', command: 'opencode', name: 'OpenCode', agent: 'opencode' as const },
  { id: 'shell', label: 'Shell', command: '', name: 'Shell', agent: undefined },
] as const

export const NewTerminalDialog: React.FC<{
  kind: 'terminal' | 'agent'
  onCancel: () => void
  onCreate: (draft: TerminalCreationDraft) => void
}> = ({ kind, onCancel, onCreate }) => {
  const initialPreset = PRESETS.find((item) => item.id === (kind === 'agent' ? 'codex' : 'shell')) ?? PRESETS[4]
  const [preset, setPreset] = useState<(typeof PRESETS)[number]['id']>(initialPreset.id)
  const [name, setName] = useState<string>(initialPreset.name)
  const [command, setCommand] = useState<string>(initialPreset.command)
  const [agent, setAgent] = useState<TuiAgent | undefined>(initialPreset.agent)
  const [cwd, setCwd] = useState('')
  const [monitorActivity, setMonitorActivity] = useState(true)

  const choosePreset = (next: (typeof PRESETS)[number]) => {
    setPreset(next.id)
    setName(next.name)
    setCommand(next.command)
    setAgent(next.agent)
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <div className="w-[520px] max-w-full rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label={`New ${kind === 'agent' ? 'Agent' : 'Terminal'}`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-worktree-sidebar-foreground">New {kind === 'agent' ? 'Agent' : 'Terminal'}</h2>
            <p className="mt-0.5 text-[11px] text-worktree-sidebar-foreground/40">Configure the surface you just drew on the canvas.</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-lg text-worktree-sidebar-foreground/40 hover:bg-worktree-sidebar-foreground/10 hover:text-worktree-sidebar-foreground" aria-label="Close new terminal dialog">×</button>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-worktree-sidebar-foreground/40">Quick start</div>
          <div className="grid grid-cols-5 gap-2">
            {PRESETS.map((item) => (
              <button key={item.id} type="button" onClick={() => choosePreset(item)} className={`rounded-lg border px-2 py-3 text-center text-[11px] text-worktree-sidebar-foreground/70 hover:bg-worktree-sidebar-foreground/8 ${preset === item.id ? 'border-blue-400 bg-blue-500/10 text-blue-300' : 'border-worktree-sidebar-border'}`}>
                <span className="mb-1 block text-lg" aria-hidden="true">{item.id === 'shell' ? '>_' : 'AI'}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs text-worktree-sidebar-foreground/60">Terminal name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border border-worktree-sidebar-border bg-transparent px-2.5 py-2 text-sm text-worktree-sidebar-foreground outline-none focus:border-blue-400" /></label>
          <label className="block text-xs text-worktree-sidebar-foreground/60">Command<input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Optional startup command" className="mt-1 w-full rounded-md border border-worktree-sidebar-border bg-transparent px-2.5 py-2 font-mono text-sm text-worktree-sidebar-foreground outline-none focus:border-blue-400" /></label>
          <label className="block text-xs text-worktree-sidebar-foreground/60">Working directory<input value={cwd} onChange={(event) => setCwd(event.target.value)} placeholder="Workspace root by default" className="mt-1 w-full rounded-md border border-worktree-sidebar-border bg-transparent px-2.5 py-2 text-sm text-worktree-sidebar-foreground outline-none focus:border-blue-400" /></label>
          <label className="flex items-start gap-2 text-xs text-worktree-sidebar-foreground/60"><input className="mt-0.5" type="checkbox" checked={monitorActivity} onChange={(event) => setMonitorActivity(event.target.checked)} /><span>Monitor agent activity<span className="mt-0.5 block text-[10px] text-worktree-sidebar-foreground/35">Show live Working, Waiting, Blocked and Done states reported by supported agent hooks.</span></span></label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-xs text-worktree-sidebar-foreground/55 hover:bg-worktree-sidebar-foreground/8">Cancel</button>
          <button type="button" disabled={!name.trim()} onClick={() => onCreate({ name: name.trim(), command, cwd, monitorActivity, agent })} className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Create {kind === 'agent' ? 'Agent' : 'Terminal'}</button>
        </div>
      </div>
    </div>
  )
}

export const NewResourceDialog: React.FC<{
  kind: 'file' | 'folder' | 'browser'
  onCancel: () => void
  onCreate: (draft: { label: string; value: string }) => void
}> = ({ kind, onCancel, onCreate }) => {
  const isBrowser = kind === 'browser'
  const [label, setLabel] = useState(isBrowser ? 'Browser' : kind === 'file' ? 'File' : 'Folder')
  const [value, setValue] = useState(isBrowser ? 'https://' : '')
  const valueLabel = isBrowser ? 'Initial URL' : kind === 'file' ? 'Relative file path' : 'Relative folder path'

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <div className="w-[460px] max-w-full rounded-xl border border-worktree-sidebar-border bg-worktree-sidebar p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label={`New ${kind}`}>
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-[15px] font-semibold text-worktree-sidebar-foreground">New {kind[0].toUpperCase() + kind.slice(1)}</h2><p className="mt-0.5 text-[11px] text-worktree-sidebar-foreground/40">Place this resource in the rectangle you drew.</p></div><button type="button" onClick={onCancel} className="rounded px-2 py-1 text-lg text-worktree-sidebar-foreground/40 hover:bg-worktree-sidebar-foreground/10" aria-label={`Close new ${kind} dialog`}>×</button></div>
        <div className="space-y-3">
          <label className="block text-xs text-worktree-sidebar-foreground/60">Name<input value={label} onChange={(event) => setLabel(event.target.value)} className="mt-1 w-full rounded-md border border-worktree-sidebar-border bg-transparent px-2.5 py-2 text-sm text-worktree-sidebar-foreground outline-none focus:border-blue-400" /></label>
          <label className="block text-xs text-worktree-sidebar-foreground/60">{valueLabel}<input value={value} onChange={(event) => setValue(event.target.value)} placeholder={isBrowser ? 'https://example.com' : 'src/renderer/src'} className="mt-1 w-full rounded-md border border-worktree-sidebar-border bg-transparent px-2.5 py-2 font-mono text-sm text-worktree-sidebar-foreground outline-none focus:border-blue-400" /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-xs text-worktree-sidebar-foreground/55 hover:bg-worktree-sidebar-foreground/8">Cancel</button><button type="button" disabled={!label.trim() || !value.trim() || (isBrowser && value.trim() === 'https://')} onClick={() => onCreate({ label: label.trim(), value: value.trim() })} className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Create {kind}</button></div>
      </div>
    </div>
  )
}
