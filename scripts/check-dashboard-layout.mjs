import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import ts from 'typescript'

const repoRoot = path.resolve(import.meta.dirname, '..')
const sourcePath = path.join(repoRoot, 'src/utils/dashboardLayout.ts')
const tempDir = path.join(os.tmpdir(), 'planner-dashboard-layout-check')
const tempModulePath = path.join(tempDir, 'dashboardLayout.mjs')
const source = await readFile(sourcePath, 'utf8')
const [
  dashboardEditorSource,
  dashboardPageSource,
  dashboardGridCanvasSource,
  dashboardWidgetCardSource,
  appContextSource,
] = await Promise.all([
  readFile(path.join(repoRoot, 'src/pages/DashboardEditor.tsx'), 'utf8'),
  readFile(path.join(repoRoot, 'src/pages/Dashboard.tsx'), 'utf8'),
  readFile(path.join(repoRoot, 'src/components/DashboardGridCanvas.tsx'), 'utf8'),
  readFile(path.join(repoRoot, 'src/components/DashboardWidgetCard.tsx'), 'utf8'),
  readFile(path.join(repoRoot, 'src/store/AppContext.tsx'), 'utf8'),
])
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
  DASHBOARD_GRID_COLUMNS,
  DASHBOARD_GRID_GAP,
  DASHBOARD_GRID_ROW_HEIGHT,
  LEGACY_DASHBOARD_GRID_GAP,
  LEGACY_DASHBOARD_ROW_HEIGHT,
  createDashboardConfigFromLegacy,
  dashboardItemsOverlap,
  deriveTabletDashboardLayout,
  getDashboardCollisions,
  getDashboardViewportMode,
  hasDashboardOverlap,
  mergeDashboardConfigs,
  migrateLegacyDesktopLayout,
  moveDashboardMobileItem,
  normalizeDashboardConfig,
  normalizeDashboardLayout,
  normalizeDashboardMobile,
  projectDashboardPushDown,
} = await import(`${tempModulePath}?t=${Date.now()}`)

assert.deepEqual(DASHBOARD_GRID_COLUMNS, { desktop: 48, tablet: 24 })
assert.equal(getDashboardViewportMode(0), 'phone')
assert.equal(getDashboardViewportMode(767), 'phone')
assert.equal(getDashboardViewportMode(768), 'tablet')
assert.equal(getDashboardViewportMode(1199), 'tablet')
assert.equal(getDashboardViewportMode(1200), 'desktop')

assert.deepEqual(
  normalizeDashboardLayout([
    { i: 'wide', x: 47, y: -5, w: 9, h: 2, minW: 10, minH: 3 },
    { i: 'wide', x: 0, y: 10, w: 1, h: 1 },
    { i: 'narrow', x: 4.8, y: 2.9, w: 0, h: 0 },
    { i: '', x: 0, y: 0, w: 1, h: 1 },
    null,
  ], 'desktop'),
  [
    { i: 'wide', x: 38, y: 0, w: 10, h: 3, minW: 10, minH: 3 },
    { i: 'narrow', x: 4, y: 2, w: 1, h: 1 },
  ],
)
assert.deepEqual(
  normalizeDashboardLayout([
    { i: 'tablet-edge', x: 23, y: 1, w: 8, h: 2 },
  ], 'tablet'),
  [{ i: 'tablet-edge', x: 16, y: 1, w: 8, h: 2 }],
)

const legacyLayout = [{
  i: 'memo-1',
  x: 7,
  y: 3,
  w: 12,
  h: 5,
  minW: 8,
  minH: 4,
}]
const migratedLayout = migrateLegacyDesktopLayout(legacyLayout)
assert.deepEqual(migratedLayout, [{
  i: 'memo-1',
  x: 7,
  y: 6,
  w: 12,
  h: 10,
  minW: 8,
  minH: 8,
}])

const gridPixelTop = (item, rowHeight, gap) => item.y * (rowHeight + gap)
const gridPixelHeight = (item, rowHeight, gap) =>
  item.h * rowHeight + (item.h - 1) * gap
