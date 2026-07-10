import { useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import {
  createLinkAnalysisDraft,
  type LinkAnalysisDraft,
  type LinkInsertTarget,
  type LinkSourceKind,
} from '../services/linkAnalysisService'
import type { CareerEvent, CareerEventCategory, CareerEventStatus } from '../types'
import {
  CAREER_CATEGORY_LABELS,
  CAREER_STATUS_LABELS,
  syncCareerEventDateFields,
} from '../utils/careerEvents'
import { Drawer } from './ui/Drawer'
import { Button } from './ui/Button'

type TargetChoice = 'auto' | LinkInsertTarget

interface LinkOrganizerModalProps {
  open: boolean
  onClose: () => void
  defaultTarget?: LinkInsertTarget
  lockTarget?: boolean
  applyToCareerForm?: (draft: LinkAnalysisDraft) => void
}

const TARGET_LABELS: Record<LinkInsertTarget, string> = {
  career: '기회 일정',
  calendar: '캘린더',
  task: '작업 목록',
  note: '메모',
}

const TASK_TYPES = ['업무', '개인', '공부', '기타'] as const
const TASK_PRIORITIES = ['높음', '보통', '낮음'] as const
const TASK_STATUSES = ['진행 중', '대기', '완료'] as const
const MODE_LABELS: Record<LinkAnalysisDraft['mode'], string> = {
  online: '온라인',
  offline: '오프라인',
  hybrid: '온/오프라인',
}

export default function LinkOrganizerModal({
  open,
  onClose,
  defaultTarget,
  lockTarget,
  applyToCareerForm,
}: LinkOrganizerModalProps) {
  const {
    setCareerEvents,
    setScheduledTasks,
    setTasks,
    setNotes,
  } = useApp()
  const { setPage } = useRouter()
  const [url, setUrl] = useState('')
  const [memo, setMemo] = useState('')
  const [sourceKind, setSourceKind] = useState<LinkSourceKind>('web-page')
  const [posterText, setPosterText] = useState('')
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState('')
  const [ocrError, setOcrError] = useState('')
  const [targetChoice, setTargetChoice] = useState<TargetChoice>(defaultTarget ?? 'auto')
  const [draft, setDraft] = useState<LinkAnalysisDraft | null>(null)
  const [taskType, setTaskType] = useState('기타')
  const [taskPriority, setTaskPriority] = useState('보통')
  const [taskStatus, setTaskStatus] = useState('진행 중')
  const [organization, setOrganization] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setUrl('')
    setMemo('')
    setSourceKind('web-page')
    setPosterText('')
    setOcrBusy(false)
    setOcrProgress(0)
    setOcrStatus('')
    setOcrError('')
    setDraft(null)
    setError('')
    setTargetChoice(defaultTarget ?? 'auto')
    setTaskType('기타')
    setTaskPriority('보통')
    setTaskStatus('진행 중')
    setOrganization('')
  }, [defaultTarget, open])

  if (!open) return null

  const analyze = () => {
    try {
      const next = createLinkAnalysisDraft({
        url,
        memo,
        posterText,
        sourceKind,
        target: targetChoice === 'auto' ? undefined : targetChoice,
      })
      setDraft(next)
      setTargetChoice(next.target)
      setError('')
    } catch {
      setError('올바른 링크를 입력해 주세요.')
      setDraft(null)
    }
  }

  const runPosterOcr = async (file?: File) => {
    if (!file) return
    setSourceKind('image-poster')
    setDraft(null)
    setOcrBusy(true)
    setOcrProgress(0)
    setOcrStatus('OCR 준비 중')
    setOcrError('')

    let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | null = null
    try {
      const { createWorker } = await import('tesseract.js')
      worker = await createWorker('kor+eng', 1, {
        logger: message => {
          setOcrStatus(message.status)
          setOcrProgress(Math.round((message.progress || 0) * 100))
        },
      })
      await worker.setParameters({ preserve_interword_spaces: '1' })
      const result = await worker.recognize(file)
      const text = result.data.text.trim()
      if (!text) {
        setOcrError('이미지에서 읽힌 텍스트가 없습니다. 포스터 내용을 직접 입력해 주세요.')
        return
      }
      setPosterText(previous => previous.trim() ? `${previous.trim()}\n\n${text}` : text)
      setOcrStatus('OCR 완료')
      setOcrProgress(100)
    } catch (error) {
      console.error(error)
      setOcrError('이미지 OCR에 실패했습니다. 이미지가 너무 작거나 네트워크로 언어 데이터를 불러오지 못했을 수 있습니다.')
    } finally {
      if (worker) await worker.terminate()
      setOcrBusy(false)
    }
  }

  const updateDraft = <K extends keyof LinkAnalysisDraft>(key: K, value: LinkAnalysisDraft[K]) => {
    setDraft(previous => previous ? { ...previous, [key]: value } : previous)
  }

  const save = () => {
    if (!draft) return

    const now = new Date().toISOString()
    if (applyToCareerForm && draft.target === 'career') {
      applyToCareerForm(draft)
      onClose()
      return
    }

    if (draft.target === 'career') {
      const careerEvent = syncCareerEventDateFields({
        id: `link-career-${Date.now()}`,
        title: draft.title,
        organization: organization.trim() || draft.hostname,
        category: draft.category,
        status: draft.status,
        date: draft.date,
        applicationDeadline: draft.deadline || undefined,
        resultDate: draft.resultDate || undefined,
        time: draft.time || undefined,
        endTime: draft.endTime || undefined,
        mode: draft.mode,
        location: draft.location || undefined,
        url: draft.url,
        sourceUrl: draft.url,
        note: draft.summary,
      }) as CareerEvent
      setCareerEvents(previous => [careerEvent, ...previous])
      setPage('career')
    }

    if (draft.target === 'calendar') {
      setScheduledTasks(previous => [...previous, {
        id: `link-scheduled-${Date.now()}`,
        title: draft.title,
        date: draft.date,
        time: draft.time || undefined,
        endTime: draft.endTime || undefined,
        mode: draft.mode,
        location: draft.location || undefined,
        note: draft.summary,
        sourceUrl: draft.url,
        done: false,
      }])
      setPage('calendar')
    }

    if (draft.target === 'task') {
      setTasks(previous => [{
        id: `link-task-${Date.now()}`,
        name: draft.title,
        due: draft.deadline || draft.date,
        type: taskType,
        priority: taskPriority,
        status: taskStatus,
        owner: draft.hostname,
        sourceUrl: draft.url,
        done: taskStatus === '완료',
      }, ...previous])
      setPage('tasks')
    }

    if (draft.target === 'note') {
      setNotes(previous => [{
        id: `link-note-${Date.now()}`,
        title: draft.title,
        date: draft.date,
        content: draft.summary,
        fav: false,
        createdAt: now,
        updatedAt: now,
        referenceUrl: draft.url,
        sourceUrl: draft.url,
      }, ...previous])
      setPage('notes')
    }

    onClose()
  }

  const primaryLabel = applyToCareerForm && draft?.target === 'career'
    ? '작성 폼에 적용'
    : `${draft ? TARGET_LABELS[draft.target] : '플래너'}에 정리`

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="링크 정리"
      description="링크를 붙여넣고 저장 위치를 확인하세요."
      width="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={save} disabled={!draft || !draft.title.trim()}>{primaryLabel}</Button>
        </>
      )}
    >
      <div className="link-organizer-content">
        <div className="link-modal-grid">
          <label>자료 유형
            <select
              value={sourceKind}
              onChange={event => {
                setSourceKind(event.target.value as LinkSourceKind)
                setDraft(null)
                setOcrError('')
              }}
            >
              <option value="web-page">일반 링크</option>
              <option value="image-poster">이미지 포스터</option>
            </select>
          </label>
          <label>정리 위치
            <select
              value={targetChoice}
              onChange={event => setTargetChoice(event.target.value as TargetChoice)}
              disabled={lockTarget}
            >
              {!lockTarget && <option value="auto">자동 추천</option>}
              {Object.entries(TARGET_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="span-2">링크
            <input
              value={url}
              onChange={event => setUrl(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) analyze() }}
              placeholder={sourceKind === 'image-poster' ? '이미지 포스터가 있는 공고 링크 또는 이미지 주소' : 'https://...'}
              autoFocus
            />
          </label>
          {sourceKind === 'image-poster' && (
            <>
              <div className="poster-ocr-box span-2">
                <div>
                  <strong>포스터 이미지 OCR</strong>
                  <span>이미지 파일을 선택하면 한국어/영어 글자를 읽어 아래 칸에 채웁니다.</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={ocrBusy}
                  onChange={event => {
                    void runPosterOcr(event.target.files?.[0])
                    event.currentTarget.value = ''
                  }}
                />
                {ocrBusy && (
                  <div className="poster-ocr-progress">
                    <span>{ocrStatus || 'OCR 진행 중'}</span>
                    <strong>{ocrProgress}%</strong>
                  </div>
                )}
                {ocrError && <div className="poster-ocr-error">{ocrError}</div>}
              </div>
              <label className="span-2">포스터에서 읽은 내용
                <textarea
                  value={posterText}
                  onChange={event => setPosterText(event.target.value)}
                  placeholder="포스터에 적힌 제목, 모집 기간, 행사일, 장소, 혜택 등을 붙여넣으면 날짜와 장소를 초안으로 추출합니다."
                  rows={6}
                />
              </label>
            </>
          )}
          <label className="span-2">참고 메모
            <textarea
              value={memo}
              onChange={event => setMemo(event.target.value)}
              placeholder="링크에서 꼭 챙길 내용, 신청 조건, 확인할 점"
              rows={3}
            />
          </label>
        </div>

        {error && <div className="link-modal-error">{error}</div>}

        <div className="link-modal-actions">
          <Button variant="secondary" onClick={analyze}>초안 만들기</Button>
        </div>

        {draft && (
          <div className="link-preview">
            <div className="link-preview-head">
              <strong>{draft.sourceKind === 'image-poster' ? '포스터 분석' : TARGET_LABELS[draft.target]} 미리보기</strong>
              <span>{draft.hostname}</span>
            </div>
            {draft.notice && <div className="link-modal-notice">{draft.notice}</div>}
            <div className="link-modal-grid">
              <label className="span-2">제목
                <input value={draft.title} onChange={event => updateDraft('title', event.target.value)} />
              </label>

              {draft.target === 'career' && (
                <>
                  <label>기관/회사
                    <input value={organization} onChange={event => setOrganization(event.target.value)} placeholder={draft.hostname} />
                  </label>
                  <label>구분
                    <select value={draft.category} onChange={event => updateDraft('category', event.target.value as CareerEventCategory)}>
                      {Object.entries(CAREER_CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>상태
                    <select value={draft.status} onChange={event => updateDraft('status', event.target.value as CareerEventStatus)}>
                      {Object.entries(CAREER_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>대표 일정일
                    <input type="date" value={draft.date} onChange={event => updateDraft('date', event.target.value)} />
                  </label>
                  <label>신청 마감일
                    <input type="date" value={draft.deadline} onChange={event => updateDraft('deadline', event.target.value)} />
                  </label>
                  <label>결과 발표일
                    <input type="date" value={draft.resultDate ?? ''} onChange={event => updateDraft('resultDate', event.target.value)} />
                  </label>
                  <label>시작 시간
                    <input type="time" value={draft.time ?? ''} onChange={event => updateDraft('time', event.target.value)} />
                  </label>
                  <label>종료 시간
                    <input type="time" value={draft.endTime ?? ''} onChange={event => updateDraft('endTime', event.target.value)} />
                  </label>
                  <label>진행 방식
                    <select value={draft.mode} onChange={event => updateDraft('mode', event.target.value as LinkAnalysisDraft['mode'])}>
                      {Object.entries(MODE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="span-2">장소
                    <input value={draft.location ?? ''} onChange={event => updateDraft('location', event.target.value)} />
                  </label>
                </>
              )}

              {draft.target === 'calendar' && (
                <>
                  <label>일정일
                    <input type="date" value={draft.date} onChange={event => updateDraft('date', event.target.value)} />
                  </label>
                  <label>시작 시간
                    <input type="time" value={draft.time ?? ''} onChange={event => updateDraft('time', event.target.value)} />
                  </label>
                  <label>종료 시간
                    <input type="time" value={draft.endTime ?? ''} onChange={event => updateDraft('endTime', event.target.value)} />
                  </label>
                  <label>진행 방식
                    <select value={draft.mode} onChange={event => updateDraft('mode', event.target.value as LinkAnalysisDraft['mode'])}>
                      {Object.entries(MODE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="span-2">장소
                    <input value={draft.location ?? ''} onChange={event => updateDraft('location', event.target.value)} />
                  </label>
                </>
              )}

              {draft.target === 'task' && (
                <>
                  <label>마감일
                    <input type="date" value={draft.deadline || draft.date} onChange={event => updateDraft('deadline', event.target.value)} />
                  </label>
                  <label>유형
                    <select value={taskType} onChange={event => setTaskType(event.target.value)}>
                      {TASK_TYPES.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>우선순위
                    <select value={taskPriority} onChange={event => setTaskPriority(event.target.value)}>
                      {TASK_PRIORITIES.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>상태
                    <select value={taskStatus} onChange={event => setTaskStatus(event.target.value)}>
                      {TASK_STATUSES.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                </>
              )}

              <label className="span-2">정리 내용
                <textarea value={draft.summary} onChange={event => updateDraft('summary', event.target.value)} rows={5} />
              </label>
            </div>
          </div>
        )}

      </div>
    </Drawer>
  )
}
