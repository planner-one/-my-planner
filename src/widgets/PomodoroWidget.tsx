import { useEffect, useRef, useState } from 'react'
import { useWidgetSize } from '../hooks/useWidgetSize'
import { useApp } from '../store/AppContext'
import { toLocalDateKey } from '../utils/date'

export const meta = {
  id: 'pomodoro',
  name: '집중 타이머',
  icon: '⏱',
  defaultW: 7,
  defaultH: 6,
  minW: 4,
  minH: 4,
  order: 5,
}

type Mode = 'focus' | 'short' | 'long'
const DURATIONS: Record<Mode, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 }
const LABELS: Record<Mode, string> = { focus: '집중', short: '짧은 휴식', long: '긴 휴식' }

export default function PomodoroWidget() {
  const { ref, w, h } = useWidgetSize()
  const { setCounters } = useApp()
  const [mode, setMode] = useState<Mode>('focus')
  const [remaining, setRemaining] = useState(DURATIONS.focus)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            setRunning(false)
            if (mode === 'focus' && !completedRef.current) {
              const today = toLocalDateKey()
              setCounters(current => ({
                ...current,
                f: current.fDate === today ? current.f + 1 : 1,
                fDate: today,
              }))
              completedRef.current = true
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [mode, running, setCounters])

  const switchMode = (m: Mode) => {
    setMode(m)
    setRemaining(DURATIONS[m])
    setRunning(false)
    completedRef.current = false
  }

  const reset = () => {
    setRemaining(DURATIONS[mode])
    setRunning(false)
    completedRef.current = false
  }

  const toggleRunning = () => {
    if (remaining <= 0) {
      completedRef.current = false
      setRemaining(DURATIONS[mode])
      setRunning(true)
      return
    }
    setRunning(r => !r)
  }

  const total = DURATIONS[mode]
  const pct = remaining / total
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  const compact = w > 0 && w < 340
  const short = h > 0 && h < 235
  const shellPadding = short ? 8 : compact ? 10 : 12
  const gap = short ? 6 : compact ? 9 : 12
  const modeHeight = short ? 26 : 30
  const actionHeight = short ? 34 : 40
  const reservedHeight = shellPadding * 2 + modeHeight + actionHeight + gap * 2
  const circleSize = Math.max(
    92,
    Math.min(compact ? 132 : 158, (h || 280) - reservedHeight, (w || 320) - shellPadding * 2)
  )
  const stroke = Math.max(6, Math.round(circleSize * 0.065))
  const R = (circleSize - stroke) / 2 - 2
  const center = circleSize / 2
  const C = 2 * Math.PI * R
  const dash = C * pct

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', gap, padding: shellPadding, boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* 모드 선택 */}
      <div style={{ display: 'flex', gap: compact ? 4 : 6, flexShrink: 0, maxWidth: '100%' }}>
        {(['focus', 'short', 'long'] as Mode[]).map(m => (
          <button key={m} onClick={() => switchMode(m)} style={{
            height: modeHeight, fontSize: compact ? 11 : 12,
            padding: compact ? '0 9px' : '0 12px', borderRadius: 999,
            border: '1px solid var(--border)', cursor: 'pointer',
            background: mode === m ? 'var(--accent)' : 'var(--bg3)',
            color: mode === m ? '#fff' : 'var(--muted)',
            whiteSpace: 'nowrap', lineHeight: 1,
          }}>{LABELS[m]}</button>
        ))}
      </div>

      {/* 원형 타이머 */}
      <div style={{ position: 'relative', width: circleSize, height: circleSize, flexShrink: 0 }}>
        <svg width={circleSize} height={circleSize} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={center} cy={center} r={R} fill="none" stroke="var(--border)" strokeWidth={stroke} />
          <circle
            cx={center} cy={center} r={R} fill="none"
            stroke="var(--accent)" strokeWidth={stroke}
            strokeDasharray={`${dash} ${C}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: Math.max(27, Math.round(circleSize * 0.28)),
            fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.05,
          }}>
            {mm}:{ss}
          </span>
          <span style={{ fontSize: compact ? 11 : 12, color: 'var(--muted)', marginTop: 5 }}>
            {remaining === 0 ? '완료' : LABELS[mode]}
          </span>
        </div>
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: compact ? 6 : 8, flexShrink: 0 }}>
        <button onClick={toggleRunning} style={{
          height: actionHeight, minWidth: compact ? 92 : 108,
          padding: compact ? '0 16px' : '0 22px',
          borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: '#fff', fontSize: compact ? 13 : 14,
          fontWeight: 700, cursor: 'pointer',
        }}>{remaining === 0 ? '다시 시작' : running ? '일시정지' : '시작'}</button>
        <button onClick={reset} style={{
          height: actionHeight, minWidth: compact ? 80 : 92,
          padding: compact ? '0 13px' : '0 16px',
          borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg3)',
          color: 'var(--muted)', fontSize: compact ? 13 : 14, cursor: 'pointer',
        }}>초기화</button>
      </div>
    </div>
  )
}
