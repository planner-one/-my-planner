import { useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { useWidgetSize } from '../hooks/useWidgetSize'
import { toLocalDateKey } from '../utils/date'
import { EVERY_DAY, createHabitId, getHabitIcon, isHabitScheduled } from '../utils/habits'
import QuickAddModal from '../components/QuickAddModal'

// HabitActions(제목줄)와 HabitWidget(본문)이 별개 위치에 렌더링되므로
// "추가 모달 열기" 요청만 작은 pub/sub로 전달
const openModalListeners = new Set<() => void>()
function requestOpenHabitModal() {
  openModalListeners.forEach(listener => listener())
}
function subscribeOpenHabitModal(listener: () => void) {
  openModalListeners.add(listener)
  return () => { openModalListeners.delete(listener) }
}

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
      <button
        type="button"
        onClick={requestOpenHabitModal}
        title="루틴 추가"
        aria-label="루틴 추가"
        style={{
          width: 26, height: 26, padding: 0,
          border: '1px solid var(--border)', borderRadius: 6,
          background: 'transparent', color: 'var(--accent)',
          fontSize: 14, fontWeight: 800,
          cursor: 'pointer',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}
      >
        +
      </button>
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
  const { habits, setHabits, habitHistory, setHabitHistory } = useApp()
  const { setPage } = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [input, setInput] = useState('')
  const [composing, setComposing] = useState(false)
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

  const openModal = () => { setInput(''); setModalOpen(true) }
  const closeModal = () => setModalOpen(false)

  useEffect(() => subscribeOpenHabitModal(openModal), [])

  const addHabit = () => {
    const name = input.trim()
    if (!name || habits.some(habit => habit.name === name)) return
    const habit = {
      id: createHabitId(),
      name,
      icon: '✨',
      repeatDays: [...EVERY_DAY],
      createdAt: new Date().toISOString(),
    }
    setHabits(prev => [...prev, habit])
    setHabitHistory(prev => ({
      ...prev,
      [today]: { ...(prev[today] ?? {}), [habit.id]: false },
    }))
    closeModal()
  }

  const doneCnt = activeHabits.filter(h => todayRecord[h.id]).length
  const percentage = activeHabits.length === 0 ? 0 : Math.round((doneCnt / activeHabits.length) * 100)
  const compact = w > 0 && w < 310
  const short = h > 0 && h < 250
  const horizontalPadding = compact ? 12 : 18
  const rowHeight = short ? 30 : compact ? 34 : 37
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
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        {habits.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            color: 'var(--muted)', textAlign: 'center',
          }}>
            <span style={{ fontSize: 12 }}>아직 등록된 루틴이 없습니다.</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={openModal}
                style={{
                  border: 0, borderRadius: 7, padding: '8px 12px',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                + 루틴 추가
              </button>
              <button
                type="button"
                onClick={() => setPage('habits')}
                style={{
                  border: '1px solid var(--border)', borderRadius: 7, padding: '8px 12px',
                  background: 'transparent', color: 'var(--muted)',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                습관 페이지
              </button>
            </div>
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
                padding: short ? '1px 0' : compact ? '2px 0' : '3px 0',
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

      {modalOpen && (
        <QuickAddModal title="새 루틴 추가" onClose={closeModal}>
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onKeyDown={e => { if (e.key === 'Enter' && !composing) addHabit() }}
            placeholder="예: 물 8잔 마시기"
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
              onClick={addHabit}
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
