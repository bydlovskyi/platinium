import { DependencyConflictError } from '@/features/platform/api/interceptors/response.interceptor'

export function useDependencyConflictNotice () {
  const router = useRouter()

  function notifyDependencyConflict (error: unknown, { entity, to }: { entity: string; to: RouteLocationRaw }): void {
    if (!(error instanceof DependencyConflictError)) {
      return
    }

    const blocking = `${error.count} ${error.entity}${error.count === 1 ? '' : 's'}`

    notificationService.error({
      title: `Cannot delete ${entity}`,
      message: `${blocking} reference this ${entity} and must be removed first.`,
      action: {
        label: `View ${blocking}`,
        onClick: () => {
          void router.push(to)
        }
      }
    })
  }

  return { notifyDependencyConflict }
}
