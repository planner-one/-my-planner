import type {
  Counters,
  Goal,
  Habit,
  JournalEntry,
  Project,
  ReviewDailyEntry,
  ScheduledTask,
  Task,
  Todo,
  TodoDailyResult,
  TopGoal,
} from '../types'
import { getCounterDisplayValue } from './counters'
import { isHabitScheduled } from './habits'
import { toLocalDateKey } from './date'

export const SCORE_WEIGHTS = {
  todo: 40,
  habit: 30,
  scheduled: 15,
  focus: 15,
}

export const FOCUS_TARGET = 4

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

export interface ProductivityInput {
  date: string
  todos: Todo[]
  todoHistory: TodoDailyResult[]
  habits: Habit[]
  habitHistory: Record<string, Record<string, boolean>>
  scheduledTasks: ScheduledTask[]
  counters: Counters
}

export type ProductivityActivityStatus = 'done' | 'open' | 'recorded'

export interface ProductivityActivityItem {
  id: string
  title: string
  meta?: string
  status: ProductivityActivityStatus
}

export interface ProductivityActivitySection {
  id: 'todos' | 'habits' | 'scheduled' | 'focus' | 'topGoals' | 'deadlines' | 'timeBlocks' | 'journal' | 'review'
  label: string
  done: number
  total: number
  items: ProductivityActivityItem[]
}

export interface ProductivityDayLog {
  date: string
  score: ProductivityScore | null
  sections: ProductivityActivitySection[]
}

export interface ProductivityDayLogInput extends ProductivityInput {
  tasks: Task[]
  goals: Goal[]
  projects: Project[]
  topGoals: TopGoal[]
  reviewHistory: ReviewDailyEntry[]
  journal: JournalEntry[]
  timeBlockData: Record<string, Record<string, string>>
}

const compact = (values: Array<string | undefined | false | null>) =>
  values.filter((value): value is string => Boolean(value && value.trim()))

const joinMeta = (values: Array<string | undefined | false | null>) =>
  compact(values).join(' · ')

const getDayTodos = (input: Pick<ProductivityInput, 'date' | 'todos' | 'todoHistory'>): Todo[] => {
  const today = toLocalDateKey()
  if (input.date === today) {
    return input.todos.filter(todo => !todo.date || todo.date === today)
  }

  const saved = input.todoHistory.find(result => result.date === input.date)
  return saved?.items ?? input.todos.filter(todo => todo.date === input.date)
}

