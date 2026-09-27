import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

// Redirects keep `to.fullPath` so query/hash survive the login round trip.
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
