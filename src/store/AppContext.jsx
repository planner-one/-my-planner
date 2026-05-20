import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { loadUserData, saveUserData } from '../services/userService'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

const LS_KEYS = ['dashboard_cols_v']

const sanitize = (data) => JSON.parse(JSON.stringify(data))

export function AppProvider({ children, onDataLoaded }) {
  const { user } = useAuth()

  // ── 전체 상태 ──────────────────────────────────────────────
  const [todos, setTodos] = useState([])
  const [habits, setHabits] = useState([])
  const [habitHistory, setHabitHistory] = useState({})
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState([])
  const [projects, setProjects] = useState([])
  const [topGoals, setTopGoals] = useState([])
  const [energy, setEnergy] = useState(0)
  const [counters, setCounters] = useState({ f: 0, w: 0, fDate: '' })
  const [quickMemo, setQuickMemo] = useState('')
  const [review, setReview] = useState({ r1: '', r2: '', r3: '' })
  const [notes, setNotes] = useState([])
  const [weekTasks, setWeekTasks] = useState({})
  const [timeBlockData, setTimeBlockData] = useState({})
  const [scheduledTasks, setScheduledTasks] = useState([])
  const [journal, setJournal] = useState([])
  const [chartHistory, setChartHistory] = useState([])
  const [dashboardLayout, setDashboardLayout] = useState([])
  const [dashboardActive, setDashboardActive] = useState([])
  const [nickname, setNickname] = useState('')
  const [dataLoaded, setDataLoaded] = useState(false)

  // ── refs ────────────────────────────────────────────────────
  const isLoadingRef = useRef(true)
  const saveTimerRef = useRef(null)
  const currentUidRef = useRef(null)
  const currentDataRef = useRef({})

  // 렌더마다 최신 상태를 ref에 동기화
  useEffect(() => {
    currentDataRef.current = sanitize({
      todos, habits, habitHistory, habitsVersion: 2,
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

  // ── 로그인/데이터 로드 ──────────────────────────────────────
  useEffect(() => {
    if (!user) return

    // 계정 전환 감지 → localStorage 초기화
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
        onDataLoaded?.()
      }, 300)
    })
  }, [user?.uid])

  // ── 1초 debounce 자동 저장 ──────────────────────────────────
  useEffect(() => {
    if (!user || isLoadingRef.current) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveUserData(currentUidRef.current, currentDataRef.current)
    }, 1000)
  }, [
    todos, habits, habitHistory, tasks, goals, projects, topGoals,
    energy, counters, quickMemo, review, notes, weekTasks,
    timeBlockData, scheduledTasks, journal, chartHistory,
    dashboardLayout, dashboardActive, nickname,
  ])

  // ── 즉시 저장 (대시보드 저장 버튼용) ───────────────────────
  const saveWithOverrides = (overrides = {}) => {
    if (!currentUidRef.current) return Promise.resolve()
    clearTimeout(saveTimerRef.current)
    return saveUserData(
      currentUidRef.current,
      sanitize({ ...currentDataRef.current, ...overrides })
    ).catch(console.error)
  }

  // ── 로그아웃 전 즉시 저장 ───────────────────────────────────
  const saveNow = () => {
    if (!currentUidRef.current) return Promise.resolve()
    clearTimeout(saveTimerRef.current)
    return Promise.race([
      saveUserData(currentUidRef.current, currentDataRef.current),
      new Promise(r => setTimeout(r, 3000)),
    ])
  }

  const value = {
    dataLoaded,
    todos, setTodos,
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

export const useApp = () => useContext(AppContext)