assert.equal(
  gridPixelTop(legacyLayout[0], LEGACY_DASHBOARD_ROW_HEIGHT, LEGACY_DASHBOARD_GRID_GAP),
  gridPixelTop(migratedLayout[0], DASHBOARD_GRID_ROW_HEIGHT, DASHBOARD_GRID_GAP),
  'legacy migration should preserve the exact rendered top pixel',
)
assert.equal(
  gridPixelHeight(legacyLayout[0], LEGACY_DASHBOARD_ROW_HEIGHT, LEGACY_DASHBOARD_GRID_GAP),
  gridPixelHeight(migratedLayout[0], DASHBOARD_GRID_ROW_HEIGHT, DASHBOARD_GRID_GAP),
  'legacy migration should preserve the exact rendered height',
)

const legacyConfig = createDashboardConfigFromLegacy(
  ['memo-1', 'memo-1'],
  legacyLayout,
  '2026-07-28T09:00:00.000Z',
)
assert.equal(legacyConfig.configVersion, 1)
assert.deepEqual(legacyConfig.activeIds, ['memo-1'])
assert.equal(legacyConfig.desktop.gridVersion, 2)
assert.deepEqual(legacyConfig.desktop.layout, migratedLayout)
assert.equal(legacyConfig.desktop.updatedAt, '2026-07-28T09:00:00.000Z')
assert.deepEqual(
  normalizeDashboardConfig(
    undefined,
    ['memo-1'],
    legacyLayout,
    '2026-07-28T09:00:00.000Z',
  ),
  legacyConfig,
)
assert.deepEqual(
  normalizeDashboardConfig({
    configVersion: 1,
    activeIds: ['memo-1'],
    activeUpdatedAt: '2026-07-28T09:01:00.000Z',
    desktop: {
      gridVersion: 1,
      layout: legacyLayout,
      updatedAt: '2026-07-28T09:01:00.000Z',
    },
  }).desktop.layout,
  migratedLayout,
  'an explicitly versioned desktop v1 profile should be migrated',
)

const tabletLayout = deriveTabletDashboardLayout([
  { i: 'first', x: 0, y: 0, w: 16, h: 4, minW: 8, minH: 2 },
  { i: 'second', x: 0, y: 0, w: 16, h: 4, minW: 8, minH: 2 },
  { i: 'third', x: 0, y: 0, w: 32, h: 4, minW: 12, minH: 2 },
  { i: 'edge', x: 40, y: 0, w: 8, h: 4 },
])
const tabletById = Object.fromEntries(tabletLayout.map(item => [item.i, item]))
assert.deepEqual(tabletById.first, {
  i: 'first',
  x: 0,
  y: 0,
  w: 8,
  h: 4,
  minW: 4,
  minH: 2,
})
assert.equal(tabletById.second.x, 8, 'same-row placement should use the nearest free x')
assert.equal(tabletById.second.y, 0)
assert.equal(tabletById.third.y, 4, 'a full collision row should move downward')
assert.ok(
  tabletLayout.every(item => item.x >= 0 && item.x + item.w <= 24),
  'derived tablet items should stay inside 24 columns',
)
assert.equal(hasDashboardOverlap(tabletLayout), false)
assert.deepEqual(
  deriveTabletDashboardLayout([
    { i: 'first', x: 0, y: 0, w: 16, h: 4, minW: 8, minH: 2 },
    { i: 'second', x: 0, y: 0, w: 16, h: 4, minW: 8, minH: 2 },
    { i: 'third', x: 0, y: 0, w: 32, h: 4, minW: 12, minH: 2 },
    { i: 'edge', x: 40, y: 0, w: 8, h: 4 },
  ]),
  tabletLayout,
  'tablet derivation should be deterministic',
)

const registeredMinimumWidths = new Map([
  ['registered-first', 9],
  ['registered-second', 10],
  ['registered-third', 7],
])
const resolvedTabletLayout = deriveTabletDashboardLayout([
  { i: 'registered-first', x: 0, y: 0, w: 8, h: 4 },
  { i: 'registered-second', x: 8, y: 0, w: 8, h: 4 },
  { i: 'registered-third', x: 16, y: 0, w: 8, h: 4 },
], instanceId => registeredMinimumWidths.get(instanceId))
const resolvedTabletById = Object.fromEntries(
  resolvedTabletLayout.map(item => [item.i, item]),
)
registeredMinimumWidths.forEach((minimumWidth, instanceId) => {
  assert.equal(
    resolvedTabletById[instanceId].minW,
    minimumWidth,
    `registered tablet minW should override the generic scaled minimum for ${instanceId}`,
  )
  assert.ok(
    resolvedTabletById[instanceId].w >= minimumWidth,
    `derived tablet width should honor the registered minimum for ${instanceId}`,
  )
})
assert.equal(
  hasDashboardOverlap(resolvedTabletLayout),
  false,
  'registered tablet minimum widths should still produce a collision-free layout',
)

