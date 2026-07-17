import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../store/AuthContext'
import { useApp } from '../store/AppContext'
import { useRouter } from '../store/RouterContext'
import type { CareerEvent, Goal, JobPosting, PersonalApplication, Project, ScheduledTask, Task, Todo, TopGoal } from '../types'
import { toLocalDateKey } from '../utils/date'
import { getCareerMilestones, getCareerNextMilestone } from '../utils/careerEvents'
import { getViewportKind, resolveDisplayScale, type DensityMode } from '../utils/responsiveUi'
import { APP_RELEASE_DATE, APP_RELEASE_NAME, APP_RELEASE_NOTES, APP_VERSION } from '../version'

export default function ProfilePage() {
  const { user } = useAuth()
  const { setPage } = useRouter()
  const {
    nickname, setNickname,
    uiScale, setUiScale,
    displayPreferences, setDisplayPreferences,
    notificationPreferences, setNotificationPreferences,
    todos, habits, goals, projects, notes, journal,
    scheduledTasks, careerEvents, personalApplications, jobPostings,
    tasks, topGoals,
    dashboardActive, dashboardLayout,
    openOnboardingGuide,
    saveImmediately,
    saveWithOverrides,
    saveNow,
  } = useApp()

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1200 : window.innerWidth,
  )
  const [densitySaving, setDensitySaving] = useState(false)
  const [densitySaveError, setDensitySaveError] = useState('')

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth)
    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth)
    return () => window.removeEventListener('resize', updateViewportWidth)
  }, [])

  const viewportKind = getViewportKind(viewportWidth)
  const viewportLabel = {
    phone: '휴대폰',
    tablet: '태블릿',
    desktop: '웹',
  }[viewportKind]
  const appliedScale = resolveDisplayScale({
    viewportWidth,
    densityMode: displayPreferences.densityMode,
    manualScale: uiScale,
  })
  const manualScaleEnabled = viewportKind === 'desktop'
    && displayPreferences.densityMode === 'manual'

  const changeDensityMode = async (nextMode: DensityMode) => {
    if (densitySaving || nextMode === displayPreferences.densityMode) return
    const nextDisplayPreferences = {
      densityMode: nextMode,
      updatedAt: new Date().toISOString(),
    }
    setDensitySaving(true)
    setDensitySaveError('')
    try {
      await saveImmediately({ displayPreferences: nextDisplayPreferences })
    } catch (error) {
      const detail = error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.'
      setDensitySaveError(`화면 밀도 모드를 저장하지 못했습니다. ${detail}`)
    } finally {
      setDensitySaving(false)
    }
  }

  const changeManualScale = (nextScale: number) => {
    const value = Math.min(110, Math.max(80, Math.round(nextScale / 5) * 5))
    const nextDisplayPreferences = {
      densityMode: 'manual' as const,
      updatedAt: new Date().toISOString(),
    }
    setUiScale(value)
    setDisplayPreferences(nextDisplayPreferences)
    void saveWithOverrides({
      uiScale: value,
      displayPreferences: nextDisplayPreferences,
    })
  }

  const displayName = nickname.trim() || user?.displayName || '플래너 사용자'
  const updateNotificationPreferences = (patch: Partial<typeof notificationPreferences>) => {
    setNotificationPreferences(previous => ({
      ...previous,
      ...patch,
      dailyBriefingScope: 'ownAccount',
    }))
  }
  const storageItems = [
    { label: 'Todo', value: todos.length },
    { label: '루틴', value: habits.length },
    { label: '작업', value: tasks.length },
    { label: '목표', value: goals.length },
    { label: '프로젝트', value: projects.length },
    { label: '노트', value: notes.length },
    { label: '저널', value: journal.length },
    { label: '예정', value: scheduledTasks.length },
    { label: '기회', value: careerEvents.length },
    { label: '내 신청', value: personalApplications.length },
    { label: '공고', value: jobPostings.length },
  ]
  const inbox = useMemo(() => buildUnifiedInbox({
    todos,
    tasks,
    goals,
    projects,
    topGoals,
    scheduledTasks,
    careerEvents,
    personalApplications,
    jobPostings,
  }), [todos, tasks, goals, projects, topGoals, scheduledTasks, careerEvents, personalApplications, jobPostings])

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-avatar">
          {user?.photoURL ? <img src={user.photoURL} alt="프로필" /> : <span>{displayName[0]?.toUpperCase() ?? '?'}</span>}
        </div>
        <div>
          <h2>{displayName}</h2>
          <p>{user?.email ?? '로그인 계정 정보 없음'}</p>
        </div>
      </header>

      <section className="profile-grid">
        <article className="profile-panel">
          <h3>기본 정보</h3>
          <label>
            <span>표시 이름</span>
            <input value={nickname} onChange={event => setNickname(event.target.value)} placeholder={user?.displayName ?? '닉네임'} />
          </label>
          <div className="density-settings" aria-busy={densitySaving}>
            <span className="density-label">화면 밀도</span>
            <div className="density-mode-options" role="group" aria-label="화면 밀도 모드">
              <button
                type="button"
                className={displayPreferences.densityMode === 'auto' ? 'selected' : ''}
                aria-pressed={displayPreferences.densityMode === 'auto'}
                disabled={densitySaving}
                onClick={() => void changeDensityMode('auto')}
              >
                <strong>자동(권장)</strong>
                <small>화면 폭에 맞춰 적용</small>
              </button>
              <button
                type="button"
                className={displayPreferences.densityMode === 'manual' ? 'selected' : ''}
                aria-pressed={displayPreferences.densityMode === 'manual'}
                disabled={densitySaving}
                onClick={() => void changeDensityMode('manual')}
              >
                <strong>직접 설정</strong>
                <small>웹에서 저장 배율 사용</small>
              </button>
            </div>
            <p className="density-current" role="status">
              현재: <strong>{viewportLabel} · {appliedScale}%</strong>
              {densitySaving && <span> · 모드 저장 중</span>}
            </p>
            <label>
              <span>웹 직접 설정 값</span>
              <div className="scale-row">
                <input
                  type="range"
                  min={80}
                  max={110}
                  step={5}
                  value={uiScale}
                  disabled={!manualScaleEnabled || densitySaving}
                  onChange={event => changeManualScale(Number(event.target.value))}
                />
                <b>{uiScale}%</b>
              </div>
            </label>
            {viewportKind !== 'desktop' ? (
              <p className="density-help">
                저장된 웹 직접 설정 값은 {uiScale}%입니다. 터치와 글자 가독성을 위해 100%가 적용됩니다.
              </p>
            ) : displayPreferences.densityMode === 'auto' ? (
              <p className="density-help">
                웹에서는 자동으로 90%가 적용됩니다. 직접 설정을 선택하면 저장된 {uiScale}% 값을 사용합니다.
              </p>
            ) : (
              <p className="density-help">웹 직접 설정은 80~110% 범위에서 5% 단위로 적용됩니다.</p>
            )}
            {densitySaveError && <p className="density-error" role="alert">{densitySaveError}</p>}
          </div>
          <button type="button" className="primary-button" onClick={() => void saveNow()}>
            지금 저장
          </button>
        </article>

        <article className="profile-panel">
          <h3>대시보드</h3>
          <div className="profile-stats">
            <Stat label="활성 위젯" value={dashboardActive.length} />
            <Stat label="레이아웃 항목" value={dashboardLayout.length} />
            <Stat label="테마" value={document.documentElement.getAttribute('data-theme') || 'light'} />
          </div>
          <p className="profile-note">테마는 현재 브라우저에 저장되고, 화면 밀도와 플래너 데이터는 Firestore 저장 흐름을 사용합니다.</p>
          <button type="button" className="primary-button" onClick={openOnboardingGuide}>
            사용 가이드 다시 보기
          </button>
          <p className="profile-note">
            가이드를 다시 보아도 기존 데이터와 홈 구성은 바뀌지 않습니다.
          </p>
        </article>

        <article className="profile-panel">
          <div className="panel-heading">
            <h3>내 계정 브리핑 알림</h3>
            <span>내 계정만</span>
          </div>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={notificationPreferences.dailyBriefingEnabled}
              onChange={event => updateNotificationPreferences({ dailyBriefingEnabled: event.target.checked })}
            />
            <span>매일 브리핑 받기</span>
          </label>
          <label>
            <span>시간</span>
            <input
              type="time"
              value={notificationPreferences.dailyBriefingTime}
              onChange={event => updateNotificationPreferences({ dailyBriefingTime: event.target.value || '10:00' })}
            />
          </label>
          <label>
            <span>채널</span>
            <select
              value={notificationPreferences.dailyBriefingChannel}
              onChange={event => updateNotificationPreferences({
                dailyBriefingChannel: event.target.value as typeof notificationPreferences.dailyBriefingChannel,
              })}
            >
              <option value="codex">Codex</option>
              <option value="gmail">Gmail</option>
              <option value="slack">Slack</option>
              <option value="discord">Discord</option>
            </select>
          </label>
          <div className="account-scope">
            <span>범위</span>
            <b>{user?.email ?? '현재 로그인 계정'}</b>
          </div>
        </article>
      </section>

      <section className="profile-panel inbox-panel">
        <div className="panel-heading">
          <div>
            <h3>통합 인박스</h3>
            <p className="profile-note">Todo, 작업, 목표, 프로젝트, 일정, 신청, 공고를 한 번에 모아 지금 처리할 흐름으로 묶었습니다.</p>
          </div>
          <span>{inbox.totalCount}개 열림</span>
        </div>
        <div className="profile-stats inbox-stats">
          <Stat label="지금 처리" value={`${inbox.nowCount}개`} />
          <Stat label="7일 이내" value={`${inbox.upcomingCount}개`} />
          <Stat label="다음 행동" value={`${inbox.nextActionCount}개`} />
        </div>
        <div className="inbox-grid">
          <InboxColumn
            title="지금 처리"
            subtitle="오늘 기준 바로 움직일 항목"
            items={inbox.nowItems}
            emptyText="오늘 바로 처리할 항목이 없습니다."
            onOpen={setPage}
          />
          <InboxColumn
            title="곧 마감"
            subtitle="7일 안에 챙겨야 할 일정과 마감"
            items={inbox.upcomingItems}
            emptyText="가까운 마감 항목이 없습니다."
            onOpen={setPage}
          />
          <InboxColumn
            title="다음 행동"
            subtitle="다음 액션이 적힌 항목과 오늘 방향"
            items={inbox.nextActionItems}
            emptyText="기록된 다음 행동이 없습니다."
            onOpen={setPage}
          />
        </div>
      </section>

      <section className="profile-panel">
        <div className="panel-heading">
          <h3>데이터 현황</h3>
          <span>Firestore 사용자 데이터</span>
        </div>
        <div className="storage-grid">
          {storageItems.map(item => <Stat key={item.label} label={item.label} value={item.value} />)}
        </div>
      </section>

      <section className="profile-panel release-panel">
        <div className="panel-heading">
          <div>
            <h3>플래너 버전</h3>
            <p className="profile-note">현재 앱 기준과 이번 릴리즈에 포함된 핵심 업그레이드입니다.</p>
          </div>
          <span className="version-badge">v{APP_VERSION}</span>
        </div>
        <div className="release-summary">
          <Stat label="릴리즈" value={APP_RELEASE_NAME} />
          <Stat label="배포 기준일" value={APP_RELEASE_DATE} />
        </div>
        <ul className="release-list">
          {APP_RELEASE_NOTES.map(note => <li key={note}>{note}</li>)}
        </ul>
      </section>

      <style>{`
        .profile-page { max-width: 960px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 16px; }
        .profile-header { display: flex; align-items: center; gap: 14px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 18px; }
        .profile-avatar { width: 58px; height: 58px; border-radius: 18px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; overflow: hidden; flex-shrink: 0; font-size: 24px; font-weight: 900; }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-header h2 { margin: 0 0 5px; font-size: 24px; letter-spacing: 0; }
        .profile-header p { margin: 0; color: var(--muted); font-size: 13px; }
        .profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .profile-grid .profile-panel:first-child { grid-row: span 2; }
        .profile-panel { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 13px; }
        .profile-panel h3 { margin: 0; font-size: 15px; }
        .profile-panel label { display: flex; flex-direction: column; gap: 6px; }
        .profile-panel label span, .panel-heading span, .profile-note { color: var(--muted); font-size: 12px; line-height: 1.5; }
        .profile-panel input[type="text"], .profile-panel input[type="time"], .profile-panel input:not([type]), .profile-panel select { height: 36px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 10px; font-size: 13px; outline: none; }
        .inline-check { flex-direction: row !important; align-items: center; gap: 8px !important; color: var(--text); font-size: 13px; font-weight: 700; }
        .inline-check input { width: 16px; height: 16px; accent-color: var(--accent); }
        .account-scope { display: flex; justify-content: space-between; gap: 10px; align-items: center; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); padding: 10px 11px; }
        .account-scope span { color: var(--muted); font-size: 11px; font-weight: 800; }
        .account-scope b { min-width: 0; color: var(--text); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .density-settings { display: flex; flex-direction: column; gap: 9px; }
        .density-label { color: var(--muted); font-size: 12px; line-height: 1.5; }
        .density-mode-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .density-mode-options button { min-width: 0; min-height: 52px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); color: var(--text); padding: 8px 10px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 2px; font: inherit; text-align: left; cursor: pointer; }
        .density-mode-options button.selected { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
        .density-mode-options button:disabled { cursor: default; opacity: 0.65; }
        .density-mode-options button:focus-visible { outline: 3px solid color-mix(in srgb, var(--accent) 32%, transparent); outline-offset: 2px; }
        .density-mode-options strong { font-size: 12px; }
        .density-mode-options small { color: var(--muted); font-size: 10px; line-height: 1.4; }
        .density-current { margin: 0; color: var(--muted); font-size: 12px; }
        .density-current strong { color: var(--text); }
        .density-help { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
        .density-error { margin: 0; border: 1px solid color-mix(in srgb, var(--red) 35%, var(--border)); border-radius: 8px; background: color-mix(in srgb, var(--red) 7%, var(--bg2)); color: var(--red); padding: 9px 10px; font-size: 11px; font-weight: 800; line-height: 1.45; }
        .scale-row { display: grid; grid-template-columns: minmax(0, 1fr) 52px; gap: 10px; align-items: center; }
        .scale-row input:disabled { cursor: not-allowed; opacity: 0.48; }
        .scale-row b { color: var(--accent); font-size: 13px; text-align: right; }
        .primary-button { height: 36px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 13px; font-size: 12px; font-weight: 800; cursor: pointer; align-self: flex-start; }
        .profile-stats, .storage-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
        .storage-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .inbox-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .stat-card { border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); padding: 12px; min-width: 0; }
        .stat-card span { display: block; color: var(--muted); font-size: 11px; font-weight: 700; }
        .stat-card b { display: block; margin-top: 6px; color: var(--text); font-size: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .panel-heading { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
        .panel-heading > div { min-width: 0; }
        .inbox-panel { gap: 14px; }
        .inbox-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .inbox-column { border: 1px solid var(--border); border-radius: 10px; background: var(--bg3); padding: 12px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .inbox-column h4 { margin: 0; font-size: 14px; }
        .inbox-column-header { display: flex; flex-direction: column; gap: 4px; }
        .inbox-column-header span { color: var(--muted); font-size: 11px; line-height: 1.4; }
        .inbox-list { display: flex; flex-direction: column; gap: 8px; }
        .inbox-item { width: 100%; border: 1px solid var(--border); border-radius: 9px; background: var(--bg2); padding: 10px; text-align: left; display: flex; flex-direction: column; gap: 4px; cursor: pointer; }
        .inbox-item strong { color: var(--text); font-size: 13px; line-height: 1.4; }
        .inbox-item small { color: var(--muted); font-size: 11px; line-height: 1.45; }
        .inbox-item:hover { border-color: var(--accent); transform: translateY(-1px); transition: border-color 0.2s ease, transform 0.2s ease; }
        .inbox-item.urgent { background: color-mix(in srgb, var(--bg2) 84%, #ef4444 16%); }
        .inbox-item.upcoming { background: color-mix(in srgb, var(--bg2) 86%, #f59e0b 14%); }
        .inbox-item.next { background: color-mix(in srgb, var(--bg2) 86%, var(--accent) 14%); }
        .inbox-empty { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
        .version-badge { flex-shrink: 0; border: 1px solid var(--accent); border-radius: 999px; background: var(--accent-soft); color: var(--accent); padding: 5px 10px; font-size: 12px; font-weight: 900; }
        .release-panel .panel-heading { align-items: flex-start; }
        .release-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
        .release-summary .stat-card b { font-size: 16px; }
        .release-list { margin: 0; padding-left: 18px; color: var(--text); font-size: 13px; line-height: 1.7; }
        .release-list li::marker { color: var(--accent); }
        @media (max-width: 760px) {
          .profile-grid, .profile-stats, .storage-grid, .release-summary, .inbox-grid, .inbox-stats { grid-template-columns: 1fr; }
          .profile-grid .profile-panel:first-child { grid-row: auto; }
          .profile-header { align-items: flex-start; }
          .release-panel .panel-heading { flex-direction: column; }
        }
      `}</style>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <b>{value}</b>
    </article>
  )
}

