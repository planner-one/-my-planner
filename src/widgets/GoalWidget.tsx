import { useEffect, useState, type CSSProperties } from 'react'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { useWidgetSize } from '../hooks/useWidgetSize'
import { getTodayTopGoals, sortPriorityGoals } from '../utils/goals'
import { toLocalDateKey } from '../utils/date'
import QuickAddModal from '../components/QuickAddModal'
import type { Goal, TopGoal } from '../types'

const TOP_GOAL_MAX = 6

// GoalActions(제목줄)와 GoalWidget(본문)이 별개 위치에 렌더링되므로
// "추가 모달 열기" 요청만 작은 pub/sub로 전달
const openModalListeners = new Set<() => void>()
function requestOpenGoalModal() {
  openModalListeners.forEach(listener => listener())
}
function subscribeOpenGoalModal(listener: () => void) {
  openModalListeners.add(listener)
  return () => { openModalListeners.delete(listener) }
}

export function GoalActions() {
  return (
    <button
      type="button"
      onClick={requestOpenGoalModal}
      title="추가"
      aria-label="추가"
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
  id: 'goal',
  name: '목표',
  icon: '🎯',
  defaultW: 8,
  defaultH: 7,
  minW: 5,
  minH: 4,
  order: 9,
  Actions: GoalActions,
}

type ModalType = 'top' | 'goal' | null

export default function GoalWidget() {
  const { goals, setGoals, topGoals, setTopGoals } = useApp()
  const { setPage } = useRouter()
  const { ref, w, h } = useWidgetSize()
  const [modal, setModal] = useState<ModalType>(null)
  const [draft, setDraft] = useState('')
  const [composing, setComposing] = useState(false)

  const today = toLocalDateKey()
  const todayTopGoals = getTodayTopGoals(topGoals, today)
  const compact = w > 0 && w < 340
  const hasAnyGoal = todayTopGoals.length > 0 || goals.length > 0
  const atMax = todayTopGoals.length >= TOP_GOAL_MAX

  // "오늘 방향"은 오늘 날짜에만 보이고, 장기 목표는 위젯 높이에 맞춰 보여준다.
  const itemH = compact ? 34 : 38
  const chrome = compact ? 90 : 105
  const goalSlots = h > 0 ? Math.max(1, Math.floor((h - chrome) / itemH)) : 3

  const visibleTopGoals = todayTopGoals
  const priorityGoals = sortPriorityGoals(goals).slice(0, goalSlots)
  const hiddenCount = Math.max(0, goals.length - priorityGoals.length)

  const toggleTopGoal = (id: string) => {
    setTopGoals(prev => prev.map(goal => goal.id === id ? { ...goal, done: !goal.done } : goal))
  }

  // 버튼 하나로 통합해서 모달 안에서 오늘 방향/장기 목표를 선택한다.
  const openModal = () => {
    setDraft('')
    setModal('top')
  }
  const closeModal = () => { setModal(null); setDraft('') }

  useEffect(() => subscribeOpenGoalModal(openModal), [])

  const submitModal = () => {
    const text = draft.trim()
    if (!text) return
    if (modal === 'top') {
      if (atMax) return
      const next: TopGoal = { id: `top-goal-${Date.now()}`, text, done: false, date: today }
      setTopGoals(prev => [...prev, next])
    } else if (modal === 'goal') {
      const next: Goal = {
        id: `goal-${Date.now()}`,
        name: text,
        area: '',
        pct: 0,
        status: '진행 중',
        due: '',
        steps: [],
      }
      setGoals(prev => [next, ...prev])
    }
    closeModal()
  }

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', padding: compact ? 10 : 12,
      boxSizing: 'border-box', gap: 6, overflow: 'hidden',
    }}>
      {!hasAnyGoal ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>오늘 방향과 장기 목표를 추가하세요</span>
          <button type="button" onClick={openModal} style={addButtonStyle}>+ 추가</button>
        </div>
      ) : (
        <>
          <section style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setPage('goals')}
              style={{ display: 'flex', alignItems: 'baseline', gap: 6, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', flexShrink: 0 }}
            >
              <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 800 }}>오늘 방향</span>
              {visibleTopGoals.length > 0 && (
                <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 800 }}>
                  {visibleTopGoals.filter(goal => goal.done).length}/{visibleTopGoals.length}
                </span>
              )}
            </button>
            {visibleTopGoals.map(goal => (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggleTopGoal(goal.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  border: 'none', borderRadius: 9,
                  background: goal.done ? 'var(--accent)' : 'var(--bg3)',
                  color: goal.done ? '#fff' : 'var(--text)',
                  padding: compact ? '6px 8px' : '7px 9px',
                  cursor: 'pointer', textAlign: 'left',
                  minWidth: 0, maxWidth: '100%',
                }}
              >
                <span style={{ flexShrink: 0, fontSize: compact ? 12 : 13, fontWeight: 900 }}>
                  {goal.done ? '✓' : '○'}
                </span>
                <span style={{
                  minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', fontSize: compact ? 12 : 13,
                  fontWeight: 800, textDecoration: goal.done ? 'line-through' : 'none',
                }}>
                  {goal.text}
                </span>
              </button>
            ))}
          </section>

          <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <button
              type="button"
              onClick={() => setPage('goals')}
              style={{ flexShrink: 0, border: 'none', background: 'transparent', padding: 0, color: 'var(--muted)', fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}
            >
              장기 목표
            </button>
            {priorityGoals.length > 0 && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {priorityGoals.map(goal => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setPage('goals')}
                    style={{
                      minHeight: 0, flex: 1,
                      border: 'none', borderRadius: 10,
                      background: 'var(--bg3)', padding: compact ? '8px 9px' : '9px 10px',
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    }}
                  >
                    <span style={{
                      minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', color: 'var(--text)', fontSize: compact ? 12 : 13,
                      fontWeight: 800,
                    }}>
                      {goal.name}
                    </span>
                    <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                      {goal.pct}%
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setPage('goals')}
              style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 10, flexShrink: 0 }}
            >
              장기 목표 +{hiddenCount}개 더 보기
            </button>
          )}
        </>
      )}

      {modal && (
        <QuickAddModal title="추가" onClose={closeModal}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setModal('top')}
              disabled={atMax}
              style={toggleButtonStyle(modal === 'top', atMax)}
            >
              오늘 방향
            </button>
            <button
              type="button"
              onClick={() => setModal('goal')}
              style={toggleButtonStyle(modal === 'goal', false)}
            >
              장기 목표
            </button>
          </div>
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onKeyDown={e => { if (e.key === 'Enter' && !composing) submitModal() }}
            placeholder={modal === 'top' ? '예: 오늘은 이력서 수정에 집중' : '예: 정보처리기사 합격'}
            style={{
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg3)', color: 'var(--text)', fontSize: 14,
              padding: '9px 12px', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7 }}>
            <button type="button" onClick={closeModal} style={modalSecondaryButtonStyle}>취소</button>
            <button type="button" onClick={submitModal} style={modalPrimaryButtonStyle}>추가</button>
          </div>
        </QuickAddModal>
      )}
    </div>
  )
}

const addButtonStyle: CSSProperties = {
  border: 'none', borderRadius: 7, background: 'var(--accent)',
  color: '#fff', fontSize: 12, fontWeight: 700, padding: '7px 12px', cursor: 'pointer',
}

const toggleButtonStyle = (active: boolean, disabled: boolean): CSSProperties => ({
  flex: 1, border: 'none', borderRadius: 7,
  background: active ? 'var(--accent)' : 'var(--bg3)',
  color: active ? '#fff' : disabled ? 'var(--muted)' : 'var(--text)',
  fontSize: 13, fontWeight: 700, padding: '8px 10px',
  cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
})

const modalPrimaryButtonStyle: CSSProperties = {
  border: 'none', borderRadius: 7, background: 'var(--accent)',
  color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 14px', cursor: 'pointer',
}

const modalSecondaryButtonStyle: CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 7, background: 'transparent',
  color: 'var(--muted)', fontSize: 13, padding: '8px 14px', cursor: 'pointer',
}
