# scripts/audit/ — deterministic audit suite

Local Node ESM scripts that replace mechanical review work: anti-pattern greps,
structure and JSDoc checks, accessibility and contrast measurements, pixel and
style comparison against Figma. Each script is read-only, emits a standard JSON
envelope, and is independently testable with `node --test`.

## Why this exists

Reviewing a component by hand means **mechanical, deterministic** work —
running 14 grep calls, parsing JSON reports, building markdown tables. That
kind of work has a single correct answer per input, so a script delivers
identical results in a fraction of the time.

The scripts in this folder run that mechanical work; advisory review legs keep
the **judgment-heavy** parts: naming critique, architecture review, ARIA
correctness for a captured tree, WCAG remediation choice, edge-case story
suggestions, etc.

## Quality contract

Every script obeys:

1. **Output identical or superior accuracy** to what a manual review produces.
2. **Never force a reviewer to compensate** — output is a clean JSON envelope, no raw
   text parsing needed downstream.
3. **Read-only** on source files. No script writes to `src/` or `tokens/`,
   and none writes a `*.figma.json` manifest. The audit's own
   outputs are git-ignored: `audit/` (verdicts, fix briefs, run inputs),
   `.audit-figma/` (the `HEAD` copy of each manifest, Figma references) and
   `.audit-storybook.json`. The scaffolders under `scripts/scaffold/` are the
   only source writers, and they require an explicit `--write` flag.
4. **Regression-gated** before a manual step is dropped: run the legacy
   review and the new script on the same component; critical + high
   findings must be identical (warnings ≤ 5% diff, and only in the direction
   of MORE — never fewer).

## Layout

```
scripts/audit/
├── lib/
│   ├── changed-components.mjs       — git diff vs main, returns mud-* names
│   ├── component-paths.mjs          — resolve mud-X → canonical file paths
│   ├── browser-context.mjs          — lazy Playwright wrapper + install hints (package, browser binary)
│   ├── figma-manifest.mjs           — Figma state manifest: schema, validation, state resolution
│   ├── state-page.mjs               — render a manifest state (fixture, clock, theme, interactions) + capture
│   ├── image-diff.mjs               — Pixelmatch with background flattening and canvas alignment
│   ├── style-values.mjs             — normalise/compare CSS values (colours, lengths, shadows)
│   ├── storybook-helpers.mjs        — port probe (TCP, no shell), URL builder, this worktree's Storybook
│   ├── ts-parser.mjs                — TypeScript compiler API wrappers
│   ├── cli-args.mjs                 — shared --json/--out/--all/--changed parsing, --depth resolution
│   ├── json-output.mjs              — buildResult(), emit(), finding(); STATE / LEVEL / ROW_STATUS enums
│   ├── env-preflight.mjs            — is the install usable (Node version, required packages)
│   ├── fix-brief.mjs                — renders audit/<component>/fix-brief.md from a verdict
│   └── exit-codes.mjs               — script exits 0/1/2; STATE_EXIT_CODES for verdict.mjs
├── 01-component-structure.mjs       (Wave A — fast, no browser)
├── 02-stencil-antipatterns.mjs      (Wave A) ★ highest-impact
├── 03-git-hygiene.mjs               (Wave A)
├── 04-jsdoc-completeness.mjs        (Wave A)
├── 05-story-exports.mjs             (Wave A)
├── 07-integration-usage.mjs         (Wave A)
├── 14-component-contract.mjs        (Wave A)
├── 16-stencil-contract.mjs          (Wave A — report-only Stencil rules)
├── 17-adapter-contract.mjs          (Wave A as row 17 `--part source`; Wave B as row 18 `--part cem`)
├── 06-test-coverage.mjs             (Wave B — depends on coverage/coverage-summary.json)
├── 08-bundle-size.mjs               (Wave B — depends on dist/)
├── 13-token-diff.mjs                (Wave B — component mode needs tokens-tokenhaus.json)
├── 09-a11y-tree.mjs                 (Wave C — Playwright + Storybook; BX2, BX3)
├── 10-contrast-pairs.mjs            (Wave C — Playwright + Storybook)
├── 11-pixel-diff-states.mjs         (Wave C — Playwright + Pixelmatch + Figma refs)
├── 12-console-errors.mjs            (Wave C — Playwright + Storybook; BX6)
├── 15-style-parity.mjs              (Wave C — Playwright + Figma state manifest)
├── 19-interaction.mjs               (Wave C — Playwright + Storybook; BX1, BX4, BX5, BX7)
├── figma-refs.mjs                   — export Figma reference PNGs for a manifest (REST); --check for coverage and freshness
├── run-all.mjs                      — orchestrator (parallel within wave, sequential across waves)
└── verdict.mjs                      — computes and writes the verdict; `yarn audit:component`

scripts/scaffold/
├── lib/ts-template-helpers.mjs
├── story-scaffold.mjs               — CSF3 boilerplate from contract
└── test-scaffold.mjs                — Jest spec skeleton from contract

scripts/__tests__/audit/             — smoke tests (one per script)
scripts/__tests__/scaffold/          — scaffolder smoke tests
```

