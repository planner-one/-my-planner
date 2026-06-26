import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { CareerEvent, CareerEventCategory, CareerEventStatus } from '../types'
import { toLocalDateKey } from '../utils/date'

const CATEGORY_LABELS: Record<CareerEventCategory, string> = {
  briefing: '채용설명회',
  interview: '면접',
  camp: '직무캠프',
  program: '교육/프로그램',
  seminar: '행사/세미나',
  contest: '공모전',
  support: '지원사업',
  corp_support: '기업 지원',
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

const CREATION_STATUSES: CareerEventStatus[] = [
  'interested', 'planned', 'applied', 'pending', 'confirmed', 'completed',
]

const CATEGORY_FIELDS: Record<CareerEventCategory, {
  dateLabel: string
  application: boolean
  result: boolean
  operation: boolean
}> = {
  briefing: { dateLabel: '설명회 일자', application: true, result: false, operation: false },
  interview: { dateLabel: '면접 일자', application: false, result: true, operation: false },
  camp: { dateLabel: '대표 일정일', application: true, result: true, operation: true },
  program: { dateLabel: '대표 일정일', application: true, result: true, operation: true },
  seminar: { dateLabel: '행사 일자', application: true, result: false, operation: false },
  contest: { dateLabel: '대표 일정일', application: true, result: true, operation: false },
  support: { dateLabel: '대표 일정일', application: true, result: true, operation: true },
  corp_support: { dateLabel: '대표 일정일', application: true, result: true, operation: true },
  other: { dateLabel: '대표 일정일', application: true, result: true, operation: true },
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2)
  const minute = index % 2 === 0 ? '00' : '30'
  return `${String(hour).padStart(2, '0')}:${minute}`
})

const TIME_PRESETS = [
  { label: '시간 미정', start: '', end: '' },
  { label: '09:00~18:00', start: '09:00', end: '18:00' },
  { label: '10:00~17:00', start: '10:00', end: '17:00' },
  { label: '13:00~18:00', start: '13:00', end: '18:00' },
  { label: '14:00~17:00', start: '14:00', end: '17:00' },
]

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const weekdayOf = (date: string) => WEEKDAY_LABELS[new Date(`${date}T00:00:00`).getDay()]

const lastRelevantDate = (item: CareerEvent) => item.date

const mergePlace = (location?: string, address?: string) =>
  [location, address].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index).join(' · ')

const countWeekdays = (start?: string, end?: string) => {
  if (!start || !end || end < start) return 0
  const cursor = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)
  let count = 0
  while (cursor <= last) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

