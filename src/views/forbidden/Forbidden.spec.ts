import NotFound from '../not-found/NotFound.vue'
import Forbidden from './Forbidden.vue'
import ForbiddenIllustration from '@/components/illustrations/ForbiddenIllustration.vue'
import NotFoundIllustration from '@/components/illustrations/NotFoundIllustration.vue'

import { mountWithRouterAndPinia } from '../../../tests/support'

/**
 * 403 page (GitHub issue #41, PRD-010's testing boundary: "the error
 * variant" — `el-result` component tested). Mirrors `NotFound.spec.ts`, and
 * also locks in that the two `el-result` pages are visually distinct from
 * each other (issue #41's core requirement: conflating states is the bug).
 */
describe('Forbidden', () => {
  it('shows the forbidden illustration, a way back, and no other state illustration', async () => {
    const { wrapper } = await mountWithRouterAndPinia(Forbidden, { initialRoute: '/login' })

    expect(wrapper.text()).toContain('Access denied')
    expect(wrapper.findComponent(ForbiddenIllustration).exists()).toBe(true)
    expect(wrapper.findComponent(NotFoundIllustration).exists()).toBe(false)

    const backButton = wrapper.findAll('a, button').find(el => el.text().includes('Back to dashboard'))
    expect(backButton).toBeDefined()
  })

  it('renders a different illustration than the 404 page for the same "el-result" shape', async () => {
    const forbidden = await mountWithRouterAndPinia(Forbidden, { initialRoute: '/login' })
    const notFound = await mountWithRouterAndPinia(NotFound, { initialRoute: '/login' })

    expect(forbidden.wrapper.findComponent(ForbiddenIllustration).exists()).toBe(true)
    expect(notFound.wrapper.findComponent(ForbiddenIllustration).exists()).toBe(false)
  })
})
