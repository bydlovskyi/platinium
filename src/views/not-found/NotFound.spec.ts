import NotFound from './NotFound.vue'
import NotFoundIllustration from '@/components/illustrations/NotFoundIllustration.vue'

import { mountWithRouterAndPinia } from '../../../tests/support'

/**
 * 404 page (GitHub issue #41, PRD-010's testing boundary: "the error
 * variant" — `el-result` component tested). Mounted behind a real router
 * (initial route `/login`, so the auth guard never redirects mid-test) so
 * the `router-link`-backed "Back to dashboard" button resolves for real.
 */
describe('NotFound', () => {
  it('shows the not-found illustration, a way back, and no other state illustration', async () => {
    const { wrapper } = await mountWithRouterAndPinia(NotFound, { initialRoute: '/login' })

    expect(wrapper.text()).toContain('Page not found')
    expect(wrapper.findComponent(NotFoundIllustration).exists()).toBe(true)

    const backButton = wrapper.findAll('a, button').find(el => el.text().includes('Back to dashboard'))
    expect(backButton).toBeDefined()
  })
})
