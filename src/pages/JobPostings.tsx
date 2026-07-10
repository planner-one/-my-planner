import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { JobPosting, JobPostingPlatform, JobPostingStatus } from '../types'
import { toLocalDateKey } from '../utils/date'
import {
  buildJobPostingLinkDraft,
  detectJobPlatform,
  hasUsefulJobText,
  inferJobPostingFromText,
  mergeTokenLists,
  normalizeJobUrl,
  type JobPostingDraft,
} from '../utils/jobPostingDraft'
import { getJobPostingImageBlob, getJobPostingPageText } from '../services/jobPostingPageReader'
import { Drawer } from '../components/ui/Drawer'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PageHeader } from '../components/ui/PageHeader'
import { useToast } from '../components/ui/ToastProvider'

const PLATFORMS: JobPostingPlatform[] = ['saramin', 'jobplanet', 'wanted', 'jumpit', 'groupby', 'incruit', 'company', 'other']
const STATUSES: JobPostingStatus[] = ['saved', 'preparing', 'applied', 'interview', 'offer', 'rejected', 'closed']

const PLATFORM_LABELS: Record<JobPostingPlatform, string> = {
  saramin: '사람인',
  jobplanet: '잡플래닛',
  wanted: '원티드',
  jumpit: '점핏',
  groupby: '그룹바이',
  incruit: '인크루트',
  company: '기업/기관',
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

const APPLIED_STATUSES: JobPostingStatus[] = ['applied', 'interview', 'offer']

type Filter = 'all' | JobPostingStatus

const splitTokens = (value: string) =>
  value.split(',').map(item => item.trim()).filter(Boolean)

const joinTokens = (items?: string[]) => (items ?? []).join(', ')

const mergeTokens = (current: string | string[] | undefined, next: string[]) => {
  const base = Array.isArray(current) ? current : splitTokens(current ?? '')
  return mergeTokenLists(base, next)
}

const hasValue = (value?: string) => Boolean(value?.trim())

const isPlaceholderCompany = (value?: string) =>
  !value?.trim() || ['기업 미정', '회사 미정', '사람인', '원티드', '잡플래닛', '점핏', '그룹바이', 'saramin', 'wanted', 'jobplanet', 'jumpit', 'groupby'].includes(value.trim().toLowerCase())

const isPlaceholderPosition = (value?: string) =>
  !value?.trim() || ['공고 확인 필요', '포지션 미정'].includes(value.trim())

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

type JobPostingForm = ReturnType<typeof emptyForm>

type CodexAnalysisField =
  | 'company'
  | 'position'
  | 'deadline'
  | 'location'
  | 'employmentType'
  | 'keywords'
  | 'nextAction'
  | 'responsibilities'
  | 'requirements'
  | 'preferred'
  | 'benefits'
  | 'process'
  | 'documents'
  | 'etc'
  | 'uncertainties'

type CodexAnalysisDraft = Partial<Record<CodexAnalysisField, string>>

const CODEX_RESULT_LABELS: Array<[CodexAnalysisField, RegExp]> = [
  ['company', /^(회사|기업|기업명|기관|기관명|회사\/기관|company)$/i],
  ['position', /^(포지션|직무|채용\s*직무|채용\s*분야|모집\s*직무|모집\s*부문|role|position)$/i],
  ['deadline', /^(마감일|지원\s*마감|접수\s*마감|마감|deadline)$/i],
  ['location', /^(근무지|근무\s*지역|지역|소재지|location)$/i],
  ['employmentType', /^(고용형태|근무형태|채용\s*구분|employment\s*type)$/i],
  ['keywords', /^(키워드|기술스택|기술\s*스택|스택|skills?|keywords?)$/i],
  ['nextAction', /^(다음\s*행동|다음\s*액션|준비\s*할\s*일)$/],
  ['responsibilities', /^(주요\s*업무|담당\s*업무|업무|responsibilities?)$/i],
  ['requirements', /^(자격요건|지원\s*자격|응시\s*자격|필수\s*조건|requirements?|qualifications?)$/i],
  ['preferred', /^(우대사항|우대\s*조건|preferred\s*qualifications?)$/i],
  ['benefits', /^(복지|혜택|복지\/혜택|복지\s*및\s*혜택|혜택\s*및\s*복지|복리후생|근무\s*환경|benefits?)$/i],
  ['process', /^(전형절차|채용\s*절차|전형\s*과정|전형\s*일정|전형\s*단계|채용\s*프로세스|process)$/i],
  ['documents', /^(제출서류|제출\s*서류|필요\s*서류|필요\s*문서|documents?)$/i],
  ['etc', /^(기타사항|기타|유의사항|추가사항|notes?)$/i],
  ['uncertainties', /^(불확실한\s*점|확인\s*필요|확인할\s*점)$/],
]

const NOTE_SECTION_LABELS: Array<[CodexAnalysisField, string]> = [
  ['responsibilities', '주요 업무'],
  ['requirements', '자격요건'],
  ['preferred', '우대사항'],
  ['benefits', '복지/혜택'],
  ['process', '전형절차'],
  ['documents', '제출서류'],
  ['etc', '기타사항'],
  ['uncertainties', '확인 필요'],
]

const stripBullet = (value: string) =>
  value.replace(/^\s*[-*•▪·ㆍ]\s*/, '').trim()

const cleanCodexValue = (value?: string) => {
  const cleaned = (value ?? '')
    .split(/\n+/)
    .map(stripBullet)
    .filter(Boolean)
    .join('\n')
    .trim()
  if (!cleaned || /^(없음|미정|알\s*수\s*없음|확인\s*필요|해당\s*없음)$/i.test(cleaned)) return ''
  return cleaned
}

const normalizeCodexDate = (value?: string) => {
  const cleaned = cleanCodexValue(value)
  if (!cleaned || /상시|채용\s*시|수시|없음|미정|확인/i.test(cleaned)) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  const match = cleaned.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/)
  if (!match) return ''
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
}

