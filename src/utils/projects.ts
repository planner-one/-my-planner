import type { Project, GoalStep } from '../types'

export const createProjectId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const calculateProjectPct = (steps: GoalStep[]): number => {
  if (steps.length === 0) return 0
  return Math.round((steps.filter(step => step.done).length / steps.length) * 100)
}

export const getRemainingProjectSteps = (project: Project): number =>
  (project.steps ?? []).filter(step => !step.done).length

export const getProjectDueText = (due?: string): string => {
  if (!due) return '마감일 없음'
  const today = new Date()
  const dueDate = new Date(`${due}T12:00:00`)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.ceil((dueDate.getTime() - start.getTime()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}일 지남`
  if (diff === 0) return '오늘 마감'
  return `${diff}일 남음`
}

export const sortProjects = (projects: Project[]): Project[] =>
  [...projects].sort((a, b) => {
    const aDone = a.status === '완료'
    const bDone = b.status === '완료'
    if (aDone !== bDone) return aDone ? 1 : -1

    const aDue = a.due ? new Date(`${a.due}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER
    const bDue = b.due ? new Date(`${b.due}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER
    if (aDue !== bDue) return aDue - bDue

    if (a.pct !== b.pct) return a.pct - b.pct

    return getRemainingProjectSteps(b) - getRemainingProjectSteps(a)
  })
