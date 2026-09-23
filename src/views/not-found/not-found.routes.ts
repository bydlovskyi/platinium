/**
 * Catch-all for unmatched URLs (PRD-002 user story 30 / issue #20),
 * replacing the previous silent `redirect: '/'` in `routes.ts`.
 * `requiresAuth: true` so an anonymous visitor hitting an unknown URL is
 * sent to login (there is no shell to show them) while a signed-in
 * administrator sees a real 404 inside `AdminLayout`.
 */
export const notFoundRoutes: RouteRecordRaw[] = [
  {
    path: '/:pathMatch(.*)*',
    name: routeNames.notFound,
    component: () => import('./NotFound.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin'
    }
  }
]
