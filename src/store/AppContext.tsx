import {
  createContext, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react'
import { loadUserData, saveUserData } from '../services/userService'
import { useAuth } from './AuthContext'
import { toLocalDateKey } from '../utils/date'
import { normalizeTopGoalsForToday } from '../utils/goals'
import { HABITS_VERSION, isHabitScheduled, migrateHabits } from '../utils/habits'
import { createDefaultCounters, migrateCounters } from '../utils/counters'
import { carryIncompleteTodosToDate, syncPastTodoHistory } from '../utils/todos'
import { DEFAULT_UI_SCALE, getUiScaleMetrics, normalizeUiScale } from '../utils/uiScale'
import {
  DEFAULT_CAREER_CATEGORY, DEFAULT_CAREER_STATUS,
  isCareerEventCategory, isCareerEventStatus, syncCareerEventDateFields,
} from '../utils/careerEvents'
import { migratePersonalApplications } from '../utils/personalApplications'
import type {
  Todo, TodoDailyResult, DeletedTodoDailyResult, Habit, Task, Goal, Project, TopGoal, Counters,
  Note, QuickMemoEntry, WeekTask, ScheduledTask, CareerEvent, JournalEntry, LayoutItem, UserData,
  ReviewDailyEntry, PersonalApplication, JobPosting, NotificationPreferences,
} from '../types'

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

interface AppContextValue {
  dataLoaded: boolean
  dataLoadError: string
  saveState: SaveState
  saveError: string
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
  reviewHistory: ReviewDailyEntry[]
  setReviewHistory: React.Dispatch<React.SetStateAction<ReviewDailyEntry[]>>
  notes: Note[];             setNotes: React.Dispatch<React.SetStateAction<Note[]>>
  weekTasks: Record<string, WeekTask[]>
  setWeekTasks: React.Dispatch<React.SetStateAction<Record<string, WeekTask[]>>>
  timeBlockData: Record<string, Record<string, string>>
  setTimeBlockData: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>
  scheduledTasks: ScheduledTask[]
  setScheduledTasks: React.Dispatch<React.SetStateAction<ScheduledTask[]>>
  careerEvents: CareerEvent[]
  setCareerEvents: React.Dispatch<React.SetStateAction<CareerEvent[]>>
  personalApplications: PersonalApplication[]
  setPersonalApplications: React.Dispatch<React.SetStateAction<PersonalApplication[]>>
  jobPostings: JobPosting[]
  setJobPostings: React.Dispatch<React.SetStateAction<JobPosting[]>>
  journal: JournalEntry[];   setJournal: React.Dispatch<React.SetStateAction<JournalEntry[]>>
  chartHistory: number[];    setChartHistory: React.Dispatch<React.SetStateAction<number[]>>
  dashboardLayout: LayoutItem[]
  setDashboardLayout: React.Dispatch<React.SetStateAction<LayoutItem[]>>
  dashboardActive: string[]
  setDashboardActive: React.Dispatch<React.SetStateAction<string[]>>
  uiScale: number
  setUiScale: React.Dispatch<React.SetStateAction<number>>
  nickname: string;          setNickname: React.Dispatch<React.SetStateAction<string>>
  notificationPreferences: NotificationPreferences
  setNotificationPreferences: React.Dispatch<React.SetStateAction<NotificationPreferences>>
  saveWithOverrides: (overrides?: Partial<UserData>) => Promise<void>
  saveNow: () => Promise<void>
  retrySave: () => Promise<void>
  retryLoad: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

const LS_KEYS = ['dashboard_cols_v', 'weather_location', 'theme', 'clock_widget_mode']

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  dailyBriefingEnabled: true,
  dailyBriefingTime: '10:00',
  dailyBriefingChannel: 'codex',
  dailyBriefingScope: 'ownAccount',
  timezone: 'Asia/Seoul',
}

const sanitize = (data: UserData): UserData => JSON.parse(JSON.stringify(data))

const clampPercent = (value: unknown) => {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(100, Math.round(number)))
}

const normalizeText = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const migrateProjects = (projects: UserData['projects'] = []): Project[] =>
  (projects as Array<Partial<Project>>).map((project, index) => ({
    ...project,
    id: project.id ?? `project-${Date.now()}-${index}`,
    name: normalizeText(project.name, '이름 없는 프로젝트'),
    pct: clampPercent(project.pct),
  }))

const migrateCareerEvents = (careerEvents: UserData['careerEvents'] = []): CareerEvent[] =>
  (careerEvents as Array<Partial<CareerEvent>>).map((event, index) => {
    const date = event.date
      ?? event.applicationDeadline
      ?? event.resultDate
      ?? event.operationStartDate
      ?? event.operationEndDate
      ?? toLocalDateKey()
    const migrated = syncCareerEventDateFields({
      ...event,
      id: event.id ?? `career-${Date.now()}-${index}`,
      title: normalizeText(event.title, '제목 없음'),
      category: isCareerEventCategory(event.category) ? event.category : DEFAULT_CAREER_CATEGORY,
      status: isCareerEventStatus(event.status) ? event.status : DEFAULT_CAREER_STATUS,
      date,
    })
    return migrated as CareerEvent
  })

