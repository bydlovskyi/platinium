/**
 * Pure request/response mapping over the `/auth/*` contract
 * (`src/mocks/openapi.yaml`). Knows nothing about the auth store or any
 * composable — per the service-layer rule, parameters in, data out. The
 * auth store (`src/store/auth.store.ts`) is the only caller.
 */
class AuthService {
  login (email: string, password: string) {
    const body: TLoginRequest = { email, password }

    return apiClient.post('/auth/login', body)
  }

  logout () {
    return apiClient.post('/auth/logout')
  }

  me () {
    return apiClient.get('/auth/me')
  }
}

export const authService = new AuthService()
