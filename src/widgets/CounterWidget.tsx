import { useApp } from '../store/AppContext'

export const meta = {
  id: 'counter',
  name: '카운터',
  icon: '🔢',
  defaultW: 6,
  defaultH: 5,
  minW: 4,
  minH: 3,
  order: 6,
}

export default function CounterWidget() {
  const { counters, setCounters } = useApp()

  const today = new Date().toISOString().slice(0, 10)

  const incFocus = () => {
    setCounters(prev => {
      const isToday = prev.fDate === today
      return { ...prev, f: isToday ? prev.f + 1 : 1, fDate: today }
    })
  }

  const incWeekly = () => setCounters(prev => ({ ...prev, w: prev.w + 1 }))
  const resetWeekly = () => setCounters(prev => ({ ...prev, w: 0 }))

  const todayF = counters.fDate === today ? counters.f : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 14px', boxSizing: 'border-box', gap: 10 }}>
      {/* 집중 세션 */}
      <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>오늘 집중 세션</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--accent)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
          {todayF}
        </div>
        <button onClick={incFocus} style={{
          border: 'none', borderRadius: 6, background: 'var(--accent)',
          color: '#fff', fontSize: 13, padding: '5px 0', cursor: 'pointer', fontWeight: 600,
        }}>+ 세션 기록</button>
      </div>

      {/* 주간 성과 */}
      <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>주간 성과</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--text)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
          {counters.w}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={incWeekly} style={{
            flex: 1, border: 'none', borderRadius: 6, background: 'var(--accent)',
            color: '#fff', fontSize: 13, padding: '5px 0', cursor: 'pointer', fontWeight: 600,
          }}>+</button>
          <button onClick={resetWeekly} style={{
            flex: 1, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg4)',
            color: 'var(--muted)', fontSize: 13, padding: '5px 0', cursor: 'pointer',
          }}>초기화</button>
        </div>
      </div>
    </div>
  )
}
