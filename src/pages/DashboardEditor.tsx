import {
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import DashboardGridCanvas, {
  buildDashboardGridLayout,
  deriveRegisteredTabletDashboardLayout,
  getDashboardWidgetGridSize,
} from '../components/DashboardGridCanvas'
import { useApp } from '../store/AppContext'
import type {
  DashboardConfig,
  DashboardGridMode,
  DashboardMobileProfile,
  LayoutItem,
} from '../types'
import {
  DASHBOARD_GRID_COLUMNS,
  DASHBOARD_GRID_GAP,
  DASHBOARD_GRID_ROW_HEIGHT,
  dashboardItemsOverlap,
  getDashboardViewportMode,
  moveDashboardMobileItem,
  normalizeDashboardConfig,
  normalizeDashboardLayout,
  normalizeDashboardMobile,
  projectDashboardPushDown,
} from '../utils/dashboardLayout'
import { WIDGET_MAP, WIDGETS } from '../widgets'

const PUSH_DWELL_MS = 1000

type GridCanvasProps = ComponentProps<typeof DashboardGridCanvas>
type GridDragStart = NonNullable<GridCanvasProps['onDragStart']>
type GridDrag = NonNullable<GridCanvasProps['onDrag']>
type GridDragStop = NonNullable<GridCanvasProps['onDragStop']>
type GridResizeStart = NonNullable<GridCanvasProps['onResizeStart']>
type GridResizeStop = NonNullable<GridCanvasProps['onResizeStop']>

interface Props {
  onDone: () => void
  focusHeading?: boolean
}

interface DirtySections {
  active: boolean
  desktop: boolean
  tablet: boolean
  mobile: boolean
}

interface ClientPoint {
  x: number
  y: number
}

interface GridInteraction {
  kind: 'drag' | 'resize'
  mode: DashboardGridMode
  instanceId: string
  snapshot: LayoutItem[]
  pointerStart?: ClientPoint
  itemStart?: { left: number; top: number }
  gridStart?: { left: number; top: number }
  cancelled: boolean
}

interface PushPreview {
  key: string
  candidate: LayoutItem
  collisionIds: string[]
  startedAt: number
  armed: boolean
  projected: LayoutItem[]
}

const cloneLayout = (layout: readonly LayoutItem[]): LayoutItem[] =>
  layout.map(item => ({ ...item }))

const layoutsMatch = (
  first: readonly LayoutItem[],
  second: readonly LayoutItem[],
): boolean =>
  first.length === second.length
  && first.every((item, index) => {
    const other = second[index]
    return Boolean(other)
      && item.i === other.i
      && item.x === other.x
      && item.y === other.y
      && item.w === other.w
      && item.h === other.h
  })

const getBottomY = (layout: readonly LayoutItem[]): number =>
  layout.reduce((bottom, item) => Math.max(bottom, item.y + item.h), 0)

const isRegisteredInstance = (instanceId: string): boolean =>
  Boolean(WIDGET_MAP[instanceId.split('-')[0]])

const sortActiveByDesktopPosition = (
  activeIds: readonly string[],
  desktopLayout: readonly LayoutItem[],
): string[] => {
  const activeSet = new Set(activeIds)
  const positioned = desktopLayout
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => activeSet.has(item.i))
    .sort((first, second) =>
      first.item.y - second.item.y
      || first.item.x - second.item.x
      || first.index - second.index,
    )
    .map(({ item }) => item.i)

  activeIds.forEach(instanceId => {
    if (!positioned.includes(instanceId)) positioned.push(instanceId)
  })
  return positioned
}

const getClientPoint = (event: Event): ClientPoint | undefined => {
  if ('touches' in event) {
    const touchEvent = event as TouchEvent
    const touch = touchEvent.touches[0] ?? touchEvent.changedTouches[0]
    return touch ? { x: touch.clientX, y: touch.clientY } : undefined
  }

  if ('clientX' in event && 'clientY' in event) {
    const pointerEvent = event as MouseEvent
    return { x: pointerEvent.clientX, y: pointerEvent.clientY }
  }

  return undefined
}

