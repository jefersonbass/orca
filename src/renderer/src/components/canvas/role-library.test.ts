import { describe, it, expect } from 'vitest'
import { roleLibrary } from './role-library'

describe('roleLibrary', () => {
  it('has built-in roles', () => {
    const roles = roleLibrary.getAll()
    expect(roles.length).toBeGreaterThanOrEqual(6)
  })

  it('can get role by id', () => {
    const role = roleLibrary.getById('architect')
    expect(role).toBeTruthy()
    expect(role?.name).toBe('Architect')
  })

  it('can add custom role', () => {
    const role = {
      id: 'custom-1',
      name: 'Custom Role',
      description: 'Test',
      allowedTools: ['read-files'],
      systemInstructions: 'Be helpful',
      createdAt: Date.now(),
    }
    roleLibrary.add(role)
    expect(roleLibrary.getById('custom-1')?.name).toBe('Custom Role')
    roleLibrary.remove('custom-1')
  })

  it('can remove role', () => {
    roleLibrary.add({
      id: 'temp-1',
      name: 'Temp',
      description: 'Temp role',
      allowedTools: [],
      systemInstructions: '',
      createdAt: Date.now(),
    })
    expect(roleLibrary.getById('temp-1')).toBeTruthy()
    roleLibrary.remove('temp-1')
    expect(roleLibrary.getById('temp-1')).toBeUndefined()
  })

  it('returns undefined for unknown role', () => {
    expect(roleLibrary.getById('nonexistent')).toBeUndefined()
  })
})
