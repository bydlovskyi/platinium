import type { RouteComponent, RouteRecordRaw } from 'vue-router'

import { routes } from '@/router/routes'

type TLazyRouteComponent = () => Promise<RouteComponent>

// The router holds a navigation until its lazy route component has loaded, and the first load in a worker
// compiles the view and the Element Plus components it pulls in. On a busy CI runner that can outlast
// `vi.waitFor`'s one second, so a spec that waits on a navigation loads its destination up front.
export async function preloadRoutes (...names: string[]): Promise<void> {
  const records = names.map((name) => {
    const record = routes.find((candidate: RouteRecordRaw) => candidate.name === name)

    if (record === undefined || typeof record.component !== 'function') {
      throw new Error(`preloadRoutes(): no lazily loaded route named "${name}".`)
    }

    return record.component as TLazyRouteComponent
  })

  await Promise.all(records.map(load => load()))
}
