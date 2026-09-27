<script lang="ts" setup>
const props = defineProps<{
  status: TStatus
}>()

const presentation = computed<IStatusPresentation | undefined>(() => STATUS_PRESENTATION[props.status])
</script>

<template>
  <el-tag v-if="presentation" :type="presentation.type" effect="light" round>
    {{ presentation.label }}
  </el-tag>
</template>
