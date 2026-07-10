import { useState, useEffect, type ReactNode, type CSSProperties } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, ExternalLink, Plus } from 'lucide-react'
import { useWidgetSize } from '../hooks/useWidgetSize'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import { fetchHolidays } from '../services/holidayService'
import {
  CAREER_CATEGORY_LABELS,
  getCareerMilestones,
  mergeCareerDateFieldsIntoMilestones,
  syncCareerEventDateFields,
} from '../utils/careerEvents'
import { getCalendarLinkedItems, makeCalendarDays } from '../utils/calendar'
import { useConfirm } from '../components/ui/ConfirmProvider'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import type { Todo, ScheduledTask, CareerEvent, CareerEventCategory, CareerEventStatus, CareerMilestone, Goal, Project, Task } from '../types'

export function CalendarActions() {
  const { setPage } = useRouter()
  return (
    <IconButton
      onClick={() => setPage('calendar')}
      label="캘린더 관리"
      icon={<ExternalLink size={14} />}
      size="sm"
      variant="secondary"
    />
  )
}

export const meta = {
  id: 'calendar',
  name: '캘린더',
  icon: '🗓️',
  defaultW: 16,
  defaultH: 11,
  minW: 10,
  minH: 7,
  order: 3,
}

// ── 공휴일 데이터 ─────────────────────────────────────────
const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절',
}

const LUNAR_HOLIDAYS: Record<number, Record<string, string>> = {
  2024: {
    '02-09': '설날 전날', '02-10': '설날', '02-11': '설날 연휴',
    '05-15': '부처님오신날',
    '09-16': '추석 전날', '09-17': '추석', '09-18': '추석 연휴',
  },
  2025: {
    '01-28': '설날 전날', '01-29': '설날', '01-30': '설날 연휴',
    '05-05': '부처님오신날',
    '10-05': '추석 전날', '10-06': '추석', '10-07': '추석 연휴',
  },
  2026: {
    '02-16': '설날 전날', '02-17': '설날', '02-18': '설날 연휴',
    '05-24': '부처님오신날',
    '09-24': '추석 전날', '09-25': '추석', '09-26': '추석 연휴',
  },
  2027: {
    '02-06': '설날 전날', '02-07': '설날', '02-08': '설날 연휴',
    '05-13': '부처님오신날',
    '09-15': '추석 전날', '09-16': '추석', '09-17': '추석 연휴',
  },
  2028: {
    '01-26': '설날 전날', '01-27': '설날', '01-28': '설날 연휴',
    '05-02': '부처님오신날',
    '10-02': '추석 전날', '10-03': '추석', '10-04': '추석 연휴',
  },
}

function getHoliday(year: number, mmdd: string): string | undefined {
  return FIXED_HOLIDAYS[mmdd] ?? LUNAR_HOLIDAYS[year]?.[mmdd]
}

// ── 유틸 ─────────────────────────────────────────────────
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const CAREER_DATE_FIELDS: Record<CareerEventCategory, { application: boolean; result: boolean; operation: boolean }> = {
  briefing: { application: true, result: false, operation: false },
  interview: { application: false, result: true, operation: false },
  camp: { application: true, result: true, operation: true },
  program: { application: true, result: true, operation: true },
  seminar: { application: true, result: false, operation: false },
  contest: { application: true, result: true, operation: false },
  support: { application: true, result: true, operation: true },
  corp_support: { application: true, result: true, operation: true },
  other: { application: true, result: true, operation: true },
}

