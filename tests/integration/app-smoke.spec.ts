import HomeComponent from '@/views/home/components/HomeComponent.vue'

import { mountWithRouterAndPinia } from '../support'

describe('harness smoke', () => {
  it('mounts a view behind a real router and a fresh Pinia instance', async () => {
    const { wrapper } = await mountWithRouterAndPinia(HomeComponent)

    expect(wrapper.text()).toContain('Home Component')
  })
})
