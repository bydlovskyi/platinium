import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

/**
 * `useRowLeaveAnimation` unit tests (GitHub issue #42, PRD-010 "Motion" —
 * "a deleted row animates out"). Mirrors `useBulkOperations.spec.ts`'s/
 * `useCsvExport.spec.ts`'s convention of exercising the composable through a
 * trivial host component rather than mocking any of its own internals.
 *
 * `playLeave`'s wait reads `--duration-base`'s live computed value off
 * `document.documentElement` — jsdom has no CSS cascade/`@media` support (see
 * `tests/integration/reduced-motion.spec.ts`'s own file comment for the full
 * explanation), so nothing sets that custom property here and it resolves to
 * `''`, which the composable's own parsing falls back to `0`. That keeps
 * these tests fast and deterministic while still proving the real contract:
 * keys are added to `leavingRowKeys` synchronously and removed once
 * `playLeave` resolves, regardless of how long the wait actually is.
 */

function setup () {
  let rowLeave!: ReturnType<typeof useRowLeaveAnimation>

  const HostComponent = defineComponent({
    setup () {
      rowLeave = useRowLeaveAnimation()

      return () => null
    }
  })

  mount(HostComponent)

  return { rowLeave }
}

describe('useRowLeaveAnimation', () => {
  it('starts with no leaving keys', () => {
    const { rowLeave } = setup()

    expect(rowLeave.leavingRowKeys.value).toEqual([])
  })

  it('adds the given keys to leavingRowKeys immediately, then clears them once the wait resolves', async () => {
    const { rowLeave } = setup()

    const playPromise = rowLeave.playLeave(['row-1', 'row-2'])

    // Synchronous: the caller's `row-class-name`/`<TransitionGroup>` needs
    // the key present on this same tick, before any animation has had a
    // chance to play, or the leave class would never actually apply.
    expect(rowLeave.leavingRowKeys.value).toEqual(['row-1', 'row-2'])

    await playPromise

    expect(rowLeave.leavingRowKeys.value).toEqual([])
  })

  it('does not clear keys from a separate, still-in-flight playLeave call', async () => {
    const { rowLeave } = setup()

    const firstPlay = rowLeave.playLeave(['row-1'])
    const secondPlay = rowLeave.playLeave(['row-2'])

    expect(rowLeave.leavingRowKeys.value).toEqual(['row-1', 'row-2'])

    await firstPlay

    // `row-2` belongs to the still-pending `secondPlay` call — a naive
    // "clear everything" implementation would wipe it out here too.
    expect(rowLeave.leavingRowKeys.value).toEqual(['row-2'])

    await secondPlay

    expect(rowLeave.leavingRowKeys.value).toEqual([])
  })

  it('resolves without waiting when given an empty key list (a bulk operation with zero successes)', async () => {
    const { rowLeave } = setup()

    await expect(rowLeave.playLeave([])).resolves.toBeUndefined()
    expect(rowLeave.leavingRowKeys.value).toEqual([])
  })
})
