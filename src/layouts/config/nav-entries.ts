/**
 * The sidebar's declared entry list (PRD-002 "Navigation model" / issue #20
 * acceptance criteria) — `AppSidebar.vue` renders this data rather than
 * hardcoding markup per entry, so PRD-007 can filter it by role later
 * without touching the component. New sections are added by extending this
 * list, not by editing the sidebar.
 */
interface INavEntry {
  label: string
  icon: TIcons
  routeName: string
  /**
   * Role required to see this entry. Field only — no enforcement yet
   * (PRD-007 filters the list by the signed-in administrator's role).
   */
  requiresRole?: TUserRole
}

export const navEntries: INavEntry[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    routeName: routeNames.home
  }
]
