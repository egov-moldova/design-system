# scripts/audit/ — deterministic audit suite

Local Node ESM scripts that replace mechanical work AI used to do inside
`audit-component`, `audit-production`, `pre-pr-check`, `a11y-verifier`,
`pixel-perfect-verifier`, `integration-checker`, `story-writer`, and
`test-writer`. Each script is read-only, emits a standard JSON envelope, and
is independently testable with `node --test`.

## Why this exists

AI workflows like `/audit-component` and `/audit-production` were spending
significant tokens on **mechanical, deterministic** work — running 14 grep
calls, parsing JSON reports, building markdown tables. That kind of work has
a single correct answer per input, so a script delivers identical results in
a fraction of the wall-clock time and at zero token cost.

The scripts in this folder run that mechanical work; AI keeps the
**judgment-heavy** parts: naming critique, architecture review, ARIA
correctness for a captured tree, WCAG remediation choice, edge-case story
suggestions, etc.

## Quality contract

Per the plan that produced this suite, every script obeys:

1. **Output identical or superior accuracy** to what AI produced manually.
2. **Never force AI to compensate** — output is a clean JSON envelope, no raw
   text parsing needed downstream.
3. **Read-only** on source files. No script writes to `src/`, `tokens/`, or
   `.claude/`. The scaffolders under `scripts/scaffold/` are the only writes,
   and they require an explicit `--write` flag.
4. **Regression-gated** before any AI prompt is slimmed: run the legacy
   workflow and the new workflow on the same component; critical + high
   findings must be identical (warnings ≤ 5% diff, and only in the direction
   of MORE — never fewer).

## Layout

```
scripts/audit/
├── lib/
│   ├── changed-components.mjs       — git diff vs main, returns cor-* names
│   ├── component-paths.mjs          — resolve cor-X → canonical file paths
│   ├── browser-context.mjs          — lazy Playwright wrapper + install hint
│   ├── storybook-helpers.mjs        — port probe (TCP, no shell), URL builder
│   ├── ts-parser.mjs                — TypeScript compiler API wrappers
│   ├── cli-args.mjs                 — shared --json/--out/--all/--changed parsing
│   ├── json-output.mjs              — buildResult(), emit(), finding() (schemaVersion 1.0.0)
│   └── exit-codes.mjs               — 0 clean, 1 findings, 2 internal
├── 01-component-structure.mjs       (Wave A — fast, no browser)
├── 02-stencil-antipatterns.mjs      (Wave A) ★ highest-impact
├── 03-git-hygiene.mjs               (Wave A)
├── 04-jsdoc-completeness.mjs        (Wave A)
├── 05-story-exports.mjs             (Wave A)
├── 07-integration-usage.mjs         (Wave A)
├── 14-component-contract.mjs        (Wave A)
├── 06-test-coverage.mjs             (Wave B — depends on coverage/coverage-summary.json)
├── 08-bundle-size.mjs               (Wave B — depends on dist/)
├── 13-token-diff.mjs                (Wave B — component mode needs tokens-tokenhaus.json)
├── 09-a11y-tree.mjs                 (Wave C — Playwright + Storybook)
├── 10-contrast-pairs.mjs            (Wave C — Playwright + Storybook)
├── 11-pixel-diff-states.mjs         (Wave C — Playwright + Pixelmatch + Figma refs)
├── 12-console-errors.mjs            (Wave C — Playwright + Storybook)
└── run-all.mjs                      — orchestrator (parallel within wave, sequential across waves)

scripts/scaffold/
├── lib/ts-template-helpers.mjs
├── story-scaffold.mjs               — CSF3 boilerplate from contract
└── test-scaffold.mjs                — Jest spec skeleton from contract

scripts/__tests__/audit/             — smoke tests (one per script)
scripts/__tests__/scaffold/          — scaffolder smoke tests
```

## Standard JSON envelope (schemaVersion 1.0.0)

Every script emits this shape (`scripts/audit/lib/json-output.mjs`):

```json
{
  "schemaVersion": "1.0.0",
  "tool": "stencil-antipatterns",
  "target": "mud-button",
  "ok": true,
  "summary": { "errors": 0, "warnings": 2, "info": 5 },
  "findings": [
    {
      "severity": "error",
      "code": "ANTIPATTERN-005-ARRAY-MUTATION",
      "file": "src/components/mud-input/mud-input.tsx",
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

### Exit codes

| code | meaning |
|------|---------|
| 0    | clean — no errors (warnings + info OK) |
| 1    | one or more error-severity findings |
| 2    | internal error (bad CLI args, file missing, JSON parse failure, etc.) |

Warnings DO NOT change the exit code — callers that want stricter behavior can
read the JSON.

### Severity guide

| severity | meaning                                                          | exit-code impact |
|----------|------------------------------------------------------------------|------------------|
| error    | blocks merge (CI fails)                                          | yes (1)          |
| warning  | review required but not blocking                                 | no               |
| info     | observational (e.g. optional file missing)                       | no               |

## CLI conventions

```bash
node scripts/audit/<NN>-<name>.mjs <cor-X | --all | --changed> [options]

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
| `yarn audit:a11y-tree <X>`         | run 09 (needs Storybook + Playwright) |
| `yarn audit:contrast-pairs <X>`    | run 10 (needs Storybook + Playwright) |
| `yarn audit:pixel-diff <X> --figma-dir ...` | run 11 (needs Storybook + Playwright + refs) |
| `yarn audit:console-errors <X>`    | run 12 (needs Storybook + Playwright) |
| `yarn audit:all <X>`               | orchestrator (all waves) |
| `yarn audit:all:no-browser <X>`    | orchestrator without Wave C |
| `yarn scaffold:story <X>`          | generate cor-X.stories.ts boilerplate |
| `yarn scaffold:test <X>`           | generate cor-X.spec.tsx skeleton |

