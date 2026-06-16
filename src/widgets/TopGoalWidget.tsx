import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { useWidgetSize } from '../hooks/useWidgetSize'

export const meta = {
  id: 'topgoal',
  name: '최우선 목표',
  icon: '🏆',
  defaultW: 7,
  defaultH: 5,
  minW: 5,
  minH: 3,
  order: 9,
}

export default function TopGoalWidget() {
  const { topGoals, setTopGoals } = useApp()
  const { setPage } = useRouter()
  const { ref, w, h } = useWidgetSize()

  const compact = w > 0 && w < 330
  const tight = h > 0 && h < 180
  const top3 = topGoals.slice(0, tight ? 2 : 3)
  const doneCount = top3.filter(goal => goal.done).length

  const toggle = (id: string) =>
    setTopGoals(prev => prev.map(goal => goal.id === id ? { ...goal, done: !goal.done } : goal))

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: compact ? 10 : 12, boxSizing: 'border-box',
      gap: tight ? 6 : 8, overflow: 'hidden',
    }}>
      {top3.length === 0 ? (
        <button
          type="button"
          onClick={() => setPage('goals')}
          style={{
            flex: 1, border: '1px dashed var(--border)', borderRadius: 10,
            background: 'var(--bg3)', color: 'var(--muted)', cursor: 'pointer',
            fontSize: 12, lineHeight: 1.5,
          }}
        >
          오늘의 방향을 설정하세요
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setPage('goals')}
            style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 8, border: 'none', background: 'transparent', padding: 0,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 800 }}>오늘의 방향</span>
            <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 800 }}>
              {doneCount}/{top3.length}
            </span>
          </button>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: tight ? 5 : 7 }}>
            {top3.map((goal, index) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggle(goal.id)}
                style={{
                  flex: 1, minHeight: 0,
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: compact ? '8px 9px' : '9px 11px',
                  borderRadius: 10, cursor: 'pointer', border: 'none',
                  background: goal.done ? 'var(--accent)' : 'var(--bg3)',
                  color: goal.done ? '#fff' : 'var(--text)',
                  textAlign: 'left',
                }}
              >
                <span style={{ flexShrink: 0, fontSize: compact ? 14 : 16, fontWeight: 900 }}>
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
        </>
      )}
    </div>
  )
}
