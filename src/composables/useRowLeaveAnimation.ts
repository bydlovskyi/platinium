/**
 * Row-leave animation composable (GitHub issue #42, PRD-010 "Motion" — "a
 * deleted row animates out"). Owns the one piece of timing every entity list
 * screen's delete flow needs and would otherwise duplicate three times
 * (Events/Categories/Tickets, single delete and bulk delete alike): mark the
 * row key(s) about to disappear as "leaving" (fed straight into
 * `AppDataTable`'s `leavingRowKeys` prop, which turns it into `el-table`'s
 * `row-class-name`/the mobile `<TransitionGroup>`'s leave class), wait one
 * beat for the CSS animation in base.css (`.app-table-row-leaving`) to
 * actually play, then let the caller remove the row and refetch.
 *
 * The wait reads `--duration-base`'s *live* computed value off
 * `document.documentElement` rather than a hardcoded `200` — under
 * `prefers-reduced-motion: reduce` that variable resolves to `0s`
 * (element-reset/theme.css), so this composable automatically skips the
 * wait for anyone with the preference set, with no separate reduced-motion
 * branch to keep in sync by hand. `usePreferredReducedMotion` is not needed
 * here for that reason — reading the token is the single source of truth
 * both the CSS animation and this composable's own delay share.
 */
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

/**
 * Returned as-is (not `readonly`) so `leavingRowKeys` binds straight to
 * `AppDataTable`'s prop of the same name, mirroring `useBulkOperations`'s
 * `selectedIds`.
 */
export function useRowLeaveAnimation () {
  const leavingRowKeys = ref<string[]>([])

  /**
   * Marks `keys` as leaving, waits for the leave animation's duration, then
   * clears them again. The caller is expected to remove the underlying rows
   * (or refetch) once this resolves — this composable renders nothing and
   * knows nothing about the entity being deleted, matching
   * `useBulkOperations`'s "entity-agnostic, caller owns the data" shape.
   */
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
