import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { PersonalApplication, PersonalApplicationStatus, PersonalApplicationType } from '../types'
import { toLocalDateKey } from '../utils/date'
import {
  getAvailableOptionalApplicationDateFields,
  getVisibleOptionalApplicationDateFields,
  OPTIONAL_APPLICATION_DATE_FIELDS,
  OPTIONAL_APPLICATION_DATE_LABELS,
  type OptionalApplicationDateField,
} from '../utils/personalApplications'

const APPLICATION_TYPES: PersonalApplicationType[] = [
  'savings', 'mentoring', 'welfare', 'youth_support',
  'education', 'certificate', 'housing', 'other',
]
const APPLICATION_STATUSES: PersonalApplicationStatus[] = [
  'interested', 'preparing', 'submitted', 'reviewing',
  'selected', 'rejected', 'active', 'finished', 'cancelled',
]

const TYPE_LABELS: Record<PersonalApplicationType, string> = {
  savings: '저축/통장',
  mentoring: '멘토링',
  welfare: '복지',
  youth_support: '청년지원',
  education: '교육/훈련',
  certificate: '자격/증명',
  housing: '주거',
  other: '기타',
}

const STATUS_LABELS: Record<PersonalApplicationStatus, string> = {
  interested: '관심',
  preparing: '준비 중',
  submitted: '신청 완료',
  reviewing: '심사 중',
  selected: '선정',
  rejected: '탈락',
  active: '진행 중',
  finished: '종료',
  cancelled: '취소',
}

type Filter = 'all' | PersonalApplicationStatus

const splitTokens = (value: string) =>
  value.split(',').map(item => item.trim()).filter(Boolean)

const joinTokens = (items?: string[]) => (items ?? []).join(', ')

const emptyForm = () => ({
  title: '',
  organization: '',
  type: 'youth_support' as PersonalApplicationType,
  status: 'preparing' as PersonalApplicationStatus,
  deadline: '',
  appliedDate: '',
  resultDate: '',
  startDate: '',
  endDate: '',
  nextAction: '',
  documents: '',
  keywords: '',
  sourceUrl: '',
  note: '',
})

const dateDistance = (date?: string) => {
  if (!date) return Number.POSITIVE_INFINITY
  const today = new Date(`${toLocalDateKey()}T12:00:00`).getTime()
  const target = new Date(`${date}T12:00:00`).getTime()
  return Math.ceil((target - today) / 86400000)
}

const dateBadge = (date?: string) => {
  const diff = dateDistance(date)
  if (!Number.isFinite(diff)) return '날짜 없음'
  if (diff < 0) return `${Math.abs(diff)}일 지남`
  if (diff === 0) return '오늘'
  if (diff === 1) return '내일'
  return `${diff}일 남음`
}

const isOpen = (status: PersonalApplicationStatus) =>
  !['rejected', 'finished', 'cancelled'].includes(status)

const sortApplications = (items: PersonalApplication[]) =>
  [...items].sort((a, b) => {
    const aOpen = isOpen(a.status)
    const bOpen = isOpen(b.status)
    if (aOpen !== bOpen) return aOpen ? -1 : 1
    return dateDistance(a.deadline ?? a.resultDate ?? a.startDate) - dateDistance(b.deadline ?? b.resultDate ?? b.startDate)
  })

