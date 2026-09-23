import { homeRoutes } from '@/views/home/home.routes'
import { authRoutes } from '@/views/auth/auth.routes'
import { eventsRoutes } from '@/views/events/events.routes'
import { categoriesRoutes } from '@/views/categories/categories.routes'
import { notFoundRoutes } from '@/views/not-found/not-found.routes'

const routes: RouteRecordRaw[] = [
  ...homeRoutes,
  ...authRoutes,
  ...eventsRoutes,
  ...categoriesRoutes,

  // Catch-all must be registered last so every named route above matches first.
  ...notFoundRoutes
]

export {
  routes
}
