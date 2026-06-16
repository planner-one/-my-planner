import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { useWidgetSize } from '../hooks/useWidgetSize'
import { getGoalDueText, getRemainingSteps, sortPriorityGoals } from '../utils/goals'

export const meta = {
  id: 'goal',
  name: '우선 목표',
  icon: '🎯',
  defaultW: 8,
  defaultH: 6,
  minW: 5,
  minH: 4,
  order: 8,
}

export default function GoalWidget() {
  const { goals } = useApp()
  const { setPage } = useRouter()
  const { ref, w, h } = useWidgetSize()

  const compact = w > 0 && w < 340
  const tight = h > 0 && h < 230
  const visibleCount = tight ? 2 : 3
  const priorityGoals = sortPriorityGoals(goals).slice(0, visibleCount)
  const hiddenCount = Math.max(0, goals.length - priorityGoals.length)

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', padding: compact ? 10 : 12,
      boxSizing: 'border-box', gap: 8, overflow: 'hidden',
    }}>
      {goals.length === 0 ? (
        <button
          type="button"
          onClick={() => setPage('goals')}
          style={{
            flex: 1, border: '1px dashed var(--border)', borderRadius: 10,
            background: 'var(--bg3)', color: 'var(--muted)',
            cursor: 'pointer', fontSize: 12, lineHeight: 1.5,
          }}
        >
          장기 목표를 추가하세요
        </button>
      ) : (
        <>
          <div style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            관리가 필요한 목표
          </div>
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
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setPage('goals')}
              style={{
                border: 'none', background: 'transparent', color: 'var(--muted)',
                cursor: 'pointer', fontSize: 10, flexShrink: 0,
              }}
            >
              +{hiddenCount}개 더 보기
            </button>
          )}
        </>
      )}
    </div>
  )
}
