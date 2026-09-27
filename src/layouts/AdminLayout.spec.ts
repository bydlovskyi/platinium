import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'

import AdminLayout from './AdminLayout.vue'

async function mountLayoutWithCountingPage () {
  let mountCount = 0

  const CountingPage = defineComponent({
    setup () {
      onMounted(() => {
        mountCount++
      })

      return () => h('div', 'page')
    }
  })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/list', component: CountingPage },
      { path: '/items/:id', component: CountingPage }
    ]
  })

  await router.push('/list')
  await router.isReady()

  mount(AdminLayout, { global: { plugins: [createPinia(), router] } })
  await flushPromises()

  return { router, getMountCount: () => mountCount }
}

describe('AdminLayout', () => {
  it('keeps the page mounted when only the query changes', async () => {
    const { router, getMountCount } = await mountLayoutWithCountingPage()

    await router.push('/list?search=vip&page=2')
    await flushPromises()

    expect(getMountCount()).toBe(1)
  })

  it('remounts the page when a route param changes', async () => {
    const { router, getMountCount } = await mountLayoutWithCountingPage()

    await router.push('/items/1')
    await flushPromises()
    await router.push('/items/2')

    await vi.waitFor(() => {
      expect(getMountCount()).toBe(3)
    })
  })
})
