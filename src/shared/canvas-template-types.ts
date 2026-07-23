// ── Agent Role ──

export interface AgentRole {
  id: string
  name: string
  description: string
  preferredProvider?: string
  preferredModel?: string
  systemInstructions: string
  allowedTools: string[]
  defaultWorktree?: string
  createdAt: number
}

// ── Canvas Template ──

export interface CanvasTemplate {
  id: string
  name: string
  description: string
  category: 'feature' | 'bug' | 'review' | 'architecture' | 'release' | 'documentation'
  elements: TemplateElement[]
  createdAt: number
}

export type TemplateElementType =
  | 'note'
  | 'sticky-note'
  | 'group'
  | 'agent-role'
  | 'connection'
  | 'label'
  | 'rectangle'

export interface TemplateElement {
  type: TemplateElementType
  position: { x: number; y: number }
  size?: { width: number; height: number }
  label?: string
  color?: string
  content?: string
  /** Role ID if type === 'agent-role' */
  roleId?: string
  /** Connection source/target indices into elements[] */
  connection?: { sourceIndex: number; targetIndex: number; relationship: string }
}

// ── Built-in Roles ──

export const BUILT_IN_ROLES: AgentRole[] = [
  {
    id: 'architect',
    name: 'Architect',
    description: 'Designs system architecture and produces specifications',
    preferredProvider: 'claude',
    allowedTools: ['read-files', 'write-notes', 'read-issues'],
    systemInstructions: 'You are a software architect. Focus on high-level design, system boundaries, and trade-off analysis.',
    createdAt: Date.now(),
  },
  {
    id: 'backend-dev',
    name: 'Backend Developer',
    description: 'Implements backend features and services',
    preferredProvider: 'codex',
    allowedTools: ['read-files', 'write-files', 'git', 'run-tests'],
    systemInstructions: 'You are a backend developer. Implement features with clean architecture and test coverage.',
    createdAt: Date.now(),
  },
  {
    id: 'frontend-dev',
    name: 'Frontend Developer',
    description: 'Implements frontend features and components',
    preferredProvider: 'claude',
    allowedTools: ['read-files', 'write-files', 'git', 'run-tests'],
    systemInstructions: 'You are a frontend developer. Build responsive, accessible, and performant UIs.',
    createdAt: Date.now(),
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    description: 'Reviews code and provides structured feedback',
    preferredProvider: 'claude',
    allowedTools: ['read-files', 'read-diffs', 'comment'],
    systemInstructions: 'You are a code reviewer. Review for correctness, performance, security, and maintainability.',
    createdAt: Date.now(),
  },
  {
    id: 'test-engineer',
    name: 'Test Engineer',
    description: 'Writes and runs tests',
    preferredProvider: 'gemini',
    allowedTools: ['read-files', 'write-files', 'run-tests'],
    systemInstructions: 'You are a test engineer. Write unit, integration, and E2E tests. Aim for high coverage.',
    createdAt: Date.now(),
  },
  {
    id: 'docs-writer',
    name: 'Documentation Writer',
    description: 'Writes and maintains documentation',
    preferredProvider: 'claude',
    allowedTools: ['read-files', 'write-notes', 'write-docs'],
    systemInstructions: 'You are a technical writer. Produce clear, well-structured documentation.',
    createdAt: Date.now(),
  },
]

// ── Built-in Templates ──

export const BUILT_IN_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'feature-dev',
    name: 'Feature Development',
    description: 'Architect, backend, frontend, and review workflow for a new feature',
    category: 'feature',
    createdAt: Date.now(),
    elements: [
      { type: 'group', position: { x: 0, y: 0 }, label: 'Feature', color: '#3b82f6' },
      { type: 'agent-role', position: { x: 40, y: 60 }, label: 'Architect', roleId: 'architect' },
      { type: 'note', position: { x: 40, y: 220 }, label: 'Architecture Decisions', content: '# Architecture Decisions\n\n' },
      { type: 'agent-role', position: { x: 300, y: 60 }, label: 'Backend', roleId: 'backend-dev' },
      { type: 'note', position: { x: 300, y: 220 }, label: 'Backend Progress', content: '# Backend Progress\n\n' },
      { type: 'agent-role', position: { x: 560, y: 60 }, label: 'Frontend', roleId: 'frontend-dev' },
      { type: 'note', position: { x: 560, y: 220 }, label: 'Frontend Progress', content: '# Frontend Progress\n\n' },
      { type: 'agent-role', position: { x: 300, y: 380 }, label: 'Reviewer', roleId: 'reviewer' },
      { type: 'connection', position: { x: 0, y: 0 }, connection: { sourceIndex: 1, targetIndex: 3, relationship: 'implements' } },
      { type: 'connection', position: { x: 0, y: 0 }, connection: { sourceIndex: 1, targetIndex: 5, relationship: 'implements' } },
      { type: 'connection', position: { x: 0, y: 0 }, connection: { sourceIndex: 3, targetIndex: 7, relationship: 'reviews' } },
      { type: 'connection', position: { x: 0, y: 0 }, connection: { sourceIndex: 5, targetIndex: 7, relationship: 'reviews' } },
    ],
  },
  {
    id: 'bug-investigation',
    name: 'Bug Investigation',
    description: 'Investigate, fix, and verify a bug',
    category: 'bug',
    createdAt: Date.now(),
    elements: [
      { type: 'group', position: { x: 0, y: 0 }, label: 'Bug Investigation', color: '#ef4444' },
      { type: 'note', position: { x: 40, y: 60 }, label: 'Bug Report', content: '# Bug\n\n## Steps to Reproduce\n\n## Expected\n\n## Actual\n\n' },
      { type: 'agent-role', position: { x: 40, y: 220 }, label: 'Investigator', roleId: 'reviewer' },
      { type: 'note', position: { x: 300, y: 220 }, label: 'Root Cause', content: '# Root Cause\n\n' },
      { type: 'agent-role', position: { x: 40, y: 380 }, label: 'Fix Agent', roleId: 'backend-dev' },
      { type: 'agent-role', position: { x: 300, y: 380 }, label: 'Test Agent', roleId: 'test-engineer' },
      { type: 'connection', position: { x: 0, y: 0 }, connection: { sourceIndex: 1, targetIndex: 2, relationship: 'reviews' } },
      { type: 'connection', position: { x: 0, y: 0 }, connection: { sourceIndex: 2, targetIndex: 3, relationship: 'documents' } },
      { type: 'connection', position: { x: 0, y: 0 }, connection: { sourceIndex: 3, targetIndex: 4, relationship: 'implements' } },
      { type: 'connection', position: { x: 0, y: 0 }, connection: { sourceIndex: 4, targetIndex: 5, relationship: 'reviews' } },
    ],
  },
  {
    id: 'pr-review',
    name: 'Pull Request Review',
    description: 'Review a pull request with structured feedback',
    category: 'review',
    createdAt: Date.now(),
    elements: [
      { type: 'group', position: { x: 0, y: 0 }, label: 'PR Review', color: '#a855f7' },
      { type: 'agent-role', position: { x: 40, y: 60 }, label: 'Reviewer', roleId: 'reviewer' },
      { type: 'note', position: { x: 300, y: 60 }, label: 'Review Notes', content: '# Review Notes\n\n## Changes\n\n## Issues\n\n## Approval\n\n' },
      { type: 'connection', position: { x: 0, y: 0 }, connection: { sourceIndex: 0, targetIndex: 1, relationship: 'documents' } },
    ],
  },
]
