/**
 * Counts a numeric source into place (GitHub issue #42, PRD-010 "Motion" —
 * "dashboard headline figures count into place on first load"). A thin
 * wrapper over VueUse's `useTransition` feeding `el-statistic :value`
 * (`Dashboard.vue`).
 *
 * `hasStarted` gates *when counting begins*, not whether it ever happens
 * again: before the source's first real (>0) value, the displayed figure
 * sits at the raw `target` with no transition at all (so a still-loading
 * dashboard never shows a stray animated `0`); from that first real value
 * onward, every subsequent change (a refetch, a different filter) still
 * eases via `useTransition` rather than jumping — "on first load" describes
 * when the *behaviour* switches on, not a one-shot animation that never
 * fires again.
 *
 * `prefers-reduced-motion` bypasses the animation entirely — the final
 * value renders immediately (PRD-010's motion rule is non-negotiable, and a
 * JS-driven `requestAnimationFrame` loop is exactly what base.css's global
 * CSS `!important` transition-duration override cannot stop). Read via
 * VueUse's `usePreferredReducedMotion` rather than the `--duration-base`
 * token (unlike `useRowLeaveAnimation`) because a live `0s` read would divide
 * by zero inside VueUse's own easing math — this only ever needs a boolean
 * gate, and `usePreferredReducedMotion` is the direct, purpose-built VueUse
 * primitive for exactly that gate.
 *
 * Duration and easing both come from this slice's two design tokens, per
 * PRD-010 ("all motion uses the two duration and two easing tokens from the
 * design foundation") — `--duration-base`, read once at setup (the value
 * this composable's caller cares about does not change at runtime), and
 * `--ease-out-token`'s cubic-bezier points duplicated as a literal array
 * because VueUse's `transition` option takes bezier points, not a CSS
 * variable reference.
 */
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
  const reducedMotion = usePreferredReducedMotion()
  const prefersReducedMotion = computed(() => reducedMotion.value === 'reduce')

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
