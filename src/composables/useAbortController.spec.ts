import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

function buildHost () {
  let controller: ReturnType<typeof useAbortController<'a' | 'b'>>

  const HostComponent = defineComponent({
    setup () {
      controller = useAbortController<'a' | 'b'>()

      return () => h('div')
    }
  })

  return {
    wrapper: mount(HostComponent),
    getController: () => controller
  }
}

describe('useAbortController', () => {
  it('aborts the previous signal under the same key when called again', () => {
    const { getController } = buildHost()
    const controller = getController()

    let firstSignal: AbortSignal | undefined

    controller.call('a', (signal) => {
      firstSignal = signal
    })

    expect(firstSignal!.aborted).toBe(false)

    controller.call('a', () => undefined)

    expect(firstSignal!.aborted).toBe(true)
  })

  it('does not abort a different key\'s signal', () => {
    const { getController } = buildHost()
    const controller = getController()

    let signalA: AbortSignal | undefined

    controller.call('a', (signal) => {
      signalA = signal
    })
    controller.call('b', () => undefined)

    expect(signalA!.aborted).toBe(false)
  })

  it('abort(key) aborts only that key\'s signal', () => {
    const { getController } = buildHost()
    const controller = getController()

    let signalA: AbortSignal | undefined
    let signalB: AbortSignal | undefined

    controller.call('a', (signal) => {
      signalA = signal
    })
    controller.call('b', (signal) => {
      signalB = signal
    })

    controller.abort('a')

    expect(signalA!.aborted).toBe(true)
    expect(signalB!.aborted).toBe(false)
  })

  it('abortAll() aborts every tracked signal', () => {
    const { getController } = buildHost()
    const controller = getController()

    let signalA: AbortSignal | undefined
    let signalB: AbortSignal | undefined

    controller.call('a', (signal) => {
      signalA = signal
    })
    controller.call('b', (signal) => {
      signalB = signal
    })

    controller.abortAll()

    expect(signalA!.aborted).toBe(true)
    expect(signalB!.aborted).toBe(true)
  })

  it('aborts every tracked signal when the host component unmounts', () => {
    const { wrapper, getController } = buildHost()
    const controller = getController()

    let signal: AbortSignal | undefined

    controller.call('a', (s) => {
      signal = s
    })

    wrapper.unmount()

    expect(signal!.aborted).toBe(true)
  })

  it('returns the callback\'s own return value', () => {
    const { getController } = buildHost()
    const controller = getController()

    const result = controller.call('a', () => 'ok')

    expect(result).toBe('ok')
  })
})
