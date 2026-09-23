import { homeRoutes } from '@/views/home/home.routes'
import { authRoutes } from '@/views/auth/auth.routes'
import { notFoundRoutes } from '@/views/not-found/not-found.routes'

const routes: RouteRecordRaw[] = [
  ...homeRoutes,
  ...authRoutes,

  // Catch-all must be registered last so every named route above matches first.
  ...notFoundRoutes
]

export {
  routes
}
