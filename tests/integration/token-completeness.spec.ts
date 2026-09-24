import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Design-token completeness (issue #46, PRD-008's closing gap review —
 * "deep modules confirmed exhaustively tested: … token completeness").
 *
 * jsdom never loads this project's global stylesheets (nothing under
 * `tests/` imports `element-reset/index.css` or `theme.css`), so — the same
 * limitation `theme-toggle.spec.ts` and `reduced-motion.spec.ts` already
 * document — a token's *cascade* cannot be exercised here. What can be
 * verified, and is exhaustive rather than a spot check, is the *source
 * contract*: every token this project declares is complete across both
 * themes and every derived scale it promises, parsed directly out of the
 * two files that are this project's entire colour/motion/radius layer
 * (`src/assets/styles/theme.css`'s `@theme` block, `element-reset/theme.css`).
 */

const THEME_TOKENS_PATH = resolve(__dirname, '../../src/assets/styles/theme.css')
const ELEMENT_RESET_THEME_PATH = resolve(__dirname, '../../src/assets/styles/element-reset/theme.css')

const themeTokensSource = readFileSync(THEME_TOKENS_PATH, 'utf-8')
const elementResetThemeSource = readFileSync(ELEMENT_RESET_THEME_PATH, 'utf-8')

/** Slices a CSS source between a selector's `{` and its matching top-level `}`. */
function ruleBody (source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`)

  if (start === -1) {
    throw new Error(`Selector "${selector}" not found`)
  }

  const braceStart = source.indexOf('{', start)
  let depth = 0

  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') {
      depth++
    }
    if (source[i] === '}') {
      depth--

      if (depth === 0) {
        return source.slice(braceStart + 1, i)
      }
    }
  }

  throw new Error(`Unbalanced braces for selector "${selector}"`)
}

function declaredCustomProperties (body: string): Set<string> {
  return new Set(Array.from(body.matchAll(/--([a-zA-Z0-9-]+)\s*:/g), match => match[1]!))
}

const HUES = ['primary', 'success', 'warning', 'danger', 'info']
const HUE_VARIANTS = ['', '-light-3', '-light-5', '-light-7', '-light-8', '-light-9', '-dark-2']

describe('design tokens — completeness (issue #46)', () => {
  describe('colour hue ladder', () => {
    const lightRoot = declaredCustomProperties(ruleBody(elementResetThemeSource, ':root'))
    const darkRoot = declaredCustomProperties(ruleBody(elementResetThemeSource, 'html.dark'))

    it.each(HUES)('%s has every ladder step (base, light-3/5/7/8/9, dark-2) in :root', (hue) => {
      for (const variant of HUE_VARIANTS) {
        expect(lightRoot.has(`el-color-${hue}${variant}`)).toBe(true)
      }
    })

    it.each(HUES)('%s has every ladder step re-declared under html.dark', (hue) => {
      for (const variant of HUE_VARIANTS) {
        expect(darkRoot.has(`el-color-${hue}${variant}`)).toBe(true)
      }
    })

    it('declares exactly the five hues this project owns — no stray or half-built one', () => {
      const declaredHues = new Set(
        Array.from(lightRoot, name => /^el-color-([a-z]+)/.exec(name)?.[1]).filter((hue): hue is string => Boolean(hue))
      )

      expect(declaredHues).toEqual(new Set(HUES))
    })
  })

  describe('motion tokens', () => {
    const themeTokens = declaredCustomProperties(ruleBody(themeTokensSource, '@theme'))
    const elementResetRoot = declaredCustomProperties(ruleBody(elementResetThemeSource, ':root'))

    it('declares both duration steps and both easing curves', () => {
      expect(themeTokens.has('duration-fast')).toBe(true)
      expect(themeTokens.has('duration-base')).toBe(true)
      expect(themeTokens.has('ease-out-token')).toBe(true)
      expect(themeTokens.has('ease-in-out-token')).toBe(true)
    })

    it('maps every duration and easing token onto Element Plus\'s own transition variables', () => {
      expect(elementResetRoot.has('el-transition-duration')).toBe(true)
      expect(elementResetRoot.has('el-transition-duration-fast')).toBe(true)
      expect(elementResetRoot.has('el-transition-function-ease-in-out-bezier')).toBe(true)
      expect(elementResetRoot.has('el-transition-function-fast-bezier')).toBe(true)
    })

    it('zeroes every duration token — including the mapped --el-* ones, not just the source pair — under prefers-reduced-motion', () => {
      const reducedMotionMatch = /@media \(prefers-reduced-motion: reduce\) \{\s*:root \{([\s\S]*?)\}\s*\}/.exec(elementResetThemeSource)

      expect(reducedMotionMatch).not.toBeNull()

      const overrides = reducedMotionMatch![1]!

      for (const name of ['--duration-fast', '--duration-base', '--el-transition-duration', '--el-transition-duration-fast']) {
        expect(new RegExp(`${name}:\\s*0s`).test(overrides)).toBe(true)
      }
    })
  })

  describe('radius scale', () => {
    it('declares exactly the three restricted steps — no fourth radius token slipped in', () => {
      const themeTokens = declaredCustomProperties(ruleBody(themeTokensSource, '@theme'))
      const radiusTokens = Array.from(themeTokens).filter(name => name.startsWith('radius-token-'))

      expect(new Set(radiusTokens)).toEqual(new Set(['radius-token-sm', 'radius-token-md', 'radius-token-lg']))
    })

    it('maps every Element Plus radius slot onto one of the three tokens', () => {
      const elementResetRoot = ruleBody(elementResetThemeSource, ':root')

      expect(/--el-border-radius-base:\s*var\(--radius-token-sm\)/.test(elementResetRoot)).toBe(true)
      expect(/--el-border-radius-small:\s*var\(--radius-token-sm\)/.test(elementResetRoot)).toBe(true)
      expect(/--el-border-radius-round:\s*var\(--radius-token-lg\)/.test(elementResetRoot)).toBe(true)
    })
  })

  describe('elevation scale', () => {
    it('re-declares all three shadow steps under html.dark, not just some', () => {
      const themeTokens = declaredCustomProperties(ruleBody(themeTokensSource, '@theme'))
      const shadowTokens = Array.from(themeTokens).filter(name => name.startsWith('shadow-token-'))

      expect(new Set(shadowTokens)).toEqual(new Set(['shadow-token-sm', 'shadow-token-md', 'shadow-token-lg']))

      const darkShadowBlock = declaredCustomProperties(ruleBody(themeTokensSource, 'html.dark'))

      for (const token of shadowTokens) {
        expect(darkShadowBlock.has(token)).toBe(true)
      }
    })
  })
})
