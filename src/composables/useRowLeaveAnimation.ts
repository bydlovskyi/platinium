function wait (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function useRowLeaveAnimation () {
  const leavingRowKeys = ref<string[]>([])

  async function playLeave (keys: string[]): Promise<void> {
    leavingRowKeys.value = [...leavingRowKeys.value, ...keys]

    // Under prefers-reduced-motion the token is `0s`, so the wait is skipped.
    await wait(readDurationToken('--duration-base', 0))

    leavingRowKeys.value = leavingRowKeys.value.filter(key => !keys.includes(key))
  }

  return {
    leavingRowKeys,
    playLeave
  }
}
