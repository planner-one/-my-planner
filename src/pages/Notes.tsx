import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Note, QuickMemoEntry, Todo } from '../types'
import { toLocalDateKey } from '../utils/date'

type View = 'inbox' | 'notes' | 'archive'

const dateKey = (iso: string) => toLocalDateKey(new Date(iso))

const dateLabel = (key: string) => {
  const today = toLocalDateKey()
  const yesterday = toLocalDateKey(new Date(Date.now() - 86400000))
  if (key === today) return '오늘'
  if (key === yesterday) return '어제'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  }).format(new Date(`${key}T12:00:00`))
}

export default function Notes() {
  const { quickMemos, setQuickMemos, notes, setNotes, setTodos } = useApp()
  const [view, setView] = useState<View>('inbox')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [noteComposerOpen, setNoteComposerOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  const activeMemos = quickMemos
    .filter(memo => !memo.archivedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const archivedMemos = quickMemos
    .filter(memo => memo.archivedAt)
    .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''))

  const groupedMemos = useMemo(() => {
    const source = view === 'archive' ? archivedMemos : activeMemos
    return Object.entries(
      source.reduce<Record<string, QuickMemoEntry[]>>((groups, memo) => {
        const key = dateKey(memo.createdAt)
        groups[key] = [...(groups[key] ?? []), memo]
        return groups
      }, {})
    ).sort(([a], [b]) => b.localeCompare(a))
  }, [activeMemos, archivedMemos, view])

  const updateMemo = (id: string, updater: (memo: QuickMemoEntry) => QuickMemoEntry) => {
    setQuickMemos(previous => previous.map(memo => memo.id === id ? updater(memo) : memo))
  }

  const saveMemoEdit = () => {
    const content = editingContent.trim()
    if (editingId && content) {
      updateMemo(editingId, memo => ({
        ...memo,
        content,
        updatedAt: new Date().toISOString(),
      }))
    }
    setEditingId(null)
    setEditingContent('')
  }

  const archiveMemo = (memo: QuickMemoEntry, converted?: { type: 'todo' | 'note'; id: string }) => {
    updateMemo(memo.id, current => ({
      ...current,
      archivedAt: new Date().toISOString(),
      convertedTo: converted?.type,
      convertedId: converted?.id,
    }))
  }

  const convertToTodo = (memo: QuickMemoEntry) => {
    const todo: Todo = {
      id: `memo-todo-${Date.now()}`,
      text: memo.content,
      done: false,
      priority: 'medium',
      category: 'personal',
      date: toLocalDateKey(),
    }
    setTodos(previous => [todo, ...previous])
    archiveMemo(memo, { type: 'todo', id: todo.id })
  }

  const convertToNote = (memo: QuickMemoEntry) => {
    const now = new Date().toISOString()
    const note: Note = {
      id: `memo-note-${Date.now()}`,
      title: memo.content.length > 36 ? `${memo.content.slice(0, 36)}...` : memo.content,
      content: memo.content,
      fav: false,
      createdAt: now,
      updatedAt: now,
      sourceMemoId: memo.id,
    }
    setNotes(previous => [note, ...previous])
    archiveMemo(memo, { type: 'note', id: note.id })
  }

  const restoreMemo = (id: string) => {
    updateMemo(id, memo => ({
      ...memo,
      archivedAt: undefined,
      convertedTo: undefined,
      convertedId: undefined,
    }))
  }

  const deleteMemo = (id: string) => {
    if (!window.confirm('이 빠른 메모를 완전히 삭제할까요?')) return
    setQuickMemos(previous => previous.filter(memo => memo.id !== id))
  }

  const createNote = () => {
    const title = noteTitle.trim()
    const content = noteContent.trim()
    if (!title && !content) return
    const now = new Date().toISOString()
    const note: Note = {
      id: `note-${Date.now()}`,
      title: title || content.slice(0, 36),
      content,
      fav: false,
      createdAt: now,
      updatedAt: now,
    }
    setNotes(previous => [note, ...previous])
    setNoteTitle('')
    setNoteContent('')
    setNoteComposerOpen(false)
  }

  const removeNote = (id: string) => {
    if (!window.confirm('이 노트를 삭제할까요?')) return
    setNotes(previous => previous.filter(note => note.id !== id))
  }

  return (
    <div className="notes-page">
      <header className="notes-header">
        <div>
          <h1>노트</h1>
          <p>빠르게 수집한 내용을 분류하고, 필요한 정보는 정식 노트로 보관하세요.</p>
        </div>
        <button type="button" className="notes-primary-button" onClick={() => setNoteComposerOpen(true)}>
          새 노트
        </button>
      </header>

      <nav className="notes-tabs" aria-label="노트 보기">
        {([
          ['inbox', `빠른 메모 ${activeMemos.length}`],
          ['notes', `정식 노트 ${notes.length}`],
          ['archive', `처리됨 ${archivedMemos.length}`],
        ] as [View, string][]).map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={view === id ? 'is-active' : ''}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {noteComposerOpen && (
        <section className="note-composer">
          <input
            value={noteTitle}
            onChange={event => setNoteTitle(event.target.value)}
            placeholder="노트 제목"
            maxLength={80}
            autoFocus
          />
          <textarea
            value={noteContent}
            onChange={event => setNoteContent(event.target.value)}
            placeholder="내용을 작성하세요"
            rows={5}
          />
          <div>
            <button type="button" onClick={() => setNoteComposerOpen(false)}>취소</button>
            <button type="button" className="notes-primary-button" onClick={createNote}>저장</button>
          </div>
        </section>
      )}

      {(view === 'inbox' || view === 'archive') && (
        <div className="memo-groups">
          {groupedMemos.length === 0 && (
            <div className="notes-empty">
              {view === 'inbox' ? '정리할 빠른 메모가 없습니다.' : '처리된 빠른 메모가 없습니다.'}
            </div>
          )}
          {groupedMemos.map(([date, memos]) => (
            <section className="memo-group" key={date}>
              <div className="memo-date">
                <strong>{dateLabel(date)}</strong>
                <span>{memos.length}개</span>
              </div>
              <div className="memo-list">
                {memos.map(memo => (
                  <article className="memo-item" key={memo.id}>
                    <div className="memo-item-main">
                      {editingId === memo.id ? (
                        <input
                          className="memo-edit-input"
                          value={editingContent}
                          autoFocus
                          maxLength={240}
                          onChange={event => setEditingContent(event.target.value)}
                          onBlur={saveMemoEdit}
                          onKeyDown={event => {
                            if (event.key === 'Enter' && !event.nativeEvent.isComposing) saveMemoEdit()
                            if (event.key === 'Escape') setEditingId(null)
                          }}
                        />
                      ) : (
                        <p>{memo.content}</p>
                      )}
                      <div className="memo-meta">
                        <time>{new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date(memo.createdAt))}</time>
                        {memo.convertedTo && <span>{memo.convertedTo === 'todo' ? 'Todo로 전환됨' : '노트로 전환됨'}</span>}
                        {!memo.convertedTo && memo.archivedAt && <span>보관됨</span>}
                      </div>
                    </div>
                    <div className="memo-actions">
                      {view === 'inbox' ? (
                        <>
                          <button type="button" onClick={() => { setEditingId(memo.id); setEditingContent(memo.content) }}>수정</button>
                          <button type="button" onClick={() => convertToTodo(memo)}>Todo</button>
                          <button type="button" onClick={() => convertToNote(memo)}>노트</button>
                          <button type="button" onClick={() => archiveMemo(memo)}>보관</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => restoreMemo(memo.id)}>복원</button>
                      )}
                      <button type="button" className="is-danger" onClick={() => deleteMemo(memo.id)}>삭제</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {view === 'notes' && (
        <div className="note-grid">
          {notes.length === 0 && <div className="notes-empty">아직 저장된 정식 노트가 없습니다.</div>}
          {[...notes]
            .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
            .map(note => (
              <article className="note-card" key={note.id}>
                <div className="note-card-heading">
                  <h2>{note.title || '제목 없음'}</h2>
                  <button type="button" aria-label="노트 삭제" title="노트 삭제" onClick={() => removeNote(note.id)}>×</button>
                </div>
                <p>{note.content || '내용 없음'}</p>
                {note.sourceUrl && <a href={note.sourceUrl} target="_blank" rel="noreferrer">원본 링크 열기</a>}
                <time>
                  {note.createdAt
                    ? new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(note.createdAt))
                    : '기존 노트'}
                </time>
              </article>
            ))}
        </div>
      )}

      <style>{`
        .notes-page { max-width: 980px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 18px; }
        .notes-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
        .notes-header h1 { margin: 0 0 5px; font-size: 24px; }
        .notes-header p { margin: 0; color: var(--muted); font-size: 13px; }
        .notes-primary-button { border: 0 !important; background: var(--accent) !important; color: #fff !important; font-weight: 700; }
        .notes-header > button { padding: 9px 14px; border-radius: 7px; cursor: pointer; white-space: nowrap; }
        .notes-tabs { display: flex; gap: 4px; padding: 4px; border-radius: 8px; background: var(--bg3); width: fit-content; }
        .notes-tabs button { padding: 7px 12px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); cursor: pointer; font-size: 12px; }
        .notes-tabs button.is-active { background: var(--bg2); color: var(--text); font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
        .note-composer { display: flex; flex-direction: column; gap: 9px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); }
        .note-composer input, .note-composer textarea, .memo-edit-input { border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); outline: none; font-family: inherit; }
        .note-composer input { height: 40px; padding: 0 11px; font-size: 14px; }
        .note-composer textarea { resize: vertical; padding: 10px 11px; font-size: 13px; }
        .note-composer > div { display: flex; justify-content: flex-end; gap: 7px; }
        .note-composer button, .memo-actions button { padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg3); color: var(--text); cursor: pointer; font-size: 11px; }
        .memo-groups { display: flex; flex-direction: column; gap: 20px; }
        .memo-group { display: grid; grid-template-columns: 100px minmax(0, 1fr); gap: 14px; }
        .memo-date { display: flex; flex-direction: column; gap: 3px; padding-top: 12px; }
        .memo-date strong { font-size: 13px; }
        .memo-date span { color: var(--muted); font-size: 10px; }
        .memo-list { border-top: 1px solid var(--border); }
        .memo-item { display: flex; align-items: center; justify-content: space-between; gap: 18px; min-height: 68px; padding: 10px 4px; border-bottom: 1px solid var(--border); }
        .memo-item-main { min-width: 0; flex: 1; }
        .memo-item-main p { margin: 0 0 6px; line-height: 1.5; font-size: 14px; overflow-wrap: anywhere; }
        .memo-meta { display: flex; gap: 8px; color: var(--muted); font-size: 10px; }
        .memo-edit-input { width: 100%; height: 36px; padding: 0 9px; margin-bottom: 5px; box-sizing: border-box; }
        .memo-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .memo-actions button.is-danger { color: var(--red); }
        .note-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .note-card { min-height: 150px; padding: 15px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); display: flex; flex-direction: column; }
        .note-card-heading { display: flex; justify-content: space-between; gap: 10px; }
        .note-card h2 { margin: 0 0 10px; font-size: 15px; }
        .note-card-heading button { width: 25px; height: 25px; border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 17px; }
        .note-card p { margin: 0; color: var(--muted); line-height: 1.55; font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; flex: 1; }
        .note-card a { margin-top: 10px; color: var(--accent); font-size: 11px; font-weight: 700; text-decoration: none; }
        .note-card time { margin-top: 12px; color: var(--muted); font-size: 10px; }
        .notes-empty { grid-column: 1 / -1; padding: 44px 16px; border: 1px solid var(--border); border-radius: 8px; color: var(--muted); text-align: center; font-size: 13px; }
        @media (max-width: 700px) {
          .notes-header { align-items: flex-start; }
          .memo-group { grid-template-columns: 1fr; gap: 4px; }
          .memo-date { flex-direction: row; align-items: baseline; padding-top: 0; }
          .memo-item { align-items: flex-start; flex-direction: column; }
          .memo-actions { width: 100%; flex-wrap: wrap; }
          .note-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
