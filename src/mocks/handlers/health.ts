import { http, HttpResponse, type HttpHandler } from 'msw'

import { chaos } from '../chaos'

// Bare path, no `/api` prefix: `VITE_API_URL` is unset, so the app calls bare paths.
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
