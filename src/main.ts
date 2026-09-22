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

enableMockingIfNeeded()
  .catch((error: unknown) => {
    // A worker that fails to register (an unsupported browser, a stale
    // service-worker registration, a blocked `mockServiceWorker.js`) must not
    // take the app down with it: log it and mount against the real network
    // rather than leaving a blank page behind an unresolved promise.
    console.error('[mocks] failed to start the MSW worker; continuing without it.', error)
  })
  .then(() => router.isReady())
  .then(() => {
    app.mount('#app')
  })

export {
  app
}
