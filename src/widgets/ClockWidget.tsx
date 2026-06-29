import { useEffect, useState } from 'react'
import { useWidgetSize } from '../hooks/useWidgetSize'

export const meta = {
  id: 'clock',
  name: '현재 시각',
  icon: '🕐',
  defaultW: 8,
  defaultH: 5,
  minW: 4,
  minH: 3,
  order: 1,
}

type ClockMode = 'digital' | 'analog'
const MODE_KEY = 'clock_widget_mode'

// ── 아날로그 시계 (모던 미니멀) ────────────────────────────
function AnalogClock({ size }: { size: number }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const pad = size / 2
  const r = pad - 8

  const toXY = (angleDeg: number, len: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: pad + Math.cos(rad) * len, y: pad + Math.sin(rad) * len }
  }

  const h = time.getHours() % 12
  const m = time.getMinutes()
  const s = time.getSeconds()

  const hourAngle   = (h / 12) * 360 + (m / 60) * 30
  const minuteAngle = (m / 60) * 360 + (s / 60) * 6
  const secondAngle = (s / 60) * 360

  // 시침: 짧고 두껍게, 반대쪽 살짝 튀어나옴
  const hourPt    = toXY(hourAngle,   r * 0.50)
  const hourTail  = toXY(hourAngle + 180, r * 0.12)
  // 분침: 길고 얇게
  const minutePt  = toXY(minuteAngle, r * 0.75)
  const minuteTail = toXY(minuteAngle + 180, r * 0.12)
  // 초침: 가늘게
  const secondPt  = toXY(secondAngle, r * 0.82)
  const secondTail = toXY(secondAngle + 180, r * 0.18)

  // 12·3·6·9만 숫자, 나머지는 작은 점
  const QUARTER_NUMS: Record<number, string> = { 0: '12', 3: '3', 6: '6', 9: '9' }
  const hourDots = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 360
    const isQuarter = i % 3 === 0
    if (isQuarter) {
      const pos = toXY(a, r * 0.72)
      return { type: 'num' as const, i, pos, label: QUARTER_NUMS[i] }
    } else {
      const pos = toXY(a, r * 0.88)
      return { type: 'dot' as const, i, pos }
    }
  })

  // 분 눈금 (5분 단위 제외) — 아주 작은 점
  const minuteDots = Array.from({ length: 60 }, (_, i) => {
    if (i % 5 === 0) return null
    const pos = toXY((i / 60) * 360, r * 0.94)
    return pos
  }).filter(Boolean)

  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {/* 외곽 원 */}
      <circle cx={pad} cy={pad} r={r} fill="var(--bg2)" stroke="var(--border)" strokeWidth={1} />

      {/* 분 점 */}
      {minuteDots.map((pos, i) => (
        <circle key={i} cx={pos!.x} cy={pos!.y} r={r * 0.012} fill="var(--border)" />
      ))}

      {/* 시 눈금 (숫자 or 점) */}
      {hourDots.map(item => {
        if (item.type === 'num') {
          return (
            <text key={item.i}
              x={item.pos.x} y={item.pos.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={r * 0.155} fill="var(--text)"
              fontFamily="inherit" fontWeight={400}
              style={{ letterSpacing: 0 }}
            >
              {item.label}
            </text>
          )
        }
        return (
          <circle key={item.i}
            cx={item.pos.x} cy={item.pos.y}
            r={r * 0.028} fill="var(--muted)"
          />
        )
      })}

      {/* 분침 */}
      <line
        x1={minuteTail.x} y1={minuteTail.y}
        x2={minutePt.x}   y2={minutePt.y}
        stroke="var(--text)" strokeWidth={r * 0.028} strokeLinecap="round"
      />
      {/* 시침 */}
      <line
        x1={hourTail.x} y1={hourTail.y}
        x2={hourPt.x}   y2={hourPt.y}
        stroke="var(--text)" strokeWidth={r * 0.048} strokeLinecap="round"
      />
      {/* 초침 */}
      <line
        x1={secondTail.x} y1={secondTail.y}
        x2={secondPt.x}   y2={secondPt.y}
        stroke="var(--accent)" strokeWidth={r * 0.016} strokeLinecap="round"
      />
      {/* 중심 */}
      <circle cx={pad} cy={pad} r={r * 0.038} fill="var(--text)" />
      <circle cx={pad} cy={pad} r={r * 0.018} fill="var(--accent)" />
    </svg>
  )
}

