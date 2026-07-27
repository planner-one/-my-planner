import type {
  DashboardConfig,
  DashboardGridMode,
  DashboardGridProfile,
  DashboardMobileProfile,
  DashboardViewportMode,
  LayoutItem,
} from '../types'

export const DASHBOARD_CONFIG_VERSION = 1 as const
export const DASHBOARD_GRID_VERSION = 2 as const
export const DASHBOARD_GRID_COLUMNS: Record<DashboardGridMode, number> = {
  desktop: 48,
  tablet: 24,
}
export const DASHBOARD_GRID_ROW_HEIGHT = 16
export const DASHBOARD_GRID_GAP = 8
export const LEGACY_DASHBOARD_ROW_HEIGHT = 40
export const LEGACY_DASHBOARD_GRID_GAP = 8

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toInteger = (value: unknown, fallback: number, minimum: number): number => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(minimum, Math.floor(number))
}

const toTimestamp = (value: unknown): string =>
  typeof value === 'string' ? value : ''

const uniqueIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  const ids: string[] = []
  value.forEach(item => {
    if (typeof item !== 'string') return
    const id = item.trim()
    if (id && !ids.includes(id)) ids.push(id)
  })
  return ids
}

const normalizeLayoutItem = (
  value: unknown,
  columns: number,
): LayoutItem | null => {
  if (!isRecord(value) || typeof value.i !== 'string' || !value.i.trim()) {
    return null
  }

  const i = value.i.trim()
  const normalizedMinW = value.minW === undefined
    ? undefined
    : Math.min(columns, toInteger(value.minW, 1, 1))
  const normalizedMinH = value.minH === undefined
    ? undefined
    : toInteger(value.minH, 1, 1)
  const w = Math.min(
    columns,
    Math.max(toInteger(value.w, 1, 1), normalizedMinW ?? 1),
  )
  const h = Math.max(toInteger(value.h, 1, 1), normalizedMinH ?? 1)
  const x = Math.min(columns - w, toInteger(value.x, 0, 0))
  const y = toInteger(value.y, 0, 0)

  return {
    i,
    x,
    y,
    w,
    h,
    ...(normalizedMinW === undefined ? {} : { minW: normalizedMinW }),
    ...(normalizedMinH === undefined ? {} : { minH: normalizedMinH }),
  }
}

export const getDashboardViewportMode = (width: number): DashboardViewportMode =>
  width <= 767 ? 'phone' : width <= 1199 ? 'tablet' : 'desktop'

export const normalizeDashboardLayout = (
  value: unknown,
  mode: DashboardGridMode = 'desktop',
): LayoutItem[] => {
  if (!Array.isArray(value)) return []

  const columns = DASHBOARD_GRID_COLUMNS[mode]
  const seen = new Set<string>()
  const layout: LayoutItem[] = []

  value.forEach(item => {
    const normalized = normalizeLayoutItem(item, columns)
    if (!normalized || seen.has(normalized.i)) return
    seen.add(normalized.i)
    layout.push(normalized)
  })

  return layout
}

/**
 * 기존 40px 행을 16px 행으로 옮길 때 y/h/minH를 두 배로 만들면
 * 8px 간격을 포함한 실제 top/height 픽셀이 정확히 유지된다.
 */
export const migrateLegacyDesktopLayout = (value: unknown): LayoutItem[] => {
  const legacy = normalizeDashboardLayout(value, 'desktop')
  return normalizeDashboardLayout(
    legacy.map(item => ({
      ...item,
      y: item.y * 2,
      h: item.h * 2,
      ...(item.minH === undefined ? {} : { minH: item.minH * 2 }),
    })),
    'desktop',
  )
}

export const dashboardItemsOverlap = (
  first: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>,
  second: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>,
): boolean =>
  first.x < second.x + second.w
  && first.x + first.w > second.x
  && first.y < second.y + second.h
  && first.y + first.h > second.y

export const getDashboardCollisions = (
  layout: readonly LayoutItem[],
  item: LayoutItem,
): LayoutItem[] =>
  layout.filter(candidate =>
    candidate.i !== item.i && dashboardItemsOverlap(candidate, item),
  )

export const hasDashboardOverlap = (layout: readonly LayoutItem[]): boolean => {
  for (let index = 0; index < layout.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < layout.length; otherIndex += 1) {
      if (dashboardItemsOverlap(layout[index], layout[otherIndex])) return true
    }
  }
  return false
}

const nearestHorizontalPositions = (desiredX: number, maxX: number): number[] =>
  Array.from({ length: maxX + 1 }, (_, x) => x)
    .sort((first, second) =>
      Math.abs(first - desiredX) - Math.abs(second - desiredX)
      || first - second,
    )

