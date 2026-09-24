import { setPreferredColorScheme } from '../../tests/support'

/**
 * `useTheme` unit tests (PRD-002 "Testing boundary" — "Theme composable —
 * unit tested for default-from-system, explicit override and persistence").
 *
 * Driven through the `matchMedia` polyfill (`tests/support/match-media.ts`,
 * `setPreferredColorScheme`) for the system preference and through
 * `localStorage` directly for the persisted-choice cases — the same
 * `THEME_STORAGE_KEY` `useColorMode` itself reads and writes.
 */
describe('useTheme', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    setPreferredColorScheme('light')
  })

  describe('default-from-system', () => {
    it('defaults to dark when no choice is persisted and the system prefers dark', () => {
      setPreferredColorScheme('dark')

      const { isDark } = useTheme()

      expect(isDark.value).toBe(true)
    })

    it('defaults to light when no choice is persisted and the system prefers light', () => {
      setPreferredColorScheme('light')

      const { isDark } = useTheme()

      expect(isDark.value).toBe(false)
    })
  })

  describe('explicit override', () => {
    it('lets toggleTheme override the system preference', async () => {
      setPreferredColorScheme('dark')

      const { isDark, toggleTheme } = useTheme()

      expect(isDark.value).toBe(true)

      toggleTheme()
      await nextTick()

      expect(isDark.value).toBe(false)
    })
  })

  describe('persistence', () => {
    it('reads a persisted light choice over a dark system preference', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light')
      setPreferredColorScheme('dark')

      const { isDark } = useTheme()

      expect(isDark.value).toBe(false)
    })

    it('reads a persisted dark choice over a light system preference', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
      setPreferredColorScheme('light')

      const { isDark } = useTheme()

      expect(isDark.value).toBe(true)
    })

    it('writes the explicit choice back to storage under THEME_STORAGE_KEY', async () => {
      setPreferredColorScheme('light')

      const { toggleTheme } = useTheme()

      toggleTheme()
      await nextTick()

      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    })
  })
})
