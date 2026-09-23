/**
 * Tickets routes (GitHub issue #34, PRD-006 "Tickets list"). Registers only
 * the list route — create/edit routes are a later slice (issue #35, per this
 * issue's explicit scope). Mirrors `src/views/events/events.routes.ts`'s
 * shape for the list route.
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
  }
]