const placeNearestThenDown = (
  desired: LayoutItem,
  placed: readonly LayoutItem[],
  columns: number,
): LayoutItem => {
  const maxX = Math.max(0, columns - desired.w)
  const xCandidates = nearestHorizontalPositions(
    Math.min(maxX, Math.max(0, desired.x)),
    maxX,
  )
  const lowestGuaranteedFreeRow = Math.max(
    desired.y,
    ...placed.map(item => item.y + item.h),
  )

  for (let y = desired.y; y <= lowestGuaranteedFreeRow; y += 1) {
    for (const x of xCandidates) {
      const candidate = { ...desired, x, y }
      if (!placed.some(item => dashboardItemsOverlap(item, candidate))) {
        return candidate
      }
    }
  }

  return { ...desired, x: xCandidates[0] ?? 0, y: lowestGuaranteedFreeRow }
}

/**
 * PC 최초 배치를 24열 태블릿 배치로 파생한다.
 * 같은 행에서는 원래 x에 가장 가까운 칸을 먼저 찾고, 없을 때만 아래로 내려간다.
 */
export const deriveTabletDashboardLayout = (
  desktopLayout: unknown,
  resolveMinimumWidth?: (instanceId: string) => number | undefined,
): LayoutItem[] => {
  const desktop = normalizeDashboardLayout(desktopLayout, 'desktop')
  const indexed = desktop.map((item, index) => ({ item, index }))
  const placementOrder = [...indexed].sort((first, second) =>
    first.item.y - second.item.y
    || first.item.x - second.item.x
    || first.index - second.index,
  )
  const placed: LayoutItem[] = []
  const placedById = new Map<string, LayoutItem>()

  placementOrder.forEach(({ item }) => {
    const scaledItemMinW = item.minW === undefined
      ? 1
      : Math.max(1, Math.ceil(item.minW / 2))
    const registeredMinW = resolveMinimumWidth?.(item.i) ?? 1
    const scaledMinW = Math.max(scaledItemMinW, registeredMinW)
    const desired = normalizeDashboardLayout([{
      ...item,
      x: Math.floor(item.x / 2),
      w: Math.max(scaledMinW, Math.ceil(item.w / 2)),
      minW: scaledMinW,
    }], 'tablet')[0]
    const next = placeNearestThenDown(
      desired,
      placed,
      DASHBOARD_GRID_COLUMNS.tablet,
    )
    placed.push(next)
    placedById.set(next.i, next)
  })

  return desktop.map(item => placedById.get(item.i) ?? item)
}

/**
 * 이동 중인 위젯은 목표 칸에 고정하고 나머지만 아래로 민다.
 * 처리 순서는 기존 y → x → 배열 순번으로 고정해 미리보기와 저장 결과를 일치시킨다.
 */
export const projectDashboardPushDown = (
  layout: unknown,
  movingItem: LayoutItem,
  mode: DashboardGridMode = 'desktop',
): LayoutItem[] => {
  const normalized = normalizeDashboardLayout(layout, mode)
  const moving = normalizeDashboardLayout([movingItem], mode)[0]
  if (!moving) return normalized

  const movingIndex = normalized.findIndex(item => item.i === moving.i)
  const ordered = normalized
    .map((item, index) => ({ item, index }))
    .filter(entry => entry.item.i !== moving.i)
    .sort((first, second) =>
      first.item.y - second.item.y
      || first.item.x - second.item.x
      || first.index - second.index,
    )
  const placed: LayoutItem[] = [moving]
  const projectedById = new Map<string, LayoutItem>([[moving.i, moving]])

  ordered.forEach(({ item }) => {
    let candidate = { ...item }

    while (true) {
      const collisions = placed.filter(placedItem =>
        dashboardItemsOverlap(placedItem, candidate),
      )
      if (collisions.length === 0) break

      candidate = {
        ...candidate,
        y: Math.max(...collisions.map(collision => collision.y + collision.h)),
      }
    }

    placed.push(candidate)
    projectedById.set(candidate.i, candidate)
  })

  const projected = normalized.map(item => projectedById.get(item.i) ?? item)
  if (movingIndex >= 0) return projected
  return [moving, ...projected]
}

export const normalizeDashboardMobile = (
  value: unknown,
  activeIds: unknown,
): DashboardMobileProfile => {
  const active = uniqueIds(activeIds)
  const record = isRecord(value) ? value : {}
  const activeSet = new Set(active)
  const order = uniqueIds(record.order).filter(id => activeSet.has(id))

  active.forEach(id => {
    if (!order.includes(id)) order.push(id)
  })

  const hiddenSet = new Set(
    uniqueIds(record.hidden).filter(id => activeSet.has(id)),
  )

  return {
    order,
    hidden: order.filter(id => hiddenSet.has(id)),
    updatedAt: toTimestamp(record.updatedAt),
  }
}

