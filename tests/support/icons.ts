import type { VueWrapper } from '@vue/test-utils'

import Icon from '@/features/platform/icons/components/Icon.vue'

export function hasIcon (wrapper: VueWrapper, name: TIcons): boolean {
  return wrapper.findAllComponents(Icon).some(icon => icon.props('name') === name)
}
