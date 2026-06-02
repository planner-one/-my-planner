import { useApp } from '../store/AppContext'

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
  const { habits, setHabits, habitHistory, setHabitHistory } = useApp()
  const today = new Date().toISOString().slice(0, 10)
  const todayRecord = habitHistory[today] ?? {}

  const toggle = (name: string) => {
    setHabitHistory(prev => ({
      ...prev,
      [today]: { ...todayRecord, [name]: !todayRecord[name] },
    }))
  }

  const doneCnt = habits.filter(h => todayRecord[h.name]).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '8px 12px', boxSizing: 'border-box', gap: 6 }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {habits.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
            습관 트래커 페이지에서 루틴을 추가하세요
          </p>
        )}
        {habits.map(h => {
          const done = !!todayRecord[h.name]
          return (
            <div
              key={h.name}
              onClick={() => toggle(h.name)}
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
