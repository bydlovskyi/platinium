# Lessons Learned

Knowledge accumulated from past orchestration runs. Each entry captures a non-obvious insight that should influence future work.

**Read this file at the start of every team command run.** Skip entries that don't apply to the current task.

<!--
FORMAT FOR NEW ENTRIES:

## [YYYY-MM-DD] [Feature/Task Name]

**Category:** schema | backend | frontend | e2e | architecture | debugging | review | process
**Context:** [What was being built/fixed]

**Lesson:** [The non-obvious insight — what happened and why it matters]

**Action:** [What to do differently next time]
-->

## [2026-09-22] Response interceptor & notification service (issue #16)

**Category:** architecture | process
**Context:** Built the global response interceptor and notification service (PRD-001). The acceptance criteria said 401 should "reset the session and redirect to login," but the auth store and login route are a separate, later slice (#19) that hadn't started.

**Lesson:** The cascade-stack sometimes assigns a slice an acceptance criterion that literally cannot be implemented yet because a downstream slice owns the piece it needs (here: a route name and a session store that don't exist). Guessing at the missing piece (e.g. hand-adding a `routeNames.login` the generator hasn't produced yet) breaks type-check or duplicates work the owning slice will redo. The project's own EventEmitter pattern (`helpers.eventEmitter` / `IEventMap` in `src/utils/helpers.ts`) is the intended decoupling point for exactly this: the early slice publishes a typed event describing what happened, the later slice subscribes and does the part it owns.

**Action:** When a slice's acceptance criterion depends on a UI surface or store that a later, not-yet-started slice owns, implement the emit-only half via the EventEmitter and document the forward dependency with a one-line comment plus a PR-body note — don't stub the missing route/store yourself and don't skip the criterion.

**Lesson 2:** Building a notification service surfaced that the design-token foundation slice (#12) only defined `accent`/`danger`/`status-*` tokens, not `success`/`warning`/`info` — and Element Plus's own `el-notification.css` wasn't imported anywhere in the app yet, so `ElNotification`'s `type` prop would have rendered with library-default colors regardless of what tokens existed.

**Action:** Any slice that's the first to actually use an Element Plus component with semantic type variants (notification, alert, tag, etc.) should check both (a) whether the needed semantic tokens exist in `src/assets/styles/tokens.ts` yet, and (b) whether that component's theme-chalk CSS is imported in `src/assets/styles/element-reset/components/index.css` — the design-foundation slice only pre-built tokens for components already in use at the time, not every Element Plus component the app will eventually touch.
