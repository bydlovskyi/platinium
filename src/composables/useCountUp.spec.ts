import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

import { setPreferredReducedMotion } from '../../tests/support'

function setup (initialValue = 0) {
  const source = ref(initialValue)
  let display!: ReturnType<typeof useCountUp>

  const HostComponent = defineComponent({
    setup () {
      display = useCountUp(source)

      return () => null
    }
  })

  mount(HostComponent)

  return { source, display }
}

describe('useCountUp', () => {
  afterEach(() => {
    setPreferredReducedMotion('no-preference')
  })

  it('starts at 0 before the source ever has a real value', () => {
    const { display } = setup(0)

    expect(display.value).toBe(0)
  })

  it('eventually reaches the source value once it goes from 0 to a real number (first load)', async () => {
    const { source, display } = setup(0)

    source.value = 42

    await vi.waitFor(() => {
      expect(display.value).toBe(42)
    })
  })

  it('jumps straight to the final value with no animation when prefers-reduced-motion is set', async () => {
    setPreferredReducedMotion('reduce')

    const { source, display } = setup(0)

    source.value = 42
    await nextTick()

    // No `vi.waitFor`: under reduced motion the final value must be there on the next tick.
    expect(display.value).toBe(42)
  })

  it('also transitions a later source change once already started (e.g. a refetch), converging to the new value', async () => {
    const { source, display } = setup(0)

    source.value = 10
    await vi.waitFor(() => expect(display.value).toBe(10))

    source.value = 25

    await vi.waitFor(() => {
      expect(display.value).toBe(25)
    })
  })

  it('does not restart the count-up from 0 on a later source change (only the first 0 → value transition counts up from 0)', async () => {
    const { source, display } = setup(0)

    source.value = 10
    await vi.waitFor(() => expect(display.value).toBe(10))

    source.value = 25

    await nextTick()
    expect(display.value).not.toBe(0)
  })
})
