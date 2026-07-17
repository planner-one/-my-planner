export interface WidgetSizeTarget {
  readonly offsetWidth: number
  readonly offsetHeight: number
}

export function measureWidgetBorderBox(element: WidgetSizeTarget) {
  return {
    w: Math.round(element.offsetWidth),
    h: Math.round(element.offsetHeight),
  }
}