## Standard JSON envelope (schemaVersion 1.3.0)

Every script emits this shape (`scripts/audit/lib/json-output.mjs`):

```json
{
  "schemaVersion": "1.3.0",
  "tool": "stencil-antipatterns",
  "target": "mud-button",
  "ok": true,
  "summary": { "errors": 0, "warnings": 2, "info": 5 },
  "findings": [
    {
      "severity": "error",
      "code": "ANTIPATTERN-005-ARRAY-MUTATION",
      "file": "src/components/mud-text-input/mud-text-input.tsx",
      "line": 42,
      "column": 8,
      "message": "Direct mutation of a reactive array via push/pop/...",
      "snippet": "this.items.push(newItem);",
      "fix": "Use immutable updates: this.items = [...this.items, x]"
    }
  ],
  "meta": {
    "durationMs": 230,
    "componentsScanned": 1,
    "filesScanned": 2,
    "tool": "stencil-antipatterns"
  }
}
```

Per-script extras land under `meta` (e.g. `meta.contract` for
`14-component-contract`, `meta.pairs` for `10-contrast-pairs`,
`meta.diff` for `13-token-diff`).

A finding with `noTarget: true` says the script found nothing to check — no story, no
reference, no coverage entry, no token export. On a row that owes a target — required at
the depth and not excused (`verdict.mjs` `owesTarget`) — the verdict reads it as
`INCOMPLETE` (the fix is a missing input), never as a pass with a warning, and `run-all.mjs`
exits 1 with a `name/no-target:CODE` blocker, at any severity. On any other row, including
an excused row that ran anyway (row 11 under `--figma-dir`), it is a warning in both.

### Exit codes

Every script and `run-all.mjs`:

| code | meaning |
|------|---------|
| 0    | clean — no errors (warnings + info OK) |
| 1    | one or more error-severity findings; for `run-all.mjs`, one or more graded errors, a crashed or missing-prerequisite row, or a `noTarget` finding on a row that owes a target |
| 2    | internal error (bad CLI args, file missing, JSON parse failure, etc.) |

Warnings DO NOT change the exit code — callers that want stricter behavior can
read the JSON.

`verdict.mjs` (and `yarn audit:component`) exits with the verdict state instead
(`STATE_EXIT_CODES` in `lib/exit-codes.mjs`); gate callers branch on this:

| code | state |
|------|-------|
| 0    | `PASS` |
| 1    | `FAIL` |
| 3    | `INCOMPLETE` |
| 4    | `NEEDS-DECISION` |
| 2    | usage or internal error |

### Severity guide

| severity | meaning                                                          | exit-code impact |
|----------|------------------------------------------------------------------|------------------|
| error    | blocks merge (CI fails)                                          | yes (1)          |
| warning  | review required but not blocking                                 | no               |
| info     | observational (e.g. optional file missing)                       | no               |

## CLI conventions

```bash
node scripts/audit/<NN>-<name>.mjs <mud-X | --all | --changed> [options]

  --json              emit JSON envelope to stdout
  --out <file>        write JSON envelope to file
  --vscode            add vscode://file links in human output
  --no-color          disable ANSI colors
  --help, -h          print usage

  Script-specific extras are documented per-script (run --help on each).
```

Choose exactly ONE target: positional component name, `--all`, or `--changed`.

## npm scripts

