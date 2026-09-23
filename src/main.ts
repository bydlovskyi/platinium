import { createApp } from 'vue'
import App from '@/App.vue'

import { router } from '@/router'

import {
  VueGlobalPropertiesPlugin
} from '@/plugins'

import '@/assets/styles/main.css'

const app = createApp(App)

// The router is deliberately not installed here. `app.use(router)` triggers
// Vue Router's initial navigation immediately, which would run the route
// guard against the auth store's pre-restore state. It is installed further
// down, only after session restore has completed — see the bootstrap chain
// below.
app
  .use(createPinia())
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

/**
 * Signing out — explicit (a future account-menu action) or implicit (a
 * 401's `sessionExpired` event, see `interceptors/response.interceptor.ts`)
 * — drops the administrator back to login, preserving where they were.
 * Wired here rather than inside the auth store, which must stay ignorant of
 * the router per the store layer's dependency rules; main.ts bootstrap code
 * is not bound by that layering.
 */
function redirectToLogin (): void {
  if (router.currentRoute.value.name !== routeNames.login) {
    void router.push({ name: routeNames.login, query: { redirect: router.currentRoute.value.fullPath } })
  }
}

// A 401 means the session is already invalid server-side — endSession()
// clears client-side state without calling POST /auth/logout again (that
// would just 401 a second time and re-publish this same event). It
// publishes `authSignedOut` below, which performs the actual redirect, for
// this event and for any future explicit sign-out alike.
helpers.eventEmitter.listen('sessionExpired', () => {
  useAuthStore().endSession()
})

helpers.eventEmitter.listen('authSignedOut', redirectToLogin)

enableMockingIfNeeded()
  .catch((error: unknown) => {
    // A worker that fails to register (an unsupported browser, a stale
    // service-worker registration, a blocked `mockServiceWorker.js`) must not
    // take the app down with it: log it and mount against the real network
    // rather than leaving a blank page behind an unresolved promise.
    console.error('[mocks] failed to start the MSW worker; continuing without it.', error)
  })
  // Session bootstrap must complete before the router is installed —
  // installing it is what triggers Vue Router's initial navigation and the
  // first route-guard evaluation, so restore() has to resolve first.
  // Otherwise the guard races the restore and a reload on an admin route
  // bounces to login even with a valid persisted token (see PRD-002
  // "Further Notes").
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
