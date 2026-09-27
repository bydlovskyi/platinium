// Reads the live `--duration-base` token, which is `0s` under prefers-reduced-motion, so the wait is skipped.
function currentLeaveDurationMs (): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--duration-base').trim()

  if (raw.endsWith('ms')) {
    return Number.parseFloat(raw)
  }

  if (raw.endsWith('s')) {
    return Number.parseFloat(raw) * 1000
  }

  return 0
}

function wait (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function useRowLeaveAnimation () {
  const leavingRowKeys = ref<string[]>([])

  async function playLeave (keys: string[]): Promise<void> {
    leavingRowKeys.value = [...leavingRowKeys.value, ...keys]

    await wait(currentLeaveDurationMs())

    leavingRowKeys.value = leavingRowKeys.value.filter(key => !keys.includes(key))
  }

  return {
    leavingRowKeys,
    playLeave
  }
}
