export const ticketsRoutes: RouteRecordRaw[] = [
  {
    path: '/tickets',
    name: routeNames.tickets,
    component: () => import('./Tickets.vue'),
    meta: {
      label: 'Tickets',
      requiresAuth: true,
      layout: 'admin'
    }
  },
  {
    path: '/tickets/new',
    name: routeNames.ticketCreate,
    component: () => import('./components/TicketForm.vue'),
    meta: {
      label: 'Create ticket',
      requiresAuth: true,
      layout: 'admin',
      requiredCapability: { entity: 'tickets', operation: 'create' }
    }
  },
  {
    path: '/tickets/:id/edit',
    name: routeNames.ticketEdit,
    component: () => import('./components/TicketForm.vue'),
    meta: {
      label: 'Edit ticket',
      requiresAuth: true,
      layout: 'admin',
      requiredCapability: { entity: 'tickets', operation: 'update' }
    }
  }
]
