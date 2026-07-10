import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Drawer } from '../components/ui/Drawer'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import type { PersonalApplication, PersonalApplicationStatus, PersonalApplicationType } from '../types'
import { toLocalDateKey } from '../utils/date'
import {
  getPersonalApplicationStatusLabel,
  getPersonalApplicationTypeLabel,
  isPersonalApplicationOpen,
  normalizePersonalApplicationStatus,
  normalizePersonalApplicationType,
  PERSONAL_APPLICATION_STATUSES as APPLICATION_STATUSES,
  PERSONAL_APPLICATION_STATUS_LABELS as STATUS_LABELS,
  PERSONAL_APPLICATION_TYPES as APPLICATION_TYPES,
  PERSONAL_APPLICATION_TYPE_LABELS as TYPE_LABELS,
} from '../utils/personalApplications'

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

const sortApplications = (items: PersonalApplication[]) =>
  [...items].sort((a, b) => {
    const aOpen = isPersonalApplicationOpen(a.status)
    const bOpen = isPersonalApplicationOpen(b.status)
    if (aOpen !== bOpen) return aOpen ? -1 : 1
    return dateDistance(a.deadline ?? a.resultDate ?? a.startDate) - dateDistance(b.deadline ?? b.resultDate ?? b.startDate)
  })

