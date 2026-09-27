// jsdom lacks IntersectionObserver and VueUse's useElementVisibility silently no-ops without it.
// Reports every observed element as fully intersecting; no geometry needed.

class FakeIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: readonly number[] = []

  constructor (private readonly callback: IntersectionObserverCallback) {}

  observe (target: Element): void {
    const rect = target.getBoundingClientRect()

    this.callback([{
      target,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: rect,
      intersectionRect: rect,
      rootBounds: null,
      time: 0
    }], this)
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve (): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect (): void {}
  takeRecords (): IntersectionObserverEntry[] {
    return []
  }
}

window.IntersectionObserver = window.IntersectionObserver ??
  (FakeIntersectionObserver as unknown as typeof IntersectionObserver)
