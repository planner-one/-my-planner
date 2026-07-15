import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import ts from 'typescript'

const repoRoot = path.resolve(import.meta.dirname, '..')
const sourcePath = path.join(repoRoot, 'src/utils/careerEvents.ts')
const tempDir = path.join(os.tmpdir(), 'planner-career-milestones-check')
const tempModulePath = path.join(tempDir, 'careerEvents.mjs')

const source = await readFile(sourcePath, 'utf8')
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
})

await mkdir(tempDir, { recursive: true })
await writeFile(tempModulePath, transpiled.outputText, 'utf8')

const {
  createCareerCategoryMilestones,
  getCareerMilestoneEntries,
  getCareerMilestones,
  getCareerNextMilestone,
  normalizeCareerMilestones,
  syncCareerEventDateFields,
} = await import(tempModulePath)

const legacyEvent = {
  id: 'legacy',
  title: '레거시 지원사업',
  category: 'support',
  status: 'planned',
  date: '2026-07-10',
  applicationDeadline: '2026-07-09',
  resultDate: '2026-07-15',
  operationStartDate: '2026-07-20',
  operationEndDate: '2026-07-24',
}

const legacyMilestones = normalizeCareerMilestones(legacyEvent)
assert.equal(legacyMilestones.length, 4, 'legacy date fields should become four milestones')
assert.deepEqual(
  legacyMilestones.map(item => item.label),
  ['신청 마감', '일정', '결과 발표', '운영 기간'],
  'legacy milestones should keep readable labels in date order',
)
assert.deepEqual(getCareerMilestones(legacyEvent, '2026-07-22'), ['운영'], 'operation range should appear on weekdays')
assert.deepEqual(getCareerMilestones(legacyEvent, '2026-07-25'), [], 'operation range should skip weekends')

const contestEvent = syncCareerEventDateFields({
  id: 'contest',
  title: 'AI 공모전',
  category: 'contest',
  status: 'pending',
  date: '2026-07-20',
  milestones: [
    { id: 'apply', type: 'application_deadline', label: '신청 마감', date: '2026-07-10' },
    { id: 'selection', type: 'selection_announcement', label: '선발 발표', date: '2026-07-12' },
    { id: 'final', type: 'final_round', label: '본선', date: '2026-07-20' },
    { id: 'result', type: 'result_announcement', label: '최종 결과', date: '2026-07-30' },
  ],
})

assert.equal(contestEvent.applicationDeadline, '2026-07-10', 'synced event should keep application deadline')
assert.equal(contestEvent.resultDate, '2026-07-12', 'synced event should expose first result-like milestone for legacy consumers')
assert.deepEqual(getCareerMilestones(contestEvent, '2026-07-20'), ['본선'], 'final-round milestone should appear on calendar date')
assert.equal(getCareerNextMilestone(contestEvent, '2026-07-11')?.label, '선발 발표', 'pending contest should prioritize selection/result milestone')

const confirmedContest = { ...contestEvent, status: 'confirmed' }
assert.equal(getCareerNextMilestone(confirmedContest, '2026-07-11')?.label, '본선', 'confirmed contest should prioritize final/participation milestone')

const editedEvent = syncCareerEventDateFields({
  id: 'edited-event',
  title: '날짜를 수정한 설명회',
  category: 'briefing',
  status: 'interested',
  date: '2026-07-20',
  milestones: [
    { id: 'main', type: 'main', label: '설명회', date: '2026-07-25' },
  ],
})

assert.equal(editedEvent.date, '2026-07-25', 'edited milestone date should replace the legacy date field')
assert.deepEqual(
  editedEvent.milestones.map(item => item.date),
  ['2026-07-25'],
  'edited event should not restore the previous legacy date as another milestone',
)

const previouslyCorruptedEvent = syncCareerEventDateFields({
  id: 'previously-corrupted',
  title: '이전 수정 실패 일정',
  category: 'briefing',
  status: 'interested',
  date: '2026-07-20',
  milestones: [
    { id: 'previously-corrupted-legacy-main', type: 'main', label: '일정', date: '2026-07-20' },
    { id: 'main', type: 'main', label: '설명회', date: '2026-07-25' },
  ],
})

assert.equal(previouslyCorruptedEvent.date, '2026-07-25', 'a previously restored legacy milestone should not keep the old date active')
assert.deepEqual(
  previouslyCorruptedEvent.milestones.map(item => item.id),
  ['main'],
  'a generated legacy milestone should be removed when the edited milestone exists',
)

const duplicatedLegacyIdEvent = syncCareerEventDateFields({
  id: 'duplicated-legacy-id',
  title: '레거시 일정 수정 실패',
  category: 'briefing',
  status: 'interested',
  date: '2026-07-20',
  milestones: [
    { id: 'duplicated-legacy-id-legacy-main', type: 'main', label: '일정', date: '2026-07-20' },
    { id: 'duplicated-legacy-id-legacy-main', type: 'main', label: '일정', date: '2026-07-25' },
  ],
})

assert.equal(duplicatedLegacyIdEvent.date, '2026-07-25', 'an edited legacy milestone should win over the stale date with the same generated id')
assert.deepEqual(
  duplicatedLegacyIdEvent.milestones.map(item => item.date),
  ['2026-07-25'],
  'the stale duplicate with the same generated legacy id should be removed',
)

const contestTemplate = createCareerCategoryMilestones('contest', { date: '2026-07-20' })
assert.deepEqual(
  contestTemplate.map(item => item.label),
  ['신청 마감', '선발 발표', '본선', '최종 결과'],
  'contest template should include application, selection, final round, and final result',
)

const entries = getCareerMilestoneEntries(contestEvent)
assert.equal(entries.at(-1)?.label, '최종 결과', 'milestone entries should remain date sorted')

console.log('✓ career milestone checks passed')
