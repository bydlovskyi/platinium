export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: routeNames.login,
    component: () => import('./Login.vue'),
    meta: {
      requiresAnonymous: true
    }
  }
]