## Orchestrator (`run-all.mjs`)

```bash
# All checks for one component (skips 11 if --figma-dir not provided)
node scripts/audit/run-all.mjs mud-button --json

# Skip browser waves (for CI without Playwright, or pre-commit speed)
node scripts/audit/run-all.mjs mud-button --no-browser --json

# Only specific scripts
node scripts/audit/run-all.mjs mud-button --only 02,07 --json

# Skip specific scripts
node scripts/audit/run-all.mjs mud-button --skip 06,08 --json

# Audit changed components vs main (great for pre-PR)
node scripts/audit/run-all.mjs --changed --no-browser --json

# Audit every cor-* component (CI / housekeeping)
node scripts/audit/run-all.mjs --all --no-browser --out reports/audit-all.json
```

The orchestrator returns one combined envelope:

```json
{
  "schemaVersion": "1.0.0",
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

Read `blockers` first — if non-empty, AI should STOP and report. Then walk
`findingsByTool` to attach context per script. `results` lets you see which
script crashed (`ok: false` + `error: "..."`) without diving into findings.

## Waves

| wave | scripts | runs in parallel | needs |
|------|---------|------------------|-------|
| A | 01, 02, 03, 04, 05, 07, 14 | ~500ms total | nothing |
| B | 06, 08, 13              | ~80ms (token-diff alone, others need build) | `coverage/coverage-summary.json` (06), `dist/` (08), `tokens-tokenhaus.json` (13) |
| C | 09, 10, 11, 12           | depends on Storybook responsiveness | Storybook on port 6007, Playwright installed |

Waves run sequentially; scripts within a wave run in parallel via async
`spawn`. Wave C is opt-out via `--no-browser`.

## Browser scripts — Playwright is loaded lazily

Wave C scripts call `loadPlaywright()` from `lib/browser-context.mjs`. If the
`playwright` package isn't installed, the script exits with:

```
playwright is not installed. Run `yarn add -D playwright` (downloads ~50 MB)
before using browser audit scripts.
```

Smoke tests for Wave C exercise only pure helpers (color math, classification,
URL building) and pass without Playwright. The actual browser flow is verified
manually once a dev installs the dep.

## Pixel-diff — Pixelmatch direct, NOT Playwright's compare

`11-pixel-diff-states.mjs` deliberately delegates to `scripts/visual-diff.mjs`
(which calls Pixelmatch from `pixelmatch` package — the same Mapbox library
the MCP `image-compare` server uses underneath). This was the explicit user
preference at plan time: Playwright's built-in pixel compare has a wider
error margin and misses subtle drift the team has historically caught with
Pixelmatch.

Thresholds (tune via `--pass-threshold` / `--warn-threshold`):

| diff %        | status   | note                                     |
|---------------|----------|------------------------------------------|
| `< 0.5`       | PASS     | accepted (per project default)           |
| `< 2.0`       | WARNING  | `requires-ai-review: true` — open diff   |
| `>= 2.0`      | FAIL     | blocks merge                              |

## CI integration

`.github/workflows/ci.yml` includes:

```yaml
- name: Audit scripts (smoke tests)
  run: yarn test:scripts

- name: Audit all components (no browser)
  run: node scripts/audit/run-all.mjs --all --no-browser --out reports/audit-all.json
  continue-on-error: true

- name: Upload audit report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: audit-all-report
    path: reports/audit-all.json
    retention-days: 14
```

`continue-on-error: true` is deliberate while the suite is brand new — CI
collects the report as an artifact for review, but doesn't fail the build on
audit findings yet. Flip to `false` after a sprint of clean runs.

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
6. Register the script in `AUDIT_SCRIPTS` inside `run-all.mjs` (set `wave`,
   `requiresBuild`, etc.).
7. Add an `audit:<short-name>` entry to `package.json` scripts.
8. Update this README's `Layout` and `npm scripts` tables.

## See also

- `scripts/visual-diff.mjs` — Pixelmatch wrapper used by 11.
- `scripts/audit-token-contrast.mjs` — token-level WCAG audit (10 is the
  component-runtime equivalent; both share the same luminance math).
- `scripts/tokens-validate.mjs` — DTCG validation; the orchestrator does NOT
  call it today because it operates on the whole token tree, not per-component.
- `.claude/skills/audit-component/SKILL.md` — explains how AI consumes the
  envelope under "Fast Path".
