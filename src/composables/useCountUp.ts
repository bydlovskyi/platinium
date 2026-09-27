// Mirrors `--ease-out-token`: useTransition takes bezier points, not a CSS variable.
const EASE_OUT_TOKEN: [number, number, number, number] = [0.16, 1, 0.3, 1]

function baseDurationMs (): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--duration-base').trim()

  if (raw.endsWith('ms')) {
    return Number.parseFloat(raw)
  }

  if (raw.endsWith('s')) {
    return Number.parseFloat(raw) * 1000
  }

  return 200
}

export function useCountUp (source: Ref<number>) {
  // Not the `--duration-base` token: a `0s` duration divides by zero in useTransition.
  const reducedMotion = usePreferredReducedMotion()
  const prefersReducedMotion = computed(() => reducedMotion.value === 'reduce')

  // No animation until the first real (>0) value, so a loading dashboard never animates from 0.
  const hasStarted = ref(false)
  const target = ref(0)

  watch(source, (value) => {
    if (!hasStarted.value && value > 0) {
      hasStarted.value = true
    }

    target.value = value
  }, { immediate: true })

  const transitioned = useTransition(target, {
    duration: baseDurationMs(),
    transition: EASE_OUT_TOKEN
  })

  return computed(() => (
    prefersReducedMotion.value || !hasStarted.value ? target.value : Math.round(transitioned.value)
  ))
}
