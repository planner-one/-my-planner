import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
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

let memoManageMode = false
const memoManageListeners = new Set<() => void>()

const setMemoManageMode = (next: boolean) => {
  if (memoManageMode === next) return
  memoManageMode = next
  memoManageListeners.forEach(listener => listener())
}

const subscribeMemoManageMode = (listener: () => void) => {
  memoManageListeners.add(listener)
  return () => memoManageListeners.delete(listener)
}

const getMemoManageMode = () => memoManageMode

const useMemoManageMode = () => useSyncExternalStore(
  subscribeMemoManageMode,
  getMemoManageMode,
  getMemoManageMode,
)

const MEMO_ACTION_PATHS = {
  edit: [
    'M12 20h9',
    'M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z',
  ],
  delete: [
    'M3 6h18',
    'M8 6V4h8v2',
    'M19 6l-1 14H6L5 6',
    'M10 10v7M14 10v7',
  ],
} as const

function MemoActionIcon({ type }: { type: keyof typeof MEMO_ACTION_PATHS }) {
  return (
    <svg
      data-memo-icon={type}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {MEMO_ACTION_PATHS[type].map((path, index) => <path key={index} d={path} />)}
    </svg>
  )
}

export function MemoActions() {
  const { setPage } = useRouter()
  const manageMode = useMemoManageMode()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <button
        type="button"
        onClick={() => setMemoManageMode(!manageMode)}
        aria-label="빠른 메모 편집"
        aria-pressed={manageMode}
        title={manageMode ? '편집 완료' : '빠른 메모 편집'}
        style={{
          width: 26, height: 26, display: 'grid', placeItems: 'center',
          padding: 0, border: '1px solid var(--border)', borderRadius: 6,
          background: manageMode ? 'var(--accent-soft)' : 'transparent',
          color: manageMode ? 'var(--accent)' : 'var(--muted)',
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, lineHeight: 1,
        }}
      >
        {manageMode ? '✓' : '✎'}
      </button>
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
    </div>
  )
}