| command | what |
|---------|------|
| `yarn test:scripts`                | run smoke tests for every audit + scaffold script |
| `yarn audit:structure <X>`         | run 01 |
| `yarn audit:antipatterns <X>`      | run 02 |
| `yarn audit:git-hygiene`           | run 03 (no component arg needed) |
| `yarn audit:jsdoc <X>`             | run 04 |
| `yarn audit:story-exports <X>`     | run 05 |
| `yarn audit:test-coverage <X>`     | run 06 (reads existing coverage report) |
| `yarn audit:integration <X>`       | run 07 |
| `yarn audit:bundle-size <X>`       | run 08 (reads existing dist) |
| `yarn audit:token-diff <X>`        | run 13 |
| `yarn audit:contract <X>`          | run 14 |
| `yarn audit:stencil-contract <X>`  | run 16 (report-only) |
| `yarn audit:a11y-tree <X>`         | run 09 (needs Storybook + Playwright) |
| `yarn audit:contrast-pairs <X>`    | run 10 (needs Storybook + Playwright) |
| `yarn audit:pixel-diff <X>`        | run 11 (needs Storybook + Playwright + refs; `--figma-dir` in story mode) |
| `yarn audit:style-parity <X>`      | run 15 (needs Storybook + Playwright + Figma state manifest) |
| `yarn audit:figma-refs <X>`        | export Figma references for the manifest (needs FIGMA_TOKEN); `--check` reports coverage and freshness |
| `yarn audit:console-errors <X>`    | run 12 (needs Storybook + Playwright) |
| `yarn audit:component <X> --depth <d>` | the gate: run-all with `--verdict`, exit code = verdict state |
| `yarn audit:all <X>`               | orchestrator only (envelope, no verdict) |
| `yarn audit:all:no-browser <X>`    | orchestrator with the browser checks excused |

17 and 19 have no `audit:*` alias: run `node scripts/audit/17-adapter-contract.mjs <X> --part source|cem`
or `node scripts/audit/19-interaction.mjs <X> --port <N>`.
| `yarn scaffold:story <X>`          | generate mud-X.stories.ts boilerplate |
| `yarn scaffold:test <X>`           | generate mud-X.spec.tsx skeleton |

## Orchestrator (`run-all.mjs`)

```bash
# The checks --depth requires (default: standard), prerequisites built automatically
node scripts/audit/run-all.mjs mud-button --depth standard --json

# Pre-commit speed: lint + Wave A, no build, no browser
node scripts/audit/run-all.mjs --changed --depth quick --no-browser --json

# Only specific checks (local iteration — a required id dropped here makes the verdict INCOMPLETE)
node scripts/audit/run-all.mjs mud-button --only 02,07 --json

# Audit every mud-* component, browser checks excused
node scripts/audit/run-all.mjs --all --depth quick --no-browser --out reports/audit-all.json
```

| Flag | Effect |
|------|--------|
| `--depth quick\|standard\|deep` | Which checks run — `REQUIRED_CHECKS` in `verdict.mjs`, the one table. Default `standard`. |
| `--fast` | Deprecated alias of `--depth quick`. |
| `--e2e` | Folded into `--depth deep` (the `e2e` row is deferred: no E2E test project). |
| `--no-browser`, `--ci`, `CI` env | Excuse Wave C and the browser review legs; the verdict prints `browser: waived (flag \| CI env)` and caps the level at `CLEAN-STATIC`. `--ci` also sets `meta.ciDetected`. |
| `--no-figma` | Excuse 11, 15, `figma-refs` and the Figma review leg for this run; `deep` is capped at `MERGE-READY`. |
| `--skip` / `--only` | Drop or select check ids. |
| `--verdict`, `--audit-dir <dir>` | Also write the run inputs and have `verdict.mjs` write the verdict (what `yarn audit:component` does). |

**Prerequisites** (`standard`+, only those the selected rows need): `yarn dx:prepare`,
`yarn dx:stencil:once` (writes `dist/` and `.storybook/custom-elements.json`), one coverage run
over every selected component, and a Storybook. A failed
prerequisite makes the rows that need it `missing-prereq`, never a silent skip. `figma-refs`
needs `FIGMA_TOKEN`.

The coverage run writes its test results to `audit/_run/vitest-results.json` (deleted before
each run). A failing spec under `src/components/<name>/` gives that component's `06` row an
error `COVERAGE-TESTS-FAILED` naming the spec; the other components read their coverage as
usual. A coverage run that writes no results, or fails in a spec no selected component owns,
leaves every `06` row `missing-prereq`.

**Figma inputs come from `HEAD` only.** Each manifest is read with `git show HEAD:<path>` into
`.audit-figma/<component>/manifest@HEAD.json` and passed to 11, 15 and `figma-refs` via
`--manifest`. An uncommitted change is reported as `pending manifest change — not honoured`. A
component with no design commits `{ "figma": { "design": "none", "reason": "…", "decidedBy": "…" } }`.

