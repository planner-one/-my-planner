import { useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import { toLocalDateKey } from '../utils/date'
import QuickAddModal from '../components/QuickAddModal'
import type { ScheduledTask } from '../types'

// ScheduledTaskActions(제목줄)와 본문이 별개 위치에 렌더링되므로
// "추가 모달 열기" 요청만 작은 pub/sub로 전달
const openModalListeners = new Set<() => void>()
function requestOpenScheduledModal() {
  openModalListeners.forEach(listener => listener())
}
function subscribeOpenScheduledModal(listener: () => void) {
  openModalListeners.add(listener)
  return () => { openModalListeners.delete(listener) }
}

export function ScheduledTaskActions() {
  return (
    <button
      type="button"
      onClick={requestOpenScheduledModal}
      title="작업 추가"
      aria-label="작업 추가"
      style={{
        width: 26, height: 26, padding: 0,
        border: '1px solid var(--border)', borderRadius: 6,
        background: 'transparent', color: 'var(--accent)',
        fontSize: 14, fontWeight: 800, cursor: 'pointer',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}
    >
      +
    </button>
  )
}

export const meta = {
  id: 'scheduled',
  name: '예정된 작업',
  icon: '📅',
  defaultW: 8,
  defaultH: 7,
  minW: 4,
  minH: 4,
  order: 13,
  Actions: ScheduledTaskActions,
}

export default function ScheduledTaskWidget() {
  const { scheduledTasks, setScheduledTasks } = useApp()
  const today = toLocalDateKey()
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [composing, setComposing] = useState(false)

  const toggle = (id: string) =>
    setScheduledTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const openModal = () => {
    setTitle('')
    setDate(today)
    setModalOpen(true)
  }
  const closeModal = () => setModalOpen(false)

  useEffect(() => subscribeOpenScheduledModal(openModal), [])

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
    closeModal()
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

      {modalOpen && (
        <QuickAddModal title="예정된 작업 추가" onClose={closeModal}>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onKeyDown={e => { if (e.key === 'Enter' && !composing) add() }}
            placeholder="예: 팀 회의 준비"
            style={{
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg3)', color: 'var(--text)', fontSize: 14,
              padding: '9px 12px', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg3)', color: 'var(--text)', fontSize: 14,
              padding: '9px 12px', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7 }}>
            <button
              type="button"
              onClick={closeModal}
              style={{
                border: '1px solid var(--border)', borderRadius: 7, background: 'transparent',
                color: 'var(--muted)', fontSize: 13, padding: '8px 14px', cursor: 'pointer',
              }}
            >취소</button>
            <button
              type="button"
              onClick={add}
              style={{
                border: 'none', borderRadius: 7, background: 'var(--accent)',
                color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 14px', cursor: 'pointer',
              }}
            >추가</button>
          </div>
        </QuickAddModal>
      )}
    </div>
  )
}
