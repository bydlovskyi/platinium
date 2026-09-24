<script lang="ts" setup>
import type { IStatusDistributionEntry } from './components/status-distribution-bar.types'

/**
 * Dashboard screen (GitHub issue #38, PRD-007 "Dashboard") — the post-login
 * landing route (`routeNames.home`, `/`). Replaces the scaffold example
 * previously served from `src/views/home/` (renamed to `dashboard`; the
 * route name/path are unchanged — see `dashboard.routes.ts`).
 *
 * Presentation only: `useDashboardStats` fetches the single aggregate
 * `GET /dashboard/stats` payload, and every figure/breakdown/list below
 * renders straight off it — no client-side reduction of list data (PRD-007's
 * explicit acceptance criterion). Every headline figure and shortlist row
 * links into the matching filtered list or record, reusing the exact query
 * param shapes `useEventsList`/`useTicketsList` already read from the URL
 * (`src/views/events/composables/useEventsList.ts`,
 * `src/views/tickets/composables/useTicketsList.ts`) — no new param names
 * invented here.
 *
 * Gross inventory value is rendered once per currency in a single labelled
 * `el-descriptions` block and is NEVER summed across currencies anywhere on
 * this screen (PRD-007's single most load-bearing rule).
 *
 * Readable by both the administrator and viewer roles: no
 * `requiredCapability` on this route — this is a read, and PRD-007 gates
 * only write actions. The shortlist rows below are the one exception:
 * "Next events starting"/"Tickets nearly sold out" link into
 * `routeNames.eventEdit`/`routeNames.ticketEdit`, which *are*
 * capability-gated (`entity`/`update`), so those rows call `canDo` the same
 * way `Events.vue`/`Tickets.vue` gate their row actions — a viewer sees the
 * record name as plain text instead of a link that would 403.
 *
 * Status breakdowns render through `StatusDistributionBar`
 * (`components/StatusDistributionBar.vue`, GitHub issue #43, PRD-010
 * "Dashboard presentation") — a single stacked proportional bar per
 * breakdown rather than a separate `el-progress` per status, so the
 * distribution reads in one glance. It reuses the same `STATUS_PRESENTATION`/
 * `STATUS_PRESENTATION_TYPE_COLOR` mapping `StatusTag` renders as an
 * `el-tag` elsewhere in the portal, so a status never gets a different
 * colour here than anywhere else.
 *
 * Cards (`el-card shadow="never"`) are kept only where PRD-010 calls them
 * meaningful — the headline stat tiles and the per-currency inventory block
 * — everything else below uses spacing and a `text-section-heading` rather
 * than a bordered box, per PRD-010's "administrative interfaces fail when
 * every section is a box".
 */
const router = useRouter()
const { canDo } = useCapability()
const { isMobile } = useBreakpoint()

const { data, loading, error, retry } = useDashboardStats()

/** Column count for the "Gross inventory value" `el-descriptions` — 1 below the tablet breakpoint (`useBreakpoint`, PRD-002) so a third seeded currency (e.g. GBP alongside EUR/USD) stacks into its own row instead of overflowing the card at narrow viewports, and the existing 3-column layout at tablet/desktop widths and up. */
const grossInventoryValueColumns = computed(() => isMobile.value ? 1 : 3)

/** Draft-event count for the headline tile — `TDashboardStats` has no dedicated field, only the status breakdown array, so this reads the `draft` entry out of it rather than summing lists client-side. */
const draftEvents = computed(() => data.value?.eventStatusBreakdown.find(entry => entry.status === 'draft')?.count ?? 0)

/** Secondary supporting figures for the "Currently running"/"Draft events" headline tiles (GitHub issue #43, PRD-010 "Dashboard presentation") — each is a subset of `totalEvents`, so a share-of-total reads as a meaningful second figure. 0 when there are no events at all, so an empty dataset never divides by zero. */
const runningEventsPercentage = computed(() => {
  const totalEvents = data.value?.totalEvents ?? 0

  return totalEvents === 0 ? 0 : Math.round(((data.value?.runningEvents ?? 0) / totalEvents) * 100)
})
const draftEventsPercentage = computed(() => {
  const totalEvents = data.value?.totalEvents ?? 0

  return totalEvents === 0 ? 0 : Math.round((draftEvents.value / totalEvents) * 100)
})

