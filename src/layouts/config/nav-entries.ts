interface INavEntry {
  label: string
  icon: TIcons
  routeName: string
}

export const navEntries: INavEntry[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    routeName: routeNames.home
  },
  {
    label: 'Events',
    icon: 'calendar',
    routeName: routeNames.events
  },
  {
    label: 'Tickets',
    icon: 'ticket',
    routeName: routeNames.tickets
  },
  {
    label: 'Categories',
    icon: 'tag',
    routeName: routeNames.categories
  }
]
