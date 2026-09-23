/**
 * Tickets routes (GitHub issue #34, PRD-006 "Tickets list"; extended by
 * GitHub issue #35 "Tickets form" with the create/edit routes). Mirrors
 * `src/views/events/events.routes.ts`'s shape exactly — one list route plus
 * a create and an edit route, both served by the same `TicketForm.vue`.
 */
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
      layout: 'admin'
    }
  },
  {
    path: '/tickets/:id/edit',
    name: routeNames.ticketEdit,
    component: () => import('./components/TicketForm.vue'),
    meta: {
      label: 'Edit ticket',
      requiresAuth: true,
      layout: 'admin'
    }
  }
]