const placeAtStartOrBottom = (
  layout: readonly LayoutItem[],
  item: LayoutItem,
): LayoutItem[] => {
  const others = layout.filter(candidate => candidate.i !== item.i)
  const topCandidate = { ...item, x: 0, y: 0 }
  const nextItem = others.some(candidate =>
    dashboardItemsOverlap(candidate, topCandidate),
  )
    ? { ...item, x: 0, y: getBottomY(others) }
    : topCandidate

  const existingIndex = layout.findIndex(candidate => candidate.i === item.i)
  if (existingIndex < 0) return [...layout, nextItem]
  return layout.map(candidate => candidate.i === item.i ? nextItem : candidate)
}

export default function DashboardEditor({
  onDone,
  focusHeading = false,
}: Props) {
  const {
    dashboardConfig,
    saveImmediately,
  } = useApp()
  const [draft, setDraft] = useState<DashboardConfig>(() =>
    normalizeDashboardConfig(dashboardConfig),
  )
  const [dirty, setDirty] = useState<DirtySections>({
    active: false,
    desktop: false,
    tablet: false,
    mobile: false,
  })
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1200 : window.innerWidth,
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const [measurement, setMeasurement] = useState({ width: 0, scale: 1 })
  const [pushPreview, setPushPreview] = useState<PushPreview | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [canvasRevision, setCanvasRevision] = useState(0)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const interactionRef = useRef<GridInteraction | null>(null)
  const pushPreviewRef = useRef<PushPreview | null>(null)
  const pushTimerRef = useRef<number | null>(null)
  const measurementRef = useRef(measurement)

  const viewportMode = getDashboardViewportMode(viewportWidth)
  const gridMode = viewportMode === 'phone' ? null : viewportMode
  const validActiveIds = draft.activeIds.filter(isRegisteredInstance)
  const desktopOrder = sortActiveByDesktopPosition(
    validActiveIds,
    draft.desktop.layout,
  )
  const mobileProfile = normalizeDashboardMobile(draft.mobile, desktopOrder)
  const sourceLayout = gridMode === 'desktop'
    ? draft.desktop.layout
    : gridMode === 'tablet'
      ? draft.tablet?.layout
        ?? deriveRegisteredTabletDashboardLayout(
          draft.desktop.layout,
          validActiveIds,
        )
      : []
  const gridLayout = gridMode
    ? buildDashboardGridLayout(validActiveIds, sourceLayout, gridMode)
    : []

  const updateMeasurement = useCallback(() => {
    const element = canvasHostRef.current
    if (!element || interactionRef.current) return

    const width = element.offsetWidth
    const renderedWidth = element.getBoundingClientRect().width
    const scale = width > 0 && renderedWidth > 0
      ? renderedWidth / width
      : 1
    const next = {
      width,
      scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
    }
    const current = measurementRef.current
    if (
      current.width === next.width
      && Math.abs(current.scale - next.scale) < 0.001
    ) return

    measurementRef.current = next
    setMeasurement(next)
  }, [])

  const clearPushPreview = useCallback(() => {
    if (pushTimerRef.current !== null) {
      window.clearTimeout(pushTimerRef.current)
      pushTimerRef.current = null
    }
    pushPreviewRef.current = null
    setPushPreview(null)
  }, [])

  const writeGridLayout = useCallback((
    mode: DashboardGridMode,
    value: readonly LayoutItem[],
  ) => {
    const normalized = normalizeDashboardLayout(value, mode)
      .filter(item => isRegisteredInstance(item.i))
    setDraft(current => {
      if (mode === 'desktop') {
        const retainedUnknown = current.desktop.layout.filter(
          item => !isRegisteredInstance(item.i),
        )
        return {
          ...current,
          desktop: {
            ...current.desktop,
            layout: [...normalized, ...retainedUnknown],
          },
        }
      }

      const retainedUnknown = current.tablet?.layout.filter(
        item => !isRegisteredInstance(item.i),
      ) ?? []
      return {
        ...current,
        tablet: {
          gridVersion: 2,
          layout: [...normalized, ...retainedUnknown],
          updatedAt: current.tablet?.updatedAt ?? '',
        },
      }
    })
    setDirty(current => ({ ...current, [mode]: true }))
  }, [])

  const finishInteraction = useCallback(() => {
    interactionRef.current = null
    setIsInteracting(false)
    clearPushPreview()
    window.requestAnimationFrame(updateMeasurement)
  }, [clearPushPreview, updateMeasurement])

  const forceCancelInteraction = useCallback(() => {
    const interaction = interactionRef.current
    if (!interaction) return

    interaction.cancelled = true
    clearPushPreview()
    window.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
    }))

    window.requestAnimationFrame(() => {
      const pending = interactionRef.current
      if (!pending || pending !== interaction) return
      interactionRef.current = null
      setIsInteracting(false)
      setStatusMessage('변경을 취소했어요.')
      setCanvasRevision(revision => revision + 1)
      updateMeasurement()
    })
  }, [clearPushPreview, updateMeasurement])

  useEffect(() => {
    if (!focusHeading) return
    headingRef.current?.focus()
  }, [focusHeading])

  useEffect(() => {
    const handleResize = () => {
      if (interactionRef.current) forceCancelInteraction()
      setViewportWidth(window.innerWidth)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [forceCancelInteraction])

  useEffect(() => {
    const element = canvasHostRef.current
    if (!element) return

    let frame = 0
    const queueMeasurement = () => {
      if (frame) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(updateMeasurement)
    }
    queueMeasurement()
    const observer = new ResizeObserver(queueMeasurement)
    try {
      observer.observe(element, { box: 'border-box' })
    } catch {
      observer.observe(element)
    }
    return () => {
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [updateMeasurement, viewportMode])

  useEffect(() => {
    measurementRef.current = measurement
  }, [measurement])

  useEffect(() => () => {
    if (pushTimerRef.current !== null) {
      window.clearTimeout(pushTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (interactionRef.current) {
        event.preventDefault()
        forceCancelInteraction()
        return
      }
      if (pickerOpen) {
        event.preventDefault()
        setPickerOpen(false)
      }
    }
    const handlePointerCancel = () => forceCancelInteraction()

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('pointercancel', handlePointerCancel, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('pointercancel', handlePointerCancel, true)
    }
  }, [forceCancelInteraction, pickerOpen])

  const candidateFromPointer = useCallback((
    interaction: GridInteraction,
    event: Event,
    node: HTMLElement,
  ): LayoutItem | null => {
    const gridElement = gridRef.current
    const snapshotItem = interaction.snapshot.find(
      item => item.i === interaction.instanceId,
    )
    if (!gridElement || !snapshotItem) return null

    const frozen = measurementRef.current
    const scale = frozen.scale > 0 ? frozen.scale : 1
    const gridRect = gridElement.getBoundingClientRect()
    const point = getClientPoint(event)
    let left: number
    let top: number

    if (
      point
      && interaction.pointerStart
      && interaction.itemStart
    ) {
      left = interaction.itemStart.left
        + (point.x - interaction.pointerStart.x) / scale
        + ((interaction.gridStart?.left ?? gridRect.left) - gridRect.left) / scale
      top = interaction.itemStart.top
        + (point.y - interaction.pointerStart.y) / scale
        + ((interaction.gridStart?.top ?? gridRect.top) - gridRect.top) / scale
    } else {
      const nodeRect = node.getBoundingClientRect()
      left = (nodeRect.left - gridRect.left) / scale
      top = (nodeRect.top - gridRect.top) / scale
    }

    const columns = DASHBOARD_GRID_COLUMNS[interaction.mode]
    const columnStep = (frozen.width + DASHBOARD_GRID_GAP) / columns
    const rowStep = DASHBOARD_GRID_ROW_HEIGHT + DASHBOARD_GRID_GAP
    const x = Math.min(
      columns - snapshotItem.w,
      Math.max(0, Math.round(left / columnStep)),
    )
    const y = Math.max(0, Math.round(top / rowStep))

    return { ...snapshotItem, x, y }
  }, [])

  const armPushPreview = useCallback((preview: PushPreview) => {
    const current = pushPreviewRef.current
    const interaction = interactionRef.current
    if (
      !current
      || current.key !== preview.key
      || !interaction
      || interaction.instanceId !== preview.candidate.i
    ) return

    const armed: PushPreview = {
      ...current,
      armed: true,
      projected: projectDashboardPushDown(
        interaction.snapshot,
        current.candidate,
        interaction.mode,
      ),
    }
    pushPreviewRef.current = armed
    setPushPreview(armed)
    setStatusMessage('놓으면 아래 위젯을 밀고 이 위치에 배치해요.')
  }, [])

  const updatePushPreview = useCallback((
    interaction: GridInteraction,
    candidate: LayoutItem,
  ) => {
    const collisionIds = interaction.snapshot
      .filter(item =>
        item.i !== candidate.i && dashboardItemsOverlap(item, candidate),
      )
      .map(item => item.i)
      .sort()

    if (collisionIds.length === 0) {
      clearPushPreview()
      setStatusMessage('')
      return
    }

    const key = [
      interaction.mode,
      candidate.i,
      candidate.x,
      candidate.y,
      candidate.w,
      candidate.h,
      collisionIds.join(','),
    ].join(':')
    const current = pushPreviewRef.current
    if (current?.key === key) {
      if (
        !current.armed
        && performance.now() - current.startedAt >= PUSH_DWELL_MS
      ) {
        armPushPreview(current)
      }
      return
    }

    clearPushPreview()
    const preview: PushPreview = {
      key,
      candidate,
      collisionIds,
      startedAt: performance.now(),
      armed: false,
      projected: interaction.snapshot,
    }
    pushPreviewRef.current = preview
    setPushPreview(preview)
    setStatusMessage('이 위치에서 1초 유지하면 자동 밀기를 준비해요.')
    pushTimerRef.current = window.setTimeout(
      () => armPushPreview(preview),
      PUSH_DWELL_MS,
    )
  }, [armPushPreview, clearPushPreview])

  const handleDragStart: GridDragStart = (
    layout,
    _oldItem,
    newItem,
    _placeholder,
    event,
    node,
  ) => {
    const scale = measurementRef.current.scale || 1
    const gridRect = gridRef.current?.getBoundingClientRect()
    const nodeRect = node.getBoundingClientRect()
    const interaction: GridInteraction = {
      kind: 'drag',
      mode: gridMode ?? 'desktop',
      instanceId: newItem.i,
      snapshot: cloneLayout(layout as LayoutItem[]),
      pointerStart: getClientPoint(event),
      itemStart: gridRect ? {
        left: (nodeRect.left - gridRect.left) / scale,
        top: (nodeRect.top - gridRect.top) / scale,
      } : undefined,
      gridStart: gridRect ? {
        left: gridRect.left,
        top: gridRect.top,
      } : undefined,
      cancelled: false,
    }
    interactionRef.current = interaction
    setIsInteracting(true)
    setPickerOpen(false)
    setStatusMessage('빈칸에는 바로 놓을 수 있어요.')
    clearPushPreview()
  }

  const handleDrag: GridDrag = (
    _layout,
    _oldItem,
    _newItem,
    _placeholder,
    event,
    node,
  ) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.kind !== 'drag') return
    const candidate = candidateFromPointer(interaction, event, node)
    if (!candidate) return
    updatePushPreview(interaction, candidate)
  }

  const handleDragStop: GridDragStop = (
    layout,
    _oldItem,
    _newItem,
    _placeholder,
    event,
    node,
  ) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.kind !== 'drag') return

    if (interaction.cancelled) {
      setStatusMessage('변경을 취소했어요.')
      setCanvasRevision(revision => revision + 1)
      finishInteraction()
      return
    }

    const candidate = candidateFromPointer(interaction, event, node)
    const currentPreview = pushPreviewRef.current
    const collisionIds = candidate
      ? interaction.snapshot
        .filter(item =>
          item.i !== candidate.i && dashboardItemsOverlap(item, candidate),
        )
        .map(item => item.i)
        .sort()
      : []
    const candidateKey = candidate && collisionIds.length > 0
      ? [
        interaction.mode,
        candidate.i,
        candidate.x,
        candidate.y,
        candidate.w,
        candidate.h,
        collisionIds.join(','),
      ].join(':')
      : ''
    const canPush = Boolean(
      candidate
      && currentPreview
      && currentPreview.key === candidateKey
      && (
        currentPreview.armed
        || performance.now() - currentPreview.startedAt >= PUSH_DWELL_MS
      ),
    )

    if (candidate && canPush) {
      writeGridLayout(
        interaction.mode,
        projectDashboardPushDown(
          interaction.snapshot,
          candidate,
          interaction.mode,
        ),
      )
      setStatusMessage('위젯을 밀고 새 위치에 배치했어요.')
    } else {
      const normalized = normalizeDashboardLayout(layout, interaction.mode)
      if (!layoutsMatch(normalized, interaction.snapshot)) {
        writeGridLayout(interaction.mode, normalized)
      }
      setStatusMessage(
        collisionIds.length > 0
          ? '겹친 위치에는 바로 놓을 수 없어 마지막 빈칸에 배치했어요.'
          : '새 위치에 배치했어요.',
      )
    }

    finishInteraction()
  }

  const handleResizeStart: GridResizeStart = (
    layout,
    _oldItem,
    newItem,
  ) => {
    interactionRef.current = {
      kind: 'resize',
      mode: gridMode ?? 'desktop',
      instanceId: newItem.i,
      snapshot: cloneLayout(layout as LayoutItem[]),
      cancelled: false,
    }
    setIsInteracting(true)
    setPickerOpen(false)
    setStatusMessage('이웃 위젯과 겹치지 않는 범위에서 크기를 조절해요.')
    clearPushPreview()
  }

  const handleResizeStop: GridResizeStop = (layout) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.kind !== 'resize') return

    if (interaction.cancelled) {
      setStatusMessage('크기 변경을 취소했어요.')
      setCanvasRevision(revision => revision + 1)
      finishInteraction()
      return
    }

    const normalized = normalizeDashboardLayout(layout, interaction.mode)
    if (!layoutsMatch(normalized, interaction.snapshot)) {
      writeGridLayout(interaction.mode, normalized)
    }
    setStatusMessage('위젯 크기를 조정했어요.')
    finishInteraction()
  }

  const addWidget = (widgetId: string) => {
    const meta = WIDGET_MAP[widgetId]
    if (!meta || isInteracting || saving) return

    const existing = draft.activeIds.find(
      instanceId => instanceId.split('-')[0] === widgetId,
    )
    if (existing) {
      if (viewportMode === 'phone') {
        setDraft(current => {
          const currentOrder = sortActiveByDesktopPosition(
            current.activeIds,
            current.desktop.layout,
          )
          const mobile = normalizeDashboardMobile(current.mobile, currentOrder)
          return {
            ...current,
            mobile: {
              ...mobile,
              hidden: mobile.hidden.filter(id => id !== existing),
            },
          }
        })
        setDirty(current => ({ ...current, mobile: true }))
        setStatusMessage('휴대폰에서 이 위젯을 다시 표시해요.')
        setPickerOpen(false)
        return
      }

      const mode = gridMode ?? 'desktop'
      const existingItem = gridLayout.find(item => item.i === existing)
      if (existingItem) {
        writeGridLayout(
          mode,
          placeAtStartOrBottom(gridLayout, existingItem),
        )
        setStatusMessage('기존 위젯을 빈 시작 위치 또는 맨 아래로 옮겼어요.')
      }
      setPickerOpen(false)
      return
    }

    const instanceId = `${widgetId}-${Date.now()}`
    const desktopSize = getDashboardWidgetGridSize(widgetId, 'desktop')
    const tabletSize = getDashboardWidgetGridSize(widgetId, 'tablet')
    if (!desktopSize || !tabletSize) return

    setDraft(current => {
      const currentActiveSet = new Set(
        current.activeIds.filter(isRegisteredInstance),
      )
      const visibleDesktop = current.desktop.layout.filter(
        item => currentActiveSet.has(item.i),
      )
      const desktopItem: LayoutItem = {
        i: instanceId,
        x: 0,
        y: getBottomY(visibleDesktop),
        w: desktopSize.defaultW,
        h: desktopSize.defaultH,
        minW: desktopSize.minW,
        minH: desktopSize.minH,
      }
      const desktopLayout = normalizeDashboardLayout(
        [...current.desktop.layout, desktopItem],
        'desktop',
      )
      const tabletBase = current.tablet?.layout
        ?? deriveRegisteredTabletDashboardLayout(
          current.desktop.layout,
          current.activeIds.filter(isRegisteredInstance),
        )
      const visibleTablet = tabletBase.filter(
        item => currentActiveSet.has(item.i),
      )
      const tabletItem: LayoutItem = {
        i: instanceId,
        x: 0,
        y: getBottomY(visibleTablet),
        w: tabletSize.defaultW,
        h: tabletSize.defaultH,
        minW: tabletSize.minW,
        minH: tabletSize.minH,
      }
      const tabletLayout = normalizeDashboardLayout(
        [...tabletBase, tabletItem],
        'tablet',
      )
      const activeIds = [...current.activeIds, instanceId]
      const currentOrder = sortActiveByDesktopPosition(activeIds, desktopLayout)
      const mobile = normalizeDashboardMobile(current.mobile, currentOrder)

      return {
        ...current,
        activeIds,
        desktop: { ...current.desktop, layout: desktopLayout },
        tablet: {
          gridVersion: 2,
          layout: tabletLayout,
          updatedAt: current.tablet?.updatedAt ?? '',
        },
        mobile: {
          ...mobile,
          hidden: mobile.hidden.filter(id => id !== instanceId),
        },
      }
    })
    setDirty({ active: true, desktop: true, tablet: true, mobile: true })
    setStatusMessage(`${meta.name} 위젯을 추가했어요.`)
    setPickerOpen(false)
  }

  const removeWidget = (instanceId: string) => {
    if (isInteracting || saving) return
    setDraft(current => {
      const activeIds = current.activeIds.filter(id => id !== instanceId)
      const desktop = current.desktop.layout.filter(item => item.i !== instanceId)
      const tablet = (
        current.tablet?.layout
        ?? deriveRegisteredTabletDashboardLayout(
          current.desktop.layout,
          activeIds.filter(isRegisteredInstance),
        )
      ).filter(item => item.i !== instanceId)
      const desktopOrder = sortActiveByDesktopPosition(activeIds, desktop)
      const mobile = normalizeDashboardMobile(current.mobile, desktopOrder)
      return {
        ...current,
        activeIds,
        desktop: { ...current.desktop, layout: desktop },
        tablet: {
          gridVersion: 2,
          layout: tablet,
          updatedAt: current.tablet?.updatedAt ?? '',
        },
        mobile,
      }
    })
    setDirty({ active: true, desktop: true, tablet: true, mobile: true })
    setStatusMessage('위젯을 대시보드에서 제거했어요.')
  }

  const updateMobile = (mobile: DashboardMobileProfile) => {
    if (saving) return
    setDraft(current => {
      const completeMobile = normalizeDashboardMobile(
        current.mobile,
        current.activeIds,
      )
      const unknownOrder = completeMobile.order.filter(
        id => !isRegisteredInstance(id),
      )
      const unknownHidden = new Set(
        completeMobile.hidden.filter(id => !isRegisteredInstance(id)),
      )
      return {
        ...current,
        mobile: {
          ...mobile,
          order: [...mobile.order, ...unknownOrder],
          hidden: [
            ...mobile.hidden,
            ...unknownOrder.filter(id => unknownHidden.has(id)),
          ],
        },
      }
    })
    setDirty(current => ({ ...current, mobile: true }))
  }

  const moveMobileWidget = (
    instanceId: string,
    direction: 'up' | 'down',
  ) => {
    updateMobile({
      ...mobileProfile,
      order: moveDashboardMobileItem(
        mobileProfile.order,
        instanceId,
        direction,
      ),
    })
  }

  const toggleMobileWidget = (instanceId: string) => {
    const hidden = new Set(mobileProfile.hidden)
    if (hidden.has(instanceId)) hidden.delete(instanceId)
    else hidden.add(instanceId)
    updateMobile({
      ...mobileProfile,
      hidden: mobileProfile.order.filter(id => hidden.has(id)),
    })
  }

  const resetMobileOrder = () => {
    if (saving) return
    updateMobile({
      ...mobileProfile,
      order: desktopOrder,
      hidden: desktopOrder.filter(id => mobileProfile.hidden.includes(id)),
    })
    setStatusMessage('휴대폰 순서를 PC 배치 순서로 맞췄어요.')
  }

  const save = async () => {
    if (saving || isInteracting) return
    if (!Object.values(dirty).some(Boolean)) {
      onDone()
      return
    }

    const now = new Date().toISOString()
    const next = normalizeDashboardConfig({
      ...draft,
      activeUpdatedAt: dirty.active ? now : draft.activeUpdatedAt,
      desktop: {
        ...draft.desktop,
        updatedAt: dirty.desktop ? now : draft.desktop.updatedAt,
      },
      ...(draft.tablet ? {
        tablet: {
          ...draft.tablet,
          updatedAt: dirty.tablet ? now : draft.tablet.updatedAt,
        },
      } : {}),
      ...(draft.mobile ? {
        mobile: {
          ...draft.mobile,
          updatedAt: dirty.mobile ? now : draft.mobile.updatedAt,
        },
      } : {}),
    })

    setSaving(true)
    setPickerOpen(false)
    setSaveError('')
    try {
      await saveImmediately({ dashboardConfig: next })
      onDone()
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : '대시보드 설정을 저장하지 못했습니다. 다시 시도해주세요.',
      )
      setSaving(false)
    }
  }

  const getPixelRect = (item: LayoutItem) => {
    if (!gridMode || measurement.width <= 0) return null
    const columns = DASHBOARD_GRID_COLUMNS[gridMode]
    const columnWidth = (
      measurement.width - DASHBOARD_GRID_GAP * (columns - 1)
    ) / columns
    return {
      left: item.x * (columnWidth + DASHBOARD_GRID_GAP),
      top: item.y * (DASHBOARD_GRID_ROW_HEIGHT + DASHBOARD_GRID_GAP),
      width: item.w * columnWidth + (item.w - 1) * DASHBOARD_GRID_GAP,
      height: item.h * DASHBOARD_GRID_ROW_HEIGHT
        + (item.h - 1) * DASHBOARD_GRID_GAP,
    }
  }

  const pushGhosts = pushPreview?.armed
    ? pushPreview.projected.filter(item => {
      if (item.i === pushPreview.candidate.i) return false
      const before = interactionRef.current?.snapshot.find(
        candidate => candidate.i === item.i,
      )
      return before && (before.x !== item.x || before.y !== item.y)
    })
    : []

  return (
    <div className="dashboard-editor">
      <div className="dashboard-editor-header">
        <div>
          <h2 ref={headingRef} tabIndex={-1}>나만의 플래너 편집</h2>
          <p className="dashboard-editor-mode-label">
            {viewportMode === 'phone'
              ? '휴대폰 순서·표시 설정'
              : gridMode === 'tablet'
                ? '태블릿 배치'
                : 'PC 배치'}
          </p>
        </div>
        <div className="dashboard-editor-actions">
          <button
            type="button"
            className="dashboard-secondary-button"
            onClick={() => setPickerOpen(open => !open)}
            disabled={isInteracting || saving}
            aria-expanded={pickerOpen}
          >
            {pickerOpen ? '위젯 목록 닫기' : '위젯 추가'}
          </button>
          <button
            type="button"
            className="dashboard-secondary-button"
            onClick={onDone}
            disabled={saving}
          >
            취소
          </button>
          <button
            type="button"
            className="dashboard-primary-button"
            onClick={() => void save()}
            disabled={saving || isInteracting}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {saveError && (
        <p className="dashboard-editor-error" role="alert">{saveError}</p>
      )}

      <p className="dashboard-editor-status" aria-live="polite">
        {statusMessage || (
          viewportMode === 'phone'
            ? '위젯별 표시 여부와 위아래 순서를 정할 수 있어요.'
            : '빈칸은 유지됩니다. 겹친 위치에서 1초 유지한 뒤 놓으면 아래 위젯이 밀려나요.'
        )}
      </p>

      <div className="dashboard-editor-workspace">
        <div
          ref={canvasHostRef}
          className="dashboard-editor-canvas"
          aria-busy={isInteracting || saving}
        >
          {viewportMode === 'phone' ? (
            <>
              <div className="mobile-dashboard-editor-toolbar">
                <button
                  type="button"
                  className="dashboard-secondary-button"
                  onClick={resetMobileOrder}
                  disabled={saving || mobileProfile.order.length < 2}
                >
                  PC 순서로 재정렬
                </button>
              </div>
              <div className="mobile-dashboard-editor-list">
                {mobileProfile.order.map((instanceId, index) => {
                  const widgetId = instanceId.split('-')[0]
                  const meta = WIDGET_MAP[widgetId]
                  if (!meta) return null
                  const visible = !mobileProfile.hidden.includes(instanceId)
                  return (
                    <div key={instanceId} className="mobile-dashboard-editor-item">
                      <div className="mobile-dashboard-editor-name">
                        <span aria-hidden="true">{meta.icon}</span>
                        <span>{meta.name}</span>
                      </div>
                      <div className="mobile-dashboard-editor-controls">
                        <button
                          type="button"
                          onClick={() => moveMobileWidget(instanceId, 'up')}
                          disabled={saving || index === 0}
                          aria-label={`${meta.name} 위로 이동`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveMobileWidget(instanceId, 'down')}
                          disabled={
                            saving || index === mobileProfile.order.length - 1
                          }
                          aria-label={`${meta.name} 아래로 이동`}
                        >
                          ↓
                        </button>
                        <label className="mobile-dashboard-visibility">
                          <input
                            type="checkbox"
                            checked={visible}
                            disabled={saving}
                            onChange={() => toggleMobileWidget(instanceId)}
                          />
                          <span>{visible ? '표시' : '숨김'}</span>
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
              {mobileProfile.order.length === 0 && (
                <div className="dashboard-empty">
                  <span className="dashboard-empty-icon" aria-hidden="true">➕</span>
                  <p>위젯을 추가하면 휴대폰 표시 순서를 정할 수 있어요.</p>
                </div>
              )}
            </>
          ) : (
            <>
              {measurement.width > 0 && gridMode && gridLayout.length > 0 && (
                <DashboardGridCanvas
                  key={`${gridMode}-${canvasRevision}`}
                  ref={gridRef}
                  layout={gridLayout}
                  width={measurement.width}
                  mode={gridMode}
                  editable
                  interactionDisabled={saving}
                  transformScale={measurement.scale}
                  onRemove={removeWidget}
                  onDragStart={handleDragStart}
                  onDrag={handleDrag}
                  onDragStop={handleDragStop}
                  onResizeStart={handleResizeStart}
                  onResizeStop={handleResizeStop}
                />
              )}

              {pushPreview && (() => {
                const rect = getPixelRect(pushPreview.candidate)
                if (!rect) return null
                return (
                  <div
                    key={pushPreview.key}
                    className={`dashboard-grid-feedback${pushPreview.armed ? ' is-armed' : ''}`}
                    style={rect}
                  >
                    <span className="dashboard-grid-feedback-label">
                      {pushPreview.armed ? '놓으면 자동 밀기' : '1초 유지'}
                    </span>
                  </div>
                )
              })()}

              {pushGhosts.map(item => {
                const rect = getPixelRect(item)
                if (!rect) return null
                return (
                  <div
                    key={`ghost-${item.i}`}
                    className="dashboard-push-ghost"
                    style={rect}
                    aria-hidden="true"
                  />
                )
              })}

              {gridLayout.length === 0 && (
                <div className="dashboard-empty">
                  <span className="dashboard-empty-icon" aria-hidden="true">➕</span>
                  <p>위젯을 추가해 나만의 배치를 시작해보세요.</p>
                  <button
                    type="button"
                    className="dashboard-primary-button"
                    onClick={() => setPickerOpen(true)}
                  >
                    위젯 추가 열기
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {pickerOpen && (
          <aside className="dashboard-widget-picker">
            <div className="dashboard-widget-picker-inner">
              <p className="dashboard-widget-picker-title">위젯 추가</p>
              <div className="dashboard-widget-picker-list">
                {WIDGETS.map(widget => {
                  const active = draft.activeIds.some(
                    instanceId => instanceId.split('-')[0] === widget.id,
                  )
                  return (
                    <button
                      key={widget.id}
                      type="button"
                      className="dashboard-widget-picker-item"
                      onClick={() => addWidget(widget.id)}
                      disabled={isInteracting || saving}
                    >
                      <span aria-hidden="true">{widget.icon}</span>
                      <span>{widget.name}</span>
                      {active && (
                        <span className="dashboard-widget-picker-state">
                          {viewportMode === 'phone' ? '표시' : '이동'}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
