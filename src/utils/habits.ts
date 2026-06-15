import type { Habit } from '../types'

export const HABITS_VERSION = 3

const DEFAULT_HABIT_NAMES = [
  '물 마시기',
  '스트레칭',
  '운동',
  '독서',
  '하루 정리',
]

export const createDefaultHabits = (createdAt = new Date().toISOString()): Habit[] =>
  DEFAULT_HABIT_NAMES.map((name, index) => ({
    id: `default-habit-${index + 1}`,
    name,
    createdAt,
  }))

export const createHabitId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `habit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const legacyHabitId = (name: string, index: number): string => {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  }
  return `legacy-habit-${index + 1}-${Math.abs(hash)}`
}

export const migrateHabits = (
  rawHabits: Array<Partial<Habit> & { name: string }>,
  rawHistory: Record<string, Record<string, boolean>>,
  habitsInitialized?: boolean,
): {
  habits: Habit[]
  habitHistory: Record<string, Record<string, boolean>>
  initializedDefaults: boolean
} => {
  const createdAt = new Date().toISOString()
  const shouldInitializeDefaults = habitsInitialized !== true && rawHabits.length === 0
  const habits = shouldInitializeDefaults
    ? createDefaultHabits(createdAt)
    : rawHabits.map((habit, index) => ({
        id: habit.id || legacyHabitId(habit.name, index),
        name: habit.name,
        createdAt: habit.createdAt || createdAt,
      }))

  const idByName = new Map(habits.map(habit => [habit.name, habit.id]))
  const habitHistory = Object.fromEntries(
    Object.entries(rawHistory).map(([date, record]) => {
      const migratedRecord = Object.fromEntries(
        Object.entries(record).map(([key, done]) => [idByName.get(key) ?? key, done])
      )
      const completeRecord = Object.fromEntries(
        habits.map(habit => [habit.id, migratedRecord[habit.id] ?? false])
      )
      return [date, { ...completeRecord, ...migratedRecord }]
    })
  )

  return { habits, habitHistory, initializedDefaults: shouldInitializeDefaults }
}
