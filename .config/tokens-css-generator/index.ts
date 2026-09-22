import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

import { semanticTokens } from '../../src/assets/styles/tokens'

const SOURCE = 'src/assets/styles/tokens.ts'
const OUTPUT = 'src/assets/styles/tokens.css'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '../..')

export function generateTokensCssSource (): string {
  const lightDeclarations = Object.entries(semanticTokens)
    .map(([name, value]) => `  --${name}: ${value.light};`)
    .join('\n')

  const darkDeclarations = Object.entries(semanticTokens)
    .map(([name, value]) => `  --${name}: ${value.dark};`)
    .join('\n')

  return `/* Auto-generated from ${SOURCE} by TokensCssGenerator - do not edit manually */
:root {
${lightDeclarations}
}

:root[data-theme='dark'] {
${darkDeclarations}
}
`
}

function writeTokensCssFile (content: string): void {
  const outputPath = path.resolve(PROJECT_ROOT, OUTPUT)
  const outputDir = path.dirname(outputPath)

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(outputPath, content, 'utf-8')
}

function generateTokensCss (): void {
  const source = generateTokensCssSource()
  writeTokensCssFile(source)
}

export const TokensCssGenerator = (): Plugin => ({
  name: 'vite-plugin-tokens-css-generator',
  buildStart: generateTokensCss,
  configureServer: (server) => {
    const sourcePath = path.resolve(PROJECT_ROOT, SOURCE)

    server.watcher.add(sourcePath)
    server.watcher.on('all', (_, filePath) => {
      if (filePath === sourcePath) {
        generateTokensCss()
      }
    })
  }
})
