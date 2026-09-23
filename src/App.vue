<script lang="ts" setup>
import AdminLayout from '@/layouts/AdminLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

/**
 * Layout resolved declaratively from `route.meta.layout` (`dts/global.d.ts`)
 * — this is the one place a route's layout is chosen; no page component
 * imports a layout directly (PRD-002 "Layouts" / issue #20). Defaults to
 * `AdminLayout` when a route omits `meta.layout` altogether, since every
 * feature screen from this PRD forward is an authenticated admin screen.
 */
const route = useRoute()

const layout = computed(() => route.meta.layout === 'auth' ? AuthLayout : AdminLayout)
</script>

<template>
  <component :is="layout" />
  <Modals />
</template>
