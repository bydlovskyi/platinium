/**
 * jsdom (this project's Vitest `environment`) does not implement
 * `IntersectionObserver` at all. VueUse's `useElementVisibility` (which
 * backs `useInfiniteScroll`, used by `RemoteSelect` — GitHub issue #33 — to
 * trigger incremental loading on scroll) feature-detects the API and
 * silently no-ops when it's missing, leaving `isElementVisible` stuck at
 * its `initialValue: false` forever — the scroll trigger it gates would
 * never fire in a test, regardless of what the test actually does.
 *
 * Reports every observed element as immediately, fully intersecting. This
 * app never needs partial/threshold intersection semantics — only "is this
 * element attached and being observed" — so a real geometry calculation
 * isn't needed. Imported once, globally, from `tests/setup.ts`.
 */

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

  // This stub only ever needs `observe()` — the caller (`useIntersectionObserver`) calls these on cleanup/reconfigure.
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
