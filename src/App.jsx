import { AuthProvider, useAuth } from './store/AuthContext'
import { AppProvider, useApp } from './store/AppContext'
import LoginPage from './pages/LoginPage'
import { signOut } from './services/authService'

function Loading() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', color: 'var(--muted)'
    }}>
      불러오는 중...
    </div>
  )
}

// AppProvider 안에서만 렌더되는 컴포넌트
function AppMain() {
  const { user } = useAuth()
  const { dataLoaded, saveNow } = useApp()

  if (!dataLoaded) return <Loading />

  const handleSignOut = async () => {
    await saveNow()
    await signOut()
  }

  return (
    <div style={{ padding: 24, color: 'var(--text)' }}>
      <p>안녕하세요, {user.displayName}님</p>
      <button onClick={handleSignOut} style={{ marginTop: 12 }}>
        로그아웃
      </button>
    </div>
  )
}

function AppRouter() {
  const { user } = useAuth()

  if (user === undefined) return <Loading />
  if (!user) return <LoginPage />

  return (
    <AppProvider>
      <AppMain />
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
