export const categoriesRoutes: RouteRecordRaw[] = [
  {
    path: '/categories',
    name: routeNames.categories,
    component: () => import('./Categories.vue'),
    meta: {
      label: 'Categories',
      requiresAuth: true,
      layout: 'admin'
    }
  }
]
