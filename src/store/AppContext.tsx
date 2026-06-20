import {
  createContext, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react'
import { loadUserData, saveUserData } from '../services/userService'
import { useAuth } from './AuthContext'
import { toLocalDateKey } from '../utils/date'
import { HABITS_VERSION, isHabitScheduled, migrateHabits } from '../utils/habits'
import { createDefaultCounters, migrateCounters } from '../utils/counters'
import type {
  Todo, TodoDailyResult, DeletedTodoDailyResult, Habit, Task, Goal, Project, TopGoal, Counters, Review,
  Note, QuickMemoEntry, WeekTask, ScheduledTask, CareerEvent, JournalEntry, LayoutItem, UserData,
} from '../types'

interface AppContextValue {
  dataLoaded: boolean
  todos: Todo[];             setTodos: React.Dispatch<React.SetStateAction<Todo[]>>
  todoHistory: TodoDailyResult[]
  setTodoHistory: React.Dispatch<React.SetStateAction<TodoDailyResult[]>>
  todoHistoryTrash: DeletedTodoDailyResult[]
  setTodoHistoryTrash: React.Dispatch<React.SetStateAction<DeletedTodoDailyResult[]>>
  todoHistoryDeletedDates: string[]
  setTodoHistoryDeletedDates: React.Dispatch<React.SetStateAction<string[]>>
  habits: Habit[];           setHabits: React.Dispatch<React.SetStateAction<Habit[]>>
  habitHistory: Record<string, Record<string, boolean>>
  setHabitHistory: React.Dispatch<React.SetStateAction<Record<string, Record<string, boolean>>>>
  habitSavedAt: Record<string, string>
  setHabitSavedAt: React.Dispatch<React.SetStateAction<Record<string, string>>>
  tasks: Task[];             setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  goals: Goal[];             setGoals: React.Dispatch<React.SetStateAction<Goal[]>>
  projects: Project[];       setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  topGoals: TopGoal[];       setTopGoals: React.Dispatch<React.SetStateAction<TopGoal[]>>
  energy: number;            setEnergy: React.Dispatch<React.SetStateAction<number>>
  counters: Counters;        setCounters: React.Dispatch<React.SetStateAction<Counters>>
  quickMemos: QuickMemoEntry[]
  setQuickMemos: React.Dispatch<React.SetStateAction<QuickMemoEntry[]>>
  review: Review;            setReview: React.Dispatch<React.SetStateAction<Review>>
  notes: Note[];             setNotes: React.Dispatch<React.SetStateAction<Note[]>>
  weekTasks: Record<string, WeekTask[]>
  setWeekTasks: React.Dispatch<React.SetStateAction<Record<string, WeekTask[]>>>
  timeBlockData: Record<string, Record<string, string>>
  setTimeBlockData: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>
  scheduledTasks: ScheduledTask[]
  setScheduledTasks: React.Dispatch<React.SetStateAction<ScheduledTask[]>>
  careerEvents: CareerEvent[]
  setCareerEvents: React.Dispatch<React.SetStateAction<CareerEvent[]>>
  journal: JournalEntry[];   setJournal: React.Dispatch<React.SetStateAction<JournalEntry[]>>
  chartHistory: number[];    setChartHistory: React.Dispatch<React.SetStateAction<number[]>>
  dashboardLayout: LayoutItem[]
  setDashboardLayout: React.Dispatch<React.SetStateAction<LayoutItem[]>>
  dashboardActive: string[]
  setDashboardActive: React.Dispatch<React.SetStateAction<string[]>>
  uiScale: number
  setUiScale: React.Dispatch<React.SetStateAction<number>>
  nickname: string;          setNickname: React.Dispatch<React.SetStateAction<string>>
  saveWithOverrides: (overrides?: Partial<UserData>) => Promise<void>
  saveNow: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

const LS_KEYS = ['dashboard_cols_v']

const sanitize = (data: UserData): UserData => JSON.parse(JSON.stringify(data))

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [todos, setTodos] = useState<Todo[]>([])
  const [todoHistory, setTodoHistory] = useState<TodoDailyResult[]>([])
  const [todoHistoryTrash, setTodoHistoryTrash] = useState<DeletedTodoDailyResult[]>([])
  const [todoHistoryDeletedDates, setTodoHistoryDeletedDates] = useState<string[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitHistory, setHabitHistory] = useState<Record<string, Record<string, boolean>>>({})
  const [habitSavedAt, setHabitSavedAt] = useState<Record<string, string>>({})
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [topGoals, setTopGoals] = useState<TopGoal[]>([])
  const [energy, setEnergy] = useState<number>(0)
  const [counters, setCounters] = useState<Counters>(() => createDefaultCounters())
  const [quickMemos, setQuickMemos] = useState<QuickMemoEntry[]>([])
  const [review, setReview] = useState<Review>({ r1: '', r2: '', r3: '' })
  const [notes, setNotes] = useState<Note[]>([])
  const [weekTasks, setWeekTasks] = useState<Record<string, WeekTask[]>>({})
  const [timeBlockData, setTimeBlockData] = useState<Record<string, Record<string, string>>>({})
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([])
  const [careerEvents, setCareerEvents] = useState<CareerEvent[]>([])
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [chartHistory, setChartHistory] = useState<number[]>([])
  const [dashboardLayout, setDashboardLayout] = useState<LayoutItem[]>([])
  const [dashboardActive, setDashboardActive] = useState<string[]>([])
  const [uiScale, setUiScale] = useState<number>(90)
  const [nickname, setNickname] = useState<string>('')
  const [dataLoaded, setDataLoaded] = useState<boolean>(false)
  const [currentDate, setCurrentDate] = useState(toLocalDateKey)

  const isLoadingRef = useRef(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentUidRef = useRef<string | null>(null)
  const currentDataRef = useRef<UserData>({})

  useEffect(() => {
    currentDataRef.current = sanitize({
      todos, todoHistory, todoHistoryTrash, todoHistoryDeletedDates,
      habits, habitHistory, habitSavedAt,
      habitsVersion: HABITS_VERSION, habitsInitialized: true,
      tasks, goals, projects, topGoals,
      energy, counters, quickMemo: '', quickMemos, review,
      notes, weekTasks, timeBlockData, scheduledTasks, careerEvents,
      journal, chartHistory,
      dashboardLayout, dashboardActive,
      uiScale,
      nickname,
      _lastSaved: new Date().toISOString(),
      _displayName: user?.displayName ?? '',
      _email: user?.email ?? '',
      _photoURL: user?.photoURL ?? '',
    })
  })

  useEffect(() => {
    if (!user) return

    const storedUid = localStorage.getItem('_uid')
    if (storedUid && storedUid !== user.uid) {
      LS_KEYS.forEach(k => localStorage.removeItem(k))
    }
    localStorage.setItem('_uid', user.uid)
    currentUidRef.current = user.uid

    isLoadingRef.current = true
    setDataLoaded(false)
    setUiScale(90)
    setTodoHistoryTrash([])
    setTodoHistoryDeletedDates([])
    setHabitSavedAt({})
    setQuickMemos([])

    loadUserData(user.uid).then(d => {
      if (d) {
        if (d.todos) setTodos(d.todos)
        if (d.todoHistory) setTodoHistory(d.todoHistory)
        setTodoHistoryTrash(d.todoHistoryTrash ?? [])
        setTodoHistoryDeletedDates(d.todoHistoryDeletedDates ?? [])
        const migratedHabits = migrateHabits(
          (d.habits ?? []) as Array<Partial<Habit> & { name: string }>,
          d.habitHistory ?? {},
          d.habitsInitialized,
        )
        setHabits(migratedHabits.habits)
        setHabitHistory(migratedHabits.habitHistory)
        setHabitSavedAt(d.habitSavedAt ?? {})
        if (d.tasks) setTasks(d.tasks)
        if (d.goals) setGoals(d.goals)
        if (d.projects) setProjects(d.projects)
        if (d.topGoals) setTopGoals(d.topGoals)
        if (d.energy != null) setEnergy(d.energy)
        setCounters(migrateCounters(d.counters))
        if (d.quickMemos) {
          setQuickMemos(d.quickMemos)
        } else if (d.quickMemo?.trim()) {
          const migratedAt = d._lastSaved ?? new Date().toISOString()
          setQuickMemos([{
            id: `legacy-memo-${Date.now()}`,
            content: d.quickMemo.trim(),
            createdAt: migratedAt,
            updatedAt: migratedAt,
          }])
        }
        if (d.review) setReview(d.review)
        if (d.notes) setNotes(d.notes)
        if (d.weekTasks) setWeekTasks(d.weekTasks)
        if (d.timeBlockData) setTimeBlockData(d.timeBlockData)
        if (d.scheduledTasks) setScheduledTasks(d.scheduledTasks)
        setCareerEvents(d.careerEvents ?? [])
        if (d.journal) setJournal(d.journal)
        if (d.chartHistory) setChartHistory(d.chartHistory)
        if (d.dashboardLayout) setDashboardLayout(d.dashboardLayout)
        if (d.dashboardActive) setDashboardActive(d.dashboardActive)
        if (d.nickname) setNickname(d.nickname)
        localStorage.setItem('dashboard_cols_v', '2')
      }
      if (!d) {
        const migratedHabits = migrateHabits([], {}, undefined)
        setHabits(migratedHabits.habits)
        setHabitHistory(migratedHabits.habitHistory)
        setCounters(createDefaultCounters())
      }
      setUiScale(d?.uiScale ?? 90)
      setTimeout(() => {
        isLoadingRef.current = false
        setDataLoaded(true)
      }, 300)
    })
  }, [user?.uid])

  useEffect(() => {
    const scale = Math.min(110, Math.max(80, uiScale)) / 100
    document.documentElement.style.setProperty('--app-scale', String(scale))
    document.documentElement.style.setProperty('--app-viewport-height', `${100 / scale}vh`)
  }, [uiScale])

  useEffect(() => {
    const now = new Date()
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timer = window.setTimeout(() => setCurrentDate(toLocalDateKey()), nextDay.getTime() - now.getTime() + 1000)
    return () => window.clearTimeout(timer)
  }, [currentDate])

  useEffect(() => {
    if (!dataLoaded) return
    setHabitHistory(previous => {
      const date = new Date(`${currentDate}T12:00:00`)
      const activeHabits = habits.filter(habit => isHabitScheduled(habit, date))
      const nextRecord = Object.fromEntries(
        activeHabits.map(habit => [habit.id, previous[currentDate]?.[habit.id] ?? false])
      )
      const currentRecord = previous[currentDate] ?? {}
      if (JSON.stringify(currentRecord) === JSON.stringify(nextRecord)) return previous
      return {
        ...previous,
        [currentDate]: nextRecord,
      }
    })
  }, [currentDate, dataLoaded, habits])

  useEffect(() => {
    if (!dataLoaded) return

    const pastDates = [...new Set(
      todos
        .map(todo => todo.date)
        .filter((date): date is string => Boolean(date && date < currentDate))
    )]

    if (pastDates.length === 0) return

    setTodoHistory(previous => {
      const recordedDates = new Set(previous.map(result => result.date))
      const trashedDates = new Set(todoHistoryTrash.map(result => result.date))
      const permanentlyDeletedDates = new Set(todoHistoryDeletedDates)
      const missing = pastDates.filter(date =>
        !recordedDates.has(date)
        && !trashedDates.has(date)
        && !permanentlyDeletedDates.has(date)
      )
      if (missing.length === 0) return previous

      const savedAt = new Date().toISOString()
      const automaticResults: TodoDailyResult[] = missing.map(date => {
        const items = todos.filter(todo => todo.date === date).map(todo => ({ ...todo }))
        const done = items.filter(todo => todo.done).length
        return {
          date,
          total: items.length,
          done,
          completionRate: items.length === 0 ? 0 : Math.round((done / items.length) * 100),
          savedAt,
          source: 'auto',
          items,
        }
      })

      return [...automaticResults, ...previous].sort((a, b) => b.date.localeCompare(a.date))
    })
  }, [currentDate, dataLoaded, todos, todoHistoryTrash, todoHistoryDeletedDates])

  useEffect(() => {
    if (!user || !dataLoaded || isLoadingRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (currentUidRef.current) {
        saveUserData(currentUidRef.current, currentDataRef.current)
      }
    }, 1000)
  }, [
    todos, todoHistory, todoHistoryTrash, todoHistoryDeletedDates,
    habits, habitHistory, habitSavedAt, tasks, goals, projects, topGoals,
    energy, counters, quickMemos, review, notes, weekTasks,
    timeBlockData, scheduledTasks, careerEvents, journal, chartHistory,
    dashboardLayout, dashboardActive, uiScale, nickname, dataLoaded,
  ])

  const saveWithOverrides = (overrides: Partial<UserData> = {}): Promise<void> => {
    if (!currentUidRef.current) return Promise.resolve()
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    return saveUserData(
      currentUidRef.current,
      sanitize({ ...currentDataRef.current, ...overrides })
    ).catch(console.error)
  }

  const saveNow = (): Promise<void> => {
    if (!currentUidRef.current) return Promise.resolve()
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    return Promise.race([
      saveUserData(currentUidRef.current, currentDataRef.current),
      new Promise<void>(r => setTimeout(r, 3000)),
    ])
  }

  const value: AppContextValue = {
    dataLoaded,
    todos, setTodos,
    todoHistory, setTodoHistory,
    todoHistoryTrash, setTodoHistoryTrash,
    todoHistoryDeletedDates, setTodoHistoryDeletedDates,
    habits, setHabits,
    habitHistory, setHabitHistory,
    habitSavedAt, setHabitSavedAt,
    tasks, setTasks,
    goals, setGoals,
    projects, setProjects,
    topGoals, setTopGoals,
    energy, setEnergy,
    counters, setCounters,
    quickMemos, setQuickMemos,
    review, setReview,
    notes, setNotes,
    weekTasks, setWeekTasks,
    timeBlockData, setTimeBlockData,
    scheduledTasks, setScheduledTasks,
    careerEvents, setCareerEvents,
    journal, setJournal,
    chartHistory, setChartHistory,
    dashboardLayout, setDashboardLayout,
    dashboardActive, setDashboardActive,
    uiScale, setUiScale,
    nickname, setNickname,
    saveWithOverrides,
    saveNow,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
