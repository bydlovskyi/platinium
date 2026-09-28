// Mirrors `--ease-out-token`: useTransition takes bezier points, not a CSS variable.
const EASE_OUT_TOKEN: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function useCountUp (source: MaybeRefOrGetter<number>) {
  // Under reduced motion the token is `0s`, which divides by zero in useTransition, so the preference short-circuits below.
  const reducedMotion = usePreferredReducedMotion()
  const prefersReducedMotion = computed(() => reducedMotion.value === 'reduce')

  // No animation until the first real (>0) value, so a loading dashboard never animates from 0.
  const hasStarted = ref(false)
  const target = ref(0)

  watch(() => toValue(source), (value) => {
    if (!hasStarted.value && value > 0) {
      hasStarted.value = true
    }

    target.value = value
  }, { immediate: true })

  const transitioned = useTransition(target, {
    duration: readDurationToken('--duration-base', 200),
    transition: EASE_OUT_TOKEN
  })

  return computed(() => (
    prefersReducedMotion.value || !hasStarted.value ? target.value : Math.round(transitioned.value)
  ))
}
