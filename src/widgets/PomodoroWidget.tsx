import { useEffect, useRef, useState } from 'react'

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

  const R = 52
  const C = 2 * Math.PI * R
  const dash = C * pct

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 12, boxSizing: 'border-box' }}>
      {/* 모드 선택 */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['focus', 'short', 'long'] as Mode[]).map(m => (
          <button key={m} onClick={() => switchMode(m)} style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 12,
            border: '1px solid var(--border)', cursor: 'pointer',
            background: mode === m ? 'var(--accent)' : 'var(--bg3)',
            color: mode === m ? '#fff' : 'var(--muted)',
          }}>{LABELS[m]}</button>
        ))}
      </div>

      {/* 원형 타이머 */}
      <div style={{ position: 'relative', width: 128, height: 128 }}>
        <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={64} cy={64} r={R} fill="none" stroke="var(--border)" strokeWidth={8} />
          <circle
            cx={64} cy={64} r={R} fill="none"
            stroke="var(--accent)" strokeWidth={8}
            strokeDasharray={`${dash} ${C}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            {mm}:{ss}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{LABELS[mode]}</span>
        </div>
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setRunning(r => !r)} style={{
          padding: '6px 20px', borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: '#fff', fontSize: 13,
          fontWeight: 600, cursor: 'pointer',
        }}>{running ? '일시정지' : '시작'}</button>
        <button onClick={reset} style={{
          padding: '6px 14px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg3)',
          color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
        }}>초기화</button>
      </div>
    </div>
  )
}
