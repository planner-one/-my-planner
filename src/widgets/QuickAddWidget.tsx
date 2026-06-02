import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Todo } from '../types'

export const meta = {
  id: 'quickadd',
  name: '빠른 추가',
  icon: '⚡',
  defaultW: 7,
  defaultH: 4,
  minW: 4,
  minH: 3,
  order: 12,
}

export default function QuickAddWidget() {
  const { setTodos } = useApp()
  const [input, setInput] = useState('')
  const [composing, setComposing] = useState(false)
  const [added, setAdded] = useState(false)

  const add = () => {
    const text = input.trim()
    if (!text) return
    const item: Todo = {
      id: Date.now().toString(),
      text,
      done: false,
      priority: 'medium',
      date: new Date().toISOString().slice(0, 10),
    }
    setTodos(prev => [item, ...prev])
    setInput('')
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '12px 16px', boxSizing: 'border-box', gap: 10 }}>
      <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>할 일 빠른 추가</div>
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={e => { if (e.key === 'Enter' && !composing) add() }}
          placeholder="할 일을 입력하고 Enter"
          style={{
            flex: 1, border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--bg3)', color: 'var(--text)', fontSize: 14,
            padding: '8px 12px', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button onClick={add} style={{
          border: 'none', borderRadius: 8, background: 'var(--accent)',
          color: '#fff', fontSize: 20, width: 40, cursor: 'pointer',
          flexShrink: 0,
        }}>+</button>
      </div>
      {added && (
        <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>✓ 추가됐어요!</div>
      )}
    </div>
  )
}
