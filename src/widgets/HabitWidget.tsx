import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { useWidgetSize } from '../hooks/useWidgetSize'
import { toLocalDateKey } from '../utils/date'
import { getHabitIcon, isHabitScheduled } from '../utils/habits'

function HabitActions() {
  const {
    habits, habitHistory, setHabitHistory,
    habitSavedAt, setHabitSavedAt, saveWithOverrides,
  } = useApp()
  const [saving, setSaving] = useState(false)
  const today = toLocalDateKey()
  const todayRecord = habitHistory[today] ?? {}
  const activeHabits = habits.filter(habit => isHabitScheduled(habit))
  const done = activeHabits.filter(habit => todayRecord[habit.id]).length
  const percentage = activeHabits.length === 0 ? 0 : Math.round((done / activeHabits.length) * 100)
  const saved = Boolean(habitSavedAt[today])

  const saveToday = async () => {
    if (saving || activeHabits.length === 0) return
    const savedAt = new Date().toISOString()
    const nextRecord = Object.fromEntries(
      activeHabits.map(habit => [habit.id, todayRecord[habit.id] ?? false])
    )
    const nextHistory = { ...habitHistory, [today]: nextRecord }
    const nextSavedAt = { ...habitSavedAt, [today]: savedAt }
    setSaving(true)
    setHabitHistory(nextHistory)
    setHabitSavedAt(nextSavedAt)
    await saveWithOverrides({
      habits,
      habitHistory: nextHistory,
      habitSavedAt: nextSavedAt,
    })
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {activeHabits.length > 0 && (
        <button
          type="button"
          onClick={saveToday}
          disabled={saving}
          title={saved ? '오늘 기록 다시 저장' : '오늘 기록 저장'}
          aria-label={saved ? '오늘 기록 다시 저장' : '오늘 기록 저장'}
          style={{
            width: 26, height: 26, padding: 0,
            border: '1px solid var(--border)', borderRadius: 6,
            background: 'transparent', color: saved ? 'var(--accent)' : 'var(--muted)',
            fontSize: saved ? 14 : 12, fontWeight: 800,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.55 : 1,
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}
        >
          {saving ? '…' : saved ? '✓' : '💾'}
        </button>
      )}
      <span style={{
        minWidth: 40, padding: '3px 8px', borderRadius: 999,
        background: 'var(--bg3)', color: 'var(--accent)',
        fontSize: 12, fontWeight: 700, textAlign: 'center',
      }}>
        {percentage}%
      </span>
    </div>
  )
}

export const meta = {
  id: 'habit',
  name: '일일 루틴',
  icon: '🏃',
  defaultW: 7,
  defaultH: 7,
  minW: 4,
  minH: 3,
  order: 4,
  Actions: HabitActions,
}

export default function HabitWidget() {
  const { ref, w, h } = useWidgetSize()
  const { habits, habitHistory, setHabitHistory } = useApp()
  const { setPage } = useRouter()
  const today = toLocalDateKey()
  const todayRecord = habitHistory[today] ?? {}
  const activeHabits = habits.filter(habit => isHabitScheduled(habit))

  const toggle = (id: string) => {
    setHabitHistory(prev => ({
      ...prev,
      [today]: {
        ...Object.fromEntries(activeHabits.map(habit => [habit.id, prev[today]?.[habit.id] ?? false])),
        [id]: !prev[today]?.[id],
      },
    }))
  }

  const doneCnt = activeHabits.filter(h => todayRecord[h.id]).length
  const percentage = activeHabits.length === 0 ? 0 : Math.round((doneCnt / activeHabits.length) * 100)
  const compact = w > 0 && w < 310
  const short = h > 0 && h < 250
  const horizontalPadding = compact ? 12 : 18
  const rowHeight = short ? 34 : compact ? 38 : 42
  const checkSize = compact ? 21 : 24

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: `2px ${horizontalPadding}px ${compact ? 10 : 14}px`,
      boxSizing: 'border-box', gap: compact ? 9 : 14,
    }}>
      {activeHabits.length > 0 && (
        <div style={{
          height: compact ? 5 : 7, borderRadius: 999, background: 'var(--bg3)',
          overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{
            width: `${percentage}%`, height: '100%',
            borderRadius: 'inherit', background: 'var(--accent)',
            transition: 'width 0.25s ease',
          }} />
        </div>
      )}
      <div style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 3,
      }}>
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
        {habits.length > 0 && activeHabits.length === 0 && (
          <div style={{
            flex: 1, display: 'grid', placeItems: 'center',
            color: 'var(--muted)', fontSize: 12, textAlign: 'center',
          }}>
            오늘 예정된 루틴이 없습니다.
          </div>
        )}
        {activeHabits.map(h => {
          const done = !!todayRecord[h.id]
          return (
            <button
              type="button"
              key={h.id}
              onClick={() => toggle(h.id)}
              style={{
                width: '100%', minHeight: rowHeight,
                display: 'grid',
                gridTemplateColumns: `${checkSize}px ${compact ? 20 : 24}px minmax(0, 1fr)`,
                alignItems: 'center', gap: compact ? 7 : 8,
                padding: short ? '2px 0' : compact ? '4px 0' : '5px 0',
                border: 0, background: 'transparent', color: 'var(--text)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{
                width: checkSize, height: checkSize,
                borderRadius: compact ? 5 : 6, boxSizing: 'border-box',
                display: 'grid', placeItems: 'center',
                border: `1.5px solid ${done ? 'var(--accent)' : 'var(--border)'}`,
                background: done ? 'var(--accent)' : 'transparent',
                color: '#fff', fontSize: compact ? 13 : 15, fontWeight: 800,
                transition: 'background 0.15s, border-color 0.15s',
              }}>
                {done ? '✓' : ''}
              </span>
              <span style={{ fontSize: compact ? 15 : 17, lineHeight: 1 }}>{getHabitIcon(h)}</span>
              <span style={{
                minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', fontSize: compact ? 12 : 14,
                color: done ? 'var(--muted)' : 'var(--text)',
                textDecoration: done ? 'line-through' : 'none',
              }}>{h.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
