import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { toLocalDateKey } from '../utils/date'
import type { ScheduledTask } from '../types'

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
  const today = toLocalDateKey()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [composing, setComposing] = useState(false)

  const toggle = (id: string) =>
    setScheduledTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const add = () => {
    const text = title.trim()
    if (!text) return
    const task: ScheduledTask = {
      id: `scheduled-${Date.now()}`,
      title: text,
      date: date || today,
      done: false,
    }
    setScheduledTasks(prev => [...prev, task])
    setTitle('')
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '8px 12px', boxSizing: 'border-box', gap: 6, overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={e => { if (e.key === 'Enter' && !composing) add() }}
          placeholder="예정된 작업 추가..."
          style={{
            flex: 1, minWidth: 0, border: '1px solid var(--border)', borderRadius: 7,
            background: 'var(--bg3)', color: 'var(--text)', fontSize: 12,
            padding: '6px 9px', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{
            border: '1px solid var(--border)', borderRadius: 7,
            background: 'var(--bg3)', color: 'var(--text)', fontSize: 12,
            padding: '6px 6px', outline: 'none', fontFamily: 'inherit', flexShrink: 0,
          }}
        />
        <button onClick={add} style={{
          border: 'none', borderRadius: 7, background: 'var(--accent)',
          color: '#fff', fontSize: 14, width: 30, cursor: 'pointer', flexShrink: 0,
        }}>+</button>
      </div>

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
            {(t.location || t.address || t.note) && (
              <div style={{
                marginTop: 2, fontSize: 10, color: 'var(--muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {[t.location, t.address, t.note].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: t.date === today ? 'var(--accent)' : 'var(--muted)', fontWeight: t.date === today ? 700 : 400 }}>
              {formatDate(t.date)}
            </div>
            {t.time && (
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {t.time}{t.endTime ? `~${t.endTime}` : ''}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