const overlapA = { i: 'a', x: 0, y: 0, w: 4, h: 4 }
const overlapB = { i: 'b', x: 3, y: 3, w: 4, h: 4 }
const touching = { i: 'touching', x: 4, y: 0, w: 3, h: 4 }
assert.equal(dashboardItemsOverlap(overlapA, overlapB), true)
assert.equal(dashboardItemsOverlap(overlapA, touching), false)
assert.deepEqual(getDashboardCollisions([overlapA, overlapB, touching], overlapA), [overlapB])
assert.equal(hasDashboardOverlap([overlapA, overlapB, touching]), true)
assert.equal(hasDashboardOverlap([overlapA, touching]), false)

const pushSource = [
  { i: 'moving', x: 0, y: 0, w: 4, h: 2 },
  { i: 'first-hit', x: 0, y: 2, w: 4, h: 2 },
  { i: 'second-hit', x: 0, y: 2, w: 4, h: 2 },
  { i: 'side', x: 8, y: 2, w: 4, h: 2 },
]
const projected = projectDashboardPushDown(
  pushSource,
  { i: 'moving', x: 0, y: 2, w: 4, h: 2 },
)
const projectedById = Object.fromEntries(projected.map(item => [item.i, item]))
assert.equal(projectedById.moving.y, 2)
assert.equal(projectedById['first-hit'].y, 4)
assert.equal(projectedById['second-hit'].y, 6)
assert.equal(projectedById.side.y, 2)
assert.equal(hasDashboardOverlap(projected), false)
assert.deepEqual(
  projectDashboardPushDown(
    pushSource,
    { i: 'moving', x: 0, y: 2, w: 4, h: 2 },
  ),
  projected,
  'push-down projection should be deterministic',
)

assert.deepEqual(
  normalizeDashboardMobile({
    order: ['third', 'stale', 'third', 'first'],
    hidden: ['stale', 'second', 'second', 'third'],
    updatedAt: '2026-07-28T09:10:00.000Z',
  }, ['first', 'second', 'third', 'new']),
  {
    order: ['third', 'first', 'second', 'new'],
    hidden: ['third', 'second'],
    updatedAt: '2026-07-28T09:10:00.000Z',
  },
  'stale and duplicate mobile ids should be removed and new ids appended visible',
)
assert.deepEqual(
  normalizeDashboardMobile({
    order: ['first', 'second'],
    hidden: ['first', 'second'],
  }, ['first', 'second']).hidden,
  ['first', 'second'],
  'hiding every phone widget should remain valid',
)
assert.deepEqual(
  moveDashboardMobileItem(['first', 'second', 'third'], 'second', 'up'),
  ['second', 'first', 'third'],
)
assert.deepEqual(
  moveDashboardMobileItem(['first', 'second', 'third'], 'third', 'down'),
  ['first', 'second', 'third'],
)

const remoteConfig = {
  configVersion: 1,
  activeIds: ['remote-active', 'shared'],
  activeUpdatedAt: '2026-07-28T09:20:00.000Z',
  desktop: {
    gridVersion: 2,
    layout: [{ i: 'remote-desktop', x: 0, y: 0, w: 8, h: 8 }],
    updatedAt: '2026-07-28T09:10:00.000Z',
  },
  tablet: {
    gridVersion: 2,
    layout: [{ i: 'remote-tablet', x: 0, y: 0, w: 8, h: 8 }],
    updatedAt: '2026-07-28T09:50:00.000Z',
  },
  mobile: {
    order: ['shared', 'remote-active'],
    hidden: ['remote-active'],
    updatedAt: '2026-07-28T09:30:00.000Z',
  },
}
const incomingConfig = {
  configVersion: 1,
  activeIds: ['shared', 'incoming-active'],
  activeUpdatedAt: '2026-07-28T09:40:00.000Z',
  desktop: {
    gridVersion: 2,
    layout: [{ i: 'incoming-desktop', x: 1, y: 1, w: 8, h: 8 }],
    updatedAt: '2026-07-28T09:45:00.000Z',
  },
  tablet: {
    gridVersion: 2,
    layout: [{ i: 'incoming-tablet', x: 1, y: 1, w: 8, h: 8 }],
    updatedAt: '2026-07-28T09:05:00.000Z',
  },
  mobile: {
    order: ['shared', 'stale'],
    hidden: ['shared', 'stale'],
    updatedAt: '2026-07-28T09:55:00.000Z',
  },
}
const merged = mergeDashboardConfigs(remoteConfig, incomingConfig)
assert.deepEqual(merged.activeIds, ['shared', 'incoming-active'])
assert.equal(merged.desktop.layout[0].i, 'incoming-desktop')
assert.equal(merged.tablet.layout[0].i, 'remote-tablet')
assert.deepEqual(merged.mobile, {
  order: ['shared', 'incoming-active'],
  hidden: ['shared'],
  updatedAt: '2026-07-28T09:55:00.000Z',
})

