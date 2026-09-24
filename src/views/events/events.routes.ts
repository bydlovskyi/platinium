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
  },
  {
    path: '/events/new',
    name: routeNames.eventCreate,
    component: () => import('./components/EventForm.vue'),
    meta: {
      label: 'Create event',
      requiresAuth: true,
      layout: 'admin',
      requiredCapability: { entity: 'events', operation: 'create' }
    }
  },
  {
    path: '/events/:id/edit',
    name: routeNames.eventEdit,
    component: () => import('./components/EventForm.vue'),
    meta: {
      label: 'Edit event',
      requiresAuth: true,
      layout: 'admin',
      requiredCapability: { entity: 'events', operation: 'update' }
    }
  }
]
