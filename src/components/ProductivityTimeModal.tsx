import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../store/AppContext'
import type { ProductivityCategory, ProductivityLinkedTimeEntry } from '../types'
import { createDefaultCounters, updateCounterValue } from '../utils/counters'
import { getDateKeysInRange } from '../utils/productivity'
import {
  PRODUCTIVITY_CATEGORIES,
  PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED,
  PRODUCTIVITY_CATEGORY_COLORS,
  PRODUCTIVITY_CATEGORY_LABELS,
  getProductivityTimeMinutes,
  updateProductivityLinkedTimeEntry,
  updateProductivityTimeBucket,
} from '../utils/productivityCategories'
import { toLocalDateKey } from '../utils/date'

interface ProductivityTimeModalProps {
  open: boolean
  startDate: string
  endDate: string
  onClose: () => void
}

const clamp = (value: string | number, max: number) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(max, Math.round(number)))
}

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}분`
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`
}

export default function ProductivityTimeModal({
  open,
  startDate,
  endDate,
  onClose,
}: ProductivityTimeModalProps) {
  const { productivityTimeHistory, setProductivityTimeHistory, setCounters } = useApp()
  const today = toLocalDateKey()
  const [date, setDate] = useState(today)
  const [category, setCategory] = useState<ProductivityCategory>('work')
  const [minutes, setMinutes] = useState(25)

  useEffect(() => {
    if (!open) return
    setDate(today < startDate ? startDate : today > endDate ? endDate : today)
  }, [endDate, open, startDate, today])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, open])

  const dateKeys = useMemo(() => getDateKeysInRange(startDate, endDate), [endDate, startDate])
  const visibleCategories = useMemo<ProductivityCategory[]>(() => [
    ...PRODUCTIVITY_CATEGORIES,
    ...(dateKeys.some(day => getProductivityTimeMinutes(productivityTimeHistory[day]?.uncategorized) > 0)
      ? ['uncategorized' as const]
      : []),
  ], [dateKeys, productivityTimeHistory])
  const rows = useMemo(() => dateKeys
    .flatMap(day => visibleCategories.flatMap(item => {
      const bucket = productivityTimeHistory[day]?.[item]
      return bucket && getProductivityTimeMinutes(bucket) > 0
        ? [{ date: day, category: item, bucket }]
        : []
    }))
    .sort((left, right) => right.date.localeCompare(left.date)
      || PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED.indexOf(left.category)
        - PRODUCTIVITY_CATEGORIES_WITH_UNCATEGORIZED.indexOf(right.category)), [
      dateKeys,
      productivityTimeHistory,
      visibleCategories,
    ])

  const totals = useMemo(() => Object.fromEntries(visibleCategories.map(item => {
    const buckets = rows.filter(row => row.category === item).map(row => row.bucket)
    return [item, {
      manualMinutes: buckets.reduce((sum, bucket) => sum + bucket.manualMinutes, 0),
      linkedMinutes: buckets.reduce((sum, bucket) => sum + Object.values(bucket.linkedEntries ?? {})
        .reduce((entrySum, entry) => entrySum + entry.minutes, 0), 0),
      focusSessions: buckets.reduce((sum, bucket) => sum + bucket.focusSessions, 0),
      totalMinutes: buckets.reduce((sum, bucket) => sum + getProductivityTimeMinutes(bucket), 0),
    }]
  })) as Record<ProductivityCategory, {
    manualMinutes: number
    linkedMinutes: number
    focusSessions: number
    totalMinutes: number
  }>, [rows, visibleCategories])

  if (!open) return null

  const syncTodayFocus = (delta: number) => {
    if (!delta) return
    setCounters(current => {
      const source = current.some(counter => counter.autoKey === 'pomodoro-focus')
        ? current
        : [...createDefaultCounters().filter(counter => counter.autoKey === 'pomodoro-focus'), ...current]
      return source.map(counter => counter.autoKey === 'pomodoro-focus'
        ? updateCounterValue(counter, delta, today)
        : counter)
    })
  }

  const addManualTime = () => {
    const amount = clamp(minutes, 1440)
    if (!amount || !date || date < startDate || date > endDate) return
    setProductivityTimeHistory(current => updateProductivityTimeBucket(
      current,
      date,
      category,
      bucket => ({ manualMinutes: Math.min(1440, bucket.manualMinutes + amount) }),
    ))
    setMinutes(25)
  }

  const setManualMinutes = (rowDate: string, rowCategory: ProductivityCategory, value: number) => {
    setProductivityTimeHistory(current => updateProductivityTimeBucket(
      current,
      rowDate,
      rowCategory,
      () => ({ manualMinutes: clamp(value, 1440) }),
    ))
  }

  const setFocusSessions = (rowDate: string, rowCategory: ProductivityCategory, value: number) => {
    const nextValue = clamp(value, 96)
    const previousValue = productivityTimeHistory[rowDate]?.[rowCategory]?.focusSessions ?? 0
    setProductivityTimeHistory(current => updateProductivityTimeBucket(
      current,
      rowDate,
      rowCategory,
      () => ({ focusSessions: nextValue }),
    ))
    if (rowDate === today) syncTodayFocus(nextValue - previousValue)
  }

  const setLinkedMinutes = (
    rowDate: string,
    rowCategory: ProductivityCategory,
    entry: ProductivityLinkedTimeEntry,
    value: number,
  ) => {
    setProductivityTimeHistory(current => updateProductivityLinkedTimeEntry(
      current,
      rowDate,
      rowCategory,
      entry,
      () => clamp(value, 1440),
    ))
  }

  return createPortal(
    <div className="productivity-modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="productivity-modal time-modal" role="dialog" aria-modal="true" aria-labelledby="time-modal-title">
        <header className="productivity-modal-header">
          <div>
            <h3 id="time-modal-title">시간 기록</h3>
            <span>{startDate} ~ {endDate}</span>
          </div>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="시간 기록 닫기">×</button>
        </header>

        <div className="time-total-grid">
          {visibleCategories.map(item => (
            <article key={item}>
              <i style={{ background: PRODUCTIVITY_CATEGORY_COLORS[item] }} />
              <span>{PRODUCTIVITY_CATEGORY_LABELS[item]}</span>
              <strong>{totals[item].totalMinutes ? formatMinutes(totals[item].totalMinutes) : '-'}</strong>
              <small>
                직접 {formatMinutes(totals[item].manualMinutes)} · 일정 {formatMinutes(totals[item].linkedMinutes)} · 집중 {totals[item].focusSessions}회
              </small>
            </article>
          ))}
        </div>

        <div className="manual-time-form">
          <label>
            <span>날짜</span>
            <input type="date" min={startDate} max={endDate} value={date} onChange={event => setDate(event.target.value)} />
          </label>
          <label>
            <span>분야</span>
            <select value={category} onChange={event => setCategory(event.target.value as ProductivityCategory)}>
              {PRODUCTIVITY_CATEGORIES.map(item => (
                <option key={item} value={item}>{PRODUCTIVITY_CATEGORY_LABELS[item]}</option>
              ))}
            </select>
          </label>
          <label>
            <span>추가 시간</span>
            <div className="number-with-unit">
              <input type="number" min="1" max="1440" value={minutes} onChange={event => setMinutes(clamp(event.target.value, 1440))} />
              <span>분</span>
            </div>
          </label>
          <button type="button" onClick={addManualTime}>추가</button>
        </div>

        <div className="time-record-table" aria-label="시간 기록 목록">
          <div className="time-record-head">
            <span>날짜 · 분야</span>
            <span>수동 시간</span>
            <span>집중 세션</span>
            <span>합계</span>
          </div>
          {rows.length === 0 ? (
            <p className="empty-text">이 기간의 시간 기록이 없습니다.</p>
          ) : rows.map(row => {
            const linkedEntries = Object.values(row.bucket.linkedEntries ?? {})
              .filter(entry => entry.minutes > 0)
              .sort((left, right) => left.title.localeCompare(right.title, 'ko'))
            return (
              <div className="time-record-row" key={`${row.date}-${row.category}`}>
                <div>
                  <b>{row.date}</b>
                  <span style={{ color: PRODUCTIVITY_CATEGORY_COLORS[row.category] }}>
                    {PRODUCTIVITY_CATEGORY_LABELS[row.category]}
                  </span>
                </div>
                <div className="inline-number-control">
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    value={row.bucket.manualMinutes}
                    aria-label={`${row.date} ${PRODUCTIVITY_CATEGORY_LABELS[row.category]} 수동 시간`}
                    onChange={event => setManualMinutes(row.date, row.category, Number(event.target.value))}
                  />
                  <span>분</span>
                  {row.bucket.manualMinutes > 0 && (
                    <button type="button" onClick={() => setManualMinutes(row.date, row.category, 0)}>초기화</button>
                  )}
                </div>
                <div className="inline-number-control">
                  <input
                    type="number"
                    min="0"
                    max="96"
                    value={row.bucket.focusSessions}
                    aria-label={`${row.date} ${PRODUCTIVITY_CATEGORY_LABELS[row.category]} 집중 세션`}
                    onChange={event => setFocusSessions(row.date, row.category, Number(event.target.value))}
                  />
                  <span>회</span>
                </div>
                <strong>{formatMinutes(getProductivityTimeMinutes(row.bucket))}</strong>
                {linkedEntries.length > 0 && (
                  <div className="linked-time-records">
                    <span className="linked-time-heading">일정 연결 시간</span>
                    {linkedEntries.map(entry => (
                      <div className="linked-time-record" key={`${entry.sourceType}-${entry.sourceId}`}>
                        <div>
                          <small>예정 작업</small>
                          <b title={entry.title}>{entry.title}</b>
                        </div>
                        <div className="inline-number-control">
                          <input
                            type="number"
                            min="0"
                            max="1440"
                            value={entry.minutes}
                            aria-label={`${entry.title} 연결 시간`}
                            onChange={event => setLinkedMinutes(row.date, row.category, entry, Number(event.target.value))}
                          />
                          <span>분</span>
                          <button type="button" onClick={() => setLinkedMinutes(row.date, row.category, entry, 0)}>
                            초기화
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>,
    document.body,
  )
}
