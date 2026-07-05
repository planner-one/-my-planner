import type {
  CareerEvent,
  JobPosting,
  PersonalApplication,
  TopGoal,
  UserData,
} from '../types'

export type PlannerBriefingSectionId =
  | 'todos'
  | 'directions'
  | 'scheduled'
  | 'career'
  | 'personalApplications'
  | 'jobPostings'
  | 'tasks'
  | 'goals'
  | 'projects'

export interface PlannerBriefingItem {
  id: string
  title: string
  meta?: string
  detail?: string
}

export interface PlannerBriefingSection {
  id: PlannerBriefingSectionId
  label: string
  items: PlannerBriefingItem[]
}

export interface PlannerDayBriefing {
  date: string
  total: number
  sections: PlannerBriefingSection[]
  summary: {
    todos: number
    focus: number
    schedules: number
    deadlines: number
    applications: number
  }
}

type PlannerBriefingSources = Pick<
  UserData,
  | 'todos'
  | 'topGoals'
  | 'scheduledTasks'
  | 'careerEvents'
  | 'personalApplications'
  | 'jobPostings'
  | 'tasks'
  | 'goals'
  | 'projects'
>

const CAREER_CATEGORY_LABELS: Record<CareerEvent['category'], string> = {
  briefing: '채용설명회',
  interview: '면접',
  camp: '직무캠프',
  program: '교육/프로그램',
  seminar: '행사/세미나',
  contest: '공모전',
  support: '지원사업',
  corp_support: '기업 지원',
  other: '기타',
}

