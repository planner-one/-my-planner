import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { JobPosting, JobPostingPlatform, JobPostingStatus } from '../types'
import { toLocalDateKey } from '../utils/date'

const PLATFORMS: JobPostingPlatform[] = ['saramin', 'jobplanet', 'wanted', 'jumpit', 'groupby', 'other']
const STATUSES: JobPostingStatus[] = ['saved', 'preparing', 'applied', 'interview', 'offer', 'rejected', 'closed']

const PLATFORM_LABELS: Record<JobPostingPlatform, string> = {
  saramin: '사람인',
  jobplanet: '잡플래닛',
  wanted: '원티드',
  jumpit: '점핏',
  groupby: '그룹바이',
  other: '기타',
}

const STATUS_LABELS: Record<JobPostingStatus, string> = {
  saved: '저장',
  preparing: '준비 중',
  applied: '지원 완료',
  interview: '면접',
  offer: '오퍼',
  rejected: '불합격',
  closed: '마감',
}

type Filter = 'all' | JobPostingStatus

const TECH_KEYWORDS = [
  'React', 'TypeScript', 'JavaScript', 'Next.js', 'Vue', 'Node.js',
  'Firebase', 'Figma', 'UI', 'UX', '프론트엔드', '백엔드', 'PM', '기획',
]

const splitTokens = (value: string) =>
  value.split(',').map(item => item.trim()).filter(Boolean)

const joinTokens = (items?: string[]) => (items ?? []).join(', ')

const emptyForm = () => ({
  company: '',
  position: '',
  platform: 'other' as JobPostingPlatform,
  status: 'saved' as JobPostingStatus,
  deadline: '',
  appliedDate: '',
  resultDate: '',
  location: '',
  employmentType: '',
  sourceUrl: '',
  imageText: '',
  keywords: '',
  nextAction: '',
  note: '',
})

const detectPlatform = (url: string): JobPostingPlatform => {
  const lower = url.toLowerCase()
  if (lower.includes('saramin.co.kr')) return 'saramin'
  if (lower.includes('jobplanet.co.kr')) return 'jobplanet'
  if (lower.includes('wanted.co.kr')) return 'wanted'
  if (lower.includes('jumpit.co.kr')) return 'jumpit'
  if (lower.includes('groupby.kr') || lower.includes('groupby.co.kr')) return 'groupby'
  return 'other'
}

const inferDate = (text: string) => {
  const match = text.match(/(20\d{2})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/)
    ?? text.match(/(\d{1,2})[.\-/월\s]*(\d{1,2})[일]?/)
  if (!match) return ''
  const now = new Date()
  const year = match.length === 4 ? Number(match[1]) : now.getFullYear()
  const month = Number(match[match.length === 4 ? 2 : 1])
  const day = Number(match[match.length === 4 ? 3 : 2])
  if (!month || !day) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const inferKeywords = (text: string) =>
  TECH_KEYWORDS.filter(keyword => text.toLowerCase().includes(keyword.toLowerCase()))

const dateDistance = (date?: string) => {
  if (!date) return Number.POSITIVE_INFINITY
  const today = new Date(`${toLocalDateKey()}T12:00:00`).getTime()
  const target = new Date(`${date}T12:00:00`).getTime()
  return Math.ceil((target - today) / 86400000)
}

const dateBadge = (date?: string) => {
  const diff = dateDistance(date)
  if (!Number.isFinite(diff)) return '마감 없음'
  if (diff < 0) return `${Math.abs(diff)}일 지남`
  if (diff === 0) return '오늘'
  if (diff === 1) return '내일'
  return `${diff}일 남음`
}

const isOpen = (status: JobPostingStatus) =>
  !['rejected', 'closed'].includes(status)

const sortPostings = (items: JobPosting[]) =>
  [...items].sort((a, b) => {
    const aOpen = isOpen(a.status)
    const bOpen = isOpen(b.status)
    if (aOpen !== bOpen) return aOpen ? -1 : 1
    return dateDistance(a.deadline ?? a.resultDate) - dateDistance(b.deadline ?? b.resultDate)
  })

const inferFromText = (text: string) => {
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean)
  const deadline = inferDate(text)
  const keywords = inferKeywords(text)
  return {
    company: lines.find(line => /회사|기업|주식회사|\(주\)/.test(line)) ?? lines[1] ?? '',
    position: lines.find(line => /개발|디자이너|기획|PM|마케터|엔지니어|프론트|백엔드/.test(line)) ?? lines[0] ?? '',
    deadline,
    keywords,
  }
}

