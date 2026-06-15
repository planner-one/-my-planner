import { useEffect, useRef, useState } from 'react'
import { useWidgetSize } from '../hooks/useWidgetSize'

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
  const [mode, setMode] = useState<Mode>('focus')
  const [remaining, setRemaining] = useState(DURATIONS.focus)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            setRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const switchMode = (m: Mode) => {
    setMode(m)
    setRemaining(DURATIONS[m])
    setRunning(false)
  }

  const reset = () => {
    setRemaining(DURATIONS[mode])
    setRunning(false)
  }

  const total = DURATIONS[mode]
  const pct = remaining / total
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  const compact = w > 0 && w < 340
  const short = h > 0 && h < 235
  const shellPadding = short ? 8 : compact ? 10 : 12
  const gap = short ? 7 : compact ? 9 : 12
  const modeHeight = short ? 24 : 28
  const actionHeight = short ? 32 : 36
  const reservedHeight = shellPadding * 2 + modeHeight + actionHeight + gap * 2
  const circleSize = Math.max(
    82,
    Math.min(compact ? 116 : 132, (h || 260) - reservedHeight, (w || 300) - shellPadding * 2)
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
            height: modeHeight, fontSize: compact ? 10 : 11,
            padding: compact ? '0 8px' : '0 10px', borderRadius: 999,
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
            fontSize: Math.max(22, Math.round(circleSize * 0.22)),
            fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.05,
          }}>
            {mm}:{ss}
          </span>
          <span style={{ fontSize: compact ? 10 : 11, color: 'var(--muted)', marginTop: 5 }}>{LABELS[mode]}</span>
        </div>
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: compact ? 6 : 8, flexShrink: 0 }}>
        <button onClick={() => setRunning(r => !r)} style={{
          height: actionHeight, minWidth: compact ? 82 : 96,
          padding: compact ? '0 13px' : '0 20px',
          borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: '#fff', fontSize: compact ? 12 : 13,
          fontWeight: 600, cursor: 'pointer',
        }}>{running ? '일시정지' : '시작'}</button>
        <button onClick={reset} style={{
          height: actionHeight, minWidth: compact ? 74 : 86,
          padding: compact ? '0 11px' : '0 14px',
          borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg3)',
          color: 'var(--muted)', fontSize: compact ? 12 : 13, cursor: 'pointer',
        }}>초기화</button>
      </div>
    </div>
  )
}
