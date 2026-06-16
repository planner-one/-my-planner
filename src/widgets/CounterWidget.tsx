import { useApp } from '../store/AppContext'
import { useWidgetSize } from '../hooks/useWidgetSize'
import { toLocalDateKey } from '../utils/date'

export const meta = {
  id: 'counter',
  name: '카운터',
  icon: '🔢',
  defaultW: 6,
  defaultH: 5,
  minW: 5,
  minH: 4,
  order: 6,
}

export default function CounterWidget() {
  const { ref, w, h } = useWidgetSize()
  const { counters, setCounters } = useApp()

  const today = toLocalDateKey()
  const compact = w > 0 && w < 320
  const short = h > 0 && h < 210
  const tight = h > 0 && h < 175
  const split = short && w >= 360
  const padding = tight ? 8 : compact || short ? 10 : 14
  const cardPadding = tight ? 8 : compact || short ? 10 : 14
  const gap = tight ? 6 : compact || short ? 7 : 10
  const valueSize = tight ? 23 : short ? 26 : compact ? 30 : 36
  const labelSize = compact || short ? 11 : 12
  const buttonHeight = tight ? 24 : short ? 27 : 31

  const incFocus = () => {
    setCounters(prev => {
      const isToday = prev.fDate === today
      return { ...prev, f: isToday ? prev.f + 1 : 1, fDate: today }
    })
  }

  const decFocus = () => {
    setCounters(prev => {
      const current = prev.fDate === today ? prev.f : 0
      return { ...prev, f: Math.max(0, current - 1), fDate: today }
    })
  }

  const incWeekly = () => setCounters(prev => ({ ...prev, w: prev.w + 1 }))
  const decWeekly = () => setCounters(prev => ({ ...prev, w: Math.max(0, prev.w - 1) }))
  const resetWeekly = () => setCounters(prev => ({ ...prev, w: 0 }))

  const todayF = counters.fDate === today ? counters.f : 0

  return (
    <div ref={ref} style={{
      display: 'grid',
      gridTemplateColumns: split ? '1fr 1fr' : '1fr',
      height: '100%', padding, boxSizing: 'border-box', gap,
      overflow: 'hidden',
    }}>
      {/* 집중 세션 */}
      <div style={{
        minHeight: 0, background: 'var(--bg3)', borderRadius: 10,
        padding: cardPadding, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', gap: 6,
      }}>
        <div>
          <div style={{ fontSize: labelSize, color: 'var(--muted)', fontWeight: 600 }}>오늘 집중 세션</div>
          {!tight && (
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
              타이머 완료 시 자동 기록
            </div>
          )}
        </div>
        <div style={{
          fontSize: valueSize, fontWeight: 800, color: 'var(--accent)',
          textAlign: 'center', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {todayF}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', gap: 6 }}>
          <button onClick={decFocus} aria-label="집중 세션 하나 빼기" style={{
            height: buttonHeight, border: '1px solid var(--border)', borderRadius: 6,
            background: 'var(--bg4)', color: 'var(--muted)',
            fontSize: 14, cursor: 'pointer',
          }}>−</button>
          <button onClick={incFocus} style={{
            height: buttonHeight, border: 'none', borderRadius: 6, background: 'var(--accent)',
            color: '#fff', fontSize: tight ? 10 : compact || short ? 11 : 12,
            cursor: 'pointer', fontWeight: 700,
          }}>{tight ? '추가' : '수동 추가'}</button>
        </div>
      </div>

      {/* 주간 성과 */}
      <div style={{
        minHeight: 0, background: 'var(--bg3)', borderRadius: 10,
        padding: cardPadding, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', gap: 6,
      }}>
        <div>
          <div style={{ fontSize: labelSize, color: 'var(--muted)', fontWeight: 600 }}>주간 성과</div>
          {!tight && (
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
              직접 기록하는 성과
            </div>
          )}
        </div>
        <div style={{
          fontSize: valueSize, fontWeight: 800, color: 'var(--text)',
          textAlign: 'center', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {counters.w}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 6 }}>
          <button onClick={decWeekly} aria-label="주간 성과 하나 빼기" style={{
            border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg4)',
            color: 'var(--muted)', fontSize: 13, cursor: 'pointer', height: buttonHeight,
          }}>−</button>
          <button onClick={incWeekly} style={{
            border: 'none', borderRadius: 6, background: 'var(--accent)',
            color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700,
            height: buttonHeight,
          }}>+</button>
          <button onClick={resetWeekly} style={{
            border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg4)',
            color: 'var(--muted)', fontSize: tight ? 9 : compact || short ? 10 : 11,
            cursor: 'pointer', height: buttonHeight,
          }}>초기화</button>
        </div>
      </div>
    </div>
  )
}