/** Entries for the events/tickets `StatusDistributionBar` (GitHub issue #43) — the same breakdown arrays the removed per-status `el-progress` rows read, reshaped with the filtered-list link each segment/legend row navigates to. Link shape is unchanged from before this slice (`routeNames.events`/`routeNames.tickets` with `query: { status }`). */
const eventsDistributionEntries = computed<IStatusDistributionEntry[]>(() => (
  data.value?.eventStatusBreakdown ?? []
).map(entry => ({
  status: entry.status,
  count: entry.count,
  to: { name: routeNames.events, query: { status: entry.status } }
})))
const ticketsDistributionEntries = computed<IStatusDistributionEntry[]>(() => (
  data.value?.ticketStatusBreakdown ?? []
).map(entry => ({
  status: entry.status,
  count: entry.count,
  to: { name: routeNames.tickets, query: { status: entry.status } }
})))

// --- Headline figures counting into place (GitHub issue #42, PRD-010
// "Motion") — one `useCountUp` per headline `el-statistic`, each fed a plain
// numeric source derived above/from `data`. `useCountUp` itself bypasses the
// count under `prefers-reduced-motion` (see its own file comment), so
// nothing here branches on the preference directly.
const totalEventsDisplay = useCountUp(computed(() => data.value?.totalEvents ?? 0))
const runningEventsDisplay = useCountUp(computed(() => data.value?.runningEvents ?? 0))
const draftEventsDisplay = useCountUp(draftEvents)
const totalTicketsDisplay = useCountUp(computed(() => data.value?.totalTickets ?? 0))
const totalAvailableQuantityDisplay = useCountUp(computed(() => data.value?.totalAvailableQuantity ?? 0))

/** Clicking anywhere in an upcoming-event row navigates to that event's edit view — a specific record link, not a filtered list (PRD-007 distinguishes the two). The name cell's own `router-link` covers keyboard/assistive-tech access; this covers the rest of the row for a mouse/touch user. A viewer has no `events`/`update` capability and the edit route is gated on it (`events.routes.ts`), so this is a no-op for a viewer — mirroring `Events.vue`'s `rowActions`, which hides the edit affordance rather than presenting a link/action that would 403. */
function onUpcomingEventRowClick (row: TEvent): void {
  if (!canDo('events', 'update')) {
    return
  }

  void router.push({ name: routeNames.eventEdit, params: { id: row.id } })
}

