import { mount } from '@vue/test-utils'

import HomeComponent from './HomeComponent.vue'

describe('HomeComponent', () => {
  it('mounts and renders its heading', () => {
    const wrapper = mount(HomeComponent)

    expect(wrapper.text()).toContain('Home Component')
  })
})
