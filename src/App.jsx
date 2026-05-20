import { AuthProvider, useAuth } from './store/AuthContext'
import LoginPage from './pages/LoginPage'

function AppContent() {
  const { user } = useAuth()

  if (user === undefined) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', color: 'var(--muted)'
      }}>
        불러오는 중...
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <div style={{ padding: 24, color: 'var(--text)' }}>
      <p>안녕하세요, {user.displayName}님</p>
      <button onClick={() => import('./services/authService').then(m => m.signOut())}>
        로그아웃
      </button>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
