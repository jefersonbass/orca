import { describe, it, expect, beforeEach } from 'vitest'
import {
  formatInsertion,
  appendToNoteContent,
  executeInsertion,
  buildTerminalSource,
  buildAgentSource,
  getInsertionHistory,
  clearInsertionHistory,
} from './note-insertion-service'

// Mock localStorage for test environment
const store: Record<string, string> = {}
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k])
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => { store[key] = val },
      removeItem: (key: string) => { delete store[key] },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
    },
    writable: true,
    configurable: true,
  })
  clearInsertionHistory()
})

describe('formatInsertion', () => {
  it('creates a preview with heading and metadata', () => {
    const source = buildTerminalSource('test-term', 'term-1', 'wt-1')
    const preview = formatInsertion(source, 'npm run build\nsuccess')
    expect(preview.fullContent).toContain('## Terminal Output')
    expect(preview.fullContent).toContain('> Source: test-term')
    expect(preview.fullContent).toContain('> Author: test-term')
    expect(preview.fullContent).toContain('> Worktree: wt-1')
    expect(preview.characterCount).toBeGreaterThan(0)
    expect(preview.lineCount).toBeGreaterThan(0)
  })

  it('includes formatted content in code block', () => {
    const source = buildTerminalSource('test', 't1')
    const preview = formatInsertion(source, 'line1\nline2')
    expect(preview.formattedContent).toContain('```')
    expect(preview.formattedContent).toContain('line1')
    expect(preview.formattedContent).toContain('line2')
  })
})

describe('appendToNoteContent', () => {
  it('appends to existing content with separator', () => {
    const source = buildTerminalSource('test', 't1')
    const preview = formatInsertion(source, 'new output')
    const result = appendToNoteContent('existing content', preview)
    expect(result).toContain('existing content')
    expect(result).toContain('new output')
    expect(result).toContain('---')
  })

  it('does not add separator for empty existing content', () => {
    const source = buildTerminalSource('test', 't1')
    const preview = formatInsertion(source, 'new output')
    const result = appendToNoteContent('', preview)
    expect(result).not.toContain('---')
    expect(result).toContain('new output')
  })

  it('append-only enforcement: does not modify existing content', () => {
    const source = buildTerminalSource('test', 't1')
    const preview = formatInsertion(source, 'append')
    const original = 'user written content'
    const result = appendToNoteContent(original, preview)
    expect(result).toContain(original)
    expect(result).toContain('append')
  })
})

describe('executeInsertion', () => {
  it('creates audit record with all required fields', () => {
    const source = buildTerminalSource('test-term', 'term-1', 'wt-1')
    const preview = formatInsertion(source, 'test output')
    const result = executeInsertion(
      { source, content: 'test output', mode: 'append' },
      preview,
      'note-123'
    )
    expect(result.insertionId).toBeTruthy()
    expect(result.sourceType).toBe('terminal-output')
    expect(result.sourceId).toBe('term-1')
    expect(result.targetNoteId).toBe('note-123')
    expect(result.approvedBy).toBe('user')
    expect(result.timestamp).toBeTruthy()
    expect(result.author).toBe('test-term')
  })

  it('adds entry to insertion history', () => {
    const source = buildTerminalSource('test', 't1')
    const preview = formatInsertion(source, 'output')
    executeInsertion({ source, content: 'output', mode: 'append' }, preview, 'note-1')
    const history = getInsertionHistory()
    expect(history.length).toBe(1)
    expect(history[0].targetNoteId).toBe('note-1')
    expect(history[0].sourceType).toBe('terminal-output')
  })
})

describe('buildTerminalSource', () => {
  it('creates source with correct type', () => {
    const source = buildTerminalSource('my-term', 'term-123', 'wt-abc')
    expect(source.sourceType).toBe('terminal-output')
    expect(source.sourceLabel).toBe('my-term')
    expect(source.sourceId).toBe('term-123')
    expect(source.worktreeId).toBe('wt-abc')
    expect(source.authorType).toBe('user')
  })
})

describe('buildAgentSource', () => {
  it('creates source with provider metadata', () => {
    const source = buildAgentSource('Claude', 'agent-1', 'claude', 'wt-1')
    expect(source.sourceType).toBe('agent-response')
    expect(source.sourceLabel).toContain('Claude')
    expect(source.sourceLabel).toContain('claude')
    expect(source.authorType).toBe('agent')
  })
})
