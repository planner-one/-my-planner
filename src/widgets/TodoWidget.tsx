import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Todo } from '../types'

export const meta = {
  id: 'todo',
  name: '오늘 할 일',
  icon: '✅',
  defaultW: 8,
  defaultH: 8,
  minW: 4,
  minH: 4,
  order: 3,
}

const PRIORITY_COLOR: Record<Todo['priority'], string> = {
  high: 'var(--red)',
  medium: 'var(--yellow)',
  low: 'var(--muted)',
}

export default function TodoWidget() {
  const { todos, setTodos } = useApp()
  const [input, setInput] = useState('')
  const [priority, setPriority] = useState<Todo['priority']>('medium')
  const [composing, setComposing] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const todayTodos = todos.filter(t => !t.date || t.date === today)

  const add = () => {
    const text = input.trim()
    if (!text) return
    const item: Todo = { id: Date.now().toString(), text, done: false, priority, date: today }
    setTodos(prev => [item, ...prev])
    setInput('')
  }

  const toggle = (id: string) =>
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const remove = (id: string) =>
    setTodos(prev => prev.filter(t => t.id !== id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '8px 12px', boxSizing: 'border-box', gap: 6 }}>
      {/* 입력 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as Todo['priority'])}
          style={{
            border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg3)',
            color: 'var(--text)', fontSize: 12, padding: '4px 4px', cursor: 'pointer',
          }}
        >
          <option value="high">🔴</option>
          <option value="medium">🟡</option>
          <option value="low">⚪</option>
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
          color: '#fff', fontSize: 13, padding: '4px 10px', cursor: 'pointer',
        }}>+</button>
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {todayTodos.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
            오늘 할 일이 없어요
          </p>
        )}
        {todayTodos.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 6px', borderRadius: 6,
            background: 'var(--bg3)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[t.priority], flexShrink: 0 }} />
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggle(t.id)}
              style={{ cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{
              flex: 1, fontSize: 13, color: t.done ? 'var(--muted)' : 'var(--text)',
              textDecoration: t.done ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{t.text}</span>
            <button onClick={() => remove(t.id)} style={{
              border: 'none', background: 'transparent', color: 'var(--muted)',
              cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0,
            }}>×</button>
          </div>
        ))}
      </div>

      {/* 하단 요약 */}
      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
        {todayTodos.filter(t => t.done).length} / {todayTodos.length} 완료
      </div>
    </div>
  )
}
