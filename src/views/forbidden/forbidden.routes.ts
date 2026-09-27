// Registered before the catch-all so it resolves by name rather than falling through to 404.
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
