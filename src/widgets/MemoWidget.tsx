import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import QuickMemoContent from '../components/QuickMemoContent'
import QuickMemoModal from '../components/QuickMemoModal'
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
const memoCreateListeners = new Set<(trigger: HTMLElement | null) => void>()

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

const requestOpenMemoCreate = (trigger: HTMLElement | null) => {
  memoCreateListeners.forEach(listener => listener(trigger))
}

const subscribeMemoCreate = (listener: (trigger: HTMLElement | null) => void) => {
  memoCreateListeners.add(listener)
  return () => {
    memoCreateListeners.delete(listener)
  }
}

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

const headerActionStyle = {
  width: 26,
  height: 26,
  display: 'grid',
  placeItems: 'center',
  padding: 0,
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--muted)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  lineHeight: 1,
} as const

export function MemoActions() {
  const { setPage } = useRouter()
  const manageMode = useMemoManageMode()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <button
        type="button"
        onClick={event => requestOpenMemoCreate(event.currentTarget)}
        aria-label="새 빠른 메모"
        title="새 빠른 메모"
        style={{
          ...headerActionStyle,
          color: 'var(--accent)',
          fontSize: 17,
          fontWeight: 800,
        }}
      >
        +
      </button>
      <button
        type="button"
        onClick={() => setMemoManageMode(!manageMode)}
        aria-label="빠른 메모 편집"
        aria-pressed={manageMode}
        title={manageMode ? '편집 완료' : '빠른 메모 편집'}
        style={{
          ...headerActionStyle,
          background: manageMode ? 'var(--accent-soft)' : 'transparent',
          color: manageMode ? 'var(--accent)' : 'var(--muted)',
          fontSize: 15,
        }}
      >
        {manageMode ? '✓' : '✎'}
      </button>
      <button
        type="button"
        onClick={() => setPage('notes')}
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 6,
          cursor: 'pointer',
          padding: '3px 8px',
          fontFamily: 'inherit',
        }}
      >
        보관함
      </button>
    </div>
  )
}

type EditorState =
  | { mode: 'create'; memoId: null }
  | { mode: 'edit'; memoId: string }
  | null

export default function MemoWidget() {
  const { quickMemos, setQuickMemos } = useApp()
  const manageMode = useMemoManageMode()
  const [editor, setEditor] = useState<EditorState>(null)
  const [draft, setDraft] = useState('')
  const [isScrolling, setIsScrolling] = useState(false)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const scrollTimerRef = useRef<number | null>(null)

  const activeMemos = quickMemos
    .filter(memo => !memo.archivedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const openCreate = (trigger: HTMLElement | null) => {
    returnFocusRef.current = trigger
    setDraft('')
    setEditor({ mode: 'create', memoId: null })
  }

  const openEdit = (memo: QuickMemoEntry, trigger: HTMLElement | null) => {
    returnFocusRef.current = trigger
    setDraft(memo.content)
    setEditor({ mode: 'edit', memoId: memo.id })
  }

  const closeEditor = () => {
    setEditor(null)
    setDraft('')
  }

  useEffect(() => subscribeMemoCreate(openCreate), [])

  useEffect(() => () => {
    if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current)
  }, [])

  const saveMemo = () => {
    const content = draft.trim()
    if (!content || !editor) return

    const now = new Date().toISOString()
    if (editor.mode === 'create') {
      const memo: QuickMemoEntry = {
        id: `memo-${Date.now()}`,
        content,
        createdAt: now,
        updatedAt: now,
      }
      setQuickMemos(previous => [memo, ...previous])
    } else {
      setQuickMemos(previous => previous.map(memo => memo.id === editor.memoId
        ? { ...memo, content, updatedAt: now }
        : memo))
    }
    closeEditor()
  }

  const deleteMemo = (id: string, closeAfterDelete = false) => {
    if (!window.confirm('이 빠른 메모를 완전히 삭제할까요?')) return
    setQuickMemos(previous => previous.filter(memo => memo.id !== id))
    if (closeAfterDelete) closeEditor()
  }

  const handleMemoScroll = () => {
    setIsScrolling(true)
    if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = window.setTimeout(() => {
      setIsScrolling(false)
      scrollTimerRef.current = null
    }, 700)
  }

  return (
    <div className="widget-responsive">
      <div className="widget-content-shell memo-widget-content" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '2px 14px 12px',
        boxSizing: 'border-box',
      }}>
        <div
          className={`memo-scroll-region${isScrolling ? ' is-scrolling' : ''}`}
          onScroll={handleMemoScroll}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
        {activeMemos.length === 0 && (
          <div style={{
            flex: 1,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)',
            fontSize: 12,
            textAlign: 'center',
          }}>
            아직 정리할 메모가 없습니다.
          </div>
        )}

        {activeMemos.map(memo => (
          <div key={memo.id} className="memo-widget-row">
            <div
              className="memo-widget-open"
              onClick={event => openEdit(memo, event.currentTarget)}
              onKeyDown={event => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                openEdit(memo, event.currentTarget)
              }}
              role="button"
              tabIndex={0}
              aria-label={`빠른 메모 열기: ${memo.content}`}
            >
              <span className="memo-widget-dot" />
              <div className="memo-widget-row-main">
                <QuickMemoContent content={memo.content} compact />
                <time>
                  {new Intl.DateTimeFormat('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(memo.createdAt))}
                </time>
              </div>
            </div>
            {manageMode && (
              <span className="memo-widget-row-actions">
                <button
                  type="button"
                  aria-label="빠른 메모 수정"
                  title="수정"
                  onClick={event => {
                    event.stopPropagation()
                    openEdit(memo, event.currentTarget)
                  }}
                >
                  <MemoActionIcon type="edit" />
                </button>
                <button
                  type="button"
                  className="is-danger"
                  aria-label="빠른 메모 완전히 삭제"
                  title="완전히 삭제"
                  onClick={event => {
                    event.stopPropagation()
                    deleteMemo(memo.id)
                  }}
                >
                  <MemoActionIcon type="delete" />
                </button>
              </span>
            )}
          </div>
        ))}
        </div>
      </div>

      <style>{`
        .memo-scroll-region {
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          overscroll-behavior: contain;
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
      `}</style>

      {editor && (
        <QuickMemoModal
          mode={editor.mode}
          value={draft}
          returnFocusTo={returnFocusRef.current}
          onChange={setDraft}
          onClose={closeEditor}
          onSave={saveMemo}
          onDelete={editor.mode === 'edit'
            ? () => deleteMemo(editor.memoId, true)
            : undefined}
        />
      )}
    </div>
  )
}
