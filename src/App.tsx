import { AuthProvider, useAuth } from './store/AuthContext'
import { AppProvider, useApp } from './store/AppContext'
import { RouterProvider, useRouter } from './store/RouterContext'
import LoginPage from './pages/LoginPage'
import PageShell from './components/PageShell'
import Dashboard from './pages/Dashboard'
import HabitTracker from './pages/HabitTracker'
import TaskTracker from './pages/TaskTracker'
import Goals from './pages/Goals'
import Projects from './pages/Projects'
import WeeklyPlanner from './pages/WeeklyPlanner'
import DailyPlanner from './pages/DailyPlanner'
import Notes from './pages/Notes'
import Journal from './pages/Journal'
import ProfilePage from './pages/ProfilePage'
import TodoPage from './pages/TodoPage'
import Inquiries from './pages/Inquiries'
import type { ComponentType } from 'react'

type PageId =
  | 'dashboard' | 'habits' | 'tasks' | 'todos' | 'goals' | 'projects'
  | 'weekly' | 'daily' | 'notes' | 'journal' | 'profile' | 'inquiries'

const PAGE_MAP: Record<PageId, ComponentType> = {
  dashboard: Dashboard,
  habits:    HabitTracker,
  tasks:     TaskTracker,
  todos:     TodoPage,
  goals:     Goals,
  projects:  Projects,
  weekly:    WeeklyPlanner,
  daily:     DailyPlanner,
  notes:     Notes,
  journal:   Journal,
  profile:   ProfilePage,
  inquiries: Inquiries,
}

function Loading() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 'var(--app-viewport-height)', color: 'var(--muted)',
    }}>
      불러오는 중...
    </div>
  )
}

function AppMain() {
  const { dataLoaded } = useApp()
  const { page } = useRouter()
  const PageComponent = PAGE_MAP[page] ?? Dashboard

  if (!dataLoaded) return <Loading />

  return (
    <PageShell>
      <PageComponent />
    </PageShell>
  )
}

function AppRouter() {
  const { user } = useAuth()

  if (user === undefined) return <Loading />
  if (!user) return <LoginPage />

  return (
    <AppProvider>
      <RouterProvider>
        <AppMain />
      </RouterProvider>
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
