import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { toLocalDateKey } from '../utils/date'

export const meta = {
  id: 'habit',
  name: '일일 루틴',
  icon: '🏃',
  defaultW: 7,
  defaultH: 7,
  minW: 4,
  minH: 3,
  order: 4,
}

export default function HabitWidget() {
  const { habits, habitHistory, setHabitHistory } = useApp()
  const { setPage } = useRouter()
  const today = toLocalDateKey()
  const todayRecord = habitHistory[today] ?? {}

  const toggle = (id: string) => {
    setHabitHistory(prev => ({
      ...prev,
      [today]: {
        ...Object.fromEntries(habits.map(habit => [habit.id, prev[today]?.[habit.id] ?? false])),
        [id]: !prev[today]?.[id],
      },
    }))
  }

  const doneCnt = habits.filter(h => todayRecord[h.id]).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '8px 12px', boxSizing: 'border-box', gap: 6 }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {habits.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            color: 'var(--muted)', textAlign: 'center',
          }}>
            <span style={{ fontSize: 12 }}>아직 등록된 루틴이 없습니다.</span>
            <button
              type="button"
              onClick={() => setPage('habits')}
              style={{
                border: 0, borderRadius: 7, padding: '8px 12px',
                background: 'var(--accent)', color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              습관 페이지에서 루틴 추가
            </button>
          </div>
        )}
        {habits.map(h => {
          const done = !!todayRecord[h.id]
          return (
            <div
              key={h.id}
              onClick={() => toggle(h.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                background: done ? 'var(--accent)' : 'var(--bg3)',
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{done ? '✅' : '⬜'}</span>
              <span style={{
                fontSize: 13, color: done ? '#fff' : 'var(--text)',
                textDecoration: done ? 'line-through' : 'none',
              }}>{h.name}</span>
            </div>
          )
        })}
      </div>
      {habits.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
          {doneCnt} / {habits.length} 완료
        </div>
      )}
    </div>
  )
}
