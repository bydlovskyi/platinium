import { http, HttpResponse, type HttpHandler } from 'msw'

import { chaos } from '../chaos'

/**
 * `GET /health` — the OpenAPI contract's trivial liveness endpoint
 * (`src/mocks/openapi.yaml`), proving the mock is installed and
 * intercepting. Registered at the bare `/health` path, matching the
 * existing convention already established by `home.service.ts` and
 * `client.spec.ts`: the app calls bare paths through `apiClient`, with no
 * `/api` prefix, because `VITE_API_URL` is unset.
 *
 * Consults the shared chaos controls (`src/mocks/chaos.ts`) so `/health` is
 * a safe, always-available target for forcing a failure in tests — e.g. the
 * response-interceptor integration test forces a 500 here rather than
 * needing an entity endpoint to exist first.
 */
export const healthHandlers: HttpHandler[] = [
  http.get('/health', () => {
    const forced = chaos.consumeForcedFailure('/health')

    if (forced !== undefined) {
      return HttpResponse.json(
        { code: 'CHAOS_FORCED_FAILURE', message: 'The mock backend was forced to fail this request.' } satisfies TErrorResponse,
        { status: forced.status }
      )
    }

    return HttpResponse.json({ status: 'ok' } satisfies THealth)
  })
]
