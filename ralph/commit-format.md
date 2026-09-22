# Commit Format (§8)

Write as a human teammate would. Format:

```
<type>(<scope>): <short summary>

<1–3 sentences on why this exists and what it does. Link the issue with "Refs #N".>

<Optional: plain-prose list of notable areas touched, only if the diff is large.>

<Optional: a note for anything a reviewer must know — blockers, deferred items,
real reasons for skipped verification.>
```

`<scope>` is the area, not the layer: `events`, `tickets`, `categories`, `auth`,
`shell`, `table`, `mocks`, `contract`, `docker`, `design`, `tests`.

Rules:
- Phrase propagation the way a reviewer would read it ("Updated the list columns,
  the export serialiser and the fixtures to carry the new field") — not as a
  checklist.
- Mention verification only when it is unusual ("Regenerated the client types and
  reviewed the schema diff").
- State real reasons for skips plainly ("Couldn't run the browser check — the host
  dev server wasn't running; noted in the PR for manual QA").
- Never `Closes #N` unless every acceptance criterion on the issue is met.
- No `--no-verify`. No force push to a branch another slice is stacked on.
- See Hard Rule 2 for forbidden content.