export const moveDashboardMobileItem = (
  order: readonly string[],
  id: string,
  direction: 'up' | 'down',
): string[] => {
  const next = uniqueIds(order)
  const currentIndex = next.indexOf(id)
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

  if (
    currentIndex < 0
    || targetIndex < 0
    || targetIndex >= next.length
  ) {
    return next
  }

  ;[next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]]
  return next
}

const normalizeGridProfile = (
  value: unknown,
  mode: DashboardGridMode,
): DashboardGridProfile | undefined => {
  if (!isRecord(value)) return undefined

  const layout = mode === 'desktop' && value.gridVersion === 1
    ? migrateLegacyDesktopLayout(value.layout)
    : normalizeDashboardLayout(value.layout, mode)

  return {
    gridVersion: DASHBOARD_GRID_VERSION,
    layout,
    updatedAt: toTimestamp(value.updatedAt),
  }
}

export const createDashboardConfigFromLegacy = (
  legacyActive: unknown,
  legacyLayout: unknown,
  updatedAt = '',
): DashboardConfig => {
  const migratedLayout = migrateLegacyDesktopLayout(legacyLayout)
  const activeIds = Array.isArray(legacyActive)
    ? uniqueIds(legacyActive)
    : migratedLayout.map(item => item.i)

  return {
    configVersion: DASHBOARD_CONFIG_VERSION,
    activeIds,
    activeUpdatedAt: updatedAt,
    desktop: {
      gridVersion: DASHBOARD_GRID_VERSION,
      layout: migratedLayout,
      updatedAt,
    },
  }
}

/**
 * 새 설정이 없으면 legacy dashboardActive/dashboardLayout을 v1 설정으로 승격한다.
 * AppContext에서는 normalizeDashboardConfig(
 *   data.dashboardConfig,
 *   data.dashboardActive,
 *   data.dashboardLayout,
 *   data._lastSaved,
 * ) 형태로 호출할 수 있다.
 */
export const normalizeDashboardConfig = (
  value: unknown,
  legacyActive?: unknown,
  legacyLayout?: unknown,
  legacyUpdatedAt = '',
): DashboardConfig => {
  if (!isRecord(value)) {
    return createDashboardConfigFromLegacy(
      legacyActive,
      legacyLayout,
      legacyUpdatedAt,
    )
  }

  const activeIds = Array.isArray(value.activeIds)
    ? uniqueIds(value.activeIds)
    : uniqueIds(legacyActive)
  const desktop = normalizeGridProfile(value.desktop, 'desktop') ?? {
    gridVersion: DASHBOARD_GRID_VERSION,
    layout: migrateLegacyDesktopLayout(legacyLayout),
    updatedAt: legacyUpdatedAt,
  }
  const tablet = normalizeGridProfile(value.tablet, 'tablet')
  const mobile = isRecord(value.mobile)
    ? normalizeDashboardMobile(value.mobile, activeIds)
    : undefined

  return {
    configVersion: DASHBOARD_CONFIG_VERSION,
    activeIds,
    activeUpdatedAt: toTimestamp(value.activeUpdatedAt) || legacyUpdatedAt,
    desktop,
    ...(tablet ? { tablet } : {}),
    ...(mobile ? { mobile } : {}),
  }
}

const pickNewer = <T extends { updatedAt: string }>(
  remote: T | undefined,
  incoming: T | undefined,
): T | undefined => {
  if (!remote) return incoming
  if (!incoming) return remote
  return incoming.updatedAt > remote.updatedAt ? incoming : remote
}

/**
 * 활성 목록, PC, 태블릿, 모바일을 각 updatedAt 기준으로 독립 병합한다.
 * 같은 시각이면 이미 저장된 remote를 유지한다.
 */
export const mergeDashboardConfigs = (
  remoteValue: DashboardConfig | null | undefined,
  incomingValue: DashboardConfig | null | undefined,
): DashboardConfig => {
  if (!remoteValue) return normalizeDashboardConfig(incomingValue)
  if (!incomingValue) return normalizeDashboardConfig(remoteValue)

  const remote = normalizeDashboardConfig(remoteValue)
  const incoming = normalizeDashboardConfig(incomingValue)
  const incomingActiveIsNewer = incoming.activeUpdatedAt > remote.activeUpdatedAt
  const activeIds = incomingActiveIsNewer ? incoming.activeIds : remote.activeIds
  const activeUpdatedAt = incomingActiveIsNewer
    ? incoming.activeUpdatedAt
    : remote.activeUpdatedAt
  const desktop = pickNewer(remote.desktop, incoming.desktop) ?? remote.desktop
  const tablet = pickNewer(remote.tablet, incoming.tablet)
  const mobile = pickNewer(remote.mobile, incoming.mobile)

  return {
    configVersion: DASHBOARD_CONFIG_VERSION,
    activeIds,
    activeUpdatedAt,
    desktop,
    ...(tablet ? { tablet } : {}),
    ...(mobile ? { mobile: normalizeDashboardMobile(mobile, activeIds) } : {}),
  }
}
