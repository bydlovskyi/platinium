import PageHeader from '@/components/PageHeader.vue'

import { mountWithRouterAndPinia } from '../support'

/**
 * Mounts `PageHeader` (a stable, dependency-free shared component) purely to
 * prove the test harness itself works — a real router plus a fresh Pinia
 * instance behind `mountWithRouterAndPinia`. Previously mounted the
 * scaffold's `HomeComponent`, removed when the `home` example view was
 * replaced by the real dashboard (GitHub issue #38); any simple, synchronous
 * component serves this smoke test equally well.
 */
describe('harness smoke', () => {
  it('mounts a view behind a real router and a fresh Pinia instance', async () => {
    const { wrapper } = await mountWithRouterAndPinia(PageHeader, { props: { title: 'Smoke test' } })

    expect(wrapper.text()).toContain('Smoke test')
  })
})
