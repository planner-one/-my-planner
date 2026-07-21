import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useApp } from '../store/AppContext'
import type { ProductivityCategory, ScheduledTask } from '../types'
import QuickAddModal from './QuickAddModal'
import {
  PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED,
  PRODUCTIVITY_CATEGORY_LABELS,
  getProductivityLinkedTimeMinutes,
  getScheduledTaskSuggestedMinutes,
  normalizeProductivityCategory,
  updateProductivityLinkedTimeEntry,
} from '../utils/productivityCategories'

interface ScheduledTaskTimeButtonProps {
  task: ScheduledTask
  compact?: boolean
}

const fieldStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  minHeight: 42,
  boxSizing: 'border-box',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg3)',
  color: 'var(--text)',
  padding: '0 11px',
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: 16,
}

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}분`
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`
}

export default function ScheduledTaskTimeButton({
  task,
  compact = false,
}: ScheduledTaskTimeButtonProps) {
  const { productivityTimeHistory, setProductivityTimeHistory } = useApp()
  const suggestedMinutes = getScheduledTaskSuggestedMinutes(task)
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(task.date)
  const [category, setCategory] = useState<ProductivityCategory>(normalizeProductivityCategory(task.category))
  const [minutes, setMinutes] = useState(suggestedMinutes ?? 25)

  const recordedMinutes = useMemo(() => Object.values(productivityTimeHistory)
    .reduce((total, day) => total + PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED.reduce(
      (dayTotal, item) => dayTotal + getProductivityLinkedTimeMinutes(day[item], 'scheduled', task.id),
      0,
    ), 0), [productivityTimeHistory, task.id])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const openModal = () => {
    setDate(task.date)
    setCategory(normalizeProductivityCategory(task.category))
    setMinutes(suggestedMinutes ?? 25)
    setOpen(true)
  }

  const save = () => {
    const amount = Math.max(0, Math.min(1440, Math.round(Number(minutes))))
    if (!date || !amount) return
    setProductivityTimeHistory(current => updateProductivityLinkedTimeEntry(
      current,
      date,
      category,
      {
        sourceType: 'scheduled',
        sourceId: task.id,
        title: task.title,
      },
      currentMinutes => currentMinutes + amount,
    ))
    setOpen(false)
  }

  const buttonLabel = recordedMinutes > 0
    ? `${task.title} 시간 기록, 현재 ${formatMinutes(recordedMinutes)}`
    : `${task.title} 시간 기록`

  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
      onClick={event => event.stopPropagation()}
      onMouseDown={event => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={openModal}
        title={buttonLabel}
        aria-label={buttonLabel}
        style={{
          width: compact ? 32 : 36,
          height: compact ? 32 : 36,
          minWidth: compact ? 32 : 36,
          minHeight: compact ? 32 : 36,
          padding: 0,
          border: '1px solid var(--border)',
          borderRadius: 7,
          background: recordedMinutes > 0 ? 'var(--accent-soft)' : 'var(--bg2)',
          color: recordedMinutes > 0 ? 'var(--accent)' : 'var(--muted)',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        ◷
      </button>

      {open && (
        <QuickAddModal title="일정 시간 기록" onClose={() => setOpen(false)}>
          <div style={{ minWidth: 0, padding: '9px 11px', borderRadius: 8, background: 'var(--bg3)' }}>
            <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>
              {task.title}
            </strong>
            <span style={{ display: 'block', marginTop: 4, color: 'var(--muted)', fontSize: 11 }}>
              기존 기록 {recordedMinutes > 0 ? formatMinutes(recordedMinutes) : '없음'}
            </span>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700 }}>날짜</span>
            <input type="date" value={date} onChange={event => setDate(event.target.value)} style={fieldStyle} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700 }}>분야</span>
            <select
              value={category}
              onChange={event => setCategory(event.target.value as ProductivityCategory)}
              style={fieldStyle}
            >
              {PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED.map(item => (
                <option key={item} value={item}>{PRODUCTIVITY_CATEGORY_LABELS[item]}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700 }}>실제 소요 시간</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min="1"
                max="1440"
                value={minutes}
                onChange={event => setMinutes(Number(event.target.value))}
                onKeyDown={event => { if (event.key === 'Enter') save() }}
                style={fieldStyle}
              />
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>분</span>
            </div>
          </label>

          {suggestedMinutes !== null && (
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 11, lineHeight: 1.5 }}>
              예정 시간 {task.time}~{task.endTime} 기준 {formatMinutes(suggestedMinutes)}를 입력해 두었습니다.
            </p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={!date || !Number.isFinite(Number(minutes)) || Number(minutes) <= 0}
            style={{
              minHeight: 42,
              border: 0,
              borderRadius: 8,
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              opacity: !date || !Number.isFinite(Number(minutes)) || Number(minutes) <= 0 ? 0.5 : 1,
            }}
          >
            시간 추가
          </button>
        </QuickAddModal>
      )}
    </span>
  )
}
