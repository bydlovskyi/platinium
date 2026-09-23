import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

/**
 * Declarative guard reading `meta.requiresAuth` / `meta.requiresAnonymous`
 * (`dts/global.d.ts`) — no per-route logic, no component-level access
 * check. `to.fullPath` (not just `to.path`) is preserved in `redirect` so
 * an intended destination's own query/hash string survives the round trip
 * through login.
 */
export const routeGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth === true && !authStore.isAuthenticated) {
    next({ name: routeNames.login, query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresAnonymous === true && authStore.isAuthenticated) {
    next({ name: routeNames.home })
    return
  }

  next()
}
