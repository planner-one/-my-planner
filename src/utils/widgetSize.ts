export interface WidgetSizeTarget {
  readonly offsetWidth: number
  readonly offsetHeight: number
}

export type WidgetWidthTier = 'compact' | 'regular' | 'wide'
export type WidgetHeightTier = 'short' | 'regular' | 'tall'

export interface WidgetSizeTier {
  width: WidgetWidthTier
  height: WidgetHeightTier
}

export function measureWidgetBorderBox(element: WidgetSizeTarget) {
  return {
    w: Math.round(element.offsetWidth),
    h: Math.round(element.offsetHeight),
  }
}

export function getWidgetSizeTier(width: number, height: number): WidgetSizeTier {
  const widthTier: WidgetWidthTier = width > 0 && width <= 339
    ? 'compact'
    : width >= 480
      ? 'wide'
      : 'regular'
  const heightTier: WidgetHeightTier = height > 0 && height <= 199
    ? 'short'
    : height >= 320
      ? 'tall'
      : 'regular'

  return {
    width: widthTier,
    height: heightTier,
  }
}
