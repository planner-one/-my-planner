import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/AppContext'
import type { Todo, TodoCorrection, TodoDailyResult } from '../types'
import { addLocalDays, toLocalDateKey } from '../utils/date'

type Category = 'work' | 'personal' | 'study'
type FilterType = 'all' | Category
type DateFilter = 'today' | 'week' | 'all'

const CATEGORY_CONFIG: Record<Category, { label: string; color: string }> = {
  work:     { label: '업무', color: '#4A90E2' },
  personal: { label: '개인', color: '#27AE60' },
  study:    { label: '공부', color: '#8E44AD' },
}

const DEFAULT_CATEGORY: Category = 'work'
const cat = (t: Todo): Category => (t.category as Category) ?? DEFAULT_CATEGORY

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
  const { todos, setTodos, todoHistory, setTodoHistory, saveWithOverrides } = useApp()
  const [input, setInput] = useState('')
  const [newCategory, setNewCategory] = useState<Category>('work')
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
  const weekAgo = toLocalDateKey(addLocalDays(new Date(), -6))

  useEffect(() => { if (editId) editRef.current?.focus() }, [editId])

  const dateFiltered = todos.filter(t => {
    if (filterDate === 'today') return !t.date || t.date === today
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
      priority: 'medium', category: newCategory, date: today,
    }
    setTodos(prev => [item, ...prev])
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

  const clearDone = () =>
    setTodos(prev => prev.filter(t => !t.done || t.date !== today))

  const saveTodayResult = async () => {
    const items = todos.filter(t => !t.date || t.date === today).map(t => ({ ...t, date: today }))
    const completed = items.filter(t => t.done).length
    const result: TodoDailyResult = {
      date: today,
      total: items.length,
      done: completed,
      completionRate: items.length === 0 ? 0 : Math.round((completed / items.length) * 100),
      savedAt: new Date().toISOString(),
      source: 'manual',
      items,
    }
    const nextHistory = [result, ...todoHistory.filter(item => item.date !== today)]
      .sort((a, b) => b.date.localeCompare(a.date))

    setTodoHistory(nextHistory)
    await saveWithOverrides({ todoHistory: nextHistory })
    setSaveMessage('오늘 결과를 저장했습니다.')
    window.setTimeout(() => setSaveMessage(''), 2000)
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
    const nextHistory = todoHistory.map(item =>
      item.date === result.date ? corrected : item
    )

    setCorrectionSaving(true)
    setTodoHistory(nextHistory)
    await saveWithOverrides({ todoHistory: nextHistory })
    setCorrectionSaving(false)
    cancelCorrection()
    setSaveMessage('Todo 기록을 보정했습니다.')
    window.setTimeout(() => setSaveMessage(''), 2000)
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            할 일
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saveMessage && <span style={{ fontSize: 12, color: 'var(--accent)' }}>{saveMessage}</span>}
          <button onClick={saveTodayResult} style={{
            fontSize: 12, padding: '7px 14px', borderRadius: 8,
            border: 'none', background: 'var(--accent)',
            color: '#fff', cursor: 'pointer', fontWeight: 600,
          }}>오늘 결과 저장</button>
          <button onClick={clearDone} style={{
            fontSize: 12, padding: '7px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg2)',
            color: 'var(--muted)', cursor: 'pointer',
          }}>완료 항목 지우기</button>
        </div>
      </div>

      {/* 진행률 카드 */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto',
        gap: 16, background: 'var(--bg2)', borderRadius: 14,
        padding: '18px 20px', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>오늘 진행률</span>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)' }}>
              <span>오늘 추가 <b style={{ color: 'var(--text)' }}>{todayAdded}</b>개</span>
              <span>완료 <b style={{ color: 'var(--accent)' }}>{doneAll}</b> / {totalAll}</span>
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
      <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 입력 */}
        <div style={{ display: 'flex', gap: 8 }}>
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
            placeholder="새 할 일을 입력하세요..."
            style={{
              flex: 1, border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg3)', color: 'var(--text)', fontSize: 14,
              padding: '8px 12px', outline: 'none',
            }}
          />
          <button onClick={add} style={{
            border: 'none', borderRadius: 8, background: 'var(--accent)',
            color: '#fff', fontSize: 14, padding: '8px 18px', cursor: 'pointer', fontWeight: 600,
          }}>추가</button>
        </div>

        {/* 필터 행 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 카테고리 필터 */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { id: 'all', label: '전체', color: 'var(--accent)' },
              ...Object.entries(CATEGORY_CONFIG).map(([id, cfg]) => ({ id, label: cfg.label, color: cfg.color })),
            ] as { id: FilterType; label: string; color: string }[]).map(opt => (
              <button key={opt.id} onClick={() => setFilterCat(opt.id)} style={{
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
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { id: 'today', label: '오늘' },
              { id: 'week',  label: '이번 주' },
              { id: 'all',   label: '전체 기간' },
            ] as { id: DateFilter; label: string }[]).map(opt => (
              <button key={opt.id} onClick={() => setFilterDate(opt.id)} style={{
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
            background: 'var(--bg2)', borderRadius: 14, padding: '40px 20px',
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

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Todo 기록</h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            지난 날짜는 자동 저장되며, 오늘 기록은 위 버튼으로 언제든 갱신할 수 있습니다.
          </p>
        </div>

        {todoHistory.length === 0 ? (
          <div style={{
            padding: '22px 18px', borderTop: '1px solid var(--border)',
            color: 'var(--muted)', fontSize: 13, textAlign: 'center',
          }}>
            저장된 Todo 결과가 없습니다.
          </div>
        ) : todoHistory.map(result => (
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
              {(correctionDate === result.date ? correctionItems : result.items).length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>저장된 항목이 없습니다.</span>
              ) : (correctionDate === result.date ? correctionItems : result.items).map(item => (
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
                  {correctionDate === result.date && (
                    <button
                      type="button"
                      onClick={event => {
                        event.preventDefault()
                        removeCorrectionItem(item.id)
                      }}
                      title="기록에서 제거"
                      aria-label={`${item.text} 기록에서 제거`}
                      style={{
                        flexShrink: 0, border: 'none', background: 'transparent',
                        color: 'var(--muted)', fontSize: 16, lineHeight: 1,
                        padding: 1, cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  )}
                </label>
              ))}

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
                      <button onClick={cancelCorrection} style={{
                        padding: '5px 10px', borderRadius: 6,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--muted)', fontSize: 11, cursor: 'pointer',
                      }}>
                        취소
                      </button>
                      <button
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
                  <button
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
        ))}
      </section>
      <style>{`
        @media (max-width: 640px) {
          .todo-correction-add-row {
            grid-template-columns: 84px 1fr !important;
          }
          .todo-correction-add-row > label,
          .todo-correction-add-row > button {
            min-height: 30px;
          }
        }
      `}</style>
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
      padding: '12px 14px', borderRadius: 10,
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
          <button onClick={onSave} style={{
            border: 'none', background: 'var(--accent)', color: '#fff',
            borderRadius: 7, fontSize: 12, padding: '4px 12px', cursor: 'pointer', flexShrink: 0,
          }}>저장</button>
          <button onClick={onCancel} style={{
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
          <button onClick={() => onRemove(t.id)} style={{
            border: 'none', background: 'transparent', color: 'var(--muted)',
            cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1, flexShrink: 0,
          }}>×</button>
        </>
      )}
    </div>
  )
}
