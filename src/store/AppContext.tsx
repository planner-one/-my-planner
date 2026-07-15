import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react'
import { loadUserData, saveUserData } from '../services/userService'
import { useAuth } from './AuthContext'
import { toLocalDateKey } from '../utils/date'
import { normalizeTopGoalsForToday } from '../utils/goals'
import { HABITS_VERSION, isHabitScheduled, migrateHabits } from '../utils/habits'
import { createDefaultCounters, migrateCounters } from '../utils/counters'
import { carryIncompleteTodosToDate, syncPastTodoHistory } from '../utils/todos'
import {
  DEFAULT_CAREER_CATEGORY, DEFAULT_CAREER_STATUS,
  createCareerCategoryMilestones, isCareerEventCategory, isCareerEventStatus, syncCareerEventDateFields,
} from '../utils/careerEvents'
import { detectJobPlatform, normalizeJobUrl } from '../utils/jobPostingDraft'
import { buildStarterDashboard, resolveInitialOnboardingState } from '../utils/onboarding'
import { mergeOnboardingState, rebaseUserDataAfterSave } from '../utils/userDataMerge'
import type {
  Todo, TodoDailyResult, DeletedTodoDailyResult, Habit, Task, Goal, Project, TopGoal, Counters,
  Note, QuickMemoEntry, WeekTask, ScheduledTask, CareerEvent, JournalEntry, LayoutItem, UserData,
  ReviewDailyEntry, PersonalApplication, JobPosting, NotificationPreferences,
  OnboardingFirstEntry, OnboardingPurpose, OnboardingState,
} from '../types'

type OnboardingMode = 'setup' | 'guide'

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
  onboarding: OnboardingState | null
  onboardingOpen: boolean
  onboardingMode: OnboardingMode
  openOnboardingGuide: () => void
  closeOnboardingGuide: () => void
  selectOnboardingPurpose: (purpose: OnboardingPurpose) => void
  completeOnboarding: (entry: OnboardingFirstEntry) => Promise<void>
  skipOnboarding: (purpose?: OnboardingPurpose) => Promise<void>
  dashboardEditRequestKey: number
  requestDashboardEdit: () => void
  consumeDashboardEditRequest: () => void
  saveWithOverrides: (overrides?: Partial<UserData>) => Promise<void>
  saveNow: () => Promise<void>
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

const getUserDataFingerprint = (data: UserData): string => {
  const comparable = { ...data }
  delete comparable._lastSaved
  return JSON.stringify(sanitize(comparable))
}

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

