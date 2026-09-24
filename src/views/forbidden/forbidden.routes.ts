/**
 * 403 route (GitHub issue #37, PRD-007 "Role-based permissions"). Registered
 * before the catch-all in `src/router/routes.ts` so it resolves by name
 * (`routeNames.forbidden`), not by falling through to `notFoundRoutes`.
 * `requiresAuth: true` because only a signed-in user can fail a capability
 * check in the first place — an anonymous visitor still hits the login
 * redirect first, per `src/router/route-guard.ts`'s check ordering.
 */
export const forbiddenRoutes: RouteRecordRaw[] = [
  {
    path: '/403',
    name: routeNames.forbidden,
    component: () => import('./Forbidden.vue'),
    meta: {
      label: 'Access denied',
      requiresAuth: true,
      layout: 'admin'
    }
  }
]
