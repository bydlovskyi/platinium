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

      // Inline element-plus so async-validator's CJS interop works; otherwise el-form validate() always passes.
      // https://github.com/element-plus/element-plus/issues/15053
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
