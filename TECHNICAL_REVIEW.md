# Technical Review

## Technical Decisions

### Session token storage: `localStorage`

The bearer token issued by `POST /auth/login` (`src/store/auth.store.ts`) is persisted
in `localStorage` under the `platinum:auth-token` key
(`src/features/platform/api/auth-token.ts`), and read back by the request interceptor
(`src/features/platform/api/interceptors/request.interceptor.ts`) to attach
`Authorization: Bearer <token>` to outgoing requests.

This is a deliberate compromise, not an oversight. `localStorage` is readable by any
JavaScript running on the page, so a successful XSS injection (a compromised
dependency, an unsanitised render of user-supplied content, a vulnerable third-party
script) can read the token directly and exfiltrate it — there is no such thing as a
"read-only from the app" guarantee once arbitrary script execution is possible in the
page's origin.

A real deployment would issue the session token as an **httpOnly, `SameSite=Lax` (or
`Strict`) cookie** set by the server on login. An httpOnly cookie is never exposed to
`document.cookie` or any other JavaScript API, so it is unreachable by an XSS payload;
`SameSite` mitigates CSRF for the cases a cookie-based session is otherwise exposed to.
That approach requires a real backend to set the `Set-Cookie` header on the login
response and to read the cookie on every subsequent request — there is no server here,
only the MSW mock, so `localStorage` is the only storage a purely client-side mock can
read from and write to itself.

This trade-off is confined to session storage. It does not weaken anything else in the
request pipeline: the mock backend still rejects every request without a valid,
non-revoked token (`requireAuth()` in `src/mocks/handlers/auth.ts`), so the `401` path
is exercised the same way it would be against a cookie-backed session.
