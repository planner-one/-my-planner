import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Goal, TopGoal } from '../types'
import { calculateGoalPct, createGoalId, getGoalDueText, getRemainingSteps, getTodayTopGoals, sortPriorityGoals } from '../utils/goals'
import { toLocalDateKey } from '../utils/date'

const GOAL_STATUS = ['진행 중', '대기', '완료'] as const

export default function Goals() {
  const { goals, setGoals, topGoals, setTopGoals } = useApp()
  const [newTopGoal, setNewTopGoal] = useState('')
  const [newGoalName, setNewGoalName] = useState('')

  const TOP_GOAL_MAX = 6
  const today = toLocalDateKey()
  const todayTopGoals = getTodayTopGoals(topGoals, today)

  const addTopGoal = () => {
    const text = newTopGoal.trim()
    if (!text || todayTopGoals.length >= TOP_GOAL_MAX) return
    const next: TopGoal = { id: `top-goal-${Date.now()}`, text, done: false, date: today }
    setTopGoals(prev => [...prev, next])
    setNewTopGoal('')
  }

  const updateTopGoal = (id: string, patch: Partial<TopGoal>) => {
    setTopGoals(prev => prev.map(goal => goal.id === id ? { ...goal, ...patch } : goal))
  }

  const removeTopGoal = (id: string) => {
    setTopGoals(prev => prev.filter(goal => goal.id !== id))
  }

  const addGoal = () => {
    const name = newGoalName.trim()
    if (!name) return
    const next: Goal = {
      id: createGoalId(),
      name,
      area: '개인',
      pct: 0,
      status: '진행 중',
      due: '',
      steps: [],
    }
    setGoals(prev => [next, ...prev])
    setNewGoalName('')
  }

  const updateGoal = (id: string, patch: Partial<Goal>) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id !== id) return goal
      const next = { ...goal, ...patch }
      return patch.steps ? { ...next, pct: calculateGoalPct(patch.steps) } : next
    }))
  }

  const removeGoal = (id: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== id))
  }

  const addStep = (goal: Goal) => {
    const steps = [...goal.steps, { text: '새 단계', done: false }]
    updateGoal(goal.id, { steps })
  }

  const updateStep = (goal: Goal, index: number, patch: Partial<Goal['steps'][number]>) => {
    const steps = goal.steps.map((step, i) => i === index ? { ...step, ...patch } : step)
    updateGoal(goal.id, { steps })
  }

  const removeStep = (goal: Goal, index: number) => {
    const steps = goal.steps.filter((_, i) => i !== index)
    updateGoal(goal.id, { steps })
  }

  const sortedGoals = sortPriorityGoals(goals)
  const activeTopGoals = todayTopGoals.slice(0, 3)
  const focusDone = todayTopGoals.filter(goal => goal.done).length
  const activeGoals = goals.filter(goal => goal.status !== '완료' && goal.pct < 100)
  const completedGoals = goals.filter(goal => goal.status === '완료' || goal.pct >= 100)
  const avgGoalPct = activeGoals.length === 0
    ? 0
    : Math.round(activeGoals.reduce((sum, goal) => sum + goal.pct, 0) / activeGoals.length)
  const nextGoal = sortedGoals.find(goal => goal.status !== '완료' && goal.pct < 100)
  const nextGoalStep = nextGoal?.steps.find(step => !step.done)
  const focusPct = todayTopGoals.length === 0 ? 0 : Math.round((focusDone / todayTopGoals.length) * 100)

  return (
    <div className="goals-page">
      <section className="goals-heading">
        <div>
          <h2>목표 관리</h2>
          <p>Todo는 오늘 끝낼 실행 작업, 오늘 방향은 하루 기준, 장기 목표는 진행률과 마감 기준으로 관리합니다.</p>
        </div>
      </section>

      <section className="goal-guide">
        <GuideCard title="Todo" text="오늘 끝낼 수 있는 구체적인 작업" example="강의 1개 듣기" />
        <GuideCard title="오늘 방향" text="오늘만 붙잡을 기준입니다. 날짜가 바뀌면 새로 시작합니다." example="오늘은 이력서 수정에 집중" />
        <GuideCard title="장기 목표" text="마감일과 단계가 있는 진행 목표" example="자격증 합격 45%" />
      </section>

      <section className="goal-stats">
        <GoalStat label="오늘 방향" value={`${focusDone}/${todayTopGoals.length}`} sub="오늘 체크한 방향" />
        <GoalStat label="장기 목표 평균" value={`${avgGoalPct}%`} sub={`진행 ${activeGoals.length}개`} />
        <GoalStat label="완료 목표" value={`${completedGoals.length}개`} sub="누적 완료" />
        <GoalStat label="다음 목표" value={nextGoal ? `${nextGoal.pct}%` : '-'} sub={nextGoal?.name ?? '목표 없음'} />
      </section>

      <section className="goal-command-board">
        <article className="goal-focus-board">
          <div className="goal-board-heading">
            <div>
              <span>오늘 방향</span>
              <h3>{focusPct}% 정리됨</h3>
            </div>
            <b>{focusDone}/{todayTopGoals.length}</b>
          </div>
          <div className="goal-board-progress"><i style={{ width: `${focusPct}%` }} /></div>
          <div className="goal-focus-preview">
            {todayTopGoals.length === 0 ? (
              <p className="empty-text">오늘만 볼 방향을 추가하세요.</p>
            ) : todayTopGoals.slice(0, 4).map(goal => (
              <button
                key={goal.id}
                type="button"
                className={goal.done ? 'goal-focus-chip done' : 'goal-focus-chip'}
                onClick={() => updateTopGoal(goal.id, { done: !goal.done })}
              >
                {goal.done ? '완료' : '오늘'} · {goal.text}
              </button>
            ))}
          </div>
        </article>

        <article className="goal-next-board">
          <span>다음 장기 목표</span>
          <strong>{nextGoal?.name ?? '진행 중 목표 없음'}</strong>
          <p>{nextGoalStep?.text ?? (nextGoal ? '다음 단계를 추가하면 목표 흐름이 더 선명해집니다.' : '새 목표를 추가하면 로드맵이 표시됩니다.')}</p>
          <div className="goal-next-meta">
            <small>{nextGoal ? getGoalDueText(nextGoal.due) : '-'}</small>
            <small>{nextGoal ? `${getRemainingSteps(nextGoal)}단계 남음` : '대기'}</small>
          </div>
        </article>
      </section>

      <section className="goals-grid">
        <div className="goal-panel">
          <div className="panel-heading">
            <div>
              <h3>오늘 방향</h3>
              <p>Todo가 아니라 오늘만 기준으로 삼을 방향 1~3개를 적습니다.</p>
            </div>
          </div>
          <div className="inline-add">
            <input
              value={newTopGoal}
              onChange={event => setNewTopGoal(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) addTopGoal()
              }}
              disabled={todayTopGoals.length >= TOP_GOAL_MAX}
              placeholder={todayTopGoals.length >= TOP_GOAL_MAX ? `오늘 방향은 최대 ${TOP_GOAL_MAX}개까지 추가할 수 있어요` : '예: 오늘은 이력서 수정에 집중'}
            />
            <button type="button" onClick={addTopGoal} disabled={todayTopGoals.length >= TOP_GOAL_MAX}>추가</button>
          </div>
          <div className="top-goal-list">
            {todayTopGoals.length === 0 ? (
              <EmptyText text="오늘만 볼 방향을 추가하세요." />
            ) : todayTopGoals.map(goal => (
              <div key={goal.id} className="top-goal-row">
                <button
                  type="button"
                  onClick={() => updateTopGoal(goal.id, { done: !goal.done })}
                  className={goal.done ? 'check done' : 'check'}
                >
                  {goal.done ? '✓' : '○'}
                </button>
                <input
                  value={goal.text}
                  onChange={event => updateTopGoal(goal.id, { text: event.target.value })}
                  className={goal.done ? 'done-text' : ''}
                />
                <button type="button" onClick={() => removeTopGoal(goal.id)} className="ghost-button">삭제</button>
              </div>
            ))}
          </div>
        </div>

        <div className="goal-panel">
          <div className="panel-heading">
            <div>
              <h3>장기 목표</h3>
              <p>마감과 진행률을 보고 놓치면 안 되는 장기 목표를 관리합니다.</p>
            </div>
          </div>
          <div className="inline-add">
            <input
              value={newGoalName}
              onChange={event => setNewGoalName(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) addGoal()
              }}
              placeholder="예: 정보처리기사 합격"
            />
            <button type="button" onClick={addGoal}>추가</button>
          </div>

          <div className="goal-list">
            {sortedGoals.length === 0 ? (
              <EmptyText text="장기 목표를 추가하면 위젯에도 표시됩니다." />
            ) : sortedGoals.map(goal => (
              <article key={goal.id} className="goal-card">
                <div className="goal-card-top">
                  <input
                    value={goal.name}
                    onChange={event => updateGoal(goal.id, { name: event.target.value })}
                    className="goal-name-input"
                  />
                  <button type="button" onClick={() => removeGoal(goal.id)} className="ghost-button">삭제</button>
                </div>

                <div className="goal-meta-row">
                  <input
                    value={goal.area ?? ''}
                    onChange={event => updateGoal(goal.id, { area: event.target.value })}
                    placeholder="분야"
                  />
                  <select
                    value={goal.status ?? '진행 중'}
                    onChange={event => updateGoal(goal.id, { status: event.target.value })}
                  >
                    {GOAL_STATUS.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <input
                    type="date"
                    value={goal.due ?? ''}
                    onChange={event => updateGoal(goal.id, { due: event.target.value })}
                  />
                </div>

                <div className="goal-progress-row">
                  <div className="goal-progress">
                    <span style={{ width: `${goal.pct}%` }} />
                  </div>
                  <b>{goal.pct}%</b>
                  <small>{getGoalDueText(goal.due)}</small>
                </div>

                <div className="goal-step-list">
                  {goal.steps.length === 0 ? (
                    <p>단계를 추가하면 진행률이 자동 계산됩니다.</p>
                  ) : goal.steps.map((step, index) => (
                    <div key={`${goal.id}-${index}`} className="goal-step-row">
                      <input
                        type="checkbox"
                        checked={step.done}
                        onChange={event => updateStep(goal, index, { done: event.target.checked })}
                      />
                      <input
                        value={step.text}
                        onChange={event => updateStep(goal, index, { text: event.target.value })}
                        className={step.done ? 'done-text' : ''}
                      />
                      <button type="button" onClick={() => removeStep(goal, index)} className="ghost-button">삭제</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addStep(goal)} className="subtle-button">
                  단계 추가 · 남은 단계 {getRemainingSteps(goal)}개
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {activeTopGoals.length > 0 && (
        <section className="goal-summary">
          <h3>오늘 방향</h3>
          <div>
            {activeTopGoals.map(goal => (
              <span key={goal.id} className={goal.done ? 'summary-pill done' : 'summary-pill'}>
                {goal.done ? '완료' : '오늘'} · {goal.text}
              </span>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .goals-page { max-width: 1120px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 18px; }
        .goals-heading { display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; }
        .goals-heading h2 { font-size: 24px; margin: 0 0 6px; letter-spacing: 0; }
        .goals-heading p, .panel-heading p { color: var(--muted); margin: 0; font-size: 13px; line-height: 1.5; }
        .goal-guide { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .goal-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .guide-card, .goal-panel, .goal-summary, .goal-stat, .goal-focus-board, .goal-next-board { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; }
        .guide-card { padding: 14px; }
        .goal-stat { padding: 13px; }
        .goal-stat span { color: var(--muted); font-size: 11px; font-weight: 800; }
        .goal-stat b { display: block; margin: 5px 0 3px; font-size: 21px; color: var(--text); }
        .goal-stat small { display: block; color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .guide-card h3, .panel-heading h3, .goal-summary h3 { margin: 0; font-size: 15px; letter-spacing: 0; }
        .guide-card p { margin: 7px 0 9px; color: var(--muted); font-size: 12px; line-height: 1.5; }
        .guide-card small { color: var(--accent); font-size: 11px; font-weight: 700; }
        .goal-command-board { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr); gap: 12px; }
        .goal-focus-board, .goal-next-board { padding: 14px; display: flex; flex-direction: column; gap: 11px; }
        .goal-board-heading { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
        .goal-board-heading span, .goal-next-board > span { color: var(--accent); font-size: 11px; font-weight: 900; }
        .goal-board-heading h3 { margin: 4px 0 0; font-size: 17px; letter-spacing: 0; }
        .goal-board-heading b { color: var(--accent); font-size: 26px; line-height: 1; }
        .goal-board-progress { height: 10px; border-radius: 999px; background: var(--bg4); overflow: hidden; }
        .goal-board-progress i { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
        .goal-focus-preview { display: flex; flex-wrap: wrap; gap: 7px; }
        .goal-focus-chip { max-width: 100%; border: 1px solid var(--border); border-radius: 999px; background: var(--bg3); color: var(--text); padding: 7px 10px; font-size: 12px; font-weight: 800; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .goal-focus-chip.done { border-color: transparent; background: var(--accent-soft); color: var(--accent); }
        .goal-next-board strong { color: var(--text); font-size: 17px; overflow-wrap: anywhere; }
        .goal-next-board p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
        .goal-next-meta { display: flex; flex-wrap: wrap; gap: 7px; }
        .goal-next-meta small { border-radius: 999px; background: var(--bg3); color: var(--muted); padding: 6px 9px; font-size: 11px; font-weight: 800; }
        .goals-grid { display: grid; grid-template-columns: minmax(280px, 0.75fr) minmax(0, 1.25fr); gap: 14px; align-items: start; }
        .goal-panel { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .panel-heading { display: flex; justify-content: space-between; gap: 10px; }
        .inline-add { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
        .inline-add input, .goal-card input, .goal-card select, .top-goal-row input { min-width: 0; height: 34px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 10px; font-family: inherit; font-size: 13px; outline: none; }
        .inline-add button, .subtle-button { height: 34px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 13px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .inline-add input:disabled, .inline-add button:disabled { opacity: 0.5; cursor: not-allowed; }
        .top-goal-list, .goal-list { display: flex; flex-direction: column; gap: 8px; }
        .top-goal-row { display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 8px; border-radius: 8px; background: var(--bg3); }
        .check { width: 32px; height: 32px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); color: var(--muted); cursor: pointer; font-weight: 800; }
        .check.done { border: 0; background: var(--accent); color: #fff; }
        .ghost-button { border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 11px; padding: 5px; }
        .goal-card { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 8px; background: var(--bg3); }
        .goal-card-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; }
        .goal-name-input { font-weight: 800; background: transparent !important; border-color: transparent !important; padding-left: 0 !important; font-size: 15px !important; }
        .goal-meta-row { display: grid; grid-template-columns: 1fr 100px 140px; gap: 8px; }
        .goal-progress-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 9px; align-items: center; }
        .goal-progress { height: 7px; border-radius: 999px; background: var(--bg4); overflow: hidden; }
        .goal-progress span { display: block; height: 100%; border-radius: inherit; background: var(--accent); transition: width 0.2s ease; }
        .goal-progress-row b { color: var(--accent); font-size: 13px; }
        .goal-progress-row small { color: var(--muted); font-size: 11px; white-space: nowrap; }
        .goal-step-list { display: flex; flex-direction: column; gap: 6px; }
        .goal-step-list p, .empty-text { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; text-align: center; padding: 12px; }
        .goal-step-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 7px; align-items: center; }
        .goal-step-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
        .done-text { color: var(--muted) !important; text-decoration: line-through; }
        .subtle-button { background: var(--bg4); color: var(--text); }
        .goal-summary { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .goal-summary > div { display: flex; flex-wrap: wrap; gap: 7px; }
        .summary-pill { padding: 6px 10px; border-radius: 999px; background: var(--bg3); color: var(--text); font-size: 12px; font-weight: 700; }
        .summary-pill.done { background: var(--accent-soft); color: var(--accent); }
        @media (max-width: 760px) {
          .goals-page { gap: 14px; }
          .goal-guide, .goals-grid, .goal-command-board { grid-template-columns: 1fr; }
          .goal-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .goal-panel { padding: 14px; }
          .goal-meta-row { grid-template-columns: 1fr; }
          .goal-progress-row { grid-template-columns: 1fr auto; }
          .goal-progress-row small { grid-column: 1 / -1; }
        }
        @media (max-width: 520px) {
          .goal-stats { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function GoalStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="goal-stat">
      <span>{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </article>
  )
}

function GuideCard({ title, text, example }: { title: string; text: string; example: string }) {
  return (
    <div className="guide-card">
      <h3>{title}</h3>
      <p>{text}</p>
      <small>{example}</small>
    </div>
  )
}

function EmptyText({ text }: { text: string }) {
  return <p className="empty-text">{text}</p>
}
