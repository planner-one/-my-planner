import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const ROOT = process.cwd()

const read = filePath => fs.readFileSync(path.join(ROOT, filePath), 'utf8')

const fail = message => {
  console.error(`✗ ${message}`)
  process.exitCode = 1
}

const ok = message => {
  console.log(`✓ ${message}`)
}

const unique = values => [...new Set(values)]

const normalizeName = value => value.replace(/\s+/g, '')

const expectSingle = (label, value) => {
  if (!value) {
    fail(`${label} 값을 찾지 못했습니다.`)
    return ''
  }
  return value
}

const extractQuotedIds = block =>
  [...block.matchAll(/'([^']+)'/g)].map(match => match[1])

const extractTypeUnion = (source, typeName) => {
  const match = source.match(new RegExp(`type\\s+${typeName}\\s*=([\\s\\S]*?)(?:\\n\\n|\\n(?:interface|const|function|export))`))
  return match ? extractQuotedIds(match[1]) : []
}

const extractObjectKeys = (source, constName) => {
  const match = source.match(new RegExp(`const\\s+${constName}[\\s\\S]*?=\\s*\\{([\\s\\S]*?)\\n\\}`))
  return match ? [...match[1].matchAll(/^\s*([A-Za-z][\w]*)\s*:/gm)].map(item => item[1]) : []
}

const describeTsNode = (sourceFile, node) => {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  return `${ts.SyntaxKind[node.kind]} at ${sourceFile.fileName}:${line + 1}:${character + 1}`
}

const navItemsError = (sourceFile, node, message) =>
  new Error(`PageShell NAV_ITEMS ${describeTsNode(sourceFile, node)}: ${message}`)

const getStaticPropertyName = property => {
  const name = property.name
  return name && (ts.isIdentifier(name) || ts.isStringLiteral(name)) ? name.text : null
}

