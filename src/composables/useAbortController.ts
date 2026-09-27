type TApiSignalCallback<T> = (signal: AbortSignal) => T

export function useAbortController<TKeys extends PropertyKey> () {
  const abortControllers = new Map<TKeys, AbortController>()

  function call<TReturned> (key: TKeys, callback: TApiSignalCallback<TReturned>) {
    abort(key)
    const controller = new AbortController()
    abortControllers.set(key, controller)

    return callback(controller.signal)
  }

  function abort (key: TKeys) {
    abortControllers.get(key)?.abort()
  }

  function abortAll () {
    abortControllers.forEach(controller => controller.abort())
  }

  onUnmounted(abortAll)

  return {
    call,
    abort,
    abortAll
  }
}
