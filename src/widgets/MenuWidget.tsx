import { useRouter } from '../store/RouterContext'

export const meta = {
  id: 'menu',
  name: '메뉴',
  icon: '🗂',
  defaultW: 6,
  defaultH: 8,
  minW: 4,
  minH: 4,
  order: 10,
}

const PAGES = [
  { id: 'dashboard', icon: '🏠', name: '홈' },
  { id: 'calendar', icon: '🗓', name: '캘린더' },
  { id: 'todos',   icon: '✅', name: '오늘 할 일' },
  { id: 'tasks',   icon: '🗒', name: '작업 관리' },
  { id: 'habits',  icon: '🏃', name: '습관 트래커' },
  { id: 'goals',   icon: '🎯', name: '목표 관리' },
  { id: 'projects', icon: '📁', name: '프로젝트' },
  { id: 'weekly',  icon: '📅', name: '주간 플래너' },
  { id: 'daily',   icon: '⏰', name: '일일 플래너' },
  { id: 'notes',   icon: '📝', name: '노트' },
  { id: 'journal', icon: '📔', name: '저널' },
  { id: 'career',  icon: '💼', name: '신청 관리' },
  { id: 'inquiries', icon: '💬', name: '문의' },
  { id: 'print',   icon: '🖨', name: '플래너 출력' },
  { id: 'profile', icon: '👤', name: '프로필' },
] as const

export default function MenuWidget() {
  const { setPage } = useRouter()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '8px 10px', boxSizing: 'border-box', gap: 4, overflowY: 'auto' }}>
      {PAGES.map(p => (
        <button
          key={p.id}
          onClick={() => setPage(p.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg3)',
            color: 'var(--text)', cursor: 'pointer', fontSize: 13,
            textAlign: 'left', fontFamily: 'inherit',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg4)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg3)')}
        >
          <span>{p.icon}</span>
          <span>{p.name}</span>
        </button>
      ))}
    </div>
  )
}
