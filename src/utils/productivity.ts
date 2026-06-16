import type { Counters, Habit, ScheduledTask, Todo, TodoDailyResult } from '../types'
import { getCounterDisplayValue } from './counters'
import { isHabitScheduled } from './habits'
import { toLocalDateKey } from './date'

const SCORE_WEIGHTS = {
  todo: 40,
  habit: 30,
  scheduled: 15,
  focus: 15,
}

const FOCUS_TARGET = 4

export interface ProductivityScore {
  date: string
  score: number
  parts: {
    todo: number | null
    habit: number | null
    scheduled: number | null
    focus: number | null
  }
}

interface ProductivityInput {
  date: string
  todos: Todo[]
  todoHistory: TodoDailyResult[]
  habits: Habit[]
  habitHistory: Record<string, Record<string, boolean>>
  scheduledTasks: ScheduledTask[]
  counters: Counters
}

const getTodoRate = (input: ProductivityInput): number | null => {
  const today = toLocalDateKey()
  if (input.date === today) {
    const todayTodos = input.todos.filter(todo => !todo.date || todo.date === today)
    if (todayTodos.length === 0) return null
    const done = todayTodos.filter(todo => todo.done).length
    return Math.round((done / todayTodos.length) * 100)
  }

  const saved = input.todoHistory.find(result => result.date === input.date)
  return saved ? saved.completionRate : null
}

const getHabitRate = (input: ProductivityInput): number | null => {
  const date = new Date(`${input.date}T12:00:00`)
  const scheduled = input.habits.filter(habit => isHabitScheduled(habit, date))
  if (scheduled.length === 0) return null

  const record = input.habitHistory[input.date]
  if (!record) return null

  const done = scheduled.filter(habit => record[habit.id]).length
  return Math.round((done / scheduled.length) * 100)
}

const getScheduledRate = (input: ProductivityInput): number | null => {
  const dayTasks = input.scheduledTasks.filter(task => task.date === input.date)
  if (dayTasks.length === 0) return null

  const done = dayTasks.filter(task => task.done).length
  return Math.round((done / dayTasks.length) * 100)
}

const getFocusRate = (input: ProductivityInput): number | null => {
  if (input.date !== toLocalDateKey()) return null

  const focusCounter = input.counters.find(counter => counter.autoKey === 'pomodoro-focus')
  if (!focusCounter) return null

  const sessions = getCounterDisplayValue(focusCounter, input.date)
  return Math.min(100, Math.round((sessions / FOCUS_TARGET) * 100))
}

export const calculateProductivityScore = (input: ProductivityInput): ProductivityScore | null => {
  const parts = {
    todo: getTodoRate(input),
    habit: getHabitRate(input),
    scheduled: getScheduledRate(input),
    focus: getFocusRate(input),
  }

  const weightedParts = Object.entries(parts)
    .filter((entry): entry is [keyof typeof SCORE_WEIGHTS, number] => entry[1] !== null)

  if (weightedParts.length === 0) return null

  const weightTotal = weightedParts.reduce((sum, [key]) => sum + SCORE_WEIGHTS[key], 0)
  const score = Math.round(
    weightedParts.reduce((sum, [key, value]) => sum + value * SCORE_WEIGHTS[key], 0) / weightTotal
  )

  return { date: input.date, score, parts }
}

export const getRecentDateKeys = (days: number, endDate = new Date()): string[] =>
  Array.from({ length: days }, (_, index) => {
    const date = new Date(endDate)
    date.setDate(endDate.getDate() - (days - 1 - index))
    return toLocalDateKey(date)
  })