type InboxPage =
  | 'calendar'
  | 'todos'
  | 'tasks'
  | 'goals'
  | 'projects'
  | 'career'
  | 'personalApplications'
  | 'jobPostings'

interface InboxItemData {
  id: string
  title: string
  meta: string
  page: InboxPage
  tone: 'urgent' | 'upcoming' | 'next'
}

function InboxColumn({
  title,
  subtitle,
  items,
  emptyText,
  onOpen,
}: {
  title: string
  subtitle: string
  items: InboxItemData[]
  emptyText: string
  onOpen: (page: InboxPage) => void
}) {
  return (
    <article className="inbox-column">
      <div className="inbox-column-header">
        <h4>{title}</h4>
        <span>{subtitle}</span>
      </div>
      <div className="inbox-list">
        {items.length === 0 ? (
          <p className="inbox-empty">{emptyText}</p>
        ) : items.map(item => (
          <button key={item.id} type="button" className={`inbox-item ${item.tone}`} onClick={() => onOpen(item.page)}>
            <strong>{item.title}</strong>
            <small>{item.meta}</small>
          </button>
        ))}
      </div>
    </article>
  )
}

const TODO_PRIORITY_WEIGHT: Record<Todo['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

const TASK_PRIORITY_WEIGHT: Record<string, number> = {
  높음: 0,
  보통: 1,
  낮음: 2,
}

const openCareerEvent = (item: CareerEvent) =>
  !['completed', 'rejected', 'cancelled'].includes(item.status)

const openPersonalApplication = (item: PersonalApplication) =>
  !['rejected', 'finished', 'cancelled'].includes(item.status)

const openJobPosting = (item: JobPosting) =>
  !['rejected', 'closed'].includes(item.status)

const openGoalLike = (status?: string, pct?: number) =>
  status !== '완료' && (pct ?? 0) < 100

const dateDiff = (date?: string, today = toLocalDateKey()) => {
  if (!date) return Number.POSITIVE_INFINITY
  const start = new Date(`${today}T12:00:00`).getTime()
  const target = new Date(`${date}T12:00:00`).getTime()
  return Math.ceil((target - start) / 86400000)
}

const isTodayTodo = (todo: Todo, today: string) =>
  (todo.date ?? today) === today

const formatRelativeDate = (date?: string, today = toLocalDateKey()) => {
  if (!date) return '날짜 없음'
  const diff = dateDiff(date, today)
  if (!Number.isFinite(diff)) return '날짜 없음'
  if (diff < 0) return `${Math.abs(diff)}일 지남`
  if (diff === 0) return '오늘'
  if (diff === 1) return '내일'
  return `${diff}일 남음`
}

const firstDefined = (...values: Array<string | undefined>) =>
  values.find(value => Boolean(value))

const sliceInbox = (items: InboxItemData[], max = 4) => items.slice(0, max)

function buildUnifiedInbox({
  todos,
  tasks,
  goals,
  projects,
  topGoals,
  scheduledTasks,
  careerEvents,
  personalApplications,
  jobPostings,
}: {
  todos: Todo[]
  tasks: Task[]
  goals: Goal[]
  projects: Project[]
  topGoals: TopGoal[]
  scheduledTasks: ScheduledTask[]
  careerEvents: CareerEvent[]
  personalApplications: PersonalApplication[]
  jobPostings: JobPosting[]
}) {
  const today = toLocalDateKey()

  const nowTodos = todos
    .filter(todo => !todo.done && isTodayTodo(todo, today))
    .sort((a, b) => (TODO_PRIORITY_WEIGHT[a.priority] ?? 1) - (TODO_PRIORITY_WEIGHT[b.priority] ?? 1))
    .map(todo => ({
      id: `todo-${todo.id}`,
      title: todo.text,
      meta: `Todo · ${todo.category ?? 'work'} · ${todo.priority === 'high' ? '높은 우선순위' : '오늘 할 일'}`,
      page: 'todos' as const,
      tone: 'urgent' as const,
    }))

  const nowTasks = tasks
    .filter(task => !task.done && task.status !== '완료' && (!task.due || task.due <= today))
    .sort((a, b) => {
      const dueCompare = dateDiff(a.due, today) - dateDiff(b.due, today)
      if (dueCompare !== 0) return dueCompare
      return (TASK_PRIORITY_WEIGHT[a.priority ?? '보통'] ?? 1) - (TASK_PRIORITY_WEIGHT[b.priority ?? '보통'] ?? 1)
    })
    .map(task => ({
      id: `task-${task.id}`,
      title: task.name,
      meta: `작업 관리 · ${task.priority ?? '보통'} · ${formatRelativeDate(task.due, today)}`,
      page: 'tasks' as const,
      tone: 'urgent' as const,
    }))

  const nowSchedules = scheduledTasks
    .filter(task => !task.done && task.date === today)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
    .map(task => ({
      id: `scheduled-${task.id}`,
      title: task.title,
      meta: `예정 작업 · ${task.time ?? '시간 미정'} · ${task.mode ?? '일정'}`,
      page: 'calendar' as const,
      tone: 'urgent' as const,
    }))

  const nowCareer = careerEvents
    .filter(event =>
      openCareerEvent(event)
      && getCareerMilestones(event, today).length > 0,
    )
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
    .map(event => {
      const labels = getCareerMilestones(event, today)
      return {
        id: `career-now-${event.id}`,
        title: event.title,
        meta: `기회 일정 · ${labels.join(' · ')} · ${event.organization ?? '기관 미정'}`,
        page: 'career' as const,
        tone: 'urgent' as const,
      }
    })

  const upcomingTasks = tasks
    .filter(task => !task.done && task.status !== '완료')
    .filter(task => {
      const diff = dateDiff(task.due, today)
      return Number.isFinite(diff) && diff >= 0 && diff <= 7
    })
    .sort((a, b) => dateDiff(a.due, today) - dateDiff(b.due, today))
    .map(task => ({
      id: `task-upcoming-${task.id}`,
      title: task.name,
      meta: `작업 마감 · ${formatRelativeDate(task.due, today)} · ${task.priority ?? '보통'}`,
      page: 'tasks' as const,
      tone: 'upcoming' as const,
    }))

  const upcomingGoals = goals
    .filter(goal => openGoalLike(goal.status, goal.pct))
    .filter(goal => {
      const diff = dateDiff(goal.due, today)
      return Number.isFinite(diff) && diff >= 0 && diff <= 7
    })
    .sort((a, b) => dateDiff(a.due, today) - dateDiff(b.due, today))
    .map(goal => ({
      id: `goal-${goal.id}`,
      title: goal.name,
      meta: `목표 마감 · ${formatRelativeDate(goal.due, today)} · ${goal.pct}%`,
      page: 'goals' as const,
      tone: 'upcoming' as const,
    }))

  const upcomingProjects = projects
    .filter(project => openGoalLike(project.status, project.pct))
    .filter(project => {
      const diff = dateDiff(project.due, today)
      return Number.isFinite(diff) && diff >= 0 && diff <= 7
    })
    .sort((a, b) => dateDiff(a.due, today) - dateDiff(b.due, today))
    .map(project => ({
      id: `project-${project.id}`,
      title: project.name,
      meta: `프로젝트 마감 · ${formatRelativeDate(project.due, today)} · ${project.pct}%`,
      page: 'projects' as const,
      tone: 'upcoming' as const,
    }))

  const upcomingCareer = careerEvents
    .filter(openCareerEvent)
    .map(event => ({
      item: event,
      next: getCareerNextMilestone(event, today),
    }))
    .filter(({ next }) => {
      const diff = dateDiff(next?.date, today)
      return Number.isFinite(diff) && diff >= 0 && diff <= 7
    })
    .sort((a, b) => dateDiff(a.next?.date, today) - dateDiff(b.next?.date, today))
    .map(({ item, next }) => ({
      id: `career-${item.id}`,
      title: item.title,
      meta: `기회 일정 · ${formatRelativeDate(next?.date, today)} · ${next?.label ?? '다음 일정'} · ${item.organization ?? '기관 미정'}`,
      page: 'career' as const,
      tone: 'upcoming' as const,
    }))

  const upcomingApplications = personalApplications
    .filter(openPersonalApplication)
    .map(item => ({
      item,
      nextDate: firstDefined(item.deadline, item.resultDate, item.startDate),
    }))
    .filter(({ nextDate }) => {
      const diff = dateDiff(nextDate, today)
      return Number.isFinite(diff) && diff >= 0 && diff <= 7
    })
    .sort((a, b) => dateDiff(a.nextDate, today) - dateDiff(b.nextDate, today))
    .map(({ item, nextDate }) => ({
      id: `personal-${item.id}`,
      title: item.title,
      meta: `내 신청 · ${formatRelativeDate(nextDate, today)} · ${item.status}`,
      page: 'personalApplications' as const,
      tone: 'upcoming' as const,
    }))

  const upcomingJobs = jobPostings
    .filter(openJobPosting)
    .map(item => ({
      item,
      nextDate: firstDefined(item.deadline, item.resultDate),
    }))
    .filter(({ nextDate }) => {
      const diff = dateDiff(nextDate, today)
      return Number.isFinite(diff) && diff >= 0 && diff <= 7
    })
    .sort((a, b) => dateDiff(a.nextDate, today) - dateDiff(b.nextDate, today))
    .map(({ item, nextDate }) => ({
      id: `job-${item.id}`,
      title: `${item.company} · ${item.position}`,
      meta: `지원 공고 · ${formatRelativeDate(nextDate, today)} · ${item.status}`,
      page: 'jobPostings' as const,
      tone: 'upcoming' as const,
    }))

  const nextDirections = topGoals
    .filter(goal => !goal.done && (goal.date ?? today) === today)
    .map(goal => ({
      id: `top-goal-${goal.id}`,
      title: goal.text,
      meta: '오늘 방향 · 목표 페이지에서 관리',
      page: 'goals' as const,
      tone: 'next' as const,
    }))

  const nextApplicationActions = personalApplications
    .filter(item => openPersonalApplication(item) && item.nextAction?.trim())
    .map(item => ({
      id: `personal-action-${item.id}`,
      title: item.title,
      meta: `내 신청 · 다음 행동: ${item.nextAction?.trim()}`,
      page: 'personalApplications' as const,
      tone: 'next' as const,
    }))

  const nextJobActions = jobPostings
    .filter(item => openJobPosting(item) && item.nextAction?.trim())
    .map(item => ({
      id: `job-action-${item.id}`,
      title: `${item.company} · ${item.position}`,
      meta: `지원 공고 · 다음 행동: ${item.nextAction?.trim()}`,
      page: 'jobPostings' as const,
      tone: 'next' as const,
    }))

  const nextProjectSteps = projects
    .filter(project => openGoalLike(project.status, project.pct))
    .map(project => ({
      project,
      nextStep: project.steps?.find(step => !step.done)?.text,
    }))
    .filter(item => Boolean(item.nextStep))
    .map(({ project, nextStep }) => ({
      id: `project-step-${project.id}`,
      title: project.name,
      meta: `프로젝트 · 다음 작업: ${nextStep}`,
      page: 'projects' as const,
      tone: 'next' as const,
    }))

  const nowItems = sliceInbox([...nowTodos, ...nowTasks, ...nowSchedules, ...nowCareer])
  const upcomingItems = sliceInbox([
    ...upcomingTasks,
    ...upcomingGoals,
    ...upcomingProjects,
    ...upcomingCareer,
    ...upcomingApplications,
    ...upcomingJobs,
  ])
  const nextActionItems = sliceInbox([
    ...nextDirections,
    ...nextApplicationActions,
    ...nextJobActions,
    ...nextProjectSteps,
  ])

  const totalCount = new Set([
    ...nowItems.map(item => item.id),
    ...upcomingItems.map(item => item.id),
    ...nextActionItems.map(item => item.id),
  ]).size

  return {
    nowItems,
    upcomingItems,
    nextActionItems,
    nowCount: nowTodos.length + nowTasks.length + nowSchedules.length + nowCareer.length,
    upcomingCount:
      upcomingTasks.length
      + upcomingGoals.length
      + upcomingProjects.length
      + upcomingCareer.length
      + upcomingApplications.length
      + upcomingJobs.length,
    nextActionCount:
      nextDirections.length
      + nextApplicationActions.length
      + nextJobActions.length
      + nextProjectSteps.length,
    totalCount,
  }
}
