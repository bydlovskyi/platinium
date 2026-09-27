// Keeps the `home` route name and `/` path; no requiredCapability since reads are never gated.
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