const migrateJobPostings = (items: UserData['jobPostings'] = []): JobPosting[] =>
  (items as Array<Partial<JobPosting>>).map((item, index) => ({
    ...item,
    id: item.id ?? `job-posting-${Date.now()}-${index}`,
    company: normalizeText(item.company, '회사 미정'),
    position: normalizeText(item.position, '포지션 미정'),
    platform: item.platform ?? 'other',
    status: item.status ?? 'saved',
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
  }))

const migrateNotificationPreferences = (
  value: UserData['notificationPreferences'],
): NotificationPreferences => ({
  ...DEFAULT_NOTIFICATION_PREFERENCES,
  ...(value ?? {}),
  dailyBriefingEnabled: value?.dailyBriefingEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.dailyBriefingEnabled,
  dailyBriefingTime: value?.dailyBriefingTime || DEFAULT_NOTIFICATION_PREFERENCES.dailyBriefingTime,
  dailyBriefingChannel: value?.dailyBriefingChannel ?? DEFAULT_NOTIFICATION_PREFERENCES.dailyBriefingChannel,
  dailyBriefingScope: 'ownAccount',
  timezone: value?.timezone || DEFAULT_NOTIFICATION_PREFERENCES.timezone,
})

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
  const [reviewHistory, setReviewHistory] = useState<ReviewDailyEntry[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [weekTasks, setWeekTasks] = useState<Record<string, WeekTask[]>>({})
  const [timeBlockData, setTimeBlockData] = useState<Record<string, Record<string, string>>>({})
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([])
  const [careerEvents, setCareerEvents] = useState<CareerEvent[]>([])
  const [personalApplications, setPersonalApplications] = useState<PersonalApplication[]>([])
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([])
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [chartHistory, setChartHistory] = useState<number[]>([])
  const [dashboardLayout, setDashboardLayout] = useState<LayoutItem[]>([])
  const [dashboardActive, setDashboardActive] = useState<string[]>([])
  const [uiScale, setUiScale] = useState<number>(DEFAULT_UI_SCALE)
  const [nickname, setNickname] = useState<string>('')
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [dataLoaded, setDataLoaded] = useState<boolean>(false)
  const [dataLoadError, setDataLoadError] = useState('')
  const [loadRevision, setLoadRevision] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')
  const [currentDate, setCurrentDate] = useState(toLocalDateKey)

  const isLoadingRef = useRef(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentUidRef = useRef<string | null>(null)
  const currentUserMetaRef = useRef({ displayName: '', email: '', photoURL: '' })
  const currentDataRef = useRef<UserData>({})
  const currentRemoteSavedAtRef = useRef<string | undefined>(undefined)

  const markSaved = () => {
    if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current)
    setSaveError('')
    setSaveState('saved')
    saveStatusTimerRef.current = setTimeout(() => {
      setSaveState(current => current === 'saved' ? 'idle' : current)
      saveStatusTimerRef.current = null
    }, 1800)
  }

  const saveSyncedUserData = async (uid: string, data: UserData) => {
    if (currentUidRef.current === uid) {
      setSaveError('')
      setSaveState('saving')
    }
    try {
      const savedData = await saveUserData(uid, data, currentRemoteSavedAtRef.current)
      if (currentUidRef.current === uid) {
        currentRemoteSavedAtRef.current = savedData._lastSaved
      }
      if (currentUidRef.current === uid) markSaved()
      return savedData
    } catch (error) {
      if (currentUidRef.current === uid) {
        setSaveState('error')
        setSaveError('데이터를 저장하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.')
      }
      throw error
    }
  }

  useEffect(() => () => {
    if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current)
  }, [])

  useEffect(() => {
    const liveUserMeta = {
      displayName: user?.displayName ?? '',
      email: user?.email ?? '',
      photoURL: user?.photoURL ?? '',
    }
    if (currentUidRef.current && currentUidRef.current === user?.uid) {
      currentUserMetaRef.current = liveUserMeta
    }
    const userMeta = currentUidRef.current === user?.uid ? liveUserMeta : currentUserMetaRef.current

    currentDataRef.current = sanitize({
      todos, todoHistory, todoHistoryTrash, todoHistoryDeletedDates,
      habits, habitHistory, habitSavedAt,
      habitsVersion: HABITS_VERSION, habitsInitialized: true,
      tasks, goals, projects, topGoals,
      energy, counters, quickMemo: '', quickMemos, reviewHistory,
      notes, weekTasks, timeBlockData, scheduledTasks, careerEvents,
      personalApplications, jobPostings,
      journal, chartHistory,
      dashboardLayout, dashboardActive,
      uiScale,
      nickname,
      notificationPreferences,
      _lastSaved: new Date().toISOString(),
      _displayName: userMeta.displayName,
      _email: userMeta.email,
      _photoURL: userMeta.photoURL,
    })
  })

  useEffect(() => {
    if (!user) {
      if (saveTimerRef.current) {
        const previousUid = currentUidRef.current
        const previousData = currentDataRef.current
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
        if (previousUid) {
          saveSyncedUserData(previousUid, previousData).catch(console.error)
        }
      }
      currentUidRef.current = null
      currentRemoteSavedAtRef.current = undefined
      currentUserMetaRef.current = { displayName: '', email: '', photoURL: '' }
      setSaveState('idle')
      setSaveError('')
      setDataLoadError('')
      return
    }

    if (saveTimerRef.current) {
      const previousUid = currentUidRef.current
      const previousData = currentDataRef.current
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      if (previousUid && previousUid !== user.uid) {
        saveSyncedUserData(previousUid, previousData).catch(console.error)
      }
    }

    const storedUid = localStorage.getItem('_uid')
    if (storedUid && storedUid !== user.uid) {
      LS_KEYS.forEach(k => localStorage.removeItem(k))
    }
    localStorage.setItem('_uid', user.uid)
    currentUidRef.current = user.uid
    currentRemoteSavedAtRef.current = undefined
    currentUserMetaRef.current = {
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? '',
    }
    const loadingUid = user.uid

    isLoadingRef.current = true
    setDataLoaded(false)
    setDataLoadError('')
    setTodos([])
    setTodoHistory([])
    setTodoHistoryTrash([])
    setTodoHistoryDeletedDates([])
    setHabits([])
    setHabitHistory({})
    setHabitSavedAt({})
    setTasks([])
    setGoals([])
    setProjects([])
    setTopGoals([])
    setEnergy(0)
    setCounters(createDefaultCounters())
    setQuickMemos([])
    setReviewHistory([])
    setNotes([])
    setWeekTasks({})
    setTimeBlockData({})
    setScheduledTasks([])
    setCareerEvents([])
    setPersonalApplications([])
    setJobPostings([])
    setJournal([])
    setChartHistory([])
    setDashboardLayout([])
    setDashboardActive([])
    setUiScale(90)
    setNickname('')
    setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES)

    loadUserData(loadingUid).then(d => {
      if (currentUidRef.current !== loadingUid) return
      currentRemoteSavedAtRef.current = d?._lastSaved

      const migratedHabits = migrateHabits(
        (d?.habits ?? []) as Array<Partial<Habit> & { name: string }>,
        d?.habitHistory ?? {},
        d?.habitsInitialized,
      )

      setTodos(d?.todos ?? [])
      setTodoHistory(d?.todoHistory ?? [])
      setTodoHistoryTrash(d?.todoHistoryTrash ?? [])
      setTodoHistoryDeletedDates(d?.todoHistoryDeletedDates ?? [])
      setHabits(migratedHabits.habits)
      setHabitHistory(migratedHabits.habitHistory)
      setHabitSavedAt(d?.habitSavedAt ?? {})
      setTasks(d?.tasks ?? [])
      setGoals(d?.goals ?? [])
      setProjects(migrateProjects(d?.projects))
      setTopGoals(normalizeTopGoalsForToday(d?.topGoals ?? []))
      setEnergy(d?.energy ?? 0)
      setCounters(migrateCounters(d?.counters))
      if (d?.quickMemos) {
        setQuickMemos(d.quickMemos)
      } else if (d?.quickMemo?.trim()) {
        const migratedAt = d._lastSaved ?? new Date().toISOString()
        setQuickMemos([{
          id: `legacy-memo-${Date.now()}`,
          content: d.quickMemo.trim(),
          createdAt: migratedAt,
          updatedAt: migratedAt,
        }])
      } else {
        setQuickMemos([])
      }
      if (d?.reviewHistory) {
        setReviewHistory(d.reviewHistory)
      } else if (d?.review && (d.review.r1 || d.review.r2 || d.review.r3)) {
        const migratedDate = d._lastSaved ? toLocalDateKey(new Date(d._lastSaved)) : toLocalDateKey()
        setReviewHistory([{
          date: migratedDate,
          r1: d.review.r1, r2: d.review.r2, r3: d.review.r3,
          updatedAt: d._lastSaved ?? new Date().toISOString(),
        }])
      } else {
        setReviewHistory([])
      }
      setNotes(d?.notes ?? [])
      setWeekTasks(d?.weekTasks ?? {})
      setTimeBlockData(d?.timeBlockData ?? {})
      setScheduledTasks(d?.scheduledTasks ?? [])
      setCareerEvents(migrateCareerEvents(d?.careerEvents))
      setPersonalApplications(migratePersonalApplications(d?.personalApplications))
      setJobPostings(migrateJobPostings(d?.jobPostings))
      setJournal(d?.journal ?? [])
      setChartHistory(d?.chartHistory ?? [])
      setDashboardLayout(d?.dashboardLayout ?? [])
      setDashboardActive(d?.dashboardActive ?? [])
      setNickname(d?.nickname ?? '')
      setUiScale(normalizeUiScale(d?.uiScale))
      setNotificationPreferences(migrateNotificationPreferences(d?.notificationPreferences))
      if (d) {
        localStorage.setItem('dashboard_cols_v', '2')
      }
      setTimeout(() => {
        if (currentUidRef.current !== loadingUid) return
        isLoadingRef.current = false
        setDataLoaded(true)
      }, 300)
    }).catch(error => {
      console.error('Planner data load failed.', error)
      if (currentUidRef.current !== loadingUid) return
      isLoadingRef.current = true
      setDataLoaded(false)
      setDataLoadError('플래너 데이터를 불러오지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.')
    })
  }, [loadRevision, user?.uid])

  useEffect(() => {
    const { factor, viewportPercent } = getUiScaleMetrics(uiScale)
    document.documentElement.style.setProperty('--ui-scale-factor', String(factor))
    document.documentElement.style.setProperty('--ui-scale-width', `${viewportPercent}%`)
    document.documentElement.style.setProperty('--ui-scale-height', `${viewportPercent}dvh`)
    document.documentElement.style.setProperty('--app-scale', String(factor))
    document.documentElement.style.setProperty('--app-viewport-height', `${viewportPercent}dvh`)
    document.documentElement.removeAttribute('data-density')
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
    setTodoHistory(previous => syncPastTodoHistory({
      currentDate,
      todos,
      todoHistory: previous,
      todoHistoryTrash,
      todoHistoryDeletedDates,
    }))
  }, [currentDate, dataLoaded, todos, todoHistoryTrash, todoHistoryDeletedDates])

  useEffect(() => {
    if (!dataLoaded) return
    setTodos(previous => carryIncompleteTodosToDate({
      currentDate,
      todos: previous,
      todoHistory,
    }))
  }, [currentDate, dataLoaded, todoHistory])

  useEffect(() => {
    if (!user || !dataLoaded || isLoadingRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (saveStatusTimerRef.current) {
      clearTimeout(saveStatusTimerRef.current)
      saveStatusTimerRef.current = null
    }
    setSaveState('dirty')
    const uid = currentUidRef.current
    const data = currentDataRef.current
    if (!uid) return
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      saveSyncedUserData(uid, data).catch(console.error)
    }, 1000)
  }, [
    todos, todoHistory, todoHistoryTrash, todoHistoryDeletedDates,
    habits, habitHistory, habitSavedAt, tasks, goals, projects, topGoals,
    energy, counters, quickMemos, reviewHistory, notes, weekTasks,
    timeBlockData, scheduledTasks, careerEvents, personalApplications, jobPostings,
    journal, chartHistory,
    dashboardLayout, dashboardActive, uiScale, nickname, notificationPreferences, dataLoaded,
  ])

  const saveWithOverrides = (overrides: Partial<UserData> = {}): Promise<void> => {
    const uid = currentUidRef.current
    if (!uid) return Promise.resolve()
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    return saveSyncedUserData(
      uid,
      sanitize({ ...currentDataRef.current, ...overrides })
    ).then(() => undefined).catch(console.error)
  }

  const saveNow = (): Promise<void> => {
    const uid = currentUidRef.current
    const data = currentDataRef.current
    if (!uid) return Promise.resolve()
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    return Promise.race([
      saveSyncedUserData(uid, data).then(() => undefined),
      new Promise<void>(r => setTimeout(r, 3000)),
    ])
  }

  const retrySave = (): Promise<void> => saveWithOverrides()
  const retryLoad = () => setLoadRevision(revision => revision + 1)

  const value: AppContextValue = {
    dataLoaded,
    dataLoadError,
    saveState,
    saveError,
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
    reviewHistory, setReviewHistory,
    notes, setNotes,
    weekTasks, setWeekTasks,
    timeBlockData, setTimeBlockData,
    scheduledTasks, setScheduledTasks,
    careerEvents, setCareerEvents,
    personalApplications, setPersonalApplications,
    jobPostings, setJobPostings,
    journal, setJournal,
    chartHistory, setChartHistory,
    dashboardLayout, setDashboardLayout,
    dashboardActive, setDashboardActive,
    uiScale, setUiScale,
    nickname, setNickname,
    notificationPreferences, setNotificationPreferences,
    saveWithOverrides,
    saveNow,
    retrySave,
    retryLoad,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
