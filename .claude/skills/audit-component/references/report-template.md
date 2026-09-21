## Scope

The report contract of the `audit-component` skill: which files carry the verdict, what their
fields mean, and the short synthesis the model adds. Load it when reading a verdict or writing
the synthesis. The procedure is in [`../SKILL.md`](../SKILL.md).

---

## The verdict is two files, both written by `verdict.mjs`

| Path (git-ignored) | Content |
| --- | --- |
| `audit/<component>/verdict.json` | State, level, excuses, rows, entries, advisory. Rewritten from its inputs on every run; a hand-edited copy does not survive the next run. |
| `audit/<component>/fix-brief.md` | The same entries as a self-contained brief for a fixing session. |
| `audit/_run/summary.json` | Every component's state and headline, the worst state, each `runDir`. |
| `audit/<component>/runs/<run>/envelope.json` | Run-all's inputs for that run, incl. `audit.aiLegs[]`. |
| `audit/<component>/runs/<run>/ai/<leg>/ai-findings.json` | One per AI leg; nothing else writes there. |

The model never writes, edits or paraphrases a verdict. `verdict.json` holds nothing that varies
between identical runs (no timestamps, durations, stderr text or run name), so two runs over the
same inputs give byte-identical files.

## Reading `verdict.json`

- `state` — `PASS` · `FAIL` · `INCOMPLETE` · `NEEDS-DECISION`; the exit code of
  `yarn audit:component` is 0 · 1 · 3 · 4 (2 = usage or internal error). Callers branch on the
  exit code, never on their own reading of the file.
- `level` — only on `PASS`: `CLEAN-STATIC`, `MERGE-READY` or `PRODUCTION-READY`.
- `headline` — `<STATE>@<depth> · <level> · <excuses> · ai-legs: self-attested` (the last part
  at `deep` only). Quote it verbatim.
- `excuses` — every waiver used: `browser: waived (flag | CI env)`, `figma: waived (flag)`,
  `figma: design none (…; decided by …; commit …)`, `figma: no manifest at HEAD`, Figma `skip`s.
- `notes` — e.g. `pending manifest change — not honoured`.
- `rows[]` — one per check: `id`, `status` (`ok`, `crashed`, `missing-prereq`, `skipped`),
  `required`, counts, `excuse` or `deferred`.
- `entries[]` — non-PASS items, ids `I<n>` (INCOMPLETE), `F<n>` (FAIL), `D<n>` (NEEDS-DECISION).
- `advisory[]` — `A<n>`: AI findings that do not change the state.
- `figma` — manifest, status, commit, overrides and skips honoured, Figma file version (`deep`).
- `aiLegs` — `deep` only: each leg's ids, input hash, `closed` or `open`.

## Fix-brief entry shapes

| State | Fields |
| --- | --- |
| FAIL | id · severity · check · location `file:line` · expected (value + source: Figma node or rule `file:line`) · actual · `verify:` command · owner |
| INCOMPLETE | id · check · cause · prerequisite command · `verify:` command that re-runs that one row |
| NEEDS-DECISION | id · Figma node (or `no manifest`) · question · options — the audit never picks one |
| Advisory | the FAIL shape, under "Advisory" |

## The synthesis (what the model writes)

```text
## Audit: <component> @ <depth>
**Verdict**: <headline, verbatim> — exit <code>
**Fix brief**: audit/<component>/fix-brief.md (<n> INCOMPLETE · <n> FAIL · <n> NEEDS-DECISION · <n> advisory)
**AI legs** (deep): <leg — closed | open (cause)>, one per leg

### Correlations
- <one defect seen by several checks, e.g. "the icon-only button fails 09 (no accessible name)
  and 10 (3.8:1 in dark) — one fix, two entries: F2, F5">

### Decisions needed
- <D-entries restated as questions to the user, options unchanged>

### Not verified
- <excused checks, deferred rows, `ai-legs: self-attested`, anything a leg could not render>
```

Rules:
- No second verdict, no severity re-grade, no "ready to merge": state and level are the file's.
- A correlation cites entry ids; it never merges or drops an entry.
- Present the report and stop. Do not auto-fix — the user chooses what to address.
