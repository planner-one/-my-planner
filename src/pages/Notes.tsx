import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Note, QuickMemoEntry, Todo } from '../types'
import { toLocalDateKey } from '../utils/date'

type View = 'notes' | 'inbox' | 'archive'

interface NoteFormState {
  title: string
  date: string
  content: string
  keywords: string
  referenceUrl: string
}

const dateKey = (iso: string) => toLocalDateKey(new Date(iso))

const emptyNoteForm = (): NoteFormState => ({
  title: '',
  date: toLocalDateKey(),
  content: '',
  keywords: '',
  referenceUrl: '',
})

const dateLabel = (key: string) => {
  const today = toLocalDateKey()
  const yesterday = toLocalDateKey(new Date(Date.now() - 86400000))
  if (key === today) return '오늘'
  if (key === yesterday) return '어제'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  }).format(new Date(`${key}T12:00:00`))
}

const displayDate = (key: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${key}T12:00:00`))

const getNoteDate = (note: Note) => {
  if (note.date) return note.date
  if (note.createdAt) return dateKey(note.createdAt)
  if (note.updatedAt) return dateKey(note.updatedAt)
  return toLocalDateKey()
}

const parseKeywords = (value: string) =>
  value
    .split(/[,#\n]/)
    .map(keyword => keyword.trim())
    .filter(Boolean)
    .slice(0, 12)

const normalizeOptionalUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export default function Notes() {
  const { quickMemos, setQuickMemos, notes, setNotes, setTodos } = useApp()
  const [view, setView] = useState<View>('notes')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [noteComposerOpen, setNoteComposerOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteForm, setNoteForm] = useState<NoteFormState>(() => emptyNoteForm())

  const activeMemos = quickMemos
    .filter(memo => !memo.archivedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const archivedMemos = quickMemos
    .filter(memo => memo.archivedAt)
    .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''))

  const sortedNotes = useMemo(() => [...notes].sort((a, b) => {
    const dateCompare = getNoteDate(b).localeCompare(getNoteDate(a))
    if (dateCompare !== 0) return dateCompare
    return (b.updatedAt ?? b.createdAt ?? '').localeCompare(a.updatedAt ?? a.createdAt ?? '')
  }), [notes])

  const groupedMemos = useMemo(() => {
    const source = view === 'archive' ? archivedMemos : activeMemos
    return Object.entries(
      source.reduce<Record<string, QuickMemoEntry[]>>((groups, memo) => {
        const key = dateKey(memo.createdAt)
        groups[key] = [...(groups[key] ?? []), memo]
        return groups
      }, {}),
    ).sort(([a], [b]) => b.localeCompare(a))
  }, [activeMemos, archivedMemos, view])

  const updateMemo = (id: string, updater: (memo: QuickMemoEntry) => QuickMemoEntry) => {
    setQuickMemos(previous => previous.map(memo => memo.id === id ? updater(memo) : memo))
  }

  const openNewNote = () => {
    setView('notes')
    setEditingNoteId(null)
    setNoteForm(emptyNoteForm())
    setNoteComposerOpen(true)
  }

  const startEditNote = (note: Note) => {
    setView('notes')
    setEditingNoteId(note.id)
    setNoteForm({
      title: note.title ?? '',
      date: getNoteDate(note),
      content: note.content ?? '',
      keywords: (note.keywords ?? []).join(', '),
      referenceUrl: note.referenceUrl ?? note.sourceUrl ?? '',
    })
    setNoteComposerOpen(true)
  }

  const closeNoteComposer = () => {
    setEditingNoteId(null)
    setNoteForm(emptyNoteForm())
    setNoteComposerOpen(false)
  }

  const updateNoteForm = (patch: Partial<NoteFormState>) => {
    setNoteForm(previous => ({ ...previous, ...patch }))
  }

  const saveNote = () => {
    const title = noteForm.title.trim()
    const content = noteForm.content.trim()
    if (!title && !content) return

    const now = new Date().toISOString()
    const keywords = parseKeywords(noteForm.keywords)
    const referenceUrl = normalizeOptionalUrl(noteForm.referenceUrl)

    if (editingNoteId) {
      setNotes(previous => previous.map(note => note.id === editingNoteId
        ? {
            ...note,
            title: title || content.slice(0, 36) || '제목 없음',
            date: note.date || noteForm.date || toLocalDateKey(),
            content,
            keywords,
            referenceUrl,
            updatedAt: now,
          }
        : note))
    } else {
      const note: Note = {
        id: `note-${Date.now()}`,
        title: title || content.slice(0, 36) || '제목 없음',
        date: noteForm.date || toLocalDateKey(),
        content,
        keywords,
        referenceUrl,
        fav: false,
        createdAt: now,
        updatedAt: now,
      }
      setNotes(previous => [note, ...previous])
    }

    closeNoteComposer()
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
      date: toLocalDateKey(),
      content: memo.content,
      keywords: [],
      fav: false,
      createdAt: now,
      updatedAt: now,
      sourceMemoId: memo.id,
    }
    setNotes(previous => [note, ...previous])
    archiveMemo(memo, { type: 'note', id: note.id })
    setView('notes')
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

  const removeNote = (id: string) => {
    if (!window.confirm('이 노트를 삭제할까요?')) return
    setNotes(previous => previous.filter(note => note.id !== id))
    if (editingNoteId === id) closeNoteComposer()
  }

  return (
    <div className="notes-page">
      <header className="notes-header">
        <div>
          <h1>노트</h1>
          <p>빠른 메모와 분리해서 제목, 날짜, 내용, 키워드, 참고 링크를 갖춘 정식 노트를 작성합니다.</p>
        </div>
        <button type="button" className="notes-primary-button" onClick={openNewNote}>
          새 노트 작성
        </button>
      </header>

      <nav className="notes-tabs" aria-label="노트 보기">
        {([
          ['notes', `내 노트 ${notes.length}`],
          ['inbox', `빠른 메모 ${activeMemos.length}`],
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
        <section className="note-composer" aria-label={editingNoteId ? '노트 수정' : '새 노트 작성'}>
          <div className="note-composer-head">
            <strong>{editingNoteId ? '노트 수정' : '새 노트'}</strong>
            <span>작성 날짜는 자동으로 반영됩니다.</span>
          </div>
          <div className="note-form-grid">
            <label>제목
              <input
                value={noteForm.title}
                onChange={event => updateNoteForm({ title: event.target.value })}
                placeholder="노트 제목"
                maxLength={100}
                autoFocus
              />
            </label>
            <label>날짜
              <input value={noteForm.date} readOnly aria-readonly="true" />
            </label>
            <label className="span-2">내용
              <textarea
                value={noteForm.content}
                onChange={event => updateNoteForm({ content: event.target.value })}
                placeholder="내용을 작성하세요"
                rows={7}
              />
            </label>
            <label>핵심 키워드 선택
              <input
                value={noteForm.keywords}
                onChange={event => updateNoteForm({ keywords: event.target.value })}
                placeholder="예: 포트폴리오, 지원사업, 회고"
              />
            </label>
            <label>참고 링크 선택
              <input
                value={noteForm.referenceUrl}
                onChange={event => updateNoteForm({ referenceUrl: event.target.value })}
                placeholder="https://..."
              />
            </label>
          </div>
          <div className="note-composer-actions">
            <button type="button" onClick={closeNoteComposer}>취소</button>
            <button type="button" className="notes-primary-button" onClick={saveNote}>
              {editingNoteId ? '수정 저장' : '노트 저장'}
            </button>
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
        <div className="note-list">
          {sortedNotes.length === 0 && <div className="notes-empty">아직 작성한 노트가 없습니다.</div>}
          {sortedNotes.map(note => {
            const noteDate = getNoteDate(note)
            const noteLink = note.referenceUrl ?? note.sourceUrl
            return (
              <article className="note-card" key={note.id}>
                <div className="note-card-heading">
                  <div>
                    <time>{displayDate(noteDate)}</time>
                    <h2>{note.title || '제목 없음'}</h2>
                  </div>
                  <div className="note-card-actions">
                    <button type="button" onClick={() => startEditNote(note)}>수정</button>
                    <button type="button" className="is-danger" onClick={() => removeNote(note.id)}>삭제</button>
                  </div>
                </div>
                <p>{note.content || '내용 없음'}</p>
                {(note.keywords ?? []).length > 0 && (
                  <div className="note-keywords" aria-label="핵심 키워드">
                    {(note.keywords ?? []).map(keyword => <span key={keyword}>{keyword}</span>)}
                  </div>
                )}
                {noteLink && <a href={noteLink} target="_blank" rel="noreferrer">참고 링크 열기</a>}
                {note.updatedAt && <small>최근 수정 {new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(note.updatedAt))}</small>}
              </article>
            )
          })}
        </div>
      )}

      <style>{`
        .notes-page { max-width: 1040px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 18px; }
        .notes-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
        .notes-header h1 { margin: 0 0 5px; font-size: 24px; letter-spacing: 0; }
        .notes-header p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.55; }
        .notes-primary-button { border: 0 !important; background: var(--accent) !important; color: #fff !important; font-weight: 700; }
        .notes-header > button { min-height: 38px; padding: 0 14px; border-radius: 7px; cursor: pointer; white-space: nowrap; }
        .notes-tabs { display: flex; gap: 4px; padding: 4px; border-radius: 8px; background: var(--bg3); width: fit-content; max-width: 100%; overflow-x: auto; }
        .notes-tabs button { padding: 7px 12px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); cursor: pointer; font-size: 12px; white-space: nowrap; }
        .notes-tabs button.is-active { background: var(--bg2); color: var(--text); font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
        .note-composer { display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); }
        .note-composer-head { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
        .note-composer-head strong { font-size: 15px; }
        .note-composer-head span { color: var(--muted); font-size: 11px; }
        .note-form-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(160px, 0.6fr); gap: 10px; }
        .note-form-grid label { display: flex; flex-direction: column; gap: 5px; color: var(--muted); font-size: 11px; font-weight: 800; }
        .note-form-grid .span-2 { grid-column: 1 / -1; }
        .note-form-grid input,
        .note-form-grid textarea,
        .memo-edit-input {
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--bg3);
          color: var(--text);
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
        }
        .note-form-grid input { height: 40px; padding: 0 11px; font-size: 14px; }
        .note-form-grid input[readonly] { color: var(--muted); }
        .note-form-grid textarea { resize: vertical; padding: 10px 11px; font-size: 13px; line-height: 1.55; }
        .note-composer-actions { display: flex; justify-content: flex-end; gap: 7px; }
        .note-composer button, .memo-actions button, .note-card-actions button { padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg3); color: var(--text); cursor: pointer; font-size: 11px; }
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
        .memo-edit-input { height: 36px; padding: 0 9px; margin-bottom: 5px; }
        .memo-actions { display: flex; gap: 4px; flex-shrink: 0; flex-wrap: wrap; }
        .memo-actions button.is-danger,
        .note-card-actions button.is-danger { color: var(--red); }
        .note-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .note-card { min-height: 170px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); display: flex; flex-direction: column; gap: 10px; }
        .note-card-heading { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
        .note-card-heading time { color: var(--muted); font-size: 10px; display: block; margin-bottom: 6px; }
        .note-card h2 { margin: 0; font-size: 16px; line-height: 1.35; overflow-wrap: anywhere; }
        .note-card-actions { display: flex; gap: 5px; flex-shrink: 0; }
        .note-card p { margin: 0; color: var(--muted); line-height: 1.6; font-size: 13px; white-space: pre-wrap; overflow-wrap: anywhere; flex: 1; }
        .note-keywords { display: flex; flex-wrap: wrap; gap: 5px; }
        .note-keywords span { border-radius: 999px; background: color-mix(in srgb, var(--accent) 13%, transparent); color: var(--accent); padding: 4px 8px; font-size: 11px; font-weight: 800; }
        .note-card a { color: var(--accent); font-size: 12px; font-weight: 800; text-decoration: none; width: fit-content; }
        .note-card small { color: var(--muted); font-size: 10px; }
        .notes-empty { grid-column: 1 / -1; padding: 44px 16px; border: 1px solid var(--border); border-radius: 8px; color: var(--muted); text-align: center; font-size: 13px; }
        @media (max-width: 700px) {
          .notes-header { align-items: flex-start; flex-direction: column; }
          .notes-header > button { width: 100%; }
          .note-form-grid { grid-template-columns: 1fr; }
          .note-form-grid .span-2 { grid-column: auto; }
          .note-composer-head { flex-direction: column; gap: 3px; }
          .note-composer-actions { flex-direction: column-reverse; }
          .note-composer-actions button { width: 100%; }
          .memo-group { grid-template-columns: 1fr; gap: 4px; }
          .memo-date { flex-direction: row; align-items: baseline; padding-top: 0; }
          .memo-item { align-items: flex-start; flex-direction: column; }
          .memo-actions { width: 100%; }
          .note-list { grid-template-columns: 1fr; }
          .note-card-heading { flex-direction: column; }
          .note-card-actions { width: 100%; }
          .note-card-actions button { flex: 1; }
        }
      `}</style>
    </div>
  )
}