**Storybook belongs to this worktree.** Several worktrees share port 6007, and a bare TCP probe
cannot tell whose Storybook answers. `run-all` reuses a server only when this worktree's
`.audit-storybook.json` (`{ port, pid, startTime }`, git-ignored) names a live process that answers on its
port; otherwise it starts `storybook dev` on a free port, records it, and passes it to every Wave C
script via `--port`. The server is left running for the next audit.

The orchestrator returns one combined envelope:

```json
{
  "schemaVersion": "1.3.0",
  "tool": "run-all",
  "target": "mud-button",
  "ok": false,
  "summary": { "errors": 3, "warnings": 8, "info": 12 },
  "blockers": [
    "antipatterns/ANTIPATTERN-010-SETFORMVALUE-1ARG",
    "antipatterns/ANTIPATTERN-007-LIFECYCLE-LEAK"
  ],
  "results": [
    { "id": "01", "name": "structure", "wave": "A", "ok": true, "durationMs": 95, "summary": {...} },
    ...
  ],
  "findingsByTool": {
    "structure": [...],
    "antipatterns": [...]
  },
  "meta": {
    "totalDurationMs": 600,
    "scriptsRun": 8,
    "parallel": true
  }
}
```

Each `results[]` row carries `status` — `ok` (an envelope arrived, whatever its
findings), `crashed`, `missing-prereq` or `skipped` — so a crashed script is
never read as zero errors. With `--verdict` the per-component envelope also
carries `audit` (depth, excuses, filters, Figma resolution). `blockers` lists
graded errors (`tool/CODE`), crashed or unprepared rows (`name/status`) and owed
`noTarget` findings (`name/no-target:CODE`). `summary.errors` / `warnings` /
`info` stay the raw sum of each script's own counts, so they can show errors that
are not blockers; `summary.incomplete` is counted here — one per crashed or
unprepared row and per row with an owed `noTarget`. Gate on
`verdict.mjs`, not on `ok` or `blockers`.

## Waves

| wave | rows | depth | needs |
|------|------|-------|-------|
| A | `lint`, 01, 02, 03, 04, 05, 07, 14, 16, 17 | `quick`+ | nothing |
| B | 06, 08, 13, 18 (17 `--part cem`) | `standard`+ | coverage (06), `dist/` (08), `tokens-tokenhaus.json` (13), the CEM (18) |
| C | 09, 10, 11, 12, 15, 19 | `standard`+ | this worktree's Storybook, Playwright |
| D | `figma-refs` (`--check`), `adapter-react` (`yarn build.react`), `adapter-vanilla` (`yarn build.web`), `e2e` (deferred) | `deep` | `FIGMA_TOKEN` for `figma-refs` |

Waves run sequentially; rows within a wave run in parallel via async `spawn`.
Repo-level rows (03, the adapter builds) run once per invocation and are shared
across components. Advisory review legs have no row: they run after the scripted
rows, and their findings are advisory at every depth.

## Verdict (`verdict.mjs`)

```bash
yarn audit:component mud-button --depth standard             # run + verdict, exit = state
node scripts/audit/verdict.mjs --rerender mud-button          # re-render its current run, e.g. with advisory review-leg findings
node scripts/audit/verdict.mjs --run-dir audit/mud-button/runs/<run>   # the same, run named explicitly
```

The only writer of `verdict.json`. It rebuilds the file from its inputs on every
run, so a hand-edited verdict never survives the next run.

- **State**, first match wins: `INCOMPLETE` (a row crashed, missed its
  prerequisite, a required id did not run without an excuse, a row that owes a
  target reported a `noTarget` finding, or the envelope names an unknown depth)
  → `FAIL` (any
  blocking error finding) → `NEEDS-DECISION` (no Figma manifest at `HEAD` at
  `standard`+) → `PASS`.
- **Level**, on `PASS` only: `CLEAN-STATIC` (`quick`, or any browser-waived
  run), `MERGE-READY` (`standard`, or `deep --no-figma`), `PRODUCTION-READY`.
- **Excuses**, and nothing else: `--no-figma` or a committed `design: "none"`
  (Figma ids), no manifest at `HEAD` (Figma ids, state `NEEDS-DECISION`), and
  `--no-browser` / `--ci` / `CI` (browser ids). Each is printed in the headline.
- **Review-leg findings** are advisory at every depth, `deep` included: a leg's
  `review-findings.json` under the run's `reviews/<leg>/` is listed under "Advisory" and
  never moves `state`; a malformed file or finding is named in `notes`. At
  `deep` the headline says `review-legs: advisory` — `PRODUCTION-READY` means the
  scripted rows passed.
