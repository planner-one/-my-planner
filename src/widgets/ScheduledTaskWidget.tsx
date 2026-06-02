import { useApp } from '../store/AppContext'

export const meta = {
  id: 'scheduled',
  name: '예정된 작업',
  icon: '📅',
  defaultW: 8,
  defaultH: 7,
  minW: 4,
  minH: 4,
  order: 13,
}

export default function ScheduledTaskWidget() {
  const { scheduledTasks, setScheduledTasks } = useApp()

  const today = new Date().toISOString().slice(0, 10)

  const toggle = (id: string) =>
    setScheduledTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const upcoming = [...scheduledTasks]
    .filter(t => t.date >= today)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.time ?? '').localeCompare(b.time ?? '')
    })
    .slice(0, 10)

  const formatDate = (date: string) => {
    const d = new Date(date)
    const diff = Math.round((d.getTime() - new Date(today).getTime()) / 86400000)
    if (diff === 0) return '오늘'
    if (diff === 1) return '내일'
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '8px 12px', boxSizing: 'border-box', gap: 4, overflowY: 'auto' }}>
      {upcoming.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
          예정된 작업이 없어요
        </p>
      )}
      {upcoming.map(t => (
        <div
          key={t.id}
          onClick={() => toggle(t.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
            background: 'var(--bg3)',
          }}
        >
          <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} style={{ cursor: 'pointer', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, color: t.done ? 'var(--muted)' : 'var(--text)',
              textDecoration: t.done ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{t.title}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: t.date === today ? 'var(--accent)' : 'var(--muted)', fontWeight: t.date === today ? 700 : 400 }}>
              {formatDate(t.date)}
            </div>
            {t.time && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.time}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
