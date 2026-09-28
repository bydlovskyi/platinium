import { http, HttpResponse, type HttpHandler } from 'msw'

import { withChaos } from './shared'

// Bare path, no `/api` prefix: `VITE_API_URL` is unset, so the app calls bare paths.
export const healthHandlers: HttpHandler[] = [
  http.get('/health', () => withChaos('/health', () => HttpResponse.json({ status: 'ok' } satisfies THealth)))
]
