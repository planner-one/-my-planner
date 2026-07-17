import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import ts from 'typescript'

const repoRoot = path.resolve(import.meta.dirname, '..')
const readSource = filePath => readFile(path.join(repoRoot, filePath), 'utf8')

const [widgetSizeSource, widgetSizeUtilitySource, pageShellSource, quickAddSource, cssSource] = await Promise.all([
  readSource('src/hooks/useWidgetSize.ts'),
  readSource('src/utils/widgetSize.ts'),
  readSource('src/components/PageShell.tsx'),
  readSource('src/components/QuickAddModal.tsx'),
  readSource('src/index.css'),
])

const widgetSizeUtilityPath = path.join(repoRoot, 'src/utils/widgetSize.ts')
const tempDir = path.join(os.tmpdir(), 'planner-mobile-ux-check')
const tempModulePath = path.join(tempDir, 'widgetSize.mjs')
const transpiled = ts.transpileModule(widgetSizeUtilitySource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: widgetSizeUtilityPath,
})

await mkdir(tempDir, { recursive: true })
await writeFile(tempModulePath, transpiled.outputText, 'utf8')

const { measureWidgetBorderBox } = await import(`${tempModulePath}?t=${Date.now()}`)

const simulateContentBoxFeedback = outerWidth => {
  let compact = false
  const states = []
  for (let index = 0; index < 6; index += 1) {
    const horizontalPadding = compact ? 24 : 36
    const measuredWidth = outerWidth - horizontalPadding
    compact = measuredWidth > 0 && measuredWidth < 310
    states.push(compact)
  }
  return states
}

assert.equal(
  new Set(simulateContentBoxFeedback(340)).size,
  2,
  'the regression fixture should reproduce the compact padding feedback loop at 340px',
)

for (const outerWidth of [334, 340, 345]) {
  const borderBoxStates = Array.from({ length: 6 }, () => {
    const measured = measureWidgetBorderBox({ offsetWidth: outerWidth, offsetHeight: 280 })
    return measured.w > 0 && measured.w < 310
  })
  assert.equal(
    new Set(borderBoxStates).size,
    1,
    `${outerWidth}px border-box measurements should keep one responsive state`,
  )
}

assert.deepEqual(
  measureWidgetBorderBox({ offsetWidth: 340.4, offsetHeight: 280.6 }),
  { w: 340, h: 281 },
  'widget border-box measurements should keep the existing rounded integer contract',
)

assert.match(
  widgetSizeSource,
  /measureWidgetBorderBox\(el\)/,
  'the hook should use the executable border-box measurement helper',
)
assert.doesNotMatch(widgetSizeSource, /contentRect/, 'widget sizing should not observe padding-sensitive contentRect values')
assert.match(
  widgetSizeSource,
  /box:\s*['"]border-box['"]/,
  'ResizeObserver should observe border-box changes',
)
assert.match(
  widgetSizeSource,
  /previous\.w\s*===\s*next\.w[\s\S]*previous\.h\s*===\s*next\.h/,
  'unchanged widget sizes should reuse the previous state',
)

assert.match(pageShellSource, /className="app-main"/, 'the scrollable app content should expose a mobile CSS hook')
assert.match(
  pageShellSource,
  /className="mobile-account-actions"/,
  'the mobile menu should have a separate account action area',
)
assert.match(
  pageShellSource,
  /className="mobile-signout-btn"[\s\S]{0,180}onClick=\{handleSignOut\}[\s\S]{0,100}disabled=\{signingOut\}/,
  'the standalone mobile sign-out button should use the guarded save-and-sign-out flow',
)
assert.match(
  pageShellSource,
  /className="mobile-signout-btn"/,
  'the mobile menu should expose a standalone sign-out button',
)
assert.ok(
  pageShellSource.indexOf('className="mobile-account-actions"')
    > pageShellSource.indexOf('className="mobile-page-menu-grid"'),
  'the mobile account actions should follow the page navigation grid',
)
assert.ok(
  pageShellSource.indexOf('await saveNow()') < pageShellSource.indexOf('await signOut()'),
  'sign-out should save the current account data first',
)
assert.match(pageShellSource, /mobileMenuTriggerRef/, 'the mobile menu should restore focus to its trigger')
const mobileMenuTriggerTag = pageShellSource.match(
  /<button\s+[^>]*className="mobile-page-menu-trigger"[^>]*>/,
)?.[0] ?? ''
assert.match(
  mobileMenuTriggerTag,
  /ref=\{mobileMenuTriggerRef\}/,
  'focus should return to the actual mobile menu trigger',
)
assert.match(pageShellSource, /mobileMenuDialogRef/, 'the mobile menu should manage focus inside the dialog')
assert.match(pageShellSource, /event\.key === 'Escape'/, 'Escape should close the mobile menu')
assert.match(pageShellSource, /event\.key !== 'Tab'/, 'Tab focus should stay inside the mobile menu')

assert.match(cssSource, /\/\* 모바일 글쓰기 1차 최적화 \*\//, 'mobile writing rules should be documented in CSS')
const mobileWritingCss = cssSource.slice(cssSource.indexOf('/* 모바일 글쓰기 1차 최적화 */'))
assert.match(mobileWritingCss, /@media \(max-width:\s*767px\)/, 'writing improvements should be mobile-only')
assert.match(mobileWritingCss, /\.app-main\s*\{[\s\S]*padding:\s*12px/, 'mobile content should use the wider 12px gutter')
assert.match(mobileWritingCss, /\.link-modal/, 'portal-rendered link inputs should receive the mobile writing rules')
assert.match(mobileWritingCss, /\.onboarding-dialog/, 'portal-rendered onboarding inputs should receive the mobile writing rules')
assert.match(mobileWritingCss, /\.quick-add-modal/, 'portal-rendered quick-add inputs should receive the mobile writing rules')
assert.match(mobileWritingCss, /font-size:\s*16px\s*!important/, 'mobile writing controls should use a 16px font')
assert.match(mobileWritingCss, /min-height:\s*44px\s*!important/, 'mobile writing controls should have a 44px touch height')
assert.match(mobileWritingCss, /min-height:\s*96px\s*!important/, 'mobile textareas should provide useful writing space')
assert.match(mobileWritingCss, /safe-area-inset-bottom/, 'mobile navigation should respect the bottom safe area')
assert.match(quickAddSource, /className="quick-add-modal"/, 'quick-add portals should expose a mobile writing CSS hook')

console.log('✓ mobile widget stability and writing UX checks passed')
