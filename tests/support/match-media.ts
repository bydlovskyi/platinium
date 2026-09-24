/**
 * jsdom (this project's Vitest `environment`) does not implement
 * `window.matchMedia` at all — VueUse's `useBreakpoints`/`useMediaQuery`
 * (backing `useBreakpoint`, `src/composables/useBreakpoint.ts`),
 * `useColorMode`'s `usePreferredDark` (backing `useTheme`,
 * `src/composables/useTheme.ts`) and `usePreferredReducedMotion` (backing
 * `useCountUp`, GitHub issue #42) call it unconditionally, so every shell
 * responsive/theme/motion test would throw without this polyfill. Imported
 * once, globally, from `tests/setup.ts`.
 *
 * Only supports the query shapes this app's VueUse composables actually
 * generate — `(min-width: Npx)` / `(max-width: Npx)` (from `useBreakpoints`),
 * `(prefers-color-scheme: dark|light)` (from `usePreferredDark`) and
 * `(prefers-reduced-motion: reduce|no-preference)` (from
 * `usePreferredReducedMotion`) — this is a test seam, not a general
 * matchMedia implementation.
 *
 * Each `MediaQueryList` re-evaluates `matches` against the *current*
 * `window.innerWidth` / `setPreferredColorScheme` / `setPreferredReducedMotion`
 * value and fires a `change` event when any of them changes, which is what
 * `useMediaQuery`'s `change` listener (not a `resize` listener — see VueUse
 * source) needs to pick up the new value.
 */

type TChangeListener = (event: MediaQueryListEvent) => void

let preferredColorScheme: 'light' | 'dark' = 'light'
let preferredReducedMotion: 'reduce' | 'no-preference' = 'no-preference'

/** Drives `usePreferredDark`/`usePreferredColorScheme` for theme tests. */
export function setPreferredColorScheme (scheme: 'light' | 'dark'): void {
  preferredColorScheme = scheme
  registeredMediaQueryLists.forEach(mql => mql.__notify())
}

/** Drives `usePreferredReducedMotion` for motion tests (GitHub issue #42). */
export function setPreferredReducedMotion (preference: 'reduce' | 'no-preference'): void {
  preferredReducedMotion = preference
  registeredMediaQueryLists.forEach(mql => mql.__notify())
}

function evaluateQuery (query: string): boolean {
  const minWidthMatch = /\(\s*min-width:\s*(\d+(?:\.\d+)?)px\s*\)/.exec(query)
  const maxWidthMatch = /\(\s*max-width:\s*(\d+(?:\.\d+)?)px\s*\)/.exec(query)
  const colorSchemeMatch = /\(\s*prefers-color-scheme:\s*(dark|light)\s*\)/.exec(query)
  const reducedMotionMatch = /\(\s*prefers-reduced-motion:\s*(reduce|no-preference)\s*\)/.exec(query)

  if (colorSchemeMatch) {
    return colorSchemeMatch[1] === preferredColorScheme
  }

  if (reducedMotionMatch) {
    return reducedMotionMatch[1] === preferredReducedMotion
  }

  let matches = true

  if (minWidthMatch) {
    matches &&= window.innerWidth >= Number(minWidthMatch[1])
  }

  if (maxWidthMatch) {
    matches &&= window.innerWidth <= Number(maxWidthMatch[1])
  }

  return matches
}

function createMediaQueryList (query: string): MediaQueryList {
  const listeners = new Set<TChangeListener>()

  const mql = {
    get matches () {
      return evaluateQuery(query)
    },
    media: query,
    onchange: null,
    addEventListener: (type: string, listener: TChangeListener) => {
      if (type === 'change') {
        listeners.add(listener)
      }
    },
    removeEventListener: (type: string, listener: TChangeListener) => {
      if (type === 'change') {
        listeners.delete(listener)
      }
    },
    addListener: (listener: TChangeListener) => listeners.add(listener),
    removeListener: (listener: TChangeListener) => listeners.delete(listener),
    dispatchEvent: () => true,
    /** Not part of the DOM interface — the notify hooks below call this directly. */
    __notify: () => {
      const event = { matches: evaluateQuery(query), media: query } as MediaQueryListEvent
      listeners.forEach(listener => listener(event))
    }
  }

  registeredMediaQueryLists.add(mql)

  return mql as unknown as MediaQueryList
}

const registeredMediaQueryLists = new Set<{ __notify: () => void }>()

window.matchMedia = window.matchMedia ?? ((query: string) => createMediaQueryList(query))

window.addEventListener('resize', () => {
  registeredMediaQueryLists.forEach(mql => mql.__notify())
})
