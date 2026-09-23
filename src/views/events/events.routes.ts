export const eventsRoutes: RouteRecordRaw[] = [
  {
    path: '/events',
    name: routeNames.events,
    component: () => import('./Events.vue'),
    meta: {
      label: 'Events',
      requiresAuth: true,
      layout: 'admin'
    }
  }
]