export default function PersonalApplications() {
  const { personalApplications, setPersonalApplications } = useApp()
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [revealedOptionalDates, setRevealedOptionalDates] = useState<Record<string, OptionalApplicationDateField[]>>({})

  const addItem = () => {
    const title = form.title.trim()
    if (!title) return
    const now = new Date().toISOString()
    const item: PersonalApplication = {
      id: `personal-application-${Date.now()}`,
      title,
      organization: form.organization.trim() || undefined,
      type: form.type,
      status: form.status,
      deadline: form.deadline || undefined,
      appliedDate: form.appliedDate || undefined,
      resultDate: form.resultDate || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      nextAction: form.nextAction.trim() || undefined,
      documents: splitTokens(form.documents),
      keywords: splitTokens(form.keywords),
      sourceUrl: form.sourceUrl.trim() || undefined,
      note: form.note.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }
    setPersonalApplications(previous => [item, ...previous])
    setForm(emptyForm())
  }

  const updateItem = (id: string, patch: Partial<PersonalApplication>) => {
    setPersonalApplications(previous => previous.map(item =>
      item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
    ))
  }

  const revealOptionalDate = (id: string, field: OptionalApplicationDateField) => {
    setRevealedOptionalDates(previous => {
      const selected = new Set([...(previous[id] ?? []), field])
      return {
        ...previous,
        [id]: OPTIONAL_APPLICATION_DATE_FIELDS.filter(candidate => selected.has(candidate)),
      }
    })
  }

  const updateOptionalDate = (id: string, field: OptionalApplicationDateField, value: string) => {
    revealOptionalDate(id, field)
    updateItem(id, { [field]: value || undefined } as Partial<PersonalApplication>)
  }

  const hideOptionalDate = (item: PersonalApplication, field: OptionalApplicationDateField) => {
    const label = OPTIONAL_APPLICATION_DATE_LABELS[field]
    if (item[field] && !window.confirm(`${label} 날짜를 지우고 숨길까요?`)) return

    updateItem(item.id, { [field]: undefined } as Partial<PersonalApplication>)
    setRevealedOptionalDates(previous => ({
      ...previous,
      [item.id]: (previous[item.id] ?? []).filter(candidate => candidate !== field),
    }))
  }

  const removeItem = (id: string) => {
    if (!window.confirm('이 신청 기록을 삭제할까요?')) return
    setPersonalApplications(previous => previous.filter(item => item.id !== id))
    setRevealedOptionalDates(previous => {
      const next = { ...previous }
      delete next[id]
      return next
    })
  }

  const sorted = useMemo(() => sortApplications(personalApplications), [personalApplications])
  const visible = sorted.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter
    const haystack = [
      item.title, item.organization, TYPE_LABELS[item.type], STATUS_LABELS[item.status],
      item.nextAction, item.note, item.keywords?.join(' '),
    ].filter(Boolean).join(' ').toLowerCase()
    return matchesFilter && haystack.includes(query.trim().toLowerCase())
  })
  const activeItems = personalApplications.filter(item => isOpen(item.status))
  const submittedItems = personalApplications.filter(item => ['submitted', 'reviewing', 'selected', 'active'].includes(item.status))
  const selectedItems = personalApplications.filter(item => item.status === 'selected' || item.status === 'active')
  const upcoming = sorted.filter(item => isOpen(item.status) && item.deadline).slice(0, 3)
  const nextAction = sorted.find(item => isOpen(item.status) && item.nextAction)

  return (
    <div className="personal-page">
      <header className="personal-header">
        <div>
          <h2>내 신청</h2>
          <p>저축계좌, 내일두배통장, 기관 멘토링처럼 신청 후 상태를 계속 추적해야 하는 제도를 따로 관리합니다.</p>
        </div>
      </header>

      <section className="personal-summary">
        <Summary label="관리 중" value={`${activeItems.length}개`} sub="취소/종료 제외" />
        <Summary label="신청 이후" value={`${submittedItems.length}개`} sub="신청·심사·진행" />
        <Summary label="선정/진행" value={`${selectedItems.length}개`} sub={selectedItems[0]?.title ?? '아직 없음'} />
        <Summary label="가까운 마감" value={upcoming[0] ? dateBadge(upcoming[0].deadline) : '-'} sub={upcoming[0]?.title ?? '마감 없음'} />
      </section>

      <section className="personal-board">
        <article className="next-application">
          <span>다음 행동</span>
          <strong>{nextAction?.nextAction ?? '등록된 다음 행동 없음'}</strong>
          <p>{nextAction ? `${nextAction.title} · ${STATUS_LABELS[nextAction.status]}` : '서류 제출, 결과 확인, 납입 시작 같은 다음 행동을 적어두면 놓치기 쉽지 않습니다.'}</p>
        </article>
        <article className="upcoming-applications">
          <span>다가오는 일정</span>
          {upcoming.length === 0 ? (
            <p>마감이 있는 신청이 없습니다.</p>
          ) : upcoming.map(item => (
            <button key={item.id} type="button" onClick={() => setFilter(item.status)}>
              <b>{dateBadge(item.deadline)}</b>
              <small>{item.title}</small>
            </button>
          ))}
        </article>
      </section>

      <section className="personal-add">
        <div className="personal-section-heading">
          <div>
            <h3>빠른 추가</h3>
            <p>핵심 정보만 먼저 넣고, 상세는 아래 카드에서 이어서 정리합니다.</p>
          </div>
          <small>상태 추적 시작</small>
        </div>
        <div className="personal-add-grid">
          <label>
            <span>이름</span>
            <input
              value={form.title}
              onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
              onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) addItem() }}
              placeholder="예: 내일두배통장, 기관 멘토링"
            />
          </label>
          <label>
            <span>기관</span>
            <input
              value={form.organization}
              onChange={event => setForm(prev => ({ ...prev, organization: event.target.value }))}
              placeholder="기관/주관처"
            />
          </label>
          <label>
            <span>유형</span>
            <select value={form.type} onChange={event => setForm(prev => ({ ...prev, type: event.target.value as PersonalApplicationType }))}>
              {APPLICATION_TYPES.map(type => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
            </select>
          </label>
          <label>
            <span>상태</span>
            <select value={form.status} onChange={event => setForm(prev => ({ ...prev, status: event.target.value as PersonalApplicationStatus }))}>
              {APPLICATION_STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
            </select>
          </label>
          <label>
            <span>마감일</span>
            <input type="date" value={form.deadline} onChange={event => setForm(prev => ({ ...prev, deadline: event.target.value }))} />
          </label>
          <div className="personal-add-action">
            <button type="button" onClick={addItem}>추가</button>
          </div>
        </div>
      </section>

      <section className="personal-tools">
        <div className="personal-section-heading compact">
          <div>
            <h3>검색과 필터</h3>
            <p>기관, 상태, 키워드, 메모 기준으로 빠르게 좁혀봅니다.</p>
          </div>
          <small>{visible.length}개 표시</small>
        </div>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="검색: 통장, 멘토링, 서류, 기관" />
        <div>
          {(['all', ...APPLICATION_STATUSES] as Filter[]).map(status => (
            <button key={status} type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>
              {status === 'all' ? '전체' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </section>

      <section className="personal-list">
        {visible.length === 0 ? (
          <p className="empty-text">관리할 신청 기록을 추가하세요.</p>
        ) : visible.map(item => {
          const revealedFields = revealedOptionalDates[item.id] ?? []
          const visibleOptionalDateFields = getVisibleOptionalApplicationDateFields(item, revealedFields)
          const availableOptionalDateFields = getAvailableOptionalApplicationDateFields(item, revealedFields)
          const timelineSummary = item.deadline
            ? `마감 ${dateBadge(item.deadline)}`
            : item.resultDate
              ? `결과 ${dateBadge(item.resultDate)}`
              : item.appliedDate
                ? `신청 ${item.appliedDate}`
                : '신청일·결과일 미정'

          return (
            <article key={item.id} className={`personal-card ${item.status}`}>
              <div className="personal-card-top">
                <input value={item.title} onChange={event => updateItem(item.id, { title: event.target.value })} />
                <span>{STATUS_LABELS[item.status]}</span>
              </div>
              <div className="personal-card-grid personal-card-basics">
                <label>기관<input value={item.organization ?? ''} onChange={event => updateItem(item.id, { organization: event.target.value })} /></label>
                <label>유형<select value={item.type} onChange={event => updateItem(item.id, { type: event.target.value as PersonalApplicationType })}>{APPLICATION_TYPES.map(type => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}</select></label>
                <label>상태<select value={item.status} onChange={event => updateItem(item.id, { status: event.target.value as PersonalApplicationStatus })}>{APPLICATION_STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
              </div>
              <div className="personal-date-section">
                <div className="personal-date-heading">
                  <strong>날짜</strong>
                  {availableOptionalDateFields.length > 0 && (
                    <select
                      value=""
                      aria-label={`${item.title} 추가 날짜 선택`}
                      onChange={event => {
                        const field = event.target.value as OptionalApplicationDateField
                        if (field) revealOptionalDate(item.id, field)
                      }}
                    >
                      <option value="">날짜 추가</option>
                      {availableOptionalDateFields.map(field => (
                        <option key={field} value={field}>{OPTIONAL_APPLICATION_DATE_LABELS[field]}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="personal-card-grid personal-date-grid">
                  <label>신청일<input type="date" value={item.appliedDate ?? ''} onChange={event => updateItem(item.id, { appliedDate: event.target.value || undefined })} /></label>
                  <label>결과일<input type="date" value={item.resultDate ?? ''} onChange={event => updateItem(item.id, { resultDate: event.target.value || undefined })} /></label>
                  {visibleOptionalDateFields.map(field => (
                    <div key={field} className="personal-optional-date">
                      <label>
                        {OPTIONAL_APPLICATION_DATE_LABELS[field]}
                        <input
                          type="date"
                          value={item[field] ?? ''}
                          onChange={event => updateOptionalDate(item.id, field, event.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        title={`${OPTIONAL_APPLICATION_DATE_LABELS[field]} 제거`}
                        aria-label={`${OPTIONAL_APPLICATION_DATE_LABELS[field]} 제거`}
                        onClick={() => hideOptionalDate(item, field)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <label className="wide-label">다음 행동<input value={item.nextAction ?? ''} onChange={event => updateItem(item.id, { nextAction: event.target.value })} placeholder="예: 주민등록등본 제출, 결과 발표 확인" /></label>
              <div className="personal-card-grid two">
                <label>제출 서류<input value={joinTokens(item.documents)} onChange={event => updateItem(item.id, { documents: splitTokens(event.target.value) })} placeholder="쉼표로 구분" /></label>
                <label>키워드<input value={joinTokens(item.keywords)} onChange={event => updateItem(item.id, { keywords: splitTokens(event.target.value) })} placeholder="저축, 멘토링, 청년" /></label>
              </div>
              <label className="wide-label">참고 링크<input value={item.sourceUrl ?? ''} onChange={event => updateItem(item.id, { sourceUrl: event.target.value })} placeholder="https://" /></label>
              <textarea value={item.note ?? ''} onChange={event => updateItem(item.id, { note: event.target.value })} placeholder="메모" rows={3} />
              <div className="personal-card-actions">
                {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">원본 열기</a>}
                <small>{timelineSummary}</small>
                <button type="button" onClick={() => removeItem(item.id)}>삭제</button>
              </div>
            </article>
          )
        })}
      </section>

      <style>{`
        .personal-page { max-width: 1160px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 16px; }
        .personal-header h2 { margin: 0 0 6px; font-size: 24px; letter-spacing: 0; }
        .personal-header p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        .personal-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .personal-summary-card, .next-application, .upcoming-applications, .personal-add, .personal-tools, .personal-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; }
        .personal-summary-card { padding: 13px; min-width: 0; }
        .personal-summary-card span, .next-application span, .upcoming-applications > span { color: var(--accent); font-size: 11px; font-weight: 900; }
        .personal-summary-card b { display: block; margin: 5px 0 3px; font-size: 21px; }
        .personal-summary-card small { display: block; color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .personal-board { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr); gap: 12px; }
        .next-application, .upcoming-applications { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .next-application strong { font-size: 18px; overflow-wrap: anywhere; }
        .next-application p, .upcoming-applications p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
        .upcoming-applications button { border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); color: var(--text); padding: 9px 10px; text-align: left; cursor: pointer; display: grid; gap: 3px; }
        .upcoming-applications b { color: var(--accent); font-size: 12px; }
        .upcoming-applications small { color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .personal-section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .personal-section-heading.compact { align-items: center; }
        .personal-section-heading h3 { margin: 0 0 4px; font-size: 15px; letter-spacing: 0; }
        .personal-section-heading p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
        .personal-section-heading small { flex-shrink: 0; color: var(--muted); font-size: 11px; font-weight: 900; white-space: nowrap; }
        .personal-add { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        .personal-add-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr) 148px 128px 146px auto; gap: 8px; align-items: end; }
        .personal-add-grid label { min-width: 0; display: flex; flex-direction: column; gap: 5px; color: var(--muted); font-size: 11px; font-weight: 800; }
        .personal-add-action { display: flex; align-items: flex-end; }
        .personal-tools { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        .personal-tools > div { display: flex; flex-wrap: wrap; gap: 6px; }
        .personal-tools button { min-height: 31px; border: 1px solid var(--border); border-radius: 999px; background: var(--bg3); color: var(--muted); padding: 0 11px; font-size: 12px; cursor: pointer; }
        .personal-tools button.active { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); font-weight: 800; }
        .personal-add input, .personal-add select, .personal-tools input, .personal-card input, .personal-card select, .personal-card textarea { min-width: 0; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); font-family: inherit; font-size: 13px; outline: none; }
        .personal-add input, .personal-add select, .personal-tools input, .personal-card input, .personal-card select { height: 34px; padding: 0 9px; }
        .personal-add button { height: 34px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 13px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .personal-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .personal-card { padding: 13px; display: flex; flex-direction: column; gap: 10px; border-left: 4px solid var(--accent); }
        .personal-card.rejected, .personal-card.cancelled, .personal-card.finished { border-left-color: var(--muted); opacity: 0.82; }
        .personal-card-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; }
        .personal-card-top input { border-color: transparent; background: transparent; padding-left: 0; font-weight: 900; font-size: 15px; }
        .personal-card-top span { border-radius: 999px; background: var(--accent-soft); color: var(--accent); padding: 4px 8px; font-size: 10px; font-weight: 900; white-space: nowrap; }
        .personal-card-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
        .personal-card-basics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .personal-card-grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .personal-card label { min-width: 0; display: flex; flex-direction: column; gap: 5px; color: var(--muted); font-size: 11px; font-weight: 800; }
        .personal-date-section { display: flex; flex-direction: column; gap: 8px; padding-top: 2px; }
        .personal-date-heading { min-height: 34px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .personal-date-heading strong { color: var(--text); font-size: 12px; }
        .personal-date-heading select { width: 112px; flex: 0 0 auto; }
        .personal-date-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .personal-optional-date { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) 34px; align-items: end; gap: 5px; }
        .personal-optional-date > button { width: 34px; height: 34px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--muted); font-size: 18px; line-height: 1; cursor: pointer; }
        .personal-optional-date > button:hover { border-color: var(--accent); color: var(--accent); }
        .wide-label { width: 100%; }
        .personal-card textarea { padding: 9px; resize: vertical; line-height: 1.5; }
        .personal-card-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .personal-card-actions a { color: var(--accent); font-size: 12px; font-weight: 800; text-decoration: none; }
        .personal-card-actions small { color: var(--muted); font-size: 11px; }
        .personal-card-actions button { border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 11px; padding: 6px; }
        .empty-text { grid-column: 1 / -1; margin: 0; padding: 36px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); color: var(--muted); text-align: center; }
        @media (max-width: 980px) {
          .personal-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .personal-board, .personal-list { grid-template-columns: 1fr; }
          .personal-add-grid, .personal-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .personal-add-action { grid-column: 1 / -1; }
        }
        @media (max-width: 560px) {
          .personal-summary, .personal-add-grid, .personal-card-grid, .personal-card-grid.two { grid-template-columns: 1fr; }
          .personal-section-heading { flex-direction: column; }
          .personal-card-actions { align-items: flex-start; flex-direction: column; }
        }
      `}</style>
    </div>
  )
}

function Summary({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="personal-summary-card">
      <span>{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </article>
  )
}
