/**
 * Confirms the global `prefers-reduced-motion: reduce` rule exists in
 * base.css with the expected properties. Asserting against the raw CSS
 * source (rather than a jsdom computed-style check) is the more meaningful
 * signal here: jsdom does not evaluate `@media (prefers-reduced-motion)`
 * against computed styles, and no component consumes motion tokens yet in
 * this slice (that arrives in #42) — so there is nothing to mount and
 * observe. Reading the stylesheet source directly verifies the actual rule
 * a browser will apply, without faking a media-query match.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

const baseCssPath = path.resolve(process.cwd(), 'src/assets/styles/base.css')
const baseCssSource = readFileSync(baseCssPath, 'utf-8')

describe('reduced-motion baseline rule', () => {
  it('defines a global @media (prefers-reduced-motion: reduce) block', () => {
    expect(baseCssSource).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })

  it('forces near-instant animation and transition durations', () => {
    expect(baseCssSource).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
    expect(baseCssSource).toMatch(/animation-iteration-count:\s*1\s*!important/)
    expect(baseCssSource).toMatch(/transition-duration:\s*0\.01ms\s*!important/)
  })

  it('forces synchronous scroll behavior', () => {
    expect(baseCssSource).toMatch(/scroll-behavior:\s*auto\s*!important/)
  })

  it('applies the rule universally (targets * and its pseudo-elements)', () => {
    const mediaBlockMatch = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(baseCssSource)

    expect(mediaBlockMatch).not.toBeNull()
    expect(mediaBlockMatch?.[1]).toMatch(/\*,\s*\n\s*\*::before,\s*\n\s*\*::after/)
  })
})
