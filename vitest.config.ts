import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'

import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],

      // Forces Vite to process element-plus as source rather than
      // pre-bundling it as an external dependency. Without this, el-form's
      // internal `new AsyncValidator(...)` call (async-validator is a CJS
      // package) hits a default-export interop mismatch under Vitest's
      // dependency handling and every `el-form-item`'s validation silently
      // no-ops (`validate()` always resolves valid, regardless of rules) —
      // a known upstream compatibility gap, see
      // https://github.com/element-plus/element-plus/issues/15053. Inlining
      // element-plus routes it through the same transform pipeline as
      // first-party source, which resolves the interop correctly.
      server: {
        deps: {
          inline: ['element-plus']
        }
      },

      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,vue}'],
        exclude: [
          'src/**/*.d.ts',
          'src/features/platform/api/schema.ts',
          'src/router/route-names-registry.ts',
          'src/features/platform/modals/modals-registry.ts',
          'src/main.ts'
        ]
      },

      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            include: ['src/**/*.{spec,test}.ts']
          }
        },
        {
          extends: true,
          test: {
            name: 'integration',
            include: ['tests/integration/**/*.{spec,test}.ts']
          }
        }
      ]
    }
  })
)