const emptyForm = (): Omit<CareerEvent, 'id'> => ({
  title: '',
  organization: '',
  category: 'briefing',
  status: 'interested',
  date: toLocalDateKey(),
  applicationDeadline: '',
  resultDate: '',
  operationStartDate: '',
  operationEndDate: '',
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
  const [editorOpen, setEditorOpen] = useState(false)
  const [showPast, setShowPast] = useState(false)

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const openNewEditor = () => {
    setEditingId(null)
    setForm(emptyForm())
    setEditorOpen(true)
  }

  const updateForm = <K extends keyof Omit<CareerEvent, 'id'>>(key: K, value: Omit<CareerEvent, 'id'>[K]) =>
    setForm(previous => ({ ...previous, [key]: value }))

  const updateCategory = (category: CareerEventCategory) => {
    const fields = CATEGORY_FIELDS[category]
    setForm(previous => ({
      ...previous,
      category,
      applicationDeadline: fields.application ? previous.applicationDeadline : '',
      resultDate: fields.result ? previous.resultDate : '',
      operationStartDate: fields.operation ? previous.operationStartDate : '',
      operationEndDate: fields.operation ? previous.operationEndDate : '',
    }))
  }

  const updateStartTime = (time: string) => {
    setForm(previous => ({
      ...previous,
      time,
      endTime: previous.endTime && time && previous.endTime <= time ? '' : previous.endTime,
    }))
  }

  const applyTimePreset = (value: string) => {
    const preset = TIME_PRESETS[Number(value)]
    if (!preset) return
    setForm(previous => ({ ...previous, time: preset.start, endTime: preset.end }))
  }

  const save = () => {
    const title = form.title.trim()
    if (!title) return
    const fields = CATEGORY_FIELDS[form.category]
    const normalized: Omit<CareerEvent, 'id'> = {
      ...form,
      title,
      organization: form.organization?.trim() || undefined,
      applicationDeadline: fields.application ? form.applicationDeadline || undefined : undefined,
      resultDate: fields.result ? form.resultDate || undefined : undefined,
      operationStartDate: fields.operation ? form.operationStartDate || undefined : undefined,
      operationEndDate: fields.operation && form.operationEndDate && (!form.operationStartDate || form.operationEndDate >= form.operationStartDate) ? form.operationEndDate : undefined,
      time: form.time || undefined,
      endTime: form.endTime || undefined,
      location: form.mode === 'online' ? undefined : form.location?.trim() || undefined,
      address: undefined,
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
    setEditorOpen(false)
  }

  const edit = (item: CareerEvent) => {
    setEditingId(item.id)
    setForm({
      title: item.title,
      organization: item.organization ?? '',
      category: item.category,
      status: item.status,
      date: item.date,
      applicationDeadline: item.applicationDeadline ?? '',
      resultDate: item.resultDate ?? '',
      operationStartDate: item.operationStartDate ?? '',
      operationEndDate: item.operationEndDate ?? '',
      time: item.time ?? '',
      endTime: item.endTime ?? '',
      mode: item.mode ?? 'offline',
      location: mergePlace(item.location, item.address),
      address: '',
      url: item.url ?? '',
      note: item.note ?? '',
    })
    setEditorOpen(true)
  }

  const remove = (id: string) => {
    setCareerEvents(previous => previous.filter(item => item.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setForm(emptyForm())
      setEditorOpen(false)
    }
  }

  const today = toLocalDateKey()

  const filtered = careerEvents.filter(item => filter === 'all' || item.status === filter)
  const upcoming = filtered
    .filter(item => lastRelevantDate(item) >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  const past = filtered
    .filter(item => lastRelevantDate(item) < today)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? ''))

  const fieldConfig = CATEGORY_FIELDS[form.category]
  const operationWeekdays = countWeekdays(form.operationStartDate, form.operationEndDate)

  return (
    <div className="career-page">
      <header className="career-header">
        <div>
          <h2>신청·지원 일정</h2>
          <p>채용, 교육, 행사, 공모전과 각종 프로그램 신청 결과를 한곳에서 관리합니다.</p>
        </div>
        <button type="button" className="career-add-button" onClick={openNewEditor}>일정 추가</button>
      </header>

      {editorOpen && (
        <div className="career-modal-backdrop" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) closeEditor()
        }}>
          <section className="career-editor" role="dialog" aria-modal="true" aria-labelledby="career-editor-title">
            <div className="career-editor-heading">
              <div>
                <h3 id="career-editor-title">{editingId ? '일정 수정' : '새 일정 추가'}</h3>
                <p>필요한 항목만 입력해도 저장할 수 있습니다.</p>
              </div>
              <button type="button" className="career-close-button" aria-label="닫기" onClick={closeEditor}>×</button>
            </div>
            <div className="career-form-grid">
          <label className="span-2">일정명
            <input value={form.title} onChange={event => updateForm('title', event.target.value)} placeholder="예: NEST AI-Lab 직무캠프" />
          </label>
          <label>기관/회사
            <input value={form.organization ?? ''} onChange={event => updateForm('organization', event.target.value)} placeholder="기관 또는 회사명" />
          </label>
          <label>구분
            <select value={form.category} onChange={event => updateCategory(event.target.value as CareerEventCategory)}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>상태
            <select value={form.status} onChange={event => updateForm('status', event.target.value as CareerEventStatus)}>
              {Object.entries(STATUS_LABELS)
                .filter(([value]) => editingId || CREATION_STATUSES.includes(value as CareerEventStatus))
                .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>{fieldConfig.dateLabel}
            <input type="date" value={form.date} onChange={event => updateForm('date', event.target.value)} />
          </label>
          {fieldConfig.application && <label>신청 마감일
            <input type="date" value={form.applicationDeadline ?? ''} onChange={event => updateForm('applicationDeadline', event.target.value)} />
          </label>}
          {fieldConfig.result && <label>결과 발표일 (선택)
            <input type="date" value={form.resultDate ?? ''} onChange={event => updateForm('resultDate', event.target.value)} />
          </label>}
          {fieldConfig.operation && <>
            <label>운영 시작일
              <input type="date" value={form.operationStartDate ?? ''} onChange={event => updateForm('operationStartDate', event.target.value)} />
            </label>
            <label>운영 종료일 {operationWeekdays > 0 && <span className="career-weekdays">평일 {operationWeekdays}일</span>}
              <input type="date" min={form.operationStartDate || undefined} value={form.operationEndDate ?? ''} onChange={event => updateForm('operationEndDate', event.target.value)} />
            </label>
          </>}
          <label>빠른 시간
            <select value="" onChange={event => applyTimePreset(event.target.value)}>
              <option value="" disabled>시간대 선택</option>
              {TIME_PRESETS.map((preset, index) => (
                <option key={preset.label} value={index}>{preset.label}</option>
              ))}
            </select>
          </label>
          <label>시작
            <select value={form.time ?? ''} onChange={event => updateStartTime(event.target.value)}>
              <option value="">시간 미정</option>
              {TIME_OPTIONS.map(time => <option key={time} value={time}>{time}</option>)}
            </select>
          </label>
          <label>종료
            <select value={form.endTime ?? ''} onChange={event => updateForm('endTime', event.target.value)}>
              <option value="">종료 미정</option>
              {TIME_OPTIONS
                .filter(time => !form.time || time > form.time)
                .map(time => <option key={time} value={time}>{time}</option>)}
            </select>
          </label>
          <label>진행 방식
            <select value={form.mode ?? 'offline'} onChange={event => updateForm('mode', event.target.value as CareerEvent['mode'])}>
              <option value="offline">오프라인</option>
              <option value="online">온라인</option>
              <option value="hybrid">온·오프라인</option>
            </select>
          </label>
          {form.mode !== 'online' && <label className="span-2">장소 / 주소
            <input value={form.location ?? ''} onChange={event => updateForm('location', event.target.value)} placeholder="예: NEST AI-Lab 5층 · 서울시 광진구 광나루로 520" />
          </label>}
          <label className="span-2">관련 링크
            <input value={form.url ?? ''} onChange={event => updateForm('url', event.target.value)} placeholder="공고, 신청 또는 온라인 접속 링크" />
          </label>
          <label className="span-2">메모
            <textarea value={form.note ?? ''} onChange={event => updateForm('note', event.target.value)} placeholder="준비물, 신청 마감, 확인할 내용" rows={3} />
          </label>
            </div>
            <div className="career-form-actions">
              <button type="button" className="secondary" onClick={closeEditor}>취소</button>
              <button type="button" className="primary" onClick={save}>{editingId ? '수정 저장' : '일정 추가'}</button>
            </div>
          </section>
        </div>
      )}

      <nav className="career-filters" aria-label="신청·지원 일정 상태">
        {(['all', 'interested', 'planned', 'applied', 'pending', 'confirmed', 'completed', 'rejected', 'cancelled'] as const).map(status => (
          <button key={status} type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>
            {status === 'all' ? '전체' : STATUS_LABELS[status]}
          </button>
        ))}
      </nav>

      <section className="career-list">
        {upcoming.length === 0 ? (
          <div className="career-empty">예정된 신청·지원 일정이 없습니다.</div>
        ) : upcoming.map(item => (
          <CareerEventCard key={item.id} item={item} onEdit={edit} onRemove={remove} />
        ))}
      </section>

      {past.length > 0 && (
        <section className="career-past">
          <button type="button" className="career-past-toggle" onClick={() => setShowPast(prev => !prev)}>
            <span>지난 일정 {past.length}건</span>
            <span className={`career-past-caret ${showPast ? 'open' : ''}`}>▾</span>
          </button>
          {showPast && (
            <div className="career-list career-list-past">
              {past.map(item => (
                <CareerEventCard key={item.id} item={item} onEdit={edit} onRemove={remove} muted />
              ))}
            </div>
          )}
        </section>
      )}

      <style>{`
        .career-page { max-width: 1050px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 16px; }
        .career-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
        .career-header h2 { margin: 0 0 5px; font-size: 24px; letter-spacing: 0; }
        .career-header p { margin: 0; color: var(--muted); font-size: 13px; }
        .career-add-button { flex: 0 0 auto; border: 1px solid var(--accent); border-radius: 7px; background: var(--accent); color: #fff; padding: 9px 14px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .career-modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 18px; background: rgba(0, 0, 0, 0.52); }
        .career-editor { width: min(720px, 100%); max-height: min(820px, calc(100vh - 36px)); overflow-y: auto; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28); box-sizing: border-box; }
        .career-editor-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
        .career-editor-heading h3 { margin: 0 0 4px; font-size: 18px; letter-spacing: 0; }
        .career-editor-heading p { margin: 0; color: var(--muted); font-size: 11px; }
        .career-close-button { width: 32px; height: 32px; flex: 0 0 32px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--muted); font-size: 20px; line-height: 1; cursor: pointer; }
        .career-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .career-form-grid label { display: flex; flex-direction: column; gap: 5px; color: var(--muted); font-size: 11px; font-weight: 700; }
        .career-weekdays { color: var(--accent); font-weight: 700; }
        .career-form-grid .span-2 { grid-column: 1 / -1; }
        .career-form-grid input, .career-form-grid select, .career-form-grid textarea { width: 100%; min-width: 0; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 9px 10px; font: inherit; font-size: 13px; outline: none; box-sizing: border-box; }
        .career-form-grid textarea { resize: vertical; }
        .career-form-actions { display: flex; justify-content: flex-end; gap: 7px; margin-top: 12px; }
        .career-form-actions button, .career-filters button, .career-actions button { border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 8px 11px; cursor: pointer; font-size: 12px; }
        .career-form-actions .primary { border-color: var(--accent); background: var(--accent); color: #fff; font-weight: 700; }
        .career-filters { display: flex; flex-wrap: wrap; gap: 5px; }
        .career-filters button.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 700; }
        .career-list { display: flex; flex-direction: column; gap: 8px; }
        .career-item { display: grid; grid-template-columns: 88px minmax(0, 1fr) auto; gap: 15px; align-items: start; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); }
        .career-date { display: flex; flex-direction: column; gap: 3px; color: var(--accent); }
        .career-date strong { font-size: 18px; }
        .career-date span { color: var(--muted); font-size: 12px; white-space: nowrap; }
        .career-date em { color: var(--muted); font-size: 11px; font-style: normal; }
        .career-main { min-width: 0; }
        .career-item-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
        .career-item-heading h3 { margin: 0; font-size: 17px; letter-spacing: 0; }
        .career-item-heading span { padding: 4px 7px; border-radius: 5px; background: var(--bg3); color: var(--muted); font-size: 12px; }
        .career-item-heading .status.confirmed, .career-item-heading .status.completed { color: var(--accent); background: var(--accent-soft); }
        .career-item-heading .status.cancelled { color: var(--red); }
        .career-main p { margin: 6px 0 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        .career-details { display: flex; flex-wrap: wrap; gap: 5px 10px; margin-top: 8px; color: var(--muted); font-size: 12px; }
        .career-milestones { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
        .career-milestones span { padding: 4px 7px; border-radius: 5px; background: var(--accent-soft); color: var(--accent); font-size: 11px; font-weight: 700; }
        .career-note { white-space: pre-wrap; }
        .career-main a { display: inline-block; margin-top: 7px; color: var(--accent); font-size: 11px; font-weight: 700; }
        .career-actions { display: flex; gap: 4px; }
        .career-actions .danger { color: var(--red); }
        .career-empty { padding: 45px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); color: var(--muted); text-align: center; }
        @media (max-width: 700px) {
          .career-header { align-items: center; }
          .career-header p { max-width: 250px; }
          .career-modal-backdrop { align-items: end; padding: 10px; }
          .career-editor { max-height: calc(100vh - 20px); padding: 14px; }
          .career-form-grid { grid-template-columns: 1fr; }
          .career-form-grid .span-2 { grid-column: auto; }
          .career-item { grid-template-columns: 1fr; gap: 8px; }
          .career-date { flex-direction: row; align-items: baseline; gap: 8px; }
          .career-actions { justify-content: flex-end; }
        }
        .career-past { margin-top: 4px; }
        .career-past-toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); color: var(--muted); font-size: 12px; font-weight: 700; cursor: pointer; }
        .career-past-caret { transition: transform 0.15s ease; }
        .career-past-caret.open { transform: rotate(180deg); }
        .career-list-past { margin-top: 8px; opacity: 0.75; }
      `}</style>
    </div>
  )
}

