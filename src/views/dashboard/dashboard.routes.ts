/**
 * Dashboard route (GitHub issue #38, PRD-007 "Dashboard") — the post-login
 * landing destination. Keeps the pre-existing `routeNames.home` route name
 * and `/` path (this issue replaces what that route serves, it does not add
 * a second route) even though the view/folder are now named `dashboard` —
 * `routeNames` keys come from a route's own `name:` property, not its folder
 * (`.config/route-names-generator`), so this rename is safe.
 *
 * No `requiredCapability` in `meta`: this is a read, and per PRD-007 "Read is
 * implicitly always allowed and is never gated through here" (see
 * `useCapability`) — both the administrator and viewer roles land here after
 * signing in.
 */
export const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: routeNames.home,
    component: () => import('./Dashboard.vue'),
    meta: {
      label: 'Dashboard',
      requiresAuth: true,
      layout: 'admin'
    }
  }
]