const extractPageShellNavIds = source => {
  const sourceFile = ts.createSourceFile(
    'PageShell.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  let parsedItems = null

  const visit = node => {
    if (parsedItems !== null) return
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === 'NAV_ITEMS'
    ) {
      if (!node.initializer || !ts.isArrayLiteralExpression(node.initializer)) {
        throw navItemsError(
          sourceFile,
          node.initializer ?? node,
          'initializer must be a direct ArrayLiteralExpression',
        )
      }
      parsedItems = node.initializer.elements.map((element, index) => {
        if (!ts.isObjectLiteralExpression(element)) {
          throw navItemsError(
            sourceFile,
            element,
            `element ${index + 1} must be a direct ObjectLiteralExpression`,
          )
        }

        element.properties.forEach(property => {
          if (ts.isSpreadAssignment(property)) {
            throw navItemsError(sourceFile, property, 'object spread is not supported')
          }
          if (property.name && ts.isComputedPropertyName(property.name)) {
            throw navItemsError(sourceFile, property.name, 'computed properties are not supported')
          }
        })

        const idProperties = element.properties.filter(property =>
          getStaticPropertyName(property) === 'id',
        )
        if (idProperties.length === 0) {
          throw navItemsError(
            sourceFile,
            element,
            `element ${index + 1} is missing a direct id property`,
          )
        }
        if (idProperties.length > 1) {
          throw navItemsError(
            sourceFile,
            idProperties[1],
            `element ${index + 1} has duplicate direct id properties`,
          )
        }

        const idProperty = idProperties[0]
        if (!ts.isPropertyAssignment(idProperty)) {
          throw navItemsError(
            sourceFile,
            idProperty,
            `element ${index + 1} id must be a non-computed PropertyAssignment`,
          )
        }
        if (!ts.isStringLiteral(idProperty.initializer)) {
          throw navItemsError(
            sourceFile,
            idProperty.initializer,
            `element ${index + 1} id value must be a string literal`,
          )
        }
        return { id: idProperty.initializer.text, idProperty }
      })
      return
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  const items = parsedItems ?? []
  const seenIds = new Set()
  for (const item of items) {
    if (seenIds.has(item.id)) {
      throw navItemsError(sourceFile, item.idProperty, `중복 id: ${item.id}`)
    }
    seenIds.add(item.id)
  }
  return items.map(item => item.id)
}

const commentFixture = `
const NAV_ITEMS: NavItem[] = [
  // { id: 'comment-only', label: '주석 항목' },
  /* { id: 'block-comment-only', label: '블록 주석 항목' }, */
  { id: 'dashboard', label: '홈' },
]

const MOBILE_NAVIGATION_OPTIONS = []
`
const semicolonFixture = `
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: '홈' },
];
`
const duplicateFixture = `
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: '홈' },
  { id: 'dashboard', label: '중복 홈' },
]

const MOBILE_NAVIGATION_OPTIONS = []
`
const unsupportedNavFixtures = [
  {
    label: 'array spread',
    source: `
const extraItems = [{ id: 'ghost', label: '숨은 항목' }]
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: '홈' },
  ...extraItems,
]
`,
    error: /SpreadElement.*PageShell\.tsx:\d+:\d+/,
  },
  {
    label: 'object spread after id',
    source: `
const override = { id: 'ghost' }
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: '홈', ...override },
]
`,
    error: /SpreadAssignment.*PageShell\.tsx:\d+:\d+/,
  },
  {
    label: 'object spread before id',
    source: `
const override = { id: 'ghost' }
const NAV_ITEMS: NavItem[] = [
  { ...override, id: 'dashboard', label: '홈' },
]
`,
    error: /SpreadAssignment.*PageShell\.tsx:\d+:\d+/,
  },
  {
    label: 'computed id',
    source: `
const NAV_ITEMS: NavItem[] = [
  { ['id']: 'dashboard', label: '홈' },
]
`,
    error: /ComputedPropertyName.*PageShell\.tsx:\d+:\d+/,
  },
  {
    label: 'shorthand id',
    source: `
const id = 'dashboard'
const NAV_ITEMS: NavItem[] = [
  { id, label: '홈' },
]
`,
    error: /ShorthandPropertyAssignment.*PageShell\.tsx:\d+:\d+/,
  },
  {
    label: 'method id',
    source: `
const NAV_ITEMS: NavItem[] = [
  { id() { return 'dashboard' }, label: '홈' },
]
`,
    error: /MethodDeclaration.*PageShell\.tsx:\d+:\d+/,
  },
  {
    label: 'getter id',
    source: `
const NAV_ITEMS: NavItem[] = [
  { get id() { return 'dashboard' }, label: '홈' },
]
`,
    error: /GetAccessor.*PageShell\.tsx:\d+:\d+/,
  },
  {
    label: 'non-string id',
    source: `
const pageId = 'dashboard'
const NAV_ITEMS: NavItem[] = [
  { id: pageId, label: '홈' },
]
`,
    error: /Identifier.*PageShell\.tsx:\d+:\d+/,
  },
  {
    label: 'missing id',
    source: `
const NAV_ITEMS: NavItem[] = [
  { label: '홈' },
]
`,
    error: /ObjectLiteralExpression.*PageShell\.tsx:\d+:\d+/,
  },
  {
    label: 'duplicate direct id',
    source: `
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', id: 'ghost', label: '홈' },
]
`,
    error: /PropertyAssignment.*PageShell\.tsx:\d+:\d+/,
  },
]

assert.deepEqual(
  extractPageShellNavIds(commentFixture),
  ['dashboard'],
  'PageShell NAV_ITEMS parser should ignore commented-out objects',
)
assert.deepEqual(
  extractPageShellNavIds(semicolonFixture),
  ['dashboard'],
  'PageShell NAV_ITEMS parser should accept an array followed by a semicolon',
)
assert.throws(
  () => extractPageShellNavIds(duplicateFixture),
  /중복.*dashboard/,
  'PageShell NAV_ITEMS parser should fail explicitly on duplicate ids',
)
unsupportedNavFixtures.forEach(({ label, source, error }) => {
  assert.throws(
    () => extractPageShellNavIds(source),
    error,
    `PageShell NAV_ITEMS parser should reject ${label} with source kind and location`,
  )
})
ok('PageShell NAV_ITEMS AST parser fixture 통과')

const extractDocPageIds = source =>
  [...source.matchAll(/^\|\s*R-P\d+\s*\|\s*`([^`]+)`\s*\|/gm)].map(match => match[1])

const extractScenarioPageIds = source => {
  const section = source.match(/- \*\*현재 page id\*\*:[\s\S]*?(?=\n- \*\*완료 기준\*\*:)/)
  return section ? unique([...section[0].matchAll(/`([^`]+)`/g)].map(match => match[1])) : []
}

const extractProgressPageIds = source => {
  const section = source.match(/## SC-08 페이지 진행[\s\S]*?\| page id \| 페이지 \| 상태 \| 메모 \|[\s\S]*?(?=\n다음 작업:)/)
  return section ? [...section[0].matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map(match => match[1]) : []
}

const extractWidgetMeta = () => {
  const widgetDir = path.join(ROOT, 'src/widgets')
  return fs.readdirSync(widgetDir)
    .filter(file => file.endsWith('.tsx') && file !== 'index.ts')
    .map(file => {
      const source = fs.readFileSync(path.join(widgetDir, file), 'utf8')
      const metaBlock = source.match(/export const meta = \{([\s\S]*?)\n\}/)
      if (!metaBlock) return null
      const id = metaBlock[1].match(/id:\s*'([^']+)'/)?.[1]
      const name = metaBlock[1].match(/name:\s*'([^']+)'/)?.[1]
      return id && name ? { id, name } : null
    })
    .filter(Boolean)
}

