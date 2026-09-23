# Audit: show what changed since the previous run (issue #126)

**Reviewed:** preflight 3b3f231 critic 92cf52e critic fea13bc critic 326ce0b — the 3-round cap ended
the loop; Dan asked for round 4, its findings are folded in at 876ee2b, and Dan gave the go for
implementation in a dedicated stage (2026-09-23)
**Base:** PR #139 (`70439fa`, result icons in `lib/fix-brief.mjs`) — this branch sits on it; rebase onto
`upstream/main` once #139 merges. Nothing here edits the lines #139 changed except by adding beside them.

## Goal

`audit/<component>/fix-brief.md` gains a script-rendered `## Changes since the previous run` section
inside the report block. It shows what differs between this run and the previous run of the same
component at the same depth, and never says "fixed" or "resolved".

## Problem

Issue #126. PR #115 tried this by recomputing the previous run's verdict from its kept inputs and
pairing findings by position. Each of its three sentinel rounds reproduced a new false report
(`.claude/plans/2026-09-23-audit-report-summary-and-delta.md` § Sentinel rounds). Root cause: the
comparison **inferred** from a recomputed verdict what the previous run graded. The fix is to
**record** it when the run happens.

## Decision

### Options

| Option | Complexity added now | Cost to build | Cost to maintain | Cost to reverse | Risk | Value |
| --- | --- | --- | --- | --- | --- | --- |
| A. Per-run record written at verdict time (`runs/<run>/record.json`: graded scopes, row results, finding identities) and compared as data | med — 1 module, 1 persisted file | med | low — compare logic reads a frozen, versioned format | low — git-ignored, disposable, versioned; delete the file and the module | New persisted format; runs before this change have no record, so the first run after it compares nothing | Meets all five constraints of #126 by construction |
| B. Recompute the baseline verdict from kept inputs (PR #115's approach) | med | med | high — every verdict rule change silently alters the baseline | low | Reproduced false claims in 3 of 3 sentinel rounds | Works on existing runs with no record |
| C. Copy each run's `verdict.json` into the run dir and diff two verdicts at compare time | low | low | med — identity and graded-scope logic re-derived from verdict shape on every compare; the verdict does not record which AI legs wrote or which rows were report-only | low | Leg writes with no findings and report-only rows are invisible, so round 3's "advisory drops to 0" returns | Simplest |

Recommendation: **A**. B has already failed three times. C cannot see what was graded, which is
constraint 2 of the issue.

### Design (option A)

1. **The record.** `lib/run-record.mjs` exports `buildRunRecord({ run, verdict, envelope, legs })`.
   `verdict.mjs` computes `legs` as `[{ leg, graded, cause }]`, using its own `findingShapeIssue`
   (`verdict.mjs:214`) and AI schema check. So the rule lives in one place, and `run-record.mjs`
   never imports `verdict.mjs`, which would be a cycle.
   It is pure and returns:
   ```
   { schemaVersion: RUN_RECORD_SCHEMA_VERSION, run, component, depth, state, headline,
     rows:     [{ id, name, result }],        // rowResults(verdict), in verdict.rows order
     scopes:   ['figma-gate', 'leg:<leg>', 'row:<id>', …],   // sorted: what THIS run graded
     findings: [{ scope, key, label }] }      // sorted by scope, key; duplicates kept (multiset)
   ```
   `RUN_RECORD_SCHEMA_VERSION = '1.0.0'` lives in `lib/json-output.mjs` beside the other schema
   versions.
2. **Graded scopes: recorded, never inferred.** Every scope needs a valid envelope: present,
   `schemaMajor` matching, and `preflight.ok !== false`. Beyond that:
   - `row:<id>`: an envelope result row with `status === 'ok'`, `blocking !== false`, no
     `deferred`, and no finding with `noTarget === true` in `findingsByTool[row.name]`. So a row
     that was excused, crashed, missing-prereq, skipped, deferred, report-only, dropped by
     `--only`/`--skip`, or resolved no target is not graded.
   - `leg:<leg>`: graded only when three things hold: its file is readable at a matching schema
     major, `Array.isArray(data.findings)` holds (zero findings is fine), and no finding failed
     `findingShapeIssue`. Otherwise it goes under Not compared with its cause: `unreadable or
     unknown schema`, `findings is not a list`, or `<n> findings ignored`. So a leg that wrote a
     malformed file never reads as "reported nothing". (`computeVerdict` maps a non-array
     `findings` to `[]`, `verdict.mjs:420`, and that is exactly the case this closes.)
   - `figma-gate`: `depth !== 'quick' && !noFigma`. This covers the "no manifest" NEEDS-DECISION.
3. **Finding identity.** `key` is a JSON array string. `fileOf(location)` strips a trailing
   `:<line>` or `:<line>:<col>`. `stable(text)` replaces every hex colour literal
   (`#[0-9a-f]{3,8}\b`, case-insensitive) by `#hex` and then every run of digits (with an optional
   decimal part) by `#`, so a measured value never enters a key. The colour step comes first:
   `15-style-parity` reports colours as `#rrggbb` (`lib/style-values.mjs:34`).
   Why: only `15-style-parity.mjs` sets `actual`; every other FAIL's `actual` is its message
   (`verdict.mjs:180`), and messages embed measurements such as a pixel-diff %, bundle KB, a
   coverage % or a contrast ratio (`11-pixel-diff-states.mjs:553`, `08-bundle-size.mjs:119`,
   `06-test-coverage.mjs:269`, `10-contrast-pairs.mjs:496`).
   - FAIL entry: `['fail', code, fileOf(location), stable(message), stable(expected.value)]`,
     scope `row:<rowIdOf(check)>`. The key needs `message`, not `actual`: for `15-style-parity`,
     `actual` is the bare rendered value (`12px`) and every finding sits on the manifest file.
     Only the message carries `state › target › prop` (`15-style-parity.mjs:122`). So `failEntry`
     adds the finding's `message` to the FAIL entry (additive, same 2.1.0 bump; `renderEntry`
     prints only `BRIEF_FIELDS`, so the brief is unchanged). An entry without a message keys on
     `stable(actual)`. One code is cut before keying. For `STYLE-MISMATCH` only the message text
     before the first `: ` is used, which is `state › target › prop`. The rest carries the Figma
     node, the values and a token suffix matched from the rendered value
     (`15-style-parity.mjs:123`, `lib/token-match.mjs:96`), and that suffix changes whenever the
     colour changes. The cut is part of the record format. The expected value still enters the key
     through `stable(expected.value)`.
   - warning: `['warning', code, stable(message)]`, scope `row:<rowIdOf(check)>`. Verdict warnings
     carry no file (`verdict.mjs:257`), so the same warning in two files is counted, not told
     apart. This is accepted and documented in Phase 2.
   - Figma-gate NEEDS-DECISION entry: `['decision', node]`, scope `figma-gate`. There is at most
     one per run, and its question gains a suffix when the manifest is uncommitted
     (`verdict.mjs:440`), so the question stays out of the key.
   - advisory FAIL: `['fail', code, fileOf(location)]`, scope `leg:<owner>`. An AI leg's prose is
     reworded on every re-dispatch, so the prose stays out of the key.
   - advisory NEEDS-DECISION: `['decision', node]`, scope `leg:<owner>`. To make this possible,
     `aiFailOrDecision` adds `owner: leg` to the decision shape (additive). `VERDICT_SCHEMA_VERSION`
     goes from 2.0.0 to 2.1.0. A new `SUMMARY_SCHEMA_VERSION = '2.0.0'` takes over at
     `verdict.mjs:600` and `:777`, so `summary.json` stays byte-for-byte unchanged. The index
     table's Owner column then shows the leg where it shows `—` today.
   - INCOMPLETE entries are not keyed. Their row's result change carries them.
   - `label` is the finding's raw text, measurements included: `<check> · <code> · <file> — <message
     or actual>`, or `<node> — <question>`.

   The line is deliberately NOT in the key. A shift caused by an unrelated edit leaves the finding
   unchanged. Findings that share a key cannot be told apart, so they are **counted, never paired**:
   the comparison reports "reported 2 → 1 times" and never which one went. This rules out
   positional pairing by construction. The trade is stated: two findings that differ only in a
   number (a state named `size-32` vs `size-48`) share a key and are counted together. The
   reverse is also accepted: a message whose free text changes for a reason other than the finding
   reads as gone + new. Examples are row 11's masking note (`11-pixel-diff-states.mjs:553`), row
   06's list of failing metrics (`06-test-coverage.mjs:269`), and a keyword value such as
   `normal` → `bold`. That noise is honest (no status is claimed), and Phase 2 documents it.
   The key recipe and `stable()` are part of the record format. Changing either needs a major bump
   of `RUN_RECORD_SCHEMA_VERSION`, and a golden-record spec fails until it gets one.
4. **The baseline.** `findPreviousRecord(componentDir, currentRun, depth)` lists `runs/*` names
   `< currentRun` (string order; `defaultRunId` is an ISO timestamp, so it is chronological), from
   newest to oldest, and takes the first match:
   - no `record.json` (a run from before this change, or a failed write) → skip;
   - a record at another depth → skip;
   - a record with an empty `scopes` → skip and count it. This is a run that graded nothing: a
     preflight failure, or an envelope that could not be read;
   - a record that does not parse, lacks `depth`/`scopes`/`rows`/`findings` of the right types, or
     has another `schemaVersion` major → stop with `{ unusable: { run, cause } }`, never falling
     through to an older record;
   - otherwise → the baseline, together with the count of skipped runs that graded nothing.

   None found → `null`, along with that same count.
   Note: a record without `depth` does not parse into a usable record and stops the search with
   its cause.
5. **The comparison.** `compareRecords(current, previous)` is pure and returns
   `{ baseline: null } | { unusable } | { baseline: { run, headline }, skippedEmpty, headline,
   rowChanges, notCompared, added, gone, countChanged, textChanged, unchanged }`:
   - `rowChanges`: every row id in either record whose result differs, with `'—'` for a row
     absent on one side. A check made required after the baseline ran therefore reads as
     `— → <its result now>` (e.g. `— → skipped` when it did not run), with no claim about its
     findings.
   - `notCompared`: every scope graded in exactly one run, with what each side recorded (a row's
     result, or `not in that run`; a leg `wrote`, `did not write`, or `wrote a file not compared
     (<cause>)`; the figma gate `checked` /
     `not checked`).
   - Findings are compared only within scopes graded in both runs, as multisets by `(scope, key)`:
     `added` (count 0 → n), `gone` (n → 0), `countChanged` (n → m). Where the counts are equal,
     the sorted raw labels are compared too: they differ → `textChanged` (previous and current
     labels, e.g. `4.2% diff` → `3.1% diff`); otherwise the finding counts toward `unchanged`
     (a number).
   - All lists are sorted by `(scope, key)`. The output is deterministic.
6. **Rendering.** `renderFixBrief(verdict, changes = null)` renders `renderChanges(changes)` after
   the summary tables, before `REPORT_END`. `null` renders nothing. A `changes` value of any other
   shape than the declared ones throws. `fix-brief.spec.mjs:218` already passes a stray second
   argument (`{ run: 'r1' }`); that call drops the argument. Wording:
   - no baseline: `No earlier run at <depth> left a record under audit/<c>/runs/ — nothing to compare.`
   - unusable: `The previous run at <depth> (<run>) has a record this version cannot read (<cause>). Not compared.`
   - Building the record, looking up the baseline and comparing all run inside one `try` in
     `writeVerdictForRun`. A throw from any of them, `readdirSync`/`readFileSync` on `runs/`
     included, renders `Not compared: <error message>` and skips writing `record.json`. The error
     never blocks `verdict.json` or the rest of the brief.
   - otherwise: `Compared with run <run>: <prev headline> → <headline>`, followed by
     `(<n> later runs graded nothing and were skipped)` when n > 0. Then a
     `| # | Check | Previous | Now |` table of `rowChanges` (icons via `resultIcon` for real results
     only), a `Not compared` list, and the counts line `Findings in checks both runs graded: n newly
     reported · n no longer reported · n reported a different number of times · n with changed text
     · n unchanged`. Then bullets: `- newly reported: <label>` (`×n` when n > 1),
     `- no longer reported: <label>`, `- reported <n> → <m> times: <label>`,
     `- text changed: <previous label> → <label>`. Last, one line: `"No longer reported" means no
     finding with this identity was reported this time by a check both runs graded; the audit does
     not say why.`
   - A not-compared leg line names the re-render command: `yarn audit:component --rerender <c>`.
   - Every value goes through `line()` / `cell()`. The renderer's own words never include `fixed` or
     `resolved`. A quoted label is a finding's text, including an AI leg's free prose, so it may
     contain either word. It is data, rendered as found and never rewritten: rewriting it would
     misquote the finding. It always sits after a fixed status prefix (`newly reported:` /
     `no longer reported:` / `reported n → m times:` / `text changed:`), so the status comes from
     the renderer and never from the finding. The same holds for the two headlines and the row
     names, which carry manifest text (an excuse reason, `verdict.mjs:100`).
7. **Writing.** `writeVerdictForRun` computes the verdict, the record, the baseline, the changes
   and the brief first, then writes `verdict.json`, `fix-brief.md` and `runs/<run>/record.json`.
   A render failure writes none of them. A failure writing `record.json` alone is caught: it
   prints `verdict: record.json not written for <run>: <cause>` to stderr and changes no exit code.
   The next run then names an older baseline, or none. `record.json` is written only when the run
   is the newest dir under `runs/` (by name). `--run-dir` can re-render an older run when
   `summary.json` does not list the component (`verdict.mjs:765`), and that re-render must not
   rewrite a baseline a later run already compared against. `readRunInputs` does not read `record.json`, so
   `verdict.json` stays a pure function of `envelope.json` + `ai/`. `--rerender` goes through the
   same function, so a leg that writes after the run is picked up then.

## Acceptance bar

Zero tolerance. Every spec item is graded by `node --test "scripts/__tests__/audit/*.spec.mjs"`.
That command runs all 38+ spec files in the directory, and every one must stay green, not only the
two named here:
- `run-record.spec.mjs` false cases: each false case from PR #115's rounds makes no claim about the
  affected finding and lists the scope under Not compared. The cases: a row excused, crashed,
  deferred, report-only, dropped by `--only`, dropped by `--skip`, or noTarget this run; a leg that
  wrote last run and not yet this run; `--no-figma` now vs not then.
- `run-record.spec.mjs` identity: two findings with the same code in one file with no line, one
  gone → `reported 2 → 1 times`, and no line says which one. The same finding at a shifted line →
  `unchanged`. The same finding with a different measured number (`4.2% diff` → `3.1% diff`) →
  `text changed`, never gone + new. The same style-parity finding with a different hex colour →
  `text changed`. Two style-parity findings with equal values but different `state › target ›
  prop` (one gone, one new) → one `no longer reported` plus one `newly reported`, never
  `unchanged`. An AI leg's finding reworded with the same code and file → never gone + new. A leg
  with a shape-rejected finding → Not compared.
- `run-record.spec.mjs` baseline robustness: a run that graded nothing is skipped and counted. A
  corrupt, mis-shaped or unreadable (read error) newest record → `unusable`, with no fall-through.
  A throw from `buildRunRecord`, `findPreviousRecord` or `compareRecords` → `Not compared: <cause>`
  while `verdict.json` is still written. A leg whose `findings` is not an array → Not compared. A
  style-parity pair built with `mismatchFinding()` (tokens set) whose rendered colour changed →
  `text changed`. An older run re-rendered via `--run-dir` leaves its `record.json` untouched.
- `run-record.spec.mjs` golden record: a fixed envelope plus AI files produces a checked-in
  `__fixtures__/run-record/record.golden.json` byte for byte. Also,
  `compareRecords(r, JSON.parse(JSON.stringify(r)))` reports zero changes.
- `run-record.spec.mjs` end to end: `writeVerdictForRun` on run A, then on run B, in one temp
  component dir. B's `fix-brief.md` contains `Compared with run A` and the expected bullets.
- `verdict.spec.mjs` summary unchanged: `summary.json`'s `schemaVersion` is still `2.0.0`.
- `run-record.spec.mjs` required-later: a row absent in the baseline record → a row change with `—`
  and no finding claim.
- `run-record.spec.mjs` settled decision: a figma-gate NEEDS-DECISION that both runs checked →
  `no longer reported`.
- `run-record.spec.mjs` baseline selection: the newest older same-depth record wins; a record at
  another depth is skipped; a run dir with no `record.json` is skipped; a newer run name is never
  used; an incompatible major → "Not compared", with no fall-through.
- `run-record.spec.mjs` wording: the renderer's own text never matches `/\b(fixed|resolved)\b/i`.
  Asserted on every fixture's section with each quoted label, both headlines and every row name cut
  out. A spec case gives an AI leg
  the message `appears resolved upstream`: that text appears only inside its quoted label, and the
  section adds no status word of its own. Quoted values are data and are not rewritten.
- `run-record.spec.mjs` hostile text: `|`, `\|`, a newline or ESC in a label cannot add a column,
  a row or a heading.
- `run-record.spec.mjs` purity: `verdict.json` is byte-identical with and without a previous run
  present. `verdict.spec.mjs`'s existing byte-identical spec stays green.
- `run-record.spec.mjs` determinism: re-rendering the same run twice gives byte-identical
  `fix-brief.md` and `record.json`.
- `npx eslint scripts/audit scripts/__tests__/audit` exits 0.
- `npx prettier --check scripts/audit scripts/__tests__/audit` exits 0. Markdown is not covered:
  `.prettierignore` lists `*.md`, so the docs are graded by `yarn docs:check` alone.
- `yarn docs:check` exits 0.

Tolerances: none. The output is deterministic.

## Global constraints

- Node 24 (`.nvmrc`); run everything under `fnm exec --using 24`. `node:test` specs.
- Run `yarn install --immutable` first. The worktree has no `node_modules`, and without it `npx`
  fetches unpinned tools.
- English in every authored file. No change to exit codes or `summary.json`: it keeps `2.0.0` via
  `SUMMARY_SCHEMA_VERSION`. `verdict.json` changes only by the additive `owner` on AI decision
  entries (schema 2.1.0).
- `rowResults` / `rowIdOf` stay in `fix-brief.mjs`, and `run-record.mjs` imports them. Moving them
  into their own module was considered and left for later, to keep this diff away from the lines
  #139 just changed.
- Do not touch `resultIcon` / the Result cell lines from #139 beyond calling `resultIcon`.
- No changelog fragment: this is audit tooling, not a change a package consumer notices
  (`changes/README.md`).
- Dispatched legs run no git that discards or hides worktree state; the controller commits.

## Tasks

### Phase 1: record, compare, render (implementer)

**Executor**: implementer · sonnet · high · wave 1

**Files:** `scripts/audit/lib/run-record.mjs` (new), `scripts/audit/lib/json-output.mjs`,
`scripts/audit/lib/fix-brief.mjs`, `scripts/audit/verdict.mjs`,
`scripts/__tests__/audit/run-record.spec.mjs` (new),
`scripts/__tests__/audit/__fixtures__/run-record/record.golden.json` (new), plus existing specs under
`scripts/__tests__/audit/`, touched only where they pin `VERDICT_SCHEMA_VERSION` or the AI
decision's Owner cell. `verdict.spec.mjs` also gains the summary-unchanged assertion, and
`fix-brief.spec.mjs:218` drops its stray second argument to `renderFixBrief`.

1. `json-output.mjs`: `RUN_RECORD_SCHEMA_VERSION`; `VERDICT_SCHEMA_VERSION` → `2.1.0`;
   `SUMMARY_SCHEMA_VERSION = '2.0.0'`, used by `writeSummary` and `earlyExitSummary`.
2. `run-record.mjs`: `buildRunRecord`, `findPreviousRecord`, `compareRecords` (Design 1–5).
   Reuse `rowResults` from `fix-brief.mjs`; export `rowIdOf` from there rather than copying it.
3. `verdict.mjs`: `owner: leg` on the AI decision; `message` on FAIL entries; the per-leg
   `legs` list for `buildRunRecord` (Design 1–2); `writeVerdictForRun` per Design 7; update the
   layout comment at the file head.
4. `fix-brief.mjs`: `renderChanges`, and `renderFixBrief(verdict, changes = null)` (Design 6).
5. Specs per the acceptance bar, TDD: write each failing case first.

### Phase 2: docs (implementer)

**Executor**: implementer · sonnet · medium · wave 2

**Files:** `scripts/audit/README.md`, `.claude/skills/audit-component/references/report-template.md`,
`.claude/skills/audit-component/SKILL.md` (only if step 4's wording needs the new section named).

1. The layout tables gain `audit/<component>/runs/<run>/record.json`: written by `verdict.mjs`,
   read only by the next run's comparison, not an input.
2. The report-block description gains `## Changes since the previous run`: what the words mean,
   that only checks graded in both runs are compared, that the first run after an upgrade
   compares nothing, and that deleting `runs/` resets the baseline.
3. Identity limits, stated as they are (Design 3): findings that differ only in a number are
   counted together; free-text that changes for another reason reads as gone + new; a warning
   carries no file.
4. Baseline choice, stated as it is: the previous run is the newest earlier same-depth record that
   graded something. A verdict-mode `--only` run can therefore be the baseline, and then most rows
   sit under Not compared. That is honest, and the header names the run.
5. Retention, stated as it is: nothing prunes `runs/`, which already held `envelope.json` and
   `ai/` per run before this change. `record.json` adds one small file per run. Cleanup is manual
   (`rm -rf audit/<component>/runs`), and the next run then compares nothing. The baseline lookup
   reads names newest-first and stops at the first same-depth record, so it seldom walks far.

## Execution matrix

| Phase | Owner | Model | Effort | Wave | Depends on | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | implementer | sonnet | high | 1 | — | acceptance-bar commands green |
| 2 | implementer | sonnet | medium | 2 | 1 | `yarn docs:check`, prettier |
| Grade | main session | — | — | 3 | 1, 2 | `code-review` then `dan-fresh-eyes` verify |

Phase 2 waits for Phase 1 because the docs describe the rendered wording. The two phases share no
file.

## Self-refute log

1. **Does the fix reuse the defect's mechanism?** The defect was inferring what the baseline graded
   from a verdict recomputed later. This design still derives the graded scopes by rule (Design 2),
   but from the raw envelope and `ai/` at the moment the run happens, and it freezes them in a
   versioned record. Leg scope means "a readable file exists"; it is not the leg's claim about its
   coverage. Scanned: Design 2–4. No instance.
2. **Can the letter be met while the intent is violated?** Yes, one instance: a row graded in both
   runs whose target set shrank (row 12 over fewer stories, row 11 over fewer manifest states). Its
   findings read "no longer reported" although nothing was re-checked. Design 6's closing line
   covers it ("the audit does not say why"), and "no longer reported" never implies fixed. Accepted
   as a limit of row-level scope: per-target scope would need every check to report its targets,
   which is out of scope for #126.
3. **Numeric targets with a denominator?** No instance. The bar is zero-tolerance cases plus exit
   codes, with no percentages.
4. **Do two rules interact into an unintended pass?** One instance: Design 4 skips a run dir with
   no `record.json`, and Design 7 writes `record.json` last. So a run whose record write failed is
   skipped, and the comparison uses an older run. That is visible, not silent: the header names the
   baseline run id (Design 6), and runs from before this change have no record anyway, so the skip
   must exist. A record that exists but cannot be used stops the search instead (round 2). Also checked, no instance: "compare only scopes graded in both" against
   "row changes list every row". An excused-now row shows `fail → excused` in the row table and
   sits under Not compared, with no finding claim.

## Not verified (to fill at close)
