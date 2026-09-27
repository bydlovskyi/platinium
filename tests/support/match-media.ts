// jsdom lacks matchMedia and VueUse calls it unconditionally. Handles only min/max-width,
// prefers-color-scheme and prefers-reduced-motion; notifies via `change`, which useMediaQuery listens to.

type TChangeListener = (event: MediaQueryListEvent) => void

let preferredColorScheme: 'light' | 'dark' = 'light'
let preferredReducedMotion: 'reduce' | 'no-preference' = 'no-preference'

export function setPreferredColorScheme (scheme: 'light' | 'dark'): void {
  preferredColorScheme = scheme
  registeredMediaQueryLists.forEach(mql => mql.__notify())
}

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
