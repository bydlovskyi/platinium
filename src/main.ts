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
  .use(VueGlobalPropertiesPlugin)

async function enableMockingIfNeeded (): Promise<void> {
  if (!import.meta.env.DEV) {
    return
  }

  const { worker, installChaosDebugSurface, warnOnUnhandledApiRequest } = await import('@/mocks/browser')

  installChaosDebugSurface()

  await worker.start({ onUnhandledRequest: warnOnUnhandledApiRequest })
}

function redirectToLogin (): void {
  if (router.currentRoute.value.name !== routeNames.login) {
    void router.push({ name: routeNames.login, query: { redirect: router.currentRoute.value.fullPath } })
  }
}

helpers.eventEmitter.listen('sessionExpired', () => {
  useAuthStore().endSession()
})

helpers.eventEmitter.listen('authSignedOut', redirectToLogin)

enableMockingIfNeeded()
  .catch((error: unknown) => {
    console.error('[mocks] failed to start the MSW worker; continuing without it.', error)
  })
  .then(() => useAuthStore().restore())
  .then(() => {
    app.use(router)
  })
  .then(() => router.isReady())
  .then(() => {
    app.mount('#app')
  })

export {
  app
}
