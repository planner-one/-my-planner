import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import type { QuickMemoEntry } from '../types'

export const meta = {
  id: 'memo',
  name: '빠른 메모',
  icon: '📝',
  defaultW: 8,
  defaultH: 6,
  minW: 4,
  minH: 3,
  order: 2,
}

export function MemoActions() {
  const { setPage } = useRouter()
  return (
    <button
      type="button"
      onClick={() => setPage('notes')}
      style={{
        fontSize: 11, color: 'var(--muted)', background: 'transparent',
        border: '1px solid var(--border)', borderRadius: 6,
        cursor: 'pointer', padding: '3px 8px', fontFamily: 'inherit',
      }}
    >
      보관함
    </button>
  )
}

export default function MemoWidget() {
  const { quickMemos, setQuickMemos } = useApp()
  const [input, setInput] = useState('')
  const [composing, setComposing] = useState(false)

  const activeMemos = quickMemos
    .filter(memo => !memo.archivedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const recentMemos = activeMemos.slice(0, 4)

  const addMemo = () => {
    const content = input.trim()
    if (!content) return
    const now = new Date().toISOString()
    const memo: QuickMemoEntry = {
      id: `memo-${Date.now()}`,
      content,
      createdAt: now,
      updatedAt: now,
    }
    setQuickMemos(previous => [memo, ...previous])
    setInput('')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: '4px 14px 12px', boxSizing: 'border-box', gap: 10,
    }}>
      <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
        <input
          value={input}
          onChange={event => setInput(event.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !composing) addMemo()
          }}
          placeholder="떠오른 내용을 바로 기록하세요"
          maxLength={240}
          style={{
            minWidth: 0, flex: 1, height: 36, padding: '0 11px',
            border: '1px solid var(--border)', borderRadius: 7,
            background: 'var(--bg3)', color: 'var(--text)',
            fontSize: 13, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={addMemo}
          aria-label="빠른 메모 추가"
          title="빠른 메모 추가"
          style={{
            width: 36, height: 36, padding: 0, border: 0,
            borderRadius: 7, background: 'var(--accent)',
            color: '#fff', cursor: 'pointer', fontSize: 20,
          }}
        >
          +
        </button>
      </div>

      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {recentMemos.length === 0 && (
          <div style={{
            flex: 1, display: 'grid', placeItems: 'center',
            color: 'var(--muted)', fontSize: 12, textAlign: 'center',
          }}>
            아직 정리할 메모가 없습니다.
          </div>
        )}
        {recentMemos.map(memo => (
          <div
            key={memo.id}
            style={{
              display: 'grid', gridTemplateColumns: '6px minmax(0, 1fr) auto',
              alignItems: 'center', gap: 8, minHeight: 34,
              padding: '5px 8px', borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{
              minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', color: 'var(--text)', fontSize: 12,
            }}>
              {memo.content}
            </span>
            <time style={{ color: 'var(--muted)', fontSize: 9, whiteSpace: 'nowrap' }}>
              {new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date(memo.createdAt))}
            </time>
          </div>
        ))}
      </div>

      {activeMemos.length > recentMemos.length && (
        <div style={{ color: 'var(--muted)', fontSize: 10, textAlign: 'right', flexShrink: 0 }}>
          보관함에 {activeMemos.length - recentMemos.length}개 더 있음
        </div>
      )}
    </div>
  )
}
