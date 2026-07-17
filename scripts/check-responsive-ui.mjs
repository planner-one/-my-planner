import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import ts from 'typescript'

const repoRoot = path.resolve(import.meta.dirname, '..')
const sourcePath = path.join(repoRoot, 'src/utils/responsiveUi.ts')
const tempDir = path.join(os.tmpdir(), 'planner-responsive-ui-check')
const tempModulePath = path.join(tempDir, 'responsiveUi.mjs')
const readSource = filePath => readFile(path.join(repoRoot, filePath), 'utf8')
const readOptionalSource = async filePath => {
  try {
    return await readSource(filePath)
  } catch {
    return ''
  }
}

const [
  htmlSource,
  cssSource,
  pageShellSource,
  editorSource,
  appContextSource,
  profileSource,
  dashboardSource,
] = await Promise.all([
  readSource('index.html'),
  readSource('src/index.css'),
  readSource('src/components/PageShell.tsx'),
  readOptionalSource('src/components/MobileNavigationEditor.tsx'),
  readSource('src/store/AppContext.tsx'),
  readSource('src/pages/ProfilePage.tsx'),
  readSource('src/pages/Dashboard.tsx'),
])

let source = ''
try {
  source = await readFile(sourcePath, 'utf8')
} catch {
  assert.fail('responsive UI utility should exist')
}

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
  getViewportKind,
  moveMobileBottomTab,
  normalizeDisplayPreferences,
  normalizeMobileBottomTabs,
  normalizeNavigationPreferences,
  resolveDisplayScale,
} = await import(`${tempModulePath}?t=${Date.now()}`)

assert.deepEqual(normalizeMobileBottomTabs(undefined), ['calendar', 'tasks', 'career', 'profile'])
assert.deepEqual(
  normalizeMobileBottomTabs(['profile', 'profile', 'dashboard', 'unknown', 'notes']),
  ['profile', 'notes', 'calendar', 'tasks'],
)
assert.deepEqual(
  moveMobileBottomTab(['calendar', 'tasks', 'career', 'profile'], 'career', 'up'),
  ['calendar', 'career', 'tasks', 'profile'],
)

assert.equal(getViewportKind(390), 'phone')
assert.equal(getViewportKind(767), 'phone')
assert.equal(getViewportKind(768), 'tablet')
assert.equal(getViewportKind(1199), 'tablet')
assert.equal(getViewportKind(1200), 'desktop')

assert.equal(resolveDisplayScale({ viewportWidth: 767, densityMode: 'manual', manualScale: 110 }), 100)
assert.equal(resolveDisplayScale({ viewportWidth: 768, densityMode: 'auto', manualScale: 80 }), 100)
assert.equal(resolveDisplayScale({ viewportWidth: 1199, densityMode: 'manual', manualScale: 80 }), 100)
assert.equal(resolveDisplayScale({ viewportWidth: 1200, densityMode: 'auto', manualScale: 105 }), 90)
assert.equal(resolveDisplayScale({ viewportWidth: 1440, densityMode: 'manual', manualScale: 105 }), 105)
assert.equal(resolveDisplayScale({ viewportWidth: 1440, densityMode: 'manual', manualScale: 93 }), 95)
assert.equal(resolveDisplayScale({ viewportWidth: 1440, densityMode: 'manual', manualScale: -50 }), 80)
assert.equal(resolveDisplayScale({ viewportWidth: 1440, densityMode: 'manual', manualScale: 500 }), 110)

assert.deepEqual(
  normalizeNavigationPreferences({
    mobileBottomTabs: ['notes', 'dashboard', 'notes'],
    updatedAt: '2026-07-16T09:00:00.000Z',
  }),
  {
    mobileBottomTabs: ['notes', 'calendar', 'tasks', 'career'],
    updatedAt: '2026-07-16T09:00:00.000Z',
  },
)
assert.deepEqual(normalizeNavigationPreferences(null), {
  mobileBottomTabs: ['calendar', 'tasks', 'career', 'profile'],
  updatedAt: '',
})
assert.deepEqual(
  normalizeDisplayPreferences({ densityMode: 'manual', updatedAt: '2026-07-16T09:00:00.000Z' }),
  { densityMode: 'manual', updatedAt: '2026-07-16T09:00:00.000Z' },
)
assert.deepEqual(normalizeDisplayPreferences({ densityMode: 'compact', updatedAt: 123 }), {
  densityMode: 'auto',
  updatedAt: '',
})

