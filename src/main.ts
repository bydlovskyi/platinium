import { createApp } from 'vue'
import { START_LOCATION } from 'vue-router'
import App from '@/App.vue'

import { router } from '@/router'

import '@/assets/styles/main.css'

const app = createApp(App)

app.use(createPinia())

async function enableMockingIfNeeded (): Promise<void> {
  // No real backend exists, so the production image opts into the mock API at build time.
  if (!import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return
  }

  const { worker, installChaosDebugSurface, warnOnUnhandledApiRequest } = await import('@/mocks/browser')

  installChaosDebugSurface()

  await worker.start({ onUnhandledRequest: warnOnUnhandledApiRequest })
}

function redirectToLogin (): void {
  // Before the router is installed the guard handles the initial navigation itself, keeping the deep link.
  if (router.currentRoute.value === START_LOCATION || router.currentRoute.value.name === routeNames.login) {
    return
  }

  void router.push({ name: routeNames.login, query: { redirect: router.currentRoute.value.fullPath } })
}

helpers.eventEmitter.listen('sessionExpired', ({ message }) => {
  const authStore = useAuthStore()

  // A stale token found at start-up isn't a session the user was in; only an active session gets the message.
  if (authStore.isAuthenticated) {
    notificationService.warning({ title: 'Signed out', message })
  }

  authStore.endSession()
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
