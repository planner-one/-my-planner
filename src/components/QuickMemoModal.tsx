import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { getQuickMemoListEdit } from '../utils/quickMemo'

interface QuickMemoModalProps {
  mode: 'create' | 'edit'
  value: string
  returnFocusTo: HTMLElement | null
  onChange: (value: string) => void
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
}

export default function QuickMemoModal({
  mode,
  value,
  returnFocusTo,
  onChange,
  onClose,
  onSave,
  onDelete,
}: QuickMemoModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)

  closeRef.current = onClose

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.requestAnimationFrame(() => {
        const fallback = document.querySelector<HTMLElement>('[aria-label="새 빠른 메모"]')
        const focusTarget = returnFocusTo?.isConnected ? returnFocusTo : fallback
        focusTarget?.focus()
      })
    }
  }, [returnFocusTo])

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== 'Enter'
      || event.shiftKey
      || event.nativeEvent.isComposing
    ) return

    const textarea = event.currentTarget
    const edit = getQuickMemoListEdit(
      textarea.value,
      textarea.selectionStart,
      textarea.selectionEnd,
    )
    if (!edit) return
    if (edit.value.length > 240) return

    event.preventDefault()
    onChange(edit.value)
    window.requestAnimationFrame(() => {
      textarea.setSelectionRange(edit.cursor, edit.cursor)
    })
  }

  return createPortal(
    <div
      className="quick-add-backdrop memo-editor-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="quick-add-modal memo-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memo-editor-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="memo-editor-header">
          <div>
            <h2 id="memo-editor-title">
              {mode === 'create' ? '새 빠른 메모' : '빠른 메모'}
            </h2>
            <p>`1. ` 번호 목록과 `- ` 불릿 목록을 사용할 수 있습니다.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">×</button>
        </header>

        <textarea
          ref={textareaRef}
          autoFocus
          value={value}
          maxLength={240}
          rows={10}
          placeholder={'떠오른 내용을 기록하세요\n\n1. 첫 번째 항목\n2. 두 번째 항목\n\n- 불릿 항목'}
          onChange={event => onChange(event.target.value)}
          onKeyDown={handleEditorKeyDown}
        />

        <div className="memo-editor-meta">
          <span>Shift+Enter는 일반 줄바꿈입니다.</span>
          <span>{value.length}/240</span>
        </div>

        <footer className="memo-editor-actions">
          {mode === 'edit' && onDelete && (
            <button type="button" className="is-danger" onClick={onDelete}>
              삭제
            </button>
          )}
          <span />
          <button type="button" onClick={onClose}>취소</button>
          <button
            type="button"
            className="is-primary"
            disabled={!value.trim()}
            onClick={onSave}
          >
            저장
          </button>
        </footer>
      </section>

      <style>{`
        .memo-editor-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          padding: 20px;
          background: rgba(0, 0, 0, 0.38);
        }
        .memo-editor-modal {
          width: min(560px, 100%);
          max-height: calc(100dvh - 40px);
          overflow-y: auto;
          box-sizing: border-box;
          padding: 20px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg2);
          color: var(--text);
          box-shadow: 0 18px 56px rgba(0, 0, 0, 0.28);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .memo-editor-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .memo-editor-header h2 {
          margin: 0;
          font-size: 17px;
        }
        .memo-editor-header p {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 11px;
        }
        .memo-editor-header button {
          border: 0;
          background: transparent;
          color: var(--muted);
          font-size: 23px;
          line-height: 1;
          cursor: pointer;
        }
        .memo-editor-modal textarea {
          width: 100%;
          min-height: 220px;
          box-sizing: border-box;
          resize: vertical;
          padding: 12px 13px;
          border: 1px solid var(--border);
          border-radius: 8px;
          outline: none;
          background: var(--bg3);
          color: var(--text);
          font: inherit;
          font-size: 14px;
          line-height: 1.6;
        }
        .memo-editor-modal textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
        }
        .memo-editor-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: var(--muted);
          font-size: 10px;
        }
        .memo-editor-actions {
          display: grid;
          grid-template-columns: auto 1fr auto auto;
          gap: 7px;
        }
        .memo-editor-actions button {
          min-height: 38px;
          padding: 0 14px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: transparent;
          color: var(--text);
          font: inherit;
          font-size: 12px;
          cursor: pointer;
        }
        .memo-editor-actions button.is-primary {
          border-color: var(--accent);
          background: var(--accent);
          color: #fff;
          font-weight: 700;
        }
        .memo-editor-actions button.is-primary:disabled {
          cursor: default;
          opacity: 0.45;
        }
        .memo-editor-actions button.is-danger {
          color: var(--red);
        }
        @media (max-width: 767px) {
          .memo-editor-backdrop {
            align-items: flex-end;
            padding: 12px;
            padding-bottom: calc(12px + env(safe-area-inset-bottom));
          }
          .memo-editor-modal {
            max-height: calc(100dvh - 24px - env(safe-area-inset-bottom));
            padding: 16px;
          }
          .memo-editor-modal textarea {
            min-height: min(42dvh, 300px) !important;
          }
          .memo-editor-actions {
            grid-template-columns: 1fr 1fr;
          }
          .memo-editor-actions span {
            display: none;
          }
          .memo-editor-actions button.is-danger {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>,
    document.body,
  )
}
