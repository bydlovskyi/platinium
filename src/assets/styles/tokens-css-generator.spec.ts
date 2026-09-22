/**
 * `tokens.css` is generated from `tokens.ts` by the `TokensCssGenerator`
 * Vite plugin (`.config/tokens-css-generator`) on `buildStart`. This test
 * guards against the checked-in `tokens.css` drifting from what the
 * manifest would currently generate (e.g. someone editing tokens.ts without
 * re-running `npm run dev`/`build` to regenerate the CSS file).
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { generateTokensCssSource } from '../../../.config/tokens-css-generator'

const tokensCssPath = path.resolve(process.cwd(), 'src/assets/styles/tokens.css')

describe('tokens.css generation', () => {
  it('matches the source generated from the current tokens.ts manifest', () => {
    const checkedInCss = readFileSync(tokensCssPath, 'utf-8')
    const generatedCss = generateTokensCssSource()

    expect(checkedInCss).toBe(generatedCss)
  })
})
