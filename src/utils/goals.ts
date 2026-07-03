import { toLocalDateKey } from './date'
import type { Goal, GoalStep, TopGoal } from '../types'

export const createGoalId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const calculateGoalPct = (steps: GoalStep[]): number => {
  if (steps.length === 0) return 0
  return Math.round((steps.filter(step => step.done).length / steps.length) * 100)
}

export const getRemainingSteps = (goal: Goal): number =>
  goal.steps.filter(step => !step.done).length

export const getGoalDueText = (due?: string): string => {
  if (!due) return '마감일 없음'
  const today = new Date()
  const dueDate = new Date(`${due}T12:00:00`)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.ceil((dueDate.getTime() - start.getTime()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}일 지남`
  if (diff === 0) return '오늘 마감'
  return `${diff}일 남음`
}

export const sortPriorityGoals = (goals: Goal[]): Goal[] =>
  [...goals].sort((a, b) => {
    const aDone = a.pct >= 100 || a.status === '완료'
    const bDone = b.pct >= 100 || b.status === '완료'
    if (aDone !== bDone) return aDone ? 1 : -1

    const aDue = a.due ? new Date(`${a.due}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER
    const bDue = b.due ? new Date(`${b.due}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER
    if (aDue !== bDue) return aDue - bDue

    if (a.pct !== b.pct) return a.pct - b.pct

    return getRemainingSteps(b) - getRemainingSteps(a)
  })

export const normalizeTopGoalsForToday = (
  topGoals: TopGoal[] = [],
  today = toLocalDateKey(),
): TopGoal[] =>
  topGoals.map(goal => goal.date ? goal : { ...goal, date: today })

export const getTodayTopGoals = (
  topGoals: TopGoal[] = [],
  today = toLocalDateKey(),
): TopGoal[] =>
  topGoals.filter(goal => (goal.date ?? today) === today)