assert.match(htmlSource, /width=device-width, initial-scale=1\.0, viewport-fit=cover/)
assert.match(cssSource, /--app-viewport-height:\s*100dvh\s*!important/)
assert.match(cssSource, /\.bottom-nav\s*\{[\s\S]*flex-shrink:\s*0/)
assert.match(pageShellSource, /normalizeMobileBottomTabs\(navigationPreferences\.mobileBottomTabs\)/)
assert.match(pageShellSource, /'dashboard',[\s\S]*mobileBottomTabs/)
assert.match(pageShellSource, /하단 메뉴 편집/)
assert.match(pageShellSource, /className="mobile-theme-trigger"/)
assert.match(pageShellSource, /aria-label="테마 선택 열기"/)
assert.match(pageShellSource, /mobilePanel === 'themes'/)
assert.match(pageShellSource, /className="mobile-theme-picker"/)
for (const label of ['라이트', '다크', '코랄', '블루']) {
  assert.match(pageShellSource, new RegExp(label))
}
assert.match(pageShellSource, /applyTheme\(option\.id\)/)
assert.match(pageShellSource, /aria-current=\{active \? 'true' : undefined\}/)
assert.match(pageShellSource, /active \? '✓' :/)
assert.match(pageShellSource, /const mobilePanelOpenerRef = useRef<HTMLButtonElement>\(null\)/)
assert.match(pageShellSource, /mobilePanelOpenerRef\.current = opener/)
assert.match(pageShellSource, /openMobilePanel\('themes', event\.currentTarget\)/)
assert.match(pageShellSource, /openMobilePanel\('pages', event\.currentTarget\)/)
assert.match(
  pageShellSource,
  /if \(mobilePanel !== null\) return[\s\S]*mobilePanelOpenerRef\.current\?\.focus\(\)/,
)
assert.match(editorSource, /className="mobile-navigation-editor"/)
assert.match(editorSource, /위로/)
assert.match(editorSource, /아래로/)
assert.match(editorSource, /초기화/)
assert.match(editorSource, /먼저 하나를 제거/)
assert.match(editorSource, /role="status"/)
assert.match(editorSource, /role="alert"/)
assert.match(editorSource, /disabled=\{saving \|\| !selectionComplete\}/)

assert.match(profileSource, /자동\(권장\)/)
assert.match(profileSource, /직접 설정/)
assert.match(profileSource, /resolveDisplayScale/)
assert.match(profileSource, /터치와 글자 가독성을 위해 100%/)
assert.match(profileSource, /window\.addEventListener\('resize'/)
assert.match(profileSource, /window\.removeEventListener\('resize'/)
assert.match(profileSource, /saveImmediately\(\{ displayPreferences: nextDisplayPreferences \}\)/)
assert.match(profileSource, /const changeManualScale = \(nextScale: number\) =>/)
assert.match(
  profileSource,
  /densityMode:\s*'manual' as const,[\s\S]*setUiScale\(value\)[\s\S]*setDisplayPreferences\(nextDisplayPreferences\)[\s\S]*saveWithOverrides\(\{[\s\S]*uiScale:\s*value,[\s\S]*displayPreferences:\s*nextDisplayPreferences/,
)
assert.match(
  profileSource,
  /onChange=\{event => changeManualScale\(Number\(event\.target\.value\)\)\}/,
)
assert.match(profileSource, /viewportKind === 'desktop'[\s\S]*displayPreferences\.densityMode === 'manual'/)
assert.match(profileSource, /disabled=\{!manualScaleEnabled \|\| densitySaving\}/)
assert.match(profileSource, /role="alert"/)
assert.match(appContextSource, /displayPreferences\.densityMode/)
assert.match(appContextSource, /resolveDisplayScale/)
assert.match(appContextSource, /viewportWidth:\s*1200/)
assert.match(appContextSource, /--app-viewport-height', `\$\{100 \/ scale\}dvh`/)
assert.match(dashboardSource, /densityMode:\s*'manual'/)
assert.match(dashboardSource, /resolveDisplayScale/)
assert.match(dashboardSource, /uiScale:\s*value,[\s\S]*displayPreferences:\s*nextDisplayPreferences/)
assert.match(dashboardSource, /자동 90%/)
assert.match(
  cssSource,
  /@media \(max-width:\s*1199px\)\s*\{\s*:root\s*\{[\s\S]*?--app-scale:\s*1\s*!important;[\s\S]*?--app-viewport-height:\s*100dvh\s*!important;/,
)
assert.doesNotMatch(`${appContextSource}\n${profileSource}\n${dashboardSource}`, /navigator\.userAgent|userAgent/)

console.log('✓ responsive mobile navigation and density checks passed')
