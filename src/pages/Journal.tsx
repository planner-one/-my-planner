import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { JournalEntry } from '../types'
import { addLocalDays, toLocalDateKey } from '../utils/date'
import { isHabitScheduled } from '../utils/habits'
import { calculateProductivityScore } from '../utils/productivity'

const MOODS = ['좋음', '보통', '피곤', '불안', '뿌듯'] as const

export default function Journal() {
  const {
    journal, setJournal,
    todos, todoHistory, habits, habitHistory,
    scheduledTasks, counters, setEnergy,
  } = useApp()
  const [selectedDate, setSelectedDate] = useState(toLocalDateKey())
  const todayKey = toLocalDateKey()
  const selected = journal.find(entry => entry.date === selectedDate)
  const dateObj = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate])
  const dayTodos = todos.filter(todo => (!todo.date && selectedDate === todayKey) || todo.date === selectedDate)
  const todoDone = dayTodos.filter(todo => todo.done).length
  const activeHabits = habits.filter(habit => isHabitScheduled(habit, dateObj))
  const habitRecord = habitHistory[selectedDate] ?? {}
  const habitDone = activeHabits.filter(habit => habitRecord[habit.id]).length
  const habitPct = activeHabits.length === 0 ? undefined : Math.round((habitDone / activeHabits.length) * 100)
  const productivity = calculateProductivityScore({
    date: selectedDate,
    todos,
    todoHistory,
    habits,
    habitHistory,
    scheduledTasks,
    counters,
  })

  const mergedEntry: JournalEntry = {
    date: selectedDate,
    title: selected?.title ?? '',
    mood: selected?.mood ?? '보통',
    content: selected?.content ?? '',
    gratitude: selected?.gratitude ?? '',
    tomorrowFocus: selected?.tomorrowFocus ?? '',
    habitPct,
    todoDone,
    todoTotal: dayTodos.length,
    energy: selected?.energy,
    productivity: productivity?.score ?? selected?.productivity,
    updatedAt: selected?.updatedAt,
  }

  const updateEntry = (patch: Partial<JournalEntry>) => {
    setJournal(prev => {
      const existing = prev.find(entry => entry.date === selectedDate)
      const next: JournalEntry = {
        ...mergedEntry,
        ...existing,
        ...patch,
        date: selectedDate,
        habitPct,
        todoDone,
        todoTotal: dayTodos.length,
        productivity: productivity?.score ?? patch.productivity ?? existing?.productivity,
        updatedAt: new Date().toISOString(),
      }
      if (existing) {
        return prev.map(entry => entry.date === selectedDate ? next : entry)
      }
      return [next, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    })
  }

  const removeEntry = (date: string) => {
    if (!window.confirm('이 저널을 삭제할까요?')) return
    setJournal(prev => prev.filter(entry => entry.date !== date))
    if (date === todayKey) setEnergy(0)
  }

  const updateEnergy = (value: string) => {
    if (value === '') {
      updateEntry({ energy: undefined })
      if (selectedDate === todayKey) setEnergy(0)
      return
    }
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return
    const nextEnergy = Math.max(0, Math.min(10, parsed))
    updateEntry({ energy: nextEnergy })
    if (selectedDate === todayKey) setEnergy(nextEnergy)
  }

  const shiftDate = (days: number) => {
    setSelectedDate(toLocalDateKey(addLocalDays(dateObj, days)))
  }

  const recentEntries = [...journal].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12)

  return (
    <div className="journal-page">
      <header className="journal-header">
        <div>
          <h2>저널</h2>
          <p>외부 피드 위젯과 별개로, 하루 기록과 컨디션을 직접 남깁니다.</p>
        </div>
        <div className="journal-date-controls">
          <button type="button" onClick={() => shiftDate(-1)}>어제</button>
          <input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} />
          <button type="button" onClick={() => shiftDate(1)}>내일</button>
          <button type="button" onClick={() => setSelectedDate(toLocalDateKey())}>오늘</button>
        </div>
      </header>

      <section className="journal-summary">
        <Summary label="Todo" value={`${todoDone}/${dayTodos.length}`} />
        <Summary label="루틴" value={habitPct == null ? '-' : `${habitPct}%`} />
        <Summary label="생산성" value={productivity ? `${productivity.score}%` : '-'} />
        <Summary label="에너지" value={mergedEntry.energy == null ? '-' : `${mergedEntry.energy}`} />
      </section>

      <section className="journal-grid">
        <article className="journal-editor">
          <input
            value={mergedEntry.title ?? ''}
            onChange={event => updateEntry({ title: event.target.value })}
            placeholder="제목"
            className="journal-title-input"
          />
          <div className="journal-meta-row">
            <select value={mergedEntry.mood ?? '보통'} onChange={event => updateEntry({ mood: event.target.value })}>
              {MOODS.map(mood => <option key={mood} value={mood}>{mood}</option>)}
            </select>
            <input
              type="number"
              min={0}
              max={10}
              value={mergedEntry.energy ?? ''}
              onChange={event => updateEnergy(event.target.value)}
              placeholder="에너지 0-10"
            />
          </div>
          <textarea
            value={mergedEntry.content ?? ''}
            onChange={event => updateEntry({ content: event.target.value })}
            placeholder="오늘의 기록"
            rows={8}
          />
          <textarea
            value={mergedEntry.gratitude ?? ''}
            onChange={event => updateEntry({ gratitude: event.target.value })}
            placeholder="고마웠던 일"
            rows={3}
          />
          <textarea
            value={mergedEntry.tomorrowFocus ?? ''}
            onChange={event => updateEntry({ tomorrowFocus: event.target.value })}
            placeholder="내일의 초점"
            rows={3}
          />
          <small>{mergedEntry.updatedAt ? `마지막 수정: ${new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(mergedEntry.updatedAt))}` : '입력하면 자동 저장됩니다.'}</small>
        </article>

        <aside className="journal-history">
          <div className="panel-heading">
            <h3>최근 저널</h3>
            <span>{journal.length}개</span>
          </div>
          {recentEntries.length === 0 ? (
            <p className="empty-text">아직 작성한 저널이 없습니다.</p>
          ) : recentEntries.map(entry => (
            <button
              type="button"
              key={entry.date}
              className={entry.date === selectedDate ? 'journal-history-item active' : 'journal-history-item'}
              onClick={() => setSelectedDate(entry.date)}
            >
              <strong>{entry.date}</strong>
              <span>{entry.title || entry.content || '제목 없음'}</span>
              <small>{entry.mood ?? '기록'}</small>
            </button>
          ))}
          {selected && (
            <button type="button" className="journal-delete" onClick={() => removeEntry(selectedDate)}>
              현재 저널 삭제
            </button>
          )}
        </aside>
      </section>

      <style>{`
        .journal-page { max-width: 1120px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 16px; }
        .journal-header { display: flex; justify-content: space-between; gap: 14px; align-items: flex-end; }
        .journal-header h2 { margin: 0 0 6px; font-size: 24px; letter-spacing: 0; }
        .journal-header p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        .journal-date-controls { display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; }
        .journal-date-controls button, .journal-delete { height: 34px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .journal-date-controls input, .journal-title-input, .journal-meta-row input, .journal-meta-row select, .journal-editor textarea { min-width: 0; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 10px; font-family: inherit; font-size: 13px; outline: none; }
        .journal-date-controls input, .journal-title-input, .journal-meta-row input, .journal-meta-row select { height: 34px; }
        .journal-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .journal-summary-card, .journal-editor, .journal-history { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; }
        .journal-summary-card { padding: 13px; }
        .journal-summary-card span { color: var(--muted); font-size: 11px; font-weight: 700; }
        .journal-summary-card b { display: block; margin-top: 6px; font-size: 22px; }
        .journal-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr); gap: 14px; align-items: start; }
        .journal-editor { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .journal-title-input { font-weight: 800; font-size: 16px !important; }
        .journal-meta-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .journal-editor textarea { padding: 10px; resize: vertical; line-height: 1.55; }
        .journal-editor small { color: var(--muted); font-size: 11px; }
        .journal-history { padding: 16px; display: flex; flex-direction: column; gap: 9px; }
        .panel-heading { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
        .panel-heading h3 { margin: 0; font-size: 15px; }
        .panel-heading span { color: var(--accent); font-size: 12px; font-weight: 800; }
        .journal-history-item { width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); color: var(--text); padding: 10px; cursor: pointer; text-align: left; display: grid; gap: 4px; }
        .journal-history-item.active { border-color: var(--accent); background: var(--accent-soft); }
        .journal-history-item strong { font-size: 12px; }
        .journal-history-item span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
        .journal-history-item small, .empty-text { color: var(--muted); font-size: 11px; }
        .journal-delete { margin-top: 4px; background: var(--bg4); color: var(--text); }
        @media (max-width: 900px) {
          .journal-header { align-items: stretch; flex-direction: column; }
          .journal-date-controls { justify-content: flex-start; }
          .journal-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .journal-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 560px) {
          .journal-summary, .journal-meta-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <article className="journal-summary-card">
      <span>{label}</span>
      <b>{value}</b>
    </article>
  )
}
