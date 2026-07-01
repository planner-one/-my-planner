import { type ReactNode, useState, useEffect } from 'react'
import { useAuth } from '../store/AuthContext'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { signOut } from '../services/authService'
import LinkOrganizerModal from './LinkOrganizerModal'

type PageId =
  | 'dashboard' | 'calendar' | 'habits' | 'tasks' | 'todos' | 'goals' | 'projects'
  | 'weekly' | 'daily' | 'notes' | 'journal' | 'profile' | 'inquiries' | 'print' | 'career'
  | 'personalApplications' | 'jobPostings'

type NavGroupId = 'core' | 'plan' | 'record' | 'system'
type Theme = 'light' | 'dark' | 'coral' | 'blue'

interface NavItem {
  id: PageId
  label: string
  group: NavGroupId
  paths: string[]
}

const S = 18
const SIDEBAR_OPEN_KEY = 'planner_sidebar_open'
const SIDEBAR_WIDTH = 236
const SIDEBAR_RAIL_WIDTH = 72
const SIGN_OUT_PATHS = ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4', 'M16 17l5-5-5-5', 'M21 12H9']
const LINK_IMPORT_PATHS = [
  'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71',
  'M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
]

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

const NAV_GROUPS: { id: NavGroupId; label: string }[] = [
  { id: 'core', label: '기본' },
  { id: 'plan', label: '계획' },
  { id: 'record', label: '기록' },
  { id: 'system', label: '설정' },
]

const THEME_OPTIONS: { id: Theme; label: string; dot: string; accent: string }[] = [
  { id: 'light', label: '라이트', dot: '#eef0ef', accent: '#3a7d50' },
  { id: 'dark', label: '다크', dot: '#181818', accent: '#4ade80' },
  { id: 'coral', label: '코랄', dot: '#fff1ea', accent: '#c2410c' },
  { id: 'blue', label: '블루', dot: '#f2f4f6', accent: '#2563eb' },
]

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard', label: '홈', group: 'core',
    paths: ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z', 'M9 22V12h6v10'],
  },
  {
    id: 'calendar', label: '캘린더', group: 'core',
    paths: ['M8 2v4M16 2v4M3 10h18', 'M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z', 'M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01'],
  },
  {
    id: 'tasks', label: '작업 관리', group: 'core',
    paths: ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'],
  },
  {
    id: 'todos', label: '오늘 할 일', group: 'core',
    paths: ['M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'],
  },
  {
    id: 'habits', label: '습관', group: 'plan',
    paths: ['M12 2a10 10 0 100 20A10 10 0 0012 2z', 'M12 6v6l4 2'],
  },
  {
    id: 'goals', label: '목표', group: 'plan',
    paths: ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'M12 16a4 4 0 100-8 4 4 0 000 8z', 'M12 12h.01'],
  },
  {
    id: 'projects', label: '프로젝트', group: 'plan',
    paths: ['M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z'],
  },
  {
    id: 'career', label: '기회 일정', group: 'plan',
    paths: ['M8 7V5a4 4 0 018 0v2', 'M3 7h18v13H3z', 'M3 12h18', 'M10 12v2h4v-2'],
  },
  {
    id: 'personalApplications', label: '내 신청', group: 'plan',
    paths: ['M4 4h16v16H4z', 'M8 8h8M8 12h8M8 16h5', 'M17 16l2 2 3-4'],
  },
  {
    id: 'jobPostings', label: '지원 공고', group: 'plan',
    paths: ['M3 7h18v13H3z', 'M8 7V5a4 4 0 018 0v2', 'M8 12h8M8 16h5'],
  },
  {
    id: 'weekly', label: '주간', group: 'plan',
    paths: ['M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'],
  },
  {
    id: 'daily', label: '일일', group: 'plan',
    paths: ['M8 2v4M16 2v4M3 10h18', 'M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z', 'M12 15v2M12 15h.01'],
  },
  {
    id: 'notes', label: '노트', group: 'record',
    paths: ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8M16 17H8M10 9H8'],
  },
  {
    id: 'journal', label: '저널', group: 'record',
    paths: ['M4 19.5A2.5 2.5 0 016.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z'],
  },
  {
    id: 'profile', label: '프로필', group: 'system',
    paths: ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z'],
  },
  {
    id: 'inquiries', label: '문의', group: 'system',
    paths: ['M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z', 'M8 9h8M8 13h5'],
  },
  {
    id: 'print', label: '플래너 출력', group: 'record',
    paths: ['M6 9V2h12v7', 'M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2', 'M6 14h12v8H6z'],
  },
]

