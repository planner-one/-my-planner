import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '../store/AuthContext'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { signOut } from '../services/authService'
import {
  BOTTOM_TABS,
  NAV_GROUPS,
  NAV_ITEMS,
  getNavItem,
  type PageId,
} from '../config/navigation'
import LinkOrganizerModal from './LinkOrganizerModal'
import { Drawer } from './ui/Drawer'
import { IconButton } from './ui/IconButton'
import { SaveIndicator } from './SaveIndicator'

type Theme = 'light' | 'dark' | 'coral' | 'blue'

const SIDEBAR_OPEN_KEY = 'planner_sidebar_open'

const THEME_OPTIONS: ReadonlyArray<{ id: Theme; label: string; color: string }> = [
  { id: 'light', label: '라이트', color: '#2f6f46' },
  { id: 'dark', label: '다크', color: '#69c486' },
  { id: 'coral', label: '코랄', color: '#a94320' },
  { id: 'blue', label: '블루', color: '#285ea8' },
]

function getInitialTheme(): Theme {
  const raw = localStorage.getItem('theme')
  const saved = raw === 'karrot' ? 'coral' : raw === 'toss' ? 'blue' : raw
  if (saved === 'light' || saved === 'dark' || saved === 'coral' || saved === 'blue') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function PageShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { saveNow, saveState, saveError, retrySave } = useApp()
  const { page, setPage } = useRouter()
  const mainRef = useRef<HTMLElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem(SIDEBAR_OPEN_KEY) !== 'false')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    localStorage.setItem('theme', theme)
    if (theme === 'light') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
    mainRef.current?.focus({ preventScroll: true })
  }, [page])

  const navigateToPage = (id: PageId) => {
    setPage(id)
    setMobileMenuOpen(false)
  }

  const toggleSidebar = () => {
    setSidebarOpen(current => {
      const next = !current
      localStorage.setItem(SIDEBAR_OPEN_KEY, String(next))
      return next
    })
  }

  const handleSignOut = async () => {
    try {
      await saveNow()
    } finally {
      await signOut()
    }
  }

  const currentItem = getNavItem(page)
  const CurrentIcon = currentItem.icon
  const initial = user?.displayName?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <div className={`app-shell${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
      <aside className="app-sidebar" aria-label="주요 탐색">
        <div className="sidebar-head">
          <button type="button" className="sidebar-brand" onClick={() => navigateToPage('dashboard')}>
            <span className="sidebar-brand-mark" aria-hidden="true"><LayoutDashboard size={19} /></span>
            {sidebarOpen && <span>나만의 플래너</span>}
          </button>
          <IconButton
            label={sidebarOpen ? '사이드바 접기' : '사이드바 펼치기'}
            icon={sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
            size="sm"
            variant="secondary"
            onClick={toggleSidebar}
          />
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map(group => {
            const items = NAV_ITEMS.filter(item => item.group === group.id)
            return (
              <section key={group.id} className="sidebar-group" aria-label={group.label}>
                {sidebarOpen && <h2>{group.label}</h2>}
                {items.map(item => {
                  const Icon = item.icon
                  const active = item.id === page
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`sidebar-nav-item${active ? ' active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      aria-label={item.label}
                      title={item.label}
                      onClick={() => navigateToPage(item.id)}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {sidebarOpen && <span>{item.label}</span>}
                    </button>
                  )
                })}
              </section>
            )
          })}
        </nav>

        <div className="sidebar-tools">
          <button type="button" className="sidebar-tool" onClick={() => setLinkModalOpen(true)}>
            <Link2 size={17} aria-hidden="true" />
            {sidebarOpen && <span>링크 정리</span>}
          </button>

          <div className="theme-picker" aria-label="테마 선택">
            {sidebarOpen && <span>테마</span>}
            <div>
              {THEME_OPTIONS.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={theme === option.id ? 'active' : undefined}
                  aria-label={`${option.label} 테마`}
                  aria-pressed={theme === option.id}
                  title={`${option.label} 테마`}
                  onClick={() => setTheme(option.id)}
                >
                  <i style={{ backgroundColor: option.color }} aria-hidden="true" />
                  {sidebarOpen && <span>{option.label}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-account">
          <div className="account-row">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={`${user.displayName ?? '사용자'} 프로필`} />
            ) : (
              <span className="account-avatar" aria-hidden="true">{initial}</span>
            )}
            {sidebarOpen && (
              <div className="account-copy">
                <strong>{user?.displayName || '사용자'}</strong>
                <SaveIndicator state={saveState} error={saveError} onRetry={() => { void retrySave() }} />
              </div>
            )}
          </div>
          <button type="button" className="signout-button" onClick={handleSignOut} title="로그아웃" aria-label="로그아웃">
            <LogOut size={16} aria-hidden="true" />
            {sidebarOpen && <span>로그아웃</span>}
          </button>
        </div>
      </aside>

      <div className="app-frame">
        <header className={`app-topbar${page === 'dashboard' ? ' dashboard' : ''}`}>
          <div className="topbar-location" aria-label={`현재 페이지: ${currentItem.label}`}>
            <CurrentIcon size={17} aria-hidden="true" />
            <span>{page === 'dashboard' ? '나만의 플래너' : currentItem.label}</span>
          </div>
          <div className="topbar-actions">
            <SaveIndicator state={saveState} error={saveError} onRetry={() => { void retrySave() }} compact />
            <IconButton label="링크 정리" icon={<Link2 size={17} />} size="sm" variant="secondary" onClick={() => setLinkModalOpen(true)} />
            <IconButton label="전체 메뉴" icon={<Menu size={18} />} size="sm" variant="secondary" className="mobile-menu-button" onClick={() => setMobileMenuOpen(true)} />
          </div>
        </header>

        <main ref={mainRef} className="app-main" id="main-content" tabIndex={-1}>
          {children}
        </main>

        <nav className="mobile-bottom-nav" aria-label="모바일 주요 메뉴">
          {NAV_ITEMS.filter(item => BOTTOM_TABS.includes(item.id)).map(item => {
            const Icon = item.icon
            const active = item.id === page
            return (
              <button
                key={item.id}
                type="button"
                className={active ? 'active' : undefined}
                aria-current={active ? 'page' : undefined}
                onClick={() => navigateToPage(item.id)}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <Drawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} title="전체 메뉴" side="bottom">
        <div className="mobile-menu-sections">
          {NAV_GROUPS.map(group => (
            <section key={group.id}>
              <h3>{group.label}</h3>
              <div>
                {NAV_ITEMS.filter(item => item.group === group.id).map(item => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={item.id === page ? 'active' : undefined}
                      aria-current={item.id === page ? 'page' : undefined}
                      onClick={() => navigateToPage(item.id)}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </Drawer>

      <LinkOrganizerModal open={linkModalOpen} onClose={() => setLinkModalOpen(false)} />
    </div>
  )
}
