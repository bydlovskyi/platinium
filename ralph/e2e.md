# Browser Check (§6.4)

You start the dev server yourself, in this container, and drive it at
`http://localhost:5173`. Playwright MCP runs in this same container, so its
Chromium resolves `localhost` to the same place your server is listening.

This is deliberate: you are working on a clone of your own branch. A dev server
running anywhere else would be serving different code, and a browser check
against the wrong code is worse than no browser check.

## Start the server

```bash
npm run dev > /tmp/dev.log 2>&1 &
for i in $(seq 1 30); do
  curl -sf --max-time 3 http://localhost:5173/ >/dev/null 2>&1 && { echo "dev server up"; break; }
  [ "$i" -eq 30 ] && { echo "dev server failed to start"; tail -30 /tmp/dev.log; }
  sleep 1
done
```

It normally comes up in a couple of seconds. If it does not, read `/tmp/dev.log` —
that is a real failure in your branch and you must fix it, not skip the check. A
dev server that will not start is a broken build.

Shut it down before you finish:

```bash
pkill -f "vite" || true
```

## Observing transient states

The mock answers in milliseconds, so a skeleton, a spinner or a pending button is
gone before a screenshot lands. **Do not try to intercept requests at the browser
level to freeze them.** Slow the mock down instead — that is what the chaos controls
are for, and they are exposed on `window.__mockChaos`:

```js
// browser_evaluate
window.__mockChaos.setLatency(3000)   // every mock response now takes 3s
```

Navigate, capture the loading state, then put it back:

```js
window.__mockChaos.reset()            // restores the environment default
```

The same object forces failures — `failNextRequest({ path: '...', status: 500 })` —
for the error scenarios below.

**If a state still cannot be observed after two attempts, stop.** Note in the PR which
state you could not capture and why, and move on. An unobservable state is not a
failing test and it is not worth inventing instrumentation for: CDP fetch
interception, patching `window.fetch`, route handlers and timing races all end in a
rabbit hole. The latency control exists precisely so none of that is necessary.

## Scenarios

Run each with Playwright MCP (`browser_navigate`, `browser_fill_form`,
`browser_click`, `browser_snapshot`, `browser_console_messages`,
`browser_take_screenshot`). Adapt to what the slice actually changed — a slice
that only touched the mock database has no UI to drive.

1. **Happy path** — complete the flow the slice delivers, reload, confirm it
   persisted.
2. **Validation** — submit bad input, confirm the message lands on the
   responsible field.
3. **Failure handling** — force an API failure with
   `window.__mockChaos.failNextRequest({ path, status })` and confirm the
   administrator sees a message rather than a blank screen.
4. **Loading state** — raise the latency, navigate, and confirm the skeleton matches
   the shape of the content it replaces. Reset the latency afterwards.
5. **List state** — if a list changed: apply a filter, open the resulting URL in a
   fresh navigation, confirm it reproduces the view; go back and confirm it steps
   back through the filter changes.
6. **Authorization** — once roles exist: a viewer must not see write actions and
   must be refused a direct edit URL.
7. **Responsive** — the changed screen at 375px and 1440px, in both themes.
8. **Console clean** — `browser_console_messages` with `level: error` is empty.
   Vite HMR WebSocket noise is environmental — note it, don't fail on it.

Take a screenshot per scenario and attach the relevant ones to the PR.

## Authentication

There is no external auth provider. Authentication is mocked by MSW and the
seeded accounts are documented in `README.md` and defined in the mock auth
handler — read them from there and sign in through the login form like a user
would. There is no cookie trick to perform and no `.env` to read.

Two roles exist once slice #37 lands: an administrator and a viewer. Before that,
only the administrator account exists.

The mock database persists to `localStorage`, so state carries across navigations
within a session. Playwright MCP spawns a clean Chromium per agent session, so
there is no bleed between runs.

## When to skip

Only when Playwright MCP itself fails to start. Then label the PR
`needs-manual-qa` and write the exact error in the PR body — never pretend a check
happened.

"The dev server was unreachable" is not a valid reason any more. You start it.