export default function PersonalApplications() {
  const { personalApplications, setPersonalApplications } = useApp()
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

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

  const removeItem = (id: string) => {
    setDeleteId(id)
  }

  const confirmRemove = () => {
    if (!deleteId) return
    setPersonalApplications(previous => previous.filter(item => item.id !== deleteId))
    setSelectedId(previous => previous === deleteId ? null : previous)
  }

  const resetFilters = () => {
    setFilter('all')
    setQuery('')
  }

  const sorted = useMemo(() => sortApplications(personalApplications), [personalApplications])
  const visible = sorted.filter(item => {
    const normalizedStatus = normalizePersonalApplicationStatus(item.status)
    const matchesFilter = filter === 'all' || normalizedStatus === filter
    const haystack = [
      item.title, item.organization, getPersonalApplicationTypeLabel(item.type), getPersonalApplicationStatusLabel(item.status),
      item.nextAction, item.note, item.keywords?.join(' '),
    ].filter(Boolean).join(' ').toLowerCase()
    return matchesFilter && haystack.includes(query.trim().toLowerCase())
  })
  const activeItems = personalApplications.filter(item => isPersonalApplicationOpen(item.status))
  const submittedItems = personalApplications.filter(item => ['submitted', 'reviewing', 'selected', 'active'].includes(normalizePersonalApplicationStatus(item.status)))
  const selectedItems = personalApplications.filter(item => {
    const status = normalizePersonalApplicationStatus(item.status)
    return status === 'selected' || status === 'active'
  })
  const upcoming = sorted.filter(item => isPersonalApplicationOpen(item.status) && item.deadline).slice(0, 3)
  const nextAction = sorted.find(item => isPersonalApplicationOpen(item.status) && item.nextAction)
  const hasHiddenItems = personalApplications.length > 0 && visible.length === 0
  const selectedItem = selectedId
    ? personalApplications.find(item => item.id === selectedId) ?? null
    : null

  return (
    <div className="personal-page">
      <PageHeader
        title="내 신청"
        description="신청부터 심사, 선정 이후 일정과 다음 행동까지 이어서 관리합니다."
      />

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
          <p>{nextAction ? `${nextAction.title} · ${getPersonalApplicationStatusLabel(nextAction.status)}` : '서류 제출, 결과 확인, 납입 시작 같은 다음 행동을 적어두면 놓치기 쉽지 않습니다.'}</p>
        </article>
        <article className="upcoming-applications">
          <span>다가오는 일정</span>
          {upcoming.length === 0 ? (
            <p>마감이 있는 신청이 없습니다.</p>
          ) : upcoming.map(item => (
            <button key={item.id} type="button" onClick={() => setFilter(normalizePersonalApplicationStatus(item.status))}>
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
          <small>전체 {personalApplications.length}개 · 표시 {visible.length}개</small>
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
          <div className="empty-text personal-empty-state">
            {hasHiddenItems ? (
              <>
                <strong>검색/필터에 가려진 신청이 있습니다.</strong>
                <span>전체 {personalApplications.length}개 중 현재 조건에 맞는 기록이 없습니다.</span>
                <button type="button" onClick={resetFilters}>전체 보기</button>
              </>
            ) : (
              <span>관리할 신청 기록을 추가하세요.</span>
            )}
          </div>
        ) : visible.map(item => (
          <article key={item.id} className={`personal-card ${normalizePersonalApplicationStatus(item.status)}`}>
            <button type="button" className="personal-card-open" onClick={() => setSelectedId(item.id)}>
              <div className="personal-card-top">
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.organization || '기관 미정'} · {getPersonalApplicationTypeLabel(item.type)}</p>
                </div>
                <span>{getPersonalApplicationStatusLabel(item.status)}</span>
              </div>
              <div className="personal-card-tags">
                <small>{item.deadline ? `마감 ${dateBadge(item.deadline)}` : '마감 없음'}</small>
                {item.resultDate && <small>결과 {item.resultDate}</small>}
                {(item.keywords ?? []).slice(0, 3).map(keyword => <small key={keyword}>{keyword}</small>)}
              </div>
              {item.nextAction && <p><b>다음 행동</b>{item.nextAction}</p>}
            </button>
            <div className="personal-card-actions">
              {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">원본 열기</a>}
              <button type="button" onClick={() => setSelectedId(item.id)}>자세히</button>
              <button type="button" onClick={() => removeItem(item.id)}>삭제</button>
            </div>
          </article>
        ))}
      </section>

      <Drawer
        open={Boolean(selectedItem)}
        onClose={() => setSelectedId(null)}
        title={selectedItem?.title ?? '신청 상세'}
        description={selectedItem ? `${selectedItem.organization || '기관 미정'} · ${getPersonalApplicationStatusLabel(selectedItem.status)}` : undefined}
        width="lg"
        footer={selectedItem && (
          <>
            {selectedItem.sourceUrl && <a className="personal-detail-open-link" href={selectedItem.sourceUrl} target="_blank" rel="noreferrer">원본 열기</a>}
            <Button variant="danger" onClick={() => removeItem(selectedItem.id)}>삭제</Button>
          </>
        )}
      >
        {selectedItem && (
          <div className="personal-detail-form">
            <label>이름<input value={selectedItem.title} onChange={event => updateItem(selectedItem.id, { title: event.target.value })} /></label>
            <label>기관<input value={selectedItem.organization ?? ''} onChange={event => updateItem(selectedItem.id, { organization: event.target.value })} /></label>
            <label>유형<select value={normalizePersonalApplicationType(selectedItem.type)} onChange={event => updateItem(selectedItem.id, { type: event.target.value as PersonalApplicationType })}>{APPLICATION_TYPES.map(type => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}</select></label>
            <label>상태<select value={normalizePersonalApplicationStatus(selectedItem.status)} onChange={event => updateItem(selectedItem.id, { status: event.target.value as PersonalApplicationStatus })}>{APPLICATION_STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
            <label>마감<input type="date" value={selectedItem.deadline ?? ''} onChange={event => updateItem(selectedItem.id, { deadline: event.target.value })} /></label>
            <label>신청일<input type="date" value={selectedItem.appliedDate ?? ''} onChange={event => updateItem(selectedItem.id, { appliedDate: event.target.value })} /></label>
            <label>결과일<input type="date" value={selectedItem.resultDate ?? ''} onChange={event => updateItem(selectedItem.id, { resultDate: event.target.value })} /></label>
            <label>시작일<input type="date" value={selectedItem.startDate ?? ''} onChange={event => updateItem(selectedItem.id, { startDate: event.target.value })} /></label>
            <label>종료일<input type="date" value={selectedItem.endDate ?? ''} onChange={event => updateItem(selectedItem.id, { endDate: event.target.value })} /></label>
            <label className="wide-label">다음 행동<input value={selectedItem.nextAction ?? ''} onChange={event => updateItem(selectedItem.id, { nextAction: event.target.value })} placeholder="예: 주민등록등본 제출, 결과 발표 확인" /></label>
            <label className="wide-label">제출 서류<input value={joinTokens(selectedItem.documents)} onChange={event => updateItem(selectedItem.id, { documents: splitTokens(event.target.value) })} placeholder="쉼표로 구분" /></label>
            <label className="wide-label">키워드<input value={joinTokens(selectedItem.keywords)} onChange={event => updateItem(selectedItem.id, { keywords: splitTokens(event.target.value) })} placeholder="저축, 멘토링, 청년" /></label>
            <label className="wide-label">참고 링크<input value={selectedItem.sourceUrl ?? ''} onChange={event => updateItem(selectedItem.id, { sourceUrl: event.target.value })} placeholder="https://" /></label>
            <label className="wide-label">메모<textarea value={selectedItem.note ?? ''} onChange={event => updateItem(selectedItem.id, { note: event.target.value })} rows={5} /></label>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmRemove}
        title="신청 기록 삭제"
        description={`'${personalApplications.find(item => item.id === deleteId)?.title ?? '선택한 신청'}' 기록을 삭제합니다.`}
        confirmLabel="삭제"
        danger
      />


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
