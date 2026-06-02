import { useApp } from '../store/AppContext'

export const meta = {
  id: 'goal',
  name: '우선 목표',
  icon: '🎯',
  defaultW: 8,
  defaultH: 7,
  minW: 4,
  minH: 4,
  order: 8,
}

export default function GoalWidget() {
  const { goals, setGoals } = useApp()

  const toggleStep = (goalId: string, stepIdx: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g
      const steps = g.steps.map((s, i) => i === stepIdx ? { ...s, done: !s.done } : s)
      const pct = steps.length ? Math.round(steps.filter(s => s.done).length / steps.length * 100) : 0
      return { ...g, steps, pct }
    }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '8px 12px', boxSizing: 'border-box', gap: 8, overflowY: 'auto' }}>
      {goals.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
          목표 관리 페이지에서 목표를 추가하세요
        </p>
      )}
      {goals.map(g => (
        <div key={g.id} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{g.name}</span>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{g.pct}%</span>
          </div>
          {/* 진행바 */}
          <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2, marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${g.pct}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          {/* 단계 */}
          {g.steps.slice(0, 4).map((s, i) => (
            <div key={i} onClick={() => toggleStep(g.id, i)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 0', cursor: 'pointer',
            }}>
              <span style={{ fontSize: 13 }}>{s.done ? '✅' : '⬜'}</span>
              <span style={{ fontSize: 12, color: s.done ? 'var(--muted)' : 'var(--text)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.text}</span>
            </div>
          ))}
          {g.steps.length > 4 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>+{g.steps.length - 4}개 더</div>
          )}
        </div>
      ))}
    </div>
  )
}
