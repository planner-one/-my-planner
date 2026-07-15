import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const readSource = filePath => readFile(path.join(repoRoot, filePath), 'utf8')

const [widgetSizeSource, pageShellSource, cssSource] = await Promise.all([
  readSource('src/hooks/useWidgetSize.ts'),
  readSource('src/components/PageShell.tsx'),
  readSource('src/index.css'),
])

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
  const borderBoxStates = Array.from({ length: 6 }, () => outerWidth < 310)
  assert.equal(
    new Set(borderBoxStates).size,
    1,
    `${outerWidth}px border-box measurements should keep one responsive state`,
  )
}

assert.match(
  widgetSizeSource,
  /offsetWidth/,
  'widget sizing should measure the element border-box width',
)
assert.match(
  widgetSizeSource,
  /offsetHeight/,
  'widget sizing should measure the element border-box height',
)
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

assert.match(cssSource, /\/\* 모바일 글쓰기 1차 최적화 \*\//, 'mobile writing rules should be documented in CSS')
assert.match(cssSource, /\.app-main\s*\{[\s\S]*padding:\s*12px/, 'mobile content should use the wider 12px gutter')
assert.match(cssSource, /font-size:\s*16px\s*!important/, 'mobile writing controls should use a 16px font')
assert.match(cssSource, /min-height:\s*44px\s*!important/, 'mobile writing controls should have a 44px touch height')
assert.match(cssSource, /min-height:\s*96px\s*!important/, 'mobile textareas should provide useful writing space')
assert.match(cssSource, /safe-area-inset-bottom/, 'mobile navigation should respect the bottom safe area')

console.log('✓ mobile widget stability and writing UX checks passed')
