import { toLocalDateKey } from './date'
import type { CounterItem, CounterPeriod, Counters } from '../types'

type LegacyCounters = {
  f?: number
  w?: number
  fDate?: string
}

const defaultCounterDefs: Array<Omit<CounterItem, 'value' | 'dateKey' | 'weekKey'>> = [
  { id: 'focus-sessions', name: '집중 세션', unit: '회', period: 'daily', autoKey: 'pomodoro-focus' },
  { id: 'weekly-wins', name: '주간 성과', unit: '개', period: 'weekly' },
  { id: 'daily-exercise', name: '운동', unit: '회', period: 'daily' },
]

export const getWeekKey = (dateKey = toLocalDateKey()): string => {
  const date = new Date(`${dateKey}T12:00:00`)
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + mondayOffset)
  return toLocalDateKey(monday)
}

export const createDefaultCounters = (): Counters => {
  const today = toLocalDateKey()
  const weekKey = getWeekKey(today)
  return defaultCounterDefs.map(counter => ({
    ...counter,
    value: 0,
    dateKey: counter.period === 'daily' ? today : undefined,
    weekKey: counter.period === 'weekly' ? weekKey : undefined,
  }))
}

const isCounterItem = (value: unknown): value is CounterItem => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CounterItem>
  return typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.value === 'number'
    && ['daily', 'weekly', 'total'].includes(candidate.period ?? '')
}

const normalizeCounter = (counter: CounterItem, today: string, weekKey: string): CounterItem => {
  const period: CounterPeriod = ['daily', 'weekly', 'total'].includes(counter.period)
    ? counter.period
    : 'daily'
  return {
    ...counter,
    unit: counter.unit?.trim() || '회',
    period,
    value: Math.max(0, Math.floor(Number(counter.value) || 0)),
    dateKey: period === 'daily' ? counter.dateKey ?? today : undefined,
    weekKey: period === 'weekly' ? counter.weekKey ?? weekKey : undefined,
  }
}

export const migrateCounters = (raw: unknown): Counters => {
  const today = toLocalDateKey()
  const weekKey = getWeekKey(today)

  if (Array.isArray(raw)) {
    const migrated = raw
      .filter(isCounterItem)
      .map(counter => normalizeCounter(counter, today, weekKey))
    const hasFocusCounter = migrated.some(counter => counter.autoKey === 'pomodoro-focus')
    const focusCounter = createDefaultCounters().filter(counter => counter.autoKey === 'pomodoro-focus')
    return [
      ...migrated,
      ...(hasFocusCounter ? [] : focusCounter),
    ]
  }

  const legacy = raw as LegacyCounters | undefined
  if (legacy && typeof legacy === 'object') {
    return createDefaultCounters().map(counter => {
      if (counter.id === 'focus-sessions') {
        return {
          ...counter,
          value: legacy.fDate === today ? Math.max(0, Math.floor(Number(legacy.f) || 0)) : 0,
          dateKey: today,
        }
      }
      if (counter.id === 'weekly-wins') {
        return {
          ...counter,
          value: Math.max(0, Math.floor(Number(legacy.w) || 0)),
          weekKey,
        }
      }
      return counter
    })
  }

  return createDefaultCounters()
}

export const getCounterDisplayValue = (counter: CounterItem, today = toLocalDateKey()): number => {
  if (counter.period === 'daily') return counter.dateKey === today ? counter.value : 0
  if (counter.period === 'weekly') return counter.weekKey === getWeekKey(today) ? counter.value : 0
  return counter.value
}

export const updateCounterValue = (
  counter: CounterItem,
  delta: number,
  today = toLocalDateKey()
): CounterItem => {
  const currentValue = getCounterDisplayValue(counter, today)
  const nextValue = Math.max(0, currentValue + delta)
  if (counter.period === 'daily') return { ...counter, value: nextValue, dateKey: today }
  if (counter.period === 'weekly') return { ...counter, value: nextValue, weekKey: getWeekKey(today) }
  return { ...counter, value: nextValue }
}
