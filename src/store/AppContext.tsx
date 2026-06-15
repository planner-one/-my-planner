import {
  createContext, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react'
import { loadUserData, saveUserData } from '../services/userService'
import { useAuth } from './AuthContext'
import { toLocalDateKey } from '../utils/date'
import type {
  Todo, TodoDailyResult, Habit, Task, Goal, Project, TopGoal, Counters, Review,
  Note, WeekTask, ScheduledTask, JournalEntry, LayoutItem, UserData,
} from '../types'

interface AppContextValue {
  dataLoaded: boolean
  todos: Todo[];             setTodos: React.Dispatch<React.SetStateAction<Todo[]>>
  todoHistory: TodoDailyResult[]
  setTodoHistory: React.Dispatch<React.SetStateAction<TodoDailyResult[]>>
  habits: Habit[];           setHabits: React.Dispatch<React.SetStateAction<Habit[]>>
  habitHistory: Record<string, Record<string, boolean>>
  setHabitHistory: React.Dispatch<React.SetStateAction<Record<string, Record<string, boolean>>>>
  tasks: Task[];             setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  goals: Goal[];             setGoals: React.Dispatch<React.SetStateAction<Goal[]>>
  projects: Project[];       setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  topGoals: TopGoal[];       setTopGoals: React.Dispatch<React.SetStateAction<TopGoal[]>>
  energy: number;            setEnergy: React.Dispatch<React.SetStateAction<number>>
  counters: Counters;        setCounters: React.Dispatch<React.SetStateAction<Counters>>
  quickMemo: string;         setQuickMemo: React.Dispatch<React.SetStateAction<string>>
  review: Review;            setReview: React.Dispatch<React.SetStateAction<Review>>
  notes: Note[];             setNotes: React.Dispatch<React.SetStateAction<Note[]>>
  weekTasks: Record<string, WeekTask[]>
  setWeekTasks: React.Dispatch<React.SetStateAction<Record<string, WeekTask[]>>>
  timeBlockData: Record<string, Record<string, string>>
  setTimeBlockData: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>
  scheduledTasks: ScheduledTask[]
  setScheduledTasks: React.Dispatch<React.SetStateAction<ScheduledTask[]>>
  journal: JournalEntry[];   setJournal: React.Dispatch<React.SetStateAction<JournalEntry[]>>
  chartHistory: number[];    setChartHistory: React.Dispatch<React.SetStateAction<number[]>>
  dashboardLayout: LayoutItem[]
  setDashboardLayout: React.Dispatch<React.SetStateAction<LayoutItem[]>>
  dashboardActive: string[]
  setDashboardActive: React.Dispatch<React.SetStateAction<string[]>>
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
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitHistory, setHabitHistory] = useState<Record<string, Record<string, boolean>>>({})
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [topGoals, setTopGoals] = useState<TopGoal[]>([])
  const [energy, setEnergy] = useState<number>(0)
  const [counters, setCounters] = useState<Counters>({ f: 0, w: 0, fDate: '' })
  const [quickMemo, setQuickMemo] = useState<string>('')
  const [review, setReview] = useState<Review>({ r1: '', r2: '', r3: '' })
  const [notes, setNotes] = useState<Note[]>([])
  const [weekTasks, setWeekTasks] = useState<Record<string, WeekTask[]>>({})
  const [timeBlockData, setTimeBlockData] = useState<Record<string, Record<string, string>>>({})
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([])
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [chartHistory, setChartHistory] = useState<number[]>([])
  const [dashboardLayout, setDashboardLayout] = useState<LayoutItem[]>([])
  const [dashboardActive, setDashboardActive] = useState<string[]>([])
  const [nickname, setNickname] = useState<string>('')
  const [dataLoaded, setDataLoaded] = useState<boolean>(false)
  const [currentDate, setCurrentDate] = useState(toLocalDateKey)

  const isLoadingRef = useRef(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentUidRef = useRef<string | null>(null)
  const currentDataRef = useRef<UserData>({})

  useEffect(() => {
    currentDataRef.current = sanitize({
      todos, todoHistory, habits, habitHistory, habitsVersion: 2,
      tasks, goals, projects, topGoals,
      energy, counters, quickMemo, review,
      notes, weekTasks, timeBlockData, scheduledTasks,
      journal, chartHistory,
      dashboardLayout, dashboardActive,
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

    loadUserData(user.uid).then(d => {
      if (d) {
        if (d.todos) setTodos(d.todos)
        if (d.todoHistory) setTodoHistory(d.todoHistory)
        if (d.habits) setHabits(d.habits)
        if (d.habitHistory) setHabitHistory(d.habitHistory)
        if (d.tasks) setTasks(d.tasks)
        if (d.goals) setGoals(d.goals)
        if (d.projects) setProjects(d.projects)
        if (d.topGoals) setTopGoals(d.topGoals)
        if (d.energy != null) setEnergy(d.energy)
        if (d.counters) setCounters(d.counters)
        if (d.quickMemo != null) setQuickMemo(d.quickMemo)
        if (d.review) setReview(d.review)
        if (d.notes) setNotes(d.notes)
        if (d.weekTasks) setWeekTasks(d.weekTasks)
        if (d.timeBlockData) setTimeBlockData(d.timeBlockData)
        if (d.scheduledTasks) setScheduledTasks(d.scheduledTasks)
        if (d.journal) setJournal(d.journal)
        if (d.chartHistory) setChartHistory(d.chartHistory)
        if (d.dashboardLayout) setDashboardLayout(d.dashboardLayout)
        if (d.dashboardActive) setDashboardActive(d.dashboardActive)
        if (d.nickname) setNickname(d.nickname)
        localStorage.setItem('dashboard_cols_v', '2')
      }
      setTimeout(() => {
        isLoadingRef.current = false
        setDataLoaded(true)
      }, 300)
    })
  }, [user?.uid])

  useEffect(() => {
    const now = new Date()
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timer = window.setTimeout(() => setCurrentDate(toLocalDateKey()), nextDay.getTime() - now.getTime() + 1000)
    return () => window.clearTimeout(timer)
  }, [currentDate])

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
      const missing = pastDates.filter(date => !recordedDates.has(date))
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
  }, [currentDate, dataLoaded, todos])

  useEffect(() => {
    if (!user || isLoadingRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (currentUidRef.current) {
        saveUserData(currentUidRef.current, currentDataRef.current)
      }
    }, 1000)
  }, [
    todos, todoHistory, habits, habitHistory, tasks, goals, projects, topGoals,
    energy, counters, quickMemo, review, notes, weekTasks,
    timeBlockData, scheduledTasks, journal, chartHistory,
    dashboardLayout, dashboardActive, nickname,
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
    habits, setHabits,
    habitHistory, setHabitHistory,
    tasks, setTasks,
    goals, setGoals,
    projects, setProjects,
    topGoals, setTopGoals,
    energy, setEnergy,
    counters, setCounters,
    quickMemo, setQuickMemo,
    review, setReview,
    notes, setNotes,
    weekTasks, setWeekTasks,
    timeBlockData, setTimeBlockData,
    scheduledTasks, setScheduledTasks,
    journal, setJournal,
    chartHistory, setChartHistory,
    dashboardLayout, setDashboardLayout,
    dashboardActive, setDashboardActive,
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
