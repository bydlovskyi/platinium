import { http, HttpResponse, type HttpHandler } from 'msw'

/**
 * `GET /health` — the OpenAPI contract's trivial liveness endpoint
 * (`src/mocks/openapi.yaml`), proving the mock is installed and
 * intercepting. Registered at the bare `/health` path, matching the
 * existing convention already established by `home.service.ts` and
 * `client.spec.ts`: the app calls bare paths through `apiClient`, with no
 * `/api` prefix, because `VITE_API_URL` is unset.
 */
export const healthHandlers: HttpHandler[] = [
  http.get('/health', () => HttpResponse.json({ status: 'ok' } satisfies THealth))
]
