import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

// jsdom has no CSS cascade, so `--duration-base` is empty and the leave wait is 0ms.

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

    // Must be synchronous so the leave class applies before the animation plays.
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
