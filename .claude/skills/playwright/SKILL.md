---
name: playwright
description: Shared reference for Playwright MCP tools, test credentials, and dev server info — used by other skills and agents
---

# Playwright MCP Reference

## Dev Server

- **URL:** `http://localhost:3000`
- Ensure the dev server is running (`npm run dev`) before any browser interaction

## Test Credentials

Credentials are **never hardcoded in committed files.** They live in the
host's `.env` (gitignored). Read them at session start:

```bash
TEST_ADMIN_EMAIL=$(grep -E '^TEST_ADMIN_EMAIL=' .env | cut -d= -f2-)
TEST_ADMIN_PASSWORD=$(grep -E '^TEST_ADMIN_PASSWORD=' .env | cut -d= -f2-)
TEST_USER_EMAIL=$(grep -E '^TEST_USER_EMAIL=' .env | cut -d= -f2-)
TEST_USER_PASSWORD=$(grep -E '^TEST_USER_PASSWORD=' .env | cut -d= -f2-)
```

- **Admin** (role: admin): `$TEST_ADMIN_EMAIL` / `$TEST_ADMIN_PASSWORD`
- **Client** (role: user): `$TEST_USER_EMAIL` / `$TEST_USER_PASSWORD`

If you're running inside the ralph sandbox, these are already injected into
the prompt header by `ralph/afk.sh` / `ralph/test.sh` — use them directly,
don't read `.env` from inside the sandbox.

## Available Playwright MCP Tools

### Navigation & Page

- `browser_navigate` — go to a URL
- `browser_navigate_back` — go back in history
- `browser_snapshot` — capture accessibility snapshot (preferred for actions)
- `browser_take_screenshot` — capture visual screenshot (for evidence)
- `browser_tabs` — list, create, close, or select tabs
- `browser_resize` — resize the browser window
- `browser_close` — close the page
- `browser_install` — install the browser if missing
- `browser_wait_for` — wait for text, text disappearance, or time

### Interaction

- `browser_click` — click an element
- `browser_type` — type text into an element
- `browser_fill_form` — fill multiple form fields at once
- `browser_press_key` — press a keyboard key
- `browser_hover` — hover over an element
- `browser_select_option` — select dropdown option
- `browser_drag` — drag and drop between elements
- `browser_file_upload` — upload files
- `browser_handle_dialog` — accept/dismiss dialogs

### Inspection

- `browser_console_messages` — check for JS errors and logs
- `browser_network_requests` — inspect network activity
- `browser_evaluate` — run JavaScript on the page
- `browser_run_code` — run a Playwright code snippet

## Usage Tips

- Prefer `browser_snapshot` over `browser_take_screenshot` when you need to interact with the page — snapshots return element refs you can act on.
- Use `browser_take_screenshot` for visual evidence of pass/fail states.
- Always check `browser_console_messages` (level: `error`) after page interactions to catch JS errors.
- Use `browser_fill_form` for login forms — it fills multiple fields in one call.
- After navigation, use `browser_wait_for` or `browser_snapshot` to confirm the page loaded before interacting.
