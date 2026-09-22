<script lang="ts" setup>
const iconName = ref<TIcons>('car')
function toggleIcon () {
  iconName.value = iconName.value === 'car' ? 'cart' : 'car'
}

const homeStore = useHomeStore()
const { testVar } = storeToRefs(homeStore)

const { openModal } = useModals()

/* THIS IS FOR EXAMPLE PURPOSES. REMOVE ON REAL PROJECT */
const health = ref<THealth>()
async function init () {
  health.value = await homeService.getHealth()
}

onMounted(init)
</script>

<template>
  <div class="p-5 space-y-5">
    <Icon :name="iconName" class="size-10 text-primary" />

    <el-button @click="toggleIcon">Toggle Icon</el-button>

    <HomeComponent />
    <HomeNestedComponent />

    <p>{{ filters.formatCurrency(1000) }}</p>

    <el-button @click="openModal('HomeModal', { title: 'Home Modal' })">Open Modal</el-button>

    <p class="text-primary">{{ testVar }}</p>

    <p class="text-primary">{{ health }}</p>
  </div>
</template>
