# Issue #21 — List query composable — URL-driven list state

| | |
|---|---|
| **GitHub issue** | [#21](https://github.com/bydlovskyi/platinum/issues/21) |
| **Parent PRD** | [#3](https://github.com/bydlovskyi/platinum/issues/3) · [`PRD-003-data-table-and-list-experience.md`](../prd/PRD-003-data-table-and-list-experience.md) |
| **Type** | AFK |
| **Slice** | 11 of 41 |
| **Branch** | `feat/21-list-query-composable` |

```
Parent: #3
Parent branch: feat/20-admin-shell
Branch: feat/21-list-query-composable
Blocked by: #20
```

## Parent PRD

#3 — [`docs/prd/PRD-003-data-table-and-list-experience.md`](../prd/PRD-003-data-table-and-list-experience.md)

## What to build

The centrepiece of the list experience, and the highest-leverage module in the
project.

One composable owns the full list query — search, filters, sort field, sort direction,
page, page size — synchronised bidirectionally with the route query. That single decision
produces several product properties at once: a filtered view is shareable by copying the
address bar, it survives a reload, the back button steps through filter changes as an
administrator expects, and returning from an edit restores the exact list they left.

The rules that are easy to get wrong are encoded once here rather than three times: search
is debounced before it reaches the URL so intermediate keystrokes do not create history
entries, any search or filter change resets to page one, defaults are omitted so a
pristine list has a clean address, and malformed parameters fall back to defaults rather
than propagating a bad request.

Generic over the entity's query type, tested with a memory router — no components, no
network. No UI in this slice; translating its sort direction to and from `el-table`'s
`ascending` / `descending` belongs to `AppDataTable` (#23), not here.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Owns search, filters, sort field, sort direction, page and page size
- [ ] Bidirectional sync with the route query
- [ ] Search debounced before reaching the URL; intermediate keystrokes create no history entries
- [ ] Any search or filter change resets the page to one
- [ ] Default values are omitted from the URL; a pristine list has a clean address
- [ ] Malformed input falls back to defaults: out-of-range page, unknown sort field, invalid filter value
- [ ] Filter shape declared per entity as a typed descriptor; the composable stays generic and each screen stays type-safe
- [ ] Page size persists per administrator across visits
- [ ] Unit tests: URL round-tripping, debounce behaviour, page reset on filter change, defaults omitted, defensive parsing of each malformed case
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #20 — *Admin shell — layouts, navigation, page header, responsive drawer, theme toggle*

This slice's branch is created off `feat/20-admin-shell` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/21-list-query-composable`

## User stories addressed

Referenced by number from the parent PRD:

- 1-4 (search and debounce, page reset)
- 16-19 (shareable URL, reload survival, back button, return from edit)
