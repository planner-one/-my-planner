import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { CareerEvent, CareerEventCategory, CareerEventStatus, CareerMilestone, CareerMilestoneType } from '../types'
import LinkOrganizerModal from '../components/LinkOrganizerModal'
import { Drawer } from '../components/ui/Drawer'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PageHeader } from '../components/ui/PageHeader'
import type { LinkAnalysisDraft } from '../services/linkAnalysisService'
import { toLocalDateKey } from '../utils/date'
import {
  CAREER_CATEGORY_LABELS as CATEGORY_LABELS,
  CAREER_CREATION_STATUSES as CREATION_STATUSES,
  CAREER_MILESTONE_TYPE_LABELS,
  CAREER_STATUS_LABELS as STATUS_LABELS,
  createCareerCategoryMilestones,
  formatCareerDday,
  getCareerDaysUntil,
  getCareerLastRelevantDate,
  getCareerMilestoneEntries,
  getCareerNextMilestone,
  isCareerOpen,
  normalizeCareerMilestones,
  syncCareerEventDateFields,
} from '../utils/careerEvents'

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

const MILESTONE_TYPE_OPTIONS = Object.entries(CAREER_MILESTONE_TYPE_LABELS) as Array<[CareerMilestoneType, string]>

const createMilestoneId = () =>
  `milestone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const createMilestoneRow = (
  type: CareerMilestoneType = 'custom',
  label = CAREER_MILESTONE_TYPE_LABELS[type],
  date = '',
  endDate = '',
): CareerMilestone => ({
  id: createMilestoneId(),
  type,
  label,
  date,
  endDate,
})

const normalizeMilestoneLabel = (value: string) =>
  value.toLowerCase().replace(/[()\[\]{}·ㆍ\s/_-]/g, '').trim()

const formatMilestoneChip = (entry: { label: string; date: string; endDate?: string; type: CareerMilestoneType }) => {
  const range = entry.endDate && entry.endDate !== entry.date ? `${entry.date}~${entry.endDate}` : entry.date
  const weekdays = entry.type === 'operation' && entry.endDate ? countWeekdays(entry.date, entry.endDate) : 0
  return `${entry.label} ${range}${weekdays > 0 ? ` · 평일 ${weekdays}일` : ''}`
}

const mergeMilestoneRows = (
  current: CareerMilestone[] | undefined,
  additions: CareerMilestone[],
  options: { replaceDefaultMain?: boolean } = {},
) => {
  const next = [...(current ?? [])]
  additions.forEach(addition => {
    if (!addition.date) return
    const normalizedLabel = normalizeMilestoneLabel(addition.label)
    const duplicate = next.some(milestone =>
      milestone.date === addition.date
      && (milestone.endDate ?? '') === (addition.endDate ?? '')
      && normalizeMilestoneLabel(milestone.label) === normalizedLabel,
    )
    if (duplicate) return

    const fillIndex = next.findIndex(milestone =>
      !milestone.date
      && (
        milestone.type === addition.type
        || normalizeMilestoneLabel(milestone.label) === normalizedLabel
      ),
    )
    if (fillIndex >= 0) {
      next[fillIndex] = { ...next[fillIndex], ...addition, id: next[fillIndex].id }
      return
    }

    const mainIndex = next.findIndex(milestone => milestone.type === 'main')
    if (addition.type === 'main' && mainIndex >= 0 && options.replaceDefaultMain) {
      next[mainIndex] = { ...next[mainIndex], date: addition.date, endDate: addition.endDate, label: next[mainIndex].label || addition.label }
      return
    }

    next.push(addition)
  })
  return next
}

const emptyForm = (): Omit<CareerEvent, 'id'> => ({
  ...(() => {
    const today = toLocalDateKey()
    return {
      title: '',
      organization: '',
      category: 'briefing' as CareerEventCategory,
      status: 'interested' as CareerEventStatus,
      date: today,
      applicationDeadline: '',
      resultDate: '',
      operationStartDate: '',
      operationEndDate: '',
      milestones: createCareerCategoryMilestones('briefing', { date: today }),
      time: '',
      endTime: '',
      mode: 'offline' as CareerEvent['mode'],
      location: '',
      address: '',
      url: '',
      sourceUrl: '',
      note: '',
    }
  })(),
})

type CareerEventForm = ReturnType<typeof emptyForm>

type CareerCodexField =
  | 'title'
  | 'organization'
  | 'category'
  | 'status'
  | 'date'
  | 'applicationDeadline'
  | 'selectionDate'
  | 'resultDate'
  | 'roundDate'
  | 'finalRoundDate'
  | 'finalResultDate'
  | 'operationStartDate'
  | 'operationEndDate'
  | 'time'
  | 'endTime'
  | 'mode'
  | 'location'
  | 'url'
  | 'summary'
  | 'conditions'
  | 'documents'
  | 'benefits'
  | 'uncertainties'

type CareerCodexDraft = Partial<Record<CareerCodexField, string>>

const CAREER_CODEX_LABELS: Array<[CareerCodexField, RegExp]> = [
  ['title', /^(일정명|제목|프로그램명|행사명|공고명|title)$/i],
  ['organization', /^(기관|기관\/회사|기관\/기업|기관명|회사|회사명|주최|주관|organization)$/i],
  ['category', /^(구분|분류|카테고리|category)$/i],
  ['status', /^(상태|진행\s*상태|status)$/i],
  ['date', /^(대표\s*일정일|일정일|행사일|교육일|면접일|설명회\s*일자|date)$/i],
  ['applicationDeadline', /^(신청\s*마감일|신청\s*마감|접수\s*마감일|접수\s*마감|모집\s*마감일|deadline)$/i],
  ['selectionDate', /^(선발\s*발표일|선발\s*발표|선정\s*발표일|선정\s*발표|합격\s*발표일|합격\s*발표|1차\s*발표일|1차\s*발표)$/i],
  ['resultDate', /^(결과\s*발표일|결과\s*발표|발표일)$/i],
  ['roundDate', /^(진행\s*단계일|예선\s*일자|예선|1차\s*심사일|심사일|라운드\s*일자)$/i],
  ['finalRoundDate', /^(본선\s*일자|본선|최종\s*라운드|최종\s*심사일)$/i],
  ['finalResultDate', /^(최종\s*결과일|최종\s*결과|수상\s*발표일|수상\s*발표|시상일)$/i],
  ['operationStartDate', /^(운영\s*시작일|운영\s*시작|시작일)$/i],
  ['operationEndDate', /^(운영\s*종료일|운영\s*종료|종료일)$/i],
  ['time', /^(시작\s*시간|시작|시간|start\s*time)$/i],
  ['endTime', /^(종료\s*시간|종료|end\s*time)$/i],
  ['mode', /^(진행\s*방식|운영\s*방식|방식|mode)$/i],
  ['location', /^(장소\/주소|장소|주소|위치|location)$/i],
  ['url', /^(관련\s*링크|신청\s*링크|링크|url)$/i],
  ['summary', /^(요약|핵심\s*내용|내용|summary)$/i],
  ['conditions', /^(신청\s*조건|지원\s*조건|대상|참여\s*대상|자격요건|conditions?)$/i],
  ['documents', /^(준비물\/제출서류|준비물|제출서류|필요\s*서류|documents?)$/i],
  ['benefits', /^(혜택\/비용|혜택|비용|참가비|지원\s*내용|benefits?)$/i],
  ['uncertainties', /^(확인\s*필요|확인할\s*점|불확실한\s*점)$/],
]

const CAREER_NOTE_SECTIONS: Array<[CareerCodexField, string]> = [
  ['summary', '요약'],
  ['conditions', '신청 조건'],
  ['documents', '준비물/제출서류'],
  ['benefits', '혜택/비용'],
  ['uncertainties', '확인 필요'],
]

const stripCodexBullet = (value: string) =>
  value.replace(/^\s*[-*•▪·ㆍ]\s*/, '').trim()

const cleanCareerCodexValue = (value?: string) => {
  const cleaned = (value ?? '')
    .split(/\n+/)
    .map(stripCodexBullet)
    .filter(Boolean)
    .join('\n')
    .trim()
  if (!cleaned || /^(없음|미정|알\s*수\s*없음|확인\s*필요|해당\s*없음)$/i.test(cleaned)) return ''
  return cleaned
}

const normalizeCareerCodexDate = (value?: string) => {
  const cleaned = cleanCareerCodexValue(value)
  if (!cleaned || /상시|없음|미정|확인/i.test(cleaned)) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  const match = cleaned.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/)
  if (!match) return ''
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
}

const normalizeCareerCodexTime = (value?: string) => {
  const cleaned = cleanCareerCodexValue(value)
  if (!cleaned || /없음|미정|확인/i.test(cleaned)) return ''
  const match = cleaned.match(/([01]?\d|2[0-3])\s*:\s*([0-5]\d)/)
  if (!match) return ''
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

const findCareerCodexField = (label: string): CareerCodexField | null => {
  const normalized = label.replace(/^#+\s*/, '').replace(/\s+/g, ' ').trim()
  const found = CAREER_CODEX_LABELS.find(([, matcher]) => matcher.test(normalized))
  return found?.[0] ?? null
}

const parseCareerCodexResult = (text: string): CareerCodexDraft => {
  const draft: CareerCodexDraft = {}
  let currentField: CareerCodexField | null = null

  text.split(/\n+/).forEach(rawLine => {
    const line = rawLine.trim()
    if (!line) return
    const normalized = line.replace(/^[-*•▪·ㆍ]\s*/, '').trim()
    const labelMatch = normalized.match(/^#{0,4}\s*([^:：]+?)\s*[:：]\s*(.*)$/)
    const headingField = findCareerCodexField(normalized)
    const field = labelMatch ? findCareerCodexField(labelMatch[1]) : headingField

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

const normalizeLabel = (value: string) =>
  value.toLowerCase().replace(/[()\[\]{}·ㆍ\s/_-]/g, '').trim()

const matchCareerCategory = (value?: string): CareerEventCategory | '' => {
  const cleaned = cleanCareerCodexValue(value)
  if (!cleaned) return ''
  const normalized = normalizeLabel(cleaned)
  const direct = Object.entries(CATEGORY_LABELS).find(([key, label]) =>
    normalized === normalizeLabel(key) || normalized === normalizeLabel(label),
  )
  if (direct) return direct[0] as CareerEventCategory
  if (/채용설명회|설명회|briefing/i.test(cleaned)) return 'briefing'
  if (/면접|interview/i.test(cleaned)) return 'interview'
  if (/직무캠프|캠프|camp/i.test(cleaned)) return 'camp'
  if (/교육|프로그램|강의|program|course/i.test(cleaned)) return 'program'
  if (/세미나|행사|컨퍼런스|seminar|event|conference/i.test(cleaned)) return 'seminar'
  if (/공모전|해커톤|contest|competition/i.test(cleaned)) return 'contest'
  if (/지원사업|지원금|사업/i.test(cleaned)) return 'support'
  if (/기업지원|채용|기업/i.test(cleaned)) return 'corp_support'
  if (/기타|other/i.test(cleaned)) return 'other'
  return ''
}

const matchCareerStatus = (value?: string): CareerEventStatus | '' => {
  const cleaned = cleanCareerCodexValue(value)
  if (!cleaned) return ''
  const normalized = normalizeLabel(cleaned)
  const direct = Object.entries(STATUS_LABELS).find(([key, label]) =>
    normalized === normalizeLabel(key) || normalized === normalizeLabel(label),
  )
  if (direct) return direct[0] as CareerEventStatus
  if (/신청\s*예정|준비|planned/i.test(cleaned)) return 'planned'
  if (/신청\s*완료|지원\s*완료|applied/i.test(cleaned)) return 'applied'
  if (/결과\s*대기|대기|pending/i.test(cleaned)) return 'pending'
  if (/선정|확정|confirmed/i.test(cleaned)) return 'confirmed'
  if (/완료|completed/i.test(cleaned)) return 'completed'
  if (/탈락|rejected/i.test(cleaned)) return 'rejected'
  if (/취소|cancelled/i.test(cleaned)) return 'cancelled'
  if (/관심|interested/i.test(cleaned)) return 'interested'
  return ''
}

const matchCareerMode = (value?: string): CareerEvent['mode'] | '' => {
  const cleaned = cleanCareerCodexValue(value)
  if (!cleaned) return ''
  if (/온.?오프|hybrid/i.test(cleaned)) return 'hybrid'
  if (/온라인|비대면|zoom|줌|webinar|online/i.test(cleaned)) return 'online'
  if (/오프라인|대면|offline/i.test(cleaned)) return 'offline'
  return ''
}

const firstValidUrl = (value?: string) => {
  const cleaned = cleanCareerCodexValue(value)
  return cleaned.match(/https?:\/\/[^\s)]+/i)?.[0] ?? ''
}

const formatCareerCodexNote = (draft: CareerCodexDraft, fallback: string) => {
  const sections = CAREER_NOTE_SECTIONS
    .map(([field, label]) => {
      const value = cleanCareerCodexValue(draft[field])
      return value ? `${label}\n${value}` : ''
    })
    .filter(Boolean)
  return sections.length ? sections.join('\n\n') : fallback.trim()
}

const createCareerCodexMilestones = (
  parsed: CareerCodexDraft,
  dates: {
    date: string
    applicationDeadline: string
    selectionDate: string
    resultDate: string
    roundDate: string
    finalRoundDate: string
    finalResultDate: string
    operationStartDate: string
    operationEndDate: string
  },
) => [
  dates.date ? createMilestoneRow('main', '일정', dates.date) : null,
  dates.applicationDeadline ? createMilestoneRow('application_deadline', '신청 마감', dates.applicationDeadline) : null,
  dates.selectionDate ? createMilestoneRow('selection_announcement', '선발 발표', dates.selectionDate) : null,
  dates.resultDate ? createMilestoneRow('result_announcement', '결과 발표', dates.resultDate) : null,
  dates.roundDate ? createMilestoneRow('round', '진행 단계', dates.roundDate) : null,
  dates.finalRoundDate ? createMilestoneRow('final_round', '본선', dates.finalRoundDate) : null,
  dates.finalResultDate ? createMilestoneRow('result_announcement', '최종 결과', dates.finalResultDate) : null,
  dates.operationStartDate ? createMilestoneRow('operation', '운영 기간', dates.operationStartDate, dates.operationEndDate) : null,
].filter((milestone): milestone is CareerMilestone => Boolean(milestone))

const buildCareerCodexPrompt = (form: CareerEventForm) => {
  const currentMilestones = (form.milestones ?? [])
    .filter(milestone => milestone.date)
    .map(milestone => `${milestone.label}: ${milestone.date}${milestone.endDate ? `~${milestone.endDate}` : ''}`)
    .join('\n')
  const currentValues = [
    form.title.trim() && `일정명: ${form.title.trim()}`,
    form.organization?.trim() && `기관/회사: ${form.organization.trim()}`,
    `구분: ${CATEGORY_LABELS[form.category]}`,
    `상태: ${STATUS_LABELS[form.status]}`,
    form.date && `대표 일정일: ${form.date}`,
    form.applicationDeadline && `신청 마감일: ${form.applicationDeadline}`,
    form.resultDate && `결과 발표일: ${form.resultDate}`,
    form.operationStartDate && `운영 시작일: ${form.operationStartDate}`,
    form.operationEndDate && `운영 종료일: ${form.operationEndDate}`,
    form.time && `시작 시간: ${form.time}`,
    form.endTime && `종료 시간: ${form.endTime}`,
    form.mode && `진행 방식: ${form.mode === 'offline' ? '오프라인' : form.mode === 'online' ? '온라인' : '온·오프라인'}`,
    form.location?.trim() && `장소/주소: ${form.location.trim()}`,
    (form.sourceUrl?.trim() || form.url?.trim()) && `관련 링크: ${form.sourceUrl?.trim() || form.url?.trim()}`,
    currentMilestones && `일정 단계:\n${currentMilestones}`,
  ].filter(Boolean).join('\n')

  return [
    '아래 기회 일정을 플래너에 저장할 수 있게 구조화해줘.',
    '',
    '출력은 아래 라벨을 그대로 쓰고, 모르는 값은 "확인 필요"라고 적어줘.',
    '',
    '일정명:',
    '기관/회사:',
    '구분:',
    '상태:',
    '대표 일정일:',
    '신청 마감일:',
    '선발 발표일:',
    '결과 발표일:',
    '본선 일자:',
    '최종 결과일:',
    '운영 시작일:',
    '운영 종료일:',
    '시작 시간:',
    '종료 시간:',
    '진행 방식:',
    '장소/주소:',
    '관련 링크:',
    '요약:',
    '신청 조건:',
    '준비물/제출서류:',
    '혜택/비용:',
    '확인 필요:',
    '',
    currentValues ? `현재 플래너 입력값:\n${currentValues}` : '',
    form.note?.trim() ? `현재 메모/원문:\n${form.note.trim()}` : '',
  ].filter(Boolean).join('\n\n')
}

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
  const [careerCodexText, setCareerCodexText] = useState('')
  const [careerCodexStatus, setCareerCodexStatus] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const resetCareerCodex = () => {
    setCareerCodexText('')
    setCareerCodexStatus('')
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingId(null)
    setForm(emptyForm())
    resetCareerCodex()
  }

  const openNewEditor = () => {
    setEditingId(null)
    setForm(emptyForm())
    setEditorOpen(true)
    resetCareerCodex()
  }

  const openLinkImportForNew = () => {
    setEditingId(null)
    setForm(emptyForm())
    setEditorOpen(true)
    setLinkImportOpen(true)
    resetCareerCodex()
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
      resultDate: draft.resultDate || previous.resultDate,
      milestones: mergeMilestoneRows(previous.milestones, [
        draft.date ? createMilestoneRow('main', '일정', draft.date) : null,
        draft.deadline ? createMilestoneRow('application_deadline', '신청 마감', draft.deadline) : null,
        draft.resultDate ? createMilestoneRow('result_announcement', '결과 발표', draft.resultDate) : null,
      ].filter((milestone): milestone is CareerMilestone => Boolean(milestone)), {
        replaceDefaultMain: previous.date === toLocalDateKey(),
      }),
      mode: 'online',
      url: draft.url,
      sourceUrl: draft.url,
      note: [previous.note, draft.summary].filter(Boolean).join('\n\n'),
    }))
  }

  const updateForm = <K extends keyof Omit<CareerEvent, 'id'>>(key: K, value: Omit<CareerEvent, 'id'>[K]) =>
    setForm(previous => ({ ...previous, [key]: value }))

  const updateCategory = (category: CareerEventCategory) => {
    setForm(previous => ({
      ...previous,
      category,
    }))
  }

  const applyCategoryTemplate = () => {
    setForm(previous => {
      const synced = syncCareerEventDateFields(previous)
      return {
        ...previous,
        milestones: createCareerCategoryMilestones(previous.category, synced),
      }
    })
  }

  const addMilestone = () => {
    setForm(previous => ({
      ...previous,
      milestones: [...(previous.milestones ?? []), createMilestoneRow()],
    }))
  }

  const updateMilestone = (id: string, patch: Partial<CareerMilestone>) => {
    setForm(previous => ({
      ...previous,
      milestones: (previous.milestones ?? []).map(milestone => {
        if (milestone.id !== id) return milestone
        const nextType = patch.type ?? milestone.type
        const shouldUseTypeLabel = patch.type
          && (!milestone.label.trim() || milestone.label === CAREER_MILESTONE_TYPE_LABELS[milestone.type])
        const next = {
          ...milestone,
          ...patch,
          label: shouldUseTypeLabel ? CAREER_MILESTONE_TYPE_LABELS[nextType] : patch.label ?? milestone.label,
        }
        if (next.endDate && next.date && next.endDate < next.date) next.endDate = ''
        return next
      }),
    }))
  }

  const removeMilestone = (id: string) => {
    setForm(previous => ({
      ...previous,
      milestones: (previous.milestones ?? []).filter(milestone => milestone.id !== id),
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
    const normalized = syncCareerEventDateFields({
      ...form,
      title,
      organization: form.organization?.trim() || undefined,
      time: form.time || undefined,
      endTime: form.endTime || undefined,
      location: form.mode === 'online' ? undefined : form.location?.trim() || undefined,
      address: undefined,
      url: form.url?.trim() || undefined,
      sourceUrl: form.sourceUrl?.trim() || form.url?.trim() || undefined,
      note: form.note?.trim() || undefined,
    }) as Omit<CareerEvent, 'id'>
    if (editingId) {
      setCareerEvents(previous => previous.map(item => item.id === editingId ? { ...normalized, id: editingId } : item))
    } else {
      setCareerEvents(previous => [...previous, { ...normalized, id: `career-${Date.now()}` }])
    }
    setEditingId(null)
    setForm(emptyForm())
    setEditorOpen(false)
    resetCareerCodex()
  }

  const edit = (item: CareerEvent) => {
    const synced = syncCareerEventDateFields({
      ...item,
      milestones: normalizeCareerMilestones(item),
    })
    setEditingId(item.id)
    setForm({
      title: synced.title ?? item.title,
      organization: synced.organization ?? '',
      category: synced.category ?? item.category,
      status: synced.status ?? item.status,
      date: synced.date,
      applicationDeadline: synced.applicationDeadline ?? '',
      resultDate: synced.resultDate ?? '',
      operationStartDate: synced.operationStartDate ?? '',
      operationEndDate: synced.operationEndDate ?? '',
      milestones: synced.milestones ?? [],
      time: synced.time ?? '',
      endTime: synced.endTime ?? '',
      mode: synced.mode ?? 'offline',
      location: mergePlace(synced.location, synced.address),
      address: '',
      url: synced.url ?? '',
      sourceUrl: synced.sourceUrl ?? synced.url ?? '',
      note: synced.note ?? '',
    })
    setEditorOpen(true)
    resetCareerCodex()
  }

  const remove = (id: string) => {
    setDeleteId(id)
  }

  const confirmRemove = () => {
    if (!deleteId) return
    setCareerEvents(previous => previous.filter(item => item.id !== deleteId))
    if (editingId === deleteId) {
      setEditingId(null)
      setForm(emptyForm())
      setEditorOpen(false)
    }
  }

  const updateStatus = (id: string, status: CareerEventStatus) => {
    setCareerEvents(previous => previous.map(item => item.id === id ? { ...item, status } : item))
  }

  const copyCareerCodexPrompt = async () => {
    const prompt = buildCareerCodexPrompt(form)
    try {
      await navigator.clipboard.writeText(prompt)
      setCareerCodexStatus('Codex 분석용 템플릿을 복사했습니다.')
    } catch {
      setCareerCodexStatus('복사 권한이 막혔습니다. 현재 링크, 메모, 일정 정보를 Codex에 직접 전달해 주세요.')
    }
  }

  const applyCareerCodexResult = () => {
    const text = careerCodexText.trim()
    if (!text) return

    const parsed = parseCareerCodexResult(text)
    const category = matchCareerCategory(parsed.category)
    const status = matchCareerStatus(parsed.status)
    const mode = matchCareerMode(parsed.mode)
    const date = normalizeCareerCodexDate(parsed.date)
    const applicationDeadline = normalizeCareerCodexDate(parsed.applicationDeadline)
    const selectionDate = normalizeCareerCodexDate(parsed.selectionDate)
    const resultDate = normalizeCareerCodexDate(parsed.resultDate)
    const roundDate = normalizeCareerCodexDate(parsed.roundDate)
    const finalRoundDate = normalizeCareerCodexDate(parsed.finalRoundDate)
    const finalResultDate = normalizeCareerCodexDate(parsed.finalResultDate)
    const operationStartDate = normalizeCareerCodexDate(parsed.operationStartDate)
    const operationEndDate = normalizeCareerCodexDate(parsed.operationEndDate)
    const time = normalizeCareerCodexTime(parsed.time)
    const endTime = normalizeCareerCodexTime(parsed.endTime)
    const location = cleanCareerCodexValue(parsed.location)
    const url = firstValidUrl(parsed.url)
    const note = formatCareerCodexNote(parsed, text)

    setForm(previous => {
      const nextCategory = category || previous.category
      const nextStatus = status && (editingId || CREATION_STATUSES.includes(status)) ? status : previous.status
      const nextMode = mode || previous.mode
      const canReplaceDefaultDate = !editingId && previous.date === toLocalDateKey()
      const parsedMilestones = createCareerCodexMilestones(parsed, {
        date,
        applicationDeadline,
        selectionDate,
        resultDate,
        roundDate,
        finalRoundDate,
        finalResultDate,
        operationStartDate,
        operationEndDate,
      })
      const milestones = mergeMilestoneRows(previous.milestones, parsedMilestones, {
        replaceDefaultMain: canReplaceDefaultDate,
      })
      const synced = syncCareerEventDateFields({
        ...previous,
        category: nextCategory,
        status: nextStatus,
        date: canReplaceDefaultDate && date ? date : previous.date,
        applicationDeadline: previous.applicationDeadline || applicationDeadline,
        resultDate: previous.resultDate || resultDate || selectionDate || finalResultDate,
        operationStartDate: previous.operationStartDate || operationStartDate,
        operationEndDate: previous.operationEndDate || operationEndDate,
        milestones,
      })

      return {
        ...synced,
        title: previous.title.trim() ? previous.title : cleanCareerCodexValue(parsed.title) || previous.title,
        organization: previous.organization?.trim() ? previous.organization : cleanCareerCodexValue(parsed.organization) || previous.organization,
        category: nextCategory,
        status: nextStatus,
        milestones: synced.milestones,
        time: previous.time || time,
        endTime: previous.endTime || endTime,
        mode: nextMode,
        location: nextMode === 'online'
          ? previous.location
          : previous.location?.trim() ? previous.location : location || previous.location,
        url: previous.url?.trim() ? previous.url : url || previous.url,
        sourceUrl: previous.sourceUrl?.trim() ? previous.sourceUrl : url || previous.sourceUrl,
        note: note || previous.note,
      }
    })
    setCareerCodexStatus('Codex 분석 결과를 기회 일정 폼에 반영했습니다.')
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
      ...(item.milestones ?? []).flatMap(milestone => [milestone.label, milestone.date, milestone.endDate]),
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

  const formMilestones = form.milestones ?? []

  return (
    <div className="career-page">
      <PageHeader
        title="기회 일정"
        description="공모전, 교육, 설명회와 프로그램의 다음 단계를 놓치지 않게 관리합니다."
        actions={(
          <>
            <Button variant="secondary" onClick={openLinkImportForNew}>링크에서 추가</Button>
            <Button onClick={openNewEditor}>일정 추가</Button>
          </>
        )}
      />

      <section className="career-summary-grid" aria-label="기회 일정 요약">
        <SummaryCard label="진행 중" value={openCount} sub="관심~선정" />
        <SummaryCard label="7일 이내" value={urgentCount} sub="다음 체크 필요" tone="urgent" />
        <SummaryCard label="결과 대기" value={pendingCount} sub="확인 필요" />
        <SummaryCard label="선정/확정" value={confirmedCount} sub="운영 준비" />
      </section>

      <Drawer
        open={editorOpen}
        onClose={closeEditor}
        title={editingId ? '일정 수정' : '새 일정 추가'}
        description="단계별 날짜와 필요한 정보를 확인한 뒤 저장합니다."
        width="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={closeEditor}>취소</Button>
            <Button onClick={save}>{editingId ? '수정 저장' : '일정 추가'}</Button>
          </>
        )}
      >
            <div className="career-editor-tools">
              <Button variant="secondary" size="sm" onClick={() => setLinkImportOpen(true)}>링크에서 불러오기</Button>
            </div>
            <details className="career-codex-assist">
              <summary>
                <span>Codex로 정밀 정리</span>
                <small>API 비용 없음</small>
              </summary>
              <div className="career-codex-assist-body">
                <div>
                  <button type="button" onClick={copyCareerCodexPrompt}>분석 템플릿 복사</button>
                  <button type="button" className="secondary" onClick={applyCareerCodexResult}>결과를 폼에 반영</button>
                </div>
                <textarea
                  value={careerCodexText}
                  onChange={event => {
                    setCareerCodexText(event.target.value)
                    setCareerCodexStatus('')
                  }}
                  placeholder="Codex가 정리한 일정명, 기관, 구분, 날짜, 마감일, 장소, 요약, 신청 조건, 준비물, 혜택을 붙여넣으세요."
                  rows={6}
                />
                {careerCodexStatus && <small>{careerCodexStatus}</small>}
              </div>
            </details>
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
          <div className="span-2 career-milestone-editor">
            <div className="career-milestone-editor-head">
              <strong>일정 단계</strong>
              <div>
                <button type="button" className="secondary" onClick={applyCategoryTemplate}>구분 기본 단계 적용</button>
                <button type="button" onClick={addMilestone}>단계 추가</button>
              </div>
            </div>
            <div className="career-milestone-list">
              {formMilestones.length === 0 && (
                <button type="button" className="career-empty-milestone" onClick={addMilestone}>첫 단계 추가</button>
              )}
              {formMilestones.map(milestone => (
                <div key={milestone.id} className="career-milestone-row">
                  <label>종류
                    <select
                      value={milestone.type}
                      onChange={event => updateMilestone(milestone.id, { type: event.target.value as CareerMilestoneType })}
                    >
                      {MILESTONE_TYPE_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>단계명
                    <input
                      value={milestone.label}
                      onChange={event => updateMilestone(milestone.id, { label: event.target.value })}
                      placeholder="예: 선발 발표"
                    />
                  </label>
                  <label>날짜
                    <input
                      type="date"
                      value={milestone.date}
                      onChange={event => updateMilestone(milestone.id, { date: event.target.value })}
                    />
                  </label>
                  <label>종료일
                    <input
                      type="date"
                      min={milestone.date || undefined}
                      value={milestone.endDate ?? ''}
                      onChange={event => updateMilestone(milestone.id, { endDate: event.target.value })}
                    />
                  </label>
                  <button type="button" className="career-milestone-remove" onClick={() => removeMilestone(milestone.id)}>삭제</button>
                </div>
              ))}
            </div>
          </div>
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
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmRemove}
        title="기회 일정 삭제"
        description={`'${careerEvents.find(item => item.id === deleteId)?.title ?? '선택한 일정'}'을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        danger
      />

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
  const milestoneEntries = getCareerMilestoneEntries(item)
  const displayDate = nextMilestone?.date ?? item.date
  return (
    <article className={`career-item${muted ? ' is-past' : ''}`}>
      <div className="career-date">
        <strong>{displayDate.slice(5).replace('-', '/')}</strong>
        <em>{weekdayOf(displayDate)}요일</em>
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
          {milestoneEntries.slice(0, 6).map(entry => (
            <span key={`${entry.type}-${entry.label}-${entry.date}-${entry.endDate ?? ''}`}>
              {formatMilestoneChip(entry)}
            </span>
          ))}
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
