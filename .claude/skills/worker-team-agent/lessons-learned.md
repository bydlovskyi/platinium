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

## [2026-09-22] Docker multi-stage build (issue #17)

**Category:** architecture | process
**Context:** Building the Docker slice's "produces a working portal with seeded data" acceptance criterion required checking whether the mock backend actually answers requests inside the container's built bundle.

**Lesson:** The browser MSW worker only registers when `import.meta.env.DEV` is true — an explicit, deliberately reviewed acceptance criterion from #15 ("registered in development only, never in a production build"). That's sound advice for a project with a real backend, but this project never has one: `vite build` is what both a hypothetical real deployment and this project's only deployment (the Docker demo) run, so the `DEV` gate silently strips the entire "backend" out of the one build artifact that's supposed to demonstrate the app. PRD-001's Docker section assumes the opposite ("the mock API runs inside the browser... the production image needs no second service"). Neither #15 nor #17's issue body flagged this tension — it only surfaces when you actually trace what `vite build` produces versus what `npm run dev` produces.

**Action:** Did not fix it from the Docker slice — silently loosening another slice's explicit, reviewed acceptance criterion from outside that slice's file scope is a guess, not a verification. Left it as an open question on #17 for a human call: either relax the `DEV` gate to something like "not test mode" so the mock also ships in the Docker/demo build, or scope PRD-001's "seeded data" claim down to dev-only. Any later slice that touches `src/main.ts`, `src/mocks/browser.ts`, or writes TECHNICAL_REVIEW.md's "accepted debt" section should resolve this explicitly rather than re-discovering it.

## [2026-09-22] Session and login — auth store, route guard, login screen (issue #19)

**Category:** frontend | debugging
**Context:** The PRD explicitly flagged "session bootstrap must complete before the first guard evaluation, not merely before mount" as the likely source of a subtle defect in this slice.

**Lesson:** It was real, and gating the bootstrap chain on `router.isReady()` — the obvious-looking fix — does not fix it. `app.use(router)` itself triggers Vue Router's initial navigation (and therefore the first `beforeEach` guard evaluation) the moment it's called, not when `router.isReady()` is later awaited; `isReady()` only resolves whatever navigation decision the guard already made. A bootstrap chain of `enableMockingIfNeeded().then(restore).then(() => router.isReady())` with `app.use(router)` called synchronously up front still lets the guard run against the pre-restore store state, because installing the router happens before any of that chain resolves. Static code reading and a passing type-check did not catch this — it only surfaced under a live Playwright reload test on a protected route. The fix was to defer `app.use(router)` itself into the `.then()` chain, after `restore()` resolves and before `router.isReady()`.

**Action:** For any app-bootstrap ordering problem involving Vue Router guards and async state restoration, verify the fix live (reload a route that should be affected) rather than trusting that "moved code earlier in the `.then()` chain" is sufficient — confirm what actually triggers the guard's first run (installing the router), not just what the chain appears to sequence.

**Lesson 2 (process risk):** A downstream teammate (writing tests) hit what looked like a stray file conflict mid-task and ran `git stash` / `git stash drop` to clear it — not realizing the working tree held substantial uncommitted work from the build phase. This silently reverted several tracked files, including a type augmentation (`dts/global.d.ts`'s `RouteMeta.requiresAuth`/`requiresAnonymous`). The teammate reconstructed most files from what it had read earlier in its own context and reported "type-check passes," which was true but misleading: `RouteMeta` in this project's vue-router version extends `Record<string, unknown>`, so a route guard reading `to.meta.requiresAuth` type-checks fine even with no such property declared anywhere — the augmentation's loss was functionally silent to every automated gate (lint, type-check, and even the tests, which stub `to.meta` directly rather than going through the real augmented type). It was only caught by an independent manual diff of `git status`/`dts/global.d.ts` against what the build phase had actually reported adding.

**Action:** Never run `git stash` (or any history-rewriting git command) mid-task when other work in the same tree might be uncommitted — check `git status`/`git diff` first and resolve the actual conflict directly instead. When a build phase reports "added a type augmentation" and later phases touch the same area, re-diff that specific file against the build phase's own report before trusting a later "type-check passes" — a permissive ambient type (an index-signature-extended interface, `any`, a too-wide union) can make a real regression invisible to the automated gates that are supposed to catch it.

## [2026-09-23] List resource composable (issue #22)

**Category:** process | frontend
**Context:** After a review pass renamed a hand-edited import (`IPaginationMeta` from `src/mocks/db/`) to the canonical ambient global type (`TPaginationMeta` from `src/features/platform/api/dts/index.d.ts`), `npm run type-check` failed with `Cannot find name 'useListResource'` inside the new composable's own spec file — even though the composable itself, its export, and the auto-import entries the build phase had generated all looked correct on inspection.

**Lesson:** `.config/auto-imports/auto-import.json` and `dts/auto-imports/auto-import-scripts.d.ts` are not a static one-time scan of `src/` — unplugin-auto-import (re)populates them as a side effect of an actual Vite-driven run (`npm run dev`, `npm run test`/`vitest`), and a later command in the same session (in this case a second `npm run lint` pass) can leave them showing as unmodified/reverted relative to `main` if nothing Vite-driven has re-touched the new file since. `vue-tsc --build` reads whatever is currently on disk, so if the registry doesn't yet mention a brand-new auto-imported composable, type-check fails on call sites that use it with a name-resolution error — one that looks like a real missing-import bug but isn't.

**Action:** After adding a new auto-imported composable (or renaming/moving one), run `npx vitest run <its .spec.ts>` (or `npm run dev` briefly) *before* trusting a `npm run type-check` failure that says `Cannot find name` on something that's clearly exported and used correctly — that failure often means the auto-import registry is stale, not that the code is wrong. Re-run type-check after the Vite-driven pass regenerates the registry.
