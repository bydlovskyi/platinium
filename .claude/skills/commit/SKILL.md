---
name: commit
description: Stage and commit the current work in this repo's conventional-commit style. Use when the user asks to commit, or when a slice is verified and ready to be recorded.
---

# Commit

1. Run `git status` and `git diff --stat`. Commit only what belongs to one change; split unrelated work.
2. Make sure the gates pass first: `npm run lint`, `npm run type-check`, `npm run test`. The pre-commit hook
   lints staged files and the pre-push hook runs type-check and the suite, so a failing commit is a wasted round trip.
3. Write the message in the style of the existing history (`git log --oneline -20`):

   ```
   <type>(<scope>): <imperative summary, lower case, no period>

   <why, in one or two sentences, when the diff does not say it>
   ```

   Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`. Scope is the area
   (`list`, `tickets`, `mocks`, `docker`, `views`, `forms`, `repo`).
4. Never mention issue numbers, PRD numbers or "slice" in the message; the history should read on its own.
5. End the message with the attribution line the session provides, when one is given.
6. Do not push unless asked.