const extractScenarioWidgetNames = source => {
  const section = source.match(/### SC-07:[\s\S]*?\*\*현재 등록 위젯\*\*:[\s\S]*?(?=\n-\s\*\*정리된 위젯\*\*:)/)
  return section ? [...section[0].matchAll(/^\s*\d+\.\s+(.+)$/gm)].map(match => match[1].trim()) : []
}

const extractRequirementWidgetNames = source =>
  [...source.matchAll(/^\|\s*R-W\d+\s*\|\s*([^|]+?)\s*\|/gm)].map(match => match[1].trim())

const compareSets = (label, expected, actual) => {
  const expectedSet = unique(expected)
  const actualSet = unique(actual)
  const missing = expectedSet.filter(item => !actualSet.includes(item))
  const extra = actualSet.filter(item => !expectedSet.includes(item))

  if (missing.length || extra.length) {
    fail(`${label} 불일치\n  missing: ${missing.join(', ') || '-'}\n  extra: ${extra.join(', ') || '-'}`)
    return
  }

  ok(`${label} 일치 (${expectedSet.length}개)`)
}

const compareVersionText = (label, source, expectedVersion, expectedName, expectedDate) => {
  const versionOk = source.includes(`v${expectedVersion}`)
  const nameOk = expectedName ? source.includes(expectedName) : true
  const dateOk = expectedDate ? source.includes(expectedDate) : true

  if (!versionOk || !nameOk || !dateOk) {
    fail(`${label} 버전 기준이 최신 값과 다릅니다.`)
    return
  }

  ok(`${label} 버전 기준 일치`)
}

const packageJson = JSON.parse(read('package.json'))
const versionSource = read('src/version.ts')
const releasesSource = read('RELEASES.md')
const updateScheduleSource = read('UPDATE_SCHEDULE.md')
const requirementsSource = read('REQUIREMENTS.md')
const scenariosSource = read('SCENARIOS.md')
const progressSource = read('PROGRESS.md')
const appSource = read('src/App.tsx')
const routerSource = read('src/store/RouterContext.tsx')
const pageShellSource = read('src/components/PageShell.tsx')
const menuWidgetSource = read('src/widgets/MenuWidget.tsx')

const appVersion = expectSingle('APP_VERSION', versionSource.match(/APP_VERSION = '([^']+)'/)?.[1])
const releaseName = expectSingle('APP_RELEASE_NAME', versionSource.match(/APP_RELEASE_NAME = '([^']+)'/)?.[1])
const releaseDate = expectSingle('APP_RELEASE_DATE', versionSource.match(/APP_RELEASE_DATE = '([^']+)'/)?.[1])

if (packageJson.version !== appVersion) {
  fail(`package.json version(${packageJson.version})과 src/version.ts(${appVersion})가 다릅니다.`)
} else {
  ok(`package.json version과 src/version.ts 일치 (${appVersion})`)
}

compareVersionText('RELEASES.md', releasesSource, appVersion, releaseName, releaseDate)
compareVersionText('UPDATE_SCHEDULE.md', updateScheduleSource, appVersion, releaseName, '')

const appPages = extractObjectKeys(appSource, 'PAGE_MAP')
const routerPages = extractTypeUnion(routerSource, 'PageId')
const pageShellPages = extractPageShellNavIds(pageShellSource)
const menuPages = [...menuWidgetSource.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*icon:/g)].map(match => match[1])
const requirementPages = extractDocPageIds(requirementsSource)
const scenarioPages = extractScenarioPageIds(scenariosSource)
const progressPages = extractProgressPageIds(progressSource)

compareSets('App.tsx ↔ RouterContext page id', appPages, routerPages)
compareSets('App.tsx ↔ PageShell page id', appPages, pageShellPages)
compareSets('App.tsx ↔ MenuWidget page id', appPages, menuPages)
compareSets('App.tsx ↔ REQUIREMENTS.md page id', appPages, requirementPages)
compareSets('App.tsx ↔ SCENARIOS.md page id', appPages, scenarioPages)
compareSets('App.tsx ↔ PROGRESS.md page id', appPages, progressPages)

const widgetMeta = extractWidgetMeta()
const widgetNames = widgetMeta.map(item => normalizeName(item.name))
const requirementWidgetNames = extractRequirementWidgetNames(requirementsSource).map(normalizeName)
const scenarioWidgetNames = extractScenarioWidgetNames(scenariosSource).map(normalizeName)

if (widgetMeta.length === 0) {
  fail('위젯 메타 정보를 읽지 못했습니다.')
} else {
  ok(`위젯 메타 ${widgetMeta.length}개 확인`)
}

compareSets('위젯 이름 ↔ REQUIREMENTS.md', widgetNames, requirementWidgetNames)
compareSets('위젯 이름 ↔ SCENARIOS.md', widgetNames, scenarioWidgetNames)

if (process.exitCode) {
  process.exit(process.exitCode)
}

ok('문서/코드 동기화 점검 통과')
