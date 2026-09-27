<script lang="ts" setup>
// The only minor-unit <-> decimal conversion site in the app; don't add another.
const props = defineProps<{
  currency: TCurrency
}>()

const minorUnits = defineModel<number>({ required: true })

const precision = computed(() => filters.getCurrencyPrecision(props.currency))
const symbol = computed(() => filters.getCurrencySymbol(props.currency))

// Rendered as the native `step`; the default of 1 makes the browser block submitting 45.50.
const step = computed(() => 1 / (10 ** precision.value))

const displayAmount = computed<number | undefined>({
  get: () => minorUnits.value / (10 ** precision.value),
  set: (decimalAmount) => {
    // Cleared field emits `undefined`, not 0.
    minorUnits.value = Math.round((decimalAmount ?? 0) * (10 ** precision.value))
  }
})

// On a currency-only change, re-derive minor units from the displayed amount at the new precision.
// If modelValue changed in the same tick (e.g. form load) it's already correct — leave it alone.
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
    :step="step"
    :min="0"
    :controls="false"
    class="w-full"
  >
    <template #prefix>
      {{ symbol }}
    </template>
  </el-input-number>
</template>
