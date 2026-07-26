import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import {
  createLinkAnalysisDraft,
  type LinkAnalysisDraft,
  type LinkInsertTarget,
  type LinkSourceKind,
} from '../services/linkAnalysisService'
import type { CareerEvent, CareerEventCategory, CareerEventStatus } from '../types'
import { getJobPostingImageBlob, getJobPostingPageText } from '../services/jobPostingPageReader'
import {
  CAREER_CATEGORY_LABELS,
  CAREER_STATUS_LABELS,
  syncCareerEventDateFields,
} from '../utils/careerEvents'
import { toLocalDateKey } from '../utils/date'

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
const MODE_LABELS: Record<NonNullable<LinkAnalysisDraft['mode']>, string> = {
  online: '온라인',
  offline: '오프라인',
  hybrid: '온/오프라인',
}

const buttonStyle = {
  border: '1px solid var(--border)',
  borderRadius: 7,
  background: 'var(--bg3)',
  color: 'var(--text)',
  minHeight: 36,
  padding: '0 12px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
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
  const [analyzeBusy, setAnalyzeBusy] = useState(false)
  const [pageImageUrls, setPageImageUrls] = useState<string[]>([])
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
    setAnalyzeBusy(false)
    setPageImageUrls([])
    setDraft(null)
    setError('')
    setTargetChoice(defaultTarget ?? 'auto')
    setTaskType('기타')
    setTaskPriority('보통')
    setTaskStatus('진행 중')
    setOrganization('')
  }, [defaultTarget, open])

  if (!open) return null

  const analyze = async () => {
    setError('')
    setAnalyzeBusy(true)
    try {
      let pageText = ''
      let readerResult: Awaited<ReturnType<typeof getJobPostingPageText>> | undefined
      if (sourceKind === 'web-page') {
        try {
          readerResult = await getJobPostingPageText(url, { acceptAnyText: true })
          pageText = readerResult.text
          setPageImageUrls(readerResult.imageUrls)
        } catch {
          pageText = ''
          setPageImageUrls([])
        }
      }
      const next = createLinkAnalysisDraft({
        url,
        memo,
        pageText,
        posterText,
        sourceKind,
        target: targetChoice === 'auto' ? undefined : targetChoice,
        finalUrl: readerResult?.finalUrl,
        imageUrls: readerResult?.imageUrls,
        readerStatus: readerResult?.status,
        readerMessage: readerResult?.message,
        readerSource: readerResult?.source,
      })
      setDraft(next)
      setTargetChoice(next.target)
      setOrganization(next.organization ?? '')
      setError('')
    } catch {
      setError('올바른 링크를 입력해 주세요.')
      setDraft(null)
    } finally {
      setAnalyzeBusy(false)
    }
  }

  const runOcr = async (source?: File | Blob) => {
    if (!source) return
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
      const result = await worker.recognize(source)
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

  const runPosterOcr = async (file?: File) => runOcr(file)

  const runPageImageOcr = async (imageUrl: string) => {
    setOcrError('')
    setOcrStatus('페이지 이미지 불러오는 중')
    setOcrBusy(true)
    try {
      const blob = await getJobPostingImageBlob(imageUrl)
      await runOcr(blob)
    } catch {
      setOcrError('페이지 이미지를 불러오지 못했습니다. 다른 이미지 후보를 선택하거나 파일로 내려받아 OCR해 주세요.')
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
      applyToCareerForm({ ...draft, organization: organization.trim() || draft.organization })
      onClose()
      return
    }

    if (draft.target === 'career') {
      const careerEvent = syncCareerEventDateFields({
        id: `link-career-${Date.now()}`,
        title: draft.title,
        organization: organization.trim() || draft.organization || undefined,
        category: draft.category,
        status: draft.status,
        date: draft.date,
        applicationDeadline: draft.deadline || undefined,
        resultDate: draft.resultDate || undefined,
        operationStartDate: draft.operationStartDate || undefined,
        operationEndDate: draft.operationEndDate || undefined,
        milestones: draft.milestones.map((milestone, index) => ({
          ...milestone,
          id: `link-milestone-${Date.now()}-${index}`,
        })),
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
        owner: draft.organization,
        sourceUrl: draft.url,
        done: taskStatus === '완료',
      }, ...previous])
      setPage('tasks')
    }

    if (draft.target === 'note') {
      setNotes(previous => [{
        id: `link-note-${Date.now()}`,
        title: draft.title,
        date: draft.date || toLocalDateKey(),
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
  const requiresDate = Boolean(
    draft
    && !applyToCareerForm
    && ['career', 'calendar'].includes(draft.target),
  )
  const canSave = Boolean(
    draft?.title.trim()
    && (!requiresDate || draft.date),
  )

  return createPortal(
    <div
      className="link-modal-backdrop"
      role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <section className="link-modal" role="dialog" aria-modal="true" aria-labelledby="link-modal-title">
        <div className="link-modal-head">
          <div>
            <h2 id="link-modal-title">링크 정리</h2>
            <p>링크를 붙여넣고 저장 위치를 확인하세요.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="링크 정리 닫기">×</button>
        </div>

        <div className="link-modal-grid">
          <label>자료 유형
            <select
              value={sourceKind}
              onChange={event => {
                setSourceKind(event.target.value as LinkSourceKind)
                setDraft(null)
                setOcrError('')
                setPageImageUrls([])
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
              onChange={event => {
                setUrl(event.target.value)
                setDraft(null)
                setPageImageUrls([])
              }}
              onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) void analyze() }}
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
          <button type="button" style={buttonStyle} onClick={analyze} disabled={analyzeBusy}>
            {analyzeBusy ? '페이지 읽는 중' : '초안 만들기'}
          </button>
        </div>

        {pageImageUrls.length > 0 && (
          <div className="link-image-candidates">
            <div>
              <strong>페이지 이미지 후보 {pageImageUrls.length}개</strong>
              <span>글자가 있는 이미지를 선택해 OCR할 수 있습니다.</span>
            </div>
            <div className="link-image-candidate-list">
              {pageImageUrls.map((imageUrl, index) => (
                <button key={imageUrl} type="button" onClick={() => void runPageImageOcr(imageUrl)} disabled={ocrBusy}>
                  <img src={imageUrl} alt={`페이지 이미지 후보 ${index + 1}`} loading="lazy" referrerPolicy="no-referrer" />
                  <span>{index + 1}번 OCR</span>
                </button>
              ))}
            </div>
            {ocrStatus && <small aria-live="polite">{ocrStatus}</small>}
            {ocrError && <small className="link-modal-error">{ocrError}</small>}
          </div>
        )}

        {draft && (
          <div className="link-preview">
            <div className="link-preview-head">
              <strong>{draft.sourceKind === 'image-poster' ? '포스터 분석' : TARGET_LABELS[draft.target]} 미리보기</strong>
              <span>신뢰도 {draft.confidence === 'high' ? '높음' : draft.confidence === 'medium' ? '보통' : '낮음'} · {draft.hostname}</span>
            </div>
            {draft.notice && <div className="link-modal-notice">{draft.notice}</div>}
            <div className="link-modal-grid">
              <label className="span-2">제목
                <input value={draft.title} onChange={event => updateDraft('title', event.target.value)} />
              </label>

              {draft.target === 'career' && (
                <>
                  <label>기관/회사
                    <input
                      value={organization}
                      onChange={event => {
                        setOrganization(event.target.value)
                        updateDraft('organization', event.target.value || undefined)
                      }}
                      placeholder="자동 확인 안 됨"
                    />
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
                    <select value={draft.mode ?? ''} onChange={event => updateDraft('mode', event.target.value ? event.target.value as NonNullable<LinkAnalysisDraft['mode']> : undefined)}>
                      <option value="">확인 필요</option>
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
                    <select value={draft.mode ?? ''} onChange={event => updateDraft('mode', event.target.value ? event.target.value as NonNullable<LinkAnalysisDraft['mode']> : undefined)}>
                      <option value="">확인 필요</option>
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

        <div className="link-modal-footer">
          <button type="button" style={buttonStyle} onClick={onClose}>취소</button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            style={{
              ...buttonStyle,
              borderColor: 'var(--accent)',
              background: 'var(--accent)',
              color: '#fff',
              opacity: !canSave ? 0.55 : 1,
            }}
          >
            {primaryLabel}
          </button>
        </div>

        <style>{`
          .link-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: grid;
            place-items: center;
            padding: 18px;
            background: rgba(0, 0, 0, 0.48);
          }
          .link-modal {
            width: min(760px, 100%);
            max-height: min(86vh, 820px);
            overflow: auto;
            box-sizing: border-box;
            border: 1px solid var(--border);
            border-radius: 10px;
            background: var(--bg2);
            color: var(--text);
            padding: 18px;
            box-shadow: 0 20px 70px rgba(0, 0, 0, 0.28);
            display: flex;
            flex-direction: column;
            gap: 13px;
          }
          .link-modal-head,
          .link-preview-head,
          .link-modal-footer,
          .link-modal-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .link-modal-head h2 { margin: 0 0 4px; font-size: 20px; letter-spacing: 0; }
          .link-modal-head p { margin: 0; color: var(--muted); font-size: 12px; }
          .link-modal-head > button {
            width: 34px;
            height: 34px;
            border: 1px solid var(--border);
            border-radius: 7px;
            background: var(--bg3);
            color: var(--muted);
            font-size: 22px;
            cursor: pointer;
          }
          .link-modal-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
          .link-modal-grid label {
            display: flex;
            flex-direction: column;
            gap: 5px;
            color: var(--muted);
            font-size: 11px;
            font-weight: 800;
          }
          .link-modal-grid .span-2 { grid-column: 1 / -1; }
          .link-modal-grid input,
          .link-modal-grid select,
          .link-modal-grid textarea {
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
            border: 1px solid var(--border);
            border-radius: 7px;
            background: var(--bg3);
            color: var(--text);
            padding: 9px 10px;
            font: inherit;
            font-size: 13px;
            outline: none;
          }
          .link-modal-grid textarea { resize: vertical; line-height: 1.55; }
          .poster-ocr-box {
            border: 1px dashed var(--border);
            border-radius: 8px;
            background: var(--bg);
            padding: 11px;
            display: flex;
            flex-direction: column;
            gap: 9px;
          }
          .poster-ocr-box > div:first-child {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .poster-ocr-box strong { font-size: 12px; color: var(--text); }
          .poster-ocr-box span { font-size: 11px; color: var(--muted); line-height: 1.45; }
          .poster-ocr-box input[type="file"] {
            font-size: 12px;
            color: var(--muted);
          }
          .poster-ocr-progress {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            border-radius: 7px;
            background: rgba(49, 130, 206, 0.1);
            padding: 8px 9px;
          }
          .poster-ocr-error {
            border-radius: 7px;
            background: rgba(224, 82, 82, 0.1);
            color: var(--red);
            padding: 8px 9px;
            font-size: 12px;
            line-height: 1.45;
          }
          .link-image-candidates {
            display: flex;
            flex-direction: column;
            gap: 9px;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--bg3);
            padding: 11px;
          }
          .link-image-candidates > div:first-child {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .link-image-candidates strong { font-size: 12px; }
          .link-image-candidates span,
          .link-image-candidates small { color: var(--muted); font-size: 11px; line-height: 1.45; }
          .link-image-candidate-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
            gap: 8px;
          }
          .link-image-candidate-list button {
            min-width: 0;
            border: 1px solid var(--border);
            border-radius: 7px;
            background: var(--bg2);
            color: var(--text);
            padding: 6px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            cursor: pointer;
          }
          .link-image-candidate-list img {
            width: 100%;
            height: 74px;
            object-fit: contain;
            background: #fff;
            border-radius: 5px;
          }
          .link-modal-error {
            border-radius: 7px;
            background: rgba(224, 82, 82, 0.1);
            color: var(--red);
            padding: 9px 10px;
            font-size: 12px;
          }
          .link-modal-notice {
            border-radius: 7px;
            background: rgba(245, 158, 11, 0.12);
            color: #b77900;
            padding: 9px 10px;
            font-size: 12px;
            line-height: 1.5;
          }
          .link-preview {
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--bg);
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .link-preview-head strong { font-size: 13px; }
          .link-preview-head span { color: var(--muted); font-size: 11px; }
          .link-modal-footer { justify-content: flex-end; }
          @media (max-width: 640px) {
            .link-modal-backdrop { align-items: end; padding: 10px; }
            .link-modal { max-height: calc(100vh - 20px); padding: 14px; }
            .link-modal-grid { grid-template-columns: 1fr; }
            .link-modal-grid .span-2 { grid-column: auto; }
            .link-modal-footer { flex-direction: column-reverse; align-items: stretch; }
          }
        `}</style>
      </section>
    </div>,
    document.body,
  )
}
