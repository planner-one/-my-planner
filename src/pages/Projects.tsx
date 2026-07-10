import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/ui/PageHeader'
import type { GoalStep, Project } from '../types'
import {
  calculateProjectPct,
  createProjectId,
  getProjectDueText,
  getRemainingProjectSteps,
  sortProjects,
} from '../utils/projects'

const PROJECT_STATUS = ['진행 중', '대기', '완료'] as const

export default function Projects() {
  const { projects, setProjects } = useApp()
  const [newProjectName, setNewProjectName] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const addProject = () => {
    const name = newProjectName.trim()
    if (!name) return
    const next: Project = {
      id: createProjectId(),
      name,
      pct: 0,
      status: '진행 중',
      due: '',
      description: '',
      steps: [],
    }
    setProjects(prev => [next, ...prev])
    setNewProjectName('')
  }

  const updateProject = (id: string, patch: Partial<Project>, options: { recalculatePct?: boolean } = {}) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== id) return project
      const next = { ...project, ...patch }
      return patch.steps && options.recalculatePct !== false ? { ...next, pct: calculateProjectPct(patch.steps) } : next
    }))
  }

  const removeProject = (id: string) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id)
      return
    }
    setProjects(prev => prev.filter(project => project.id !== id))
    setPendingDeleteId(null)
  }

  const addStep = (project: Project) => {
    const steps = [...(project.steps ?? []), { text: '새 작업', done: false }]
    updateProject(project.id, { steps })
  }

  const updateStep = (project: Project, index: number, patch: Partial<GoalStep>) => {
    const steps = (project.steps ?? []).map((step, i) => i === index ? { ...step, ...patch } : step)
    updateProject(project.id, { steps })
  }

  const removeStep = (project: Project, index: number) => {
    const steps = (project.steps ?? []).filter((_, i) => i !== index)
    updateProject(project.id, { steps })
  }

  const updateProjectStatus = (project: Project, status: string) => {
    const patch: Partial<Project> = { status }
    if (status === '완료') {
      if ((project.steps ?? []).length > 0) {
        patch.steps = (project.steps ?? []).map(step => ({ ...step, done: true }))
      } else {
        patch.pct = 100
      }
    }
    updateProject(project.id, patch)
  }

  const sortedProjects = sortProjects(projects)
  const activeProjects = projects.filter(project => project.status !== '완료' && project.pct < 100)
  const waitingProjects = projects.filter(project => project.status === '대기')
  const completedProjects = projects.filter(project => project.status === '완료' || project.pct >= 100)
  const avgPct = activeProjects.length === 0
    ? 0
    : Math.round(activeProjects.reduce((sum, project) => sum + project.pct, 0) / activeProjects.length)
  const urgentProjects = sortedProjects.filter(project => project.due && project.status !== '완료' && project.pct < 100).slice(0, 3)
  const nextProject = sortedProjects.find(project => project.status !== '완료' && project.pct < 100)
  const nextStep = nextProject?.steps?.find(step => !step.done)

  return (
    <div className="projects-page">
      <PageHeader
        title="프로젝트"
        description="여러 작업을 하나의 결과물과 진행 단계로 묶어 관리합니다."
      />

      <section className="project-summary-grid">
        <ProjectSummary label="진행 프로젝트" value={`${activeProjects.length}개`} sub={`완료 ${completedProjects.length}개`} />
        <ProjectSummary label="평균 진행률" value={`${avgPct}%`} sub="진행 중 프로젝트 기준" />
        <ProjectSummary label="마감 있는 항목" value={`${urgentProjects.length}개`} sub={urgentProjects[0]?.name ?? '마감 등록 없음'} />
      </section>

      <section className="project-ux-board">
        <article className="project-next-focus">
          {nextProject ? (
            <>
              <div>
                <span>다음 결과물</span>
                <strong>{nextProject.name}</strong>
                <p>{nextStep ? nextStep.text : '하위 작업을 추가하면 다음 실행이 더 분명해집니다.'}</p>
              </div>
              <b>{nextProject.pct}%</b>
            </>
          ) : (
            <div>
              <span>다음 결과물</span>
              <strong>진행 중 프로젝트 없음</strong>
              <p>새 프로젝트를 추가하면 진행 흐름이 여기에 표시됩니다.</p>
            </div>
          )}
        </article>

        <article className="project-pipeline">
          <span>프로젝트 흐름</span>
          <div>
            <strong>진행 {activeProjects.length}</strong>
            <strong>대기 {waitingProjects.length}</strong>
            <strong>완료 {completedProjects.length}</strong>
          </div>
        </article>
      </section>

      <section className="project-panel">
        <div className="inline-add">
          <input
            value={newProjectName}
            onChange={event => setNewProjectName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) addProject()
            }}
            placeholder="예: 포트폴리오 사이트 리뉴얼"
          />
          <button type="button" onClick={addProject}>추가</button>
        </div>

        <div className="project-list">
          {sortedProjects.length === 0 ? (
            <p className="empty-text">프로젝트를 추가하면 캘린더와 마감일 기준으로 정리됩니다.</p>
          ) : sortedProjects.map(project => {
            const steps = project.steps ?? []
            const doneSteps = steps.filter(step => step.done).length
            const projectNextStep = steps.find(step => !step.done)
            return (
            <article key={project.id} className={`project-card ${project.status === '완료' || project.pct >= 100 ? 'complete' : project.status === '대기' ? 'waiting' : 'active'}`}>
              <div className="project-card-top">
                <input
                  value={project.name}
                  onChange={event => updateProject(project.id, { name: event.target.value })}
                  onFocus={() => setPendingDeleteId(null)}
                  className="project-name-input"
                />
                <div className="project-card-actions">
                  <span>{project.status ?? '진행 중'}</span>
                  <button
                    type="button"
                    onClick={() => removeProject(project.id)}
                    className={pendingDeleteId === project.id ? 'ghost-button danger' : 'ghost-button'}
                    title={pendingDeleteId === project.id ? '한 번 더 누르면 삭제됩니다' : '프로젝트 삭제'}
                  >
                    {pendingDeleteId === project.id ? '삭제 확인' : '삭제'}
                  </button>
                </div>
              </div>

              <textarea
                value={project.description ?? ''}
                onChange={event => updateProject(project.id, { description: event.target.value })}
                onFocus={() => setPendingDeleteId(null)}
                placeholder="프로젝트 설명"
                className="project-description"
                rows={2}
              />

              <div className="project-meta-row">
                <select
                  value={project.status ?? '진행 중'}
                  onChange={event => updateProjectStatus(project, event.target.value)}
                >
                  {PROJECT_STATUS.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <input
                  type="date"
                  value={project.due ?? ''}
                  onChange={event => updateProject(project.id, { due: event.target.value })}
                />
              </div>

              <div className="project-progress-row">
                <div className="project-progress">
                  <span style={{ width: `${project.pct}%` }} />
                </div>
                <b>{project.pct}%</b>
                <small>{getProjectDueText(project.due)}</small>
              </div>

              <div className="project-snapshot-row">
                <span><b>{doneSteps}/{steps.length}</b><small>하위 작업</small></span>
                <span><b>{projectNextStep ? '다음' : '정리'}</b><small>{projectNextStep?.text ?? '남은 작업 없음'}</small></span>
              </div>

              <div className="project-step-list">
                {steps.length === 0 ? (
                  <p>작업을 추가하면 진행률이 자동 계산됩니다.</p>
                ) : steps.map((step, index) => (
                  <div key={`${project.id}-${index}`} className="project-step-row">
                    <input
                      type="checkbox"
                      checked={step.done}
                      onChange={event => updateStep(project, index, { done: event.target.checked })}
                    />
                    <input
                      value={step.text}
                      onChange={event => updateStep(project, index, { text: event.target.value })}
                      className={step.done ? 'done-text' : ''}
                    />
                    <button type="button" onClick={() => removeStep(project, index)} className="ghost-button">삭제</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addStep(project)} className="subtle-button">
                작업 추가 · 남은 작업 {getRemainingProjectSteps(project)}개
              </button>
            </article>
          )})}
        </div>
      </section>


    </div>
  )
}

function ProjectSummary({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="project-summary-card">
      <span>{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </article>
  )
}