const parseCodexKeywords = (value?: string) =>
  cleanCodexValue(value)
    .split(/[,\n/·|]+/)
    .map(item => stripBullet(item).replace(/^#+\s*/, '').trim())
    .filter(Boolean)

const findCodexField = (label: string): CodexAnalysisField | null => {
  const normalized = label.replace(/^#+\s*/, '').replace(/\s+/g, ' ').trim()
  const found = CODEX_RESULT_LABELS.find(([, matcher]) => matcher.test(normalized))
  return found?.[0] ?? null
}

const parseCodexAnalysisResult = (text: string): CodexAnalysisDraft => {
  const draft: CodexAnalysisDraft = {}
  let currentField: CodexAnalysisField | null = null

  text.split(/\n+/).forEach(rawLine => {
    const line = rawLine.trim()
    if (!line) return
    const normalized = line.replace(/^[-*•▪·ㆍ]\s*/, '').trim()
    const labelMatch = normalized.match(/^#{0,4}\s*([^:：]+?)\s*[:：]\s*(.*)$/)
    const headingField = findCodexField(normalized)
    const field = labelMatch ? findCodexField(labelMatch[1]) : headingField

    if (field) {
      currentField = field
      const value = labelMatch ? labelMatch[2].trim() : ''
      if (value) draft[field] = [draft[field], value].filter(Boolean).join('\n')
      return
    }

    if (currentField) {
      draft[currentField] = [draft[currentField], line].filter(Boolean).join('\n')
    }
  })

  return draft
}

const formatCodexNote = (draft: CodexAnalysisDraft, fallback: string) => {
  const sections = NOTE_SECTION_LABELS
    .map(([field, label]) => {
      const value = cleanCodexValue(draft[field])
      return value ? `${label}\n${value}` : ''
    })
    .filter(Boolean)
  return sections.length ? sections.join('\n\n') : fallback.trim()
}

const buildCodexAnalysisPrompt = (form: JobPostingForm, linkDraftUrl: string, linkDraftText: string) => {
  const sourceUrl = form.sourceUrl.trim() || linkDraftUrl.trim()
  const currentValues = [
    form.company.trim() && `회사: ${form.company.trim()}`,
    form.position.trim() && `포지션: ${form.position.trim()}`,
    form.deadline && `마감일: ${form.deadline}`,
    form.location.trim() && `근무지: ${form.location.trim()}`,
    form.employmentType.trim() && `고용형태: ${form.employmentType.trim()}`,
    form.keywords.trim() && `키워드: ${form.keywords.trim()}`,
    form.nextAction.trim() && `다음 행동: ${form.nextAction.trim()}`,
  ].filter(Boolean).join('\n')

  return [
    '아래 지원공고를 플래너에 저장할 수 있게 구조화해줘.',
    '',
    '출력은 아래 라벨을 그대로 쓰고, 모르는 값은 "확인 필요"라고 적어줘.',
    '',
    '회사:',
    '포지션:',
    '마감일:',
    '근무지:',
    '고용형태:',
    '키워드:',
    '다음 행동:',
    '주요 업무:',
    '자격요건:',
    '우대사항:',
    '복지/혜택:',
    '전형절차:',
    '제출서류:',
    '기타사항:',
    '불확실한 점:',
    '',
    sourceUrl ? `공고 링크:\n${sourceUrl}` : '',
    currentValues ? `현재 플래너 입력값:\n${currentValues}` : '',
    linkDraftText.trim() ? `페이지 내용 붙여넣기:\n${linkDraftText.trim()}` : '',
    form.imageText.trim() ? `공고 원문/OCR:\n${form.imageText.trim()}` : '',
    form.note.trim() ? `기존 추출 상세/메모:\n${form.note.trim()}` : '',
  ].filter(Boolean).join('\n\n')
}

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

const needsAppliedDate = (status: JobPostingStatus) =>
  APPLIED_STATUSES.includes(status)

const shouldShowAppliedDate = (item: Pick<JobPosting, 'status' | 'appliedDate'>) =>
  needsAppliedDate(item.status) || Boolean(item.appliedDate)

const sortPostings = (items: JobPosting[]) =>
  [...items].sort((a, b) => {
    const aOpen = isOpen(a.status)
    const bOpen = isOpen(b.status)
    if (aOpen !== bOpen) return aOpen ? -1 : 1
    return dateDistance(a.deadline ?? a.resultDate) - dateDistance(b.deadline ?? b.resultDate)
  })

export default function JobPostings() {
  const { showToast } = useToast()
  const { jobPostings, setJobPostings } = useApp()
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrStatus, setOcrStatus] = useState('')
  const [linkDraftUrl, setLinkDraftUrl] = useState('')
  const [linkDraftText, setLinkDraftText] = useState('')
  const [linkDraftStatus, setLinkDraftStatus] = useState('')
  const [linkDraftBusy, setLinkDraftBusy] = useState(false)
  const [showManualLinkText, setShowManualLinkText] = useState(false)
  const [linkImageUrls, setLinkImageUrls] = useState<string[]>([])
  const [codexAnalysisText, setCodexAnalysisText] = useState('')
  const [codexStatus, setCodexStatus] = useState('')
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const applyLinkDraftToForm = async () => {
    setLinkDraftBusy(true)
    try {
      const normalizedUrl = normalizeJobUrl(linkDraftUrl)
      const pageTextResult = await getJobPostingPageText(normalizedUrl)
      setLinkImageUrls(pageTextResult.imageUrls)
      const usefulPageText = hasUsefulJobText(pageTextResult.text) ? pageTextResult.text : ''
      const manualText = [linkDraftText, form.imageText].filter(Boolean).join('\n')
      const draftText = [usefulPageText, manualText].filter(Boolean).join('\n')
      const draft = buildJobPostingLinkDraft(normalizedUrl, draftText)
      const hasReadableContent = Boolean(draftText.trim())
      const hasExtractedDraft = hasReadableContent && Boolean(
        draft.company ||
        draft.position ||
        draft.deadline ||
        draft.location ||
        draft.employmentType ||
        draft.keywords.length ||
        draft.note,
      )
      setForm(previous => ({
        ...previous,
        sourceUrl: draft.sourceUrl ?? previous.sourceUrl,
        platform: draft.platform ?? previous.platform,
        status: previous.status === 'saved' ? 'preparing' : previous.status,
        company: !isPlaceholderCompany(previous.company)
          ? previous.company
          : hasReadableContent ? draft.company || previous.company || '기업 미정' : previous.company,
        position: !isPlaceholderPosition(previous.position)
          ? previous.position
          : hasReadableContent ? draft.position || previous.position || '공고 확인 필요' : previous.position,
        deadline: hasReadableContent ? previous.deadline || draft.deadline : previous.deadline,
        location: hasReadableContent ? previous.location || draft.location : previous.location,
        employmentType: hasReadableContent ? previous.employmentType || draft.employmentType : previous.employmentType,
        keywords: hasReadableContent ? joinTokens(mergeTokens(previous.keywords, draft.keywords)) : previous.keywords,
        note: hasReadableContent ? previous.note.trim() ? previous.note : draft.note : previous.note,
        nextAction: previous.nextAction || '공고 확인 후 지원서 맞춤 수정',
      }))
      const source = usefulPageText
        ? pageTextResult.source === 'reader' ? 'Reader로 읽은 링크 본문과 보조 텍스트' : '링크 본문과 보조 텍스트'
        : manualText ? '붙여넣은 공고 내용과 링크 주소' : '링크 주소'
      const imageNotice = pageTextResult.imageUrls.length ? ` 페이지 이미지 후보 ${pageTextResult.imageUrls.length}개도 찾았습니다.` : ''
      setShowManualLinkText(!hasExtractedDraft || Boolean(linkDraftText.trim()))
      setLinkDraftStatus(hasExtractedDraft
        ? `${source}를 바탕으로 초안을 반영했습니다.${imageNotice}`
        : pageTextResult.imageUrls.length
          ? '링크 본문은 공고 텍스트로 읽지 못했지만 페이지 이미지 후보를 찾았습니다. 페이지 이미지 OCR을 시도해 보세요.'
          : '링크 주소만으로는 공고 본문을 추출하지 못했습니다. 아래 페이지 내용 붙여넣기 칸에 공고 내용을 넣고 다시 반영하면 기업명, 직무, 마감일, 조건을 채웁니다.')
    } catch {
      setLinkImageUrls([])
      setShowManualLinkText(false)
      setLinkDraftStatus('올바른 공고 링크를 입력해 주세요.')
    } finally {
      setLinkDraftBusy(false)
    }
  }

  const applyDraftToPosting = async (item: JobPosting) => {
    if (!item.sourceUrl) return
    setLinkDraftBusy(true)
    try {
      const normalizedUrl = normalizeJobUrl(item.sourceUrl)
      const pageTextResult = await getJobPostingPageText(normalizedUrl)
      setLinkImageUrls(pageTextResult.imageUrls)
      const usefulPageText = hasUsefulJobText(pageTextResult.text) ? pageTextResult.text : ''
      const draftText = [usefulPageText, item.imageText ?? ''].filter(Boolean).join('\n')
      const hasReadableContent = Boolean(draftText.trim())
      const draft = buildJobPostingLinkDraft(normalizedUrl, draftText)
      updatePosting(item.id, {
        sourceUrl: draft.sourceUrl,
        platform: draft.platform,
        company: !isPlaceholderCompany(item.company) ? item.company : hasReadableContent ? draft.company || item.company || '기업 미정' : item.company,
        position: !isPlaceholderPosition(item.position) ? item.position : hasReadableContent ? draft.position || item.position || '공고 확인 필요' : item.position,
        deadline: hasReadableContent ? item.deadline || draft.deadline || undefined : item.deadline,
        location: hasReadableContent ? item.location || draft.location || undefined : item.location,
        employmentType: hasReadableContent ? item.employmentType || draft.employmentType || undefined : item.employmentType,
        keywords: hasReadableContent ? mergeTokens(item.keywords, draft.keywords) : item.keywords,
        note: hasReadableContent ? item.note || draft.note || undefined : item.note,
      })
      const source = usefulPageText
        ? pageTextResult.source === 'reader' ? 'Reader로 저장 공고 링크를 다시 분석했습니다.' : '저장 공고 링크 본문을 다시 분석했습니다.'
        : hasReadableContent ? '저장 공고 링크 주소와 기존 OCR 텍스트를 기준으로 다시 반영했습니다.' : '저장 공고 링크 본문을 추출하지 못했습니다. 공고 원문/OCR 칸을 채운 뒤 다시 반영해 주세요.'
      setLinkDraftStatus(pageTextResult.imageUrls.length ? `${source} 페이지 이미지 후보 ${pageTextResult.imageUrls.length}개도 찾았습니다.` : source)
    } catch {
      showToast({ message: '공고 링크를 확인한 뒤 다시 시도해 주세요.', tone: 'danger' })
    } finally {
      setLinkDraftBusy(false)
    }
  }

  const applyTextDraftToForm = () => {
    const url = form.sourceUrl || linkDraftUrl
    if (!url && !form.imageText.trim()) return
    try {
      const draft: JobPostingDraft = url
        ? buildJobPostingLinkDraft(url, form.imageText)
        : inferJobPostingFromText(form.imageText)
      setForm(previous => ({
        ...previous,
        sourceUrl: draft.sourceUrl ?? previous.sourceUrl,
        platform: draft.platform ?? previous.platform,
        company: !isPlaceholderCompany(previous.company) ? previous.company : draft.company || previous.company,
        position: !isPlaceholderPosition(previous.position) ? previous.position : draft.position || previous.position,
        deadline: previous.deadline || draft.deadline,
        location: previous.location || draft.location,
        employmentType: previous.employmentType || draft.employmentType,
        keywords: joinTokens(mergeTokens(previous.keywords, draft.keywords)),
        note: previous.note.trim() ? previous.note : draft.note,
      }))
      setOcrStatus('붙여넣은 공고 내용을 폼에 반영했습니다.')
    } catch {
      setOcrStatus('공고 내용 반영 실패')
    }
  }

  const copyCodexAnalysisPrompt = async () => {
    const prompt = buildCodexAnalysisPrompt(form, linkDraftUrl, linkDraftText)
    try {
      await navigator.clipboard.writeText(prompt)
      setCodexStatus('Codex 분석용 템플릿을 복사했습니다.')
    } catch {
      setCodexStatus('복사 권한이 막혔습니다. 링크, 원문/OCR, 기존 메모를 Codex에 직접 전달해 주세요.')
    }
  }

  const applyCodexAnalysisToForm = () => {
    const text = codexAnalysisText.trim()
    if (!text) return
    const parsed = parseCodexAnalysisResult(text)
    const textDraft = inferJobPostingFromText(text)
    const note = formatCodexNote(parsed, text)
    const nextKeywords = mergeTokenLists(parseCodexKeywords(parsed.keywords), textDraft.keywords)
    const deadline = normalizeCodexDate(parsed.deadline) || textDraft.deadline

    setForm(previous => ({
      ...previous,
      company: !isPlaceholderCompany(previous.company)
        ? previous.company
        : cleanCodexValue(parsed.company) || textDraft.company || previous.company,
      position: !isPlaceholderPosition(previous.position)
        ? previous.position
        : cleanCodexValue(parsed.position) || textDraft.position || previous.position,
      deadline: previous.deadline || deadline,
      location: previous.location || cleanCodexValue(parsed.location) || textDraft.location,
      employmentType: previous.employmentType || cleanCodexValue(parsed.employmentType) || textDraft.employmentType,
      keywords: joinTokens(mergeTokens(previous.keywords, nextKeywords)),
      nextAction: previous.nextAction || cleanCodexValue(parsed.nextAction) || '공고 확인 후 지원서 맞춤 수정',
      note: note || previous.note,
    }))
    setCodexStatus('Codex 분석 결과를 작성 폼에 반영했습니다.')
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

  const runPageImageOcr = async (imageUrl = linkImageUrls[0]) => {
    if (!imageUrl) return
    setOcrBusy(true)
    setOcrStatus('페이지 이미지 불러오는 중')
    let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | null = null
    try {
      const imageBlob = await getJobPostingImageBlob(imageUrl)
      setOcrStatus('페이지 이미지 OCR 준비 중')
      const { createWorker } = await import('tesseract.js')
      worker = await createWorker('kor+eng', 1, {
        logger: message => setOcrStatus(message.status),
      })
      await worker.setParameters({ preserve_interword_spaces: '1' })
      const result = await worker.recognize(imageBlob)
      const text = result.data.text.trim()
      if (!text) {
        setOcrStatus('페이지 이미지에서 읽힌 텍스트 없음')
        return
      }
      const url = form.sourceUrl || linkDraftUrl
      const draft: JobPostingDraft = url
        ? buildJobPostingLinkDraft(url, [form.imageText, text].filter(Boolean).join('\n'))
        : inferJobPostingFromText([form.imageText, text].filter(Boolean).join('\n'))
      setForm(previous => ({
        ...previous,
        imageText: previous.imageText.trim() ? `${previous.imageText.trim()}\n\n${text}` : text,
        sourceUrl: draft.sourceUrl ?? previous.sourceUrl,
        platform: draft.platform ?? previous.platform,
        company: !isPlaceholderCompany(previous.company) ? previous.company : draft.company || previous.company,
        position: !isPlaceholderPosition(previous.position) ? previous.position : draft.position || previous.position,
        deadline: previous.deadline || draft.deadline,
        location: previous.location || draft.location,
        employmentType: previous.employmentType || draft.employmentType,
        keywords: joinTokens(mergeTokens(previous.keywords, draft.keywords)),
        note: previous.note.trim() ? previous.note : draft.note,
      }))
      setOcrStatus('페이지 이미지 OCR 완료, 폼에 반영했습니다.')
    } catch (error) {
      console.error(error)
      setOcrStatus('페이지 이미지 OCR 실패')
    } finally {
      if (worker) await worker.terminate()
      setOcrBusy(false)
    }
  }

  const addPosting = () => {
    const position = form.position.trim()
    const company = form.company.trim()
    const sourceUrl = form.sourceUrl.trim()
    if (!position && !company && !sourceUrl) return
    const now = new Date().toISOString()
    const appliedDate = form.appliedDate || (needsAppliedDate(form.status) ? toLocalDateKey() : '')
    const posting: JobPosting = {
      id: `job-posting-${Date.now()}`,
      company: company || '기업 미정',
      position: position || '공고 확인 필요',
      platform: form.platform,
      status: form.status,
      deadline: form.deadline || undefined,
      appliedDate: appliedDate || undefined,
      resultDate: form.resultDate || undefined,
      location: form.location.trim() || undefined,
      employmentType: form.employmentType.trim() || undefined,
      sourceUrl: sourceUrl || undefined,
      imageText: form.imageText.trim() || undefined,
      keywords: splitTokens(form.keywords),
      nextAction: form.nextAction.trim() || undefined,
      note: form.note.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }
    setJobPostings(previous => [posting, ...previous])
    setSelectedPostingId(posting.id)
    setForm(emptyForm())
    setLinkDraftUrl('')
    setLinkDraftText('')
    setLinkDraftStatus('')
    setShowManualLinkText(false)
    setLinkImageUrls([])
    setCodexAnalysisText('')
    setCodexStatus('')
    setOcrStatus('')
  }

  const updatePosting = (id: string, patch: Partial<JobPosting>) => {
    setJobPostings(previous => previous.map(item => {
      if (item.id !== id) return item
      const patchIncludesAppliedDate = Object.prototype.hasOwnProperty.call(patch, 'appliedDate')
      const appliedDate = patchIncludesAppliedDate
        ? patch.appliedDate
        : patch.status && needsAppliedDate(patch.status) && !item.appliedDate
          ? toLocalDateKey()
          : item.appliedDate
      return { ...item, ...patch, appliedDate, updatedAt: new Date().toISOString() }
    }))
  }

  const removePosting = (id: string) => {
    setDeleteId(id)
  }

  const confirmRemove = () => {
    if (!deleteId) return
    setJobPostings(previous => previous.filter(item => item.id !== deleteId))
    setSelectedPostingId(previous => previous === deleteId ? null : previous)
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
  const selectedPosting = selectedPostingId
    ? jobPostings.find(item => item.id === selectedPostingId) ?? null
    : null

  return (
    <div className="job-page">
      <PageHeader
        title="지원 공고"
        description="공고 링크와 지원 준비 정보를 한곳에서 비교하고 다음 행동을 관리합니다."
      />

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

      <details className="job-link-assist">
        <summary>
          <span>링크로 초안 만들기</span>
          <small>추후 프리미엄 후보</small>
        </summary>
        <div className="job-link-assist-body">
          <input
            value={linkDraftUrl}
            onChange={event => {
              setLinkDraftUrl(event.target.value)
              setLinkDraftStatus('')
              setLinkImageUrls([])
              if (!linkDraftText.trim()) setShowManualLinkText(false)
            }}
            placeholder="기업 채용 페이지, 인크루트, 사람인, 원티드 등 공고 링크"
          />
          <button type="button" onClick={applyLinkDraftToForm} disabled={linkDraftBusy}>
            {linkDraftBusy ? '분석 중' : '분석해서 폼에 반영'}
          </button>
          <p>
            기업 자체 채용 페이지와 인크루트 기업 도메인도 공고로 저장합니다.
            브라우저가 본문을 읽을 수 있으면 기업명과 직무를 함께 반영하고, 막히면 링크와 붙여넣은/OCR 텍스트를 기준으로 정리합니다.
          </p>
          {showManualLinkText && (
            <textarea
              value={linkDraftText}
              onChange={event => setLinkDraftText(event.target.value)}
              placeholder="자동 분석이 부족하면 페이지에 보이는 공고 내용을 그대로 붙여넣으세요."
              rows={4}
            />
          )}
          {linkImageUrls.length > 0 && (
            <div className="job-link-images">
              <span>페이지 이미지 후보 {linkImageUrls.length}개</span>
              <button type="button" onClick={() => runPageImageOcr()} disabled={ocrBusy}>
                {ocrBusy ? 'OCR 중' : '첫 이미지 OCR'}
              </button>
            </div>
          )}
          {linkDraftStatus && <small>{linkDraftStatus}</small>}
        </div>
      </details>

      <details className="job-codex-assist">
        <summary>
          <span>Codex로 정밀 정리</span>
          <small>API 비용 없음</small>
        </summary>
        <div className="job-codex-assist-body">
          <div>
            <button type="button" onClick={copyCodexAnalysisPrompt}>분석 템플릿 복사</button>
            <button type="button" className="secondary" onClick={applyCodexAnalysisToForm}>결과를 폼에 반영</button>
          </div>
          <textarea
            value={codexAnalysisText}
            onChange={event => {
              setCodexAnalysisText(event.target.value)
              setCodexStatus('')
            }}
            placeholder="Codex가 정리한 회사, 포지션, 마감일, 주요 업무, 자격요건, 우대사항, 복지/혜택, 전형절차를 붙여넣으세요."
            rows={7}
          />
          <p>
            템플릿에는 현재 링크, 공고 원문/OCR, 기존 메모가 함께 들어갑니다.
            Codex 답변을 붙여넣으면 지원 공고 폼의 핵심 필드와 추출 상세/메모로 정리합니다.
          </p>
          {codexStatus && <small>{codexStatus}</small>}
        </div>
      </details>

      <section className="job-add">
        <div className="job-section-heading">
          <div>
            <h3>빠른 추가</h3>
            <p>핵심 정보만 먼저 저장하고, 상세는 아래 목록에서 넓게 보정합니다.</p>
          </div>
          <small>공고 모으기 시작</small>
        </div>
        <div className="job-add-main">
          <label>
            <span>회사</span>
            <input value={form.company} onChange={event => setForm(prev => ({ ...prev, company: event.target.value }))} placeholder="회사" />
          </label>
          <label>
            <span>포지션</span>
            <input value={form.position} onChange={event => setForm(prev => ({ ...prev, position: event.target.value }))} placeholder="포지션" />
          </label>
          <label>
            <span>플랫폼</span>
            <select value={form.platform} onChange={event => setForm(prev => ({ ...prev, platform: event.target.value as JobPostingPlatform }))}>
              {PLATFORMS.map(platform => <option key={platform} value={platform}>{PLATFORM_LABELS[platform]}</option>)}
            </select>
          </label>
          <label>
            <span>상태</span>
            <select
              value={form.status}
              onChange={event => {
                const status = event.target.value as JobPostingStatus
                setForm(prev => ({
                  ...prev,
                  status,
                  appliedDate: prev.appliedDate || (needsAppliedDate(status) ? toLocalDateKey() : ''),
                }))
              }}
            >
              {STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
            </select>
          </label>
          <label>
            <span>마감일</span>
            <input type="date" value={form.deadline} onChange={event => setForm(prev => ({ ...prev, deadline: event.target.value }))} />
          </label>
        </div>
        {(needsAppliedDate(form.status) || form.appliedDate) && (
          <div className="job-add-dates">
            <label>지원일<input type="date" value={form.appliedDate} onChange={event => setForm(prev => ({ ...prev, appliedDate: event.target.value }))} /></label>
          </div>
        )}
        <div className="job-add-media">
          {form.sourceUrl ? <small>원본 링크 저장됨: {form.sourceUrl}</small> : <small>공고 링크는 위의 접힌 링크 초안 영역에서 넣습니다.</small>}
          <button type="button" className="secondary-action" onClick={applyTextDraftToForm}>붙여넣은 내용 반영</button>
          <label>
            이미지 OCR
            <input type="file" accept="image/*" onChange={event => runOcr(event.target.files?.[0])} disabled={ocrBusy} />
          </label>
        </div>
        <label className="job-detail-field">
          <span>추출 상세 / 메모</span>
          <textarea
            value={form.note}
            onChange={event => setForm(prev => ({ ...prev, note: event.target.value }))}
            placeholder="분석된 공고 상세 내용이 여기에 표시됩니다. 주요 업무, 기술스택, 소재지, 고용형태, 연봉/급여, 자격요건 등을 확인하고 보정하세요."
            rows={6}
          />
        </label>
        <textarea value={form.imageText} onChange={event => setForm(prev => ({ ...prev, imageText: event.target.value }))} placeholder="공고 원문, 이미지 OCR 텍스트, 직접 붙여넣은 주요 내용을 입력하세요." rows={4} />
        <div className="job-add-extra">
          <label>
            <span>키워드</span>
            <input value={form.keywords} onChange={event => setForm(prev => ({ ...prev, keywords: event.target.value }))} placeholder="키워드: React, UI, 신입" />
          </label>
          <label>
            <span>다음 행동</span>
            <input value={form.nextAction} onChange={event => setForm(prev => ({ ...prev, nextAction: event.target.value }))} placeholder="다음 행동: 이력서 수정" />
          </label>
          <div className="job-add-action">
            <button type="button" onClick={addPosting}>추가</button>
          </div>
        </div>
        {ocrStatus && <small className="ocr-status">{ocrStatus}</small>}
      </section>

      <section className="job-tools">
        <div className="job-section-heading compact">
          <div>
            <h3>검색과 상태 필터</h3>
            <p>회사, 포지션, 플랫폼, 키워드 기준으로 필요한 공고만 좁혀봅니다.</p>
          </div>
          <small>{visible.length}개 표시</small>
        </div>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="검색: 회사, 포지션, 플랫폼, 키워드" />
        <div>
          {(['all', ...STATUSES] as Filter[]).map(status => (
            <button key={status} type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>
              {status === 'all' ? '전체' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </section>

      <section className="job-list-shell">
        <div className="job-list-heading">
          <div>
            <h3>공고 목록</h3>
            <p>목록에는 입력된 핵심 정보만 보여주고, 항목을 열면 오른쪽에서 넓게 편집합니다.</p>
          </div>
          <small>{visible.length}개 표시</small>
        </div>
        <div className="job-list">
          {visible.length === 0 ? (
            <p className="empty-text">모아둘 지원 공고를 추가하세요.</p>
          ) : visible.map(item => {
            const keywords = item.keywords ?? []
            const selected = selectedPostingId === item.id
            return (
              <article key={item.id} className={`job-card job-card-compact ${item.status} ${selected ? 'selected' : ''}`}>
                <button type="button" className="job-card-open" onClick={() => setSelectedPostingId(item.id)}>
                  <div className="job-card-compact-top">
                    <div>
                      <h3>{item.company}</h3>
                      <strong>{item.position}</strong>
                    </div>
                    <span>{STATUS_LABELS[item.status]}</span>
                  </div>
                  <div className="job-card-tags">
                    <small>{PLATFORM_LABELS[item.platform]}</small>
                    {item.deadline && <small>{dateBadge(item.deadline)}</small>}
                    {item.appliedDate && <small>지원 {item.appliedDate}</small>}
                    {item.location && <small>{item.location}</small>}
                    {item.employmentType && <small>{item.employmentType}</small>}
                    {keywords.slice(0, 4).map(keyword => <small key={keyword}>{keyword}</small>)}
                  </div>
                  {item.nextAction && <p><b>다음 행동</b>{item.nextAction}</p>}
                  {item.note && <p className="job-card-note-preview">{item.note}</p>}
                </button>
                <div className="job-card-actions">
                  {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">공고 열기</a>}
                  <button type="button" onClick={() => setSelectedPostingId(item.id)}>자세히</button>
                  <button type="button" onClick={() => removePosting(item.id)}>삭제</button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <Drawer
        open={Boolean(selectedPosting)}
        onClose={() => setSelectedPostingId(null)}
        title={selectedPosting?.company ?? '지원 공고 상세'}
        description={selectedPosting ? `${selectedPosting.position} · ${STATUS_LABELS[selectedPosting.status]}` : undefined}
        width="lg"
        footer={selectedPosting && (
          <>
            {selectedPosting.sourceUrl && <a className="job-detail-open-link" href={selectedPosting.sourceUrl} target="_blank" rel="noreferrer">공고 열기</a>}
            <Button variant="danger" onClick={() => removePosting(selectedPosting.id)}>삭제</Button>
          </>
        )}
      >
        {selectedPosting && (
            <div className="job-detail-form">
              <label>회사<input value={selectedPosting.company} onChange={event => updatePosting(selectedPosting.id, { company: event.target.value })} /></label>
              <label>포지션<input value={selectedPosting.position} onChange={event => updatePosting(selectedPosting.id, { position: event.target.value })} /></label>
              <label>플랫폼<select value={selectedPosting.platform} onChange={event => updatePosting(selectedPosting.id, { platform: event.target.value as JobPostingPlatform })}>{PLATFORMS.map(platform => <option key={platform} value={platform}>{PLATFORM_LABELS[platform]}</option>)}</select></label>
              <label>상태<select value={selectedPosting.status} onChange={event => updatePosting(selectedPosting.id, { status: event.target.value as JobPostingStatus })}>{STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
              <label>마감<input type="date" value={selectedPosting.deadline ?? ''} onChange={event => updatePosting(selectedPosting.id, { deadline: event.target.value || undefined })} /></label>
              {shouldShowAppliedDate(selectedPosting) && <label>지원일<input type="date" value={selectedPosting.appliedDate ?? ''} onChange={event => updatePosting(selectedPosting.id, { appliedDate: event.target.value || undefined })} /></label>}
              {selectedPosting.resultDate && <label>결과일<input type="date" value={selectedPosting.resultDate} onChange={event => updatePosting(selectedPosting.id, { resultDate: event.target.value || undefined })} /></label>}
              {hasValue(selectedPosting.location) && <label>지역<input value={selectedPosting.location ?? ''} onChange={event => updatePosting(selectedPosting.id, { location: event.target.value || undefined })} /></label>}
              {hasValue(selectedPosting.employmentType) && <label>고용형태<input value={selectedPosting.employmentType ?? ''} onChange={event => updatePosting(selectedPosting.id, { employmentType: event.target.value || undefined })} /></label>}
              {(selectedPosting.keywords?.length ?? 0) > 0 && <label className="wide-label">키워드<input value={joinTokens(selectedPosting.keywords)} onChange={event => updatePosting(selectedPosting.id, { keywords: splitTokens(event.target.value) })} /></label>}
              {hasValue(selectedPosting.nextAction) && <label className="wide-label">다음 행동<input value={selectedPosting.nextAction ?? ''} onChange={event => updatePosting(selectedPosting.id, { nextAction: event.target.value || undefined })} /></label>}
              {hasValue(selectedPosting.sourceUrl) && (
                <label className="wide-label">공고 링크
                  <div className="job-card-link-row">
                    <input value={selectedPosting.sourceUrl ?? ''} onChange={event => updatePosting(selectedPosting.id, { sourceUrl: event.target.value || undefined, platform: detectJobPlatform(event.target.value) })} />
                    <button type="button" onClick={() => applyDraftToPosting(selectedPosting)} disabled={linkDraftBusy}>
                      {linkDraftBusy ? '분석 중' : '분석 반영'}
                    </button>
                  </div>
                </label>
              )}
              {hasValue(selectedPosting.note) && (
                <label className="wide-label">추출 상세 / 메모
                  <textarea value={selectedPosting.note ?? ''} onChange={event => updatePosting(selectedPosting.id, { note: event.target.value || undefined })} rows={8} />
                </label>
              )}
              {hasValue(selectedPosting.imageText) && (
                <label className="wide-label">공고 원문/OCR
                  <textarea value={selectedPosting.imageText ?? ''} onChange={event => updatePosting(selectedPosting.id, { imageText: event.target.value || undefined })} rows={5} />
                </label>
              )}

              <details className="job-detail-empty-fields">
                <summary>비어 있는 항목 추가</summary>
                <div>
                  {!shouldShowAppliedDate(selectedPosting) && <label>지원일<input type="date" value="" onChange={event => updatePosting(selectedPosting.id, { appliedDate: event.target.value || undefined })} /></label>}
                  {!selectedPosting.resultDate && <label>결과일<input type="date" value="" onChange={event => updatePosting(selectedPosting.id, { resultDate: event.target.value || undefined })} /></label>}
                  {!hasValue(selectedPosting.location) && <label>지역<input value="" onChange={event => updatePosting(selectedPosting.id, { location: event.target.value || undefined })} placeholder="예: 서울 강남구" /></label>}
                  {!hasValue(selectedPosting.employmentType) && <label>고용형태<input value="" onChange={event => updatePosting(selectedPosting.id, { employmentType: event.target.value || undefined })} placeholder="예: 정규직" /></label>}
                  {(selectedPosting.keywords?.length ?? 0) === 0 && <label>키워드<input value="" onChange={event => updatePosting(selectedPosting.id, { keywords: splitTokens(event.target.value) })} placeholder="React, 신입" /></label>}
                  {!hasValue(selectedPosting.nextAction) && <label>다음 행동<input value="" onChange={event => updatePosting(selectedPosting.id, { nextAction: event.target.value || undefined })} placeholder="예: 지원서 수정" /></label>}
                  {!hasValue(selectedPosting.sourceUrl) && <label className="wide-label">공고 링크<input value="" onChange={event => updatePosting(selectedPosting.id, { sourceUrl: event.target.value || undefined, platform: detectJobPlatform(event.target.value) })} /></label>}
                  {!hasValue(selectedPosting.note) && <label className="wide-label">추출 상세 / 메모<textarea value="" onChange={event => updatePosting(selectedPosting.id, { note: event.target.value || undefined })} rows={5} /></label>}
                  {!hasValue(selectedPosting.imageText) && <label className="wide-label">공고 원문/OCR<textarea value="" onChange={event => updatePosting(selectedPosting.id, { imageText: event.target.value || undefined })} rows={4} /></label>}
                </div>
              </details>
            </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmRemove}
        title="지원 공고 삭제"
        description={`'${jobPostings.find(item => item.id === deleteId)?.company ?? '선택한 공고'}' 기록을 삭제합니다.`}
        confirmLabel="삭제"
        danger
      />


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