- **Re-render.** A leg that writes after the run is folded in with
  `yarn audit:component --rerender <component>`, which looks that component's
  current run up in `audit/_run/summary.json`. `--run-dir <path>` names the run
  instead: it accepts only the repo-relative `audit/<component>/runs/<run>`
  shape (absolute when `--audit-dir` is outside the repo), under `--audit-dir`
  when one is given, and is REFUSED with exit 2 when the run it names is older
  than the component's current one — re-rendering an old run would otherwise
  replace the current verdict with a stale one and exit on the stale state.
  `runDir` is kept out of `verdict.json` so that file is byte-identical across
  runs. Every early exit of a fresh run (lock refusal, run-all crash,
  preflight) still prints a summary, with `components: []`.
- **Not applicable.** A finding marked `notApplicable: true` (severity `info`)
  never moves `state`; its row carries the reason as `note` and the brief lists
  it under "Not applicable".
- **Warnings** never change the state. `verdict.json` lists them under
  `warnings`, and the brief renders them as "Warnings (non-blocking)" with their
  row and `verify:` command.
- **`--changed` selecting nothing** is `PASS` with "no components selected"
  printed; the repo-level rows (`03`) still count toward the state. A changed-set
  detector that failed (no base ref, `git diff` failed) is `INCOMPLETE`.
- `verdict.json` excludes timestamps, durations, stderr text and the run
  name, so identical inputs give byte-identical files.

Stable paths (git-ignored `audit/`):

| path | written by |
|------|------------|
| `audit/<component>/verdict.json` | `verdict.mjs`, every run |
| `audit/<component>/fix-brief.md` | `verdict.mjs` via `lib/fix-brief.mjs` — a report block (per-check summary table, entry index, changes since the previous run), then one block per non-PASS entry with its `verify:` command |
| `audit/<component>/runs/<run>/envelope.json` | `run-all.mjs --verdict` |
| `audit/<component>/runs/<run>/reviews/<leg>/review-findings.json` | the review leg, nothing else |
| `audit/<component>/runs/<run>/record.json` | `verdict.mjs` via `lib/run-record.mjs` — what that run graded and the identity of every finding it reported; read only by the next run's comparison (below), never an input to `verdict.json` itself |
| `audit/_run/summary.json` | worst state over the run's components, each `runDir` |

There is no re-check mode: each fix-brief entry's `verify:` command is the
per-fix check, and only a full run at the same depth can write `PASS`.

### Changes since the previous run

Every run writes `record.json` (a re-render of an older run leaves its record
untouched): the scopes it graded — a required row that actually ran (not
excused, crashed, deferred, `noTarget`, or dropped by `--only`/`--skip`), each
review leg whose file parsed at a matching schema with a `findings` list and no
finding rejected by the shape check, and
the Figma gate at `standard`+ — plus the identity of every finding it
reported. `verdict.mjs` looks up the newest earlier `runs/*` record at the
**same depth** and, when one is usable, renders a `## Changes since the
previous run` section inside the report block (`fix-brief.md`, before
`<!-- end of report -->`):

- No earlier record at this depth (a fresh component, or the first run after
  this feature shipped) → "nothing to compare". The newest earlier record
  unreadable or at a different schema major → "Not compared", and the search
  never falls through to an older one. A run is a `runs/` directory holding
  `envelope.json`; anything else there (a `.DS_Store`, a notes folder) is
  ignored. Any failure while comparing or rendering this section, including a
  baseline whose values the renderer cannot shape, reads "Not compared:
  <cause>" (also on stderr) and never blocks `verdict.json`.
- Otherwise: the two headlines, a table of every row whose result changed
  (`—` on the side that did not run it), a "Not compared" list for scopes
  graded in only one run, and finding counts — newly reported, no longer
  reported, reported a different number of times, text changed, unchanged —
  each with one bullet, but **only for scopes graded in both runs**.
- Finding identity drops the line number and every measured number (a
  pixel-diff %, a contrast ratio, a bundle KB, a hex colour) before
  comparing, so a shifted line or a changed measurement never reads as a
  different finding. The trade: two findings differing only in a number are
  counted together, and free text that changes for an unrelated reason reads
  as gone + new — stated as a known limit, not fixed. A warning carries no
  file, so the same warning code in two files is counted, not told apart.
- The baseline is the newest earlier run at the same depth that graded
  something — a `--only`/`--skip` run can be that baseline, and then most
  rows land under "Not compared"; the header always names the run it
  compared against, so this is visible rather than silent.