const migratePersonalApplications = (items: UserData['personalApplications'] = []): PersonalApplication[] =>
  (items as Array<Partial<PersonalApplication>>).map((item, index) => ({
    ...item,
    id: item.id ?? `personal-application-${Date.now()}-${index}`,
    title: normalizeText(item.title, '이름 없는 신청'),
    type: item.type ?? 'other',
    status: item.status ?? 'interested',
    documents: Array.isArray(item.documents) ? item.documents : [],
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
  }))

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
  const [uiScale, setUiScale] = useState<number>(90)
  const [nickname, setNickname] = useState<string>('')
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>('setup')
  const [dashboardEditRequestKey, setDashboardEditRequestKey] = useState(0)
  const [dataLoaded, setDataLoaded] = useState<boolean>(false)
  const [currentDate, setCurrentDate] = useState(toLocalDateKey)

  const isLoadingRef = useRef(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentUidRef = useRef<string | null>(null)
  const currentUserMetaRef = useRef({ displayName: '', email: '', photoURL: '' })
  const currentDataRef = useRef<UserData>({})
  const remoteSavedAtByUidRef = useRef(new Map<string, string | undefined>())
  const lastSyncedDataByUidRef = useRef(new Map<string, UserData>())
  const queueBaselineDataByUidRef = useRef(new Map<string, UserData>())
  const lastEnqueuedSequenceByUidRef = useRef(new Map<string, number>())
  const saveSequenceRef = useRef(0)
  const sessionGenerationRef = useRef(0)
  const hydratedDataFingerprintRef = useRef<string | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())

  const saveSyncedUserData = (uid: string, data: UserData, forceMerge = false): Promise<UserData> => {
    const sequence = saveSequenceRef.current + 1
    saveSequenceRef.current = sequence
    if (!queueBaselineDataByUidRef.current.has(uid)) {
      queueBaselineDataByUidRef.current.set(
        uid,
        sanitize(lastSyncedDataByUidRef.current.get(uid) ?? data),
      )
    }
    const baseline = queueBaselineDataByUidRef.current.get(uid) ?? data
    lastEnqueuedSequenceByUidRef.current.set(uid, sequence)

    const queuedSave = saveQueueRef.current
      .catch(() => undefined)
      .then(() => {
        const latestSynced = lastSyncedDataByUidRef.current.get(uid)
        const outgoing = latestSynced
          ? rebaseUserDataAfterSave(baseline, data, latestSynced)
          : sanitize(data)
        outgoing.onboarding = mergeOnboardingState(
          latestSynced?.onboarding,
          outgoing.onboarding,
        )
        outgoing._lastSaved = new Date().toISOString()
        return saveUserData(
          uid,
          sanitize(outgoing),
          forceMerge ? undefined : remoteSavedAtByUidRef.current.get(uid),
        )
      })
      .then(savedData => {
        remoteSavedAtByUidRef.current.set(uid, savedData._lastSaved)
        lastSyncedDataByUidRef.current.set(uid, sanitize(savedData))
        if (lastEnqueuedSequenceByUidRef.current.get(uid) === sequence) {
          queueBaselineDataByUidRef.current.set(uid, sanitize(savedData))
        }
        return savedData
      })
      .catch(error => {
        if (lastEnqueuedSequenceByUidRef.current.get(uid) === sequence) {
          const latestSynced = lastSyncedDataByUidRef.current.get(uid)
          if (latestSynced) queueBaselineDataByUidRef.current.set(uid, sanitize(latestSynced))
          else queueBaselineDataByUidRef.current.delete(uid)
        }
        throw error
      })
    saveQueueRef.current = queuedSave.then(() => undefined, () => undefined)
    return queuedSave
  }

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
      onboarding: onboarding ?? undefined,
      _lastSaved: new Date().toISOString(),
      _displayName: userMeta.displayName,
      _email: userMeta.email,
      _photoURL: userMeta.photoURL,
    })
  })

  useEffect(() => {
    sessionGenerationRef.current += 1
    const loadingGeneration = sessionGenerationRef.current

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
      currentUserMetaRef.current = { displayName: '', email: '', photoURL: '' }
      setOnboarding(null)
      setOnboardingOpen(false)
      setOnboardingMode('setup')
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
    currentUserMetaRef.current = {
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? '',
    }
    const loadingUid = user.uid

    isLoadingRef.current = true
    setDataLoaded(false)
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
    setOnboarding(null)
    setOnboardingOpen(false)
    setOnboardingMode('setup')

    const pendingSaves = saveQueueRef.current
    pendingSaves.catch(() => undefined).then(() => loadUserData(loadingUid)).then(d => {
      if (
        currentUidRef.current !== loadingUid
        || sessionGenerationRef.current !== loadingGeneration
      ) return
      if (d?._lastSaved) {
        remoteSavedAtByUidRef.current.set(loadingUid, d._lastSaved)
        lastSyncedDataByUidRef.current.set(loadingUid, sanitize(d))
        queueBaselineDataByUidRef.current.set(loadingUid, sanitize(d))
      } else {
        remoteSavedAtByUidRef.current.delete(loadingUid)
        lastSyncedDataByUidRef.current.delete(loadingUid)
        queueBaselineDataByUidRef.current.delete(loadingUid)
      }
      lastEnqueuedSequenceByUidRef.current.delete(loadingUid)
      const now = new Date().toISOString()
      const loadedOnboarding = resolveInitialOnboardingState(d, now)

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
      setUiScale(d?.uiScale ?? 90)
      setNotificationPreferences(migrateNotificationPreferences(d?.notificationPreferences))
      setOnboarding(loadedOnboarding)
      setOnboardingMode('setup')
      setOnboardingOpen(loadedOnboarding?.version === 1 && loadedOnboarding.status === 'pending')
      if (d) {
        localStorage.setItem('dashboard_cols_v', '2')
      }
      setTimeout(() => {
        if (
          currentUidRef.current !== loadingUid
          || sessionGenerationRef.current !== loadingGeneration
        ) return
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
    const currentFingerprint = getUserDataFingerprint(currentDataRef.current)
    if (hydratedDataFingerprintRef.current === currentFingerprint) {
      hydratedDataFingerprintRef.current = null
      return
    }
    hydratedDataFingerprintRef.current = null
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const uid = currentUidRef.current
    const data = currentDataRef.current
    const generation = sessionGenerationRef.current
    if (!uid) return
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      saveSyncedUserData(uid, data)
        .then(saved => reconcileSavedUserData(uid, generation, data, saved))
        .catch(console.error)
    }, 1000)
  }, [
    todos, todoHistory, todoHistoryTrash, todoHistoryDeletedDates,
    habits, habitHistory, habitSavedAt, tasks, goals, projects, topGoals,
    energy, counters, quickMemos, reviewHistory, notes, weekTasks,
    timeBlockData, scheduledTasks, careerEvents, personalApplications, jobPostings,
    journal, chartHistory,
    dashboardLayout, dashboardActive, uiScale, nickname, notificationPreferences, onboarding, dataLoaded,
  ])

  const hydrateSavedUserData = (saved: UserData) => {
    const migratedHabits = migrateHabits(
      (saved.habits ?? []) as Array<Partial<Habit> & { name: string }>,
      saved.habitHistory ?? {},
      saved.habitsInitialized,
    )
    currentDataRef.current = sanitize(saved)
    setTodos(saved.todos ?? [])
    setTodoHistory(saved.todoHistory ?? [])
    setTodoHistoryTrash(saved.todoHistoryTrash ?? [])
    setTodoHistoryDeletedDates(saved.todoHistoryDeletedDates ?? [])
    setHabits(migratedHabits.habits)
    setHabitHistory(migratedHabits.habitHistory)
    setHabitSavedAt(saved.habitSavedAt ?? {})
    setTasks(saved.tasks ?? [])
    setGoals(saved.goals ?? [])
    setProjects(migrateProjects(saved.projects))
    setTopGoals(normalizeTopGoalsForToday(saved.topGoals ?? []))
    setEnergy(saved.energy ?? 0)
    setCounters(migrateCounters(saved.counters))
    setQuickMemos(saved.quickMemos ?? [])
    setReviewHistory(saved.reviewHistory ?? [])
    setNotes(saved.notes ?? [])
    setWeekTasks(saved.weekTasks ?? {})
    setTimeBlockData(saved.timeBlockData ?? {})
    setScheduledTasks(saved.scheduledTasks ?? [])
    setCareerEvents(migrateCareerEvents(saved.careerEvents))
    setPersonalApplications(migratePersonalApplications(saved.personalApplications))
    setJobPostings(migrateJobPostings(saved.jobPostings))
    setJournal(saved.journal ?? [])
    setChartHistory(saved.chartHistory ?? [])
    setDashboardLayout(saved.dashboardLayout ?? [])
    setDashboardActive(saved.dashboardActive ?? [])
    setUiScale(saved.uiScale ?? 90)
    setNickname(saved.nickname ?? '')
    setNotificationPreferences(migrateNotificationPreferences(saved.notificationPreferences))
    setOnboarding(saved.onboarding ?? null)
    if (saved.onboarding && saved.onboarding.status !== 'pending' && onboardingMode === 'setup') {
      setOnboardingOpen(false)
    }
  }

  const hydrateSavedUserDataWithoutAutosave = (saved: UserData) => {
    hydratedDataFingerprintRef.current = getUserDataFingerprint(saved)
    hydrateSavedUserData(saved)
  }

  const reconcileSavedUserData = (
    uid: string,
    generation: number,
    sent: UserData,
    saved: UserData,
  ) => {
    const isCurrentSession = currentUidRef.current === uid
      && sessionGenerationRef.current === generation
    if (!isCurrentSession) return

    const savedWasMerged = getUserDataFingerprint(saved) !== getUserDataFingerprint(sent)
    if (!savedWasMerged) return

    const localDataUnchanged = getUserDataFingerprint(currentDataRef.current)
      === getUserDataFingerprint(sent)
    if (localDataUnchanged) {
      hydrateSavedUserDataWithoutAutosave(saved)
      return
    }

    const rebased = rebaseUserDataAfterSave(sent, currentDataRef.current, saved)
    hydrateSavedUserData(rebased)
  }

  const saveWithOverridesStrict = async (overrides: Partial<UserData>): Promise<UserData> => {
    const uid = currentUidRef.current
    if (!uid) throw new Error('로그인 계정을 확인할 수 없습니다.')
    const generation = sessionGenerationRef.current
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const baseline = sanitize(currentDataRef.current)
    const payload = sanitize({
      ...baseline,
      ...overrides,
      _lastSaved: new Date().toISOString(),
    })
    const saved = await saveSyncedUserData(uid, payload, true)
    if (
      currentUidRef.current !== uid
      || sessionGenerationRef.current !== generation
    ) {
      throw new Error('저장 중 로그인 계정이 변경되었습니다.')
    }
    const localDataChanged = getUserDataFingerprint(currentDataRef.current)
      !== getUserDataFingerprint(baseline)
    const reconciled = localDataChanged
      ? rebaseUserDataAfterSave(baseline, currentDataRef.current, saved)
      : saved
    if (localDataChanged) {
      hydrateSavedUserData(reconciled)
    } else {
      hydrateSavedUserDataWithoutAutosave(reconciled)
    }
    return reconciled
  }

  const openOnboardingGuide = () => {
    setOnboardingMode('guide')
    setOnboardingOpen(true)
  }

  const closeOnboardingGuide = () => setOnboardingOpen(false)

  const selectOnboardingPurpose = (purpose: OnboardingPurpose) => {
    const updatedAt = new Date().toISOString()
    setOnboarding(current => {
      if (!current || current.version !== 1 || current.status !== 'pending') return current
      if (current.purpose === purpose) return current
      return { ...current, purpose, updatedAt }
    })
  }

  const completeOnboarding = async (entry: OnboardingFirstEntry): Promise<void> => {
    const now = new Date().toISOString()
    const base = currentDataRef.current
    const startedAt = base.onboarding?.startedAt ?? onboarding?.startedAt ?? now
    const entryIdSuffix = currentUidRef.current?.replace(/[^a-zA-Z0-9_-]/g, '')
      || startedAt.replace(/\D/g, '')
      || 'v1'
    const preset = buildStarterDashboard(entry.purpose)
    const shouldApplyPreset = (base.dashboardActive?.length ?? 0) === 0
    const overrides: Partial<UserData> = {
      dashboardActive: shouldApplyPreset ? preset.dashboardActive : base.dashboardActive,
      dashboardLayout: shouldApplyPreset ? preset.dashboardLayout : base.dashboardLayout,
      onboarding: {
        version: 1,
        status: 'completed',
        purpose: entry.purpose,
        startedAt,
        updatedAt: now,
        completedAt: now,
      },
    }

    if (entry.purpose === 'daily') {
      const text = entry.text.trim()
      if (!text) throw new Error('첫 오늘 할 일을 입력해주세요.')
      overrides.todos = [{
        id: `onboarding-todo-${entryIdSuffix}`,
        text,
        done: false,
        priority: 'medium',
        category: entry.category,
        date: toLocalDateKey(),
      }, ...(base.todos ?? [])]
    } else if (entry.purpose === 'workStudy') {
      const name = entry.name.trim()
      if (!name) throw new Error('첫 작업 이름을 입력해주세요.')
      overrides.tasks = [{
        id: `onboarding-task-${entryIdSuffix}`,
        name,
        due: entry.due || undefined,
        type: entry.taskType,
        priority: '보통',
        status: '진행 중',
        done: false,
      }, ...(base.tasks ?? [])]
    } else if (entry.purpose === 'jobSearch') {
      const company = entry.company?.trim() ?? ''
      const position = entry.position?.trim() ?? ''
      const rawUrl = entry.sourceUrl?.trim() ?? ''
      if (!company && !position && !rawUrl) {
        throw new Error('회사, 포지션, 공고 URL 중 하나 이상을 입력해주세요.')
      }
      let sourceUrl = ''
      try {
        sourceUrl = rawUrl ? normalizeJobUrl(rawUrl) : ''
      } catch {
        throw new Error('공고 URL 형식을 확인해주세요.')
      }
      overrides.jobPostings = [{
        id: `onboarding-job-posting-${entryIdSuffix}`,
        company: company || '기업 미정',
        position: position || '공고 확인 필요',
        platform: sourceUrl ? detectJobPlatform(sourceUrl) : 'other',
        status: 'saved',
        deadline: entry.deadline || undefined,
        sourceUrl: sourceUrl || undefined,
        keywords: [],
        createdAt: now,
        updatedAt: now,
      }, ...(base.jobPostings ?? [])]
    } else if (entry.entryKind === 'careerEvent') {
      const title = entry.title.trim()
      if (!title) throw new Error('첫 기회 일정 제목을 입력해주세요.')
      const event = syncCareerEventDateFields({
        id: `onboarding-career-${entryIdSuffix}`,
        title,
        organization: entry.organization?.trim() || undefined,
        category: entry.category,
        status: 'interested',
        date: entry.date,
        milestones: createCareerCategoryMilestones(entry.category, { date: entry.date }),
      }) as CareerEvent
      overrides.careerEvents = [event, ...(base.careerEvents ?? [])]
    } else {
      const title = entry.title.trim()
      if (!title) throw new Error('첫 신청 항목 제목을 입력해주세요.')
      overrides.personalApplications = [{
        id: `onboarding-application-${entryIdSuffix}`,
        title,
        organization: entry.organization?.trim() || undefined,
        type: 'other',
        status: 'submitted',
        appliedDate: toLocalDateKey(),
        deadline: entry.deadline || undefined,
        documents: [],
        keywords: [],
        createdAt: now,
        updatedAt: now,
      }, ...(base.personalApplications ?? [])]
    }

    await saveWithOverridesStrict(overrides)
    setOnboardingOpen(false)
  }

  const skipOnboarding = async (selectedPurpose?: OnboardingPurpose): Promise<void> => {
    const now = new Date().toISOString()
    const base = currentDataRef.current
    const preset = buildStarterDashboard()
    const shouldApplyPreset = (base.dashboardActive?.length ?? 0) === 0
    const nextOnboarding: OnboardingState = {
      version: 1,
      status: 'skipped',
      purpose: selectedPurpose ?? base.onboarding?.purpose ?? onboarding?.purpose,
      startedAt: base.onboarding?.startedAt ?? onboarding?.startedAt ?? now,
      updatedAt: now,
      skippedAt: now,
    }
    await saveWithOverridesStrict({
      dashboardActive: shouldApplyPreset ? preset.dashboardActive : base.dashboardActive,
      dashboardLayout: shouldApplyPreset ? preset.dashboardLayout : base.dashboardLayout,
      onboarding: nextOnboarding,
    })
    setOnboardingOpen(false)
  }

  const requestDashboardEdit = () => {
    setOnboardingOpen(false)
    setDashboardEditRequestKey(value => value + 1)
  }

  const consumeDashboardEditRequest = useCallback(() => setDashboardEditRequestKey(0), [])

  const saveWithOverrides = (overrides: Partial<UserData> = {}): Promise<void> => {
    const uid = currentUidRef.current
    if (!uid) return Promise.resolve()
    const generation = sessionGenerationRef.current
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const data = sanitize({ ...currentDataRef.current, ...overrides })
    return saveSyncedUserData(uid, data)
      .then(saved => reconcileSavedUserData(uid, generation, data, saved))
      .catch(console.error)
  }

  const saveNow = (): Promise<void> => {
    const uid = currentUidRef.current
    const data = currentDataRef.current
    if (!uid) return Promise.resolve()
    const generation = sessionGenerationRef.current
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    return Promise.race([
      saveSyncedUserData(uid, data)
        .then(saved => reconcileSavedUserData(uid, generation, data, saved)),
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
    onboarding,
    onboardingOpen,
    onboardingMode,
    openOnboardingGuide,
    closeOnboardingGuide,
    selectOnboardingPurpose,
    completeOnboarding,
    skipOnboarding,
    dashboardEditRequestKey,
    requestDashboardEdit,
    consumeDashboardEditRequest,
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
