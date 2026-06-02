import { useApp } from '../store/AppContext'

export const meta = {
  id: 'topgoal',
  name: '최우선 목표',
  icon: '🏆',
  defaultW: 7,
  defaultH: 5,
  minW: 4,
  minH: 3,
  order: 9,
}

export default function TopGoalWidget() {
  const { topGoals, setTopGoals } = useApp()

  const toggle = (id: string) =>
    setTopGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g))

  const top3 = topGoals.slice(0, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 14px', boxSizing: 'border-box', gap: 8, justifyContent: 'center' }}>
      {top3.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
          목표 관리 페이지에서 핵심 목표를 설정하세요
        </p>
      )}
      {top3.map((g, i) => (
        <div
          key={g.id}
          onClick={() => toggle(g.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            background: g.done ? 'var(--accent)' : 'var(--bg3)',
            transition: 'background 0.15s',
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>
            {g.done ? '✅' : ['🥇', '🥈', '🥉'][i]}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: g.done ? '#fff' : 'var(--text)',
            textDecoration: g.done ? 'line-through' : 'none',
          }}>{g.text}</span>
        </div>
      ))}
    </div>
  )
}
