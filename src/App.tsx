import { AuthProvider, useAuth } from './store/AuthContext'
import { AppProvider, useApp } from './store/AppContext'
import { RouterProvider, useRouter } from './store/RouterContext'
import LoginPage from './pages/LoginPage'
import PageShell from './components/PageShell'
import { Suspense, lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { PageId } from './config/navigation'
import { Skeleton } from './components/ui/Skeleton'
import { ToastProvider } from './components/ui/ToastProvider'
import { ConfirmProvider } from './components/ui/ConfirmProvider'
import { ErrorState } from './components/ui/ErrorState'

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
  productivity: loadPage(() => import('./pages/ProductivityLog')),
}

function Loading({ fullScreen = true }: { fullScreen?: boolean }) {
  return (
    <div className={fullScreen ? 'app-loading app-loading-full' : 'app-loading'} role="status" aria-label="불러오는 중">
      <div>
        <Skeleton width={180} height={16} />
        <Skeleton width={120} height={12} />
      </div>
    </div>
  )
}

function PageLoading() {
  return <Loading fullScreen={false} />
}

function AppMain() {
  const { dataLoaded, dataLoadError, retryLoad } = useApp()
  const { page } = useRouter()
  const PageComponent = PAGE_MAP[page] ?? PAGE_MAP.dashboard

  if (dataLoadError) {
    return (
      <ErrorState
        fullScreen
        title="플래너 데이터를 불러오지 못했습니다"
        description={dataLoadError}
        actionLabel="다시 불러오기"
        onRetry={retryLoad}
      />
    )
  }
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
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}
