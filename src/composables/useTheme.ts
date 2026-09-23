/**
 * `localStorage` key VueUse's `useColorMode` persists the explicit choice
 * under (its documented default: https://vueuse.org/core/useColorMode).
 * `index.html`'s inline pre-mount script reads this exact key so the flash
 * -prevention script and this composable can never disagree about the
 * current mode.
 */
export const THEME_STORAGE_KEY = 'vueuse-color-scheme'

/**
 * Owns the current theme (light/dark/auto) and its persistence, on top of
 * VueUse's `useColorMode` (PRD-002 "Theme"): defaults to the OS preference
 * (`auto`), remembers an explicit choice in `localStorage`, and applies it
 * as `data-theme="dark"` / `data-theme="light"` on `<html>` — the attribute
 * `theme.css`'s `:root[data-theme='dark']` override already keys off.
 *
 * `auto` maps to an *empty* attribute value (VueUse's default `modes` map
 * for `auto` is `''`), which is equivalent to no `data-theme` attribute at
 * all and therefore resolves to the light tokens — matching the light
 * default in `tokens.css`'s bare `:root` block.
 */
export function useTheme () {
  const mode = useColorMode({
    attribute: 'data-theme',
    storageKey: THEME_STORAGE_KEY
  })

  const isDark = computed(() => mode.value === 'dark')

  function toggleTheme (): void {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  return {
    mode,
    isDark,
    toggleTheme
  }
}
