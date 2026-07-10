import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Note, QuickMemoEntry, Todo } from '../types'
import { toLocalDateKey } from '../utils/date'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { useConfirm } from '../components/ui/ConfirmProvider'
import { Drawer } from '../components/ui/Drawer'
import { Tabs } from '../components/ui/Tabs'

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
  const confirm = useConfirm()
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

  const deleteMemo = async (id: string) => {
    const accepted = await confirm({
      title: '빠른 메모 영구 삭제',
      description: '이 빠른 메모를 완전히 삭제합니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '영구 삭제',
      danger: true,
    })
    if (!accepted) return
    setQuickMemos(previous => previous.filter(memo => memo.id !== id))
  }

  const removeNote = async (id: string) => {
    const accepted = await confirm({
      title: '노트 삭제',
      description: '선택한 노트를 삭제합니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      danger: true,
    })
    if (!accepted) return
    setNotes(previous => previous.filter(note => note.id !== id))
    if (editingNoteId === id) closeNoteComposer()
  }

  return (
    <div className="notes-page">
      <PageHeader
        title="노트"
        description="정리된 노트와 빠른 메모 수집함을 분리해 관리합니다."
        actions={<Button onClick={openNewNote}>새 노트 작성</Button>}
      />

      <Tabs
        value={view}
        onChange={setView}
        label="노트 보기"
        options={[
          { value: 'notes', label: '내 노트', count: notes.length },
          { value: 'inbox', label: '빠른 메모', count: activeMemos.length },
          { value: 'archive', label: '처리됨', count: archivedMemos.length },
        ]}
      />

      <Drawer
        open={noteComposerOpen}
        onClose={closeNoteComposer}
        title={editingNoteId ? '노트 수정' : '새 노트'}
        description="작성 날짜는 자동으로 반영됩니다."
        width="md"
        footer={(
          <>
            <Button variant="secondary" onClick={closeNoteComposer}>취소</Button>
            <Button onClick={saveNote}>{editingNoteId ? '수정 저장' : '노트 저장'}</Button>
          </>
        )}
      >
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
      </Drawer>

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


    </div>
  )
}
