import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

import { mount } from '@vue/test-utils'

import ThemeToggle from '@/layouts/components/ThemeToggle.vue'
import { THEME_STORAGE_KEY } from '@/composables/useTheme'

/**
 * Theme-toggle integration test (issue #44, PRD-010 "Polish" — testing
 * boundary: "toggling the theme updates the document, switches the
 * `--el-*` variables, and persists; no screen renders a hardcoded colour").
 *
 * Real `ThemeToggle`/`el-button`/`el-tooltip`, no stubs. Three parts, split
 * the same way `reduced-motion.spec.ts` splits its motion-token assertion —
 * jsdom never loads this project's global stylesheet (nothing under
 * `tests/` imports `element-reset/index.css`, and Vitest doesn't inject
 * component-external `<style>` at all), so "the CSS cascade resolves
 * `--el-bg-color` to a different value" is not something this environment
 * can execute, only something its *source* can be checked against:
 *
 * 1. Updates the document — clicking the toggle sets/removes the `dark`
 *    class on `<html>`, the actual DOM mutation `useTheme`/`useColorMode`
 *    perform and the same hook Element Plus's `dark/css-vars.css` and this
 *    project's own `html.dark` block key off (verified live, not stubbed).
 * 2. Persists — the choice survives via `localStorage`, `useColorMode`'s
 *    own persistence, under the key `useTheme.ts` names explicitly rather
 *    than a hand-rolled `vueuse-color-scheme` literal.
 * 3. Switches the `--el-*` variables — verified as a source contract:
 *    `element-reset/theme.css`'s `html.dark` block re-declares the five
 *    project-owned `--el-color-*` hues to different values than `:root`,
 *    and `element-reset/index.css` imports Element Plus's own
 *    `dark/css-vars.css` (which re-declares every other `--el-bg-color*` /
 *    `--el-text-color*` / `--el-border-color*` slot) — the same file a real
 *    browser's cascade resolves from, so this is the closest honest proxy
 *    available in this test environment.
 *
 * "No screen renders a hardcoded colour" is checked here too, as a
 * repo-wide source scan — every `.vue`/`.ts` file under `src/` (excluding
 * the token-definition files themselves, where a literal hex is the whole
 * point) is grepped for a hex colour literal.
 */

const THEME_CSS_PATH = resolve(__dirname, '../../src/assets/styles/element-reset/theme.css')
const INDEX_CSS_PATH = resolve(__dirname, '../../src/assets/styles/element-reset/index.css')

// The only two files where a literal hex colour is the intended content —
// the five project-owned hues themselves (theme.css) and the one hand-built
// exception the ELEMENT-PLUS.md standing exceptions call out (a stacked
// proportional distribution bar, coloured via inline `background` per
// segment computed from a status token's own `--el-*` value, not a hex).
const HARDCODED_COLOUR_ALLOWLIST = [
  'src/assets/styles/element-reset/theme.css'
]

describe('theme toggle (GitHub issue #44, PRD-010 "Polish")', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })

  it('updates the document and persists the choice when toggled on', async () => {
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    const wrapper = mount(ThemeToggle, { attachTo: document.body })

    await wrapper.find('button').trigger('click')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    wrapper.unmount()
  })

  it('updates the document and persists the choice when toggled back off', async () => {
    const wrapper = mount(ThemeToggle, { attachTo: document.body })

    await wrapper.find('button').trigger('click')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await wrapper.find('button').trigger('click')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    wrapper.unmount()
  })

  it('reflects the persisted choice in the toggle label/aria-label on mount', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    const wrapper = mount(ThemeToggle, { attachTo: document.body })
    await nextTick()

    expect(wrapper.find('button').attributes('aria-label')).toBe('Switch to light theme')

    wrapper.unmount()
  })

  it('re-declares the --el-* colour variables under html.dark (source contract)', () => {
    const css = readFileSync(THEME_CSS_PATH, 'utf-8')

    const rootBlockMatch = /:root\s*\{([\s\S]*?)\n\}/.exec(css)
    const darkBlockMatch = /html\.dark\s*\{([\s\S]*?)\n\}/.exec(css)

    expect(rootBlockMatch, 'expected a :root block in element-reset/theme.css').not.toBeNull()
    expect(darkBlockMatch, 'expected an html.dark block in element-reset/theme.css').not.toBeNull()

    const rootBlock = rootBlockMatch![1]!
    const darkBlock = darkBlockMatch![1]!

    for (const hue of ['primary', 'success', 'warning', 'danger', 'info']) {
      const rootValue = new RegExp(`--el-color-${hue}:\\s*(#[0-9A-Fa-f]{6})\\s*;`).exec(rootBlock)?.[1]
      const darkValue = new RegExp(`--el-color-${hue}:\\s*(#[0-9A-Fa-f]{6})\\s*;`).exec(darkBlock)?.[1]

      expect(rootValue, `expected --el-color-${hue} in :root`).toBeDefined()
      expect(darkValue, `expected --el-color-${hue} in html.dark`).toBeDefined()
      expect(darkValue).not.toBe(rootValue)
    }
  })

  it('imports Element Plus\'s dark neutrals so every other --el-* surface/text/border slot switches too', () => {
    const css = readFileSync(INDEX_CSS_PATH, 'utf-8')

    expect(css).toMatch(/@import\s+['"]element-plus\/theme-chalk\/dark\/css-vars\.css['"]/)
  })

  it('no source file under src/ renders a hardcoded hex colour outside the token layer', () => {
    const hexPattern = /#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\b/
    const repoRoot = resolve(__dirname, '../..')
    const srcRoot = resolve(repoRoot, 'src')

    function listSourceFiles (dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          return listSourceFiles(fullPath)
        }

        const ext = extname(entry.name)
        const isSpec = entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts')

        return (ext === '.vue' || ext === '.ts') && !isSpec ? [fullPath] : []
      })
    }

    const offenders: string[] = []

    for (const fullPath of listSourceFiles(srcRoot)) {
      const relativePath = relative(repoRoot, fullPath).split('\\').join('/')

      if (HARDCODED_COLOUR_ALLOWLIST.includes(relativePath)) {
        continue
      }

      const lines = readFileSync(fullPath, 'utf-8').split('\n')

      lines.forEach((line, index) => {
        if (hexPattern.test(line)) {
          offenders.push(`${relativePath}:${index + 1}: ${line.trim()}`)
        }
      })
    }

    expect(offenders, `hardcoded hex colours found outside the token layer:\n${offenders.join('\n')}`).toEqual([])
  })
})
