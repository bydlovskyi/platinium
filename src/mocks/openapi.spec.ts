import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { execFileSync } from 'node:child_process'

import { parse } from 'yaml'

const specPath = resolve(import.meta.dirname, './openapi.yaml')

describe('openapi.yaml', () => {
  it('parses as valid YAML and declares an OpenAPI 3.1 document', () => {
    const raw = readFileSync(specPath, 'utf-8')

    const document = parse(raw) as Record<string, unknown>

    expect(document.openapi).toMatch(/^3\.1\./)
    expect(document.paths).toHaveProperty('/health')
    expect(document.components).toBeDefined()
  })

  it('declares the shared vocabulary this slice is responsible for', () => {
    const raw = readFileSync(specPath, 'utf-8')
    const document = parse(raw) as {
      components: {
        schemas: Record<string, unknown>
        parameters: Record<string, unknown>
        responses: Record<string, unknown>
      }
    }

    expect(Object.keys(document.components.schemas)).toEqual(
      expect.arrayContaining([
        'PaginationMeta',
        'ErrorResponse',
        'ValidationError',
        'EventStatus',
        'TicketStatus',
        'Currency',
        'SortOrder'
      ])
    )

    expect(Object.keys(document.components.parameters)).toEqual(
      expect.arrayContaining(['search', 'sort', 'order', 'page', 'perPage'])
    )

    expect(Object.keys(document.components.responses)).toEqual(
      expect.arrayContaining(['BadRequest', 'Unauthorized', 'NotFound', 'Conflict', 'InternalError'])
    )
  })

  it('generates identical output on repeated runs (deterministic, offline)', () => {
    // Mirrors the exact argv of the `openapi-generate` script in package.json,
    // minus the -o flag, so a regression there is caught here too.
    const generate = (): string => execFileSync(
      'npx',
      ['--no-install', 'openapi-typescript', specPath],
      { encoding: 'utf-8' }
    )

    const first = generate()
    const second = generate()

    expect(first).toBe(second)
    expect(first).toContain('/health')
  })
})
