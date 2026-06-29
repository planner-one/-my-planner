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

  return (
    <div className="projects-page">
      <section className="projects-heading">
        <div>
          <h2>프로젝트</h2>
          <p>여러 작업을 묶어서 진행하는 프로젝트 단위로 관리합니다. 진행률은 하위 작업 완료 비율로 자동 계산됩니다.</p>
        </div>
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
          ) : sortedProjects.map(project => (
            <article key={project.id} className="project-card">
              <div className="project-card-top">
                <input
                  value={project.name}
                  onChange={event => updateProject(project.id, { name: event.target.value })}
                  onFocus={() => setPendingDeleteId(null)}
                  className="project-name-input"
                />
                <button
                  type="button"
                  onClick={() => removeProject(project.id)}
                  className={pendingDeleteId === project.id ? 'ghost-button danger' : 'ghost-button'}
                  title={pendingDeleteId === project.id ? '한 번 더 누르면 삭제됩니다' : '프로젝트 삭제'}
                >
                  {pendingDeleteId === project.id ? '삭제 확인' : '삭제'}
                </button>
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

              <div className="project-step-list">
                {(project.steps ?? []).length === 0 ? (
                  <p>작업을 추가하면 진행률이 자동 계산됩니다.</p>
                ) : (project.steps ?? []).map((step, index) => (
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
          ))}
        </div>
      </section>

      <style>{`
        .projects-page { max-width: 760px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 18px; }
        .projects-heading h2 { font-size: 24px; margin: 0 0 6px; letter-spacing: 0; }
        .projects-heading p { color: var(--muted); margin: 0; font-size: 13px; line-height: 1.5; }
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
        .project-card { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 8px; background: var(--bg3); }
        .project-card-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; }
        .project-name-input { font-weight: 800; background: transparent !important; border-color: transparent !important; padding-left: 0 !important; font-size: 15px !important; }
        .project-meta-row { display: grid; grid-template-columns: 140px 140px; gap: 8px; }
        .project-progress-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 9px; align-items: center; }
        .project-progress { height: 7px; border-radius: 999px; background: var(--bg4); overflow: hidden; }
        .project-progress span { display: block; height: 100%; border-radius: inherit; background: var(--accent); transition: width 0.2s ease; }
        .project-progress-row b { color: var(--accent); font-size: 13px; }
        .project-progress-row small { color: var(--muted); font-size: 11px; white-space: nowrap; }
        .project-step-list { display: flex; flex-direction: column; gap: 6px; }
        .project-step-list p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; text-align: center; padding: 12px; }
        .project-step-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 7px; align-items: center; }
        .project-step-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
        .done-text { color: var(--muted) !important; text-decoration: line-through; }
        .subtle-button { background: var(--bg4); color: var(--text); }
        @media (max-width: 760px) {
          .projects-page { gap: 14px; }
          .project-panel { padding: 14px; }
          .project-meta-row { grid-template-columns: 1fr; }
          .project-progress-row { grid-template-columns: 1fr auto; }
          .project-progress-row small { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  )
}