// ── 디지털 시계 (카드형) ──────────────────────────────────
function DigitalClock({ w, h }: { w: number; h: number }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const pad2 = (n: number) => n.toString().padStart(2, '0')
  const hh = pad2(time.getHours())
  const mm = pad2(time.getMinutes())
  const ss = pad2(time.getSeconds())
  const weekday = time.toLocaleDateString('en-US', { weekday: 'long' })
  const datePart = time.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const dateStr = `${weekday} | ${datePart}`

  const PAD = 20
  const DATE_H = 24
  const GAP = 8
  const COLON_W = 20

  const boxSize = Math.max(36, Math.min(
    (w - PAD * 2 - COLON_W * 2 - GAP * 4) / 3,
    h - PAD * 2 - DATE_H - GAP * 2,
  ))
  const numSize  = Math.max(14, boxSize * 0.50)
  const colonSize = Math.max(12, boxSize * 0.32)
  const dateSize = Math.max(11, Math.min(15, boxSize * 0.24))
  const radius   = Math.max(8, boxSize * 0.18)

  function TimeBox({ val }: { val: string }) {
    return (
      <div style={{
        width: boxSize, height: boxSize, flexShrink: 0,
        background: 'var(--bg3)', borderRadius: radius,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: numSize, fontWeight: 700, lineHeight: 1,
          color: 'var(--text)', letterSpacing: 0,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {val}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: PAD, boxSizing: 'border-box', gap: GAP,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: GAP }}>
        <TimeBox val={hh} />
        <span style={{
          fontSize: colonSize, fontWeight: 700, color: 'var(--muted)',
          lineHeight: 1, width: COLON_W, textAlign: 'center', flexShrink: 0,
        }}>:</span>
        <TimeBox val={mm} />
        <span style={{
          fontSize: colonSize, fontWeight: 700, color: 'var(--muted)',
          lineHeight: 1, width: COLON_W, textAlign: 'center', flexShrink: 0,
        }}>:</span>
        <TimeBox val={ss} />
      </div>
      <div style={{
        fontSize: dateSize, color: 'var(--muted)',
        lineHeight: 1, letterSpacing: 0,
        alignSelf: 'flex-start', marginTop: GAP,
      }}>
        {dateStr}
      </div>
    </div>
  )
}

// ── Actions (타이틀바 토글 버튼) ──────────────────────────
export function ClockActions() {
  const [mode, setMode] = useState<ClockMode>(
    () => (localStorage.getItem(MODE_KEY) as ClockMode) ?? 'digital'
  )

  const toggle = () => {
    const next: ClockMode = mode === 'digital' ? 'analog' : 'digital'
    localStorage.setItem(MODE_KEY, next)
    setMode(next)
    window.dispatchEvent(new CustomEvent('clock-mode-change', { detail: next }))
  }

  return (
    <button onClick={toggle} title="시계 모드 전환" style={{
      fontSize: 11, color: 'var(--muted)', background: 'transparent',
      border: '1px solid var(--border)', borderRadius: 4,
      cursor: 'pointer', padding: '2px 8px', fontFamily: 'inherit',
    }}>
      {mode === 'digital' ? '아날로그' : '디지털'}
    </button>
  )
}

// ── 메인 위젯 ─────────────────────────────────────────────
export default function ClockWidget() {
  const { ref, w, h } = useWidgetSize()
  const [mode, setMode] = useState<ClockMode>(
    () => (localStorage.getItem(MODE_KEY) as ClockMode) ?? 'digital'
  )

  useEffect(() => {
    const handler = (e: Event) => {
      setMode((e as CustomEvent<ClockMode>).detail)
    }
    window.addEventListener('clock-mode-change', handler)
    return () => window.removeEventListener('clock-mode-change', handler)
  }, [])

  const [dateStr, setDateStr] = useState(() =>
    new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    })
  )

  useEffect(() => {
    const update = () => setDateStr(
      new Date().toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
      })
    )
    const t = setInterval(update, 10000)
    return () => clearInterval(t)
  }, [])

  // 날짜 영역 높이를 제외한 시계 크기
  const dateFontSize = Math.max(10, Math.min(w, h) * 0.055)
  const dateAreaH    = dateFontSize + 10
  const clockSize    = Math.min(w, h - dateAreaH) - 16

  return (
    <div ref={ref} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {w > 0 && h > 0 && (
        mode === 'digital'
          ? <DigitalClock w={w} h={h} />
          : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: 8, boxSizing: 'border-box',
            }}>
              <AnalogClock size={clockSize} />
              <div style={{
                fontSize: dateFontSize, color: 'var(--muted)',
                lineHeight: 1, userSelect: 'none',
                letterSpacing: 0,
              }}>
                {dateStr}
              </div>
            </div>
          )
      )}
    </div>
  )
}
