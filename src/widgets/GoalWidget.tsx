import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { useWidgetSize } from '../hooks/useWidgetSize'
import { getGoalDueText, getRemainingSteps, sortPriorityGoals } from '../utils/goals'

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

export default function GoalWidget() {
  const { goals, topGoals, setTopGoals } = useApp()
  const { setPage } = useRouter()
  const { ref, w, h } = useWidgetSize()

  const compact = w > 0 && w < 340
  const tight = h > 0 && h < 260
  const veryTight = h > 0 && h < 210
  const visibleTopGoals = topGoals.slice(0, veryTight ? 1 : 3)
  const visibleCount = veryTight ? 1 : tight ? 2 : 3
  const priorityGoals = sortPriorityGoals(goals).slice(0, visibleCount)
  const hiddenCount = Math.max(0, goals.length - priorityGoals.length)
  const hasAnyGoal = topGoals.length > 0 || goals.length > 0

  const toggleTopGoal = (id: string) => {
    setTopGoals(prev => prev.map(goal => goal.id === id ? { ...goal, done: !goal.done } : goal))
  }

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', padding: compact ? 10 : 12,
      boxSizing: 'border-box', gap: 8, overflow: 'hidden',
    }}>
      {!hasAnyGoal ? (
        <button
          type="button"
          onClick={() => setPage('goals')}
          style={{
            flex: 1, border: '1px dashed var(--border)', borderRadius: 10,
            background: 'var(--bg3)', color: 'var(--muted)',
            cursor: 'pointer', fontSize: 12, lineHeight: 1.5,
          }}
        >
          오늘 집중과 장기 목표를 추가하세요
        </button>
      ) : (
        <>
          {visibleTopGoals.length > 0 && (
            <section style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                type="button"
                onClick={() => setPage('goals')}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
                }}
              >
                <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 800 }}>오늘 집중</span>
                {!veryTight && (
                  <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 800 }}>
                    {visibleTopGoals.filter(goal => goal.done).length}/{visibleTopGoals.length}
                  </span>
                )}
              </button>
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
            </section>
          )}

          {priorityGoals.length > 0 && (
            <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <button
                type="button"
                onClick={() => setPage('goals')}
                style={{
                  border: 'none', background: 'transparent', padding: 0,
                  color: 'var(--muted)', fontSize: 11, fontWeight: 800,
                  cursor: 'pointer', textAlign: 'left', flexShrink: 0,
                }}
              >
                장기 목표
              </button>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {priorityGoals.map(goal => {
                  const remaining = getRemainingSteps(goal)
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setPage('goals')}
                      style={{
                        minHeight: 0, flex: 1,
                        border: 'none', borderRadius: 10,
                        background: 'var(--bg3)', padding: compact ? '8px 9px' : '9px 10px',
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', flexDirection: 'column', gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
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
                      </div>
                      <div style={{ height: 5, borderRadius: 999, background: 'var(--bg4)', overflow: 'hidden' }}>
                        <span style={{
                          display: 'block', width: `${goal.pct}%`, height: '100%',
                          borderRadius: 'inherit', background: 'var(--accent)',
                        }} />
                      </div>
                      {!tight && (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 8, color: 'var(--muted)', fontSize: 10,
                        }}>
                          <span>{goal.area || goal.status || '장기 목표'}</span>
                          <span>{getGoalDueText(goal.due)} · 남은 단계 {remaining}개</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {topGoals.length > visibleTopGoals.length && !veryTight && (
            <button
              type="button"
              onClick={() => setPage('goals')}
              style={{
                border: 'none', background: 'transparent', color: 'var(--muted)',
                cursor: 'pointer', fontSize: 10, flexShrink: 0,
              }}
            >
              오늘 집중 +{topGoals.length - visibleTopGoals.length}개
            </button>
          )}
          {goals.length === 0 && (
            <button
              type="button"
              onClick={() => setPage('goals')}
              style={{
                flex: 1, border: '1px dashed var(--border)', borderRadius: 10,
                background: 'var(--bg3)', color: 'var(--muted)',
                cursor: 'pointer', fontSize: 12, lineHeight: 1.5,
              }}
            >
              장기 목표도 추가해보세요
            </button>
          )}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setPage('goals')}
              style={{
                border: 'none', background: 'transparent', color: 'var(--muted)',
                cursor: 'pointer', fontSize: 10, flexShrink: 0,
              }}
            >
              장기 목표 +{hiddenCount}개 더 보기
            </button>
          )}
        </>
      )}
    </div>
  )
}
