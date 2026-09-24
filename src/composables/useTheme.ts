export const THEME_STORAGE_KEY = 'vueuse-color-scheme'

export function useTheme () {
  const mode = useColorMode({
    initialValue: 'auto',
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