function CareerEventCard({ item, onEdit, onRemove, muted }: {
  item: CareerEvent
  onEdit: (item: CareerEvent) => void
  onRemove: (id: string) => void
  muted?: boolean
}) {
  return (
    <article className={`career-item${muted ? ' is-past' : ''}`}>
      <div className="career-date">
        <strong>{item.date.slice(5).replace('-', '/')}</strong>
        <em>{weekdayOf(item.date)}요일</em>
        <span>{item.time ? `${item.time}${item.endTime ? `~${item.endTime}` : ''}` : '시간 미정'}</span>
      </div>
      <div className="career-main">
        <div className="career-item-heading">
          <h3>{item.title}</h3>
          <span>{CATEGORY_LABELS[item.category]}</span>
          <span className={`status ${item.status}`}>상태 · {STATUS_LABELS[item.status]}</span>
        </div>
        {item.organization && <p>{item.organization}</p>}
        <div className="career-details">
          {item.mode && <span>{item.mode === 'offline' ? '오프라인' : item.mode === 'online' ? '온라인' : '온·오프라인'}</span>}
          {item.location && <span>{item.location}</span>}
          {item.address && <span>{item.address}</span>}
        </div>
        <div className="career-milestones">
          {item.applicationDeadline && <span>신청 마감 {item.applicationDeadline}</span>}
          {item.resultDate && <span>결과 발표 {item.resultDate}</span>}
          {item.operationStartDate && <span>운영 {item.operationStartDate}{item.operationEndDate ? `~${item.operationEndDate}` : ''}{countWeekdays(item.operationStartDate, item.operationEndDate) > 0 ? ` · 평일 ${countWeekdays(item.operationStartDate, item.operationEndDate)}일` : ''}</span>}
        </div>
        {item.note && <p className="career-note">{item.note}</p>}
        {item.url && <a href={item.url} target="_blank" rel="noreferrer">온라인 링크 열기</a>}
      </div>
      <div className="career-actions">
        <button type="button" onClick={() => onEdit(item)}>수정</button>
        <button type="button" className="danger" onClick={() => onRemove(item.id)}>삭제</button>
      </div>
    </article>
  )
}
