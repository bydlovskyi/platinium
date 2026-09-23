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
