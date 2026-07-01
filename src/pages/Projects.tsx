import { useState } from 'react'
import { useApp } from '../store/AppContext'
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
      <section className="projects-heading">
        <div>
          <h2>프로젝트</h2>
          <p>프로젝트는 여러 작업을 묶어 결과물을 만드는 공간입니다. 실행할 일은 작업 관리, 진행 묶음은 프로젝트로 나눠서 봅니다.</p>
        </div>
      </section>

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

      <style>{`
        .projects-page { max-width: 920px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 18px; }
        .projects-heading h2 { font-size: 24px; margin: 0 0 6px; letter-spacing: 0; }
        .projects-heading p { color: var(--muted); margin: 0; font-size: 13px; line-height: 1.5; }
        .project-summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .project-summary-card, .project-next-focus, .project-pipeline { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; }
        .project-summary-card { padding: 13px; }
        .project-summary-card span { color: var(--muted); font-size: 11px; font-weight: 800; }
        .project-summary-card b { display: block; margin: 5px 0 3px; font-size: 22px; color: var(--text); }
        .project-summary-card small { color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
        .project-ux-board { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.8fr); gap: 12px; }
        .project-next-focus { padding: 14px; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; }
        .project-next-focus span { color: var(--accent); font-size: 11px; font-weight: 900; }
        .project-next-focus strong { display: block; margin-top: 4px; font-size: 16px; overflow-wrap: anywhere; }
        .project-next-focus p { margin: 6px 0 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
        .project-next-focus b { color: var(--accent); font-size: 24px; }
        .project-pipeline { padding: 14px; display: flex; flex-direction: column; gap: 12px; justify-content: center; }
        .project-pipeline > span { color: var(--accent); font-size: 11px; font-weight: 900; }
        .project-pipeline > div { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
        .project-pipeline strong { border-radius: 7px; background: var(--bg3); color: var(--text); font-size: 12px; padding: 10px 8px; text-align: center; }
        .project-panel { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .inline-add { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
        .inline-add input, .project-card input, .project-card select, .project-description { min-width: 0; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 10px; font-family: inherit; font-size: 13px; outline: none; }
        .inline-add input, .project-card input, .project-card select { height: 34px; }
        .project-description { padding: 8px 10px; resize: vertical; }
        .inline-add button, .subtle-button { height: 34px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 13px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .project-list { display: flex; flex-direction: column; gap: 8px; }
        .empty-text { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; text-align: center; padding: 12px; }
        .ghost-button { min-width: 44px; min-height: 32px; border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 11px; padding: 7px 9px; }
        .ghost-button.danger { color: var(--accent); font-weight: 800; }
        .project-card { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 8px; background: var(--bg3); border: 1px solid transparent; }
        .project-card.active { border-left: 4px solid var(--accent); }
        .project-card.waiting { border-left: 4px solid var(--muted); }
        .project-card.complete { opacity: 0.78; }
        .project-card-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; }
        .project-card-actions { display: flex; align-items: center; gap: 6px; }
        .project-card-actions span { border-radius: 999px; background: var(--accent-soft); color: var(--accent); padding: 4px 8px; font-size: 10px; font-weight: 900; white-space: nowrap; }
        .project-name-input { font-weight: 800; background: transparent !important; border-color: transparent !important; padding-left: 0 !important; font-size: 15px !important; }
        .project-meta-row { display: grid; grid-template-columns: 140px 140px; gap: 8px; }
        .project-progress-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 9px; align-items: center; }
        .project-progress { height: 7px; border-radius: 999px; background: var(--bg4); overflow: hidden; }
        .project-progress span { display: block; height: 100%; border-radius: inherit; background: var(--accent); transition: width 0.2s ease; }
        .project-progress-row b { color: var(--accent); font-size: 13px; }
        .project-progress-row small { color: var(--muted); font-size: 11px; white-space: nowrap; }
        .project-snapshot-row { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 8px; }
        .project-snapshot-row span { min-width: 0; border-radius: 8px; background: var(--bg2); padding: 9px 10px; }
        .project-snapshot-row b { display: block; color: var(--text); font-size: 12px; }
        .project-snapshot-row small { display: block; margin-top: 3px; color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .project-step-list { display: flex; flex-direction: column; gap: 6px; }
        .project-step-list p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; text-align: center; padding: 12px; }
        .project-step-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 7px; align-items: center; }
        .project-step-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
        .done-text { color: var(--muted) !important; text-decoration: line-through; }
        .subtle-button { background: var(--bg4); color: var(--text); }
        @media (max-width: 760px) {
          .projects-page { gap: 14px; }
          .project-summary-grid, .project-ux-board { grid-template-columns: 1fr; }
          .project-panel { padding: 14px; }
          .project-meta-row { grid-template-columns: 1fr; }
          .project-progress-row { grid-template-columns: 1fr auto; }
          .project-progress-row small { grid-column: 1 / -1; }
          .project-snapshot-row { grid-template-columns: 1fr; }
        }
      `}</style>
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