/** Same viewer gating as `onUpcomingEventRowClick`, for the tickets edit route (`tickets.routes.ts`, `tickets`/`update`). */
function onNearlySoldOutTicketRowClick (row: TTicket): void {
  if (!canDo('tickets', 'update')) {
    return
  }

  void router.push({ name: routeNames.ticketEdit, params: { id: row.id } })
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader title="Dashboard" />

    <!-- Skeleton-to-content crossfade (GitHub issue #42, PRD-010 "Motion")
         — same `<Transition name="skeleton-fade">` wrap as
         `EventForm.vue`/`TicketForm.vue`'s loading/error/content tri-state,
         keyed per branch. -->
    <Transition name="skeleton-fade" mode="out-in">
      <!-- First load: skeleton mirrors the final grid shape (headline tiles,
         two breakdown cards, two shortlist tables) so nothing jumps when the
         data arrives. -->
      <div v-if="loading && !data" key="skeleton" class="flex flex-col gap-5">
        <el-row :gutter="16">
          <el-col v-for="n in 5" :key="n" :xs="24" :sm="12" :md="8" :lg="4" class="mb-4">
            <el-card shadow="never">
              <el-skeleton animated :rows="0">
                <template #template>
                  <el-skeleton-item variant="text" class="!w-2/3" />
                  <el-skeleton-item variant="h3" class="!mt-3 !w-1/2" />
                </template>
              </el-skeleton>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :md="12" class="mb-4">
            <el-card shadow="never">
              <el-skeleton animated :rows="3" />
            </el-card>
          </el-col>
          <el-col :xs="24" :md="6" class="mb-4">
            <el-skeleton animated :rows="4" />
          </el-col>
          <el-col :xs="24" :md="6" class="mb-4">
            <el-skeleton animated :rows="4" />
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :md="12" class="mb-4">
            <el-skeleton animated :rows="5" />
          </el-col>
          <el-col :xs="24" :md="12" class="mb-4">
            <el-skeleton animated :rows="5" />
          </el-col>
        </el-row>
      </div>

      <!-- Failed load: retry re-triggers the fetch, no page reload. -->
      <div v-else-if="error" key="error" class="rounded-token-md border border-border">
        <el-result
          icon="warning"
          title="Couldn't load the dashboard"
          sub-title="Something went wrong while fetching the latest statistics."
        >
          <template #extra>
            <el-button type="primary" @click="retry">
              Retry
            </el-button>
          </template>
        </el-result>
      </div>

      <div v-else-if="data" key="content" class="flex flex-col gap-5">
        <!-- Headline figures -->
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8" :lg="4" class="mb-4">
            <el-card shadow="never">
              <router-link :to="{ name: routeNames.events }" class="block hover:text-accent">
                <el-statistic
                  title="Total events"
                  :value="totalEventsDisplay"
                  class="headline-statistic tabular-nums"
                />
              </router-link>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="4" class="mb-4">
            <el-card shadow="never">
              <router-link
                :to="{ name: routeNames.events, query: { status: 'published' } }"
                class="block hover:text-accent"
              >
                <el-statistic
                  title="Currently running"
                  :value="runningEventsDisplay"
                  class="headline-statistic tabular-nums"
                >
                  <template #suffix>
                    <span class="text-caption text-text-muted align-middle">({{ runningEventsPercentage }}%)</span>
                  </template>
                </el-statistic>
              </router-link>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="4" class="mb-4">
            <el-card shadow="never">
              <router-link
                :to="{ name: routeNames.events, query: { status: 'draft' } }"
                class="block hover:text-accent"
              >
                <el-statistic title="Draft events" :value="draftEventsDisplay" class="headline-statistic tabular-nums">
                  <template #suffix>
                    <span class="text-caption text-text-muted align-middle">({{ draftEventsPercentage }}%)</span>
                  </template>
                </el-statistic>
              </router-link>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="4" class="mb-4">
            <el-card shadow="never">
              <router-link :to="{ name: routeNames.tickets }" class="block hover:text-accent">
                <el-statistic
                  title="Total tickets"
                  :value="totalTicketsDisplay"
                  class="headline-statistic tabular-nums"
                />
              </router-link>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="4" class="mb-4">
            <el-card shadow="never">
              <router-link :to="{ name: routeNames.tickets }" class="block hover:text-accent">
                <el-statistic
                  title="Total available quantity"
                  :value="totalAvailableQuantityDisplay"
                  class="headline-statistic tabular-nums"
                />
              </router-link>
            </el-card>
          </el-col>
        </el-row>

        <!-- Gross inventory value per currency — one labelled block, never summed across currencies. -->
        <el-row :gutter="16">
          <el-col :span="24" class="mb-4">
            <el-card shadow="never">
              <el-descriptions title="Gross inventory value" :column="grossInventoryValueColumns" border>
                <el-descriptions-item
                  v-for="currencyTotal in data.grossInventoryValue"
                  :key="currencyTotal.currency"
                  :label="currencyTotal.currency"
                >
                  <span class="tabular-nums">
                    {{ filters.formatMoney(currencyTotal.totalMinorUnits, currencyTotal.currency) }}
                  </span>
                </el-descriptions-item>

                <el-descriptions-item v-if="data.grossInventoryValue.length === 0" label="No inventory">
                  —
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
        </el-row>

        <!-- Status breakdowns — a single stacked proportional bar per
           breakdown (GitHub issue #43), not a bordered card: hierarchy comes
           from the section heading and spacing. -->
        <el-row :gutter="16">
          <el-col :xs="24" :md="12" class="mb-4">
            <section aria-labelledby="events-status-heading">
              <h2 id="events-status-heading" class="text-section-heading text-text-primary mb-3">Events by status</h2>
              <StatusDistributionBar :entries="eventsDistributionEntries" />
            </section>
          </el-col>

          <el-col :xs="24" :md="12" class="mb-4">
            <section aria-labelledby="tickets-status-heading">
              <h2 id="tickets-status-heading" class="text-section-heading text-text-primary mb-3">Tickets by status</h2>
              <StatusDistributionBar :entries="ticketsDistributionEntries" />
            </section>
          </el-col>
        </el-row>

        <!-- Next events starting / tickets nearly sold out — for a user who
           can update the entity, each row links to that specific record's
           edit view (not a filtered list), via the name cell's
           `router-link` and a `row-click` handler on the row itself so the
           whole row is clickable, not just the name text. A viewer lacks
           that capability and the edit route is gated on it, so for a
           viewer the name renders as plain text and the row click is a
           no-op (see `canDo` calls below and on `onUpcomingEventRowClick`/
           `onNearlySoldOutTicketRowClick`). -->
        <el-row :gutter="16">
          <el-col :xs="24" :md="12" class="mb-4">
            <section aria-labelledby="upcoming-events-heading">
              <h2 id="upcoming-events-heading" class="text-section-heading text-text-primary mb-3">
                Next events starting
              </h2>
              <el-table :data="data.upcomingEvents" size="small" @row-click="onUpcomingEventRowClick">
                <el-table-column label="Name">
                  <template #default="{ row }">
                    <router-link
                      v-if="canDo('events', 'update')"
                      :to="{ name: routeNames.eventEdit, params: { id: (row as TEvent).id } }"
                      class="text-accent hover:underline"
                    >
                      {{ (row as TEvent).name }}
                    </router-link>
                    <span v-else>{{ (row as TEvent).name }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="Starts">
                  <template #default="{ row }">
                    {{ filters.formatDate((row as TEvent).startDate) }}
                  </template>
                </el-table-column>
                <el-table-column label="Status">
                  <template #default="{ row }">
                    <StatusTag :status="(row as TEvent).status" />
                  </template>
                </el-table-column>
                <template #empty>
                  No upcoming events.
                </template>
              </el-table>
            </section>
          </el-col>

          <el-col :xs="24" :md="12" class="mb-4">
            <section aria-labelledby="nearly-sold-out-heading">
              <h2 id="nearly-sold-out-heading" class="text-section-heading text-text-primary mb-3">
                Tickets nearly sold out
              </h2>
              <el-table :data="data.nearlySoldOutTickets" size="small" @row-click="onNearlySoldOutTicketRowClick">
                <el-table-column label="Name">
                  <template #default="{ row }">
                    <router-link
                      v-if="canDo('tickets', 'update')"
                      :to="{ name: routeNames.ticketEdit, params: { id: (row as TTicket).id } }"
                      class="text-accent hover:underline"
                    >
                      {{ (row as TTicket).name }}
                    </router-link>
                    <span v-else>{{ (row as TTicket).name }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="Quantity">
                  <template #default="{ row }">
                    <span class="tabular-nums">{{ (row as TTicket).quantity }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="eventName" label="Event" />
                <template #empty>
                  No tickets are running low.
                </template>
              </el-table>
            </section>
          </el-col>
        </el-row>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Headline figures at the largest type step, dominating the layout (GitHub
   issue #43, PRD-010 "Dashboard presentation") — `el-statistic` defaults to
   Element Plus's own `extra-large` step, not this project's `screen-heading`
   token, so the value/title sizes are overridden directly on its rendered
   parts via `:deep()`. The title already inherits the right muted colour
   from the theme bridge (`--el-text-color-regular`, mapped from this
   project's own `--color-text-muted`) — only size/weight need setting here. */
.headline-statistic :deep(.el-statistic__content) {
  font-size: var(--text-screen-heading);
  line-height: var(--text-screen-heading--line-height);
}

.headline-statistic :deep(.el-statistic__number) {
  font-weight: var(--text-screen-heading--font-weight);
}

.headline-statistic :deep(.el-statistic__head) {
  font-size: var(--text-caption);
  line-height: var(--text-caption--line-height);
  font-weight: var(--text-caption--font-weight);
}
</style>
