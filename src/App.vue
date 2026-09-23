<script lang="ts" setup>
import AdminLayout from '@/layouts/AdminLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

const route = useRoute()

const layout = computed(() => route.meta.layout === 'auth' ? AuthLayout : AdminLayout)
</script>

<template>
  <component :is="layout" />
  <Modals />
</template>
