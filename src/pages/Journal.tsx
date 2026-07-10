import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/ui/PageHeader'
import { IconButton } from '../components/ui/IconButton'
import { useConfirm } from '../components/ui/ConfirmProvider'
import type { JournalEntry } from '../types'
import { addLocalDays, toLocalDateKey } from '../utils/date'
import { isHabitScheduled } from '../utils/habits'
import { calculateProductivityScore } from '../utils/productivity'

const MOODS = ['좋음', '보통', '피곤', '불안', '뿌듯'] as const
const JOURNAL_PROMPTS = [
  '오늘 가장 많이 신경 쓴 일은 ',
  '생각보다 잘 된 부분은 ',
  '내일로 넘길 것은 ',
]

export default function Journal() {
  const confirm = useConfirm()
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
  const recentEnergyEntries = journal.filter(entry => entry.energy != null).slice(0, 7)
  const avgEnergy = recentEnergyEntries.length === 0
    ? undefined
    : Math.round((recentEnergyEntries.reduce((sum, entry) => sum + (entry.energy ?? 0), 0) / recentEnergyEntries.length) * 10) / 10
  const contentLength = (selected?.content ?? '').trim().length

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

  const removeEntry = async (date: string) => {
    const accepted = await confirm({
      title: '저널 삭제',
      description: `${date} 저널 기록을 삭제합니다.`,
      confirmLabel: '삭제',
      danger: true,
    })
    if (!accepted) return
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

  const appendPrompt = (text: string) => {
    const current = (mergedEntry.content ?? '').trim()
    updateEntry({ content: current ? `${current}\n\n${text}` : text })
  }

  const recentEntries = [...journal].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12)

  return (
    <div className="journal-page">
      <PageHeader
        title="저널"
        description="하루의 컨디션, 생각과 회고를 날짜별로 기록합니다."
        actions={<div className="journal-date-controls">
          <IconButton label="어제" icon={<ChevronLeft size={17} />} size="sm" variant="secondary" onClick={() => shiftDate(-1)} />
          <input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} />
          <IconButton label="내일" icon={<ChevronRight size={17} />} size="sm" variant="secondary" onClick={() => shiftDate(1)} />
          <IconButton label="오늘" icon={<RotateCcw size={16} />} size="sm" variant="secondary" onClick={() => setSelectedDate(toLocalDateKey())} />
        </div>}
      />

      <section className="journal-summary">
        <Summary label="Todo" value={`${todoDone}/${dayTodos.length}`} />
        <Summary label="루틴" value={habitPct == null ? '-' : `${habitPct}%`} />
        <Summary label="생산성" value={productivity ? `${productivity.score}%` : '-'} />
        <Summary label="에너지" value={mergedEntry.energy == null ? '-' : `${mergedEntry.energy}`} />
      </section>

      <section className="journal-writing-board">
        <article className="journal-today-card">
          <span>오늘 기록 상태</span>
          <strong>{contentLength > 0 ? `${contentLength}자 작성` : '아직 비어 있음'}</strong>
          <p>{mergedEntry.tomorrowFocus ? `내일 초점: ${mergedEntry.tomorrowFocus}` : '내일 초점을 남기면 다음날 계획으로 이어가기 좋습니다.'}</p>
        </article>
        <article className="journal-prompt-card">
          <span>빠른 시작</span>
          <div>
            {JOURNAL_PROMPTS.map(prompt => (
              <button key={prompt} type="button" onClick={() => appendPrompt(prompt)}>
                {prompt.trim()}
              </button>
            ))}
          </div>
        </article>
        <article className="journal-trend-card">
          <span>최근 흐름</span>
          <strong>{avgEnergy == null ? '-' : `${avgEnergy}/10`}</strong>
          <p>최근 에너지 평균</p>
        </article>
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
              <small>{[entry.mood ?? '기록', entry.energy != null ? `에너지 ${entry.energy}` : undefined].filter(Boolean).join(' · ')}</small>
            </button>
          ))}
          {selected && (
            <button type="button" className="journal-delete" onClick={() => removeEntry(selectedDate)}>
              현재 저널 삭제
            </button>
          )}
        </aside>
      </section>


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