const BOTTOM_TABS: PageId[] = ['dashboard', 'tasks', 'calendar', 'career', 'weekly', 'profile']

export default function PageShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { saveNow } = useApp()
  const { page, setPage } = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem(SIDEBAR_OPEN_KEY) !== 'false')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [theme, setThemeState] = useState<Theme>(() => {
    const raw = localStorage.getItem('theme')
    const saved = raw === 'karrot' ? 'coral' : raw === 'toss' ? 'blue' : raw
    if (saved && ['light', 'dark', 'coral', 'blue'].includes(saved)) return saved as Theme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const applyTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
    document.documentElement.setAttribute('data-theme', t === 'light' ? '' : t)
  }

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme === 'light' ? '' : theme)
  }, [theme])

  const toggleSidebar = () => {
    setSidebarOpen(open => {
      const next = !open
      localStorage.setItem(SIDEBAR_OPEN_KEY, String(next))
      return next
    })
  }

  const navigateToPage = (id: PageId) => {
    setPage(id)
    setMobileMenuOpen(false)
  }

  const handleSignOut = async () => {
    await saveNow()
    await signOut()
  }

  const initial = user?.displayName?.[0]?.toUpperCase() ?? '?'
  const currentNavItem = NAV_ITEMS.find(item => item.id === page)
  const showReturnHeader = page !== 'dashboard'

  return (
    <div style={{ display: 'flex', height: 'var(--app-viewport-height)', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          minHeight: 46, padding: '7px 16px', boxSizing: 'border-box',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg2)', fontWeight: 600, fontSize: 13,
          color: 'var(--text)',
          display: showReturnHeader ? 'flex' : 'none',
          alignItems: 'center', gap: 9, letterSpacing: 0,
          flexShrink: 0,
        }} className="page-return-header">
          {showReturnHeader ? (
            <>
              <button
                type="button"
                onClick={() => navigateToPage('dashboard')}
                title="홈으로 이동"
                aria-label="홈으로 이동"
                style={{
                  width: 32, height: 32, padding: 0,
                  display: 'grid', placeItems: 'center',
                  border: '1px solid var(--border)', borderRadius: 7,
                  background: 'var(--bg3)', color: 'var(--muted)',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <Icon paths={NAV_ITEMS[0].paths} />
              </button>
              <span>{currentNavItem?.label ?? '나만의 플래너'}</span>
            </>
          ) : (
            <span>나만의 플래너</span>
          )}
          <button
            type="button"
            className="header-link-tool"
            onClick={() => setLinkModalOpen(true)}
          >
            링크 정리
          </button>
          <button
            type="button"
            className="mobile-page-menu-trigger"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="전체 페이지 메뉴 열기"
          >
            전체 메뉴
          </button>
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
              <button key={item.id} onClick={() => navigateToPage(item.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: active ? 'var(--accent)' : 'var(--muted)',
                fontSize: 10, fontWeight: active ? 600 : 400,
                padding: '4px 8px',
              }}>
                <Icon paths={item.paths} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {mobileMenuOpen && (
          <div
            className="mobile-page-menu-backdrop"
            role="presentation"
            onClick={() => setMobileMenuOpen(false)}
          >
            <section
              className="mobile-page-menu"
              role="dialog"
              aria-modal="true"
              aria-label="전체 페이지 메뉴"
              onClick={event => event.stopPropagation()}
            >
              <div className="mobile-page-menu-head">
                <strong>전체 메뉴</strong>
                <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="전체 페이지 메뉴 닫기">
                  닫기
                </button>
              </div>
              <div className="mobile-page-menu-grid">
                {NAV_ITEMS.map(item => {
                  const active = page === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={active ? 'active' : ''}
                      onClick={() => navigateToPage(item.id)}
                    >
                      <Icon paths={item.paths} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* 사이드바 (태블릿/데스크톱) */}
      <aside style={{
        width: sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_RAIL_WIDTH,
        order: -1,
        flexShrink: 0, overflow: 'hidden',
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.18s ease',
        boxShadow: '1px 0 0 rgba(0,0,0,0.02)',
      }} className="sidebar">

        {/* 로고 */}
        <div style={{
          padding: sidebarOpen ? '14px 12px 12px' : '12px 8px',
          display: 'flex', flexDirection: sidebarOpen ? 'row' : 'column',
          alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center',
          gap: 8,
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={() => navigateToPage('dashboard')}
            title="홈으로 이동"
            aria-label="홈으로 이동"
            className="sidebar-brand"
          >
            <span className="sidebar-brand-mark">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </span>
            {sidebarOpen && <span className="sidebar-brand-text">나만의 플래너</span>}
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarOpen ? '사이드바 접기' : '사이드바 펼치기'}
            aria-label={sidebarOpen ? '사이드바 접기' : '사이드바 펼치기'}
            className="sidebar-toggle"
          >
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        {sidebarOpen && (
          <div className="sidebar-current">
            <span>현재 위치</span>
            <strong>{currentNavItem?.label ?? '나만의 플래너'}</strong>
          </div>
        )}

        {/* 네비게이션 */}
        <nav style={{
          flex: 1,
          padding: sidebarOpen ? '4px 10px 8px' : '4px 8px 8px',
          overflowY: 'auto',
        }}>
          {NAV_GROUPS.map(group => {
            const items = NAV_ITEMS.filter(item => item.group === group.id)
            return (
              <div key={group.id} className={sidebarOpen ? 'nav-group' : 'nav-group nav-group-rail'}>
                {sidebarOpen && <div className="nav-group-label">{group.label}</div>}
                {items.map(item => {
                  const active = page === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateToPage(item.id)}
                      className={`nav-item${active ? ' nav-active' : ''}`}
                      title={item.label}
                      aria-label={item.label}
                      aria-current={active ? 'page' : undefined}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center',
                        gap: sidebarOpen ? 10 : 0,
                        width: '100%', minHeight: 38,
                        padding: sidebarOpen ? '9px 12px' : '9px 0',
                        border: 'none', borderRadius: 8,
                        background: active ? 'var(--bg3)' : 'transparent',
                        color: active ? 'var(--accent)' : 'var(--muted)',
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer', fontSize: 13,
                        textAlign: 'left', marginBottom: 2,
                        transition: 'background 0.12s, color 0.12s',
                        position: 'relative',
                      }}
                    >
                      {active && (
                        <span style={{
                          position: 'absolute', left: sidebarOpen ? 0 : 6, top: '22%', bottom: '22%',
                          width: 3, borderRadius: 2,
                          background: 'var(--accent)',
                        }} />
                      )}
                      <Icon paths={item.paths} />
                      {sidebarOpen && <span className="nav-item-label">{item.label}</span>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-link-tool-wrap">
          <button
            type="button"
            className="sidebar-link-tool"
            onClick={() => setLinkModalOpen(true)}
            title="링크 정리"
            aria-label="링크 정리"
          >
            <Icon paths={LINK_IMPORT_PATHS} />
            {sidebarOpen && <span>링크 정리</span>}
          </button>
        </div>

        {/* 테마 선택 */}
        <div style={{
          padding: sidebarOpen ? '8px 10px 6px' : '8px 12px 6px',
          flexShrink: 0,
        }}>
          {sidebarOpen && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, paddingLeft: 2 }}>테마</div>
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: sidebarOpen ? '1fr 1fr' : '1fr',
            gap: 5,
          }}>
            {THEME_OPTIONS.map(t => {
              const active = theme === t.id
              return (
                <button key={t.id} onClick={() => applyTheme(t.id)} title={`${t.label} 테마`} aria-label={`${t.label} 테마`} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  minHeight: sidebarOpen ? 31 : 30,
                  padding: sidebarOpen ? '7px 8px' : 0, borderRadius: 8, cursor: 'pointer',
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
                  {sidebarOpen && t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 유저 영역 */}
        <div style={{
          padding: sidebarOpen ? '12px 16px 16px' : '10px 12px 14px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            gap: 8,
            marginBottom: sidebarOpen ? 10 : 8,
          }}>
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
            {sidebarOpen && (
              <span style={{
                fontSize: 12, color: 'var(--text)', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.displayName}
              </span>
            )}
          </div>
          <button onClick={handleSignOut} className="signout-btn" style={{
            width: '100%', minHeight: 32, padding: sidebarOpen ? '7px 0' : 0, borderRadius: 7,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--muted)', cursor: 'pointer', fontSize: 12,
            transition: 'background 0.12s, color 0.12s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6,
          }} title="로그아웃" aria-label="로그아웃">
            <Icon paths={SIGN_OUT_PATHS} />
            {sidebarOpen && <span>로그아웃</span>}
          </button>
        </div>
      </aside>

      <LinkOrganizerModal open={linkModalOpen} onClose={() => setLinkModalOpen(false)} />

      <style>{`
        .sidebar-brand {
          min-width: 0;
          border: 0;
          background: transparent;
          color: var(--accent);
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0;
          cursor: pointer;
          font-family: inherit;
        }
        .sidebar-brand-mark {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          background: var(--accent-soft);
          color: var(--accent);
          flex-shrink: 0;
        }
        .sidebar-brand-text {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 15px;
          font-weight: 800;
          color: var(--text);
        }
        .sidebar-toggle {
          width: 30px;
          height: 30px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg3);
          color: var(--muted);
          cursor: pointer;
          display: grid;
          place-items: center;
          font-size: 16px;
          line-height: 1;
          flex-shrink: 0;
        }
        .sidebar-current {
          margin: 0 10px 10px;
          padding: 9px 10px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg);
          display: grid;
          gap: 2px;
        }
        .sidebar-current span {
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
        }
        .sidebar-current strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--text);
          font-size: 13px;
          font-weight: 800;
        }
        .nav-group {
          display: grid;
          gap: 2px;
          margin-bottom: 8px;
        }
        .nav-group-rail {
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }
        .nav-group-rail:last-child {
          border-bottom: 0;
        }
        .nav-group-label {
          padding: 8px 8px 4px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 800;
        }
        .nav-item-label {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mobile-page-menu-trigger {
          display: none;
          margin-left: auto;
          min-height: 32px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--bg3);
          color: var(--text);
          padding: 0 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .header-link-tool {
          min-height: 32px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--bg3);
          color: var(--text);
          padding: 0 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          margin-left: auto;
        }
        .header-link-tool + .mobile-page-menu-trigger {
          margin-left: 0;
        }
        .sidebar-link-tool-wrap {
          padding: 8px 10px 6px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }
        .sidebar-link-tool {
          width: 100%;
          min-height: 34px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg3);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .sidebar-link-tool span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mobile-page-menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 250;
          display: none;
          align-items: flex-end;
          background: rgba(0, 0, 0, 0.32);
        }
        .mobile-page-menu {
          width: 100%;
          max-height: min(78vh, 620px);
          overflow: auto;
          border-radius: 14px 14px 0 0;
          border: 1px solid var(--border);
          border-bottom: 0;
          background: var(--bg2);
          padding: 14px;
          box-sizing: border-box;
          box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.22);
        }
        .mobile-page-menu-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .mobile-page-menu-head strong {
          font-size: 15px;
          color: var(--text);
        }
        .mobile-page-menu-head button {
          min-height: 34px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--bg3);
          color: var(--muted);
          padding: 0 11px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .mobile-page-menu-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .mobile-page-menu-grid button {
          min-width: 0;
          min-height: 46px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg3);
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 11px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .mobile-page-menu-grid button.active {
          border-color: var(--accent);
          background: var(--accent-soft);
          color: var(--accent);
        }
        .mobile-page-menu-grid span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (max-width: 767px) {
          .sidebar { display: none !important; }
          .page-return-header { display: flex !important; }
          .mobile-page-menu-trigger { display: flex !important; align-items: center; justify-content: center; }
          .mobile-page-menu-backdrop { display: flex !important; }
          .bottom-nav { display: flex !important; }
        }
        .sidebar-brand:hover .sidebar-brand-mark,
        .sidebar-toggle:hover {
          background: var(--bg4) !important;
          color: var(--accent) !important;
        }
        .nav-item:hover {
          background: var(--bg3) !important;
          color: var(--text) !important;
        }
        .nav-active:hover {
          color: var(--accent) !important;
        }
        .header-link-tool:hover,
        .sidebar-link-tool:hover {
          border-color: var(--accent) !important;
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
