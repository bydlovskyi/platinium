# E2E Browser Check (§6.4)

The dev server runs on the HOST at `http://host.docker.internal:5173` —
`localhost` inside this container is the container, not the host. Do NOT run
`npm run dev` here.

A human must have started it before the loop:
```bash
npm run dev    # on the host, in the repo root
```

## Sanity check (host reachability)

```bash
for i in 1 2 3 4 5; do
  if curl -sf --max-time 10 http://host.docker.internal:5173/ > /dev/null; then
    echo "Host dev server reachable"; break
  fi
  [ $i -eq 5 ] && echo "Host dev server unreachable after 5 attempts — skip the browser check, label PR needs-manual-qa"
  sleep 3
done
```

If still unreachable, skip §6.4, label the PR `needs-manual-qa`, write the exact
error in the PR body, and move on. Do NOT try to start a dev server in here.

## Chromium symlink (one-time, idempotent)

```bash
if [ ! -e /opt/google/chrome/chrome ]; then
  mkdir -p /opt/google/chrome
  ln -sf "$(ls -d /ms-playwright/chromium-*/chrome-linux/chrome 2>/dev/null | head -n1)" /opt/google/chrome/chrome
fi
```

## Authentication

There is no external auth provider. Authentication is mocked by MSW and the
seeded accounts are documented in `README.md` and defined in the mock auth
handler — read them from there, and sign in through the login form like a user
would. There is no cookie trick to perform and no `.env` to read.

Two roles exist once slice #37 lands: an administrator and a viewer. Before that,
only the administrator account exists.

The mock database persists to `localStorage`, so state carries between navigations
within a browser session. Playwright MCP spawns a clean Chromium per agent
session, so there is no bleed between runs.

## Scenarios

Run each with Playwright MCP (`browser_navigate`, `browser_fill_form`,
`browser_click`, `browser_snapshot`, `browser_console_messages`,
`browser_take_screenshot`). Adapt to what the slice actually changed — a slice
that only touched the mock database has no UI to drive.

1. **Happy path** — complete the flow the slice delivers, reload, confirm it persisted.
2. **Validation** — submit bad input, confirm the message lands on the responsible field.
3. **Failure handling** — force an API failure through the mock's chaos controls and
   confirm the administrator sees a message rather than a blank screen.
4. **List state** — if a list changed: apply a filter, copy the URL into a new tab,
   confirm it reproduces the view; use the back button and confirm it steps back.
5. **Authorization** — once roles exist: a viewer must not see write actions and must
   be refused a direct edit URL.
6. **Responsive** — the changed screen at 375px and 1440px, in both themes.
7. **Console clean** — `browser_console_messages` with `level: error` is empty. Vite
   HMR WebSocket noise is environmental — note it, don't fail on it.

Take a screenshot per scenario. If Playwright MCP is unavailable or the host is
unreachable, say so explicitly in the PR body AND label `needs-manual-qa` — never
pretend.
