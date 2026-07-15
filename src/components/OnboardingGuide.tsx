import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type {
  CareerEventCategory,
  OnboardingFirstEntry,
  OnboardingPurpose,
} from '../types'
import { CAREER_CATEGORY_LABELS } from '../utils/careerEvents'
import { toLocalDateKey } from '../utils/date'
import {
  getOnboardingPurposeConfig,
  ONBOARDING_PURPOSES,
  STARTER_WIDGET_DEFAULTS,
} from '../utils/onboarding'

export interface OnboardingGuideProps {
  open: boolean
  mode: 'setup' | 'guide'
  initialPurpose?: OnboardingPurpose
  onComplete: (entry: OnboardingFirstEntry) => Promise<void>
  onSkip: (purpose?: OnboardingPurpose) => Promise<void>
  onPurposeChange: (purpose: OnboardingPurpose) => void
  onClose: () => void
  onOpenDashboardEditor: () => void
}

type SavingAction = 'complete' | 'skip'

const STEP_LABELS = ['목적 선택', '핵심 기능', '첫 항목', '맞춤 홈'] as const

const CORE_CONCEPTS = [
  {
    key: 'Todo',
    mark: 'T',
    title: 'Todo',
    description: '오늘 끝낼 수 있는 구체적인 일을 빠르게 적어요.',
  },
  {
    key: 'Task',
    mark: 'W',
    title: '작업',
    description: '날짜와 우선순위가 있는 개별 실행 항목을 관리해요.',
  },
  {
    key: 'Project',
    mark: 'P',
    title: '프로젝트',
    description: '여러 작업을 하나의 결과물 아래 묶어 진행해요.',
  },
  {
    key: 'Goal',
    mark: 'G',
    title: '목표',
    description: '장기 목표를 단계로 나누고 진행률을 확인해요.',
  },
] as const

const PURPOSE_MARKS: Record<OnboardingPurpose, string> = {
  daily: '01',
  workStudy: '02',
  jobSearch: '03',
  opportunity: '04',
}

