<script lang="ts" setup>
/**
 * The sole minor-unit conversion boundary in the portal (GitHub issue #32,
 * PRD-006 "Money" — "the minor-unit conversion exists in exactly one
 * module"). Accepts a minor-unit integer (e.g. `4999` cents), presents a
 * decimal amount to the administrator through `el-input-number`, constrains
 * entry to the currency's decimal precision, and emits a minor-unit integer
 * back. Every other layer — service, contract, mock, list column, dashboard
 * — deals only in integers; a second conversion site anywhere else is a
 * defect (a second place for rounding inconsistencies to creep in).
 *
 * `el-input-number` owns decimal clamping (`:precision`) and negative
 * rejection (`:min="0"`) — neither is reimplemented here. `:controls="false"`
 * removes the +/- steppers PRD-006 doesn't ask for. Precision and the
 * currency symbol are both derived from `Intl.NumberFormat` (via
 * `filters.getCurrencyPrecision` / `filters.getCurrencySymbol` in
 * `src/utils/filters.ts`) rather than hand-maintained currency maps, the
 * same technique `formatMoney` already uses for display.
 */
const props = defineProps<{
  currency: TCurrency
}>()

const minorUnits = defineModel<number>({ required: true })

const precision = computed(() => filters.getCurrencyPrecision(props.currency))
const symbol = computed(() => filters.getCurrencySymbol(props.currency))

/**
 * The decimal amount `el-input-number` actually displays/edits. Derived
 * from the minor-unit model on the way in, converted back to minor units on
 * the way out — this getter/setter pair is the entire conversion, and
 * nothing outside this component ever performs it.
 */
const displayAmount = computed<number | undefined>({
  get: () => minorUnits.value / (10 ** precision.value),
  set: (decimalAmount) => {
    // `el-input-number` emits `undefined` while the field is cleared
    // (backspaced to empty) rather than `0` — treat that transient state as
    // zero minor units instead of propagating `NaN` from `undefined * 10^n`.
    minorUnits.value = Math.round((decimalAmount ?? 0) * (10 ** precision.value))
  }
})

/**
 * When the currency changes ON ITS OWN, re-derive minor units from the
 * CURRENTLY DISPLAYED decimal amount at the new currency's precision — not
 * from the old minor-unit integer, which was computed at the old precision
 * and would otherwise be silently reinterpreted at the new one (e.g.
 * "49.99" entered under USD, stored as `4999`, must still read "49.99" —
 * and emit whatever minor-unit integer represents "49.99" — after switching
 * to a currency with a different decimal precision).
 *
 * Watching `currency` and `minorUnits` together (rather than `currency`
 * alone) is what makes "only currency changed" distinguishable from
 * "currency AND modelValue changed together" in the same tick — e.g. a
 * ticket-edit form loading a fetched record's price and currency at once.
 * Vue applies a simultaneous `modelValue` prop update before this watcher
 * runs, so reading `minorUnits.value` inside a `currency`-only watcher
 * handler would read the ALREADY-NEW amount and wrongly reconvert it as if
 * it were still expressed at the OLD currency's precision — corrupting it
 * (e.g. USD -> JPY with modelValue set to 5000 in the same tick would
 * misread ¥5000 as if it were $50.00 and emit 50). When both change
 * together, the incoming `modelValue` is already correct in the new
 * currency, so it must be left alone.
 */
watch(
  [() => props.currency, minorUnits],
  ([newCurrency, newMinorUnits], [oldCurrency, oldMinorUnits]) => {
    if (newCurrency === oldCurrency) {
      return
    }

    if (newMinorUnits !== oldMinorUnits) {
      return
    }

    const oldPrecision = filters.getCurrencyPrecision(oldCurrency)
    const newPrecision = filters.getCurrencyPrecision(newCurrency)
    const currentDecimalAmount = oldMinorUnits / (10 ** oldPrecision)

    minorUnits.value = Math.round(currentDecimalAmount * (10 ** newPrecision))
  }
)
</script>

<template>
  <el-input-number
    v-model="displayAmount"
    :precision="precision"
    :min="0"
    :controls="false"
    class="w-full"
  >
    <template #prefix>
      {{ symbol }}
    </template>
  </el-input-number>
</template>
