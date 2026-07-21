import type { Habit } from '../types'
import { toLocalDateKey } from './date'
import { getDefaultHabitCategory, normalizeProductivityCategory } from './productivityCategories'

export const HABITS_VERSION = 3
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

const DEFAULT_HABITS = [
  { name: '물 마시기', icon: '💧', category: 'personal' },
  { name: '스트레칭', icon: '🤸', category: 'exercise' },
  { name: '운동', icon: '🏃', category: 'exercise' },
  { name: '독서', icon: '📖', category: 'study' },
  { name: '하루 정리', icon: '📝', category: 'personal' },
]

export const createDefaultHabits = (createdAt = new Date().toISOString()): Habit[] =>
  DEFAULT_HABITS.map(({ name, icon, category }, index) => ({
    id: `default-habit-${index + 1}`,
    name,
    icon,
    category: normalizeProductivityCategory(category),
    repeatDays: [...EVERY_DAY],
    createdAt,
  }))

export const getHabitIcon = (habit: Pick<Habit, 'name' | 'icon'>): string =>
  habit.icon ?? DEFAULT_HABITS.find(item => item.name === habit.name)?.icon ?? '✨'

export const getHabitRepeatDays = (habit: Pick<Habit, 'repeatDays'>): number[] =>
  habit.repeatDays?.length ? habit.repeatDays : EVERY_DAY

export const isHabitScheduled = (
  habit: Pick<Habit, 'repeatDays'>,
  date = new Date(),
): boolean => getHabitRepeatDays(habit).includes(date.getDay())

export const getHabitCreatedDateKey = (habit: Pick<Habit, 'createdAt'>): string | undefined => {
  if (!habit.createdAt) return undefined
  const date = new Date(habit.createdAt)
  return Number.isNaN(date.getTime()) ? undefined : toLocalDateKey(date)
}

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
        icon: getHabitIcon(habit),
        category: habit.category
          ? normalizeProductivityCategory(habit.category)
          : getDefaultHabitCategory(habit.id || legacyHabitId(habit.name, index)),
        repeatDays: [...getHabitRepeatDays(habit)],
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
