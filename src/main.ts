import { createApp } from 'vue'
import App from '@/App.vue'

import { router } from '@/router'

import {
  VueGlobalPropertiesPlugin
} from '@/plugins'

import '@/assets/styles/main.css'

const app = createApp(App)

app
  .use(createPinia())
  .use(router)
  .use(VueGlobalPropertiesPlugin)

/**
 * Starts the MSW browser worker in development only — never bundled into a
 * production build's request path. `import.meta.env.DEV` is statically
 * replaced by Vite, so the `import('@/mocks/browser')` below is dropped
 * entirely from a production bundle rather than merely skipped at runtime.
 */
async function enableMockingIfNeeded (): Promise<void> {
  if (!import.meta.env.DEV) {
    return
  }

  const { worker, installChaosDebugSurface } = await import('@/mocks/browser')

  installChaosDebugSurface()

  await worker.start({ onUnhandledRequest: 'warn' })
}

enableMockingIfNeeded().then(() => router.isReady()).then(() => {
  app.mount('#app')
})

export {
  app
}
