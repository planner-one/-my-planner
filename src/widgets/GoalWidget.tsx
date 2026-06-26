import { useState, type CSSProperties } from 'react'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { useWidgetSize } from '../hooks/useWidgetSize'
import { sortPriorityGoals } from '../utils/goals'
import QuickAddModal from '../components/QuickAddModal'
import type { Goal, TopGoal } from '../types'

const TOP_GOAL_MAX = 6

export const meta = {
  id: 'goal',
  name: '목표',
  icon: '🎯',
  defaultW: 8,
  defaultH: 7,
  minW: 5,
  minH: 4,
  order: 8,
}

type ModalType = 'top' | 'goal' | null

export default function GoalWidget() {
  const { goals, setGoals, topGoals, setTopGoals } = useApp()
  const { setPage } = useRouter()
  const { ref, w, h } = useWidgetSize()
  const [modal, setModal] = useState<ModalType>(null)
  const [draft, setDraft] = useState('')
  const [composing, setComposing] = useState(false)

  const compact = w > 0 && w < 340
  const tight = h > 0 && h < 260
  const veryTight = h > 0 && h < 210
  const visibleTopGoals = topGoals.slice(0, veryTight ? 1 : 3)
  const visibleCount = veryTight ? 1 : tight ? 2 : 3
  const priorityGoals = sortPriorityGoals(goals).slice(0, visibleCount)
  const hiddenCount = Math.max(0, goals.length - priorityGoals.length)
  const hasAnyGoal = topGoals.length > 0 || goals.length > 0
  const atMax = topGoals.length >= TOP_GOAL_MAX

  const toggleTopGoal = (id: string) => {
    setTopGoals(prev => prev.map(goal => goal.id === id ? { ...goal, done: !goal.done } : goal))
  }

  const openModal = (type: Exclude<ModalType, null>) => {
    setDraft('')
    setModal(type)
  }
  const closeModal = () => { setModal(null); setDraft('') }

  const submitModal = () => {
    const text = draft.trim()
    if (!text) return
    if (modal === 'top') {
      if (atMax) return
      const next: TopGoal = { id: `top-goal-${Date.now()}`, text, done: false }
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
      boxSizing: 'border-box', gap: 8, overflow: 'hidden',
    }}>
      {!hasAnyGoal ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>오늘 집중과 목표를 추가하세요</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => openModal('top')} style={addButtonStyle}>+ 오늘 집중</button>
            <button type="button" onClick={() => openModal('goal')} style={addButtonStyle}>+ 목표</button>
          </div>
        </div>
      ) : (
        <>
          <section style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <button
                type="button"
                onClick={() => setPage('goals')}
                style={{ display: 'flex', alignItems: 'baseline', gap: 6, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
              >
                <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 800 }}>오늘 집중</span>
                {!veryTight && visibleTopGoals.length > 0 && (
                  <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 800 }}>
                    {visibleTopGoals.filter(goal => goal.done).length}/{visibleTopGoals.length}
                  </span>
                )}
              </button>
              <button type="button" onClick={() => openModal('top')} disabled={atMax} style={addIconStyle(atMax)}>+</button>
            </div>
            {visibleTopGoals.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {visibleTopGoals.map((goal, index) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleTopGoal(goal.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      border: 'none', borderRadius: 9,
                      background: goal.done ? 'var(--accent)' : 'var(--bg3)',
                      color: goal.done ? '#fff' : 'var(--text)',
                      padding: compact ? '7px 8px' : '8px 9px',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ flexShrink: 0, fontSize: compact ? 12 : 13, fontWeight: 900 }}>
                      {goal.done ? '✓' : index + 1}
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
              </div>
            )}
          </section>

          <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setPage('goals')}
                style={{ border: 'none', background: 'transparent', padding: 0, color: 'var(--muted)', fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}
              >
                목표
              </button>
              <button type="button" onClick={() => openModal('goal')} style={addIconStyle(false)}>+</button>
            </div>
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

          {topGoals.length > visibleTopGoals.length && !veryTight && (
            <button
              type="button"
              onClick={() => setPage('goals')}
              style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 10, flexShrink: 0 }}
            >
              오늘 집중 +{topGoals.length - visibleTopGoals.length}개
            </button>
          )}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setPage('goals')}
              style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 10, flexShrink: 0 }}
            >
              목표 +{hiddenCount}개 더 보기
            </button>
          )}
        </>
      )}

      {modal && (
        <QuickAddModal title={modal === 'top' ? '오늘 집중 추가' : '목표 추가'} onClose={closeModal}>
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onKeyDown={e => { if (e.key === 'Enter' && !composing) submitModal() }}
            placeholder={modal === 'top' ? '예: 시험 준비 흐름 만들기' : '예: 정보처리기사 합격'}
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

const addIconStyle = (disabled: boolean): CSSProperties => ({
  border: 'none', borderRadius: 6, background: 'var(--bg3)',
  color: disabled ? 'var(--muted)' : 'var(--accent)', fontSize: 13, fontWeight: 800,
  width: 22, height: 22, cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
  opacity: disabled ? 0.5 : 1,
})

const modalPrimaryButtonStyle: CSSProperties = {
  border: 'none', borderRadius: 7, background: 'var(--accent)',
  color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 14px', cursor: 'pointer',
}

const modalSecondaryButtonStyle: CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 7, background: 'transparent',
  color: 'var(--muted)', fontSize: 13, padding: '8px 14px', cursor: 'pointer',
}
