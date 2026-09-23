<script lang="ts" setup>
/**
 * Reusable page header (PRD-002 "Page header (deep module)") — every
 * feature screen uses this for its title/breadcrumbs/actions row so heading
 * hierarchy, spacing and action placement are consistent by construction.
 * `Home.vue` is the first consumer, proving the pattern.
 */

interface IBreadcrumb {
  label: string
  routeName?: string
}

defineProps<{
  title: string
  breadcrumbs?: IBreadcrumb[]
}>()
</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
    <div>
      <nav
        v-if="breadcrumbs && breadcrumbs.length > 0"
        aria-label="Breadcrumb"
        class="mb-1"
      >
        <ol class="flex items-center gap-1 text-caption text-text-muted">
          <li
            v-for="(crumb, index) in breadcrumbs"
            :key="`${crumb.label}-${index}`"
            class="flex items-center gap-1"
          >
            <router-link
              v-if="crumb.routeName"
              :to="{ name: crumb.routeName }"
              class="hover:text-text-primary"
            >
              {{ crumb.label }}
            </router-link>
            <span v-else>{{ crumb.label }}</span>

            <Icon
              v-if="index < breadcrumbs.length - 1"
              name="chevron-right"
              class="size-3.5"
            />
          </li>
        </ol>
      </nav>

      <h1 class="text-screen-heading text-text-primary">
        {{ title }}
      </h1>
    </div>

    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
