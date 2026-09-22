# Feedback Loops (§5)

Run in order. Don't advance with failures.

## 5.1 Lint
```bash
npm run lint
```
Fix every error and warning unless clearly irrelevant (justify in the commit).

## 5.2 Type-check
```bash
npm run type-check
```
Must exit 0. Fix ALL errors, not just yours. No `as any`, no `// @ts-ignore`
without a one-line justification.

## 5.3 Tests
```bash
npm run test
```
Must pass. The tests your slice's acceptance criteria call for are part of the
slice — a slice without them is not done. To iterate on one file:
```bash
npx vitest run <path>
```

Note: until slice #11 lands there is no test runner. If `npm run test` does not
exist yet, say so plainly in the commit rather than inventing a result.

## 5.4 Contract regeneration (ONLY on a `contract`-labelled slice)
```bash
npm run openapi-generate
```
Only when `src/mocks/openapi.yaml` changed. Read the diff in the generated
`src/features/platform/api/schema.ts` — check that every new path, parameter and
component came through with the types you expect. Stage the spec and the
generated file in the same commit. Never hand-edit the generated file.

A code slice that finds itself needing this has hit Hard Rule 8: stop, comment on
the owning contract issue, do not edit the spec.

If something genuinely cannot run, say so explicitly in the commit and PR — don't
silently skip.
