import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { CareerEvent, CareerEventCategory, CareerEventStatus } from '../types'
import LinkOrganizerModal from '../components/LinkOrganizerModal'
import type { LinkAnalysisDraft } from '../services/linkAnalysisService'
import { toLocalDateKey } from '../utils/date'
import {
  CAREER_CATEGORY_LABELS as CATEGORY_LABELS,
  CAREER_CREATION_STATUSES as CREATION_STATUSES,
  CAREER_STATUS_LABELS as STATUS_LABELS,
  formatCareerDday,
  getCareerDaysUntil,
  getCareerLastRelevantDate,
  getCareerNextMilestone,
  isCareerOpen,
} from '../utils/careerEvents'

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
  sourceUrl: '',
  note: '',
})

export default function CareerEvents() {
  const { careerEvents, setCareerEvents } = useApp()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | CareerEventStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | CareerEventCategory>('all')
  const [query, setQuery] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [linkImportOpen, setLinkImportOpen] = useState(false)
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

  const openLinkImportForNew = () => {
    setEditingId(null)
    setForm(emptyForm())
    setEditorOpen(true)
    setLinkImportOpen(true)
  }

  const applyLinkDraft = (draft: LinkAnalysisDraft) => {
    setForm(previous => ({
      ...previous,
      title: previous.title || draft.title,
      organization: previous.organization || draft.hostname,
      category: draft.category,
      status: draft.status,
      date: draft.date || previous.date,
      applicationDeadline: draft.deadline || previous.applicationDeadline,
      mode: 'online',
      url: draft.url,
      sourceUrl: draft.url,
      note: [previous.note, draft.summary].filter(Boolean).join('\n\n'),
    }))
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
      sourceUrl: form.sourceUrl?.trim() || form.url?.trim() || undefined,
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
      sourceUrl: item.sourceUrl ?? item.url ?? '',
      note: item.note ?? '',
    })
    setEditorOpen(true)
  }

  const remove = (id: string) => {
    if (!window.confirm('이 기회 일정을 삭제할까요?')) return
    setCareerEvents(previous => previous.filter(item => item.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setForm(emptyForm())
      setEditorOpen(false)
    }
  }

  const updateStatus = (id: string, status: CareerEventStatus) => {
    setCareerEvents(previous => previous.map(item => item.id === id ? { ...item, status } : item))
  }

  const today = toLocalDateKey()
  const normalizedQuery = query.trim().toLowerCase()

  const matchesQuery = (item: CareerEvent) => {
    if (!normalizedQuery) return true
    return [
      item.title,
      item.organization,
      CATEGORY_LABELS[item.category],
      STATUS_LABELS[item.status],
      item.location,
      item.url,
      item.note,
    ].some(value => value?.toLowerCase().includes(normalizedQuery))
  }

  const baseFiltered = careerEvents.filter(item =>
    (categoryFilter === 'all' || item.category === categoryFilter)
    && matchesQuery(item)
  )
  const statusCounts = Object.fromEntries(
    (Object.keys(STATUS_LABELS) as CareerEventStatus[]).map(status => [
      status,
      baseFiltered.filter(item => item.status === status).length,
    ])
  ) as Record<CareerEventStatus, number>
  const totalCount = baseFiltered.length
  const openCount = careerEvents.filter(item => isCareerOpen(item.status)).length
  const urgentCount = careerEvents.filter(item => {
    if (!isCareerOpen(item.status)) return false
    const next = getCareerNextMilestone(item, today)
    if (!next) return false
    const days = getCareerDaysUntil(next.date, today)
    return days >= 0 && days <= 7
  }).length
  const pendingCount = careerEvents.filter(item => item.status === 'pending').length
  const confirmedCount = careerEvents.filter(item => item.status === 'confirmed').length

  const nextDate = (item: CareerEvent) =>
    getCareerNextMilestone(item, today)?.date ?? getCareerLastRelevantDate(item)

  const filtered = baseFiltered.filter(item => filter === 'all' || item.status === filter)
  const upcoming = filtered
    .filter(item => getCareerLastRelevantDate(item) >= today)
    .sort((a, b) => nextDate(a).localeCompare(nextDate(b)) || (a.time ?? '').localeCompare(b.time ?? ''))
  const past = filtered
    .filter(item => getCareerLastRelevantDate(item) < today)
    .sort((a, b) => getCareerLastRelevantDate(b).localeCompare(getCareerLastRelevantDate(a)) || (b.time ?? '').localeCompare(a.time ?? ''))
  const urgentUpcoming = upcoming.filter(item => {
    if (!isCareerOpen(item.status)) return false
    const next = getCareerNextMilestone(item, today)
    if (!next) return false
    const days = getCareerDaysUntil(next.date, today)
    return days >= 0 && days <= 7
  })

  const fieldConfig = CATEGORY_FIELDS[form.category]
  const operationWeekdays = countWeekdays(form.operationStartDate, form.operationEndDate)

  return (
    <div className="career-page">
      <header className="career-header">
        <div>
          <h2>기회 일정</h2>
          <p>채용 설명회, 교육, 행사, 공모전, 프로그램처럼 외부 기회와 관련된 일정을 관리합니다.</p>
        </div>
        <div className="career-header-actions">
          <button type="button" className="career-link-button" onClick={openLinkImportForNew}>링크에서 추가</button>
          <button type="button" className="career-add-button" onClick={openNewEditor}>일정 추가</button>
        </div>
      </header>

      <section className="career-summary-grid" aria-label="기회 일정 요약">
        <SummaryCard label="진행 중" value={openCount} sub="관심~선정" />
        <SummaryCard label="7일 이내" value={urgentCount} sub="다음 체크 필요" tone="urgent" />
        <SummaryCard label="결과 대기" value={pendingCount} sub="확인 필요" />
        <SummaryCard label="선정/확정" value={confirmedCount} sub="운영 준비" />
      </section>

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
              <div className="career-editor-actions">
                <button type="button" className="career-link-button" onClick={() => setLinkImportOpen(true)}>링크에서 불러오기</button>
                <button type="button" className="career-close-button" aria-label="닫기" onClick={closeEditor}>×</button>
              </div>
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

      <LinkOrganizerModal
        open={linkImportOpen}
        onClose={() => setLinkImportOpen(false)}
        defaultTarget="career"
        lockTarget
        applyToCareerForm={applyLinkDraft}
      />

      <section className="career-toolbar" aria-label="기회 일정 검색과 구분">
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="일정명, 기관, 메모, 링크 검색"
        />
        <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value as 'all' | CareerEventCategory)}>
          <option value="all">전체 구분</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {(query || categoryFilter !== 'all' || filter !== 'all') && (
          <button type="button" onClick={() => { setQuery(''); setCategoryFilter('all'); setFilter('all') }}>초기화</button>
        )}
        <span>{filtered.length}건 표시</span>
      </section>

      <nav className="career-filters" aria-label="기회 일정 상태">
        {(['all', 'interested', 'planned', 'applied', 'pending', 'confirmed', 'completed', 'rejected', 'cancelled'] as const).map(status => (
          <button key={status} type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>
            {status === 'all' ? `전체 ${totalCount}` : `${STATUS_LABELS[status]} ${statusCounts[status]}`}
          </button>
        ))}
      </nav>

      {urgentUpcoming.length > 0 && (
        <section className="career-urgent-strip" aria-label="임박 일정">
          <strong>곧 챙길 일정</strong>
          <div>
            {urgentUpcoming.slice(0, 4).map(item => {
              const next = getCareerNextMilestone(item, today)
              return (
                <button key={item.id} type="button" onClick={() => edit(item)}>
                  <b>{next ? formatCareerDday(next.date, today) : 'D-Day'}</b>
                  <span>{item.title}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className="career-list">
        {upcoming.length === 0 ? (
          <div className="career-empty">예정된 기회 일정이 없습니다.</div>
        ) : upcoming.map(item => (
          <CareerEventCard key={item.id} item={item} today={today} onEdit={edit} onRemove={remove} onStatusChange={updateStatus} />
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
                <CareerEventCard key={item.id} item={item} today={today} onEdit={edit} onRemove={remove} onStatusChange={updateStatus} muted />
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
        .career-header-actions, .career-editor-actions { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
        .career-add-button { flex: 0 0 auto; border: 1px solid var(--accent); border-radius: 7px; background: var(--accent); color: #fff; padding: 9px 14px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .career-link-button { flex: 0 0 auto; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 9px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .career-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .career-summary-card { min-width: 0; padding: 12px 13px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); }
        .career-summary-card span { display: block; color: var(--muted); font-size: 11px; font-weight: 800; }
        .career-summary-card strong { display: block; margin-top: 5px; color: var(--text); font-size: 24px; line-height: 1.05; }
        .career-summary-card small { color: var(--muted); font-size: 11px; }
        .career-summary-card.urgent { border-color: rgba(224, 82, 82, 0.35); background: rgba(224, 82, 82, 0.08); }
        .career-toolbar { display: grid; grid-template-columns: minmax(220px, 1fr) 170px auto auto; gap: 8px; align-items: center; }
        .career-toolbar input, .career-toolbar select { min-width: 0; height: 36px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 10px; font-size: 13px; outline: none; }
        .career-toolbar button { height: 36px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--muted); padding: 0 11px; cursor: pointer; font-size: 12px; }
        .career-toolbar span { color: var(--muted); font-size: 12px; text-align: right; white-space: nowrap; }
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
        .career-urgent-strip { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; align-items: center; padding: 10px 12px; border: 1px solid rgba(224, 82, 82, 0.3); border-radius: 8px; background: rgba(224, 82, 82, 0.08); }
        .career-urgent-strip strong { color: #e05252; font-size: 12px; }
        .career-urgent-strip div { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 1px; }
        .career-urgent-strip button { min-width: 150px; max-width: 220px; display: flex; align-items: center; gap: 6px; border: 1px solid rgba(224, 82, 82, 0.25); border-radius: 7px; background: var(--bg2); color: var(--text); padding: 7px 9px; cursor: pointer; }
        .career-urgent-strip b { color: #e05252; font-size: 11px; flex: 0 0 auto; }
        .career-urgent-strip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
        .career-list { display: flex; flex-direction: column; gap: 8px; }
        .career-item { display: grid; grid-template-columns: 92px minmax(0, 1fr) 190px; gap: 15px; align-items: start; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); }
        .career-date { display: flex; flex-direction: column; gap: 3px; color: var(--accent); }
        .career-date strong { font-size: 18px; }
        .career-date span { color: var(--muted); font-size: 12px; white-space: nowrap; }
        .career-date em { color: var(--muted); font-size: 11px; font-style: normal; }
        .career-date b { width: fit-content; margin-top: 3px; padding: 3px 6px; border-radius: 5px; background: var(--accent-soft); color: var(--accent); font-size: 11px; }
        .career-main { min-width: 0; }
        .career-item-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
        .career-item-heading h3 { margin: 0; font-size: 17px; letter-spacing: 0; }
        .career-item-heading span { padding: 4px 7px; border-radius: 5px; background: var(--bg3); color: var(--muted); font-size: 12px; }
        .career-item-heading .status.confirmed, .career-item-heading .status.completed { color: var(--accent); background: var(--accent-soft); }
        .career-item-heading .status.rejected, .career-item-heading .status.cancelled { color: var(--red); }
        .career-main p { margin: 6px 0 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        .career-main .career-next { color: var(--accent); font-size: 12px; font-weight: 700; }
        .career-details { display: flex; flex-wrap: wrap; gap: 5px 10px; margin-top: 8px; color: var(--muted); font-size: 12px; }
        .career-milestones { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
        .career-milestones span { padding: 4px 7px; border-radius: 5px; background: var(--accent-soft); color: var(--accent); font-size: 11px; font-weight: 700; }
        .career-note { white-space: pre-wrap; }
        .career-main a { display: inline-block; margin-top: 7px; color: var(--accent); font-size: 11px; font-weight: 700; }
        .career-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
        .career-actions select { grid-column: 1 / -1; min-width: 0; height: 34px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 8px; font-size: 12px; outline: none; }
        .career-actions .danger { color: var(--red); }
        .career-empty { padding: 45px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); color: var(--muted); text-align: center; }
        @media (max-width: 700px) {
          .career-header { align-items: center; }
          .career-header-actions { flex-direction: column; align-items: stretch; }
          .career-header p { max-width: 250px; }
          .career-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .career-toolbar { grid-template-columns: 1fr; }
          .career-toolbar span { text-align: left; }
          .career-urgent-strip { grid-template-columns: 1fr; }
          .career-modal-backdrop { align-items: end; padding: 10px; }
          .career-editor { max-height: calc(100vh - 20px); padding: 14px; }
          .career-form-grid { grid-template-columns: 1fr; }
          .career-form-grid .span-2 { grid-column: auto; }
          .career-item { grid-template-columns: 1fr; gap: 8px; }
          .career-date { flex-direction: row; align-items: baseline; gap: 8px; }
          .career-actions { grid-template-columns: 1fr 1fr; }
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

function CareerEventCard({ item, today, onEdit, onRemove, onStatusChange, muted }: {
  item: CareerEvent
  today: string
  onEdit: (item: CareerEvent) => void
  onRemove: (id: string) => void
  onStatusChange: (id: string, status: CareerEventStatus) => void
  muted?: boolean
}) {
  const nextMilestone = getCareerNextMilestone(item, today)
  return (
    <article className={`career-item${muted ? ' is-past' : ''}`}>
      <div className="career-date">
        <strong>{item.date.slice(5).replace('-', '/')}</strong>
        <em>{weekdayOf(item.date)}요일</em>
        <span>{item.time ? `${item.time}${item.endTime ? `~${item.endTime}` : ''}` : '시간 미정'}</span>
        {nextMilestone && <b>{formatCareerDday(nextMilestone.date, today)}</b>}
      </div>
      <div className="career-main">
        <div className="career-item-heading">
          <h3>{item.title}</h3>
          <span>{CATEGORY_LABELS[item.category]}</span>
          <span className={`status ${item.status}`}>상태 · {STATUS_LABELS[item.status]}</span>
        </div>
        {nextMilestone && (
          <p className="career-next">
            다음 체크 · {nextMilestone.label} {nextMilestone.date}
          </p>
        )}
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
        <select
          value={item.status}
          onChange={event => onStatusChange(item.id, event.target.value as CareerEventStatus)}
          aria-label={`${item.title} 상태 변경`}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="button" onClick={() => onEdit(item)}>수정</button>
        <button type="button" className="danger" onClick={() => onRemove(item.id)}>삭제</button>
      </div>
    </article>
  )
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: number; sub: string; tone?: 'urgent' }) {
  return (
    <article className={tone === 'urgent' ? 'career-summary-card urgent' : 'career-summary-card'}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </article>
  )
}
