<script lang="ts" setup>
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
 * `el-progress`'s `:color` reuses `STATUS_PRESENTATION`/
 * `STATUS_PRESENTATION_TYPE_COLOR` from `src/utils/status-presentation.ts` —
 * the exact same status->semantic-type mapping `StatusTag` renders as an
 * `el-tag` elsewhere in the portal, so a status never gets a different
 * colour here than anywhere else.
 */
const router = useRouter()
const { canDo } = useCapability()
const { isMobile } = useBreakpoint()

const { data, loading, error, retry } = useDashboardStats()

/** Column count for the "Gross inventory value" `el-descriptions` — 1 below the tablet breakpoint (`useBreakpoint`, PRD-002) so a third seeded currency (e.g. GBP alongside EUR/USD) stacks into its own row instead of overflowing the card at narrow viewports, and the existing 3-column layout at tablet/desktop widths and up. */
const grossInventoryValueColumns = computed(() => isMobile.value ? 1 : 3)

/** Label for a status breakdown entry, via the same `STATUS_PRESENTATION` map `StatusTag` renders from. Falls back to the raw value for a status this map hasn't been taught yet, mirroring `StatusTag`'s own defensive handling. */
function statusLabel (status: string): string {
  return STATUS_PRESENTATION[status as TStatus]?.label ?? status
}

/** `el-progress`'s `:color` for a status breakdown entry — the same semantic type `StatusTag` maps the status to, resolved to its underlying `--el-color-*` variable. */
function progressColor (status: string): string {
  const type = STATUS_PRESENTATION[status as TStatus]?.type

  return type ? STATUS_PRESENTATION_TYPE_COLOR[type] : STATUS_PRESENTATION_TYPE_COLOR.info
}

/** `count`/`total` as an `el-progress` `:percentage` — 0 when the breakdown's total is 0, so an empty dataset never divides by zero. */
function breakdownPercentage (count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100)
}

const eventsTotal = computed(() => data.value?.eventStatusBreakdown.reduce((sum, entry) => sum + entry.count, 0) ?? 0)
const ticketsTotal = computed(() => data.value?.ticketStatusBreakdown.reduce((sum, entry) => sum + entry.count, 0) ?? 0)

/** Draft-event count for the headline tile — `TDashboardStats` has no dedicated field, only the status breakdown array, so this reads the `draft` entry out of it rather than summing lists client-side. */
const draftEvents = computed(() => data.value?.eventStatusBreakdown.find(entry => entry.status === 'draft')?.count ?? 0)

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
            <el-card shadow="never">
              <el-skeleton animated :rows="4" />
            </el-card>
          </el-col>
          <el-col :xs="24" :md="6" class="mb-4">
            <el-card shadow="never">
              <el-skeleton animated :rows="4" />
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :md="12" class="mb-4">
            <el-card shadow="never">
              <el-skeleton animated :rows="5" />
            </el-card>
          </el-col>
          <el-col :xs="24" :md="12" class="mb-4">
            <el-card shadow="never">
              <el-skeleton animated :rows="5" />
            </el-card>
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
                <el-statistic title="Total events" :value="totalEventsDisplay" />
              </router-link>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="4" class="mb-4">
            <el-card shadow="never">
              <router-link
                :to="{ name: routeNames.events, query: { status: 'published' } }"
                class="block hover:text-accent"
              >
                <el-statistic title="Currently running" :value="runningEventsDisplay" />
              </router-link>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="4" class="mb-4">
            <el-card shadow="never">
              <router-link
                :to="{ name: routeNames.events, query: { status: 'draft' } }"
                class="block hover:text-accent"
              >
                <el-statistic title="Draft events" :value="draftEventsDisplay" />
              </router-link>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="4" class="mb-4">
            <el-card shadow="never">
              <router-link :to="{ name: routeNames.tickets }" class="block hover:text-accent">
                <el-statistic title="Total tickets" :value="totalTicketsDisplay" />
              </router-link>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="4" class="mb-4">
            <el-card shadow="never">
              <router-link :to="{ name: routeNames.tickets }" class="block hover:text-accent">
                <el-statistic title="Total available quantity" :value="totalAvailableQuantityDisplay" />
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
                  {{ filters.formatMoney(currencyTotal.totalMinorUnits, currencyTotal.currency) }}
                </el-descriptions-item>

                <el-descriptions-item v-if="data.grossInventoryValue.length === 0" label="No inventory">
                  —
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
        </el-row>

        <!-- Status breakdowns -->
        <el-row :gutter="16">
          <el-col :xs="24" :md="12" class="mb-4">
            <el-card shadow="never">
              <h2 class="text-section-heading text-text-primary mb-3">Events by status</h2>
              <div class="flex flex-col gap-3">
                <router-link
                  v-for="entry in data.eventStatusBreakdown"
                  :key="entry.status"
                  :to="{ name: routeNames.events, query: { status: entry.status } }"
                  class="block"
                >
                  <div class="flex items-center justify-between text-body text-text-muted mb-1">
                    <span>{{ statusLabel(entry.status) }}</span>
                  </div>
                  <el-progress
                    :percentage="breakdownPercentage(entry.count, eventsTotal)"
                    :color="progressColor(entry.status)"
                    :format="() => String(entry.count)"
                  />
                </router-link>
              </div>
            </el-card>
          </el-col>

          <el-col :xs="24" :md="12" class="mb-4">
            <el-card shadow="never">
              <h2 class="text-section-heading text-text-primary mb-3">Tickets by status</h2>
              <div class="flex flex-col gap-3">
                <router-link
                  v-for="entry in data.ticketStatusBreakdown"
                  :key="entry.status"
                  :to="{ name: routeNames.tickets, query: { status: entry.status } }"
                  class="block"
                >
                  <div class="flex items-center justify-between text-body text-text-muted mb-1">
                    <span>{{ statusLabel(entry.status) }}</span>
                  </div>
                  <el-progress
                    :percentage="breakdownPercentage(entry.count, ticketsTotal)"
                    :color="progressColor(entry.status)"
                    :format="() => String(entry.count)"
                  />
                </router-link>
              </div>
            </el-card>
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
            <el-card shadow="never">
              <h2 class="text-section-heading text-text-primary mb-3">Next events starting</h2>
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
            </el-card>
          </el-col>

          <el-col :xs="24" :md="12" class="mb-4">
            <el-card shadow="never">
              <h2 class="text-section-heading text-text-primary mb-3">Tickets nearly sold out</h2>
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
            </el-card>
          </el-col>
        </el-row>
      </div>
    </Transition>
  </div>
</template>
