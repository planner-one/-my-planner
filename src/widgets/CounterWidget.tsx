import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { useWidgetSize } from '../hooks/useWidgetSize'
import { getCounterDisplayValue, updateCounterValue } from '../utils/counters'
import type { CounterItem, CounterPeriod } from '../types'
import { Minus, RotateCcw, Trash2 } from 'lucide-react'

export const meta = {
  id: 'counter',
  name: '카운터',
  icon: '🔢',
  defaultW: 7,
  defaultH: 6,
  minW: 5,
  minH: 4,
  order: 7,
}

const PERIOD_LABELS: Record<CounterPeriod, string> = {
  daily: '오늘',
  weekly: '이번 주',
  total: '전체',
}

const PERIOD_OPTIONS: CounterPeriod[] = ['daily', 'weekly', 'total']

const makeCounter = (): CounterItem => ({
  id: `counter-${Date.now()}`,
  name: '새 카운터',
  unit: '회',
  period: 'daily',
  value: 0,
})

export default function CounterWidget() {
  const { ref, w, h } = useWidgetSize()
  const { counters, setCounters } = useApp()
  const [editingId, setEditingId] = useState<string | null>(null)

  const compact = w > 0 && w < 340
  const tight = h > 0 && h < 205
  const veryTight = h > 0 && h < 175
  const padding = veryTight ? 8 : compact || tight ? 10 : 12
  const gap = veryTight ? 6 : 8
  const rowPadding = veryTight ? '7px 8px' : compact ? '8px 9px' : '9px 10px'
  const valueSize = veryTight ? 20 : compact || tight ? 23 : 27
  const buttonSize = veryTight ? 25 : 29
  const visibleLimit = veryTight ? 2 : tight ? 3 : 4
  const editingCounter = editingId ? counters.find(counter => counter.id === editingId) : undefined
  const visibleCounters = (() => {
    const next = counters.slice(0, visibleLimit)
    if (editingCounter && !next.some(counter => counter.id === editingCounter.id)) {
      return [...next.slice(0, Math.max(0, visibleLimit - 1)), editingCounter]
    }
    return next
  })()
  const hiddenCount = Math.max(0, counters.length - visibleCounters.length)

  const changeCounter = (id: string, patch: Partial<CounterItem>) => {
    setCounters(prev => prev.map(counter => (
      counter.id === id ? { ...counter, ...patch } : counter
    )))
  }

  const changeValue = (id: string, delta: number) => {
    setCounters(prev => prev.map(counter => (
      counter.id === id ? updateCounterValue(counter, delta) : counter
    )))
  }

  const resetCounter = (id: string) => {
    setCounters(prev => prev.map(counter => (
      counter.id === id ? updateCounterValue(counter, -getCounterDisplayValue(counter)) : counter
    )))
  }

  const addCounter = () => {
    const next = makeCounter()
    setCounters(prev => [...prev, next])
    setEditingId(next.id)
  }

  const removeCounter = (id: string) => {
    setCounters(prev => prev.filter(counter => counter.id !== id))
    setEditingId(current => current === id ? null : current)
  }

  return (
    <div ref={ref} style={{
      height: '100%', padding, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, flexShrink: 0,
      }}>
        <div style={{
          minWidth: 0, color: 'var(--muted)', fontSize: compact ? 11 : 12,
          fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          숫자 추적기
        </div>
        <button
          type="button"
          onClick={addCounter}
          title="카운터 추가"
          aria-label="카운터 추가"
          style={{
            width: 28, height: 28, borderRadius: 7, border: 'none',
            background: 'var(--accent)', color: '#fff',
            cursor: 'pointer', fontWeight: 800, flexShrink: 0,
          }}
        >
          +
        </button>
      </div>

      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap,
      }}>
        {visibleCounters.map(counter => {
          const isEditing = editingId === counter.id
          const count = getCounterDisplayValue(counter)
          return (
            <div key={counter.id} style={{
              minHeight: 0, background: 'var(--bg3)', borderRadius: 8,
              padding: rowPadding, display: 'grid',
              gridTemplateColumns: isEditing ? '1fr' : 'minmax(0, 1fr) auto',
              gap: veryTight ? 6 : 8,
            }}>
              {isEditing ? (
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 54px' : '1fr 58px 74px auto', gap: 6 }}>
                  <input
                    value={counter.name}
                    onChange={event => changeCounter(counter.id, { name: event.target.value })}
                    placeholder="이름"
                    style={inputStyle}
                  />
                  <input
                    value={counter.unit}
                    onChange={event => changeCounter(counter.id, { unit: event.target.value })}
                    placeholder="단위"
                    style={inputStyle}
                  />
                  <select
                    value={counter.period}
                    onChange={event => changeCounter(counter.id, { period: event.target.value as CounterPeriod, value: 0 })}
                    style={{ ...inputStyle, display: compact ? 'none' : 'block' }}
                    aria-label="카운터 주기"
                  >
                    {PERIOD_OPTIONS.map(period => (
                      <option key={period} value={period}>{PERIOD_LABELS[period]}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setEditingId(null)} style={smallButtonStyle}>완료</button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEditingId(counter.id)}
                    style={{
                      minWidth: 0, border: 'none', background: 'transparent',
                      padding: 0, textAlign: 'left', cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      color: 'var(--text)', fontSize: compact || tight ? 12 : 13,
                      fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {counter.name}
                      {counter.autoKey && <span style={{ color: 'var(--accent)', fontSize: 10, marginLeft: 5 }}>자동</span>}
                    </div>
                    {!veryTight && (
                      <div style={{ color: 'var(--muted)', fontSize: 10, marginTop: 2 }}>
                        {PERIOD_LABELS[counter.period]} · {counter.unit || '회'}
                      </div>
                    )}
                  </button>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `${buttonSize}px minmax(42px, auto) ${buttonSize}px ${buttonSize}px`,
                    alignItems: 'center', gap: 5,
                  }}>
                    <button type="button" aria-label={`${counter.name} 감소`} title="감소" onClick={() => changeValue(counter.id, -1)} style={controlButtonStyle(buttonSize)}><Minus size={14} /></button>
                    <button
                      type="button"
                      onClick={() => changeValue(counter.id, 1)}
                      style={{
                        minWidth: 42, height: buttonSize, border: 'none',
                        borderRadius: 7, background: 'var(--accent)', color: '#fff',
                        cursor: 'pointer', fontSize: valueSize, lineHeight: 1,
                        fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {count}
                    </button>
                    <button type="button" aria-label={`${counter.name} 초기화`} title="초기화" onClick={() => resetCounter(counter.id)} style={controlButtonStyle(buttonSize)}><RotateCcw size={13} /></button>
                    <button
                      type="button"
                      onClick={() => removeCounter(counter.id)}
                      disabled={counter.autoKey === 'pomodoro-focus'}
                      title={counter.autoKey === 'pomodoro-focus' ? '집중 타이머 자동 카운터는 삭제할 수 없습니다.' : '삭제'}
                      aria-label={`${counter.name} 삭제`}
                      style={{
                        ...controlButtonStyle(buttonSize),
                        opacity: counter.autoKey === 'pomodoro-focus' ? 0.35 : 1,
                        cursor: counter.autoKey === 'pomodoro-focus' ? 'default' : 'pointer',
                      }}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
        {hiddenCount > 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 10, textAlign: 'center', flexShrink: 0 }}>
            +{hiddenCount}개 더
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  minWidth: 0,
  height: 28,
  border: '1px solid var(--border)',
  borderRadius: 7,
  background: 'var(--bg2)',
  color: 'var(--text)',
  padding: '0 8px',
  fontSize: 11,
  outline: 'none',
  fontFamily: 'inherit',
} as const

const smallButtonStyle = {
  height: 28,
  border: 'none',
  borderRadius: 7,
  background: 'var(--accent)',
  color: '#fff',
  padding: '0 8px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
} as const

const controlButtonStyle = (size: number) => ({
  width: size,
  height: size,
  border: '1px solid var(--border)',
  borderRadius: 7,
  background: 'var(--bg4)',
  color: 'var(--muted)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1,
})
