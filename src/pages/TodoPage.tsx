import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/AppContext'
import type { DeletedTodoDailyResult, Todo, TodoCorrection, TodoDailyResult } from '../types'
import { addLocalDays, toLocalDateKey } from '../utils/date'
import {
  buildTodoDailyResult,
  getIncompleteTodos,
  getTodoCarryKey,
  getTodoCategory,
  getUnresolvedIncompleteTodos,
  hasLaterTodoOccurrence,
} from '../utils/todos'
import { getPlannerDayBriefing } from '../utils/plannerBriefing'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { useConfirm } from '../components/ui/ConfirmProvider'
import { Trash2 } from 'lucide-react'

type Category = 'work' | 'personal' | 'study'
type FilterType = 'all' | Category
type DateFilter = 'today' | 'tomorrow' | 'week' | 'all'
type AddTarget = 'today' | 'tomorrow'

const CATEGORY_CONFIG: Record<Category, { label: string; color: string }> = {
  work:     { label: '업무', color: '#4A90E2' },
  personal: { label: '개인', color: '#27AE60' },
  study:    { label: '공부', color: '#8E44AD' },
}

const cat = (t: Todo): Category => getTodoCategory(t)

function Badge({ category }: { category: Category }) {
  const cfg = CATEGORY_CONFIG[category]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
      background: `${cfg.color}18`, color: cfg.color, flexShrink: 0, whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  )
}

