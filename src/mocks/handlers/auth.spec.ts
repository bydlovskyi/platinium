import axios from 'axios'

import { db } from '../db/singleton'
import { resetDatabase } from '../../../tests/support'

const SEEDED_EMAIL = 'admin@platinium.test'
const SEEDED_PASSWORD = 'admin123'

// Plain axios, not `apiClient`: its response interceptor drops the status code these tests assert on.
async function requestFor (
  method: 'get' | 'post',
  path: string,
  options: { data?: unknown; token?: string } = {}
): Promise<{ status: number; body: unknown }> {
  const response = await axios.request({
    method,
    url: path,
    data: options.data,
    headers: options.token === undefined ? {} : { Authorization: `Bearer ${options.token}` },
    validateStatus: () => true
  })

  return { status: response.status, body: response.data }
}

async function loginAsSeededAdmin (): Promise<string> {
  const { body } = await requestFor('post', '/auth/login', { data: { email: SEEDED_EMAIL, password: SEEDED_PASSWORD } })

  return (body as TLoginResponse).token
}

describe('auth handlers', () => {
  beforeEach(() => resetDatabase())

  describe('POST /auth/login', () => {
    it('returns 200 with a token and the public user shape, and flips sessionActive on', async () => {
      const { status, body } = await requestFor('post', '/auth/login', {
        data: { email: SEEDED_EMAIL, password: SEEDED_PASSWORD }
      })

      expect(status).toBe(200)

      const loginResponse = body as TLoginResponse

      expect(loginResponse.token).toEqual(expect.any(String))
      expect(loginResponse.user).toEqual({
        id: expect.any(String),
        name: 'Admin',
        email: SEEDED_EMAIL,
        role: 'admin'
      })
      expect((loginResponse.user as unknown as { sessionActive?: boolean }).sessionActive).toBeUndefined()

      const storedUser = db.users.get(loginResponse.user.id)

      expect(storedUser?.sessionActive).toBe(true)
    })

    it('returns 400 with field-level messages when both fields are missing', async () => {
      const { status, body } = await requestFor('post', '/auth/login', { data: {} })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { email: expect.any(String), password: expect.any(String) }
      })
    })

    it('returns 400 with a single field-level message when only password is missing', async () => {
      const { status, body } = await requestFor('post', '/auth/login', { data: { email: SEEDED_EMAIL } })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { password: expect.any(String) }
      })
    })

    it('returns 401 for a well-formed but wrong password', async () => {
      const { status, body } = await requestFor('post', '/auth/login', {
        data: { email: SEEDED_EMAIL, password: 'wrong-password' }
      })

      expect(status).toBe(401)
      expect(body).toEqual({ code: 'UNAUTHORIZED', message: expect.any(String) })
    })

    it('returns 401 for an unknown email', async () => {
      const { status, body } = await requestFor('post', '/auth/login', {
        data: { email: 'nobody@platinium.test', password: SEEDED_PASSWORD }
      })

      expect(status).toBe(401)
      expect(body).toEqual({ code: 'UNAUTHORIZED', message: expect.any(String) })
    })
  })

  describe('GET /auth/me', () => {
    it('returns 401 when no token is presented', async () => {
      const { status, body } = await requestFor('get', '/auth/me')

      expect(status).toBe(401)
      expect(body).toEqual({ code: 'UNAUTHORIZED', message: expect.any(String) })
    })

    it('returns 401 for a malformed Authorization header', async () => {
      const { status } = await axios.request({
        method: 'get',
        url: '/auth/me',
        headers: { Authorization: 'not-a-bearer-token' },
        validateStatus: () => true
      })

      expect(status).toBe(401)
    })

    it('returns 401 for a well-formed but unknown token', async () => {
      const { status } = await requestFor('get', '/auth/me', { token: 'mock-token-does-not-exist' })

      expect(status).toBe(401)
    })

    it('returns 200 with the user for a valid token after login', async () => {
      const token = await loginAsSeededAdmin()

      const { status, body } = await requestFor('get', '/auth/me', { token })

      expect(status).toBe(200)
      expect(body).toEqual({ id: expect.any(String), name: 'Admin', email: SEEDED_EMAIL, role: 'admin' })
    })
  })

  describe('POST /auth/logout', () => {
    it('returns 401 when no token is presented', async () => {
      const { status } = await requestFor('post', '/auth/logout')

      expect(status).toBe(401)
    })

    it('invalidates the session: 204 on logout, then 401 on a subsequent /auth/me with the same token', async () => {
      const token = await loginAsSeededAdmin()

      const logoutResult = await requestFor('post', '/auth/logout', { token })

      expect(logoutResult.status).toBe(204)
      expect(logoutResult.body).toBeFalsy()

      const meResult = await requestFor('get', '/auth/me', { token })

      expect(meResult.status).toBe(401)
    })
  })
})
