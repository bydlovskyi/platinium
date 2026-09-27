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