// ── 연/월 피커 ────────────────────────────────────────────
function YearMonthPicker({
  year, month, onSelect, onClose,
}: {
  year: number; month: number
  onSelect: (y: number, m: number) => void
  onClose: () => void
}) {
  const [pickerYear, setPickerYear] = useState(year)

  return (
    <Modal open onClose={onClose} title="월 선택" description={`${pickerYear}년`} size="sm">
      <div className="calendar-widget-year-picker">
        <div className="calendar-widget-year-controls">
          <IconButton label="이전 연도" icon={<ChevronLeft size={17} />} size="sm" onClick={() => setPickerYear(value => value - 1)} />
          <strong>{pickerYear}년</strong>
          <IconButton label="다음 연도" icon={<ChevronRight size={17} />} size="sm" onClick={() => setPickerYear(value => value + 1)} />
        </div>
        <div className="calendar-widget-month-grid">
          {MONTH_NAMES.map((name, i) => {
            const isActive = pickerYear === year && i === month
            return (
              <button
                key={name}
                type="button"
                className={isActive ? 'active' : undefined}
                aria-pressed={isActive}
                onClick={() => { onSelect(pickerYear, i); onClose() }}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

const calendarSelectStyle: CSSProperties = {
  width: '100%', minWidth: 0, padding: '7px 8px', borderRadius: 7,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  color: 'var(--text)', fontSize: 12, fontFamily: 'inherit',
  boxSizing: 'border-box', outline: 'none',
}

// ── 항목 추가/수정 폼 ─────────────────────────────────────
type FormType = 'scheduled' | 'todo' | 'career'
interface FormState {
  mode: 'add' | 'edit'
  type: FormType
  id?: string
  title: string
  date: string
  applicationDeadline: string
  resultDate: string
  operationStartDate: string
  operationEndDate: string
  time: string
  endTime: string
  scheduleMode: '' | 'offline' | 'online' | 'hybrid'
  location: string
  address: string
  note: string
  organization: string
  careerCategory: CareerEventCategory
  careerStatus: CareerEventStatus
  careerMilestones: CareerMilestone[]
  url: string
  priority: Todo['priority']
  done: boolean
}

function ItemForm({
  initial, onSave, onDelete, onCancel,
}: {
  initial: FormState
  onSave: (f: FormState) => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const set = (k: keyof FormState, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const careerDateFields = CAREER_DATE_FIELDS[form.careerCategory]

  return (
    <div style={{
      background: 'var(--bg3)', borderRadius: 8, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {initial.mode === 'add' && (
        <div style={{ display: 'flex', gap: 6 }}>
          {(['scheduled', 'todo', 'career'] as FormType[]).map(t => (
            <button type="button" key={t} onClick={() => set('type', t)} style={{
              flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: form.type === t ? 'var(--accent)' : 'var(--bg4)',
              color: form.type === t ? '#fff' : 'var(--muted)',
              fontSize: 12, fontWeight: form.type === t ? 600 : 400,
            }}>
              {t === 'scheduled' ? '예정 작업' : t === 'career' ? '기회 일정' : '할 일'}
            </button>
          ))}
        </div>
      )}

      <input
        autoFocus
        value={form.title}
        onChange={e => set('title', e.target.value)}
        placeholder={form.type === 'scheduled' ? '작업 제목' : form.type === 'career' ? '기회 일정명' : '할 일 내용'}
        style={{
          width: '100%', padding: '7px 10px', borderRadius: 7,
          border: '1px solid var(--border)', background: 'var(--bg2)',
          color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
          boxSizing: 'border-box', outline: 'none',
        }}
      />

      {form.type !== 'todo' && (
        <>
          {form.type === 'career' && (
            <>
              <input
                value={form.organization}
                onChange={e => set('organization', e.target.value)}
                placeholder="기관 또는 회사명"
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 7,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <select value={form.careerCategory} onChange={e => {
                  const category = e.target.value as CareerEventCategory
                  const fields = CAREER_DATE_FIELDS[category]
                  setForm(previous => ({
                    ...previous,
                    careerCategory: category,
                    applicationDeadline: fields.application ? previous.applicationDeadline : '',
                    resultDate: fields.result ? previous.resultDate : '',
                    operationStartDate: fields.operation ? previous.operationStartDate : '',
                    operationEndDate: fields.operation ? previous.operationEndDate : '',
                  }))
                }} style={calendarSelectStyle}>
                  <option value="briefing">채용설명회</option>
                  <option value="interview">면접</option>
                  <option value="camp">직무캠프</option>
                  <option value="program">교육/프로그램</option>
                  <option value="seminar">행사/세미나</option>
                  <option value="contest">공모전</option>
                  <option value="support">지원사업</option>
                  <option value="corp_support">기업 지원</option>
                  <option value="other">기타</option>
                </select>
                <select value={form.careerStatus} onChange={e => set('careerStatus', e.target.value)} style={calendarSelectStyle}>
                  <option value="interested">관심</option>
                  <option value="planned">신청 예정</option>
                  <option value="applied">신청 완료</option>
                  <option value="pending">결과 대기</option>
                  <option value="confirmed">선정/확정</option>
                  <option value="completed">완료</option>
                  {initial.mode === 'edit' && <option value="rejected">탈락</option>}
                  {initial.mode === 'edit' && <option value="cancelled">취소</option>}
                </select>
              </div>
            </>
          )}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
            color: 'var(--muted)', fontSize: 10, padding: '0 2px',
          }}>
            <span>날짜</span>
            <span>시작</span>
            <span>종료(선택)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <input
              type="date"
              value={form.date}
              onChange={e => set('date', e.target.value)}
              style={{
                minWidth: 0, padding: '7px 6px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
            <input
              type="time"
              value={form.time}
              onChange={e => set('time', e.target.value)}
              aria-label="시작 시간"
              title="시작 시간"
              style={{
                minWidth: 0, padding: '7px 6px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
            <input
              type="time"
              value={form.endTime}
              onChange={e => set('endTime', e.target.value)}
              aria-label="종료 시간"
              title="종료 시간"
              style={{
                minWidth: 0, padding: '7px 6px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
          {form.type === 'career' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
              {careerDateFields.application && <label style={{ color:'var(--muted)', fontSize:10 }}>
                신청 마감일
                <input type="date" value={form.applicationDeadline} onChange={e => set('applicationDeadline', e.target.value)} style={calendarSelectStyle} />
              </label>}
              {careerDateFields.result && <label style={{ color:'var(--muted)', fontSize:10 }}>
                결과 발표일 (선택)
                <input type="date" value={form.resultDate} onChange={e => set('resultDate', e.target.value)} style={calendarSelectStyle} />
              </label>}
              {careerDateFields.operation && <>
                <label style={{ color:'var(--muted)', fontSize:10 }}>
                  운영 시작일
                  <input type="date" value={form.operationStartDate} onChange={e => set('operationStartDate', e.target.value)} style={calendarSelectStyle} />
                </label>
                <label style={{ color:'var(--muted)', fontSize:10 }}>
                  운영 종료일
                  <input type="date" min={form.operationStartDate || undefined} value={form.operationEndDate} onChange={e => set('operationEndDate', e.target.value)} style={calendarSelectStyle} />
                </label>
              </>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            {([
              ['', '미지정'],
              ['offline', '오프라인'],
              ['online', '온라인'],
              ['hybrid', '온·오프라인'],
            ] as const).map(([value, label]) => (
              <button key={value || 'none'} type="button" onClick={() => set('scheduleMode', value)} style={{
                flex: 1, minWidth: 0, padding: '6px 4px', borderRadius: 6,
                border: '1px solid var(--border)', cursor: 'pointer',
                background: form.scheduleMode === value ? 'var(--accent)' : 'var(--bg2)',
                color: form.scheduleMode === value ? '#fff' : 'var(--muted)',
                fontSize: 10, fontWeight: form.scheduleMode === value ? 700 : 400,
              }}>
                {label}
              </button>
            ))}
          </div>
          {(form.type !== 'career' || form.scheduleMode !== 'online') && <input
            value={form.location}
            onChange={e => set('location', e.target.value)}
            placeholder={form.type === 'career' ? '장소명 또는 주소' : '장소'}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
              boxSizing: 'border-box', outline: 'none',
            }}
          />}
          {form.type !== 'career' && (
            <input
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="주소"
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          )}
          {form.type === 'career' && (
            <input
              value={form.url}
              onChange={e => set('url', e.target.value)}
              placeholder="공고, 신청 또는 온라인 접속 링크"
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          )}
          <textarea
            value={form.note}
            onChange={e => set('note', e.target.value)}
            placeholder="무엇을 하는 일정인지 적어주세요"
            rows={3}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
              boxSizing: 'border-box', outline: 'none', resize: 'vertical',
              minHeight: 74,
            }}
          />
        </>
      )}

      {form.type === 'todo' && (
        <div style={{ display: 'flex', gap: 6 }}>
          {([['high','⭐ 중요'],['medium','보통'],['low','낮음']] as [Todo['priority'],string][]).map(([p, label]) => (
            <button type="button" key={p} onClick={() => set('priority', p)} style={{
              flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: form.priority === p ? (p === 'high' ? 'var(--accent)' : 'var(--bg4)') : 'var(--bg4)',
              color: form.priority === p ? (p === 'high' ? '#fff' : 'var(--text)') : 'var(--muted)',
              fontSize: 11, fontWeight: form.priority === p ? 600 : 400,
            }}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <button type="button"
          onClick={() => form.title.trim() && onSave(form)}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
          }}>
          저장
        </button>
        {onDelete && (
          <button type="button" onClick={onDelete} style={{
            padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)',
            background: 'transparent', color: '#e05252', fontSize: 13, cursor: 'pointer',
          }}>
            삭제
          </button>
        )}
        <button type="button" onClick={onCancel} style={{
          padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
        }}>
          취소
        </button>
      </div>
    </div>
  )
}

// ── 하루 모달 ─────────────────────────────────────────────
interface ModalProps {
  date: Date
  holiday?: string
  todos: Todo[]
  scheduled: ScheduledTask[]
  career: CareerEvent[]
  tasks: Task[]
  goals: Goal[]
  projects: Project[]
  onClose: () => void
  onAddTodo: (text: string, priority: Todo['priority']) => void
  onAddScheduled: (task: Omit<ScheduledTask, 'id' | 'done'>) => void
  onAddCareer: (event: Omit<CareerEvent, 'id'>) => void
  onUpdateTodo: (id: string, patch: Partial<Todo>) => void
  onUpdateScheduled: (id: string, patch: Partial<ScheduledTask>) => void
  onUpdateCareer: (id: string, patch: Partial<CareerEvent>) => void
  onDeleteTodo: (id: string) => void
  onDeleteScheduled: (id: string) => void
  onDeleteCareer: (id: string) => void
}

function DayModal(props: ModalProps) {
  const confirm = useConfirm()
  const { date, holiday, todos, scheduled, career, tasks, goals, projects, onClose } = props
  const dateStr = toDateStr(date)
  const dateLabel = date.toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' })

  const [form, setForm] = useState<FormState | null>(null)

  const important = todos.filter(t => t.priority === 'high')
  const normal    = todos.filter(t => t.priority !== 'high')

  const handleSave = (f: FormState) => {
    const careerFields = CAREER_DATE_FIELDS[f.careerCategory]
    const buildCareerPayload = () => syncCareerEventDateFields({
      title: f.title.trim(),
      organization: f.organization.trim() || undefined,
      category: f.careerCategory,
      status: f.careerStatus,
      date: f.date,
      applicationDeadline: careerFields.application ? f.applicationDeadline || undefined : undefined,
      resultDate: careerFields.result ? f.resultDate || undefined : undefined,
      operationStartDate: careerFields.operation ? f.operationStartDate || undefined : undefined,
      operationEndDate: careerFields.operation && f.operationEndDate && (!f.operationStartDate || f.operationEndDate >= f.operationStartDate) ? f.operationEndDate : undefined,
      milestones: mergeCareerDateFieldsIntoMilestones(f.careerMilestones, {
        date: f.date,
        applicationDeadline: careerFields.application ? f.applicationDeadline : undefined,
        resultDate: careerFields.result ? f.resultDate : undefined,
        operationStartDate: careerFields.operation ? f.operationStartDate : undefined,
        operationEndDate: careerFields.operation ? f.operationEndDate : undefined,
      }),
      time: f.time || undefined,
      endTime: f.endTime || undefined,
      mode: f.scheduleMode || undefined,
      location: f.scheduleMode === 'online' ? undefined : f.location.trim() || undefined,
      address: undefined,
      url: f.url.trim() || undefined,
      note: f.note.trim() || undefined,
    })

    if (f.mode === 'add') {
      if (f.type === 'todo') props.onAddTodo(f.title, f.priority)
      else if (f.type === 'career') props.onAddCareer(buildCareerPayload())
      else props.onAddScheduled({
        title: f.title.trim(),
        date: f.date,
        time: f.time || undefined,
        endTime: f.endTime || undefined,
        mode: f.scheduleMode || undefined,
        location: f.location.trim() || undefined,
        address: f.address.trim() || undefined,
        note: f.note.trim() || undefined,
      })
    } else {
      if (f.type === 'todo') props.onUpdateTodo(f.id!, { text: f.title, priority: f.priority, done: f.done })
      else if (f.type === 'career') props.onUpdateCareer(f.id!, buildCareerPayload())
      else props.onUpdateScheduled(f.id!, {
        title: f.title,
        date: f.date,
        time: f.time || undefined,
        endTime: f.endTime || undefined,
        mode: f.scheduleMode || undefined,
        location: f.location.trim() || undefined,
        address: f.address.trim() || undefined,
        note: f.note.trim() || undefined,
        done: f.done,
      })
    }
    setForm(null)
  }

  const startAdd = () => setForm({
    mode:'add', type:'scheduled', title:'', date:dateStr, time:'',
    applicationDeadline:'', resultDate:'', operationStartDate:'', operationEndDate:'',
    endTime:'', scheduleMode:'', location:'', address:'', note:'', priority:'medium', done:false,
    organization:'', careerCategory:'briefing', careerStatus:'interested', careerMilestones:[], url:'',
  })
  const startEditTodo = (t: Todo) =>
    setForm({
      mode:'edit', type:'todo', id:t.id, title:t.text, date:t.date||dateStr,
      applicationDeadline:'', resultDate:'', operationStartDate:'', operationEndDate:'',
      time:'', endTime:'', scheduleMode:'', location:'', address:'', note:'', priority:t.priority, done:t.done,
      organization:'', careerCategory:'briefing', careerStatus:'interested', careerMilestones:[], url:'',
    })
  const startEditScheduled = (s: ScheduledTask) =>
    setForm({
      mode:'edit', type:'scheduled', id:s.id, title:s.title, date:s.date,
      applicationDeadline:'', resultDate:'', operationStartDate:'', operationEndDate:'',
      time:s.time||'', endTime:s.endTime||'', scheduleMode:s.mode||'',
      location:s.location||'', address:s.address||'', note:s.note||'',
      organization:'', careerCategory:'briefing', careerStatus:'interested', careerMilestones:[], url:'',
      priority:'medium', done:s.done,
    })
  const startEditCareer = (event: CareerEvent) =>
    setForm({
      mode:'edit', type:'career', id:event.id, title:event.title, date:event.date,
      applicationDeadline:event.applicationDeadline||'', resultDate:event.resultDate||'',
      operationStartDate:event.operationStartDate||'', operationEndDate:event.operationEndDate||'',
      time:event.time||'', endTime:event.endTime||'', scheduleMode:event.mode||'',
      location:[event.location, event.address].filter(Boolean).join(' · '), address:'', note:event.note||'',
      organization:event.organization||'', careerCategory:event.category,
      careerStatus:event.status, careerMilestones:syncCareerEventDateFields(event).milestones, url:event.url||'', priority:'medium',
      done:event.status === 'completed',
    })

  const Section = ({ title, color, children }: { title: string; color: string; children: ReactNode }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6, letterSpacing: 0 }}>{title}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>{children}</div>
    </div>
  )

  const ItemRow = ({
    text, done, tag, detail, onEdit, onToggle,
  }: {
    text: string; done?: boolean; tag?: string; detail?: string
    onEdit?: () => void; onToggle?: () => void
  }) => (
    <div style={{
      display:'flex', alignItems:'center', gap:8,
      padding:'8px 10px', borderRadius:8, background:'var(--bg3)',
      cursor: onEdit ? 'pointer' : 'default',
    }} onClick={onEdit} role={onEdit ? 'button' : undefined} tabIndex={onEdit ? 0 : undefined}
      onKeyDown={event => {
        if (onEdit && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onEdit()
        }
      }}>
      {onToggle && (
        <button
          type="button"
          aria-label={done ? `${text} 완료 취소` : `${text} 완료`}
          onClick={e => { e.stopPropagation(); onToggle() }}
          style={{ border:'none', background:'transparent', cursor:'pointer',
            fontSize:14, color: done ? 'var(--accent)' : 'var(--border)', padding:0, flexShrink:0 }}
        >
          {done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
        </button>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <span style={{
          display:'block', fontSize:13, lineHeight:1.4,
          color: done ? 'var(--muted)' : 'var(--text)',
          textDecoration: done ? 'line-through' : 'none',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }}>
          {text}
        </span>
        {detail && (
          <span style={{
            display:'block', marginTop:2, fontSize:11, lineHeight:1.35,
            color:'var(--muted)', overflow:'hidden',
            textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>
            {detail}
          </span>
        )}
      </div>
      {tag && (
        <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4,
          background:'var(--bg4)', color:'var(--muted)', flexShrink:0 }}>
          {tag}
        </span>
      )}
    </div>
  )

  const hasAnything = important.length + scheduled.length + career.length + tasks.length + normal.length + goals.length + projects.length > 0

  return (
    <Modal
      open
      onClose={onClose}
      title={dateLabel}
      description={holiday ? `공휴일 · ${holiday}` : undefined}
      size="sm"
      footer={!form ? (
        <Button icon={<Plus size={16} />} onClick={startAdd}>항목 추가</Button>
      ) : undefined}
    >
      <div className="calendar-widget-day-content">
          {!hasAnything && !form && (
            <div style={{ textAlign:'center', color:'var(--muted)', fontSize:13, padding:'20px 0' }}>
              이 날의 일정이 없어요
            </div>
          )}

          {important.length > 0 && (
            <Section title="⭐ 중요" color="var(--accent)">
              {important.map(t => (
                <ItemRow key={t.id} text={t.text} done={t.done} tag="할일"
                  onEdit={() => startEditTodo(t)}
                  onToggle={() => props.onUpdateTodo(t.id, { done: !t.done })}
                />
              ))}
            </Section>
          )}

          {scheduled.length > 0 && (
            <Section title="📌 예정 작업" color="var(--text)">
              {scheduled.map(s => (
                <ItemRow
                  key={s.id}
                  text={s.title}
                  done={s.done}
                  tag={[
                    s.time ? `${s.time}${s.endTime ? `~${s.endTime}` : ''}` : undefined,
                    s.mode === 'offline' ? '오프라인' : s.mode === 'online' ? '온라인' : s.mode === 'hybrid' ? '온·오프라인' : undefined,
                  ].filter(Boolean).join(' · ') || undefined}
                  detail={[s.location, s.address, s.note].filter(Boolean).join(' · ') || undefined}
                  onEdit={() => startEditScheduled(s)}
                  onToggle={() => props.onUpdateScheduled(s.id, { done: !s.done })}
                />
              ))}
            </Section>
          )}

          {career.length > 0 && (
            <Section title="💼 기회 일정" color="#a855f7">
              {career.map(event => (
                <ItemRow
                  key={event.id}
                  text={event.title}
                  done={event.status === 'completed' || event.status === 'cancelled'}
                  tag={[
                    ...getCareerMilestones(event, dateStr).filter(label => label !== '일정'),
                    event.time ? `${event.time}${event.endTime ? `~${event.endTime}` : ''}` : undefined,
                    event.category === 'briefing' ? '채용설명회'
                      : event.category === 'interview' ? '면접'
                      : event.category === 'camp' ? '직무캠프'
                      : event.category === 'program' ? '교육/프로그램'
                      : event.category === 'seminar' ? '행사/세미나'
                      : event.category === 'contest' ? '공모전'
                      : event.category === 'support' ? '지원사업'
                      : event.category === 'corp_support' ? '기업 지원'
                      : CAREER_CATEGORY_LABELS[event.category],
                  ].filter(Boolean).join(' · ')}
                  detail={[event.organization, event.location, event.address].filter(Boolean).join(' · ') || event.note}
                  onEdit={() => startEditCareer(event)}
                />
              ))}
            </Section>
          )}

          {tasks.length > 0 && (
            <Section title="🗒 작업 관리" color="var(--text)">
              {tasks.map(task => (
                <ItemRow
                  key={task.id}
                  text={task.name}
                  done={task.done}
                  tag={[task.priority, task.status].filter(Boolean).join(' · ') || undefined}
                  detail={task.owner || task.type}
                />
              ))}
            </Section>
          )}

          {normal.length > 0 && (
            <Section title="☑️ 할 일" color="var(--text)">
              {normal.map(t => (
                <ItemRow key={t.id} text={t.text} done={t.done}
                  onEdit={() => startEditTodo(t)}
                  onToggle={() => props.onUpdateTodo(t.id, { done: !t.done })}
                />
              ))}
            </Section>
          )}

          {goals.length > 0 && (
            <Section title="🎯 목표" color="var(--text)">
              {goals.map(g => <ItemRow key={g.id} text={g.name} tag={`${g.pct}%`} />)}
            </Section>
          )}

          {projects.length > 0 && (
            <Section title="📁 프로젝트" color="var(--text)">
              {projects.map(p => <ItemRow key={p.id} text={p.name} tag={`${p.pct}%`} />)}
            </Section>
          )}

          {/* 편집/추가 폼 */}
          {form && (
            <ItemForm
              initial={form}
              onSave={handleSave}
              onDelete={form.mode === 'edit' ? async () => {
                const label = form.type === 'todo' ? '할 일' : form.type === 'career' ? '기회 일정' : '예정 작업'
                const accepted = await confirm({
                  title: `${label} 삭제`,
                  description: `선택한 ${label}을 삭제합니다.`,
                  confirmLabel: '삭제',
                  danger: true,
                })
                if (!accepted) return
                if (form.type === 'todo') props.onDeleteTodo(form.id!)
                else if (form.type === 'career') props.onDeleteCareer(form.id!)
                else props.onDeleteScheduled(form.id!)
                setForm(null)
              } : undefined}
              onCancel={() => setForm(null)}
            />
          )}
      </div>
    </Modal>
  )
}

// ── 메인 위젯 ─────────────────────────────────────────────
export default function CalendarWidget() {
  const { ref, w, h } = useWidgetSize()
  const {
    todos, setTodos, scheduledTasks, setScheduledTasks,
    careerEvents, setCareerEvents, personalApplications, jobPostings,
    tasks, goals, projects,
  } = useApp()

  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<Date | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  // API 공휴일: 키 'MM-DD' → 이름 (없으면 하드코딩 폴백)
  const [apiHolidays, setApiHolidays] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchHolidays(year, month + 1).then(data => {
      setApiHolidays(prev => ({ ...prev, ...data }))
    })
  }, [year, month])

  const days = makeCalendarDays(year, month)
  const todayStr = toDateStr(today)
  const calendarSources = { todos, scheduledTasks, careerEvents, personalApplications, jobPostings, tasks, goals, projects }

  const compact = w < 300 || h < 330
  const HEADER_H = compact ? 38 : 44
  const LABEL_H  = compact ? 24 : 28
  const weeks  = days.length / 7
  const cellW = w > 0 ? Math.floor(w / 7) : 40
  const cellH = h > 0 ? Math.floor((h - HEADER_H - LABEL_H) / weeks) : 36

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  const getItemsForDate = (dateStr: string) =>
    getCalendarLinkedItems(calendarSources, dateStr, todayStr)

  const getImportantCount = (dateStr: string) =>
    getItemsForDate(dateStr).todos.filter(t => t.priority === 'high').length

  const getHasItems = (dateStr: string) => {
    const {
      todos: t, scheduled: s, career: c, personalApplications: personal,
      jobPostings: jobs, tasks: work, goals: g, projects: p,
    } = getItemsForDate(dateStr)
    return t.length + s.length + c.length + personal.length + jobs.length + work.length + g.length + p.length > 0
  }

  // CRUD handlers
  const handleAddTodo = (text: string, priority: Todo['priority']) => {
    const newTodo: Todo = { id: Date.now().toString(), text, done: false, priority, date: toDateStr(selected!) }
    setTodos(prev => [...prev, newTodo])
  }
  const handleAddScheduled = (task: Omit<ScheduledTask, 'id' | 'done'>) => {
    const newTask: ScheduledTask = {
      id: Date.now().toString(),
      ...task,
      done: false,
    }
    setScheduledTasks(prev => [...prev, newTask])
  }
  const handleUpdateTodo = (id: string, patch: Partial<Todo>) =>
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  const handleUpdateScheduled = (id: string, patch: Partial<ScheduledTask>) =>
    setScheduledTasks(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  const handleAddCareer = (event: Omit<CareerEvent, 'id'>) =>
    setCareerEvents(previous => [...previous, { ...event, id: `career-${Date.now()}` }])
  const handleUpdateCareer = (id: string, patch: Partial<CareerEvent>) =>
    setCareerEvents(previous => previous.map(event => event.id === id ? { ...event, ...patch } : event))
  const handleDeleteTodo = (id: string) => setTodos(prev => prev.filter(t => t.id !== id))
  const handleDeleteScheduled = (id: string) => setScheduledTasks(prev => prev.filter(s => s.id !== id))
  const handleDeleteCareer = (id: string) =>
    setCareerEvents(previous => previous.filter(event => event.id !== id))

  const selectedItems = selected ? getItemsForDate(toDateStr(selected)) : null
  const selectedHoliday = selected
    ? (() => {
        const mmdd = `${String(selected.getMonth()+1).padStart(2,'0')}-${String(selected.getDate()).padStart(2,'0')}`
        return apiHolidays[mmdd] ?? getHoliday(selected.getFullYear(), mmdd)
      })()
    : undefined

  const numSize = Math.max(
    compact ? 12 : 13,
    Math.min(compact ? 15 : 17, cellH * 0.34, cellW * 0.32),
  )
  const circleSize = Math.max(compact ? 20 : 22, numSize + 7)

  return (
    <div ref={ref} style={{ width:'100%', height:'100%', overflow:'hidden', userSelect:'none' }}>
      {w > 0 && h > 0 && (
        <>
          {/* 헤더 */}
          <div style={{
            height: HEADER_H, display:'flex', alignItems:'center',
            justifyContent:'space-between', padding: compact ? '0 4px' : '0 8px', flexShrink:0,
          }}>
            <IconButton label="이전 달" icon={<ChevronLeft size={17} />} size="sm" onClick={prevMonth} />

            <div style={{ display:'flex', alignItems:'center', gap: compact ? 3 : 8 }}>
              <button type="button"
                onClick={() => setShowPicker(true)}
                style={{
                  border:'none', background:'transparent', cursor:'pointer',
                  fontSize: compact ? 14 : 17, fontWeight:700, color:'var(--text)',
                  padding: compact ? '3px 4px' : '4px 8px', borderRadius:6,
                }}
              >
                {year}년 {month + 1}월
              </button>
              {(year !== today.getFullYear() || month !== today.getMonth()) && (
                <button type="button" onClick={goToday} style={{
                  border:'1px solid var(--border)', background:'transparent', cursor:'pointer',
                  fontSize:11, color:'var(--muted)', borderRadius:5, padding:'2px 8px',
                }}>
                  오늘
                </button>
              )}
            </div>

            <IconButton label="다음 달" icon={<ChevronRight size={17} />} size="sm" onClick={nextMonth} />
          </div>

          {/* 요일 */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(7, minmax(0, 1fr))',
            height:LABEL_H,
          }}>
            {DAY_LABELS.map((d, i) => (
              <div key={d} style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: compact ? 12 : 15, fontWeight:600,
                color: i === 0 ? '#e05252' : i === 6 ? 'var(--accent)' : 'var(--muted)',
              }}>{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(7, minmax(0, 1fr))',
            width:'100%',
          }}>
            {days.map((day, idx) => {
              const dateStr    = toDateStr(day)
              const mmdd       = `${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`
              const isToday    = dateStr === todayStr
              const isCurMonth = day.getMonth() === month
              const isSun      = idx % 7 === 0
              const isSat      = idx % 7 === 6
              const holiday    = isCurMonth ? (apiHolidays[mmdd] ?? getHoliday(day.getFullYear(), mmdd)) : undefined
              const isHoliday  = !!holiday

              const textColor = isToday ? '#fff'
                : !isCurMonth ? 'var(--bg4)'
                : isHoliday || isSun ? '#e05252'
                : isSat ? 'var(--accent)'
                : 'var(--text)'

              // 이벤트 블록 (할일: 노란색, 예정작업: 파란색)
              const dayItems = isCurMonth ? getItemsForDate(dateStr) : null
              const dayTodos = dayItems?.todos ?? []
              const dayScheduled = dayItems?.scheduled ?? []
              const dayCareer = dayItems?.career ?? []
              const dayTasks = dayItems?.tasks ?? []
              const dayGoals = dayItems?.goals ?? []
              const dayProjects = dayItems?.projects ?? []

              const allEvents = [
                ...dayScheduled.map(s => ({
                  key: s.id,
                  label: s.time ? `${s.time}${s.endTime ? `~${s.endTime}` : ''} ${s.title}` : s.title,
                  color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', done: s.done,
                })),
                ...dayCareer.map(event => ({
                  key: event.id,
                  label: `${getCareerMilestones(event, dateStr).filter(label => label !== '일정').join(' · ')}${getCareerMilestones(event, dateStr).some(label => label !== '일정') ? ' ' : ''}${event.time && event.date === dateStr ? `${event.time} ` : ''}${event.title}`,
                  color: '#a855f7', bg: 'rgba(168,85,247,0.14)',
                  done: event.status === 'completed' || event.status === 'cancelled',
                })),
                ...dayTasks.map(task => ({
                  key: task.id,
                  label: `작업 ${task.name}`,
                  color: '#64748b', bg: 'rgba(100,116,139,0.14)', done: task.done,
                })),
                ...dayGoals.map(goal => ({
                  key: goal.id,
                  label: `목표 ${goal.name}`,
                  color: '#10b981', bg: 'rgba(16,185,129,0.14)', done: goal.pct >= 100,
                })),
                ...dayProjects.map(project => ({
                  key: project.id,
                  label: `프로젝트 ${project.name}`,
                  color: '#0ea5e9', bg: 'rgba(14,165,233,0.14)', done: project.pct >= 100,
                })),
                ...dayTodos.map(t => ({ key: t.id, label: t.text, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', done: t.done })),
              ]
              const eventRowH = compact ? 15 : 19
              const MAX_VISIBLE = Math.max(1, Math.floor((cellH - circleSize - 8) / eventRowH))
              const visibleEvents = allEvents.slice(0, MAX_VISIBLE)
              const overflowCnt  = allEvents.length - visibleEvents.length

              return (
                <div
                  key={idx}
                  onClick={() => isCurMonth && setSelected(day)}
                  style={{
                    height:cellH, position:'relative',
                    minWidth:0, overflow:'hidden',
                    display:'flex', flexDirection:'column',
                    alignItems:'flex-start', justifyContent:'flex-start',
                    padding: compact ? '2px 2px 1px 2px' : '4px 3px 2px 4px',
                    cursor: isCurMonth ? 'pointer' : 'default',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  {/* 날짜 숫자 */}
                  <div style={{
                    width:circleSize, height:circleSize,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    borderRadius:'50%',
                    background: isToday ? 'var(--accent)' : 'transparent',
                    fontSize:numSize, fontWeight: isToday ? 700 : 400,
                    color: textColor, flexShrink: 0,
                  }}>
                    {day.getDate()}
                  </div>

                  {/* 공휴일 */}
                  {holiday && isCurMonth && (
                    <div style={{
                      fontSize: compact ? 9 : 10, color: '#e05252', lineHeight: 1.1, marginTop: 1,
                      width: '100%', minWidth:0, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {holiday}
                    </div>
                  )}

                  {/* 이벤트 블록 */}
                  {visibleEvents.map(ev => (
                    <div key={ev.key} style={{
                      width: '100%', minWidth:0, maxWidth:'100%', marginTop: 2,
                      padding: compact ? '0 2px' : '1px 4px', borderRadius: 3,
                      background: ev.bg,
                      borderLeft: `2px solid ${ev.color}`,
                      fontSize: compact ? 9 : 11, lineHeight: compact ? '13px' : '15px',
                      color: ev.done ? 'var(--muted)' : 'var(--text)',
                      textDecoration: ev.done ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      boxSizing: 'border-box',
                    }}>
                      {ev.label}
                    </div>
                  ))}

                  {/* 오버플로우 */}
                  {overflowCnt > 0 && (
                    <div style={{ fontSize: compact ? 9 : 10, color: 'var(--muted)', marginTop: 2, lineHeight: 1 }}>
                      +{overflowCnt}개 더
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 연/월 피커 */}
          {showPicker && (
            <YearMonthPicker
              year={year} month={month}
              onSelect={(y, m) => { setYear(y); setMonth(m) }}
              onClose={() => setShowPicker(false)}
            />
          )}

          {/* 날짜 모달 */}
          {selected && selectedItems && (
            <DayModal
              date={selected}
              holiday={selectedHoliday}
              todos={selectedItems.todos}
              scheduled={selectedItems.scheduled}
              career={selectedItems.career}
              tasks={selectedItems.tasks}
              goals={selectedItems.goals}
              projects={selectedItems.projects}
              onClose={() => setSelected(null)}
              onAddTodo={handleAddTodo}
              onAddScheduled={handleAddScheduled}
              onAddCareer={handleAddCareer}
              onUpdateTodo={handleUpdateTodo}
              onUpdateScheduled={handleUpdateScheduled}
              onUpdateCareer={handleUpdateCareer}
              onDeleteTodo={handleDeleteTodo}
              onDeleteScheduled={handleDeleteScheduled}
              onDeleteCareer={handleDeleteCareer}
            />
          )}
        </>
      )}
    </div>
  )
}
