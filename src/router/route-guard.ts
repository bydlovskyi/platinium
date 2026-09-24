import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

/**
 * Declarative guard reading `meta.requiresAuth` / `meta.requiresAnonymous` /
 * `meta.requiredCapability` (`dts/global.d.ts`) — no per-route logic, no
 * component-level access check. `to.fullPath` (not just `to.path`) is
 * preserved in `redirect` so an intended destination's own query/hash
 * string survives the round trip through login.
 *
 * The capability check runs after both auth checks: it only makes sense
 * once `requiresAuth` has already confirmed there is a signed-in user to
 * ask `useCapability` about, and `requiresAnonymous` routes never carry a
 * `requiredCapability` in the first place.
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

  const requiredCapability = to.meta.requiredCapability

  if (requiredCapability) {
    const { canDo } = useCapability()

    if (!canDo(requiredCapability.entity, requiredCapability.operation)) {
      next({ name: routeNames.forbidden })
      return
    }
  }

  next()
}
