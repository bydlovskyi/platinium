import { createMemoryHistory, createRouter } from 'vue-router'
import { mount, type ComponentMountingOptions } from '@vue/test-utils'

import { routeGuard } from '@/router/route-guard'
import { routes } from '@/router/routes'

export interface IMountWithRouterAndPiniaOptions<T extends Component> extends ComponentMountingOptions<T> {
  initialRoute?: string
}

export async function mountWithRouterAndPinia<T extends Component> (
  component: T,
  options: IMountWithRouterAndPiniaOptions<T> = {}
) {
  const { initialRoute = '/', global, ...mountingOptions } = options

  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes
  })
  router.beforeEach(routeGuard)

  await router.push(initialRoute)
  await router.isReady()

  const wrapper = mount(component, {
    ...mountingOptions,
    global: {
      ...global,
      plugins: [pinia, router, ...(global?.plugins ?? [])]
    }
  } as ComponentMountingOptions<T>)

  return { wrapper, router, pinia }
}