- The renderer's own words never say "fixed" or "resolved" — a quoted
  finding label is a check's or a review leg's text and may contain either
  word, but it always sits after a fixed status prefix ("newly reported:",
  "no longer reported:", …), so the claim is the renderer's, never the
  finding's. Finding text is kept in `record.json` and re-rendered later, so
  every prose value has each markdown-active character (`` \ ` [ ] < & | ``)
  backslash-escaped in one pass (`lib/fix-brief.mjs` `line()`). CommonMark
  renders an escaped punctuation character literally, so no link, image,
  reference definition, raw HTML, comment, entity, code span or table break
  can form from a finding, and the preview still shows its exact text.
  Commands (`verify:`, `prerequisite:`, `log:`, the re-render hint) sit in a
  code span whose fence outruns any backtick in them, so they stay copyable.
  Unicode line separators and bidi controls are neutralised too. Not closed,
  by design: a bare `https://…` in a finding can still render as a GFM
  autolink — clickable, its text showing its target, fetched by nothing on
  open.
- Nothing prunes `runs/`; `record.json` adds one small file per run beside
  the existing `envelope.json` and `reviews/`. Deleting `audit/<component>/runs/`
  (already safe, above) also resets this comparison — the next run then
  finds no baseline.

**One audit per worktree.** A run that builds or starts Storybook holds
`audit/_run/.worktree.lock` (it guards `dist/` and the Storybook record); a fresh
run and a `--run-dir` re-render hold `<audit dir>/_run/.lock` (it guards
`_run/summary.json`, `_run/envelope.json`, `_run/vitest-results.json` and each
`verdict.json`). A second audit that finds a live lock is `INCOMPLETE`, naming the
holder's pid and the lock path; a lock whose pid is dead or was reused is taken
over. `audit/<component>/runs/` is disposable and safe to delete — no retention is
automated.

## Browser scripts — Playwright is loaded lazily

Wave C scripts call `loadPlaywright()` from `lib/browser-context.mjs`. If the
`playwright` package isn't installed, the script exits with:

```
playwright is not installed. Run `yarn add -D playwright` (downloads ~50 MB)
before using browser audit scripts.
```

Smoke tests for Wave C exercise only pure helpers (color math, classification,
URL building) and pass without Playwright. The actual browser flow is verified
manually once a dev installs the dep — with one exception:
`scripts/__tests__/audit/10-contrast-pairs.browser.spec.mjs` drives a real
Chromium over a hand-built shadow tree in a `data:` URL, so it needs neither
Storybook nor the build output. It skips, with the launch error as its reason,
only when a browser cannot START on the machine; once one has started, every
failure fails the test — including one thrown by the code under test inside
`page.evaluate`, which is the regression it exists to catch.

## Pixel-diff — Pixelmatch direct, NOT Playwright's compare

`11-pixel-diff-states.mjs` deliberately delegates to `scripts/visual-diff.mjs`
(which calls Pixelmatch from `pixelmatch` package — the same Mapbox library
the MCP `image-compare` server uses underneath). This was the explicit user
preference at plan time: Playwright's built-in pixel compare has a wider
error margin and misses subtle drift the team has historically caught with
Pixelmatch.

`scripts/visual-diff.mjs` exits 0 on PASS/WARNING, 1 on FAIL or on UNKNOWN (masks left
nothing to compare), and 2 on a usage error or unreadable image.

Thresholds live in `lib/image-diff.mjs` (`DEFAULT_PASS`, `DEFAULT_WARN`): PASS below the
first, WARNING (`requires-review: true` — open the diff) below the second, FAIL at or
above it. Tune per run with `--pass-threshold` / `--warn-threshold`. Masked pixels are
left out of the percentage and reported as `PIXEL-MASKED`.

## Figma verification — manifest, style parity, pixel diff

The scripts share one input: the component's **Figma state manifest**,
`src/components/<name>/test/<name>.figma.json` — every state cites a Figma
node, says how to render it (fixture `html`, `theme`, `clock`, `interaction`),
and lists the exact values the node specifies (`expect`) plus elements the
design does not have (`absent`). Format: "Figma state manifest" below. Example:
`src/components/mud-date-picker/test/mud-date-picker.figma.json`.

```bash
node scripts/audit/figma-refs.mjs mud-date-picker            # .audit-figma/mud-date-picker/<state>.png
node scripts/audit/15-style-parity.mjs mud-date-picker --json
node scripts/audit/11-pixel-diff-states.mjs mud-date-picker --json
```

What makes the pixel percentage meaningful:

| Problem | Before | Now |
|---|---|---|
| Figma exports at 2×, captures were 1× | canvases never matched | captures at `--scale` (default 2) |
| Figma exports include drop-shadow bleed | capture cropped at the border box | clip grows by the element's own `box-shadow` extents |
| Transparent Figma surround | pixelmatch 7 blends alpha against a checkerboard → whole margin red | both images flattened onto the page background |
| Different heights padded around the centre | an extra footer shifted every pixel | top-left alignment + `PIXEL-SIZE-MISMATCH` in CSS px |
| Dark capture vs light reference | guaranteed FAIL | dark only against `<state>-dark.png` / dark states |
| "today", hover, focus, open views | not reachable | `clock`, `interaction` (hover, focus, press, click) |

## Figma state manifest

The Figma checks (`11-pixel-diff-states`, `15-style-parity`, `figma-refs`) share one input
per component: a JSON file committed at

```
src/components/<name>/test/<name>.figma.json
```

Every state cites a Figma node, says how to render the same state in Storybook, and
optionally lists the exact values that node specifies. Values in `expect` are copied from
Figma (node data or Dev Mode), never inferred from a screenshot; the `node` on each entry
is the citation. The audit reads the manifest from `HEAD` only (see "Figma inputs come from
`HEAD` only" above). `lib/figma-manifest.mjs` is the parser and validator; an invalid
manifest is reported as `MANIFEST-INVALID` with the list of problems. A complete example is
`src/components/mud-date-picker/test/mud-date-picker.figma.json`.

### Top level

| Field | Required | Meaning |
|-------|----------|---------|
| `component` | by convention | The component tag name. `figma-refs` falls back to it when no component is passed on the command line; the validator does not check it. |
| `figma.fileKey` | yes (when `figma` is present) | Non-empty string: the key of the Figma file the node ids belong to. Required as soon as any state has a `node`. |
| `figma.scale` | no | Positive number: the export scale of reference PNGs. |
| `figma.skip` | no | Array of `{ "node", "reason" }`: Figma variants the manifest deliberately does not cover. `figma-refs --check` reports every other uncovered variant. Both fields are required in each entry. |
| `defaults` | no | `story`, `clock`, `viewport`, `capture` and `mask`, inherited by every state that does not set its own. |
| `shared` | no | Object of `{ "<kebab-case-key>": [expectation, ...] }`: non-empty lists that several states reuse with `{ "use": "<key>" }` in `expect`. |
| `states` | yes | Non-empty array of states (below). |
| `$comment` | no | Free text; ignored. |

### State

| Field | Required | Meaning |
|-------|----------|---------|
| `name` | yes | Kebab-case (`a-z`, `0-9`, `-`), unique in the manifest. Names the reference file, `<name>.png`. |
| `story` | yes, here or in `defaults` | Storybook story id such as `components-button--default`: the page that loads the component. |
| `node` | no, but needed for pixel diff and for `expect` entries without their own `node` | Figma node id such as `158:402` (the URL form `158-402` is accepted). Requires `figma.fileKey`. |
| `html` | no | String: the fixture markup rendered in place of the story's own. |
| `props` | no | `{ "<selector>": { "<property>": value } }`: JS properties assigned after the fixture renders, for props with no attribute form (arrays, objects). Selectors are light-DOM selectors; every match gets the values. |
| `theme` | no | `light` (default) or `dark`. |
| `clock` | no | ISO date-time the page clock is frozen at. |
| `viewport` | no | `{ "width", "height" }`, both positive. Default 1280 by 900. |
| `interaction` | no | One step or a list of steps `{ "type": "hover" \| "focus" \| "press" \| "click", "target": "<selector>" }`. Both fields are required in each step. |
| `capture` | no | `{ "selector", "bleed" }`: the element captured (default: the component itself) and the margin around it, `"auto"` (default) or a non-negative number. |
| `mask` | no | Array of selectors painted with the page background on both images before the pixel diff, for mock data such as dates. Masked pixels are reported, and style parity still checks the elements. `"mask": []` on a state opts out of `defaults.mask`. |
| `pixel` | no | Boolean. `false` keeps the state out of the screenshot diff and the reference export while its `expect` entries are still checked. |
| `expect` | no | Array of expectations (below), or `{ "use": "<key>" }` entries naming a `shared` block. A `use` entry carries no other field. |

### Expectation

| Field | Required | Meaning |
|-------|----------|---------|
| `target` | yes | Selector of the element checked. |
| `styles` | yes, unless `absent` | Non-empty `{ "<property>": "<value>" }`, every value a string. Any computed-style property is accepted, plus `boxWidth` and `boxHeight` (border box) and `textContent` (trimmed). |
| `absent` | no | Only `true`: the Figma node has no such element, so rendering one is drift (`STYLE-UNEXPECTED-ELEMENT`). Cannot be combined with `styles`. |
| `node` | no | Figma node id for this entry. Defaults to the state's `node`; one of the two must be set. |
| `override` | no | A correction the owner decided, for example a typo in the design: `{ "value", "reason", "decidedBy" }`, all three non-empty strings. The entry must list exactly one style; `15-style-parity` checks `value` instead of the Figma one, and the verdict lists the override. |

Selectors are Playwright CSS selectors, which pierce open shadow roots, so `mud-x .inner`
reaches `.inner` inside `mud-x`'s shadow DOM.

### Component with no design

A component that has no Figma design declares that instead of states, with no `fileKey` and
no `states`:

```json
{ "figma": { "design": "none", "reason": "Utility component, no design exists", "decidedBy": "owner name" } }
```

`reason` and `decidedBy` are required non-empty strings without control characters. Figma
checks are skipped for the component and the verdict prints the reason. A manifest that
fails this validation does not grant the waiver: 11 and 15 run and report
`MANIFEST-INVALID`.

### Minimal example

```json
{
  "component": "mud-button",
  "figma": { "fileKey": "<file key>" },
  "defaults": { "story": "components-button--default" },
  "states": [
    {
      "name": "default",
      "node": "12:34",
      "expect": [{ "target": "mud-button", "styles": { "boxHeight": "40px", "borderTopLeftRadius": "8px" } }]
    }
  ]
}
```

## Measuring the suite itself

One script, not part of a run:

```bash
node scripts/audit/measure-run-cost.mjs --component mud-button --depth quick,standard --out reports/run-cost-before.json
# …change something…
node scripts/audit/measure-run-cost.mjs --component mud-button --depth quick,standard --compare reports/run-cost-before.json
```

`measure-run-cost.mjs` reports median wall-clock, peak RSS and the slowest rows
per cell, and re-reads `verdict.json` after every repetition: it exits 1 if any
two repetitions of a cell differ by a byte. A run that got faster and moved a
verdict is a failed measurement, not a faster suite — so the before/after pair
is the unit, never a single "after" number.

## CI integration

`.github/workflows/ci.yml` runs `yarn test:scripts` (the specs for every audit
script, `verdict.mjs` and the fix-brief renderer). It does not run the audit
itself. A CI job that does gets `browser: waived (CI env)` from the `CI`
variable and a level no higher than `CLEAN-STATIC`.

## Adding a new audit script

1. Pick the next available `NN-` prefix.
2. Copy the layout of `04-jsdoc-completeness.mjs` (Wave A, ts-parser-based) or
   `12-console-errors.mjs` (Wave C, Playwright-based) as a template.
3. Export pure helpers; keep `main()` thin so smoke tests can target the
   helpers without touching disk / network.
4. Use `buildResult()` + `emit()` from `lib/json-output.mjs` so the envelope
   shape stays uniform.
5. Add a smoke test under `scripts/__tests__/audit/<NN>-<name>.spec.mjs` —
   the glob `"scripts/__tests__/**/*.spec.mjs"` picks it up automatically.
   When a behavior lives inside `page.evaluate` and no pure helper can reach
   it, export the inner browser-driving function too and test it against a
   `data:` URL fixture — `10-contrast-pairs.mjs` exports `measureSamples` for
   exactly that.
6. Register the script in `AUDIT_SCRIPTS` inside `run-all.mjs` (set `wave`,
   `requiresBuild`, etc.) and, if a depth requires it, add its id to
   `REQUIRED_CHECKS` in `verdict.mjs` (plus `BROWSER_IDS` / `FIGMA_IDS` when it
   needs a browser or Figma, so the matching waiver excuses it).
7. Add an `audit:<short-name>` entry to `package.json` scripts.
8. Update this README's `Layout` and `npm scripts` tables.

## See also

- `scripts/visual-diff.mjs` — Pixelmatch CLI used by 11 (algorithm in `lib/image-diff.mjs`).
- "Figma state manifest" above — how manifests are authored; 11 / 15 findings point back to it.
- `scripts/audit-token-contrast.mjs` — token-level WCAG audit (10 is the
  component-runtime equivalent; both share the same luminance math).
- `scripts/tokens-validate.mjs` — DTCG validation; the orchestrator does NOT
  call it today because it operates on the whole token tree, not per-component.
