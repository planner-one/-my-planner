import type { ReactNode } from 'react'
import { useAuth } from '../store/AuthContext'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { signOut } from '../services/authService'

type PageId =
  | 'dashboard' | 'habits' | 'tasks' | 'goals' | 'projects'
  | 'weekly' | 'daily' | 'notes' | 'journal' | 'profile'

interface NavItem {
  id: PageId
  icon: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: '🏠', label: '홈' },
  { id: 'tasks',     icon: '✅', label: '할일' },
  { id: 'habits',    icon: '🏃', label: '습관' },
  { id: 'goals',     icon: '🎯', label: '목표' },
  { id: 'projects',  icon: '📁', label: '프로젝트' },
  { id: 'weekly',    icon: '📅', label: '주간' },
  { id: 'daily',     icon: '📆', label: '일일' },
  { id: 'notes',     icon: '📝', label: '노트' },
  { id: 'journal',   icon: '📖', label: '저널' },
  { id: 'profile',   icon: '👤', label: '프로필' },
]

const BOTTOM_TABS: PageId[] = ['dashboard', 'tasks', 'goals', 'weekly', 'profile']

export default function PageShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { saveNow } = useApp()
  const { page, setPage } = useRouter()

  const handleSignOut = async () => {
    await saveNow()
    await signOut()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg2)', fontWeight: 700, fontSize: 16,
          color: 'var(--accent)', display: 'none',
        }} className="mobile-header">
          나만의 플래너
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {children}
        </main>

        {/* 하단 탭 (모바일) */}
        <nav style={{
          borderTop: '1px solid var(--border)', background: 'var(--bg2)',
          display: 'none', justifyContent: 'space-around', padding: '8px 0',
        }} className="bottom-nav">
          {NAV_ITEMS.filter(i => BOTTOM_TABS.includes(i.id)).map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: page === item.id ? 'var(--accent)' : 'var(--muted)',
              fontSize: 10, fontWeight: page === item.id ? 600 : 400,
              padding: '4px 12px',
            }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 사이드바 (태블릿/데스크톱) */}
      <aside style={{
        width: 200, flexShrink: 0,
        background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '16px 0',
        overflowY: 'auto',
      }} className="sidebar">
        <div style={{ padding: '0 16px 16px', fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>
          나만의 플래너
        </div>

        <nav style={{ flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 16px', border: 'none',
              background: page === item.id ? 'var(--bg3)' : 'transparent',
              color: page === item.id ? 'var(--accent)' : 'var(--text)',
              fontWeight: page === item.id ? 600 : 400,
              cursor: 'pointer', fontSize: 14, textAlign: 'left',
              borderRadius: '8px 0 0 8px', marginLeft: 8,
            }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{
            fontSize: 12, color: 'var(--muted)', marginBottom: 8,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user?.displayName}
          </div>
          <button onClick={handleSignOut} style={{
            width: '100%', padding: 8, borderRadius: 8,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--muted)', cursor: 'pointer', fontSize: 13,
          }}>
            로그아웃
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 767px) {
          .sidebar { display: none !important; }
          .mobile-header { display: block !important; }
          .bottom-nav { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
