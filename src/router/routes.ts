import { homeRoutes } from '@/views/home/home.routes'
import { authRoutes } from '@/views/auth/auth.routes'

const routes: RouteRecordRaw[] = [
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  },

  ...homeRoutes,
  ...authRoutes
]

export {
  routes
}
