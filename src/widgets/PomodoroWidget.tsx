import { useEffect, useRef, useState } from 'react'
import { useWidgetSize } from '../hooks/useWidgetSize'
import { useApp } from '../store/AppContext'
import { createDefaultCounters, updateCounterValue } from '../utils/counters'
import { toLocalDateKey } from '../utils/date'
import {
  PRODUCTIVITY_CATEGORIES,
  PRODUCTIVITY_CATEGORY_LABELS,
  isProductivityCategory,
  updateProductivityTimeBucket,
} from '../utils/productivityCategories'
import type { ProductivityCategory } from '../types'

export const meta = {
  id: 'pomodoro',
  name: '집중 타이머',
  icon: '⏱',
  defaultW: 7,
  defaultH: 6,
  minW: 4,
  minH: 4,
  order: 6,
}

type Mode = 'focus' | 'short' | 'long'
const DURATIONS: Record<Mode, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 }
const LABELS: Record<Mode, string> = { focus: '집중', short: '짧은 휴식', long: '긴 휴식' }
const SHORT_LABELS: Record<Mode, string> = { focus: '집중', short: '짧휴', long: '긴휴' }
const CATEGORY_STORAGE_KEY = 'pomodoro_productivity_category'

const getStoredCategory = (): ProductivityCategory => {
  const stored = localStorage.getItem(CATEGORY_STORAGE_KEY)
  return isProductivityCategory(stored) && stored !== 'uncategorized' ? stored : 'work'
}

export default function PomodoroWidget() {
  const { ref, w, h } = useWidgetSize()
  const { setCounters, setProductivityTimeHistory } = useApp()
  const [mode, setMode] = useState<Mode>('focus')
  const [category, setCategory] = useState<ProductivityCategory>(getStoredCategory)
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
              setCounters(current => {
                const hasFocusCounter = current.some(counter => counter.autoKey === 'pomodoro-focus')
                const source = hasFocusCounter
                  ? current
                  : [...createDefaultCounters().filter(counter => counter.autoKey === 'pomodoro-focus'), ...current]
                return source.map(counter => (
                  counter.autoKey === 'pomodoro-focus'
                    ? updateCounterValue(counter, 1)
                    : counter
                ))
              })
              setProductivityTimeHistory(current => updateProductivityTimeBucket(
                current,
                toLocalDateKey(),
                category,
                bucket => ({ focusSessions: bucket.focusSessions + 1 }),
              ))
              completedRef.current = true
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [category, mode, running, setCounters, setProductivityTimeHistory])

  const changeCategory = (next: ProductivityCategory) => {
    if (next === 'uncategorized') return
    setCategory(next)
    localStorage.setItem(CATEGORY_STORAGE_KEY, next)
  }

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
  const veryShort = h > 0 && h < 170
  const short = h > 0 && h < 235
  const shellPadding = veryShort ? 5 : short ? 7 : compact ? 10 : 12
  const gap = veryShort ? 4 : short ? 5 : compact ? 9 : 12
  const modeHeight = veryShort ? 21 : short ? 24 : 30
  const actionHeight = veryShort ? 26 : short ? 30 : 40
  const reservedHeight = shellPadding * 2 + modeHeight + actionHeight + gap * 2
  const availableCircleHeight = Math.max(42, (h || 280) - reservedHeight)
  const availableCircleWidth = Math.max(70, (w || 320) - shellPadding * 2)
  const circleSize = Math.max(
    veryShort ? 42 : short ? 66 : 92,
    Math.min(compact ? 132 : 158, availableCircleHeight, availableCircleWidth)
  )
  const stroke = Math.max(4, Math.round(circleSize * 0.065))
  const R = (circleSize - stroke) / 2 - 2
  const center = circleSize / 2
  const C = 2 * Math.PI * R
  const dash = C * pct
  const innerDiameter = Math.max(20, R * 2 - stroke - 8)
  const timeFontSize = Math.max(
    13,
    Math.min(
      veryShort ? 20 : compact ? 30 : 38,
      Math.floor(innerDiameter / 3.15),
      Math.floor(circleSize * (veryShort ? 0.34 : compact ? 0.31 : 0.3))
    )
  )

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: veryShort ? 'space-between' : 'center',
      height: '100%', gap, padding: shellPadding, boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* 모드 선택 */}
      <div style={{ display: 'flex', gap: compact ? 4 : 6, flexShrink: 0, maxWidth: '100%', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: compact ? 4 : 6, minWidth: 0 }}>
          {(['focus', 'short', 'long'] as Mode[]).map(m => (
            <button key={m} onClick={() => switchMode(m)} style={{
              height: modeHeight, fontSize: veryShort ? 10 : compact ? 11 : 12,
              padding: veryShort ? '0 6px' : compact ? '0 8px' : '0 11px', borderRadius: 999,
              border: '1px solid var(--border)', cursor: 'pointer',
              background: mode === m ? 'var(--accent)' : 'var(--bg3)',
              color: mode === m ? '#fff' : 'var(--muted)',
              whiteSpace: 'nowrap', lineHeight: 1,
            }}>{veryShort || compact ? SHORT_LABELS[m] : LABELS[m]}</button>
          ))}
        </div>
        {mode === 'focus' && (
          <select
            aria-label="집중 분야"
            title="집중 분야"
            value={category}
            disabled={running}
            onChange={event => changeCategory(event.target.value as ProductivityCategory)}
            style={{
              height: modeHeight,
              width: veryShort ? 58 : compact ? 66 : 78,
              minWidth: 0,
              border: '1px solid var(--border)',
              borderRadius: 7,
              background: 'var(--bg3)',
              color: 'var(--text)',
              padding: veryShort ? '0 3px' : '0 6px',
              fontFamily: 'inherit',
              fontSize: veryShort ? 10 : 11,
              fontWeight: 700,
              cursor: running ? 'not-allowed' : 'pointer',
            }}
          >
            {PRODUCTIVITY_CATEGORIES.map(item => (
              <option key={item} value={item}>{PRODUCTIVITY_CATEGORY_LABELS[item]}</option>
            ))}
          </select>
        )}
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
            fontSize: timeFontSize,
            fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
            lineHeight: 1, whiteSpace: 'nowrap', maxWidth: innerDiameter,
          }}>
            {mm}:{ss}
          </span>
        </div>
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: compact ? 6 : 8, flexShrink: 0 }}>
        <button onClick={toggleRunning} style={{
          height: actionHeight, minWidth: veryShort ? 70 : compact ? 92 : 108,
          padding: veryShort ? '0 10px' : compact ? '0 16px' : '0 22px',
          borderRadius: 8, border: 'none',
          background: remaining === 0 ? 'var(--bg3)' : 'var(--accent)',
          color: remaining === 0 ? 'var(--accent)' : '#fff',
          fontSize: veryShort ? 11 : compact ? 13 : 14,
          fontWeight: 700, cursor: 'pointer',
        }}>{veryShort ? (running ? '정지' : '시작') : remaining === 0 ? '다시 시작' : running ? '일시정지' : '시작'}</button>
        <button onClick={reset} style={{
          height: actionHeight, minWidth: veryShort ? 62 : compact ? 80 : 92,
          padding: veryShort ? '0 9px' : compact ? '0 13px' : '0 16px',
          borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg3)',
          color: 'var(--muted)', fontSize: veryShort ? 11 : compact ? 13 : 14, cursor: 'pointer',
        }}>초기화</button>
      </div>
    </div>
  )
}