const equalTimestampMerge = mergeDashboardConfigs(
  remoteConfig,
  {
    ...incomingConfig,
    activeUpdatedAt: remoteConfig.activeUpdatedAt,
    desktop: {
      ...incomingConfig.desktop,
      updatedAt: remoteConfig.desktop.updatedAt,
    },
  },
)
assert.deepEqual(equalTimestampMerge.activeIds, remoteConfig.activeIds)
assert.equal(equalTimestampMerge.desktop.layout[0].i, 'remote-desktop')

assert.match(
  dashboardEditorSource,
  /const PUSH_DWELL_MS = 1000/,
  'overlap push-down should require an explicit one-second dwell',
)
assert.match(
  dashboardEditorSource,
  /window\.setTimeout\(\s*\(\) => armPushPreview\(preview\),\s*PUSH_DWELL_MS,\s*\)/,
  'the push-down preview should arm only after the shared dwell duration',
)
assert.match(
  dashboardEditorSource,
  /performance\.now\(\) - current\.startedAt >= PUSH_DWELL_MS/,
  'the drag loop should honor the same dwell threshold when a timer callback is delayed',
)
assert.match(
  dashboardEditorSource,
  /projectDashboardPushDown\(\s*interaction\.snapshot,\s*current\.candidate,\s*interaction\.mode,\s*\)/,
  'an armed overlap should project from the interaction snapshot rather than a transient RGL layout',
)
assert.match(
  dashboardEditorSource,
  /pushPreview\.armed \? '놓으면 자동 밀기' : '1초 유지'/,
  'the editor should expose visible feedback for the one-second push-down contract',
)

assert.match(
  dashboardGridCanvasSource,
  /compactType=\{null\}/,
  'the dashboard grid should preserve intentional empty cells',
)
assert.match(
  dashboardGridCanvasSource,
  /allowOverlap=\{false\}/,
  'the dashboard grid should never commit overlapping widgets',
)
assert.match(
  dashboardGridCanvasSource,
  /preventCollision=\{editable\}/,
  'editing should stop RGL from silently displacing widgets before dwell push-down',
)
assert.doesNotMatch(
  dashboardGridCanvasSource,
  /\bonLayoutChange=/,
  'dashboard persistence must remain on drag/resize completion, not onLayoutChange',
)
assert.match(
  dashboardGridCanvasSource,
  /const canInteract = editable && !interactionDisabled/,
  'saving should disable every RGL interaction through one shared guard',
)
assert.match(
  dashboardGridCanvasSource,
  /isDraggable=\{canInteract\}[\s\S]*isResizable=\{canInteract\}/,
  'the shared interaction guard should lock both dragging and resizing',
)
assert.match(
  dashboardGridCanvasSource,
  /resizeHandles=\{canInteract \? \['se', 'sw', 's', 'e', 'w'\] : \[\]\}/,
  'disabled interaction should also remove active resize handles',
)
assert.match(
  dashboardWidgetCardSource,
  /className="dashboard-remove-widget"[\s\S]*?disabled=\{interactionDisabled\}/,
  'saving should lock the widget remove action inside the grid card',
)
assert.match(
  dashboardEditorSource,
  /interactionDisabled=\{saving\}/,
  'the editor should pass its saving state into the shared grid lock',
)
assert.match(
  dashboardEditorSource,
  /setSaving\(true\)\s*setPickerOpen\(false\)/,
  'starting a save should close the widget picker before the request begins',
)
assert.match(
  dashboardEditorSource,
  /onClick=\{\(\) => setPickerOpen\(open => !open\)\}\s*disabled=\{isInteracting \|\| saving\}/,
  'the widget picker trigger should stay locked during interaction and save',
)
assert.match(
  dashboardEditorSource,
  /className="dashboard-widget-picker-item"[\s\S]*?disabled=\{isInteracting \|\| saving\}/,
  'widget picker actions should stay locked during interaction and save',
)
assert.match(
  dashboardEditorSource,
  /onClick=\{\(\) => moveMobileWidget\(instanceId, 'up'\)\}\s*disabled=\{saving \|\| index === 0\}/,
  'phone upward ordering should be locked while saving',
)
assert.match(
  dashboardEditorSource,
  /type="checkbox"\s*checked=\{visible\}\s*disabled=\{saving\}/,
  'phone visibility changes should be locked while saving',
)

