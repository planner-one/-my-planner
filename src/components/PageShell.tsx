import { type ReactNode, useState, useEffect } from 'react'
import { useAuth } from '../store/AuthContext'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { signOut } from '../services/authService'

type PageId =
  | 'dashboard' | 'habits' | 'tasks' | 'goals' | 'projects'
  | 'weekly' | 'daily' | 'notes' | 'journal' | 'profile'

interface NavItem {
  id: PageId
  label: string
  paths: string[]
}

const S = 18
function Icon({ paths }: { paths: string[] }) {
  return (
    <svg width={S} height={S} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard', label: '홈',
    paths: ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z', 'M9 22V12h6v10'],
  },
  {
    id: 'tasks', label: '할일',
    paths: ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'],
  },
  {
    id: 'habits', label: '습관',
    paths: ['M12 2a10 10 0 100 20A10 10 0 0012 2z', 'M12 6v6l4 2'],
  },
  {
    id: 'goals', label: '목표',
    paths: ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'M12 16a4 4 0 100-8 4 4 0 000 8z', 'M12 12h.01'],
  },
  {
    id: 'projects', label: '프로젝트',
    paths: ['M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z'],
  },
  {
    id: 'weekly', label: '주간',
    paths: ['M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'],
  },
  {
    id: 'daily', label: '일일',
    paths: ['M8 2v4M16 2v4M3 10h18', 'M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z', 'M12 15v2M12 15h.01'],
  },
  {
    id: 'notes', label: '노트',
    paths: ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8M16 17H8M10 9H8'],
  },
  {
    id: 'journal', label: '저널',
    paths: ['M4 19.5A2.5 2.5 0 016.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z'],
  },
  {
    id: 'profile', label: '프로필',
    paths: ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z'],
  },
]

const BOTTOM_TABS: PageId[] = ['dashboard', 'tasks', 'goals', 'weekly', 'profile']

export default function PageShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { saveNow } = useApp()
  const { page, setPage } = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    localStorage.getItem('sidebar_open') !== 'false'
  )
  type Theme = 'light' | 'dark' | 'karrot' | 'toss'
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved && ['light', 'dark', 'karrot', 'toss'].includes(saved)) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const applyTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
    document.documentElement.setAttribute('data-theme', t === 'light' ? '' : t)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? '' : theme)
  }, [theme])

  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    localStorage.setItem('sidebar_open', String(next))
  }

  const handleSignOut = async () => {
    await saveNow()
    await signOut()
  }

  const initial = user?.displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg2)', fontWeight: 600, fontSize: 15,
          color: 'var(--text)', display: 'none', letterSpacing: '-0.01em',
        }} className="mobile-header">
          나만의 플래너
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {children}
        </main>

        {/* 하단 탭 (모바일) */}
        <nav style={{
          borderTop: '1px solid var(--border)', background: 'var(--bg2)',
          display: 'none', justifyContent: 'space-around', padding: '6px 0 8px',
        }} className="bottom-nav">
          {NAV_ITEMS.filter(i => BOTTOM_TABS.includes(i.id)).map(item => {
            const active = page === item.id
            return (
              <button key={item.id} onClick={() => setPage(item.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: active ? 'var(--accent)' : 'var(--muted)',
                fontSize: 10, fontWeight: active ? 600 : 400,
                padding: '4px 14px',
              }}>
                <Icon paths={item.paths} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* 사이드바 토글 버튼 (닫혔을 때) */}
      {!sidebarOpen && (
        <button onClick={toggleSidebar} className="sidebar-fab" style={{
          position: 'fixed', right: 12, top: '50%', transform: 'translateY(-50%)',
          width: 28, height: 28, borderRadius: '50%', zIndex: 100,
          border: '1px solid var(--border)', background: 'var(--bg2)',
          color: 'var(--muted)', cursor: 'pointer', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}>
          ‹
        </button>
      )}

      {/* 사이드바 (태블릿/데스크톱) */}
      <aside style={{
        width: sidebarOpen ? 200 : 0,
        flexShrink: 0, overflow: 'hidden',
        background: 'var(--bg2)', borderLeft: sidebarOpen ? '1px solid var(--border)' : 'none',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease',
      }} className="sidebar">

        {/* 로고 */}
        <div style={{
          padding: '18px 16px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, minWidth: 200,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span style={{
              fontSize: 15, fontWeight: 700, color: 'var(--text)',
              letterSpacing: '-0.03em', whiteSpace: 'nowrap',
            }}>
              나만의 플래너
            </span>
          </div>
          <button onClick={toggleSidebar} style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 16, padding: '0 2px',
            display: 'flex', alignItems: 'center',
          }}>
            ›
          </button>
        </div>

        {/* 구분선 */}
        <div style={{ height: 1, background: 'var(--border)', margin: '0 16px 8px', flexShrink: 0 }} />

        {/* 네비게이션 */}
        <nav style={{ flex: 1, padding: '4px 10px', minWidth: 200 }}>
          {NAV_ITEMS.map(item => {
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`nav-item${active ? ' nav-active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 12px',
                  border: 'none', borderRadius: 8,
                  background: active ? 'var(--bg3)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer', fontSize: 13,
                  textAlign: 'left', marginBottom: 2,
                  transition: 'background 0.12s, color 0.12s',
                  position: 'relative',
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute', left: 0, top: '20%', bottom: '20%',
                    width: 3, borderRadius: 2,
                    background: 'var(--accent)',
                  }} />
                )}
                <Icon paths={item.paths} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* 테마 선택 */}
        <div style={{ padding: '8px 10px 4px', minWidth: 200, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, paddingLeft: 2 }}>테마</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {([
              { id: 'light',  label: '라이트', dot: '#eef0ef', accent: '#3a7d50' },
              { id: 'dark',   label: '다크',   dot: '#181818', accent: '#4ade80' },
              { id: 'karrot', label: '당근',   dot: '#fff1ea', accent: '#ff6f0f' },
              { id: 'toss',   label: '토스',   dot: '#f2f4f6', accent: '#3182f6' },
            ] as const).map(t => {
              const active = theme === t.id
              return (
                <button key={t.id} onClick={() => applyTheme(t.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 8px', borderRadius: 8, cursor: 'pointer',
                  border: active ? `1.5px solid ${t.accent}` : '1.5px solid var(--border)',
                  background: active ? t.dot : 'var(--bg3)',
                  fontFamily: 'inherit', fontSize: 11,
                  color: active ? t.accent : 'var(--muted)',
                  fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: t.accent, flexShrink: 0,
                    boxShadow: active ? `0 0 0 2px ${t.dot}, 0 0 0 3px ${t.accent}` : 'none',
                  }} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 유저 영역 */}
        <div style={{
          padding: '12px 16px 16px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0, minWidth: 200,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="avatar" style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              }} />
            ) : (
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600,
              }}>
                {initial}
              </div>
            )}
            <span style={{
              fontSize: 12, color: 'var(--text)', fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.displayName}
            </span>
          </div>
          <button onClick={handleSignOut} className="signout-btn" style={{
            width: '100%', padding: '7px 0', borderRadius: 7,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--muted)', cursor: 'pointer', fontSize: 12,
            transition: 'background 0.12s, color 0.12s',
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
        .nav-item:hover {
          background: var(--bg3) !important;
          color: var(--text) !important;
        }
        .nav-active:hover {
          color: var(--accent) !important;
        }
        .signout-btn:hover {
          background: var(--bg3) !important;
          color: var(--text) !important;
        }
      `}</style>
    </div>
  )
}