const CATEGORY_OPTIONS = Object.entries(CAREER_CATEGORY_LABELS) as [
  CareerEventCategory,
  string,
][]

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const isHttpUrl = (value: string) => {
  if (!value) return true
  try {
    const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const guideExample = (purpose: OnboardingPurpose) => {
  switch (purpose) {
    case 'daily':
      return {
        eyebrow: 'Todo 예시',
        title: '분리수거 내놓기',
        details: ['오늘', '개인'],
        note: '오늘 끝낼 수 있는 크기로 적으면 완료 여부를 명확하게 확인할 수 있어요.',
      }
    case 'workStudy':
      return {
        eyebrow: '작업 예시',
        title: '발표 자료 초안 만들기',
        details: ['업무', '마감일 선택'],
        note: '하나의 실행 단위로 이름을 붙이고 필요한 경우 마감일을 더해요.',
      }
    case 'jobSearch':
      return {
        eyebrow: '지원 공고 예시',
        title: '플래너랩 · 프론트엔드 개발자',
        details: ['회사 또는 포지션', '공고 URL 선택'],
        note: '아는 정보부터 저장한 뒤, 마감일과 나머지 정보는 나중에 보완할 수 있어요.',
      }
    case 'opportunity':
      return {
        eyebrow: '기회·신청 예시',
        title: '청년 역량 강화 프로그램',
        details: ['관심 기회 일정', '신청한 항목'],
        note: '관심 단계는 기회 일정으로, 신청을 마쳤다면 내 신청 항목으로 구분해요.',
      }
  }
}

export function OnboardingGuide({
  open,
  mode,
  initialPurpose,
  onComplete,
  onSkip,
  onPurposeChange,
  onClose,
  onOpenDashboardEditor,
}: OnboardingGuideProps) {
  const [step, setStep] = useState(0)
  const [purpose, setPurpose] = useState<OnboardingPurpose | undefined>(initialPurpose)
  const [dailyText, setDailyText] = useState('')
  const [dailyCategory, setDailyCategory] = useState<'work' | 'personal' | 'study'>('personal')
  const [workName, setWorkName] = useState('')
  const [workType, setWorkType] = useState<'업무' | '공부'>('업무')
  const [workDue, setWorkDue] = useState('')
  const [jobCompany, setJobCompany] = useState('')
  const [jobPosition, setJobPosition] = useState('')
  const [jobSourceUrl, setJobSourceUrl] = useState('')
  const [jobDeadline, setJobDeadline] = useState('')
  const [opportunityKind, setOpportunityKind] = useState<'careerEvent' | 'personalApplication'>('careerEvent')
  const [opportunityTitle, setOpportunityTitle] = useState('')
  const [opportunityOrganization, setOpportunityOrganization] = useState('')
  const [opportunityDate, setOpportunityDate] = useState(() => toLocalDateKey())
  const [opportunityDeadline, setOpportunityDeadline] = useState('')
  const [opportunityCategory, setOpportunityCategory] = useState<CareerEventCategory>('program')
  const [validationError, setValidationError] = useState('')
  const [asyncError, setAsyncError] = useState('')
  const [savingAction, setSavingAction] = useState<SavingAction | null>(null)
  const [failedAction, setFailedAction] = useState<SavingAction | null>(null)
  const [escapeHint, setEscapeHint] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const skipButtonRef = useRef<HTMLButtonElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const selectedConfig = useMemo(
    () => purpose ? getOnboardingPurposeConfig(purpose) : null,
    [purpose],
  )

  useEffect(() => {
    if (!open) return

    setStep(0)
    setPurpose(initialPurpose)
    setDailyText('')
    setDailyCategory('personal')
    setWorkName('')
    setWorkType('업무')
    setWorkDue('')
    setJobCompany('')
    setJobPosition('')
    setJobSourceUrl('')
    setJobDeadline('')
    setOpportunityKind('careerEvent')
    setOpportunityTitle('')
    setOpportunityOrganization('')
    setOpportunityDate(toLocalDateKey())
    setOpportunityDeadline('')
    setOpportunityCategory('program')
    setValidationError('')
    setAsyncError('')
    setSavingAction(null)
    setFailedAction(null)
    setEscapeHint(false)
  }, [open, mode, initialPurpose])

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousOverflow = document.body.style.overflow
    const appRoot = document.getElementById('root')
    const rootWasInert = appRoot?.hasAttribute('inert') ?? false
    const previousRootAriaHidden = appRoot?.getAttribute('aria-hidden')
    document.body.style.overflow = 'hidden'
    appRoot?.setAttribute('inert', '')
    appRoot?.setAttribute('aria-hidden', 'true')

    const keepFocusInDialog = (event: FocusEvent) => {
      if (dialogRef.current?.contains(event.target as Node)) return
      headingRef.current?.focus()
    }
    document.addEventListener('focusin', keepFocusInDialog)

    return () => {
      document.removeEventListener('focusin', keepFocusInDialog)
      document.body.style.overflow = previousOverflow
      if (!rootWasInert) appRoot?.removeAttribute('inert')
      if (previousRootAriaHidden == null) appRoot?.removeAttribute('aria-hidden')
      else appRoot?.setAttribute('aria-hidden', previousRootAriaHidden)
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => headingRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open, step])

  useEffect(() => {
    if (!validationError && !asyncError) return
    const frame = window.requestAnimationFrame(() => {
      feedbackRef.current?.focus()
      feedbackRef.current?.scrollIntoView({ block: 'nearest' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [validationError, asyncError])

  const clearFeedback = () => {
    setValidationError('')
    setAsyncError('')
    setFailedAction(null)
    setEscapeHint(false)
  }

  const choosePurpose = (nextPurpose: OnboardingPurpose) => {
    if (savingAction) return
    setPurpose(nextPurpose)
    if (mode === 'setup') onPurposeChange(nextPurpose)
    clearFeedback()
  }

  const handlePurposeKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const lastIndex = ONBOARDING_PURPOSES.length - 1
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = index === lastIndex ? 0 : index + 1
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = index === 0 ? lastIndex : index - 1
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = lastIndex
    }
    if (nextIndex === null) return

    event.preventDefault()
    const nextPurpose = ONBOARDING_PURPOSES[nextIndex].purpose
    choosePurpose(nextPurpose)
    const buttons = event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    buttons?.[nextIndex]?.focus()
  }

  const buildEntry = (): OnboardingFirstEntry | null => {
    if (!purpose) {
      setValidationError('먼저 플래너를 사용할 주 목적을 선택해 주세요.')
      return null
    }

    if (purpose === 'daily') {
      const text = dailyText.trim()
      if (!text) {
        setValidationError('오늘 끝낼 Todo 내용을 입력해 주세요.')
        return null
      }
      return { purpose, text, category: dailyCategory }
    }

    if (purpose === 'workStudy') {
      const name = workName.trim()
      if (!name) {
        setValidationError('첫 작업의 이름을 입력해 주세요.')
        return null
      }
      return {
        purpose,
        name,
        taskType: workType,
        due: workDue || undefined,
      }
    }

    if (purpose === 'jobSearch') {
      const company = jobCompany.trim()
      const position = jobPosition.trim()
      const sourceUrl = jobSourceUrl.trim()
      if (!company && !position && !sourceUrl) {
        setValidationError('회사, 포지션, 공고 URL 중 하나 이상을 입력해 주세요.')
        return null
      }
      if (!isHttpUrl(sourceUrl)) {
        setValidationError('공고 URL 형식을 확인해 주세요.')
        return null
      }
      return {
        purpose,
        company: company || undefined,
        position: position || undefined,
        sourceUrl: sourceUrl || undefined,
        deadline: jobDeadline || undefined,
      }
    }

    const title = opportunityTitle.trim()
    const organization = opportunityOrganization.trim()
    if (!title) {
      setValidationError('기회 또는 신청 항목의 이름을 입력해 주세요.')
      return null
    }

    if (opportunityKind === 'careerEvent') {
      if (!opportunityDate) {
        setValidationError('관심 기회의 대표 일정을 선택해 주세요.')
        return null
      }
      return {
        purpose,
        entryKind: opportunityKind,
        title,
        organization: organization || undefined,
        date: opportunityDate,
        category: opportunityCategory,
      }
    }

    return {
      purpose,
      entryKind: opportunityKind,
      title,
      organization: organization || undefined,
      deadline: opportunityDeadline || undefined,
    }
  }

  const goNext = () => {
    clearFeedback()
    if (step === 0 && !purpose) {
      setValidationError('플래너를 사용할 주 목적을 하나 선택해 주세요.')
      return
    }
    if (step === 2 && mode === 'setup' && !buildEntry()) return
    setStep(current => Math.min(current + 1, STEP_LABELS.length - 1))
  }

  const goBack = () => {
    if (savingAction) return
    clearFeedback()
    setStep(current => Math.max(current - 1, 0))
  }

  const handleFirstEntrySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    goNext()
  }

  const handleComplete = async () => {
    if (savingAction) return
    clearFeedback()
    const entry = buildEntry()
    if (!entry) {
      setStep(2)
      return
    }

    setSavingAction('complete')
    try {
      await onComplete(entry)
    } catch {
      setAsyncError('첫 항목과 맞춤 홈을 저장하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.')
      setFailedAction('complete')
    } finally {
      setSavingAction(null)
    }
  }

  const handleSkip = async () => {
    if (savingAction || mode !== 'setup') return
    clearFeedback()
    setSavingAction('skip')
    try {
      await onSkip(purpose)
    } catch {
      setAsyncError('기본 홈을 저장하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.')
      setFailedAction('skip')
    } finally {
      setSavingAction(null)
    }
  }

  const retryFailedAction = () => {
    if (failedAction === 'complete') void handleComplete()
    if (failedAction === 'skip') void handleSkip()
  }

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (mode === 'guide') {
        onClose()
      } else {
        setEscapeHint(true)
        skipButtonRef.current?.focus()
      }
      return
    }

    if (event.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter(element => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true')
    if (focusable.length === 0) {
      event.preventDefault()
      dialog.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const activeElement = document.activeElement
    if (!focusable.includes(activeElement as HTMLElement)) {
      event.preventDefault()
      const nextFocus = event.shiftKey ? last : first
      nextFocus.focus()
    } else if (event.shiftKey && activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const renderFirstEntryForm = () => {
    if (!purpose) return null

    if (purpose === 'daily') {
      return (
        <div className="onboarding-form-grid">
          <label className="onboarding-field onboarding-field-wide">
            <span>오늘 할 Todo <b aria-hidden="true">필수</b></span>
            <input
              type="text"
              value={dailyText}
              onChange={event => { setDailyText(event.target.value); setValidationError('') }}
              placeholder="예: 장보기 목록 정리하기"
              autoComplete="off"
              disabled={Boolean(savingAction)}
              aria-invalid={Boolean(validationError && !dailyText.trim())}
              aria-describedby={validationError && !dailyText.trim() ? 'onboarding-validation-error' : undefined}
              required
            />
          </label>
          <label className="onboarding-field">
            <span>카테고리</span>
            <select
              value={dailyCategory}
              onChange={event => setDailyCategory(event.target.value as typeof dailyCategory)}
              disabled={Boolean(savingAction)}
            >
              <option value="personal">개인</option>
              <option value="work">업무</option>
              <option value="study">공부</option>
            </select>
          </label>
          <div className="onboarding-form-note">날짜는 오늘로 자동 저장됩니다.</div>
        </div>
      )
    }

    if (purpose === 'workStudy') {
      return (
        <div className="onboarding-form-grid">
          <label className="onboarding-field onboarding-field-wide">
            <span>작업명 <b aria-hidden="true">필수</b></span>
            <input
              type="text"
              value={workName}
              onChange={event => { setWorkName(event.target.value); setValidationError('') }}
              placeholder="예: 발표 자료 초안 만들기"
              autoComplete="off"
              disabled={Boolean(savingAction)}
              aria-invalid={Boolean(validationError && !workName.trim())}
              aria-describedby={validationError && !workName.trim() ? 'onboarding-validation-error' : undefined}
              required
            />
          </label>
          <label className="onboarding-field">
            <span>작업 유형</span>
            <select
              value={workType}
              onChange={event => setWorkType(event.target.value as typeof workType)}
              disabled={Boolean(savingAction)}
            >
              <option value="업무">업무</option>
              <option value="공부">공부</option>
            </select>
          </label>
          <label className="onboarding-field">
            <span>마감일 <em>선택</em></span>
            <input
              type="date"
              value={workDue}
              onChange={event => setWorkDue(event.target.value)}
              disabled={Boolean(savingAction)}
            />
          </label>
        </div>
      )
    }

    if (purpose === 'jobSearch') {
      return (
        <div className="onboarding-form-grid">
          <label className="onboarding-field">
            <span>회사</span>
            <input
              type="text"
              value={jobCompany}
              onChange={event => { setJobCompany(event.target.value); setValidationError('') }}
              placeholder="예: 플래너랩"
              autoComplete="organization"
              disabled={Boolean(savingAction)}
              aria-describedby={validationError ? 'onboarding-validation-error' : undefined}
            />
          </label>
          <label className="onboarding-field">
            <span>포지션</span>
            <input
              type="text"
              value={jobPosition}
              onChange={event => { setJobPosition(event.target.value); setValidationError('') }}
              placeholder="예: 프론트엔드 개발자"
              autoComplete="off"
              disabled={Boolean(savingAction)}
              aria-describedby={validationError ? 'onboarding-validation-error' : undefined}
            />
          </label>
          <label className="onboarding-field onboarding-field-wide">
            <span>공고 URL</span>
            <input
              type="url"
              inputMode="url"
              value={jobSourceUrl}
              onChange={event => { setJobSourceUrl(event.target.value); setValidationError('') }}
              placeholder="https://example.com/job"
              autoComplete="url"
              disabled={Boolean(savingAction)}
              aria-invalid={Boolean(validationError && (!isHttpUrl(jobSourceUrl.trim()) || (!jobCompany.trim() && !jobPosition.trim() && !jobSourceUrl.trim())))}
              aria-describedby={validationError ? 'onboarding-validation-error' : undefined}
            />
          </label>
          <label className="onboarding-field">
            <span>마감일 <em>선택</em></span>
            <input
              type="date"
              value={jobDeadline}
              onChange={event => setJobDeadline(event.target.value)}
              disabled={Boolean(savingAction)}
            />
          </label>
          <div className="onboarding-form-note onboarding-field-wide">
            회사, 포지션, 공고 URL 중 하나만 알아도 시작할 수 있어요.
          </div>
        </div>
      )
    }

    return (
      <div className="onboarding-form-grid">
        <fieldset className="onboarding-kind onboarding-field-wide">
          <legend>어떤 상태인가요?</legend>
          <div>
            <button
              type="button"
              className={opportunityKind === 'careerEvent' ? 'active' : ''}
              aria-pressed={opportunityKind === 'careerEvent'}
              onClick={() => setOpportunityKind('careerEvent')}
              disabled={Boolean(savingAction)}
            >
              관심 중인 기회
              <small>아직 신청 전인 일정</small>
            </button>
            <button
              type="button"
              className={opportunityKind === 'personalApplication' ? 'active' : ''}
              aria-pressed={opportunityKind === 'personalApplication'}
              onClick={() => setOpportunityKind('personalApplication')}
              disabled={Boolean(savingAction)}
            >
              신청한 항목
              <small>신청을 마친 지원·프로그램</small>
            </button>
          </div>
        </fieldset>
        <label className="onboarding-field">
          <span>항목 이름 <b aria-hidden="true">필수</b></span>
          <input
            type="text"
            value={opportunityTitle}
            onChange={event => { setOpportunityTitle(event.target.value); setValidationError('') }}
            placeholder="예: 청년 역량 강화 프로그램"
            autoComplete="off"
            disabled={Boolean(savingAction)}
            aria-invalid={Boolean(validationError && !opportunityTitle.trim())}
            aria-describedby={validationError && !opportunityTitle.trim() ? 'onboarding-validation-error' : undefined}
            required
          />
        </label>
        <label className="onboarding-field">
          <span>기관·주최자 <em>선택</em></span>
          <input
            type="text"
            value={opportunityOrganization}
            onChange={event => setOpportunityOrganization(event.target.value)}
            placeholder="예: 서울시"
            autoComplete="organization"
            disabled={Boolean(savingAction)}
          />
        </label>
        {opportunityKind === 'careerEvent' ? (
          <>
            <label className="onboarding-field">
              <span>대표 일정 <b aria-hidden="true">필수</b></span>
              <input
                type="date"
                value={opportunityDate}
                onChange={event => { setOpportunityDate(event.target.value); setValidationError('') }}
                disabled={Boolean(savingAction)}
                aria-invalid={Boolean(validationError && !opportunityDate)}
                aria-describedby={validationError && !opportunityDate ? 'onboarding-validation-error' : undefined}
                required
              />
            </label>
            <label className="onboarding-field">
              <span>기회 종류</span>
              <select
                value={opportunityCategory}
                onChange={event => setOpportunityCategory(event.target.value as CareerEventCategory)}
                disabled={Boolean(savingAction)}
              >
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <label className="onboarding-field">
            <span>마감일 <em>선택</em></span>
            <input
              type="date"
              value={opportunityDeadline}
              onChange={event => setOpportunityDeadline(event.target.value)}
              disabled={Boolean(savingAction)}
            />
          </label>
        )}
      </div>
    )
  }

  const renderStep = () => {
    if (step === 0) {
      return (
        <section className="onboarding-step onboarding-purpose-step" aria-labelledby="onboarding-step-title">
          <div className="onboarding-step-copy">
            <span>{mode === 'setup' ? '처음 오셨군요' : '내게 맞는 사용 흐름 찾기'}</span>
            <h2 id="onboarding-step-title" ref={headingRef} tabIndex={-1}>
              플래너를 어디에 가장 많이 쓰고 싶나요?
            </h2>
            <p>하나를 고르면 첫 기록 방식과 시작 홈을 알맞게 안내해 드릴게요.</p>
          </div>
          <fieldset className="onboarding-purpose-fieldset">
            <legend className="onboarding-sr-only">주 사용 목적</legend>
            <div className="onboarding-purpose-grid" role="radiogroup" aria-label="주 사용 목적">
              {ONBOARDING_PURPOSES.map((config, index) => {
                const selected = purpose === config.purpose
                return (
                  <button
                    key={config.purpose}
                    type="button"
                    className={`onboarding-purpose-card${selected ? ' selected' : ''}`}
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected || (!purpose && index === 0) ? 0 : -1}
                    onClick={() => choosePurpose(config.purpose)}
                    onKeyDown={event => handlePurposeKeyDown(event, index)}
                    disabled={Boolean(savingAction)}
                  >
                    <span className="onboarding-purpose-mark" aria-hidden="true">
                      {PURPOSE_MARKS[config.purpose]}
                    </span>
                    <strong>{config.label}</strong>
                    <small>{config.description}</small>
                    <i aria-hidden="true">{selected ? '선택됨' : '선택'}</i>
                  </button>
                )
              })}
            </div>
          </fieldset>
        </section>
      )
    }

    if (step === 1) {
      return (
        <section className="onboarding-step" aria-labelledby="onboarding-step-title">
          <div className="onboarding-step-copy">
            <span>기록의 크기를 구분해요</span>
            <h2 id="onboarding-step-title" ref={headingRef} tabIndex={-1}>
              네 가지 핵심 기능은 이렇게 달라요
            </h2>
            <p>오늘 할 일부터 장기 목표까지, 기록의 크기에 맞는 곳에 담으면 흐름이 선명해집니다.</p>
          </div>
          <div className="onboarding-concept-grid">
            {CORE_CONCEPTS.map(concept => (
              <article key={concept.key} className="onboarding-concept-card">
                <span aria-hidden="true">{concept.mark}</span>
                <div>
                  <h3>{concept.title}</h3>
                  <p>{concept.description}</p>
                </div>
              </article>
            ))}
          </div>
          {selectedConfig && (
            <div className="onboarding-purpose-reminder">
              <span>선택한 목적</span>
              <strong>{selectedConfig.label}</strong>
              <p>{selectedConfig.firstItemDescription}</p>
            </div>
          )}
        </section>
      )
    }

    if (step === 2 && selectedConfig) {
      const example = guideExample(selectedConfig.purpose)
      return (
        <section className="onboarding-step" aria-labelledby="onboarding-step-title">
          <div className="onboarding-step-copy">
            <span>{selectedConfig.label} · 첫 기록</span>
            <h2 id="onboarding-step-title" ref={headingRef} tabIndex={-1}>
              {mode === 'setup' ? '첫 항목을 함께 만들어 볼까요?' : '첫 항목은 이렇게 시작해 보세요'}
            </h2>
            <p>{selectedConfig.firstItemDescription}</p>
          </div>
          {mode === 'setup' ? (
            <form
              id="onboarding-first-entry-form"
              className="onboarding-entry-form"
              onSubmit={handleFirstEntrySubmit}
              noValidate
            >
              {renderFirstEntryForm()}
            </form>
          ) : (
            <div className="onboarding-guide-example">
              <span>{example.eyebrow}</span>
              <h3>{example.title}</h3>
              <div>
                {example.details.map(detail => <small key={detail}>{detail}</small>)}
              </div>
              <p>{example.note}</p>
            </div>
          )}
        </section>
      )
    }

    if (step === 3 && selectedConfig) {
      return (
        <section className="onboarding-step" aria-labelledby="onboarding-step-title">
          <div className="onboarding-step-copy">
            <span>{selectedConfig.label} · 추천 홈</span>
            <h2 id="onboarding-step-title" ref={headingRef} tabIndex={-1}>
              필요한 위젯부터 가볍게 시작해요
            </h2>
            <p>
              {mode === 'setup'
                ? '선택한 목적에 맞는 위젯을 홈에 배치하고 첫 항목을 함께 저장합니다.'
                : '아래 구성을 참고해 대시보드 편집에서 내 홈을 직접 바꿀 수 있어요.'}
            </p>
          </div>
          <div className="onboarding-preset-preview" aria-label={`${selectedConfig.label} 추천 위젯`}>
            <div className="onboarding-preset-head">
              <div>
                <span>STARTER HOME</span>
                <strong>{selectedConfig.label}</strong>
              </div>
              <small>{selectedConfig.widgetIds.length}개 위젯</small>
            </div>
            <ol className="onboarding-widget-list">
              {selectedConfig.widgetIds.map((widgetId, index) => (
                <li key={widgetId}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{STARTER_WIDGET_DEFAULTS[widgetId].name}</strong>
                </li>
              ))}
            </ol>
          </div>
          <div className={`onboarding-final-note${mode === 'guide' ? ' guide' : ''}`}>
            <strong>{mode === 'setup' ? '적용 전 확인' : '안내 전용 모드'}</strong>
            <p>
              {mode === 'setup'
                ? '완료하면 첫 항목과 추천 홈이 한 번에 저장됩니다.'
                : '가이드를 보는 동안 기존 기록과 홈 구성은 변경되지 않습니다.'}
            </p>
          </div>
        </section>
      )
    }

    return null
  }

  if (!open) return null

  const title = mode === 'setup' ? '새 사용자 시작 가이드' : '사용 가이드 다시 보기'

  return createPortal(
    <div
      className="onboarding-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget && mode === 'guide') onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-dialog-title"
        aria-describedby="onboarding-dialog-description"
        aria-busy={Boolean(savingAction)}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="onboarding-header">
          <div className="onboarding-brand">
            <span aria-hidden="true"><i /><i /><i /><i /></span>
            <div>
              <strong id="onboarding-dialog-title">나만의 플래너</strong>
              <small id="onboarding-dialog-description">{title}</small>
            </div>
          </div>
          {mode === 'setup' ? (
            <button
              ref={skipButtonRef}
              type="button"
              className="onboarding-skip-button"
              onClick={() => void handleSkip()}
              disabled={Boolean(savingAction)}
            >
              {savingAction === 'skip' ? '기본 홈 적용 중…' : '건너뛰기'}
            </button>
          ) : (
            <button
              type="button"
              className="onboarding-close-button"
              onClick={onClose}
              aria-label="사용 가이드 닫기"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </header>

        <nav className="onboarding-progress" aria-label="온보딩 진행 단계">
          <ol>
            {STEP_LABELS.map((label, index) => (
              <li
                key={label}
                className={`${index === step ? 'current' : ''}${index < step ? ' complete' : ''}`}
                aria-current={index === step ? 'step' : undefined}
              >
                <span aria-hidden="true">{index < step ? '✓' : index + 1}</span>
                <small>{label}</small>
              </li>
            ))}
          </ol>
          <strong>{step + 1} / {STEP_LABELS.length}</strong>
        </nav>

        <main className="onboarding-body">
          {renderStep()}
          {validationError && (
            <div
              id="onboarding-validation-error"
              ref={feedbackRef}
              className="onboarding-message error"
              role="alert"
              tabIndex={-1}
            >
              <span aria-hidden="true">!</span>
              <p>{validationError}</p>
            </div>
          )}
          {asyncError && (
            <div
              ref={feedbackRef}
              className="onboarding-message error retry"
              role="alert"
              tabIndex={-1}
            >
              <span aria-hidden="true">!</span>
              <p>{asyncError}</p>
              <button type="button" onClick={retryFailedAction} disabled={Boolean(savingAction)}>
                다시 시도
              </button>
            </div>
          )}
          {escapeHint && mode === 'setup' && (
            <div className="onboarding-message info" role="status">
              <span aria-hidden="true">i</span>
              <p>설정을 끝내려면 상단의 건너뛰기를 선택해 주세요. 작성 중인 내용은 저장되지 않습니다.</p>
            </div>
          )}
        </main>

        <footer className="onboarding-footer">
          <div>
            {step > 0 && (
              <button
                type="button"
                className="onboarding-button secondary"
                onClick={goBack}
                disabled={Boolean(savingAction)}
              >
                이전
              </button>
            )}
          </div>
          <div>
            {mode === 'guide' && step === 3 ? (
              <button
                type="button"
                className="onboarding-button primary"
                onClick={onOpenDashboardEditor}
              >
                대시보드 편집 열기
              </button>
            ) : mode === 'setup' && step === 3 ? (
              <button
                type="button"
                className="onboarding-button primary"
                onClick={() => void handleComplete()}
                disabled={Boolean(savingAction)}
              >
                {savingAction === 'complete' ? '저장 중…' : '홈 적용하고 시작하기'}
              </button>
            ) : step === 2 && mode === 'setup' ? (
              <button
                type="submit"
                form="onboarding-first-entry-form"
                className="onboarding-button primary"
                disabled={Boolean(savingAction)}
              >
                추천 홈 보기
              </button>
            ) : (
              <button
                type="button"
                className="onboarding-button primary"
                onClick={goNext}
                disabled={Boolean(savingAction)}
              >
                {step === 0 ? '선택하고 계속' : '다음'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