assert.match(
  dashboardEditorSource,
  /const mobileProfile = normalizeDashboardMobile\(draft\.mobile, desktopOrder\)/,
  'the phone editor should reconcile saved order and visibility with active widgets',
)
assert.match(
  dashboardEditorSource,
  /order: moveDashboardMobileItem\(\s*mobileProfile\.order,\s*instanceId,\s*direction,\s*\)/,
  'the phone editor should update order through the shared bounded move helper',
)
assert.match(
  dashboardEditorSource,
  /if \(hidden\.has\(instanceId\)\) hidden\.delete\(instanceId\)\s*else hidden\.add\(instanceId\)/,
  'the phone editor should let each active widget be shown or hidden',
)
assert.match(
  dashboardEditorSource,
  /order: desktopOrder,\s*hidden: desktopOrder\.filter\(id => mobileProfile\.hidden\.includes\(id\)\)/,
  'resetting phone order should follow desktop position without losing visibility choices',
)
assert.match(
  dashboardPageSource,
  /const mobileProfile = normalizeDashboardMobile\(\s*dashboardConfig\.mobile,\s*desktopOrder,\s*\)/,
  'the phone dashboard should use the same normalized mobile profile as the editor',
)
assert.match(
  dashboardPageSource,
  /mobileProfile\.order\.filter\(id => !hiddenMobileIds\.has\(id\)\)/,
  'the phone dashboard should render saved order while excluding hidden widgets',
)

