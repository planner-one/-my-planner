import { AuthProvider, useAuth } from './store/AuthContext'
import { AppProvider, useApp } from './store/AppContext'
import { RouterProvider, useRouter } from './store/RouterContext'
import LoginPage from './pages/LoginPage'
import PageShell from './components/PageShell'
import { Suspense, lazy, type ComponentType, type LazyExoticComponent } from 'react'

type PageId =
  | 'dashboard' | 'calendar' | 'habits' | 'tasks' | 'todos' | 'goals' | 'projects'
  | 'weekly' | 'daily' | 'notes' | 'journal' | 'profile' | 'inquiries' | 'print' | 'career'
  | 'personalApplications' | 'jobPostings'

type PageComponent = LazyExoticComponent<ComponentType>

const loadPage = (loader: () => Promise<{ default: ComponentType }>): PageComponent => lazy(loader)

const PAGE_MAP: Record<PageId, PageComponent> = {
  dashboard: loadPage(() => import('./pages/Dashboard')),
  calendar:  loadPage(() => import('./pages/CalendarPage')),
  habits:    loadPage(() => import('./pages/HabitTracker')),
  tasks:     loadPage(() => import('./pages/TaskTracker')),
  todos:     loadPage(() => import('./pages/TodoPage')),
  goals:     loadPage(() => import('./pages/Goals')),
  projects:  loadPage(() => import('./pages/Projects')),
  weekly:    loadPage(() => import('./pages/WeeklyPlanner')),
  daily:     loadPage(() => import('./pages/DailyPlanner')),
  notes:     loadPage(() => import('./pages/Notes')),
  journal:   loadPage(() => import('./pages/Journal')),
  profile:   loadPage(() => import('./pages/ProfilePage')),
  inquiries: loadPage(() => import('./pages/Inquiries')),
  print:     loadPage(() => import('./pages/PrintPlanner')),
  career:    loadPage(() => import('./pages/CareerEvents')),
  personalApplications: loadPage(() => import('./pages/PersonalApplications')),
  jobPostings: loadPage(() => import('./pages/JobPostings')),
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

function PageLoading() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 320, color: 'var(--muted)',
    }}>
      페이지를 불러오는 중...
    </div>
  )
}

function AppMain() {
  const { dataLoaded } = useApp()
  const { page } = useRouter()
  const PageComponent = PAGE_MAP[page] ?? PAGE_MAP.dashboard

  if (!dataLoaded) return <Loading />

  return (
    <PageShell>
      <Suspense fallback={<PageLoading />}>
        <PageComponent />
      </Suspense>
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
