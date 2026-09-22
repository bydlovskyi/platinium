#!/usr/bin/env bash
# PostToolUse hook fired on Write (new files only).
# Echoes path-specific rule reminders so the agent sees them in tool output.
# Deduped per session: each category fires at most once per session.
# Receives JSON payload on stdin: {"session_id": "...", "tool_input": {"file_path": "..."}, ...}

set -eu

payload=$(cat)
f=$(jq -r '.tool_input.file_path // empty' <<< "$payload" 2>/dev/null || true)
session=$(jq -r '.session_id // empty' <<< "$payload" 2>/dev/null || true)

[ -z "$f" ] && exit 0
[ -z "$session" ] && session="default"

# Pick category from path
category=""
message=""
case "$f" in
  *.spec.ts|*.test.ts)
    category="tests"
    message='[TEST RULES] Assert user-visible behaviour (roles/labels/text), not internal state. Integration tests hit MSW — never mock the service layer. Reset the in-memory DB between tests. No sleeps; wait on assertions.'
    ;;
  */src/mocks/*)
    category="mocks"
    message='[MOCK API RULES] openapi.yaml is the contract source of truth — regenerate schema.ts, never hand-edit it. Every spec endpoint needs an MSW handler. Search/filter/sort/paginate happen in the handler, not the UI. Return realistic 400/401/404/500 shapes.'
    ;;
  *.service.ts)
    category="services"
    message='[SERVICE RULES] Class + exported singleton. Pure API/data logic. A service NEVER imports a store or a composable. No ElNotification here — global errors belong to the response interceptor.'
    ;;
  *.store.ts)
    category="stores"
    message='[STORE RULES] defineStore with the setup syntax. May use services and VueUse; NEVER project orchestrating composables. Only create a store when state is shared across areas — otherwise use a composable.'
    ;;
  */composables/*)
    category="composables"
    message='[COMPOSABLE RULES] The orchestrator: may use stores and services. Check VueUse before writing one from scratch. Auto-imported — no manual import needed. Named export, `use` prefix.'
    ;;
  */src/views/*)
    category="views"
    message='[VIEW RULES] Route-bound only. Structure: View.vue, view.routes.ts, view.service.ts, optional view.store.ts, composables/, components/. Root component name matches the route. Routes use `name: routeNames.xxx`, never a string literal. Named navigation only.'
    ;;
  */src/features/*)
    category="features"
    message='[FEATURE RULES] Route-agnostic, ONE single responsibility. A feature NEVER imports from another feature — orchestrate via a view, a composable, or helpers.eventEmitter. Modals are `*Modal.vue` and auto-register.'
    ;;
  */src/router/*)
    category="router"
    message='[ROUTER RULES] routeNames is auto-generated — do not hand-edit route-names-registry.ts. Guards are driven by store state. Every admin route sits behind the auth guard.'
    ;;
  *.vue)
    category="components"
    message='[COMPONENT RULES] Check Element Plus before building UI from scratch. Tailwind utilities in the template — no @apply, no class strings built in JS. No export default. No as any. Component CSS stays in the .vue file.'
    ;;
esac

[ -z "$category" ] && exit 0

# Dedupe per session — touch a marker file once per (session, category)
state_dir="/tmp/claude-hook-state/$session"
marker="$state_dir/$category"
mkdir -p "$state_dir"

[ -f "$marker" ] && exit 0
touch "$marker"

echo "$message"
