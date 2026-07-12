import type { AgentRole } from '../../../../shared/canvas-template-types'
import { BUILT_IN_ROLES } from '../../../../shared/canvas-template-types'

/**
 * Module-level role library. Roles are data-only definitions.
 * They do not execute, orchestrate, or start agents.
 */
class RoleLibrary {
  private roles: Map<string, AgentRole> = new Map()

  constructor() {
    for (const role of BUILT_IN_ROLES) {
      this.roles.set(role.id, role)
    }
  }

  getAll(): AgentRole[] {
    return Array.from(this.roles.values())
  }

  getById(id: string): AgentRole | undefined {
    return this.roles.get(id)
  }

  add(role: AgentRole): void {
    this.roles.set(role.id, role)
  }

  remove(id: string): void {
    this.roles.delete(id)
  }

  update(id: string, updates: Partial<AgentRole>): void {
    const existing = this.roles.get(id)
    if (existing) {
      this.roles.set(id, { ...existing, ...updates })
    }
  }
}

export const roleLibrary = new RoleLibrary()
