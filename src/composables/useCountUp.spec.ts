import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

import { setPreferredReducedMotion } from '../../tests/support'

/**
 * `useCountUp` unit tests (GitHub issue #42, PRD-010 "Motion" — "dashboard
 * headline figures count into place on first load"). Mirrors
 * `useBulkOperations.spec.ts`'s convention of exercising the composable
 * through a trivial host component. `Dashboard.spec.ts` and
 * `tests/integration/reduced-motion.spec.ts` already cover this composable
 * wired into the real `el-statistic` figures end to end — these tests cover
 * the composable's own contract in isolation: first-load-only counting, and
 * the reduced-motion bypass.
 */

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

    // No `vi.waitFor` grace period — under the preference this must already
    // be the final value on the very next tick, not merely converge to it
    // eventually the way the non-reduced-motion test above does.
    expect(display.value).toBe(42)
  })

  it('also transitions a later source change once already started (e.g. a refetch), converging to the new value', async () => {
    const { source, display } = setup(0)

    source.value = 10
    await vi.waitFor(() => expect(display.value).toBe(10))

    // A later change to `source` (e.g. a refetch) still eases to the new
    // value rather than jumping — `hasStarted` only gates *when counting
    // begins* (the very first 0 → real-value transition, matching "on first
    // load"), not whether subsequent changes animate at all.
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

    // Immediately after the change, the display should already be
    // transitioning from its previous value (10) rather than having reset
    // to 0 — proving "first load" framing rather than "every change resets
    // and recounts from zero."
    await nextTick()
    expect(display.value).not.toBe(0)
  })
})
