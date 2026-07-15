import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import ts from 'typescript'

const repoRoot = path.resolve(import.meta.dirname, '..')
const sourcePath = path.join(repoRoot, 'src/utils/personalApplications.ts')
const pagePath = path.join(repoRoot, 'src/pages/PersonalApplications.tsx')
const tempDir = path.join(os.tmpdir(), 'planner-personal-application-dates-check')
const tempModulePath = path.join(tempDir, 'personalApplications.mjs')

const source = await readFile(sourcePath, 'utf8').catch(() => '')
assert.ok(source, 'personal application date visibility utility should exist')

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
  getAvailableOptionalApplicationDateFields,
  getVisibleOptionalApplicationDateFields,
} = await import(tempModulePath)

const emptyApplication = {
  id: 'empty',
  title: '청년 지원 사업',
  type: 'youth_support',
  status: 'preparing',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
}

assert.deepEqual(
  getVisibleOptionalApplicationDateFields(emptyApplication),
  [],
  'a new application card should hide optional dates',
)

const existingApplication = {
  ...emptyApplication,
  id: 'existing',
  deadline: '2026-07-20',
  endDate: '2026-08-31',
}

assert.deepEqual(
  getVisibleOptionalApplicationDateFields(existingApplication),
  ['deadline', 'endDate'],
  'saved optional dates should remain visible',
)
assert.deepEqual(
  getVisibleOptionalApplicationDateFields(emptyApplication, ['startDate']),
  ['startDate'],
  'an optional date selected by the user should stay visible while empty',
)
assert.deepEqual(
  getAvailableOptionalApplicationDateFields(existingApplication, ['startDate']),
  [],
  'the add menu should exclude saved and already selected optional dates',
)

const pageSource = await readFile(pagePath, 'utf8')
assert.match(pageSource, /<option value="">날짜 추가<\/option>/, 'application cards should provide a date add menu')
assert.match(pageSource, /<label>신청일<input/, 'application date should remain a default field')
assert.match(pageSource, /<label>결과일<input/, 'result date should remain a default field')
assert.doesNotMatch(pageSource, /<label>마감<input/, 'deadline should not always render as a default field')
assert.doesNotMatch(pageSource, /<label>시작일<input/, 'start date should not always render as a default field')
assert.doesNotMatch(pageSource, /<label>종료일<input/, 'end date should not always render as a default field')

console.log('✓ personal application date checks passed')
