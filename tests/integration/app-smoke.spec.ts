import PageHeader from '@/components/PageHeader.vue'

import { mountWithRouterAndPinia } from '../support'

describe('harness smoke', () => {
  it('mounts a view behind a real router and a fresh Pinia instance', async () => {
    const { wrapper } = await mountWithRouterAndPinia(PageHeader, { props: { title: 'Smoke test' } })

    expect(wrapper.text()).toContain('Smoke test')
  })
})
