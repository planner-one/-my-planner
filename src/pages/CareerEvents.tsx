import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { CareerEvent, CareerEventCategory, CareerEventStatus } from '../types'

const CATEGORY_LABELS: Record<CareerEventCategory, string> = {
  briefing: '채용설명회',
  interview: '면접',
  camp: '직무캠프',
  program: '교육/프로그램',
  seminar: '행사/세미나',
  contest: '공모전',
  support: '지원사업',
  other: '기타',
}

const STATUS_LABELS: Record<CareerEventStatus, string> = {
  interested: '관심',
  planned: '신청 예정',
  applied: '신청 완료',
  pending: '결과 대기',
  confirmed: '선정/확정',
  completed: '완료',
  rejected: '탈락',
  cancelled: '취소',
}

const emptyForm = (): Omit<CareerEvent, 'id'> => ({
  title: '',
  organization: '',
  category: 'briefing',
  status: 'interested',
  date: new Date().toISOString().slice(0, 10),
  time: '',
  endTime: '',
  mode: 'offline',
  location: '',
  address: '',
  url: '',
  note: '',
})

export default function CareerEvents() {
  const { careerEvents, setCareerEvents } = useApp()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | CareerEventStatus>('all')

  const updateForm = <K extends keyof Omit<CareerEvent, 'id'>>(key: K, value: Omit<CareerEvent, 'id'>[K]) =>
    setForm(previous => ({ ...previous, [key]: value }))

  const save = () => {
    const title = form.title.trim()
    if (!title) return
    const normalized: Omit<CareerEvent, 'id'> = {
      ...form,
      title,
      organization: form.organization?.trim() || undefined,
      time: form.time || undefined,
      endTime: form.endTime || undefined,
      location: form.location?.trim() || undefined,
      address: form.address?.trim() || undefined,
      url: form.url?.trim() || undefined,
      note: form.note?.trim() || undefined,
    }
    if (editingId) {
      setCareerEvents(previous => previous.map(item => item.id === editingId ? { ...normalized, id: editingId } : item))
    } else {
      setCareerEvents(previous => [...previous, { ...normalized, id: `career-${Date.now()}` }])
    }
    setEditingId(null)
    setForm(emptyForm())
  }

  const edit = (item: CareerEvent) => {
    setEditingId(item.id)
    setForm({
      title: item.title,
      organization: item.organization ?? '',
      category: item.category,
      status: item.status,
      date: item.date,
      time: item.time ?? '',
      endTime: item.endTime ?? '',
      mode: item.mode ?? 'offline',
      location: item.location ?? '',
      address: item.address ?? '',
      url: item.url ?? '',
      note: item.note ?? '',
    })
  }

  const remove = (id: string) => {
    setCareerEvents(previous => previous.filter(item => item.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setForm(emptyForm())
    }
  }

  const visible = [...careerEvents]
    .filter(item => filter === 'all' || item.status === filter)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))

  return (
    <div className="career-page">
      <header className="career-header">
        <div>
          <h2>신청·지원 일정</h2>
          <p>채용, 교육, 행사, 공모전과 각종 프로그램 신청 결과를 한곳에서 관리합니다.</p>
        </div>
      </header>

      <section className="career-editor">
        <div className="career-form-grid">
          <label className="span-2">일정명
            <input value={form.title} onChange={event => updateForm('title', event.target.value)} placeholder="예: NEST AI-Lab 직무캠프" />
          </label>
          <label>기관/회사
            <input value={form.organization ?? ''} onChange={event => updateForm('organization', event.target.value)} placeholder="기관 또는 회사명" />
          </label>
          <label>구분
            <select value={form.category} onChange={event => updateForm('category', event.target.value as CareerEventCategory)}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>상태
            <select value={form.status} onChange={event => updateForm('status', event.target.value as CareerEventStatus)}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>날짜
            <input type="date" value={form.date} onChange={event => updateForm('date', event.target.value)} />
          </label>
          <label>시작
            <input type="time" value={form.time ?? ''} onChange={event => updateForm('time', event.target.value)} />
          </label>
          <label>종료
            <input type="time" value={form.endTime ?? ''} onChange={event => updateForm('endTime', event.target.value)} />
          </label>
          <label>진행 방식
            <select value={form.mode ?? 'offline'} onChange={event => updateForm('mode', event.target.value as CareerEvent['mode'])}>
              <option value="offline">오프라인</option>
              <option value="online">온라인</option>
              <option value="hybrid">온·오프라인</option>
            </select>
          </label>
          <label>장소
            <input value={form.location ?? ''} onChange={event => updateForm('location', event.target.value)} placeholder="장소명" />
          </label>
          <label className="span-2">주소
            <input value={form.address ?? ''} onChange={event => updateForm('address', event.target.value)} placeholder="주소" />
          </label>
          <label className="span-2">온라인 링크
            <input value={form.url ?? ''} onChange={event => updateForm('url', event.target.value)} placeholder="https://" />
          </label>
          <label className="span-2">메모
            <textarea value={form.note ?? ''} onChange={event => updateForm('note', event.target.value)} placeholder="준비물, 신청 마감, 확인할 내용" rows={3} />
          </label>
        </div>
        <div className="career-form-actions">
          {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(emptyForm()) }}>취소</button>}
          <button type="button" className="primary" onClick={save}>{editingId ? '수정 저장' : '일정 추가'}</button>
        </div>
      </section>

      <nav className="career-filters" aria-label="신청·지원 일정 상태">
        {(['all', 'interested', 'planned', 'applied', 'pending', 'confirmed', 'completed', 'rejected', 'cancelled'] as const).map(status => (
          <button key={status} type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>
            {status === 'all' ? '전체' : STATUS_LABELS[status]}
          </button>
        ))}
      </nav>

      <section className="career-list">
        {visible.length === 0 ? (
          <div className="career-empty">등록된 신청·지원 일정이 없습니다.</div>
        ) : visible.map(item => (
          <article key={item.id} className="career-item">
            <div className="career-date">
              <strong>{item.date.slice(5).replace('-', '/')}</strong>
              <span>{item.time ? `${item.time}${item.endTime ? `~${item.endTime}` : ''}` : '시간 미정'}</span>
            </div>
            <div className="career-main">
              <div className="career-item-heading">
                <h3>{item.title}</h3>
                <span>{CATEGORY_LABELS[item.category]}</span>
                <span className={`status ${item.status}`}>{STATUS_LABELS[item.status]}</span>
              </div>
              {item.organization && <p>{item.organization}</p>}
              <div className="career-details">
                {item.mode && <span>{item.mode === 'offline' ? '오프라인' : item.mode === 'online' ? '온라인' : '온·오프라인'}</span>}
                {item.location && <span>{item.location}</span>}
                {item.address && <span>{item.address}</span>}
              </div>
              {item.note && <p className="career-note">{item.note}</p>}
              {item.url && <a href={item.url} target="_blank" rel="noreferrer">온라인 링크 열기</a>}
            </div>
            <div className="career-actions">
              <button type="button" onClick={() => edit(item)}>수정</button>
              <button type="button" className="danger" onClick={() => remove(item.id)}>삭제</button>
            </div>
          </article>
        ))}
      </section>

      <style>{`
        .career-page { max-width: 1050px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 16px; }
        .career-header h2 { margin: 0 0 5px; font-size: 24px; letter-spacing: 0; }
        .career-header p { margin: 0; color: var(--muted); font-size: 13px; }
        .career-editor { padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); }
        .career-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .career-form-grid label { display: flex; flex-direction: column; gap: 5px; color: var(--muted); font-size: 11px; font-weight: 700; }
        .career-form-grid .span-2 { grid-column: 1 / -1; }
        .career-form-grid input, .career-form-grid select, .career-form-grid textarea { width: 100%; min-width: 0; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 9px 10px; font: inherit; font-size: 13px; outline: none; box-sizing: border-box; }
        .career-form-grid textarea { resize: vertical; }
        .career-form-actions { display: flex; justify-content: flex-end; gap: 7px; margin-top: 12px; }
        .career-form-actions button, .career-filters button, .career-actions button { border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 8px 11px; cursor: pointer; font-size: 11px; }
        .career-form-actions .primary { border-color: var(--accent); background: var(--accent); color: #fff; font-weight: 700; }
        .career-filters { display: flex; flex-wrap: wrap; gap: 5px; }
        .career-filters button.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 700; }
        .career-list { display: flex; flex-direction: column; gap: 8px; }
        .career-item { display: grid; grid-template-columns: 78px minmax(0, 1fr) auto; gap: 14px; align-items: start; padding: 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); }
        .career-date { display: flex; flex-direction: column; gap: 3px; color: var(--accent); }
        .career-date strong { font-size: 16px; }
        .career-date span { color: var(--muted); font-size: 10px; white-space: nowrap; }
        .career-main { min-width: 0; }
        .career-item-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
        .career-item-heading h3 { margin: 0; font-size: 15px; letter-spacing: 0; }
        .career-item-heading span { padding: 3px 6px; border-radius: 5px; background: var(--bg3); color: var(--muted); font-size: 10px; }
        .career-item-heading .status.confirmed, .career-item-heading .status.completed { color: var(--accent); background: var(--accent-soft); }
        .career-item-heading .status.cancelled { color: var(--red); }
        .career-main p { margin: 5px 0 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
        .career-details { display: flex; flex-wrap: wrap; gap: 5px 10px; margin-top: 7px; color: var(--muted); font-size: 11px; }
        .career-note { white-space: pre-wrap; }
        .career-main a { display: inline-block; margin-top: 7px; color: var(--accent); font-size: 11px; font-weight: 700; }
        .career-actions { display: flex; gap: 4px; }
        .career-actions .danger { color: var(--red); }
        .career-empty { padding: 45px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); color: var(--muted); text-align: center; }
        @media (max-width: 700px) {
          .career-form-grid { grid-template-columns: 1fr; }
          .career-form-grid .span-2 { grid-column: auto; }
          .career-item { grid-template-columns: 1fr; gap: 8px; }
          .career-date { flex-direction: row; align-items: baseline; gap: 8px; }
          .career-actions { justify-content: flex-end; }
        }
      `}</style>
    </div>
  )
}
