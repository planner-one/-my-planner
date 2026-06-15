import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/AppContext'
import type { Todo } from '../types'
import { toLocalDateKey } from '../utils/date'

export const meta = {
  id: 'todo',
  name: '오늘 할 일',
  icon: '✅',
  defaultW: 8,
  defaultH: 7,
  minW: 4,
  minH: 4,
  order: 3,
}

type Category = 'work' | 'personal' | 'study'
type FilterType = 'all' | Category

const DEFAULT_CATEGORY: Category = 'work'
const cat = (t: Todo): Category => t.category ?? DEFAULT_CATEGORY

const CATEGORY_CONFIG: Record<Category, { label: string; color: string }> = {
  work:     { label: '업무', color: '#4A90E2' },
  personal: { label: '개인', color: '#27AE60' },
  study:    { label: '공부', color: '#8E44AD' },
}

const FILTER_OPTIONS: { id: FilterType; label: string }[] = [
  { id: 'all',      label: '전체' },
  { id: 'work',     label: '업무' },
  { id: 'personal', label: '개인' },
  { id: 'study',    label: '공부' },
]

export default function TodoWidget() {
  const { todos, setTodos } = useApp()
  const [input, setInput] = useState('')
  const [category, setCategory] = useState<Category>('work')
  const [filter, setFilter] = useState<FilterType>('all')
  const [composing, setComposing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editCategory, setEditCategory] = useState<Category>('work')
  const editRef = useRef<HTMLInputElement>(null)

  const today = toLocalDateKey()
  const todayTodos = todos.filter(t => !t.date || t.date === today)

  const filtered = todayTodos.filter(t => filter === 'all' || cat(t) === filter)
  const active = filtered.filter(t => !t.done)
  const done = filtered.filter(t => t.done)
  const sorted = [...active, ...done]
  const completedCount = todayTodos.filter(t => t.done).length
  const completionRate = todayTodos.length === 0
    ? 0
    : Math.round((completedCount / todayTodos.length) * 100)

  useEffect(() => {
    if (editId) editRef.current?.focus()
  }, [editId])

  const add = () => {
    const text = input.trim()
    if (!text) return
    const item: Todo = {
      id: Date.now().toString(),
      text,
      done: false,
      priority: 'medium',
      category,
      date: today,
    }
    setTodos(prev => [item, ...prev])
    setInput('')
  }

  const toggle = (id: string) =>
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const remove = (id: string) =>
    setTodos(prev => prev.filter(t => t.id !== id))

  const startEdit = (t: Todo) => {
    setEditId(t.id)
    setEditText(t.text)
    setEditCategory(cat(t))
  }

  const saveEdit = () => {
    if (!editId) return
    const text = editText.trim()
    if (text) {
      setTodos(prev => prev.map(t =>
        t.id === editId ? { ...t, text, category: editCategory } : t
      ))
    }
    setEditId(null)
  }

  const cancelEdit = () => setEditId(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 12px', boxSizing: 'border-box', gap: 8 }}>

      {/* 입력 */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as Category)}
          style={{
            border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg3)',
            color: CATEGORY_CONFIG[category].color, fontSize: 11, padding: '4px 4px',
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([cat, cfg]) => (
            <option key={cat} value={cat}>{cfg.label}</option>
          ))}
        </select>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={e => { if (e.key === 'Enter' && !composing) add() }}
          placeholder="할 일 추가..."
          style={{
            flex: 1, border: '1px solid var(--border)', borderRadius: 6,
            background: 'var(--bg3)', color: 'var(--text)', fontSize: 13,
            padding: '4px 8px', outline: 'none',
          }}
        />
        <button onClick={add} style={{
          border: 'none', borderRadius: 6, background: 'var(--accent)',
          color: '#fff', fontSize: 13, padding: '4px 10px', cursor: 'pointer', flexShrink: 0,
        }}>+</button>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {FILTER_OPTIONS.map(opt => {
          const active = filter === opt.id
          const color = opt.id !== 'all' ? CATEGORY_CONFIG[opt.id as Category].color : 'var(--accent)'
          return (
            <button key={opt.id} onClick={() => setFilter(opt.id)} style={{
              padding: '3px 9px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
              border: active ? `1.5px solid ${color}` : '1.5px solid var(--border)',
              background: active ? `${color}18` : 'transparent',
              color: active ? color : 'var(--muted)',
              fontWeight: active ? 600 : 400,
              transition: 'all 0.12s',
            }}>{opt.label}</button>
          )
        })}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>
          {completedCount}/{todayTodos.length} · {completionRate}%
        </span>
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sorted.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
            할 일이 없어요
          </p>
        )}
        {sorted.map(t => {
          const cfg = CATEGORY_CONFIG[cat(t)]
          const isEditing = editId === t.id

          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 8px', borderRadius: 8,
              background: t.done ? 'var(--bg3)' : 'var(--bg2)',
              border: `1px solid ${t.done ? 'var(--border)' : cfg.color}28`,
              opacity: t.done ? 0.65 : 1,
              transition: 'opacity 0.2s',
            }}>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t.id)}
                style={{ cursor: 'pointer', flexShrink: 0, accentColor: cfg.color }}
              />

              {isEditing ? (
                <>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value as Category)}
                    style={{
                      border: '1px solid var(--border)', borderRadius: 5,
                      background: 'var(--bg3)', color: CATEGORY_CONFIG[editCategory].color,
                      fontSize: 10, padding: '2px 2px', cursor: 'pointer', fontWeight: 600, flexShrink: 0,
                    }}
                  >
                    {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([cat, c]) => (
                      <option key={cat} value={cat}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    ref={editRef}
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    style={{
                      flex: 1, border: `1.5px solid ${cfg.color}`,
                      borderRadius: 5, background: 'var(--bg3)', color: 'var(--text)',
                      fontSize: 13, padding: '2px 6px', outline: 'none',
                    }}
                  />
                  <button onClick={saveEdit} style={{
                    border: 'none', background: 'var(--accent)', color: '#fff',
                    borderRadius: 5, fontSize: 11, padding: '2px 7px', cursor: 'pointer', flexShrink: 0,
                  }}>저장</button>
                  <button onClick={cancelEdit} style={{
                    border: 'none', background: 'transparent', color: 'var(--muted)',
                    fontSize: 13, padding: 0, cursor: 'pointer', lineHeight: 1, flexShrink: 0,
                  }}>✕</button>
                </>
              ) : (
                <>
                  {/* 카테고리 배지 */}
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                    background: `${cfg.color}18`, color: cfg.color, flexShrink: 0,
                  }}>{cfg.label}</span>

                  <span
                    onDoubleClick={() => startEdit(t)}
                    title="더블클릭으로 수정"
                    style={{
                      flex: 1, fontSize: 13,
                      color: t.done ? 'var(--muted)' : 'var(--text)',
                      textDecoration: t.done ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      cursor: 'text',
                    }}
                  >{t.text}</span>

                  <button onClick={() => remove(t.id)} style={{
                    border: 'none', background: 'transparent', color: 'var(--muted)',
                    cursor: 'pointer', fontSize: 15, padding: 0, lineHeight: 1, flexShrink: 0,
                  }}>×</button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
