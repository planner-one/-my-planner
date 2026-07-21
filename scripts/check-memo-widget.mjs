import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const source = await readFile(path.join(repoRoot, 'src/widgets/MemoWidget.tsx'), 'utf8')

assert.match(source, /useSyncExternalStore/, 'memo header and body should share manage mode without persisted app state')

const manageActionIndex = source.indexOf('aria-label="빠른 메모 편집"')
const archiveActionIndex = source.indexOf('보관함')
assert.ok(manageActionIndex >= 0, 'memo header should expose a pencil manage button')
assert.ok(archiveActionIndex > manageActionIndex, 'memo manage button should appear before the archive action')
assert.match(source, /aria-pressed=\{manageMode\}/, 'memo manage button should expose its pressed state')

assert.match(
  source,
  /\{manageMode && editingId !== memo\.id && \(\s*<div className="memo-widget-row-actions">/,
  'row actions should only render while manage mode is active',
)
assert.match(source, /<MemoActionIcon type="edit" \/>/, 'manage mode should expose an edit icon')
assert.match(source, /<MemoActionIcon type="delete" \/>/, 'manage mode should expose a delete icon')
assert.doesNotMatch(source, /memo-widget-archive-button/, 'memo rows should not expose a separate persistent archive action')
assert.doesNotMatch(source, />\s*수정\s*</, 'memo edit action should use an icon instead of a text label')
assert.doesNotMatch(source, />\s*삭제\s*</, 'memo delete action should use an icon instead of a text label')
assert.match(source, /aria-label="빠른 메모 수정"/, 'edit icon should remain accessible')
assert.match(source, /aria-label="빠른 메모 완전히 삭제"/, 'delete icon should remain accessible')
assert.match(
  source,
  /window\.confirm\('이 빠른 메모를 완전히 삭제할까요\?'\)/,
  'permanent memo deletion should require confirmation',
)
assert.match(source, /updatedAt:\s*now/, 'memo edits should update the timestamp')

assert.match(source, /event\.key === 'Enter' && !event\.shiftKey/, 'Enter should save an inline memo edit')
assert.match(source, /event\.key === 'Escape'/, 'Escape should cancel an inline memo edit')
assert.match(source, /skipMemoBlurRef/, 'cancelling an edit should prevent the following blur from saving it')
assert.match(source, /onBlur=\{\(\) => handleMemoEditBlur\(memo\.id\)\}/, 'leaving the inline editor should save it')
assert.match(source, /cancelMemoEdit\(\)/, 'Escape should use the protected cancel flow')

assert.match(source, /memo-scroll-region/, 'memo list should expose a scrollbar styling hook')
assert.match(source, /is-scrolling/, 'memo list should expose an active scrolling state')
assert.match(source, /scrollbar-color:\s*transparent transparent/, 'memo scrollbar should be hidden by default')
assert.match(source, /\.memo-scroll-region\.is-scrolling/, 'memo scrollbar should become visible while scrolling')
assert.match(source, /setTimeout\([\s\S]*700\)/, 'memo scrollbar should hide shortly after scrolling stops')

console.log('✓ memo widget interaction checks passed')
