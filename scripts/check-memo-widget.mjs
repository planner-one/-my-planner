import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

const repoRoot = path.resolve(import.meta.dirname, '..')
const readSource = relativePath => readFile(path.join(repoRoot, relativePath), 'utf8')

const [widget, modal, content, listUtils, notes] = await Promise.all([
  readSource('src/widgets/MemoWidget.tsx'),
  readSource('src/components/QuickMemoModal.tsx'),
  readSource('src/components/QuickMemoContent.tsx'),
  readSource('src/utils/quickMemo.ts'),
  readSource('src/pages/Notes.tsx'),
])

const transpiledListUtils = ts.transpileModule(listUtils, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: 'src/utils/quickMemo.ts',
})
const listUtilsModuleUrl = `data:text/javascript;base64,${Buffer.from(transpiledListUtils.outputText).toString('base64')}`
const {
  getQuickMemoListEdit,
  parseQuickMemoContent,
} = await import(listUtilsModuleUrl)

assert.match(widget, /useSyncExternalStore/, 'memo header and body should share manage mode')

const createActionIndex = widget.indexOf('aria-label="새 빠른 메모"')
const manageActionIndex = widget.indexOf('aria-label="빠른 메모 편집"')
const archiveActionIndex = widget.indexOf('보관함')
assert.ok(createActionIndex >= 0, 'memo header should expose a create button')
assert.ok(manageActionIndex > createActionIndex, 'create button should appear before the pencil button')
assert.ok(archiveActionIndex > manageActionIndex, 'archive button should appear after the pencil button')
assert.doesNotMatch(widget.slice(createActionIndex, archiveActionIndex), /→/, 'memo header should not render an arrow')
assert.match(widget, /aria-pressed=\{manageMode\}/, 'memo pencil should expose its pressed state')

assert.match(widget, /subscribeMemoCreate/, 'header create requests should reach the widget body')
assert.match(widget, /<QuickMemoModal/, 'memo creation and editing should use the modal')
assert.match(widget, /mode=\{editor\.mode\}/, 'the modal should distinguish create and edit modes')
assert.match(widget, /setQuickMemos\(previous => \[memo, \.\.\.previous\]\)/, 'new memos should be inserted first')
assert.match(widget, /\? \{ \.\.\.memo, content, updatedAt: now \}/, 'memo edits should update content and timestamp')

assert.match(widget, /\{activeMemos\.map\(memo => \(/, 'the widget should render every active memo')
assert.doesNotMatch(widget, /activeMemos\.slice\(/, 'the widget should not limit the list to four memos')
assert.doesNotMatch(widget, /placeholder="떠오른 내용을 바로 기록하세요"/, 'the widget body should not keep the old inline input')
assert.match(widget, /<QuickMemoContent content=\{memo\.content\} compact \/>/, 'rows should show compact structured previews')
assert.match(widget, /onClick=\{event => openEdit\(memo, event\.currentTarget\)\}/, 'clicking a row should open its memo')

assert.match(
  widget,
  /\{manageMode && \(\s*<span className="memo-widget-row-actions">/,
  'row actions should only render while manage mode is active',
)
assert.match(widget, /<MemoActionIcon type="edit" \/>/, 'manage mode should expose an edit icon')
assert.match(widget, /<MemoActionIcon type="delete" \/>/, 'manage mode should expose a delete icon')
assert.match(widget, /aria-label="빠른 메모 수정"/, 'the edit icon should remain accessible')
assert.match(widget, /aria-label="빠른 메모 완전히 삭제"/, 'the delete icon should remain accessible')
assert.match(
  widget,
  /window\.confirm\('이 빠른 메모를 완전히 삭제할까요\?'\)/,
  'permanent memo deletion should require confirmation',
)

assert.match(modal, /aria-modal="true"/, 'memo editor should be a modal dialog')
assert.match(modal, /maxLength=\{240\}/, 'memo editor should retain the 240 character limit')
assert.match(modal, /event\.nativeEvent\.isComposing/, 'list continuation should ignore IME composition')
assert.match(modal, /event\.shiftKey/, 'Shift+Enter should remain a normal line break')
assert.match(modal, /event\.key === 'Escape'/, 'Escape should close the memo modal')
assert.match(modal, /event\.key !== 'Tab'/, 'the memo modal should trap keyboard focus')
assert.match(modal, /focusTarget\?\.focus\(\)/, 'closing the modal should restore trigger focus')
assert.match(modal, /@media \(max-width: 767px\)/, 'the memo modal should include mobile layout rules')

assert.match(listUtils, /unorderedPattern = \/\^\(\\s\*\)-\\s/, 'dash-prefixed lines should be recognized')
assert.match(listUtils, /orderedPattern = \/\^\(\\s\*\)\(\\d\+\)\\\.\\s/, 'numbered lines should be recognized')
assert.match(listUtils, /Number\(ordered!\[2\]\) \+ 1/, 'numbered lists should continue with the next number')
assert.match(listUtils, /if \(!itemText\.trim\(\)\)/, 'an empty list item should end the list')
assert.match(content, /<ul key=\{blockIndex\}>/, 'dash lists should render as unordered lists')
assert.match(content, /<ol key=\{blockIndex\}/, 'numbered lists should render as ordered lists')

assert.deepEqual(
  getQuickMemoListEdit('- 첫 항목', 6, 6),
  { value: '- 첫 항목\n- ', cursor: 9 },
  'dash lists should continue with the next bullet',
)
assert.deepEqual(
  getQuickMemoListEdit('1. 첫 항목', 7, 7),
  { value: '1. 첫 항목\n2. ', cursor: 11 },
  'numbered lists should continue with the next number',
)
assert.deepEqual(
  getQuickMemoListEdit('- ', 2, 2),
  { value: '', cursor: 0 },
  'an empty bullet should end the list',
)
assert.deepEqual(
  parseQuickMemoContent('정리할 것\n\n- 지원서\n- 포트폴리오\n\n1. 검토\n2. 제출'),
  [
    { type: 'paragraph', lines: ['정리할 것', ''] },
    { type: 'unordered', items: ['지원서', '포트폴리오'] },
    { type: 'paragraph', lines: [''] },
    {
      type: 'ordered',
      items: [
        { number: 1, text: '검토' },
        { number: 2, text: '제출' },
      ],
    },
  ],
  'memo content should preserve paragraph, bullet, and numbered-list blocks',
)

assert.match(notes, /<textarea\s+className="memo-edit-input"/, 'archive memo editing should support multiple lines')
assert.match(notes, /handleMemoEditorKeyDown/, 'archive memo editing should share list continuation behavior')
assert.match(notes, /<QuickMemoContent content=\{memo\.content\} \/>/, 'archive memos should render structured content')

assert.match(widget, /memo-scroll-region/, 'memo list should expose a scrollbar styling hook')
assert.match(widget, /is-scrolling/, 'memo list should expose an active scrolling state')
assert.match(widget, /scrollbar-color:\s*transparent transparent/, 'memo scrollbar should be hidden by default')
assert.match(widget, /\.memo-scroll-region\.is-scrolling/, 'memo scrollbar should become visible while scrolling')
assert.match(widget, /setTimeout\([\s\S]*700\)/, 'memo scrollbar should hide shortly after scrolling stops')

console.log('✓ memo widget modal and list checks passed')