const editorSaveBlock = dashboardEditorSource.match(
  /const save = async \(\) => \{[\s\S]*?\n  \}\n\n  const getPixelRect/,
)?.[0]
assert.ok(editorSaveBlock, 'the dashboard editor save boundary should remain discoverable')
assert.match(
  editorSaveBlock,
  /await saveImmediately\(\{ dashboardConfig: next \}\)/,
  'dashboard edits should persist the versioned dashboardConfig',
)
assert.doesNotMatch(
  editorSaveBlock,
  /\bdashboard(?:Layout|Active)\b/,
  'dashboard edits must not mirror grid v2 data into legacy dashboard fields',
)
const editorAfterImmediateSave = editorSaveBlock.slice(
  editorSaveBlock.indexOf('await saveImmediately'),
)
assert.doesNotMatch(
  editorAfterImmediateSave,
  /\bsetDashboardConfig\s*\(/,
  'saveImmediately hydration must not be overwritten by a stale local dashboardConfig',
)

const cancelledInteractionBranches = [
  ...dashboardEditorSource.matchAll(
    /if \(interaction\.cancelled\) \{([\s\S]*?)\n    \}/g,
  ),
].map(match => match[1])
assert.equal(
  cancelledInteractionBranches.length,
  2,
  'drag and resize should each have an explicit cancellation branch',
)
cancelledInteractionBranches.forEach((branch, index) => {
  assert.doesNotMatch(
    branch,
    /\b(?:writeGridLayout|setDirty)\s*\(/,
    `cancel branch ${index + 1} must not write layout or dirty state`,
  )
  assert.match(
    branch,
    /setCanvasRevision\(revision => revision \+ 1\)/,
    `cancel branch ${index + 1} should remount the controlled canvas`,
  )
})
const forcedCancelBlock = dashboardEditorSource.match(
  /const forceCancelInteraction = useCallback\(\(\) => \{([\s\S]*?)\n  \}, \[/,
)?.[1]
assert.ok(forcedCancelBlock, 'the forced interaction cancel boundary should remain discoverable')
assert.doesNotMatch(
  forcedCancelBlock,
  /\b(?:writeGridLayout|setDirty)\s*\(/,
  'forced cancellation must not write layout or dirty state',
)
assert.match(
  forcedCancelBlock,
  /setCanvasRevision\(revision => revision \+ 1\)/,
  'forced cancellation fallback should remount the controlled canvas',
)
assert.match(
  dashboardEditorSource,
  /key=\{`\$\{gridMode\}-\$\{canvasRevision\}`\}/,
  'canvas revision changes should produce an actual grid remount',
)

const registeredTabletDerivation = dashboardGridCanvasSource.match(
  /export const deriveRegisteredTabletDashboardLayout = \([\s\S]*?\n\}/,
)?.[0]
assert.ok(
  registeredTabletDerivation,
  'the registered tablet derivation boundary should remain discoverable',
)
assert.match(
  registeredTabletDerivation,
  /WIDGET_MAP\[item\.i\.split\('-'\)\[0\]\][\s\S]*activeSet\.has\(item\.i\)/,
  'unknown and inactive ids must be filtered before tablet derivation',
)
assert.match(
  registeredTabletDerivation,
  /getDashboardWidgetGridSize\(widgetId, 'tablet'\)\?\.minW/,
  'tablet derivation should resolve the registered widget minimum width',
)

const gridLayoutBuilder = dashboardGridCanvasSource.match(
  /export const buildDashboardGridLayout = \([\s\S]*?\n\}\n\ninterface DashboardGridCanvasProps/,
)?.[0]
assert.ok(gridLayoutBuilder, 'the shared grid layout builder should remain discoverable')
assert.match(
  gridLayoutBuilder,
  /const visibleSource = sourceLayout\.filter\(item => activeSet\.has\(item\.i\)\)/,
  'inactive layout ids must be excluded before placement calculations',
)
assert.match(
  gridLayoutBuilder,
  /const bottom = visibleSource\.reduce\(/,
  'inactive layout ids must not move newly placed widgets downward',
)
assert.match(
  gridLayoutBuilder,
  /const size = getDashboardWidgetGridSize\(widgetId, mode\)\s*if \(!size\) return \[\]/,
  'unknown active ids must not produce grid rows',
)
assert.match(
  dashboardPageSource,
  /const validActiveIds = dashboardConfig\.activeIds\.filter\(\s*instanceId => WIDGET_MAP\[instanceId\.split\('-'\)\[0\]\],\s*\)/,
  'the rendered dashboard should remove unknown ids from every visible profile',
)
assert.match(
  dashboardPageSource,
  /\.filter\(\(\{ item \}\) => validActiveIds\.includes\(item\.i\)\)/,
  'inactive desktop items must not participate in phone order',
)
assert.match(
  dashboardPageSource,
  /deriveRegisteredTabletDashboardLayout\(\s*dashboardConfig\.desktop\.layout,\s*validActiveIds,\s*\)/,
  'tablet fallback should receive only registered active ids',
)
assert.match(
  dashboardEditorSource,
  /const validActiveIds = draft\.activeIds\.filter\(isRegisteredInstance\)[\s\S]*sortActiveByDesktopPosition\(\s*validActiveIds,/,
  'the editor phone order should be calculated from registered active ids only',
)
assert.match(
  dashboardEditorSource,
  /const visibleDesktop = current\.desktop\.layout\.filter\(\s*item => currentActiveSet\.has\(item\.i\),\s*\)[\s\S]*y: getBottomY\(visibleDesktop\)/,
  'inactive desktop items must not affect the bottom position of a new widget',
)
assert.match(
  dashboardEditorSource,
  /const visibleTablet = tabletBase\.filter\(\s*item => currentActiveSet\.has\(item\.i\),\s*\)[\s\S]*y: getBottomY\(visibleTablet\)/,
  'inactive tablet items must not affect the bottom position of a new widget',
)

const currentDataSnapshot = appContextSource.match(
  /currentDataRef\.current = sanitize\(\{[\s\S]*?\n    \}\)\n  \}\)/,
)?.[0]
assert.ok(currentDataSnapshot, 'the app save snapshot boundary should remain discoverable')
assert.match(
  currentDataSnapshot,
  /\bdashboardConfig,\s*\n/,
  'automatic app snapshots should include dashboardConfig',
)
assert.doesNotMatch(
  currentDataSnapshot,
  /\bdashboard(?:Layout|Active)\b/,
  'automatic app snapshots must not mirror grid v2 data into legacy dashboard fields',
)
assert.doesNotMatch(
  appContextSource,
  /overrides\.dashboardLayout\s*=\s*dashboardConfig\.desktop\.layout/,
  'migration compatibility may write legacy presets, but must not mirror a grid v2 profile',
)

console.log('✓ dashboard layout engine and UI persistence contracts passed')
