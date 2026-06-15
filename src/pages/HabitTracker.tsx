import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { addLocalDays, toLocalDateKey } from '../utils/date'
import { createDefaultHabits, createHabitId } from '../utils/habits'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

const activityColor = (level: number) => {
  if (level === 0) return 'var(--bg4)'
  if (level === 1) return 'color-mix(in srgb, var(--accent) 25%, var(--bg3))'
  if (level === 2) return 'color-mix(in srgb, var(--accent) 48%, var(--bg3))'
  if (level === 3) return 'color-mix(in srgb, var(--accent) 72%, var(--bg3))'
  return 'var(--accent)'
}

export default function HabitTracker() {
  const { habits, setHabits, habitHistory, setHabitHistory } = useApp()
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [filterHabitId, setFilterHabitId] = useState('all')
  const [selectedDate, setSelectedDate] = useState(toLocalDateKey())

  const today = toLocalDateKey()
  const todayRecord = habitHistory[today] ?? {}

  const updateTodayRecord = (updater: (record: Record<string, boolean>) => Record<string, boolean>) => {
    setHabitHistory(previous => {
      const completeRecord = Object.fromEntries(
        habits.map(habit => [habit.id, previous[today]?.[habit.id] ?? false])
      )
      return { ...previous, [today]: updater(completeRecord) }
    })
  }

  const toggle = (habitId: string) => {
    updateTodayRecord(record => ({ ...record, [habitId]: !record[habitId] }))
  }

  const addHabit = () => {
    const name = input.trim()
    if (!name || habits.some(habit => habit.name === name)) return
    const habit = { id: createHabitId(), name, createdAt: new Date().toISOString() }
    setHabits(previous => [...previous, habit])
    setHabitHistory(previous => ({
      ...previous,
      [today]: { ...(previous[today] ?? {}), [habit.id]: false },
    }))
    setInput('')
  }

  const saveEdit = () => {
    const name = editingName.trim()
    if (editingId && name && !habits.some(habit => habit.id !== editingId && habit.name === name)) {
      setHabits(previous => previous.map(habit =>
        habit.id === editingId ? { ...habit, name } : habit
      ))
    }
    setEditingId(null)
  }

  const removeHabit = (habitId: string) => {
    const habit = habits.find(item => item.id === habitId)
    if (!habit || !window.confirm(`"${habit.name}" 루틴을 현재 목록에서 삭제할까요?\n과거 활동 기록은 유지됩니다.`)) return
    setHabits(previous => previous.filter(item => item.id !== habitId))
    setHabitHistory(previous => {
      const current = { ...(previous[today] ?? {}) }
      delete current[habitId]
      return { ...previous, [today]: current }
    })
    if (filterHabitId === habitId) setFilterHabitId('all')
  }

  const moveHabit = (index: number, offset: -1 | 1) => {
    const target = index + offset
    if (target < 0 || target >= habits.length) return
    setHabits(previous => {
      const next = [...previous]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const restoreDefaults = () => {
    const existingNames = new Set(habits.map(habit => habit.name))
    const existingIds = new Set(habits.map(habit => habit.id))
    const defaults = createDefaultHabits()
      .filter(habit => !existingNames.has(habit.name) && !existingIds.has(habit.id))
    if (defaults.length === 0) return
    setHabits(previous => [...previous, ...defaults])
    setHabitHistory(previous => ({
      ...previous,
      [today]: {
        ...(previous[today] ?? {}),
        ...Object.fromEntries(defaults.map(habit => [habit.id, false])),
      },
    }))
  }

  const calendarWeeks = useMemo(() => {
    const end = new Date()
    const start = addLocalDays(end, -364)
    const gridStart = addLocalDays(start, -start.getDay())
    const gridEnd = addLocalDays(end, 6 - end.getDay())
    const weeks: Date[][] = []
    let cursor = gridStart
    while (cursor <= gridEnd) {
      const week: Date[] = []
      for (let day = 0; day < 7; day += 1) {
        week.push(cursor)
        cursor = addLocalDays(cursor, 1)
      }
      weeks.push(week)
    }
    return { weeks, firstDate: toLocalDateKey(start), lastDate: today }
  }, [today])

  const dayActivity = (date: string) => {
    const record = habitHistory[date]
    if (!record) return { done: 0, total: 0, level: 0 }
    if (filterHabitId !== 'all') {
      const exists = Object.prototype.hasOwnProperty.call(record, filterHabitId)
      const done = exists && record[filterHabitId] ? 1 : 0
      return { done, total: exists ? 1 : 0, level: done ? 4 : 0 }
    }
    const values = Object.values(record)
    const done = values.filter(Boolean).length
    const total = values.length
    const pct = total === 0 ? 0 : done / total
    const level = pct === 0 ? 0 : pct <= 0.25 ? 1 : pct <= 0.5 ? 2 : pct <= 0.75 ? 3 : 4
    return { done, total, level }
  }

  const selectedActivity = dayActivity(selectedDate)
  const todayDone = habits.filter(habit => todayRecord[habit.id]).length

  return (
    <div className="habit-page">
      <header className="habit-header">
        <div>
          <h1>습관</h1>
          <p>오늘의 작은 루틴을 체크하고, 쌓여가는 흐름을 확인하세요.</p>
        </div>
        <div className="habit-today-summary">
          <strong>{todayDone}</strong>
          <span>/ {habits.length} 완료</span>
        </div>
      </header>

      <section className="habit-section">
        <div className="habit-section-title">
          <div>
            <h2>오늘의 루틴</h2>
            <p>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())}</p>
          </div>
          <button type="button" className="habit-subtle-button" onClick={restoreDefaults}>기본 루틴 추가</button>
        </div>

        <div className="habit-add-row">
          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) addHabit()
            }}
            placeholder="새 루틴을 입력하세요"
            maxLength={40}
          />
          <button type="button" className="habit-primary-button" onClick={addHabit}>추가</button>
        </div>

        <div className="habit-list">
          {habits.length === 0 && (
            <div className="habit-empty">
              루틴이 없습니다. 직접 추가하거나 기본 루틴을 불러오세요.
            </div>
          )}
          {habits.map((habit, index) => {
            const done = Boolean(todayRecord[habit.id])
            const editing = editingId === habit.id
            return (
              <div className={`habit-row${done ? ' is-done' : ''}`} key={habit.id}>
                <button
                  type="button"
                  className="habit-check"
                  aria-label={`${habit.name} ${done ? '완료 취소' : '완료'}`}
                  onClick={() => toggle(habit.id)}
                >
                  {done ? '✓' : ''}
                </button>
                {editing ? (
                  <input
                    className="habit-edit-input"
                    value={editingName}
                    autoFocus
                    maxLength={40}
                    onChange={event => setEditingName(event.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.nativeEvent.isComposing) saveEdit()
                      if (event.key === 'Escape') setEditingId(null)
                    }}
                  />
                ) : (
                  <button type="button" className="habit-name" onClick={() => toggle(habit.id)}>
                    {habit.name}
                  </button>
                )}
                <div className="habit-actions">
                  <button type="button" title="위로 이동" aria-label="위로 이동" onClick={() => moveHabit(index, -1)}>↑</button>
                  <button type="button" title="아래로 이동" aria-label="아래로 이동" onClick={() => moveHabit(index, 1)}>↓</button>
                  <button
                    type="button"
                    title="이름 수정"
                    aria-label="이름 수정"
                    onClick={() => { setEditingId(habit.id); setEditingName(habit.name) }}
                  >✎</button>
                  <button type="button" title="삭제" aria-label="삭제" onClick={() => removeHabit(habit.id)}>×</button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="habit-section">
        <div className="habit-section-title habit-activity-heading">
          <div>
            <h2>최근 1년 활동</h2>
            <p>색이 진할수록 그날의 루틴 완료율이 높습니다.</p>
          </div>
          <select value={filterHabitId} onChange={event => setFilterHabitId(event.target.value)}>
            <option value="all">전체 루틴</option>
            {habits.map(habit => <option key={habit.id} value={habit.id}>{habit.name}</option>)}
          </select>
        </div>

        <div className="habit-heatmap-scroll">
          <div className="habit-heatmap-layout">
            <div className="habit-weekday-labels">
              {DAY_LABELS.map((label, index) => <span key={label}>{index % 2 === 1 ? label : ''}</span>)}
            </div>
            <div>
              <div className="habit-month-labels" style={{ gridTemplateColumns: `repeat(${calendarWeeks.weeks.length}, 14px)` }}>
                {calendarWeeks.weeks.map((week, index) => {
                  const firstVisible = week.find(date => {
                    const key = toLocalDateKey(date)
                    return key >= calendarWeeks.firstDate && key <= calendarWeeks.lastDate
                  })
                  const previousMonth = index > 0 ? calendarWeeks.weeks[index - 1][6].getMonth() : -1
                  const show = firstVisible && firstVisible.getMonth() !== previousMonth
                  return <span key={toLocalDateKey(week[0])}>{show ? MONTH_LABELS[firstVisible.getMonth()] : ''}</span>
                })}
              </div>
              <div className="habit-heatmap" style={{ gridTemplateColumns: `repeat(${calendarWeeks.weeks.length}, 14px)` }}>
                {calendarWeeks.weeks.flatMap(week => week.map(date => {
                  const key = toLocalDateKey(date)
                  const visible = key >= calendarWeeks.firstDate && key <= calendarWeeks.lastDate
                  const activity = dayActivity(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`habit-cell${selectedDate === key ? ' is-selected' : ''}`}
                      style={{ background: visible ? activityColor(activity.level) : 'transparent' }}
                      disabled={!visible}
                      title={visible ? `${key}: ${activity.done}/${activity.total} 완료` : ''}
                      aria-label={visible ? `${key}, ${activity.done}/${activity.total} 완료` : undefined}
                      onClick={() => setSelectedDate(key)}
                    />
                  )
                }))}
              </div>
            </div>
          </div>
        </div>

        <div className="habit-activity-footer">
          <div>
            <strong>{selectedDate}</strong>
            <span>{selectedActivity.total === 0 ? '기록 없음' : `${selectedActivity.done} / ${selectedActivity.total} 완료`}</span>
          </div>
          <div className="habit-legend">
            <span>적음</span>
            {[0, 1, 2, 3, 4].map(level => <i key={level} style={{ background: activityColor(level) }} />)}
            <span>많음</span>
          </div>
        </div>
      </section>

      <style>{`
        .habit-page { color: var(--text); display: flex; flex-direction: column; gap: 18px; max-width: 1120px; margin: 0 auto; }
        .habit-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
        .habit-header h1 { margin: 0 0 6px; font-size: 26px; }
        .habit-header p, .habit-section-title p { margin: 0; color: var(--muted); font-size: 13px; }
        .habit-today-summary { display: flex; align-items: baseline; gap: 5px; color: var(--muted); white-space: nowrap; }
        .habit-today-summary strong { color: var(--accent); font-size: 28px; }
        .habit-section { padding: 20px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); }
        .habit-section-title { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
        .habit-section-title h2 { margin: 0 0 4px; font-size: 17px; }
        .habit-add-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; margin-bottom: 12px; }
        .habit-add-row input, .habit-edit-input, .habit-section select { border: 1px solid var(--border); background: var(--bg); color: var(--text); border-radius: 7px; outline: none; }
        .habit-add-row input { height: 42px; padding: 0 13px; font-size: 14px; }
        .habit-add-row input:focus, .habit-edit-input:focus, .habit-section select:focus { border-color: var(--accent); }
        .habit-primary-button, .habit-subtle-button { border: 0; border-radius: 7px; cursor: pointer; font-weight: 700; }
        .habit-primary-button { min-width: 72px; background: var(--accent); color: #fff; }
        .habit-subtle-button { padding: 8px 11px; background: var(--bg3); color: var(--text); }
        .habit-list { display: flex; flex-direction: column; gap: 7px; }
        .habit-row { min-height: 48px; display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 6px 9px; background: var(--bg3); border: 1px solid transparent; border-radius: 7px; }
        .habit-row.is-done { border-color: color-mix(in srgb, var(--accent) 38%, transparent); }
        .habit-check { width: 24px; height: 24px; padding: 0; border: 1.5px solid var(--border); border-radius: 6px; background: var(--bg); color: #fff; cursor: pointer; font-weight: 800; }
        .habit-row.is-done .habit-check { border-color: var(--accent); background: var(--accent); }
        .habit-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; text-align: left; border: 0; background: transparent; color: var(--text); cursor: pointer; font-size: 14px; }
        .habit-row.is-done .habit-name { color: var(--muted); text-decoration: line-through; }
        .habit-edit-input { width: 100%; min-width: 0; height: 32px; padding: 0 9px; font-size: 14px; }
        .habit-actions { display: flex; gap: 3px; }
        .habit-actions button { width: 30px; height: 30px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--muted); cursor: pointer; font-size: 14px; }
        .habit-actions button:hover { background: var(--bg4); color: var(--text); }
        .habit-empty { padding: 30px 12px; text-align: center; color: var(--muted); font-size: 13px; }
        .habit-activity-heading select { width: min(180px, 42vw); height: 36px; padding: 0 10px; }
        .habit-heatmap-scroll { overflow-x: auto; padding: 4px 0 8px; }
        .habit-heatmap-layout { min-width: 780px; display: grid; grid-template-columns: 26px auto; gap: 8px; width: max-content; }
        .habit-weekday-labels { display: grid; grid-template-rows: repeat(7, 14px); gap: 3px; padding-top: 25px; }
        .habit-weekday-labels span { font-size: 10px; line-height: 14px; color: var(--muted); text-align: right; }
        .habit-month-labels { display: grid; gap: 3px; height: 20px; margin-bottom: 5px; }
        .habit-month-labels span { overflow: visible; white-space: nowrap; font-size: 10px; color: var(--muted); }
        .habit-heatmap { display: grid; grid-template-rows: repeat(7, 14px); grid-auto-flow: column; gap: 3px; }
        .habit-cell { width: 14px; height: 14px; padding: 0; border: 0; border-radius: 3px; cursor: pointer; }
        .habit-cell.is-selected { outline: 2px solid var(--text); outline-offset: 1px; }
        .habit-cell:disabled { cursor: default; }
        .habit-activity-footer { display: flex; justify-content: space-between; align-items: center; gap: 18px; margin-top: 12px; color: var(--muted); font-size: 12px; }
        .habit-activity-footer > div:first-child { display: flex; gap: 9px; }
        .habit-activity-footer strong { color: var(--text); }
        .habit-legend { display: flex; align-items: center; gap: 4px; }
        .habit-legend i { width: 12px; height: 12px; border-radius: 3px; }
        @media (max-width: 640px) {
          .habit-header { align-items: flex-start; }
          .habit-header p { max-width: 230px; }
          .habit-section { padding: 15px; }
          .habit-section-title { align-items: flex-start; }
          .habit-actions button { width: 27px; }
          .habit-activity-footer { align-items: flex-start; flex-direction: column; }
        }
      `}</style>
    </div>
  )
}