function ProgressBar({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{ height, borderRadius: height / 2, background: 'var(--bg4)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: height / 2,
        background: color, width: `${pct}%`,
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

export default function TodoPage() {
  const confirm = useConfirm()
  const {
    todos, setTodos,
    todoHistory, setTodoHistory,
    todoHistoryTrash, setTodoHistoryTrash,
    todoHistoryDeletedDates, setTodoHistoryDeletedDates,
    scheduledTasks, careerEvents, personalApplications, jobPostings,
    tasks, goals, projects, topGoals,
    saveWithOverrides,
  } = useApp()
  const [input, setInput] = useState('')
  const [newCategory, setNewCategory] = useState<Category>('work')
  const [addTarget, setAddTarget] = useState<AddTarget>('today')
  const [filterCat, setFilterCat] = useState<FilterType>('all')
  const [filterDate, setFilterDate] = useState<DateFilter>('today')
  const [composing, setComposing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editCategory, setEditCategory] = useState<Category>('work')
  const [saveMessage, setSaveMessage] = useState('')
  const [correctionDate, setCorrectionDate] = useState<string | null>(null)
  const [correctionItems, setCorrectionItems] = useState<Todo[]>([])
  const [correctionNote, setCorrectionNote] = useState('')
  const [correctionSaving, setCorrectionSaving] = useState(false)
  const [correctionNewText, setCorrectionNewText] = useState('')
  const [correctionNewCategory, setCorrectionNewCategory] = useState<Category>('work')
  const [correctionNewDone, setCorrectionNewDone] = useState(true)
  const editRef = useRef<HTMLInputElement>(null)

  const today = toLocalDateKey()
  const tomorrow = toLocalDateKey(addLocalDays(new Date(`${today}T12:00:00`), 1))
  const addTargetDate = addTarget === 'today' ? today : tomorrow
  const addTargetLabel = addTarget === 'today' ? '오늘' : '내일'
  const weekAgo = toLocalDateKey(addLocalDays(new Date(), -6))

  useEffect(() => { if (editId) editRef.current?.focus() }, [editId])

  const dateFiltered = todos.filter(t => {
    if (filterDate === 'today') return !t.date || t.date === today
    if (filterDate === 'tomorrow') return t.date === tomorrow
    if (filterDate === 'week') return !t.date || t.date >= weekAgo
    return true
  })

  const catFiltered = dateFiltered.filter(t =>
    filterCat === 'all' || cat(t) === filterCat
  )

  const active = catFiltered.filter(t => !t.done)
  const done = catFiltered.filter(t => t.done)
  const sorted = [...active, ...done]

  // 통계
  const totalAll = todos.filter(t => !t.date || t.date === today).length
  const doneAll = todos.filter(t => (!t.date || t.date === today) && t.done).length
  const pctAll = totalAll === 0 ? 0 : Math.round((doneAll / totalAll) * 100)
  const todayAdded = todos.filter(t => t.date === today).length
  const todayItems = todos.filter(t => !t.date || t.date === today)
  const todayIncomplete = todayItems.filter(t => !t.done)
  const tomorrowItems = todos.filter(t => t.date === tomorrow)
  const tomorrowIncomplete = tomorrowItems.filter(t => !t.done)
  const tomorrowDone = tomorrowItems.length - tomorrowIncomplete.length
  const tomorrowBriefing = getPlannerDayBriefing({
    todos,
    topGoals,
    scheduledTasks,
    careerEvents,
    personalApplications,
    jobPostings,
    tasks,
    goals,
    projects,
  }, tomorrow, today)
  const tomorrowBriefingSections = tomorrowBriefing.sections.filter(section => section.items.length > 0)

  const catStat = (c: Category) => {
    const items = todos.filter(t => (!t.date || t.date === today) && cat(t) === c)
    if (!items.length) return null
    const d = items.filter(t => t.done).length
    return { done: d, total: items.length, pct: Math.round((d / items.length) * 100) }
  }

  const add = () => {
    const text = input.trim()
    if (!text) return
    const item: Todo = {
      id: Date.now().toString(), text, done: false,
      priority: 'medium', category: newCategory, date: addTargetDate,
    }
    setTodos(prev => [item, ...prev])
    setFilterDate(addTarget)
    setInput('')
  }

  const toggle = (id: string) =>
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const remove = (id: string) =>
    setTodos(prev => prev.filter(t => t.id !== id))

  const startEdit = (t: Todo) => {
    setEditId(t.id); setEditText(t.text); setEditCategory(cat(t))
  }

  const saveEdit = () => {
    if (!editId) return
    const text = editText.trim()
    if (text) setTodos(prev => prev.map(t => t.id === editId ? { ...t, text, category: editCategory } : t))
    setEditId(null)
  }

  const cancelEdit = () => setEditId(null)

  const saveTodayResult = async () => {
    const result = buildTodoDailyResult(today, todayItems, 'manual')
    const nextHistory = [result, ...todoHistory.filter(item => item.date !== today)]
      .sort((a, b) => b.date.localeCompare(a.date))
    const nextTrash = todoHistoryTrash.filter(item => item.date !== today)
    const nextDeletedDates = todoHistoryDeletedDates.filter(date => date !== today)

    setTodoHistory(nextHistory)
    setTodoHistoryTrash(nextTrash)
    setTodoHistoryDeletedDates(nextDeletedDates)
    await saveWithOverrides({
      todoHistory: nextHistory,
      todoHistoryTrash: nextTrash,
      todoHistoryDeletedDates: nextDeletedDates,
    })
    setSaveMessage('오늘 결과를 저장했습니다.')
    window.setTimeout(() => setSaveMessage(''), 2000)
  }

  const getIncompleteItems = (items: Todo[]) =>
    getIncompleteTodos(items)

  const getUnresolvedIncompleteItems = (sourceDate: string, items: Todo[]) =>
    getUnresolvedIncompleteTodos({ sourceDate, items, today, todoHistory, todos })

  const getImportableItems = (
    items: Todo[],
    existingKeys = new Set(todayItems.map(getTodoCarryKey)),
    sourceDate?: string,
  ) => {
    const candidates = sourceDate
      ? getUnresolvedIncompleteItems(sourceDate, items)
      : getIncompleteItems(items)
    return candidates.filter(todo => !existingKeys.has(getTodoCarryKey(todo)))
  }

  const getIncompleteHistoryItems = (result: TodoDailyResult) =>
    getUnresolvedIncompleteItems(result.date, result.items)

  const getImportableHistoryItems = (
    result: TodoDailyResult,
    existingKeys = new Set(todayItems.map(getTodoCarryKey))
  ) => getImportableItems(result.items, existingKeys, result.date)

  const pastIncompleteResults = todoHistory
    .filter(result => result.date !== today)
    .map(result => ({
      result,
      incomplete: getIncompleteHistoryItems(result),
      importable: getImportableHistoryItems(result),
    }))
    .filter(item => item.incomplete.length > 0)
  const pastIncompleteTotal = pastIncompleteResults.reduce((sum, item) => sum + item.incomplete.length, 0)
  const pastImportableTotal = pastIncompleteResults.reduce((sum, item) => sum + item.importable.length, 0)

  const rolloverTodayIncomplete = async () => {
    if (todayIncomplete.length === 0) {
      setSaveMessage('내일로 넘길 미완료 Todo가 없습니다.')
      window.setTimeout(() => setSaveMessage(''), 2000)
      return
    }
    const confirmed = await confirm({
      title: '미완료 Todo 넘기기',
      description: `미완료 Todo ${todayIncomplete.length}개를 ${tomorrow}로 가져옵니다. 오늘 결과도 기록에 저장됩니다.`,
      confirmLabel: '내일로 넘기기',
    })
    if (!confirmed) return

    const tomorrowKeys = new Set(
      todos
        .filter(todo => todo.date === tomorrow)
        .map(getTodoCarryKey)
    )
    const carried = todayIncomplete
      .filter(todo => !tomorrowKeys.has(getTodoCarryKey(todo)))
      .map((todo, index): Todo => ({
        ...todo,
        id: `carry-${Date.now()}-${index}`,
        done: false,
        date: tomorrow,
      }))

    const result = buildTodoDailyResult(today, todayItems, 'manual')
    const nextHistory = [result, ...todoHistory.filter(item => item.date !== today)]
      .sort((a, b) => b.date.localeCompare(a.date))
    const nextTrash = todoHistoryTrash.filter(item => item.date !== today)
    const nextDeletedDates = todoHistoryDeletedDates.filter(date => date !== today)
    const nextTodos = carried.length > 0 ? [...carried, ...todos] : todos

    setTodos(nextTodos)
    setTodoHistory(nextHistory)
    setTodoHistoryTrash(nextTrash)
    setTodoHistoryDeletedDates(nextDeletedDates)
    await saveWithOverrides({
      todos: nextTodos,
      todoHistory: nextHistory,
      todoHistoryTrash: nextTrash,
      todoHistoryDeletedDates: nextDeletedDates,
    })
    setSaveMessage(carried.length > 0
      ? `미완료 Todo ${carried.length}개를 내일로 넘겼습니다.`
      : '이미 내일 Todo에 같은 항목이 있습니다.')
    window.setTimeout(() => setSaveMessage(''), 2400)
  }

  const bringTodoItemsToToday = async (sourceDate: string, sourceItems: Todo[]) => {
    const incomplete = getIncompleteItems(sourceItems)
    if (incomplete.length === 0) {
      setSaveMessage('오늘로 올릴 체크 안 된 항목이 없습니다.')
      window.setTimeout(() => setSaveMessage(''), 2000)
      return
    }
    const unresolved = getUnresolvedIncompleteItems(sourceDate, sourceItems)
    if (unresolved.length === 0) {
      setSaveMessage('이미 이후 날짜나 오늘 할 일에 반영된 항목입니다.')
      window.setTimeout(() => setSaveMessage(''), 2400)
      return
    }
    const todayKeys = new Set(todayItems.map(getTodoCarryKey))
    const carried = getImportableItems(sourceItems, todayKeys, sourceDate)
      .map((todo, index): Todo => ({
        ...todo,
        id: `history-carry-${Date.now()}-${index}`,
        done: false,
        date: today,
      }))
    if (carried.length === 0) {
      setSaveMessage('오늘 할 일에 이미 같은 항목이 있습니다.')
      window.setTimeout(() => setSaveMessage(''), 2400)
      return
    }
    const nextTodos = [...carried, ...todos]
    setTodos(nextTodos)
    setFilterCat('all')
    setFilterDate('today')
    await saveWithOverrides({ todos: nextTodos })
    setSaveMessage(`${sourceDate} 체크 안 된 항목 ${carried.length}개를 오늘 할 일로 올렸습니다.`)
    window.setTimeout(() => setSaveMessage(''), 2400)
  }

  const bringIncompleteFromHistory = async (result: TodoDailyResult) => {
    await bringTodoItemsToToday(result.date, result.items)
  }

  const bringAllPastIncompleteToToday = async () => {
    if (pastIncompleteTotal === 0) {
      setSaveMessage('가져올 지난 미완료 Todo가 없습니다.')
      window.setTimeout(() => setSaveMessage(''), 2000)
      return
    }

    const todayKeys = new Set(todayItems.map(getTodoCarryKey))
    const timestamp = Date.now()
    const carried: Todo[] = []
    let duplicateCount = 0

    pastIncompleteResults.forEach(({ incomplete }) => {
      incomplete.forEach(todo => {
        const key = getTodoCarryKey(todo)
        if (todayKeys.has(key)) {
          duplicateCount += 1
          return
        }
        todayKeys.add(key)
        carried.push({
          ...todo,
          id: `history-carry-${timestamp}-${carried.length}`,
          done: false,
          date: today,
        })
      })
    })

    if (carried.length === 0) {
      setSaveMessage(duplicateCount > 0
        ? '지난 미완료 항목이 이미 오늘 Todo에 있습니다.'
        : '오늘로 가져올 미완료 Todo가 없습니다.')
      window.setTimeout(() => setSaveMessage(''), 2400)
      return
    }

    const nextTodos = [...carried, ...todos]
    setTodos(nextTodos)
    setFilterCat('all')
    setFilterDate('today')
    await saveWithOverrides({ todos: nextTodos })
    setSaveMessage(`지난 미완료 Todo ${carried.length}개를 오늘로 가져왔습니다.`)
    window.setTimeout(() => setSaveMessage(''), 2600)
  }

  const startCorrection = (result: TodoDailyResult) => {
    setCorrectionDate(result.date)
    setCorrectionItems(result.items.map(item => ({ ...item })))
    setCorrectionNote('')
    setCorrectionNewText('')
    setCorrectionNewCategory('work')
    setCorrectionNewDone(true)
  }

  const cancelCorrection = () => {
    setCorrectionDate(null)
    setCorrectionItems([])
    setCorrectionNote('')
    setCorrectionNewText('')
    setCorrectionNewCategory('work')
    setCorrectionNewDone(true)
  }

  const toggleCorrectionItem = (id: string) => {
    setCorrectionItems(items =>
      items.map(item => item.id === id ? { ...item, done: !item.done } : item)
    )
  }

  const addCorrectionItem = (result: TodoDailyResult) => {
    const text = correctionNewText.trim()
    if (!text) return
    setCorrectionItems(items => [
      ...items,
      {
        id: `correction-${Date.now()}`,
        text,
        done: correctionNewDone,
        priority: 'medium',
        category: correctionNewCategory,
        date: result.date,
      },
    ])
    setCorrectionNewText('')
    setCorrectionNewDone(true)
  }

  const removeCorrectionItem = (id: string) => {
    setCorrectionItems(items => items.filter(item => item.id !== id))
  }

  const saveCorrection = async (result: TodoDailyResult) => {
    if (correctionSaving) return

    const stateChanges = correctionItems.reduce<TodoCorrection['changes']>((acc, item) => {
      const original = result.items.find(saved => saved.id === item.id)
      if (!original) {
        acc.push({
          itemId: item.id,
          text: item.text,
          action: 'add',
          toDone: item.done,
        })
        return acc
      }
      if (original.done !== item.done) {
        acc.push({
          itemId: item.id,
          text: item.text,
          action: 'toggle',
          fromDone: original.done,
          toDone: item.done,
        })
      }
      return acc
    }, [])
    const removedChanges: TodoCorrection['changes'] = result.items
      .filter(original => !correctionItems.some(item => item.id === original.id))
      .map(original => ({
        itemId: original.id,
        text: original.text,
        action: 'remove',
        fromDone: original.done,
      }))
    const changes = [...stateChanges, ...removedChanges]
    const note = correctionNote.trim()
    if (changes.length === 0 && !note) {
      setSaveMessage('변경된 항목이나 메모가 없습니다.')
      window.setTimeout(() => setSaveMessage(''), 2000)
      return
    }

    const correctedAt = new Date().toISOString()
    const doneCount = correctionItems.filter(item => item.done).length
    const corrected: TodoDailyResult = {
      ...result,
      items: correctionItems.map(item => ({ ...item })),
      total: correctionItems.length,
      done: doneCount,
      completionRate: correctionItems.length === 0
        ? 0
        : Math.round((doneCount / correctionItems.length) * 100),
      correctionNote: note || result.correctionNote,
      correctedAt,
      correctionHistory: [
        ...(result.correctionHistory ?? []),
        { correctedAt, note, changes },
      ],
    }
    const shouldDeleteRecord = correctionItems.length === 0
    const nextHistory = shouldDeleteRecord
      ? todoHistory.filter(item => item.date !== result.date)
      : todoHistory.map(item => item.date === result.date ? corrected : item)
    const deletedRecord: DeletedTodoDailyResult | null = shouldDeleteRecord
      ? { ...corrected, deletedAt: correctedAt, deletionReason: 'empty' }
      : null
    const nextTrash = deletedRecord
      ? [deletedRecord, ...todoHistoryTrash.filter(item => item.date !== result.date)]
      : todoHistoryTrash
    const nextDeletedDates = deletedRecord
      ? todoHistoryDeletedDates.filter(date => date !== result.date)
      : todoHistoryDeletedDates

    setCorrectionSaving(true)
    setTodoHistory(nextHistory)
    if (deletedRecord) setTodoHistoryTrash(nextTrash)
    if (deletedRecord) setTodoHistoryDeletedDates(nextDeletedDates)
    await saveWithOverrides({
      todoHistory: nextHistory,
      ...(deletedRecord ? {
        todoHistoryTrash: nextTrash,
        todoHistoryDeletedDates: nextDeletedDates,
      } : {}),
    })
    setCorrectionSaving(false)
    cancelCorrection()
    setSaveMessage(shouldDeleteRecord
      ? '빈 Todo 기록을 휴지통으로 이동했습니다.'
      : 'Todo 기록을 보정했습니다.')
    window.setTimeout(() => setSaveMessage(''), 2000)
  }

  const moveHistoryToTrash = async (result: TodoDailyResult) => {
    const confirmed = await confirm({
      title: 'Todo 기록 휴지통 이동',
      description: `${result.date} Todo 기록을 휴지통으로 이동합니다. 휴지통에서 다시 복원할 수 있습니다.`,
      confirmLabel: '휴지통으로 이동',
      danger: true,
    })
    if (!confirmed) return

    const deleted: DeletedTodoDailyResult = {
      ...result,
      deletedAt: new Date().toISOString(),
      deletionReason: 'manual',
    }
    const nextHistory = todoHistory.filter(item => item.date !== result.date)
    const nextTrash = [deleted, ...todoHistoryTrash.filter(item => item.date !== result.date)]
    const nextDeletedDates = todoHistoryDeletedDates.filter(date => date !== result.date)
    setTodoHistory(nextHistory)
    setTodoHistoryTrash(nextTrash)
    setTodoHistoryDeletedDates(nextDeletedDates)
    await saveWithOverrides({
      todoHistory: nextHistory,
      todoHistoryTrash: nextTrash,
      todoHistoryDeletedDates: nextDeletedDates,
    })
    setSaveMessage('Todo 기록을 휴지통으로 이동했습니다.')
    window.setTimeout(() => setSaveMessage(''), 2000)
  }

  const restoreHistory = async (deleted: DeletedTodoDailyResult) => {
    const { deletedAt: _deletedAt, deletionReason: _deletionReason, ...restored } = deleted
    const nextHistory = [
      restored,
      ...todoHistory.filter(item => item.date !== deleted.date),
    ].sort((a, b) => b.date.localeCompare(a.date))
    const nextTrash = todoHistoryTrash.filter(item => item.date !== deleted.date)
    const nextDeletedDates = todoHistoryDeletedDates.filter(date => date !== deleted.date)
    setTodoHistory(nextHistory)
    setTodoHistoryTrash(nextTrash)
    setTodoHistoryDeletedDates(nextDeletedDates)
    await saveWithOverrides({
      todoHistory: nextHistory,
      todoHistoryTrash: nextTrash,
      todoHistoryDeletedDates: nextDeletedDates,
    })
    setSaveMessage('Todo 기록을 복원했습니다.')
    window.setTimeout(() => setSaveMessage(''), 2000)
  }

  const permanentlyDeleteHistory = async (deleted: DeletedTodoDailyResult) => {
    const confirmed = await confirm({
      title: 'Todo 기록 영구 삭제',
      description: `${deleted.date} Todo 기록을 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: '영구 삭제',
      danger: true,
    })
    if (!confirmed) return
    const nextTrash = todoHistoryTrash.filter(item => item.date !== deleted.date)
    const nextDeletedDates = [
      deleted.date,
      ...todoHistoryDeletedDates.filter(date => date !== deleted.date),
    ]
    setTodoHistoryTrash(nextTrash)
    setTodoHistoryDeletedDates(nextDeletedDates)
    await saveWithOverrides({
      todoHistoryTrash: nextTrash,
      todoHistoryDeletedDates: nextDeletedDates,
    })
    setSaveMessage('Todo 기록을 영구 삭제했습니다.')
    window.setTimeout(() => setSaveMessage(''), 2000)
  }

  return (
    <div className="todo-page-shell">

      {/* 헤더 */}
      <PageHeader
        title="오늘 할 일"
        description={`${new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })} · 오늘과 내일의 실행 항목`}
        actions={(
          <>
          {saveMessage && <span className="todo-save-message" role="status">{saveMessage}</span>}
          <Button
            variant="secondary"
            onClick={rolloverTodayIncomplete}
            disabled={todayIncomplete.length === 0}
            title="오늘 미완료 Todo를 내일 날짜로 복사하고 오늘 결과를 저장합니다."
          >
            미완료 내일로
          </Button>
          <Button onClick={saveTodayResult}>오늘 결과 저장</Button>
          </>
        )}
      />

      {/* 진행률 카드 */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto',
        gap: 16, background: 'var(--bg2)', borderRadius: 8,
        padding: '18px 20px', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>오늘 진행률</span>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)' }}>
              <span>오늘 추가 <b style={{ color: 'var(--text)' }}>{todayAdded}</b>개</span>
              <span>완료 <b style={{ color: 'var(--accent)' }}>{doneAll}</b> / {totalAll}</span>
              <span>내일 Todo <b style={{ color: 'var(--text)' }}>{tomorrowDone}</b> / {tomorrowItems.length}</span>
            </div>
          </div>
          <ProgressBar pct={pctAll} color="var(--accent)" height={8} />
          <div style={{ display: 'flex', gap: 16 }}>
            {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([c, cfg]) => {
              const s = catStat(c)
              if (!s) return null
              return (
                <div key={c} style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{s.done}/{s.total}</span>
                  </div>
                  <ProgressBar pct={s.pct} color={cfg.color} height={4} />
                </div>
              )
            })}
          </div>
        </div>
        {/* 원형 진행률 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 12 }}>
          <svg width={72} height={72} viewBox="0 0 72 72">
            <circle cx={36} cy={36} r={28} fill="none" stroke="var(--bg4)" strokeWidth={7} />
            <circle cx={36} cy={36} r={28} fill="none"
              stroke="var(--accent)" strokeWidth={7}
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - pctAll / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 36 36)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
            <text x={36} y={40} textAnchor="middle"
              fill="var(--text)" fontSize={15} fontWeight={700}
            >{pctAll}%</text>
          </svg>
        </div>
      </div>

      {/* 입력 + 필터 */}
      <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '16px 18px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
              빠른 정리
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.45 }}>
              오늘과 내일 Todo를 바로 추가하고, 카테고리와 기간 기준으로 빠르게 좁혀봅니다.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {[
              `${addTargetLabel} 입력`,
              `오늘 ${todayItems.length}개`,
              `내일 ${tomorrowItems.length}개`,
            ].map(label => (
              <span key={label} style={{
                padding: '5px 8px',
                borderRadius: 999,
                background: 'var(--bg3)',
                color: 'var(--muted)',
                fontSize: 11,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            ))}
          </div>
        </div>
        {/* 입력 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={addTarget}
            onChange={e => setAddTarget(e.target.value as AddTarget)}
            aria-label="추가할 날짜"
            style={{
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg3)', color: 'var(--text)',
              fontSize: 12, padding: '8px 8px', cursor: 'pointer', fontWeight: 700,
            }}
          >
            <option value="today">오늘</option>
            <option value="tomorrow">내일</option>
          </select>
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value as Category)}
            style={{
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg3)', color: CATEGORY_CONFIG[newCategory].color,
              fontSize: 12, padding: '8px 8px', cursor: 'pointer', fontWeight: 700,
            }}
          >
            {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([c, cfg]) => (
              <option key={c} value={c}>{cfg.label}</option>
            ))}
          </select>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onKeyDown={e => { if (e.key === 'Enter' && !composing) add() }}
            placeholder={`${addTargetLabel} 할 일을 입력하세요...`}
            style={{
              flex: '1 1 220px', border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg3)', color: 'var(--text)', fontSize: 14,
              padding: '8px 12px', outline: 'none',
            }}
          />
          <button type="button" onClick={add} style={{
            border: 'none', borderRadius: 8, background: 'var(--accent)',
            color: '#fff', fontSize: 14, padding: '8px 18px', cursor: 'pointer', fontWeight: 600,
          }}>추가</button>
        </div>

        {/* 필터 행 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 카테고리 필터 */}
          <div style={{
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap',
            padding: '6px',
            borderRadius: 8,
            background: 'var(--bg3)',
          }}>
            {([
              { id: 'all', label: '전체', color: 'var(--accent)' },
              ...Object.entries(CATEGORY_CONFIG).map(([id, cfg]) => ({ id, label: cfg.label, color: cfg.color })),
            ] as { id: FilterType; label: string; color: string }[]).map(opt => (
              <button type="button" key={opt.id} onClick={() => setFilterCat(opt.id)} style={{
                padding: '4px 11px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: filterCat === opt.id ? `1.5px solid ${opt.color}` : '1.5px solid var(--border)',
                background: filterCat === opt.id ? `${opt.color}15` : 'transparent',
                color: filterCat === opt.id ? opt.color : 'var(--muted)',
                fontWeight: filterCat === opt.id ? 600 : 400, transition: 'all 0.12s',
              }}>{opt.label}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />

          {/* 기간 필터 */}
          <div style={{
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap',
            padding: '6px',
            borderRadius: 8,
            background: 'var(--bg3)',
          }}>
            {([
              { id: 'today', label: '오늘' },
              { id: 'tomorrow', label: '내일' },
              { id: 'week',  label: '이번 주' },
              { id: 'all',   label: '전체 기간' },
            ] as { id: DateFilter; label: string }[]).map(opt => (
              <button type="button" key={opt.id} onClick={() => setFilterDate(opt.id)} style={{
                padding: '4px 11px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: filterDate === opt.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                background: filterDate === opt.id ? 'var(--accent-soft)' : 'transparent',
                color: filterDate === opt.id ? 'var(--accent)' : 'var(--muted)',
                fontWeight: filterDate === opt.id ? 600 : 400, transition: 'all 0.12s',
              }}>{opt.label}</button>
            ))}
          </div>

          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
            {active.length}개 남음 · 완료 {done.length}개
          </span>
        </div>
      </div>

      {/* 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.length === 0 && (
          <div style={{
            background: 'var(--bg2)', borderRadius: 8, padding: '40px 20px',
            border: '1px solid var(--border)', textAlign: 'center',
            color: 'var(--muted)', fontSize: 14,
          }}>
            할 일이 없어요 🎉
          </div>
        )}

        {/* 미완료 */}
        {active.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, paddingLeft: 4 }}>
            진행 중 {active.length}
          </p>
        )}
        {active.map(t => <TodoRow key={t.id} t={t} editId={editId} editText={editText} editCategory={editCategory} editRef={editRef}
          onToggle={toggle} onRemove={remove} onStartEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit}
          onEditTextChange={setEditText} onEditCategoryChange={setEditCategory} />)}

        {/* 완료 */}
        {done.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, paddingLeft: 4, marginTop: 8 }}>
            완료 {done.length}
          </p>
        )}
        {done.map(t => <TodoRow key={t.id} t={t} editId={editId} editText={editText} editCategory={editCategory} editRef={editRef}
          onToggle={toggle} onRemove={remove} onStartEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit}
          onEditTextChange={setEditText} onEditCategoryChange={setEditCategory} />)}
      </div>

      <section style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '16px 18px',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              내일 브리핑
            </h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
              {tomorrow} · Todo, 일정, 신청, 지원, 마감
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}>
            {[
              ['Todo', tomorrowBriefing.summary.todos],
              ['방향', tomorrowBriefing.summary.focus],
              ['일정', tomorrowBriefing.summary.schedules],
              ['마감', tomorrowBriefing.summary.deadlines],
              ['신청/지원', tomorrowBriefing.summary.applications],
            ].map(([label, count]) => (
              <span key={label} style={{
                padding: '5px 8px',
                borderRadius: 999,
                background: Number(count) > 0 ? 'var(--accent-soft)' : 'var(--bg3)',
                color: Number(count) > 0 ? 'var(--accent)' : 'var(--muted)',
                fontSize: 11,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}>
                {label} {count}
              </span>
            ))}
          </div>
        </div>

        {tomorrowBriefing.total === 0 ? (
          <div style={{
            padding: '18px 12px',
            borderRadius: 8,
            background: 'var(--bg3)',
            color: 'var(--muted)',
            fontSize: 13,
            textAlign: 'center',
          }}>
            내일 예정된 항목이 없습니다.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 10,
          }}>
            {tomorrowBriefingSections.map(section => (
              <article key={section.id} style={{
                minWidth: 0,
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg3)',
                padding: '11px 12px',
              }}>
                <strong style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  color: 'var(--text)',
                  fontSize: 12,
                  marginBottom: 8,
                }}>
                  <span>{section.label}</span>
                  <span style={{ color: 'var(--accent)' }}>{section.items.length}</span>
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {section.items.slice(0, 4).map(item => (
                    <div key={item.id} style={{ minWidth: 0 }}>
                      <div style={{
                        color: 'var(--text)',
                        fontSize: 12,
                        fontWeight: 700,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.title}
                      </div>
                      {(item.meta || item.detail) && (
                        <div style={{
                          color: 'var(--muted)',
                          fontSize: 10,
                          lineHeight: 1.45,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {[item.meta, item.detail].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                  {section.items.length > 4 && (
                    <span style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 700 }}>
                      외 {section.items.length - 4}개
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Todo 기록</h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            지난 날짜는 자동 저장되며, 오늘 기록은 위 버튼으로 언제든 갱신할 수 있습니다.
          </p>
        </div>

        {pastIncompleteResults.length > 0 && (
          <div style={{
            border: '1px solid var(--accent)',
            background: 'var(--accent-soft)',
            borderRadius: 8,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 13, color: 'var(--text)' }}>
                  지난 기록에 다시 올릴 미완료 Todo {pastIncompleteTotal}개가 남아 있어요.
                </strong>
                <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--muted)' }}>
                  이후 날짜나 오늘 Todo에 이미 반영된 항목은 제외하고 가져옵니다. 지난 기록은 그대로 보존됩니다.
                </span>
              </div>
              <button
                type="button"
                onClick={bringAllPastIncompleteToToday}
                disabled={pastImportableTotal === 0}
                style={{
                  flexShrink: 0,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: pastImportableTotal === 0 ? 'default' : 'pointer',
                  opacity: pastImportableTotal === 0 ? 0.55 : 1,
                }}
              >
                모두 오늘로 가져오기
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {pastIncompleteResults.slice(0, 6).map(({ result, importable }) => (
                <button
                  key={result.date}
                  type="button"
                  onClick={() => bringIncompleteFromHistory(result)}
                  disabled={importable.length === 0}
                  title={`${result.date} 미완료 Todo를 오늘 날짜로 가져오기`}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    background: 'var(--bg2)',
                    color: importable.length === 0 ? 'var(--muted)' : 'var(--accent)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: importable.length === 0 ? 'default' : 'pointer',
                    opacity: importable.length === 0 ? 0.6 : 1,
                  }}
                >
                  {result.date} · {importable.length === 0 ? '이미 있음' : `${importable.length}개`}
                </button>
              ))}
              {pastIncompleteResults.length > 6 && (
                <span style={{
                  padding: '5px 8px',
                  borderRadius: 999,
                  color: 'var(--muted)',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  외 {pastIncompleteResults.length - 6}일
                </span>
              )}
            </div>
          </div>
        )}

        {todoHistory.length === 0 ? (
          <div style={{
            padding: '22px 18px', borderTop: '1px solid var(--border)',
            color: 'var(--muted)', fontSize: 13, textAlign: 'center',
          }}>
            저장된 Todo 결과가 없습니다.
          </div>
        ) : todoHistory.map(result => {
          const visibleItems = correctionDate === result.date ? correctionItems : result.items
          const visibleIncomplete = getIncompleteItems(visibleItems)
          const visibleUnresolved = getUnresolvedIncompleteItems(result.date, visibleItems)
          const visibleImportable = getImportableItems(visibleItems, undefined, result.date)
          return (
          <details key={result.date} style={{
            borderTop: '1px solid var(--border)',
            padding: '12px 4px 0',
          }}>
            <summary style={{
              display: 'grid', gridTemplateColumns: '120px 1fr auto',
              gap: 16, alignItems: 'center', cursor: 'pointer',
              color: 'var(--text)', listStyle: 'none',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{result.date}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  {result.source === 'manual' ? '직접 저장' : '자동 저장'}
                  {result.correctedAt && (
                    <span style={{ color: 'var(--accent)', marginLeft: 5 }}>· 수동 보정됨</span>
                  )}
                </div>
              </div>
              <ProgressBar pct={result.completionRate} color="var(--accent)" height={6} />
              <div style={{ minWidth: 92, textAlign: 'right' }}>
                <b style={{ color: 'var(--accent)', fontSize: 15 }}>{result.completionRate}%</b>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>
                  완료 {result.done} / {result.total}
                </span>
              </div>
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '12px 0 2px 136px' }}>
              {result.date !== today && visibleIncomplete.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg3)',
                }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                    이 날짜에 체크 안 된 항목 {visibleIncomplete.length}개가 남아 있습니다.
                    {visibleUnresolved.length !== visibleIncomplete.length
                      ? ` 이 중 ${visibleIncomplete.length - visibleUnresolved.length}개는 이후 날짜에 반영됐습니다.`
                      : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => bringTodoItemsToToday(result.date, visibleItems)}
                    disabled={visibleImportable.length === 0}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 7,
                      border: '1px solid var(--accent)',
                      background: 'var(--accent-soft)',
                      color: 'var(--accent)',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: visibleImportable.length === 0 ? 'default' : 'pointer',
                      opacity: visibleImportable.length === 0 ? 0.55 : 1,
                    }}
                  >
                    {visibleUnresolved.length === 0
                      ? '이후 날짜에 반영됨'
                      : visibleImportable.length === 0
                      ? '오늘 할 일에 이미 있음'
                      : `체크 안 된 항목 ${visibleImportable.length}개 오늘 할 일로 올리기`}
                  </button>
                </div>
              )}

              {visibleItems.length === 0 ? (
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 12,
                }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    저장된 항목이 없습니다.
                  </span>
                  {correctionDate !== result.date && (
                    <button
                      type="button"
                      onClick={() => moveHistoryToTrash(result)}
                      style={{
                        flexShrink: 0, padding: '6px 10px', borderRadius: 6,
                        border: '1px solid var(--red)', background: 'transparent',
                        color: 'var(--red)', fontSize: 11, fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      빈 기록 삭제
                    </button>
                  )}
                </div>
              ) : visibleItems.map(item => {
                const itemHandledLater = !item.done && hasLaterTodoOccurrence({
                  sourceDate: result.date,
                  todo: item,
                  today,
                  todoHistory,
                  todos,
                })
                const itemImportable = getImportableItems([item], undefined, result.date).length > 0
                return (
                <label key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, color: item.done ? 'var(--muted)' : 'var(--text)',
                  cursor: correctionDate === result.date ? 'pointer' : 'default',
                }}>
                  {correctionDate === result.date ? (
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleCorrectionItem(item.id)}
                      style={{ width: 14, height: 14, accentColor: 'var(--accent)' }}
                    />
                  ) : (
                    <span style={{ color: item.done ? 'var(--accent)' : 'var(--border)' }}>
                      {item.done ? '✓' : '○'}
                    </span>
                  )}
                  <Badge category={cat(item)} />
                  <span style={{ flex: 1, textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                  {correctionDate === result.date && !result.items.some(saved => saved.id === item.id) && (
                    <span style={{
                      flexShrink: 0, padding: '1px 5px', borderRadius: 4,
                      background: 'var(--accent-soft)', color: 'var(--accent)',
                      fontSize: 9, fontWeight: 700,
                    }}>
                      보정 추가
                    </span>
                  )}
                  {result.date !== today && !item.done && (
                    <button
                      type="button"
                      onClick={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        bringTodoItemsToToday(result.date, [item])
                      }}
                      disabled={!itemImportable}
                      title="이 체크 안 된 항목을 오늘 할 일로 올리기"
                      aria-label={`${item.text} 오늘 할 일로 올리기`}
                      style={{
                        flexShrink: 0,
                        border: '1px solid var(--accent)',
                        borderRadius: 6,
                        background: itemImportable ? 'var(--accent-soft)' : 'var(--bg3)',
                        color: itemImportable ? 'var(--accent)' : 'var(--muted)',
                        fontSize: 10,
                        fontWeight: 800,
                        lineHeight: 1,
                        padding: '5px 7px',
                        cursor: itemImportable ? 'pointer' : 'default',
                        opacity: itemImportable ? 1 : 0.55,
                      }}
                    >
                      {itemImportable ? '오늘로 올리기' : itemHandledLater ? '이후 반영됨' : '이미 오늘에 있음'}
                    </button>
                  )}
                  {correctionDate === result.date && (
                    <button
                      type="button"
                      onClick={event => {
                        event.preventDefault()
                        removeCorrectionItem(item.id)
                      }}
                      title="잘못 생성된 Todo를 기록에서 삭제"
                      aria-label={`${item.text} 기록에서 제거`}
                      style={{
                        flexShrink: 0, border: '1px solid var(--border)',
                        borderRadius: 5, background: 'transparent',
                        color: 'var(--red)', fontSize: 10, lineHeight: 1,
                        padding: '4px 6px', cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  )}
                </label>
                )
              })}

              {result.correctionNote && correctionDate !== result.date && (
                <div style={{
                  marginTop: 5, padding: '9px 10px', borderRadius: 7,
                  background: 'var(--bg3)', borderLeft: '3px solid var(--accent)',
                  color: 'var(--text)', fontSize: 12, whiteSpace: 'pre-wrap',
                }}>
                  <b style={{ display: 'block', marginBottom: 3, color: 'var(--accent)', fontSize: 10 }}>
                    보정 메모
                  </b>
                  {result.correctionNote}
                </div>
              )}

              {correctionDate === result.date ? (
                <div style={{ marginTop: 5 }}>
                  <div className="todo-correction-add-row" style={{
                    display: 'grid', gridTemplateColumns: '88px 1fr auto auto',
                    gap: 6, marginBottom: 7,
                  }}>
                    <select
                      value={correctionNewCategory}
                      onChange={event => setCorrectionNewCategory(event.target.value as Category)}
                      aria-label="추가 항목 카테고리"
                      style={{
                        minWidth: 0, border: '1px solid var(--border)', borderRadius: 7,
                        background: 'var(--bg3)', color: CATEGORY_CONFIG[correctionNewCategory].color,
                        padding: '6px 5px', fontSize: 11, fontWeight: 700,
                      }}
                    >
                      {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][])
                        .map(([value, config]) => (
                          <option key={value} value={value}>{config.label}</option>
                        ))}
                    </select>
                    <input
                      value={correctionNewText}
                      maxLength={200}
                      onChange={event => setCorrectionNewText(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' && !event.nativeEvent.isComposing) addCorrectionItem(result)
                      }}
                      placeholder="누락된 항목 추가"
                      style={{
                        minWidth: 0, border: '1px solid var(--border)', borderRadius: 7,
                        background: 'var(--bg3)', color: 'var(--text)',
                        padding: '6px 8px', fontSize: 12, outline: 'none',
                      }}
                    />
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 10,
                    }}>
                      <input
                        type="checkbox"
                        checked={correctionNewDone}
                        onChange={event => setCorrectionNewDone(event.target.checked)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      완료
                    </label>
                    <button
                      type="button"
                      onClick={() => addCorrectionItem(result)}
                      disabled={!correctionNewText.trim()}
                      style={{
                        padding: '5px 9px', border: 'none', borderRadius: 6,
                        background: 'var(--accent)', color: '#fff',
                        fontSize: 11, fontWeight: 600,
                        opacity: correctionNewText.trim() ? 1 : 0.45,
                        cursor: correctionNewText.trim() ? 'pointer' : 'default',
                      }}
                    >
                      추가
                    </button>
                  </div>
                  <div style={{
                    marginBottom: 7, color: 'var(--muted)',
                    fontSize: 10, lineHeight: 1.5,
                  }}>
                    잘못 생성된 Todo는 항목 오른쪽의 삭제 버튼으로 기록에서 제거할 수 있습니다.
                  </div>
                  <textarea
                    value={correctionNote}
                    maxLength={1000}
                    onChange={event => setCorrectionNote(event.target.value)}
                    placeholder="누락된 완료 처리나 당시 상황을 메모하세요."
                    style={{
                      width: '100%', minHeight: 74, resize: 'vertical',
                      border: '1px solid var(--border)', borderRadius: 7,
                      background: 'var(--bg3)', color: 'var(--text)',
                      padding: 9, fontFamily: 'inherit', fontSize: 12,
                      lineHeight: 1.5, outline: 'none',
                    }}
                  />
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginTop: 6,
                  }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                      이 수정은 보정 이력에 남습니다.
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={cancelCorrection} style={{
                        padding: '5px 10px', borderRadius: 6,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--muted)', fontSize: 11, cursor: 'pointer',
                      }}>
                        취소
                      </button>
                      <button type="button"
                        onClick={() => saveCorrection(result)}
                        disabled={correctionSaving}
                        style={{
                          padding: '5px 11px', borderRadius: 6, border: 'none',
                          background: 'var(--accent)', color: '#fff',
                          fontSize: 11, fontWeight: 600,
                          cursor: correctionSaving ? 'wait' : 'pointer',
                          opacity: correctionSaving ? 0.6 : 1,
                        }}
                      >
                        {correctionSaving ? '저장 중...' : '보정 저장'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                  {result.items.length > 0 && (
                    <>
                      <button type="button"
                        onClick={() => startCorrection(result)}
                        disabled={correctionDate !== null}
                        style={{
                          padding: '5px 10px', borderRadius: 6,
                          border: '1px solid var(--border)', background: 'var(--bg2)',
                          color: 'var(--text)', fontSize: 11,
                          cursor: correctionDate !== null ? 'default' : 'pointer',
                          opacity: correctionDate !== null ? 0.45 : 1,
                        }}
                      >
                        기록 보정
                      </button>
                      {result.date !== today && result.items.some(item => !item.done) && (
                        <button type="button"
                          onClick={() => bringIncompleteFromHistory(result)}
                          disabled={correctionDate !== null}
                          title="이 날짜의 미완료 Todo를 오늘 날짜로 복사합니다."
                          style={{
                            padding: '5px 10px', borderRadius: 6,
                            border: '1px solid var(--accent)', background: 'var(--accent-soft)',
                            color: 'var(--accent)', fontSize: 11,
                            cursor: correctionDate !== null ? 'default' : 'pointer',
                            opacity: correctionDate !== null ? 0.45 : 1,
                            fontWeight: 700,
                          }}
                        >
                          미완료 오늘로
                        </button>
                      )}
                      <button type="button"
                        onClick={() => moveHistoryToTrash(result)}
                        disabled={correctionDate !== null}
                        style={{
                          padding: '5px 10px', borderRadius: 6,
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--red)', fontSize: 11,
                          cursor: correctionDate !== null ? 'default' : 'pointer',
                          opacity: correctionDate !== null ? 0.45 : 1,
                        }}
                      >
                        기록 삭제
                      </button>
                    </>
                  )}
                  {result.correctedAt && (
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                      최근 보정 {new Date(result.correctedAt).toLocaleString('ko-KR')}
                    </span>
                  )}
                </div>
              )}

              {(result.correctionHistory?.length ?? 0) > 1 && correctionDate !== result.date && (
                <details style={{ marginTop: 3 }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--muted)', fontSize: 10 }}>
                    이전 보정 이력 {result.correctionHistory!.length}건
                  </summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 6 }}>
                    {result.correctionHistory!.slice().reverse().map((history, index) => (
                      <div key={`${history.correctedAt}-${index}`} style={{
                        padding: '7px 9px', borderRadius: 6,
                        background: 'var(--bg3)', color: 'var(--muted)', fontSize: 10,
                      }}>
                        <div>{new Date(history.correctedAt).toLocaleString('ko-KR')}</div>
                        {history.note && <div style={{ color: 'var(--text)', marginTop: 2 }}>{history.note}</div>}
                        {history.changes.length > 0 && (
                          <div style={{ marginTop: 2 }}>
                            {[
                              history.changes.filter(change => !change.action || change.action === 'toggle').length > 0
                                ? `완료 변경 ${history.changes.filter(change => !change.action || change.action === 'toggle').length}건`
                                : '',
                              history.changes.filter(change => change.action === 'add').length > 0
                                ? `추가 ${history.changes.filter(change => change.action === 'add').length}건`
                                : '',
                              history.changes.filter(change => change.action === 'remove').length > 0
                                ? `삭제 ${history.changes.filter(change => change.action === 'remove').length}건`
                                : '',
                            ].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </details>
          )
        })}
      </section>

      {todoHistoryTrash.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          <details>
            <summary style={{
              cursor: 'pointer', color: 'var(--muted)',
              fontSize: 12, fontWeight: 600,
            }}>
              Todo 기록 휴지통 ({todoHistoryTrash.length})
            </summary>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 7,
              marginTop: 9, padding: 10, borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg2)',
            }}>
              <div style={{ color: 'var(--muted)', fontSize: 10 }}>
                현재는 보관 기간 제한 없이 저장됩니다.
              </div>
              {todoHistoryTrash.map(deleted => (
                <div key={`${deleted.date}-${deleted.deletedAt}`} style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 12,
                  padding: '8px 0', borderTop: '1px solid var(--border)',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--text)', fontSize: 12, fontWeight: 700 }}>
                      {deleted.date}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 10, marginTop: 2 }}>
                      {deleted.total}개 항목 · {new Date(deleted.deletedAt).toLocaleString('ko-KR')} 삭제
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => restoreHistory(deleted)}
                      style={{
                        padding: '5px 9px', borderRadius: 6,
                        border: '1px solid var(--border)', background: 'var(--bg3)',
                        color: 'var(--text)', fontSize: 10, cursor: 'pointer',
                      }}
                    >
                      복원
                    </button>
                    <button
                      type="button"
                      onClick={() => permanentlyDeleteHistory(deleted)}
                      style={{
                        padding: '5px 9px', borderRadius: 6,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--red)', fontSize: 10, cursor: 'pointer',
                      }}
                    >
                      영구 삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}

    </div>
  )
}

interface RowProps {
  t: Todo
  editId: string | null
  editText: string
  editCategory: Category
  editRef: React.RefObject<HTMLInputElement | null>
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onStartEdit: (t: Todo) => void
  onSave: () => void
  onCancel: () => void
  onEditTextChange: (v: string) => void
  onEditCategoryChange: (v: Category) => void
}

function TodoRow({ t, editId, editText, editCategory, editRef, onToggle, onRemove, onStartEdit, onSave, onCancel, onEditTextChange, onEditCategoryChange }: RowProps) {
  const isEditing = editId === t.id
  const cfg = CATEGORY_CONFIG[cat(t)]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px', borderRadius: 8,
      background: 'var(--bg2)', border: `1px solid var(--border)`,
      opacity: t.done ? 0.6 : 1, transition: 'opacity 0.2s',
      boxShadow: t.done ? 'none' : 'var(--shadow)',
    }}>
      <input
        type="checkbox" checked={t.done} onChange={() => onToggle(t.id)}
        style={{ cursor: 'pointer', flexShrink: 0, width: 16, height: 16, accentColor: cfg.color }}
      />

      {isEditing ? (
        <>
          <select
            value={editCategory}
            onChange={e => onEditCategoryChange(e.target.value as Category)}
            style={{
              border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg3)',
              color: CATEGORY_CONFIG[editCategory].color, fontSize: 11, padding: '4px 4px',
              cursor: 'pointer', fontWeight: 700, flexShrink: 0,
            }}
          >
            {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([c, cv]) => (
              <option key={c} value={c}>{cv.label}</option>
            ))}
          </select>
          <input
            ref={editRef}
            value={editText}
            onChange={e => onEditTextChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onSave()
              if (e.key === 'Escape') onCancel()
            }}
            style={{
              flex: 1, border: `1.5px solid ${cfg.color}`,
              borderRadius: 7, background: 'var(--bg3)', color: 'var(--text)',
              fontSize: 14, padding: '4px 10px', outline: 'none',
            }}
          />
          <button type="button" onClick={onSave} style={{
            border: 'none', background: 'var(--accent)', color: '#fff',
            borderRadius: 7, fontSize: 12, padding: '4px 12px', cursor: 'pointer', flexShrink: 0,
          }}>저장</button>
          <button type="button" onClick={onCancel} style={{
            border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)',
            borderRadius: 7, fontSize: 12, padding: '4px 10px', cursor: 'pointer', flexShrink: 0,
          }}>취소</button>
        </>
      ) : (
        <>
          <Badge category={cat(t)} />
          <span
            onDoubleClick={() => onStartEdit(t)}
            title="더블클릭으로 수정"
            style={{
              flex: 1, fontSize: 14, color: t.done ? 'var(--muted)' : 'var(--text)',
              textDecoration: t.done ? 'line-through' : 'none',
              cursor: 'text',
            }}
          >{t.text}</span>
          {t.date && t.date !== toLocalDateKey() && (
            <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{t.date}</span>
          )}
          <button type="button" onClick={() => onRemove(t.id)} aria-label={`${t.text} 삭제`} title="삭제" style={{
            border: 'none', background: 'transparent', color: 'var(--muted)',
            cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1, flexShrink: 0,
          }}><Trash2 size={16} aria-hidden="true" /></button>
        </>
      )}
    </div>
  )
}
