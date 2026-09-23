import { setPreferredColorScheme } from '../../tests/support'

/**
 * `useTheme` unit tests (PRD-002 "Testing boundary" — "Theme composable —
 * unit tested for default-from-system, explicit override and
 * persistence"). Driven through the `matchMedia` polyfill
 * (`tests/support/match-media.ts`) for the system-preference case and real
 * `localStorage` for persistence.
 */
describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    setPreferredColorScheme('light')
  })

  it('defaults to the system preference when no explicit choice is stored (dark)', async () => {
    setPreferredColorScheme('dark')

    const { isDark } = useTheme()
    await nextTick()

    expect(isDark.value).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('defaults to the system preference when no explicit choice is stored (light)', async () => {
    setPreferredColorScheme('light')

    const { isDark } = useTheme()
    await nextTick()

    expect(isDark.value).toBe(false)
  })

  it('toggleTheme sets an explicit choice that overrides the system preference', async () => {
    setPreferredColorScheme('light')

    const { isDark, toggleTheme } = useTheme()
    await nextTick()
    expect(isDark.value).toBe(false)

    toggleTheme()
    await nextTick()

    expect(isDark.value).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('persists the explicit choice to localStorage under the documented VueUse key', async () => {
    const { toggleTheme } = useTheme()

    toggleTheme()
    await nextTick()

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('a persisted explicit choice overrides the system preference on next read', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    setPreferredColorScheme('light')

    const { isDark } = useTheme()
    await nextTick()

    expect(isDark.value).toBe(true)
  })
})
