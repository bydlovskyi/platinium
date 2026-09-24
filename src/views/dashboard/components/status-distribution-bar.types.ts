/** One status's share of a `StatusDistributionBar` breakdown, and the filtered-list route its bar segment/legend row links to. */
export interface IStatusDistributionEntry {
  status: string
  count: number
  to: RouteLocationRaw
}