const PERSONAL_STATUS_LABELS: Record<PersonalApplication['status'], string> = {
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

const JOB_STATUS_LABELS: Record<JobPosting['status'], string> = {
  saved: '저장',
  preparing: '준비 중',
  applied: '지원 완료',
  interview: '면접',
  offer: '오퍼',
  rejected: '불합격',
  closed: '마감',
}

const MODE_LABELS = {
  offline: '오프라인',
  online: '온라인',
  hybrid: '혼합',
} as const

const compact = (values: Array<string | undefined | false | null>) =>
  values.filter((value): value is string => Boolean(value && value.trim()))

const joinMeta = (values: Array<string | undefined | false | null>) =>
  compact(values).join(' · ')

const todoBelongsToDate = (todoDate: string | undefined, dateStr: string, todayStr: string) =>
  todoDate ? todoDate === dateStr : dateStr === todayStr

const isWeekdayInRange = (dateStr: string, start?: string, end?: string) => {
  if (!start || dateStr < start || dateStr > (end || start)) return false
  const day = new Date(`${dateStr}T12:00:00`).getDay()
  return day !== 0 && day !== 6
}

const getCareerMilestoneLabels = (event: CareerEvent, dateStr: string) => {
  const labels: string[] = []
  if (event.date === dateStr) labels.push('일정')
  if (event.applicationDeadline === dateStr) labels.push('신청 마감')
  if (event.resultDate === dateStr) labels.push('결과 발표')
  if (isWeekdayInRange(dateStr, event.operationStartDate, event.operationEndDate)) labels.push('운영')
  return labels
}

const getMatchingLabels = (
  dateStr: string,
  entries: Array<[string | undefined, string]>,
) => entries
  .filter(([date]) => date === dateStr)
  .map(([, label]) => label)

const isOpenCareer = (event: CareerEvent) =>
  !['completed', 'rejected', 'cancelled'].includes(event.status)

const isOpenApplication = (item: PersonalApplication) =>
  !['rejected', 'finished', 'cancelled'].includes(item.status)

const isOpenJobPosting = (item: JobPosting) =>
  !['rejected', 'closed'].includes(item.status)

const isOpenGoalLike = (status: string | undefined, pct: number | undefined) =>
  status !== '완료' && (pct ?? 0) < 100

const byTimeThenTitle = <T extends { time?: string; title: string }>(a: T, b: T) =>
  (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title)

const topGoalBelongsToDate = (goal: TopGoal, dateStr: string, todayStr: string) =>
  goal.date ? goal.date === dateStr : dateStr === todayStr

export function getPlannerDayBriefing(
  sources: PlannerBriefingSources,
  dateStr: string,
  todayStr: string,
): PlannerDayBriefing {
  const todoItems = (sources.todos ?? [])
    .filter(todo => todoBelongsToDate(todo.date, dateStr, todayStr) && !todo.done)
    .map(todo => ({
      id: todo.id,
      title: todo.text,
      meta: joinMeta([todo.category ?? 'work', todo.priority]),
      detail: todo.sourceUrl,
    }))

  const directionItems = (sources.topGoals ?? [])
    .filter(goal => topGoalBelongsToDate(goal, dateStr, todayStr) && !goal.done)
    .map(goal => ({
      id: goal.id,
      title: goal.text,
      meta: '하루 방향',
    }))

  const scheduledItems = (sources.scheduledTasks ?? [])
    .filter(task => task.date === dateStr && !task.done)
    .sort(byTimeThenTitle)
    .map(task => ({
      id: task.id,
      title: task.title,
      meta: joinMeta([task.time, task.mode ? MODE_LABELS[task.mode] : undefined]),
      detail: joinMeta([task.location, task.address, task.note]),
    }))

  const careerItems = (sources.careerEvents ?? [])
    .filter(event => isOpenCareer(event) && getCareerMilestoneLabels(event, dateStr).length > 0)
    .sort(byTimeThenTitle)
    .map(event => {
      const milestones = getCareerMilestoneLabels(event, dateStr)
      return {
        id: event.id,
        title: event.title,
        meta: joinMeta([milestones.join(' · '), CAREER_CATEGORY_LABELS[event.category], event.time]),
        detail: joinMeta([event.organization, event.location, event.note]),
      }
    })

  const applicationItems = (sources.personalApplications ?? [])
    .filter(isOpenApplication)
    .flatMap(item => {
      const labels = getMatchingLabels(dateStr, [
        [item.deadline, '신청 마감'],
        [item.appliedDate, '신청일'],
        [item.resultDate, '결과일'],
        [item.startDate, '시작일'],
        [item.endDate, '종료일'],
      ])
      if (labels.length === 0) return []
      return [{
        id: item.id,
        title: item.title,
        meta: joinMeta([labels.join(' · '), PERSONAL_STATUS_LABELS[item.status]]),
        detail: joinMeta([item.organization, item.nextAction, item.keywords?.join(', ')]),
      }]
    })

  const jobItems = (sources.jobPostings ?? [])
    .filter(isOpenJobPosting)
    .flatMap(item => {
      const labels = getMatchingLabels(dateStr, [
        [item.deadline, '지원 마감'],
        [item.appliedDate, '지원일'],
        [item.resultDate, '결과일'],
      ])
      if (labels.length === 0) return []
      return [{
        id: item.id,
        title: `${item.company} · ${item.position}`,
        meta: joinMeta([labels.join(' · '), JOB_STATUS_LABELS[item.status]]),
        detail: joinMeta([item.location, item.nextAction, item.keywords?.join(', ')]),
      }]
    })

  const taskItems = (sources.tasks ?? [])
    .filter(task => task.due === dateStr && !task.done && task.status !== '완료')
    .map(task => ({
      id: task.id,
      title: task.name,
      meta: joinMeta([task.priority, task.status, task.type]),
      detail: task.sourceUrl,
    }))

  const goalItems = (sources.goals ?? [])
    .filter(goal => goal.due === dateStr && isOpenGoalLike(goal.status, goal.pct))
    .map(goal => ({
      id: goal.id,
      title: goal.name,
      meta: joinMeta([goal.area, `${goal.pct}%`]),
      detail: goal.steps?.filter(step => !step.done).slice(0, 2).map(step => step.text).join(' · '),
    }))

  const projectItems = (sources.projects ?? [])
    .filter(project => project.due === dateStr && isOpenGoalLike(project.status, project.pct))
    .map(project => ({
      id: project.id,
      title: project.name,
      meta: joinMeta([project.status, `${project.pct}%`]),
      detail: project.steps?.filter(step => !step.done).slice(0, 2).map(step => step.text).join(' · '),
    }))

  const sections: PlannerBriefingSection[] = [
    { id: 'todos', label: 'Todo', items: todoItems },
    { id: 'directions', label: '하루 방향', items: directionItems },
    { id: 'scheduled', label: '예정 작업', items: scheduledItems },
    { id: 'career', label: '기회 일정', items: careerItems },
    { id: 'personalApplications', label: '내 신청', items: applicationItems },
    { id: 'jobPostings', label: '지원 공고', items: jobItems },
    { id: 'tasks', label: '작업 마감', items: taskItems },
    { id: 'goals', label: '목표 마감', items: goalItems },
    { id: 'projects', label: '프로젝트 마감', items: projectItems },
  ]

  const total = sections.reduce((sum, section) => sum + section.items.length, 0)
  const deadlineTotal = taskItems.length
    + goalItems.length
    + projectItems.length
    + applicationItems.filter(item => item.meta?.includes('마감')).length
    + jobItems.filter(item => item.meta?.includes('마감')).length

  return {
    date: dateStr,
    total,
    sections,
    summary: {
      todos: todoItems.length,
      focus: directionItems.length,
      schedules: scheduledItems.length + careerItems.length,
      deadlines: deadlineTotal,
      applications: applicationItems.length + jobItems.length,
    },
  }
}

export function formatPlannerBriefingLines(briefing: PlannerDayBriefing, maxItemsPerSection = 5) {
  if (briefing.total === 0) return [`${briefing.date}에 예정된 항목이 없습니다.`]

  const lines = [`${briefing.date} 브리핑: ${briefing.total}개 항목`]
  briefing.sections
    .filter(section => section.items.length > 0)
    .forEach(section => {
      lines.push(`[${section.label}]`)
      section.items.slice(0, maxItemsPerSection).forEach(item => {
        lines.push(`- ${joinMeta([item.title, item.meta])}`)
      })
      if (section.items.length > maxItemsPerSection) {
        lines.push(`- 외 ${section.items.length - maxItemsPerSection}개`)
      }
    })
  return lines
}