export default function MemoWidget() {
  const { quickMemos, setQuickMemos } = useApp()
  const manageMode = useMemoManageMode()
  const [input, setInput] = useState('')
  const [composing, setComposing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [editingComposing, setEditingComposing] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const skipMemoBlurRef = useRef(false)
  const scrollTimerRef = useRef<number | null>(null)

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

  const clearMemoEdit = () => {
    setEditingId(null)
    setEditingContent('')
    setEditingComposing(false)
  }

  const cancelMemoEdit = () => {
    skipMemoBlurRef.current = true
    clearMemoEdit()
    window.setTimeout(() => {
      skipMemoBlurRef.current = false
    }, 0)
  }

  const startMemoEdit = (memo: QuickMemoEntry) => {
    setEditingId(memo.id)
    setEditingContent(memo.content)
  }

  const saveMemoEdit = (id: string) => {
    const content = editingContent.trim()
    if (content) {
      const now = new Date().toISOString()
      setQuickMemos(previous => previous.map(memo => memo.id === id
        ? { ...memo, content, updatedAt: now }
        : memo))
    }
    clearMemoEdit()
  }

  const handleMemoEditBlur = (id: string) => {
    if (skipMemoBlurRef.current) {
      skipMemoBlurRef.current = false
      return
    }
    saveMemoEdit(id)
  }

  const deleteMemo = (id: string) => {
    if (!window.confirm('이 빠른 메모를 완전히 삭제할까요?')) return
    setQuickMemos(previous => previous.filter(memo => memo.id !== id))
    if (editingId === id) clearMemoEdit()
  }

  const handleMemoScroll = () => {
    setIsScrolling(true)
    if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = window.setTimeout(() => {
      setIsScrolling(false)
      scrollTimerRef.current = null
    }, 700)
  }

  useEffect(() => {
    if (!manageMode) clearMemoEdit()
  }, [manageMode])

  useEffect(() => () => {
    if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current)
  }, [])

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

      <div
        className={`memo-scroll-region${isScrolling ? ' is-scrolling' : ''}`}
        onScroll={handleMemoScroll}
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 5,
        }}
      >
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
            className="memo-widget-row"
            style={{
              display: 'grid', gridTemplateColumns: '6px minmax(0, 1fr) auto',
              alignItems: 'start', gap: 8,
              padding: '6px 8px', borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', marginTop: 5, flexShrink: 0 }} />
            <div style={{ minWidth: 0, display: 'grid', gap: 3 }}>
              {editingId === memo.id ? (
                <textarea
                  autoFocus
                  className="memo-widget-edit-input"
                  value={editingContent}
                  maxLength={240}
                  rows={2}
                  onChange={event => setEditingContent(event.target.value)}
                  onCompositionStart={() => setEditingComposing(true)}
                  onCompositionEnd={() => setEditingComposing(false)}
                  onBlur={() => handleMemoEditBlur(memo.id)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey && !editingComposing) {
                      event.preventDefault()
                      saveMemoEdit(memo.id)
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      cancelMemoEdit()
                    }
                  }}
                />
              ) : (
                <span style={{
                  minWidth: 0, overflowWrap: 'break-word', whiteSpace: 'pre-wrap',
                  color: 'var(--text)', fontSize: 12, lineHeight: 1.5,
                }}>
                  {memo.content}
                </span>
              )}
              <time style={{ color: 'var(--muted)', fontSize: 9, whiteSpace: 'nowrap' }}>
                {new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date(memo.createdAt))}
              </time>
            </div>
            {manageMode && editingId !== memo.id && (
              <div className="memo-widget-row-actions">
                <button
                  type="button"
                  aria-label="빠른 메모 수정"
                  title="수정"
                  onClick={() => startMemoEdit(memo)}
                >
                  <MemoActionIcon type="edit" />
                </button>
                <button
                  type="button"
                  className="is-danger"
                  aria-label="빠른 메모 완전히 삭제"
                  title="완전히 삭제"
                  onClick={() => deleteMemo(memo.id)}
                >
                  <MemoActionIcon type="delete" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .memo-scroll-region {
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .memo-scroll-region::-webkit-scrollbar { width: 8px; }
        .memo-scroll-region::-webkit-scrollbar-track { background: transparent; }
        .memo-scroll-region::-webkit-scrollbar-thumb {
          border: 2px solid transparent;
          border-radius: 999px;
          background: transparent;
          background-clip: content-box;
          transition: background-color 160ms ease;
        }
        .memo-scroll-region.is-scrolling {
          scrollbar-color: color-mix(in srgb, var(--muted) 55%, transparent) transparent;
        }
        .memo-scroll-region.is-scrolling::-webkit-scrollbar-thumb {
          background-color: color-mix(in srgb, var(--muted) 55%, transparent);
        }
        .memo-widget-row-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
        }
        .memo-widget-row-actions button {
          width: 30px;
          min-width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          padding: 0;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: transparent;
          color: var(--muted);
          font-family: inherit;
          cursor: pointer;
        }
        .memo-widget-row-actions button:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
        .memo-widget-row-actions button.is-danger:hover {
          border-color: var(--red);
          color: var(--red);
        }
        .memo-widget-edit-input {
          width: 100%;
          min-height: 48px;
          box-sizing: border-box;
          padding: 7px 8px;
          border: 1px solid var(--accent);
          border-radius: 6px;
          background: var(--bg3);
          color: var(--text);
          font-family: inherit;
          font-size: 12px;
          line-height: 1.45;
          outline: none;
          resize: none;
        }
      `}</style>

      {activeMemos.length > recentMemos.length && (
        <div style={{ color: 'var(--muted)', fontSize: 10, textAlign: 'right', flexShrink: 0 }}>
          보관함에 {activeMemos.length - recentMemos.length}개 더 있음
        </div>
      )}
    </div>
  )
}
