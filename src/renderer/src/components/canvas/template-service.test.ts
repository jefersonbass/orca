import { describe, it, expect } from 'vitest'
import { templateService } from './template-service'

describe('templateService', () => {
  it('has built-in templates', () => {
    const templates = templateService.getAll()
    expect(templates.length).toBeGreaterThanOrEqual(3)
  })

  it('can get template by id', () => {
    const tpl = templateService.getById('feature-dev')
    expect(tpl).toBeTruthy()
    expect(tpl?.name).toBe('Feature Development')
  })

  it('instantiates template into nodes and edges', () => {
    const result = templateService.instantiate('feature-dev')
    expect(result.nodes.length).toBeGreaterThan(0)
    expect(result.edges.length).toBeGreaterThan(0)
  })

  it('feature-dev template creates groups, notes, and role nodes', () => {
    const result = templateService.instantiate('feature-dev')
    const types = result.nodes.map((n) => n.type)
    expect(types).toContain('group')
    expect(types).toContain('note')
    expect(types).toContain('terminal-summary')
  })

  it('pr-review template creates reviewer and note nodes', () => {
    const result = templateService.instantiate('pr-review')
    expect(result.nodes.length).toBeGreaterThanOrEqual(2)
    expect(result.edges.length).toBeGreaterThanOrEqual(1)
  })

  it('bug-investigation template creates investigation flow', () => {
    const result = templateService.instantiate('bug-investigation')
    expect(result.nodes.length).toBeGreaterThanOrEqual(5)
  })

  it('returns empty for unknown template', () => {
    const result = templateService.instantiate('nonexistent')
    expect(result.nodes.length).toBe(0)
    expect(result.edges.length).toBe(0)
  })
})