export default function JobPostings() {
  const { jobPostings, setJobPostings } = useApp()
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrStatus, setOcrStatus] = useState('')

  const applyDraftToForm = () => {
    const text = `${form.sourceUrl}\n${form.imageText}`
    const inferred = inferFromText(text)
    const platform = detectPlatform(form.sourceUrl)
    setForm(previous => ({
      ...previous,
      platform,
      company: previous.company || inferred.company,
      position: previous.position || inferred.position,
      deadline: previous.deadline || inferred.deadline,
      keywords: previous.keywords || inferred.keywords.join(', '),
    }))
  }

  const runOcr = async (file?: File) => {
    if (!file) return
    setOcrBusy(true)
    setOcrStatus('OCR 준비 중')
    let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | null = null
    try {
      const { createWorker } = await import('tesseract.js')
      worker = await createWorker('kor+eng', 1, {
        logger: message => setOcrStatus(message.status),
      })
      await worker.setParameters({ preserve_interword_spaces: '1' })
      const result = await worker.recognize(file)
      const text = result.data.text.trim()
      if (text) {
        setForm(previous => ({
          ...previous,
          imageText: previous.imageText.trim() ? `${previous.imageText.trim()}\n\n${text}` : text,
        }))
        setOcrStatus('OCR 완료')
      } else {
        setOcrStatus('읽힌 텍스트 없음')
      }
    } catch (error) {
      console.error(error)
      setOcrStatus('OCR 실패')
    } finally {
      if (worker) await worker.terminate()
      setOcrBusy(false)
    }
  }

  const addPosting = () => {
    const position = form.position.trim()
    const company = form.company.trim()
    if (!position && !company) return
    const now = new Date().toISOString()
    const posting: JobPosting = {
      id: `job-posting-${Date.now()}`,
      company: company || '회사 미정',
      position: position || '포지션 미정',
      platform: form.platform,
      status: form.status,
      deadline: form.deadline || undefined,
      appliedDate: form.appliedDate || undefined,
      resultDate: form.resultDate || undefined,
      location: form.location.trim() || undefined,
      employmentType: form.employmentType.trim() || undefined,
      sourceUrl: form.sourceUrl.trim() || undefined,
      imageText: form.imageText.trim() || undefined,
      keywords: splitTokens(form.keywords),
      nextAction: form.nextAction.trim() || undefined,
      note: form.note.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }
    setJobPostings(previous => [posting, ...previous])
    setForm(emptyForm())
    setOcrStatus('')
  }

  const updatePosting = (id: string, patch: Partial<JobPosting>) => {
    setJobPostings(previous => previous.map(item =>
      item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
    ))
  }

  const removePosting = (id: string) => {
    if (!window.confirm('이 지원 공고 기록을 삭제할까요?')) return
    setJobPostings(previous => previous.filter(item => item.id !== id))
  }

  const sorted = useMemo(() => sortPostings(jobPostings), [jobPostings])
  const visible = sorted.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter
    const haystack = [
      item.company, item.position, PLATFORM_LABELS[item.platform], STATUS_LABELS[item.status],
      item.location, item.employmentType, item.nextAction, item.note, item.keywords?.join(' '),
    ].filter(Boolean).join(' ').toLowerCase()
    return matchesFilter && haystack.includes(query.trim().toLowerCase())
  })
  const activeItems = jobPostings.filter(item => isOpen(item.status))
  const appliedItems = jobPostings.filter(item => ['applied', 'interview', 'offer'].includes(item.status))
  const interviewItems = jobPostings.filter(item => item.status === 'interview')
  const upcoming = sorted.filter(item => isOpen(item.status) && item.deadline).slice(0, 3)
  const nextAction = sorted.find(item => isOpen(item.status) && item.nextAction)

  return (
    <div className="job-page">
      <header className="job-header">
        <div>
          <h2>지원 공고 모음</h2>
          <p>사람인, 잡플래닛, 원티드, 점핏, 그룹바이 등에서 본 공고를 링크·이미지 텍스트·키워드와 함께 따로 모아 둡니다.</p>
        </div>
      </header>

      <section className="job-summary">
        <Summary label="열린 공고" value={`${activeItems.length}개`} sub="불합격/마감 제외" />
        <Summary label="지원 이후" value={`${appliedItems.length}개`} sub="지원·면접·오퍼" />
        <Summary label="면접" value={`${interviewItems.length}개`} sub={interviewItems[0]?.company ?? '대기 없음'} />
        <Summary label="가까운 마감" value={upcoming[0] ? dateBadge(upcoming[0].deadline) : '-'} sub={upcoming[0]?.position ?? '마감 없음'} />
      </section>

      <section className="job-board">
        <article className="job-next">
          <span>다음 행동</span>
          <strong>{nextAction?.nextAction ?? '등록된 다음 행동 없음'}</strong>
          <p>{nextAction ? `${nextAction.company} · ${nextAction.position}` : '지원서 수정, 포트폴리오 첨부, 면접 준비 같은 다음 행동을 남겨두세요.'}</p>
        </article>
        <article className="job-platforms">
          <span>플랫폼 분포</span>
          <div>
            {PLATFORMS.map(platform => {
              const count = jobPostings.filter(item => item.platform === platform).length
              return <small key={platform}>{PLATFORM_LABELS[platform]} {count}</small>
            })}
          </div>
        </article>
      </section>

      <section className="job-add">
        <div className="job-add-main">
          <input value={form.company} onChange={event => setForm(prev => ({ ...prev, company: event.target.value }))} placeholder="회사" />
          <input value={form.position} onChange={event => setForm(prev => ({ ...prev, position: event.target.value }))} placeholder="포지션" />
          <select value={form.platform} onChange={event => setForm(prev => ({ ...prev, platform: event.target.value as JobPostingPlatform }))}>
            {PLATFORMS.map(platform => <option key={platform} value={platform}>{PLATFORM_LABELS[platform]}</option>)}
          </select>
          <select value={form.status} onChange={event => setForm(prev => ({ ...prev, status: event.target.value as JobPostingStatus }))}>
            {STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
          <input type="date" value={form.deadline} onChange={event => setForm(prev => ({ ...prev, deadline: event.target.value }))} />
        </div>
        <div className="job-add-link">
          <input value={form.sourceUrl} onChange={event => setForm(prev => ({ ...prev, sourceUrl: event.target.value }))} placeholder="공고 링크" />
          <button type="button" onClick={applyDraftToForm}>링크/텍스트 반영</button>
          <label>
            이미지 OCR
            <input type="file" accept="image/*" onChange={event => runOcr(event.target.files?.[0])} disabled={ocrBusy} />
          </label>
        </div>
        <textarea value={form.imageText} onChange={event => setForm(prev => ({ ...prev, imageText: event.target.value }))} placeholder="공고 이미지 OCR 텍스트나 주요 내용을 붙여넣으세요." rows={4} />
        <div className="job-add-extra">
          <input value={form.keywords} onChange={event => setForm(prev => ({ ...prev, keywords: event.target.value }))} placeholder="키워드: React, UI, 신입" />
          <input value={form.nextAction} onChange={event => setForm(prev => ({ ...prev, nextAction: event.target.value }))} placeholder="다음 행동: 이력서 수정" />
          <button type="button" onClick={addPosting}>추가</button>
        </div>
        {ocrStatus && <small className="ocr-status">{ocrStatus}</small>}
      </section>

      <section className="job-tools">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="검색: 회사, 포지션, 플랫폼, 키워드" />
        <div>
          {(['all', ...STATUSES] as Filter[]).map(status => (
            <button key={status} type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>
              {status === 'all' ? '전체' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </section>

      <section className="job-list">
        {visible.length === 0 ? (
          <p className="empty-text">모아둘 지원 공고를 추가하세요.</p>
        ) : visible.map(item => (
          <article key={item.id} className={`job-card ${item.status}`}>
            <div className="job-card-top">
              <input value={item.company} onChange={event => updatePosting(item.id, { company: event.target.value })} />
              <input value={item.position} onChange={event => updatePosting(item.id, { position: event.target.value })} />
              <span>{STATUS_LABELS[item.status]}</span>
            </div>
            <div className="job-card-grid">
              <label>플랫폼<select value={item.platform} onChange={event => updatePosting(item.id, { platform: event.target.value as JobPostingPlatform })}>{PLATFORMS.map(platform => <option key={platform} value={platform}>{PLATFORM_LABELS[platform]}</option>)}</select></label>
              <label>상태<select value={item.status} onChange={event => updatePosting(item.id, { status: event.target.value as JobPostingStatus })}>{STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
              <label>마감<input type="date" value={item.deadline ?? ''} onChange={event => updatePosting(item.id, { deadline: event.target.value })} /></label>
              <label>지원일<input type="date" value={item.appliedDate ?? ''} onChange={event => updatePosting(item.id, { appliedDate: event.target.value })} /></label>
              <label>결과일<input type="date" value={item.resultDate ?? ''} onChange={event => updatePosting(item.id, { resultDate: event.target.value })} /></label>
              <label>지역<input value={item.location ?? ''} onChange={event => updatePosting(item.id, { location: event.target.value })} /></label>
            </div>
            <div className="job-card-grid two">
              <label>고용형태<input value={item.employmentType ?? ''} onChange={event => updatePosting(item.id, { employmentType: event.target.value })} /></label>
              <label>키워드<input value={joinTokens(item.keywords)} onChange={event => updatePosting(item.id, { keywords: splitTokens(event.target.value) })} /></label>
            </div>
            <label className="wide-label">다음 행동<input value={item.nextAction ?? ''} onChange={event => updatePosting(item.id, { nextAction: event.target.value })} placeholder="예: 자기소개서 2번 문항 수정" /></label>
            <label className="wide-label">공고 링크<input value={item.sourceUrl ?? ''} onChange={event => updatePosting(item.id, { sourceUrl: event.target.value, platform: detectPlatform(event.target.value) })} /></label>
            <textarea value={item.imageText ?? ''} onChange={event => updatePosting(item.id, { imageText: event.target.value })} placeholder="공고 이미지/OCR 텍스트" rows={3} />
            <textarea value={item.note ?? ''} onChange={event => updatePosting(item.id, { note: event.target.value })} placeholder="메모" rows={3} />
            <div className="job-card-actions">
              {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">공고 열기</a>}
              <small>{PLATFORM_LABELS[item.platform]} · {dateBadge(item.deadline)}</small>
              <button type="button" onClick={() => removePosting(item.id)}>삭제</button>
            </div>
          </article>
        ))}
      </section>

      <style>{`
        .job-page { max-width: 1180px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 16px; }
        .job-header h2 { margin: 0 0 6px; font-size: 24px; letter-spacing: 0; }
        .job-header p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        .job-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .job-summary-card, .job-next, .job-platforms, .job-add, .job-tools, .job-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; }
        .job-summary-card { padding: 13px; min-width: 0; }
        .job-summary-card span, .job-next span, .job-platforms > span { color: var(--accent); font-size: 11px; font-weight: 900; }
        .job-summary-card b { display: block; margin: 5px 0 3px; font-size: 21px; }
        .job-summary-card small { display: block; color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .job-board { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr); gap: 12px; }
        .job-next, .job-platforms { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .job-next strong { font-size: 18px; overflow-wrap: anywhere; }
        .job-next p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
        .job-platforms > div { display: flex; flex-wrap: wrap; gap: 7px; }
        .job-platforms small { border-radius: 999px; background: var(--bg3); color: var(--muted); padding: 6px 9px; font-size: 11px; font-weight: 800; }
        .job-add { padding: 12px; display: flex; flex-direction: column; gap: 9px; }
        .job-add-main { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) 120px 120px 138px; gap: 8px; }
        .job-add-link { display: grid; grid-template-columns: minmax(0, 1fr) auto 150px; gap: 8px; align-items: center; }
        .job-add-extra { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 8px; }
        .job-add input, .job-add select, .job-add textarea, .job-tools input, .job-card input, .job-card select, .job-card textarea { min-width: 0; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); font-family: inherit; font-size: 13px; outline: none; }
        .job-add input, .job-add select, .job-tools input, .job-card input, .job-card select { height: 34px; padding: 0 9px; }
        .job-add textarea, .job-card textarea { padding: 9px; resize: vertical; line-height: 1.5; }
        .job-add button { height: 34px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 13px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .job-add-link label { height: 34px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); display: grid; place-items: center; font-size: 12px; font-weight: 800; cursor: pointer; overflow: hidden; }
        .job-add-link input[type="file"] { display: none; }
        .ocr-status { color: var(--muted); font-size: 11px; }
        .job-tools { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        .job-tools > div { display: flex; flex-wrap: wrap; gap: 6px; }
        .job-tools button { min-height: 31px; border: 1px solid var(--border); border-radius: 999px; background: var(--bg3); color: var(--muted); padding: 0 11px; font-size: 12px; cursor: pointer; }
        .job-tools button.active { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); font-weight: 800; }
        .job-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .job-card { padding: 13px; display: flex; flex-direction: column; gap: 10px; border-left: 4px solid var(--accent); }
        .job-card.rejected, .job-card.closed { border-left-color: var(--muted); opacity: 0.82; }
        .job-card-top { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr) auto; gap: 8px; align-items: center; }
        .job-card-top input { border-color: transparent; background: transparent; padding-left: 0; font-weight: 900; font-size: 15px; }
        .job-card-top span { border-radius: 999px; background: var(--accent-soft); color: var(--accent); padding: 4px 8px; font-size: 10px; font-weight: 900; white-space: nowrap; }
        .job-card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .job-card-grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .job-card label { min-width: 0; display: flex; flex-direction: column; gap: 5px; color: var(--muted); font-size: 11px; font-weight: 800; }
        .wide-label { width: 100%; }
        .job-card-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .job-card-actions a { color: var(--accent); font-size: 12px; font-weight: 800; text-decoration: none; }
        .job-card-actions small { color: var(--muted); font-size: 11px; }
        .job-card-actions button { border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 11px; padding: 6px; }
        .empty-text { grid-column: 1 / -1; margin: 0; padding: 36px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); color: var(--muted); text-align: center; }
        @media (max-width: 980px) {
          .job-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .job-board, .job-list { grid-template-columns: 1fr; }
          .job-add-main, .job-add-link, .job-add-extra, .job-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 560px) {
          .job-summary, .job-add-main, .job-add-link, .job-add-extra, .job-card-grid, .job-card-grid.two, .job-card-top { grid-template-columns: 1fr; }
          .job-card-actions { align-items: flex-start; flex-direction: column; }
        }
      `}</style>
    </div>
  )
}

function Summary({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="job-summary-card">
      <span>{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </article>
  )
}