const getTodoRate = (input: ProductivityInput): number | null => {
  const dayTodos = getDayTodos(input)
  if (dayTodos.length === 0) return null
  const done = dayTodos.filter(todo => todo.done).length
  return Math.round((done / dayTodos.length) * 100)
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

export const getProductivityDayLog = (input: ProductivityDayLogInput): ProductivityDayLog => {
  const score = calculateProductivityScore(input)
  const dateObj = new Date(`${input.date}T12:00:00`)
  const dayTodos = getDayTodos(input)
  const activeHabits = input.habits.filter(habit => isHabitScheduled(habit, dateObj))
  const habitRecord = input.habitHistory[input.date] ?? {}
  const daySchedules = input.scheduledTasks
    .filter(task => task.date === input.date)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title))
  const focusCounter = input.counters.find(counter => counter.autoKey === 'pomodoro-focus')
  const focusSessions = focusCounter ? getCounterDisplayValue(focusCounter, input.date) : 0
  const dayTopGoals = input.topGoals.filter(goal => goal.date ? goal.date === input.date : input.date === toLocalDateKey())
  const dueTasks = input.tasks.filter(task => task.due === input.date)
  const dueGoals = input.goals.filter(goal => goal.due === input.date)
  const dueProjects = input.projects.filter(project => project.due === input.date)
  const blocks = Object.entries(input.timeBlockData[input.date] ?? {})
    .filter(([, value]) => value.trim())
    .sort(([left], [right]) => left.localeCompare(right))
  const journalEntry = input.journal.find(entry => entry.date === input.date)
  const reviewEntry = input.reviewHistory.find(entry => entry.date === input.date)

  const sections: ProductivityActivitySection[] = [
    {
      id: 'todos',
      label: 'Todo',
      done: dayTodos.filter(todo => todo.done).length,
      total: dayTodos.length,
      items: dayTodos.map(todo => ({
        id: todo.id,
        title: todo.text,
        meta: joinMeta([
          todo.category ?? 'work',
          todo.priority,
          todo.carriedToDate ? `${todo.carriedToDate}로 이월` : undefined,
        ]),
        status: todo.done ? 'done' : 'open',
      })),
    },
    {
      id: 'habits',
      label: '루틴',
      done: activeHabits.filter(habit => habitRecord[habit.id]).length,
      total: activeHabits.length,
      items: activeHabits.map(habit => ({
        id: habit.id,
        title: habit.name,
        meta: habit.icon,
        status: habitRecord[habit.id] ? 'done' : 'open',
      })),
    },
    {
      id: 'scheduled',
      label: '예정 작업',
      done: daySchedules.filter(task => task.done).length,
      total: daySchedules.length,
      items: daySchedules.map(task => ({
        id: task.id,
        title: task.title,
        meta: joinMeta([task.time, task.location, task.note]),
        status: task.done ? 'done' : 'open',
      })),
    },
    {
      id: 'focus',
      label: '집중 세션',
      done: focusSessions,
      total: FOCUS_TARGET,
      items: focusSessions > 0
        ? [{
            id: 'focus-sessions',
            title: `집중 세션 ${focusSessions}회`,
            meta: `목표 ${FOCUS_TARGET}회`,
            status: 'recorded',
          }]
        : [],
    },
    {
      id: 'topGoals',
      label: '하루 방향',
      done: dayTopGoals.filter(goal => goal.done).length,
      total: dayTopGoals.length,
      items: dayTopGoals.map(goal => ({
        id: goal.id,
        title: goal.text,
        status: goal.done ? 'done' : 'open',
      })),
    },
    {
      id: 'deadlines',
      label: '마감 작업',
      done: [
        ...dueTasks.filter(task => task.done || task.status === '완료'),
        ...dueGoals.filter(goal => goal.status === '완료' || goal.pct >= 100),
        ...dueProjects.filter(project => project.status === '완료' || project.pct >= 100),
      ].length,
      total: dueTasks.length + dueGoals.length + dueProjects.length,
      items: [
        ...dueTasks.map(task => ({
          id: task.id,
          title: task.name,
          meta: joinMeta(['작업', task.priority, task.status]),
          status: (task.done || task.status === '완료') ? 'done' as const : 'open' as const,
        })),
        ...dueGoals.map(goal => ({
          id: goal.id,
          title: goal.name,
          meta: joinMeta(['목표', goal.area, `${goal.pct}%`]),
          status: (goal.status === '완료' || goal.pct >= 100) ? 'done' as const : 'open' as const,
        })),
        ...dueProjects.map(project => ({
          id: project.id,
          title: project.name,
          meta: joinMeta(['프로젝트', project.status, `${project.pct}%`]),
          status: (project.status === '완료' || project.pct >= 100) ? 'done' as const : 'open' as const,
        })),
      ],
    },
    {
      id: 'timeBlocks',
      label: '시간 블록',
      done: blocks.length,
      total: blocks.length,
      items: blocks.map(([time, value]) => ({
        id: `block-${time}`,
        title: value,
        meta: time,
        status: 'recorded',
      })),
    },
    {
      id: 'journal',
      label: '저널',
      done: journalEntry ? 1 : 0,
      total: journalEntry ? 1 : 0,
      items: journalEntry
        ? [{
            id: `journal-${journalEntry.date}`,
            title: journalEntry.title || journalEntry.content || '저널 기록',
            meta: joinMeta([journalEntry.mood, journalEntry.energy != null ? `에너지 ${journalEntry.energy}` : undefined]),
            status: 'recorded',
          }]
        : [],
    },
    {
      id: 'review',
      label: '하루 마무리',
      done: reviewEntry ? 1 : 0,
      total: reviewEntry ? 1 : 0,
      items: reviewEntry
        ? [{
            id: `review-${reviewEntry.date}`,
            title: compact([reviewEntry.r1, reviewEntry.r2, reviewEntry.r3])[0] ?? '회고 기록',
            meta: '회고',
            status: 'recorded',
          }]
        : [],
    },
  ]

  return { date: input.date, score, sections }
}
