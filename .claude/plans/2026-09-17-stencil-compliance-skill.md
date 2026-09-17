# Stencil Compliance Skill Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Reviewed:** critic 18c3aae — round 1 over the design (4 legs, FORTIFY, 21 above-bar folded), round 2 over this plan (2 legs, FORTIFY, 14 above-bar folded), round 3 over this plan (1 leg, FORTIFY, 8 above-bar folded, re-measured at `ed19d51`); closed at the 3-round cap and handed to Dan; after execution: verify 423b83e (round 1), critic c22df50 (round 2), critic d38540d (round 3, cap reached; the 15 above-bar findings fixed in 42a745f at Dan's decision)

**Goal:** Make `.claude/skills/stencil-compliance/` correct for this repo on Stencil 4.45, move every
rule a parser or linter can decide out of model judgment, and add guards that fail when the skill
drifts again (prefix rename, Stencil upgrade, rule-code renumbering, lost Yarn patch).

**Architecture:** Scripts first, docs second, guards last. Phase 1 builds the deterministic layer
(script `16-stencil-contract.mjs`, a `scope` field on script 02's registry, the approved lint
rules). Phase 2 rewrites the canonical docs and the skill so it runs that layer and judges only
what remains. Phase 3 adds the guards that grade Phase 2's output, each committed together with the
fixes that turn the repo green, so `yarn check.verify` (pre-push, CI) passes at every commit.

**Tech Stack:** Node 24 ESM scripts (no new dependencies), `typescript` compiler API via
`scripts/audit/lib/ts-parser.mjs`, `node:test`, ESLint flat config with `@stencil/eslint-plugin`
`^1.4.0`, stylelint `^17.15.0`, `@stencil/core` `~4.45.0` (installed 4.45.0, Yarn-patched).

**Issue:** [#86](https://github.com/egov-moldova/design-system/issues/86) — separate from #53 / PR #83.

**Spec:** the source report "skill-ul `stencil-compliance` comparat cu Stencil 4.45 și cu repo-ul"
(items A1–A10, B1–B9, C1–C6, D1–D8 and a foreign-commits section), delivered in-session on
2026-09-17, and the design reviewed by one multi-lens fresh-eyes round on 2026-09-17 (4 legs, all
FORTIFY; 21 above-bar findings folded below). Every report item is restated in § Coverage so this
plan stands alone.

## The problem

The skill is loaded for every Stencil component task and tells the model what to check. Today it
gives wrong instructions (a retired prefix, a fictional component list, a `shadow: true`-only rule, a
`@Watch` rule 119 watchers contradict), 16 of its greps cannot run, and it never runs the scripts
that already decide half its rules — so a compliant component can be "fixed" into a broken one, and
a real violation can pass as "0 results". Nothing fails when it drifts again.

## Decisions (danzubco, 2026-09-17)

1. Work lands on a new branch `fix/issue-86-stencil-compliance-skill`, stacked on
   `fix/issue-53-ai-docs-alignment` (PR #83), because `scripts/docs/check-ai-docs.mjs` exists only
   there. One commit per task. Where the branch is checked out (a separate worktree, since another
   session is active in this one) is asked at execution start.
2. `@Watch` rule is relaxed to match the code. Allowed: validation, derived state, native DOM sync,
   `setFormValue` sync, and **a validation fallback** — assigning a literal to the watched prop inside
   an `if` block of the watcher (the 40-method pattern, e.g. `src/components/mud-radio/mud-radio.tsx:134-143`).
   Forbidden: async watchers, any other write to the watched prop.
3. Tooling, measured (§ Measured) and decided per rule:
   - Enabled as `error`, 0 violations: `@stencil/async-methods`, `render-returns-host`,
     `single-export`, `props-must-be-public`, `methods-must-be-public`; stylelint
     `declaration-property-value-disallowed-list` for `transition: all`.
   - `@stencil/element-type` (5 violations: badge, separator, stepper, table, tooltip): fix the 5
     `@Element()` types (type-only, no behaviour change) and enable as `error` in the same commit.
   - `@stencil/reserved-member-names` (35 violations, all public `@Prop` names, 32 × `ariaLabel`):
     stays off, `manual` in the skill; renaming is a breaking API decision tracked in
     [#88](https://github.com/egov-moldova/design-system/issues/88).
   - stylelint `declaration-no-important` (3 violations, each a documented load-bearing exception:
     `mud-service-button.css:87-88`, `mud-accordion-item.css:110`): enable, with a
     `/* stylelint-disable-next-line declaration-no-important */` on each of the 3 lines.
   - Tune `ANTIPATTERN-RAW-PIXELS`. `decorators-style` (report C2's eighth rule) is not in the
     approved subset and stays off.
   - If a re-measure at execution differs from § Measured, stop and return to Dan.
4. Parser-based checks go into a new `scripts/audit/16-stencil-contract.mjs`, report-only.
5. Boolean props default `true` is forbidden **only on form-associated components**: the runtime
   parses the attribute string `"false"` as `true` there
   (`node_modules/@stencil/core/internal/client/index.js:2352-2353`), so such a default cannot be
   turned off from HTML. The five live instances (`mud-numeric-input.tsx:183,190,225`,
   `mud-search-input.tsx:86`, `mud-textarea.tsx:119`) are a product bug filed as a separate issue
   (Task 4.2), not fixed in this PR.
   **Corrected at execution (Dan, 2026-09-17):** a browser probe showed the premise holds only for a
   string `"false"` assigned to the property; `attributeChangedCallback` coerces an HTML attribute to
   a boolean first (`internal/client/index.js:3854-3856`), so `clearable="false"` in markup gives
   `false`. The check is kept at `warning`, the docs and script message say "property string", the
   parity spec guards both runtime lines, and the Task 4.2 draft targets the property-string path.

### Options

Module for the new parser-based checks.

| Option | Complexity added now | Cost to maintain | Cost to reverse | Risk | Value |
| --- | --- | --- | --- | --- | --- |
| New script 16, report-only, reads script 14's contract | med: 1 script, 1 code registry | low: separate module, contract parsing reused | med: codes are cited by the skill | existing violations stay silent in CI | lint-like rules isolated from the contract extraction a spec already consumes |
| New script 16 + ratchet spec with a violation baseline | high: plus a baseline file | med: baseline upkeep on every fix | med | friction on every PR | new violations fail CI |
| Extend script 14 | low: no new file | high: contract extraction and lint rules in one module | high: `form-associated-contract.spec.mjs` imports 14 | a lint change breaks the contract spec | fewest files |

Recommendation: new script 16, report-only — it keeps lint-like rules out of the contract extractor
that a spec already depends on, and reads that extractor instead of re-parsing.

## Global Constraints

- Branch `fix/issue-86-stencil-compliance-skill` from `fix/issue-53-ai-docs-alignment`; never commit to `main` or to the PR #83 branch.
- Stage paths by name; never `git add -A` / `git add .` / `commit -a`. Never hand-edit `src/components.d.ts` or component `readme.md`.
- Every authored file is English. Conventional commit subjects, as in `git log`.
- `yarn check.verify` (typecheck, lint, test, test:scripts, docs:check) passes at every commit — a guard lands only in the commit that makes the repo satisfy it.
- No change to component `.tsx`/`.css` behaviour in this PR. The only `src/` edits are the 5 type-only `@Element()` fixes and the 3 stylelint-disable comments (Decision 3). Findings script 16 reports on components are reported, not fixed.
- Before every commit: `npx prettier --write <each changed .mjs/.json/.css/.tsx path>` then `yarn lint` → exit 0. `.husky/pre-commit` runs `yarn lint` (including `prettier --check .`); the code blocks in this plan are not pre-formatted.
- No new npm dependency. `@stencil/core` stays `~4.45.0`.
- Stop and return to Dan: any lint rule with >0 violations (Decision 3); a probe that contradicts a rule the skill keeps; any change to `stencil.config.ts`.

## Acceptance bar

Zero-tolerance, each decided by the command beside it:

| # | Condition | Command → pass value |
| --- | --- | --- |
| 1 | Script suite green, including the new specs | `node --test "scripts/__tests__/**/*.spec.mjs"` → exit 0 |
| 2 | Docs checker clean with `stale-prefix`, `lookaround`, `stencil-version` active | `node scripts/docs/check-ai-docs.mjs` → exit 0, `check-ai-docs: clean` |
| 3 | Lint green with the enabled rules | `yarn lint` → exit 0 |
| 4 | Script 16 runs over every component and emits a schema-valid envelope | `node scripts/audit/16-stencil-contract.mjs --all --json > /tmp/s16.json; echo $?` → exit 0 or 1 (1 = findings, report-only), never 2; `node -e "const j=require('/tmp/s16.json');process.exit(j.schemaVersion&&j.summary&&Array.isArray(j.findings)?0:1)"` → exit 0 |
| 5 | Script 02 fixture runner green | `node scripts/audit/__tests__/02-antipatterns.test.mjs` → exit 0 |
| 6 | Every skill-cited rule code resolves, and every `scope: 'stencil'` registry code is cited | covered by #1 (`stencil-compliance-skill.spec.mjs`) |
| 7 | The skill names no non-existent component and states no `shadow: true`-only rule | the two commands in the `row-7` block below → first prints nothing; second prints only lines that also state the object form is accepted |
| 8 | Full gate | `yarn check.verify` → exit 0 |

```bash
# row-7
grep -rnE 'mud-(input|toggle|radio-button|combobox)([^-a-z]|$)' .claude/skills/stencil-compliance
grep -rn 'shadow: true' .claude/skills/stencil-compliance src/components/AGENTS.md | grep -v 'shadow: {' | grep -v delegatesFocus
```

Numeric tolerance: script 16's first `--all` run is recorded in Task 1.2 Step 6; a check whose
findings on current code are >0 and not a real violation of the rule it implements (Decisions 2 and
5; member order per `src/components/_agents/component-structure.md:35-46`; `STENCIL-MAP-KEY`: any
JSX element returned from a `.map()` callback without `key`) is a classifier bug, fixed before commit
(tolerance 0 false positives over every component `--all` scans).

## Coverage

Every source-report item and where it is handled.

| Item | Report claim (short) | Task / disposition |
| --- | --- | --- |
| Foreign commits | `spec`-authored commits on `main`, PR branch, `other` | Closed before this plan: `main` = `ace1c0f`, no `other` branch, cause fixed in `b95f23b` (ancestor of HEAD). No task |
| A1 | `rg` lookahead without `--pcre2` fails to parse (16 lines, 9 of them "Grep \`…\`" cells) | 2.3 removes them; 3.1 rule `lookaround` guards |
| A2 | Old `cor` prefix (`corX`, `CorX`, `HTMLCor`, `onCor*`) | 2.2/2.3 in the skill; 3.1 rule `stale-prefix` + sweep of every other doc-scope hit |
| A3 | Three anti-pattern numberings disagree | 1.1 `scope` field; 2.1 `_agents/anti-patterns.md` cites codes; 2.3 skill cites codes; 2.4 `optimize-prompt` |
| A4 | `shadow: true` only; 17 components use `shadow: { delegatesFocus: true }` | 2.1 (`src/components/AGENTS.md`), 2.2/2.3; 1.2 check `STENCIL-SHADOW-REQUIRED` accepts both |
| A5 | Fictional form-associated list; submitters need no restore callback | 2.3 replaces the list with a command; 1.2 check `STENCIL-FORM-CALLBACKS` classifies submitters by `internals.form?.requestSubmit()` |
| A6 | `@Watch` rule contradicts code | Decision 2; 2.1 canonical rule; 1.2 checks `STENCIL-WATCH-ASYNC`, `STENCIL-WATCH-WRITES-WATCHED` |
| A7 | `.eslintrc.js`, "mud-icon in a future branch", `yarn build` before commit | `.eslintrc.js` at `references/anti-patterns.md:421` → 2.3; `yarn build` before commit at `SKILL.md:123` → 2.2 Step 7; the `mud-icon` sentence is already absent at `18c3aae` (`grep -rniE "future\|upcoming" .claude/skills/stencil-compliance` → only an unrelated "future-proofing") |
| A8 | Wrong code examples (formDisabledCallback, formResetCallback, `<Host style-height>`, identical ❌/✅, invalid dual selector) | 2.3 |
| A9 | #16/EL6 and SE3/SE6/SE9 unverified | 0.2 verifies; 2.3 rewrites each per result or deletes it |
| A10 | Member order, `@Watch`, anti-patterns defined in several places | 2.1 keeps canonical homes; 2.3 links instead of restating |
| B1 | `Mixin()`/extends (4.37) and earlier watcher firing | 2.3 `version-delta.md` entry; no `mixins-extends.md` (adoption not decided) |
| B2 | `@PropSerialize`/`@AttrDeserialize` are 4.38 | 2.3 |
| B3 | 4.41.3 form attributes | 0.2 facts: `FORM_ASSOCIATED_ATTRIBUTES` is JSX typing only (`compiler/stencil.js:277363,277406`), **but** boolean `"false"` parses as `true` on form-associated components (`internal/client/index.js:2352`). 2.3 `version-delta.md`; 1.2 check `STENCIL-FORM-BOOLEAN-DEFAULT-TRUE`; 3.2 guard; 4.2 issue |
| B4 | API list incomplete | 2.3 table from `internal/stencil-core/index.d.ts`; 3.2 two-way guard |
| B5 | `OneOf3` Yarn patch unmentioned, lost silently on upgrade | 2.3 `version-delta.md`; 3.2 guard asserts the patch output is in the installed compiler |
| B6 | Plugin `single-export` rule missing; FC9 distorted | 1.3 enables `single-export`; 2.3 FC9 → `enforced-by: eslint` |
| B7 | Versioning section vague | 2.3 `version-delta.md` with a re-check command; 3.1 `stencil-version`, 3.2 heading guard |
| B8 | Stencil 5 beta | 2.3 one watch line in `version-delta.md` |
| B9 | Out-of-scope unclear (hydrate/SSR, DSD, scoped slot fixes) | 2.2 `## Out of scope` section |
| C1 | Skill ignores scripts 02/14 and the form spec | 2.2 run contract (runs 02/14/16 and, for a form-associated component, `form-associated-contract.spec.mjs`) |
| C2 | Plugin rules not enabled | 1.3: six enabled (element-type after 5 type fixes); `reserved-member-names` off → #88; `decorators-style` off (Decision 3) |
| C3 | Parser checks | 1.2; the list is reduced — see § C3 dispositions |
| C4 | Doc ↔ registry parity test | 3.2 |
| C5 | Stale-version header, `cor` ban | 3.1, 3.2 |
| C6 | stylelint rules, RAW-PIXELS noise | 1.3 (`transition: all`; `!important` with 3 inline disables); `:host` without `display` → 1.1 as a script 02 CSS check (no stylelint rule exists for it); 1.1 RAW-PIXELS tune |
| D1 | No run contract | 2.2 |
| D2 | `enforced-by` column | 2.2/2.3; 3.2 checks `eslint`/`stylelint` rows against the loaded config |
| D3 | One source per rule; non-Stencil rules out | 1.1 `scope`; 2.3 |
| D4 | New references | 2.3 `version-delta.md`; `mixins-extends.md` not created (B1) |
| D5 | Failure modes, self-check, NOT clauses | 2.2 |
| D6 | Romanian text | 2.2/2.3 |
| D7 | Testing utilities in `functional-api.md` | 2.3 deletes them, links `TESTING.md` |
| D8 | "Key rule count" column | 2.2 deletes it |

### C3 dispositions

| C3 check | Disposition | Evidence |
| --- | --- | --- |
| Shadow config | 1.2 `STENCIL-SHADOW-REQUIRED`, reads script 14's normalized `contract.shadow` | `14-component-contract.mjs:461` |
| Q8 by component kind | 1.2 `STENCIL-FORM-CALLBACKS` | submitters: `mud-button.tsx:229`, `mud-service-button.tsx:137` |
| `!` on decorators | Dropped from 16; `enforced-by: tsc` (TS2564 under `strict: true`, CI `typecheck`) | `tsconfig.json:18`, `.github/workflows/ci.yml:37` |
| Boolean default | 1.2 `STENCIL-FORM-BOOLEAN-DEFAULT-TRUE`, form-associated only (Decision 5) | `internal/client/index.js:2352` |
| `reflect` on object/array | Dropped; manual rule; 0 instances | fresh-eyes probe 2026-09-17 |
| `@State` typed `HTMLElement` | Dropped; manual rule; 0 instances | same |
| >2 `@Method` | Dropped; manual rule; max is 2 | same |
| Member order | 1.2 `STENCIL-MEMBER-ORDER` | `src/components/_agents/component-structure.md:35-46` |
| `@Watch` classification | 1.2 `STENCIL-WATCH-ASYNC`, `STENCIL-WATCH-WRITES-WATCHED` (Decision 2); a literal write inside an `if` that is not validation is not decidable → `manual` | `mud-radio.tsx:134-143`; the one non-literal write, `mud-pagination.tsx:163` (clamp), stays reported |
| `formDisabledCallback` assigning a prop | Dropped; 0 instances (all assign `@State fieldsetDisabled`); the A8 example is fixed in 2.3 | same |
| `@Listen` scroll without `passive` | Dropped; the compiler defaults `passive` to true for scroll/wheel/touch | `compiler/stencil.js:279718-279757` |
| `key` in `.map()` | 1.2 `STENCIL-MAP-KEY` (no array-literal exemption: `grep -rn "\]\.map(" src/components --include='*.tsx'` → 0 instances) | 10 hits on `18c3aae` (§ Measured) |
| `setValidity` flags + empty message | Dropped; undecidable from source (6 of 10 flag-setting calls pass variables); manual rule | `mud-text-input.tsx:230` |

## Execution matrix

Dispatch verdict: **mixed.** Code phases with exact code and the guard phase stay inline; the
consumer-doc sweep and the prefix sweep are briefs graded by a checker and go to workers.

| Phase | Model | Effort | Wave | Mode | Depends on / notes |
| --- | --- | --- | --- | --- | --- |
| 0 Measure and verify | Opus 5 | medium | A | inline | none; no commits |
| 1 Scripts and lint | Opus 5 | medium | B | inline | 0 (counts gate Task 1.3) |
| 2.1–2.3 Canonical docs and skill rewrite | Opus 5 | medium | C | inline | 1 (cites script 16 codes) and 0.2 (probe results) |
| 2.4 Consumer docs | Sonnet 5 | medium | D | subagent `implementer` | 2.2 (run contract wording) |
| 3.1 Docs checker rules + prefix sweep | Opus 5 | medium | E | inline; sweep step to subagent `mechanical-worker` (Haiku 4.5) | 2 (rules grade its output) |
| 3.2 Skill parity spec | Opus 5 | medium | F | inline | 1, 2 |
| 4 Close | Opus 5 | low | G | inline | 1–3 |

reuse-candidates: (homes swept: `scripts/audit/`, `scripts/audit/lib/`, `scripts/__tests__/`, `scripts/docs/`, `STACK.md`, `.claude/skills/stencil-compliance/references/`)
- `scripts/audit/16-stencil-contract.mjs` — candidate `14-component-contract.mjs` (same parser, same targets) · tier: partial · verdict: create, reading 14's `extractContractFromTsx` (§ Options)
- `scripts/__tests__/audit/16-stencil-contract.spec.mjs` — candidate `scripts/__tests__/audit/14-component-contract.spec.mjs` · tier: layout only · verdict: create, one spec per script (repo convention)
- `scripts/__tests__/stencil-compliance-skill.spec.mjs` — candidate `scripts/__tests__/check-ai-docs.spec.mjs` · tier: none (that spec tests the checker on fixtures; this one asserts the real skill against real configs) · verdict: create
- `scripts/audit/__fixtures__/host-display/` — candidate the existing fixture runner layout · tier: exact · verdict: extend (new slug in the existing runner)
- `references/version-delta.md` — candidate `STACK.md` (versions and rejected choices) · tier: partial (STACK.md records why a version is pinned, not how Stencil behaves across versions) · verdict: create, linked from the skill only

Every wave holds one phase, so no two phases write in parallel. Routing rationale: no phase needs
Fable 5.1 — the decisions are recorded above. Opus 5 writes the code the plan is graded by and the
skill text that decides what the model judges; Sonnet 5 applies a brief to consumer docs; Haiku 4.5
applies a mechanical rename list the checker produces. Escalation: a phase that fails its verify
twice restarts one tier up with fresh context.

---

## Phase 0 — Measure and verify (no commits)

**Executor**: Opus 5 · medium · wave A · inline

### Task 0.1: Lint rule baselines

**Files:** none written in the repo; results recorded in this plan under "Measured".

- [x] **Step 1: Count each approved ESLint rule on `src/components`**

```bash
for r in async-methods element-type render-returns-host reserved-member-names single-export props-must-be-public methods-must-be-public; do
  n=$(npx eslint "src/components/**/*.tsx" --rule "{\"@stencil/$r\": \"error\"}" -f json 2>/dev/null \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.flatMap(f=>f.messages).filter(m=>m.ruleId==='@stencil/$r').length)})")
  echo "$r $n"
done
```

Expected: one line per rule with a count. Record them.

- [x] **Step 2: Count the two stylelint rules**

stylelint 17's `--config` takes a file path, and its JSON report goes to stderr:

```bash
cat > /tmp/stylelint-probe.json <<EOF
{"extends":"$PWD/.stylelintrc.json","rules":{"declaration-no-important":true,"declaration-property-value-disallowed-list":{"transition":["/\\\\ball\\\\b/"],"transition-property":["all"]}}}
EOF
npx stylelint "src/components/**/*.css" --allow-empty-input -f json --config /tmp/stylelint-probe.json 2>&1 >/dev/null \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const w=JSON.parse(s).flatMap(f=>f.warnings);for(const r of ['declaration-no-important','declaration-property-value-disallowed-list'])console.log(r,w.filter(x=>x.rule===r).length)})"
```

Expected (§ Measured): `declaration-no-important 3`, `declaration-property-value-disallowed-list 0`.

- [x] **Step 3: Classify the RAW-PIXELS warnings**

```bash
node scripts/audit/02-stencil-antipatterns.mjs --all --json 2>/dev/null \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{for(const f of JSON.parse(s).findings.filter(f=>f.code==='ANTIPATTERN-RAW-PIXELS'))console.log(f.file+':'+f.line+'  '+(f.snippet??''))})" \
  > /tmp/raw-pixels.txt; wc -l < /tmp/raw-pixels.txt
```

Expected: 84 lines. Group them by value shape (`1px`, `calc(...)`, media query, `0.5px`, other) and
record the group counts; Task 1.1 Step 5 keys the tune on these groups.

- [x] **Step 4: Record results** under "Measured" at the end of this plan. If any Step 1/2 count is >0, Task 1.3 stops for that rule.

### Task 0.2: Verify the unverified skill claims (A9, B3)

**Files:** a probe page in a scratch directory outside the repo, plus one temporary `console.log` in `src/components/mud-accordion/mud-accordion.tsx` that is removed before the task ends (never committed); results recorded under "Measured".

- [x] **Step 1: SE3/SE6/SE9 against the installed runtime.** Read the serializer paths and record `file:line` for each claim:

```bash
grep -n "PropSerialize\|AttrDeserialize\|serializers\|deserializers" node_modules/@stencil/core/internal/client/index.js | head -30
grep -n "reflect" node_modules/@stencil/core/internal/client/index.js | head -20
```

For each of SE3 ("serializer MUST return string or null; null removes the attribute"), SE6
("`reflect: true` not required with `@PropSerialize`"), SE9 ("both set → undefined behaviour"), write
`true (file:line)`, `false (file:line)` or `undecidable from source`.

- [x] **Step 2: #16/EL6 probe ("host children are not available in `componentWillLoad`").** Build once; the lazy loader lands in `dist/mud/` (there is no `www` output target: `stencil.config.ts`), then serve the repo root with `python3 -m http.server 8080`:

```bash
yarn dx:stencil:once
```

Create `probe.html` at the repo root (untracked, deleted at the end of the task) loading `/dist/mud/mud.esm.js` with three cases, then open `http://localhost:8080/probe.html` through the
dev server or Playwright and read `console` output:

```html
<script type="module" src="/dist/mud/mud.esm.js"></script>
<mud-accordion id="parsed"><mud-accordion-item>A</mud-accordion-item></mud-accordion>
<script>
  // Case 2: children appended only after the component has finished its first load,
  // so componentWillLoad provably ran with no children.
  const el = document.createElement('mud-accordion');
  document.body.append(el);
  customElements.whenDefined('mud-accordion')
    .then(() => el.componentOnReady())
    .then(() => el.append(document.createElement('mud-accordion-item')));
  // Case 3: markup with children inserted in one step into a connected container.
  const box = document.createElement('div');
  document.body.append(box);
  box.innerHTML = '<mud-accordion id="inner"><mud-accordion-item>B</mud-accordion-item></mud-accordion>';
  customElements.whenDefined('mud-accordion').then(() =>
    setTimeout(() => console.log('probe', document.querySelectorAll('mud-accordion-item').length), 500));
</script>
```

Record, for case 1 (parser-inserted markup) and case 3 (the same markup via `innerHTML` on an already-connected container, added to the page), whether `this.host.children.length > 0` inside `componentWillLoad`; case 2 shows what a rule would need to cover (children added after load reach the component only through `slotchange`). `mud-accordion.tsx` has no `componentWillLoad`; add a
temporary `componentWillLoad() { console.log('cwl', this.host.id, this.host.children.length); }` (it already declares `@Element() host` at `:87`), rebuild, read the console, then remove the line with
the Edit tool and confirm `git diff --quiet -- src/components/mud-accordion` exits 0 and `probe.html` is deleted. If the probe
cannot run, the rule is deleted in Task 2.3, not kept unverified.

- [x] **Step 3: B3 runtime fact.** Record `internal/client/index.js:2352-2353` and the two call sites (`:3545`, `:3728`) under "Measured".

---

## Phase 1 — Scripts and lint

**Executor**: Opus 5 · medium · wave B · inline

### Task 1.0: Create the branch

- [x] **Step 1:** The branch exists (created 2026-09-17 at `18c3aae`, not checked out, because another session works in the PR #83 worktree). Check it out in the worktree Dan names at execution start, then `git log -1 --oneline` → `18c3aae` or a later PR #83 tip merged in; if PR #83 has moved, `git merge fix/issue-53-ai-docs-alignment` first.
- [x] **Step 2:** Move this plan file into that worktree's `.claude/plans/` and commit it alone: `git add .claude/plans/2026-09-17-stencil-compliance-skill.md && git commit -m "docs(plans): plan the stencil-compliance skill overhaul"`.

### Task 1.1: Script 02 — `scope` field, `:host` display check, RAW-PIXELS tune

**Files:**
- Modify: `scripts/audit/02-stencil-antipatterns.mjs` (`PATTERNS` at `:57`, `FILE_CHECKS` at `:219`, header comment `:1-28`, `:52-56`)
- Create: `scripts/audit/__fixtures__/host-display/positive/host-display.css`, `.../negative/host-display.css`; `scripts/audit/__fixtures__/raw-pixels/{positive,negative}/*.css`
- Test: `scripts/__tests__/audit/02-stencil-antipatterns.spec.mjs` (gated by `test:scripts`); `scripts/audit/__tests__/02-antipatterns.test.mjs` (fixture runner, `yarn audit:test`, not in `check.verify`)

**Interfaces:**
- Produces: every `PATTERNS` and `FILE_CHECKS` entry gains `ruleScope: 'stencil' | 'project'` (the existing `scope` field keeps meaning file kind). Task 3.2 reads `ruleScope`. New code `ANTIPATTERN-HOST-DISPLAY` (`ruleScope: 'stencil'`, `scope: 'css'`).

- [x] **Step 1: Add `ruleScope`** to each entry: `'stencil'` for `001-INLINE-STYLE`, `002-HOST-CLASSLIST`, `023-CLASSNAME`, `004-EVENTEMITTER-UNTYPED`, `005-ARRAY-MUTATION`, `013-FORCEUPDATE`, `014-SHOULDUPDATE`, `010-SETFORMVALUE-1ARG`, `007-LIFECYCLE-LEAK`, `003-METHOD-NON-ASYNC`, `025-EVENT-PREFIX`, `018-TRANSITION-ALL`, `IMPORTANT`, `HOST-DISPLAY`; `'project'` for `TS-ANY`, `TS-IGNORE`, `021-RAW-SVG`, `SECURITY-INNERHTML`, `020-PALETTE-IN-CSS`, `019-RAW-HEX`, `RAW-PIXELS`, `RENDER-NULL-NO-FALLBACK-ARIA`, `FETCH-CACHE-NO-EVICTION`, `026-PROP-CONTENT-SLOT-FALLBACK`. Add to `scripts/__tests__/audit/02-stencil-antipatterns.spec.mjs`, next to its existing shape assertion (`:59-62`), a test that fails first:

```js
  it('tags every rule with the doc that owns it', () => {
    for (const entry of [...PATTERNS, ...FILE_CHECKS]) {
      assert.ok(['stencil', 'project'].includes(entry.ruleScope), `${entry.code}: ruleScope`);
    }
  });
```

Run `node --test scripts/__tests__/audit/02-stencil-antipatterns.spec.mjs` → FAIL before the tags, PASS after.

- [x] **Step 2: Write the `:host` display fixtures**

`scripts/audit/__fixtures__/host-display/positive/host-display.css`:
```css
:host {
  gap: var(--space-2);
}
```

`scripts/audit/__fixtures__/host-display/negative/host-display.css`:
```css
:host {
  display: inline-flex;
}

:host([hidden]) {
  display: none;
}
```

Run: `node scripts/audit/__tests__/02-antipatterns.test.mjs` → prints `skip host-display … orphan fixture folder?` (the runner skips an unknown slug rather than failing). The red phase is the spec: add to `02-stencil-antipatterns.spec.mjs` a case that `scanFile({ kind: 'css', path: 'x.css', rel: 'x.css', content: ':host {\n  gap: 1rem;\n}\n' }, 'mud-x')` returns a finding with code `ANTIPATTERN-HOST-DISPLAY`, and that `':host {\n  display: block;\n}\n'` returns none → FAIL.

- [x] **Step 3: Implement `ANTIPATTERN-HOST-DISPLAY`** as a `FILE_CHECKS` entry:

```js
{
  code: 'ANTIPATTERN-HOST-DISPLAY',
  severity: 'warning',
  scope: 'css',
  ruleScope: 'stencil',
  check: (content, ctx) => {
    const css = stripCssBlockComments(content);
    // Only the bare `:host { … }` rule sets the element's default display;
    // `:host(...)` state rules may legitimately omit it.
    const m = css.match(/(^|[};])\s*:host\s*\{([^}]*)\}/);
    if (!m) return [];
    if (/(^|;|\{)\s*display\s*:/.test(m[2])) return [];
    const line = css.slice(0, m.index + m[0].indexOf(':host')).split('\n').length;
    return [
      finding({
        severity: 'warning',
        code: 'ANTIPATTERN-HOST-DISPLAY',
        file: ctx.fileRel,
        line,
        message: '`:host` has no `display` — a custom element defaults to `display: inline`.',
        fix: 'Declare `display` in the bare `:host { }` rule.',
      }),
    ];
  },
},
```

Run the fixture runner → PASS. Then `node scripts/audit/02-stencil-antipatterns.mjs --all --json | node -e "…count ANTIPATTERN-HOST-DISPLAY…"` and record the count; each hit is either a real violation (reported, not fixed — Global Constraints) or a classifier bug fixed now.

- [x] **Step 4: Tune `ANTIPATTERN-RAW-PIXELS`** (`:183`; `1px` is already skipped at `:191`) using the measured groups (§ Measured: 41 `var(--token, Npx)` fallbacks, 11 `@media`/`@container` conditions, 4 inside `calc(`, 1 `0.5px`, 27 other). Skip the first four groups; the 27 "other" hits stay. Add one negative fixture per skipped group under `__fixtures__/raw-pixels/negative/` and one positive (`padding: 12px;`) under `positive/`, plus one spec case per group in `02-stencil-antipatterns.spec.mjs`. Run the spec and the fixture runner → PASS; re-run Task 0.1 Step 3 → 27 (± hits whose group was misread; open each difference).

- [x] **Step 5: Update the header comment** (`:1-28`, `:52-56`): drop "Anti-pattern numbers reference `.claude/skills/stencil-compliance/references/anti-patterns.md`"; state that codes are the stable identifiers and `ruleScope` says which doc owns the rule.

- [x] **Step 6: Verify and commit**

```bash
npx prettier --write scripts/audit/02-stencil-antipatterns.mjs scripts/__tests__/audit/02-stencil-antipatterns.spec.mjs
yarn lint && node scripts/audit/__tests__/02-antipatterns.test.mjs && node --test "scripts/__tests__/**/*.spec.mjs"
git add scripts/audit/02-stencil-antipatterns.mjs scripts/__tests__/audit/02-stencil-antipatterns.spec.mjs scripts/audit/__fixtures__/host-display scripts/audit/__fixtures__/raw-pixels
git commit -m "feat(audit): tag antipattern rules by owner and check :host display"
```

### Task 1.2: Script 16 — `16-stencil-contract.mjs`

**Files:**
- Create: `scripts/audit/16-stencil-contract.mjs`
- Create: `scripts/__tests__/audit/16-stencil-contract.spec.mjs`
- Modify: `scripts/audit/run-all.mjs` (`AUDIT_SCRIPTS`, after the `14` entry; header comment `:9-21`; USAGE "Script ids" block `:79-81`)
- Modify: `scripts/__tests__/audit/run-all.spec.mjs` (`:28-30` pins the Wave A count at 7 → 8)
- Modify: `package.json` (`scripts`: add `"audit:stencil-contract": "node scripts/audit/16-stencil-contract.mjs"`)

**Interfaces:**
- Consumes: `extractContractFromTsx(tsxPath, componentName) → { findings, contract, componentName }` from `14-component-contract.mjs:142` (`contract.shadow: boolean`, `contract.formAssociated: boolean`, `contract.props[]: { name, type, default, … }`); `createSourceFile`, `getComponentClass`, `getDecorators`, `getDecoratorName`, `getMemberName`, `getLineNumber` from `lib/ts-parser.mjs`; `parseAuditArgs`, `defaultUsage` from `lib/cli-args.mjs`; `resolveComponentPaths`, `listAllComponents`, `relativeToRepo` from `lib/component-paths.mjs`; `buildResult`, `emit`, `finding` from `lib/json-output.mjs`; `EXIT_INTERNAL`, `exitCodeFromSummary` from `lib/exit-codes.mjs`.
- Produces: `export const RULES` — array of `{ code, severity, ruleScope: 'stencil' }`; `export function checkSource(tsxPath, componentName) → finding[]`; codes `STENCIL-SHADOW-REQUIRED`, `STENCIL-FORM-CALLBACKS`, `STENCIL-FORM-BOOLEAN-DEFAULT-TRUE`, `STENCIL-MEMBER-ORDER`, `STENCIL-WATCH-ASYNC`, `STENCIL-WATCH-WRITES-WATCHED`, `STENCIL-MAP-KEY`. Task 3.2 reads `RULES`.

- [x] **Step 1: Write the failing spec**

`scripts/__tests__/audit/16-stencil-contract.spec.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { checkSource, RULES } from '../../audit/16-stencil-contract.mjs';

function tsx(source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's16-'));
  const file = path.join(dir, 'mud-probe.tsx');
  fs.writeFileSync(file, source);
  return file;
}

const codes = (source) => checkSource(tsx(source), 'mud-probe').map(f => f.code).sort();

describe('16-stencil-contract', () => {
  it('registers every code it can emit', () => {
    assert.deepEqual(RULES.map(r => r.code).sort(), [
      'STENCIL-FORM-BOOLEAN-DEFAULT-TRUE',
      'STENCIL-FORM-CALLBACKS',
      'STENCIL-MAP-KEY',
      'STENCIL-MEMBER-ORDER',
      'STENCIL-SHADOW-REQUIRED',
      'STENCIL-WATCH-ASYNC',
      'STENCIL-WATCH-WRITES-WATCHED',
    ]);
    assert.ok(RULES.every(r => r.ruleScope === 'stencil'));
  });

  it('accepts both shadow spellings and flags none', () => {
    assert.deepEqual(codes(`@Component({ tag: 'mud-probe', shadow: true }) export class P { render() { return <Host />; } }`), []);
    assert.deepEqual(codes(`@Component({ tag: 'mud-probe', shadow: { delegatesFocus: true } }) export class P { render() { return <Host />; } }`), []);
    assert.deepEqual(codes(`@Component({ tag: 'mud-probe', scoped: true }) export class P { render() { return <Host />; } }`), ['STENCIL-SHADOW-REQUIRED']);
  });

  it('requires the restore callback on a value control but not on a submitter', () => {
    const base = (body) => `@Component({ tag: 'mud-probe', shadow: true, formAssociated: true })
export class P {
  @AttachInternals() internals!: ElementInternals;
  formResetCallback() {}
  formDisabledCallback() {}
  ${body}
  render() { return <Host />; }
}`;
    assert.deepEqual(codes(base('onClick() { this.internals.form?.requestSubmit(); }')), []);
    assert.deepEqual(codes(base('')), ['STENCIL-FORM-CALLBACKS']);
    assert.deepEqual(codes(base('formStateRestoreCallback() {}')), []);
  });

  it('flags a boolean prop defaulting to true only on a form-associated component', () => {
    const cmp = (fa) => `@Component({ tag: 'mud-probe', shadow: true${fa ? ', formAssociated: true' : ''} })
export class P {
  @Prop() clearable: boolean = true;
  @AttachInternals() internals!: ElementInternals;
  formResetCallback() {} formDisabledCallback() {} formStateRestoreCallback() {}
  render() { return <Host />; }
}`;
    assert.deepEqual(codes(cmp(true)), ['STENCIL-FORM-BOOLEAN-DEFAULT-TRUE']);
    assert.deepEqual(codes(cmp(false)).filter(c => c === 'STENCIL-FORM-BOOLEAN-DEFAULT-TRUE'), []);
  });

  it('allows a validation fallback write but flags other watched-prop writes and async watchers', () => {
    const cmp = (body) => `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @Prop({ mutable: true }) size: string = 'md';
  ${body}
  render() { return <Host />; }
}`;
    assert.deepEqual(codes(cmp(`@Watch('size') v(next: string) { if (!['sm','md'].includes(next)) { console.warn('x'); this.size = 'md'; } }`)), []);
    assert.deepEqual(codes(cmp(`@Watch('size') v(next: string) { this.size = next.trim(); }`)), ['STENCIL-WATCH-WRITES-WATCHED']);
    assert.deepEqual(codes(cmp(`@Watch('size') v() { this.size += 'x'; }`)), ['STENCIL-WATCH-WRITES-WATCHED']);
    assert.deepEqual(codes(cmp(`@Watch('size') async v() { await Promise.resolve(); }`)), ['STENCIL-WATCH-ASYNC']);
  });

  it('flags decorator groups out of the canonical order', () => {
    const ok = `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @Prop() a: string = '';
  @State() b = 0;
  @Element() host!: HTMLElement;
  @Event() mudChange!: EventEmitter<string>;
  @Watch('a') w() {}
  @Listen('keydown') k() {}
  componentWillLoad() {}
  render() { return <Host />; }
}`;
    const bad = ok.replace("@Prop() a: string = '';\n  @State() b = 0;", "@State() b = 0;\n  @Prop() a: string = '';");
    assert.deepEqual(codes(ok), []);
    assert.deepEqual(codes(bad), ['STENCIL-MEMBER-ORDER']);
  });

  it('flags a keyless element returned from .map()', () => {
    const cmp = (expr) => `@Component({ tag: 'mud-probe', shadow: true })
export class P {
  @Prop() items: string[] = [];
  render() { return <Host>{${expr}}</Host>; }
}`;
    assert.deepEqual(codes(cmp('this.items.map(i => <li>{i}</li>)')), ['STENCIL-MAP-KEY']);
    assert.deepEqual(codes(cmp('this.items.map(i => { return (<li>{i}</li>); })')), ['STENCIL-MAP-KEY']);
    assert.deepEqual(codes(cmp('this.items.map(i => <li key={i}>{i}</li>)')), []);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `node --test scripts/__tests__/audit/16-stencil-contract.spec.mjs`
Expected: FAIL — `Cannot find module '…/scripts/audit/16-stencil-contract.mjs'`.

- [x] **Step 3: Write the implementation**

`scripts/audit/16-stencil-contract.mjs`:

```js
#!/usr/bin/env node
/**
 * 16-stencil-contract.mjs
 *
 * Parser-decidable Stencil rules that the compiler, `tsc --strict` and the
 * enabled ESLint rules do not already enforce. Report-only: exit 1 means
 * findings, never a gate. Declaration facts come from script 14's contract
 * extractor; this file walks the AST only for method bodies and JSX.
 *
 * Codes are cited by `.claude/skills/stencil-compliance/`. The parity spec
 * `scripts/__tests__/stencil-compliance-skill.spec.mjs` keeps both in step.
 *
 * Usage:
 *   node scripts/audit/16-stencil-contract.mjs mud-button [--json]
 *   node scripts/audit/16-stencil-contract.mjs --all --json
 */
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import {
  createSourceFile,
  getComponentClass,
  getDecorators,
  getDecoratorName,
  getMemberName,
  getLineNumber,
} from './lib/ts-parser.mjs';
import { extractContractFromTsx } from './14-component-contract.mjs';

const TOOL = 'stencil-contract';

const USAGE = defaultUsage(
  '16-stencil-contract',
  'Check parser-decidable Stencil rules (shadow, form callbacks, member order, @Watch, JSX keys).',
);

export const RULES = [
  { code: 'STENCIL-SHADOW-REQUIRED', severity: 'error', ruleScope: 'stencil' },
  { code: 'STENCIL-FORM-CALLBACKS', severity: 'error', ruleScope: 'stencil' },
  { code: 'STENCIL-FORM-BOOLEAN-DEFAULT-TRUE', severity: 'error', ruleScope: 'stencil' },
  { code: 'STENCIL-MEMBER-ORDER', severity: 'warning', ruleScope: 'stencil' },
  { code: 'STENCIL-WATCH-ASYNC', severity: 'error', ruleScope: 'stencil' },
  { code: 'STENCIL-WATCH-WRITES-WATCHED', severity: 'warning', ruleScope: 'stencil' },
  { code: 'STENCIL-MAP-KEY', severity: 'warning', ruleScope: 'stencil' },
];

const severityOf = code => RULES.find(r => r.code === code).severity;

// Canonical group order: src/components/_agents/component-structure.md "Member Order".
const GROUP_ORDER = ['Prop', 'State', 'Element', 'AttachInternals', 'Event', 'Watch', 'Listen', 'lifecycle', 'render'];
const LIFECYCLE = new Set([
  'connectedCallback', 'disconnectedCallback', 'componentWillLoad', 'componentDidLoad',
  'componentShouldUpdate', 'componentWillRender', 'componentDidRender', 'componentWillUpdate', 'componentDidUpdate',
]);

function memberGroup(member) {
  const names = getDecorators(member).map(getDecoratorName);
  const decorated = GROUP_ORDER.find(g => names.includes(g));
  if (decorated) return decorated;
  const name = getMemberName(member);
  if (name === 'render') return 'render';
  if (LIFECYCLE.has(name)) return 'lifecycle';
  return null; // private fields/methods may sit anywhere before render
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, child => walk(child, visit));
}

function isInsideIf(node, stopAt) {
  for (let p = node.parent; p && p !== stopAt; p = p.parent) {
    if (ts.isIfStatement(p)) return true;
  }
  return false;
}

const isLiteral = n =>
  ts.isStringLiteral(n) || ts.isNumericLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ||
  n.kind === ts.SyntaxKind.TrueKeyword || n.kind === ts.SyntaxKind.FalseKeyword ||
  n.kind === ts.SyntaxKind.NullKeyword;

function jsxRootLacksKey(body) {
  let expr = body;
  if (ts.isBlock(body)) {
    const ret = body.statements.find(ts.isReturnStatement);
    expr = ret?.expression;
  }
  while (expr && ts.isParenthesizedExpression(expr)) expr = expr.expression;
  if (!expr) return false;
  const attrs = ts.isJsxElement(expr) ? expr.openingElement.attributes
    : ts.isJsxSelfClosingElement(expr) ? expr.attributes : null;
  if (!attrs) return false;
  return !attrs.properties.some(p => ts.isJsxAttribute(p) && p.name.getText() === 'key');
}

export function checkSource(tsxPath, componentName) {
  const { contract } = extractContractFromTsx(tsxPath, componentName);
  if (!contract) return [];
  const sourceFile = createSourceFile(tsxPath);
  const classNode = getComponentClass(sourceFile);
  const file = relativeToRepo(tsxPath);
  const out = [];
  const add = (code, node, message) =>
    out.push(finding({ severity: severityOf(code), code, file, line: node ? getLineNumber(sourceFile, node) : undefined, message }));

  if (!contract.shadow) {
    add('STENCIL-SHADOW-REQUIRED', classNode, '`@Component` must enable shadow DOM (`shadow: true` or `shadow: { … }`).');
  }

  const methodNames = new Set(classNode.members.map(getMemberName).filter(Boolean));
  const classText = classNode.getText(sourceFile);

  if (contract.formAssociated) {
    const isSubmitter = /\binternals\.form\?*\.requestSubmit\(/.test(classText);
    const required = ['formResetCallback', 'formDisabledCallback', ...(isSubmitter ? [] : ['formStateRestoreCallback'])];
    const missing = required.filter(n => !methodNames.has(n));
    if (missing.length) {
      add('STENCIL-FORM-CALLBACKS', classNode, `Form-associated component lacks ${missing.join(', ')}.`);
    }
    for (const prop of contract.props) {
      // An unannotated `@Prop() clearable = true` has type null and is still boolean.
      if ((prop.type === 'boolean' || prop.type === null) && prop.default === 'true') {
        const member = classNode.members.find(m => getMemberName(m) === prop.name);
        add('STENCIL-FORM-BOOLEAN-DEFAULT-TRUE', member,
          `Boolean prop \`${prop.name}\` defaults to true on a form-associated component; the attribute "false" parses as true here, so it cannot be turned off from HTML.`);
      }
    }
  }

  let highest = -1;
  let reported = false;
  for (const member of classNode.members) {
    const group = memberGroup(member);
    if (!group) continue;
    const rank = GROUP_ORDER.indexOf(group);
    if (rank < highest && !reported) {
      add('STENCIL-MEMBER-ORDER', member, `\`${getMemberName(member)}\` (${group}) is declared after a later member group; order is ${GROUP_ORDER.join(' → ')}.`);
      reported = true;
    }
    highest = Math.max(highest, rank);
  }

  for (const member of classNode.members) {
    const watch = getDecorators(member).filter(d => getDecoratorName(d) === 'Watch');
    if (!watch.length || !ts.isMethodDeclaration(member) || !member.body) continue;
    if (member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
      add('STENCIL-WATCH-ASYNC', member, `@Watch method \`${getMemberName(member)}\` is async.`);
    }
    const watched = new Set(watch.map(d => d.expression.arguments?.[0]).filter(a => a && ts.isStringLiteral(a)).map(a => a.text));
    const isThisWatched = target =>
      ts.isPropertyAccessExpression(target) &&
      target.expression.kind === ts.SyntaxKind.ThisKeyword &&
      watched.has(target.name.text);
    walk(member.body, node => {
      let target = null;
      let plainLiteralAssign = false;
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      ) {
        target = node.left;
        plainLiteralAssign = node.operatorToken.kind === ts.SyntaxKind.EqualsToken && isLiteral(node.right);
      } else if (
        (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
        (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
      ) {
        target = node.operand;
      }
      if (!target || !isThisWatched(target)) return;
      if (plainLiteralAssign && isInsideIf(node, member.body)) return; // validation fallback (Decision 2)
      add('STENCIL-WATCH-WRITES-WATCHED', node, `@Watch method writes the watched prop \`${target.name.text}\` outside a validation fallback.`);
    });
  }

  walk(classNode, node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (node.expression.name.text !== 'map') return;
    const fn = node.arguments[0];
    if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) return;
    if (jsxRootLacksKey(fn.body)) add('STENCIL-MAP-KEY', node, 'JSX element returned from `.map()` has no `key`.');
  });

  return out;
}

async function main() {
  const args = parseAuditArgs({ toolName: TOOL, usage: USAGE });
  const t0 = Date.now();
  const targets = args.all
    ? listAllComponents().map(c => resolveComponentPaths(c.name))
    : [resolveComponentPaths(args.component)];
  const findings = [];
  for (const target of targets) {
    if (!target.found || !target.exists.tsx) continue;
    findings.push(...checkSource(target.paths.tsx, target.name));
  }
  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : targets[0]?.name ?? null,
    findings,
    meta: { durationMs: Date.now() - t0, componentsScanned: targets.length, rulesEvaluated: RULES.length },
  });
  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL };
```

Before relying on `target.paths.tsx` / `target.exists.tsx` / `target.found`, confirm the shape at `scripts/audit/lib/component-paths.mjs:70` (`resolveComponentPaths`); script 02 reads the same fields at `02-stencil-antipatterns.mjs:555-559`.

- [x] **Step 4: Run the spec to verify it passes**

Run: `node --test scripts/__tests__/audit/16-stencil-contract.spec.mjs`
Expected: PASS, 7 tests.

- [x] **Step 5: Register in `run-all.mjs`** — add after the `14` entry and list `16 stencil-contract` in the Wave A line of the header comment:

```js
  {
    id: '16',
    wave: 'A',
    file: '16-stencil-contract.mjs',
    name: 'stencil-contract',
    perComponent: true,
    requiresBuild: false,
  },
```

Add `16 stencil-contract` to the USAGE "Script ids" block (`:79-81`). In `scripts/__tests__/audit/run-all.spec.mjs:28-30` change the expected Wave A count from 7 to 8.

Run: `node --test scripts/__tests__/audit/run-all.spec.mjs` → PASS; `node scripts/audit/run-all.mjs mud-button --only 16 --json | head -20` → envelope containing `stencil-contract`.

- [x] **Step 6: Measure on the real components (tolerance 0 false positives)**

```bash
node scripts/audit/16-stencil-contract.mjs --all --json > /tmp/s16.json; echo "exit $?"
node -e "const j=require('/tmp/s16.json');const c={};for(const f of j.findings)(c[f.code]??=[]).push(f.file+':'+f.line);for(const [k,v] of Object.entries(c))console.log(k,v.length,'\n  '+v.join('\n  '))"
```

Expected: exit 1, counts matching § Measured (MEMBER-ORDER 20, MAP-KEY 10, FORM-BOOLEAN-DEFAULT-TRUE 5,
WATCH-ASYNC 3, WATCH-WRITES-WATCHED 1 on `18c3aae`; the compound-assignment extension may add hits —
open each). `STENCIL-FORM-BOOLEAN-DEFAULT-TRUE` lists exactly the five props in Decision 5.
`STENCIL-FORM-CALLBACKS` must NOT list `mud-button` or `mud-service-button`.
`STENCIL-WATCH-WRITES-WATCHED` lists `mud-pagination.tsx:163` (a computed clamp — a real violation
under Decision 2, stays reported) and none of the literal validation fallbacks. Judge MEMBER-ORDER hits
against `src/components/_agents/component-structure.md:35-46` and MAP-KEY hits against its rule (any
JSX element returned from a `.map()` callback without `key`). Open every hit: a real violation stays
reported; a false positive is a classifier bug — add a spec case for it and fix before committing.
Record the per-code counts
under "Measured".

- [x] **Step 7: Commit**

```bash
node --test "scripts/__tests__/**/*.spec.mjs"
npx prettier --write scripts/audit/16-stencil-contract.mjs scripts/__tests__/audit/16-stencil-contract.spec.mjs scripts/audit/run-all.mjs scripts/__tests__/audit/run-all.spec.mjs package.json
yarn lint
git add scripts/audit/16-stencil-contract.mjs scripts/__tests__/audit/16-stencil-contract.spec.mjs scripts/audit/run-all.mjs scripts/__tests__/audit/run-all.spec.mjs package.json
git commit -m "feat(audit): add a parser-based Stencil contract check"
```

### Task 1.3: Enable the decided lint rules

**Files:**
- Modify: `eslint.config.mjs` (`:47-57`)
- Modify: `.stylelintrc.json`
- Modify: `src/components/mud-badge/mud-badge.tsx:83`, `mud-separator/mud-separator.tsx:21`, `mud-stepper/mud-stepper.tsx:108`, `mud-table/mud-table.tsx:139`, `mud-tooltip/mud-tooltip.tsx:162` (`@Element()` type only)
- Modify: `src/components/mud-service-button/mud-service-button.css:87-88`, `src/components/mud-accordion-item/mud-accordion-item.css:110` (disable comments only)
- Modify: `scripts/audit/02-stencil-antipatterns.mjs` (delete superseded entries)
- Modify: `scripts/__tests__/audit/02-stencil-antipatterns.spec.mjs` (`:32,39,46` required-code list; `:94-103` (003) and `:223-235` (`!important`, `transition: all`) detection tests for the deleted codes)

**Interfaces:**
- Produces: enabled rule IDs `@stencil/async-methods`, `@stencil/element-type`, `@stencil/render-returns-host`, `@stencil/single-export`, `@stencil/props-must-be-public`, `@stencil/methods-must-be-public`, `declaration-no-important`, `declaration-property-value-disallowed-list`. Task 2.3 cites exactly these as `eslint:`/`stylelint:` cells; Task 3.2 loads the configs.

- [x] **Step 1: Gate.** Re-run Task 0.1 Steps 1-2. Any count different from § Measured → STOP and return to Dan (Decision 3).

- [x] **Step 2: Fix the five `@Element()` types.** For each file, set the declared type to the component's own element interface, e.g. in `mud-badge.tsx:83`:

```ts
  @Element() host!: HTMLMudBadgeElement;
```

(`HTMLMudSeparatorElement`, `HTMLMudStepperElement`, `HTMLMudTableElement`, `HTMLMudTooltipElement` for the others; the interfaces are generated in `src/components.d.ts`.) Where the class then uses a member the narrower type does not declare, keep the type and fix the usage, not the rule. Run `yarn typecheck` → exit 0.

- [x] **Step 3: Enable the ESLint rules** in the `rules` block, next to `no-unused-watch`:

```js
      '@stencil/async-methods': 'error',
      '@stencil/element-type': 'error',
      '@stencil/render-returns-host': 'error',
      '@stencil/single-export': 'error',
      '@stencil/props-must-be-public': 'error',
      '@stencil/methods-must-be-public': 'error',
      // reserved-member-names stays off: 35 public @Prop names would need breaking renames (#88).
```

Update the comment above the block (`:47-49`), which says only `no-unused-watch` is enabled.

- [x] **Step 4: Enable the stylelint rules** in `.stylelintrc.json` `rules`:

```json
    "declaration-no-important": true,
    "declaration-property-value-disallowed-list": {
      "transition": ["/\\ball\\b/"],
      "transition-property": ["all"]
    },
```

and put `/* stylelint-disable-next-line declaration-no-important */` directly above each of the three declarations (`mud-service-button.css:87`, `:88`, `mud-accordion-item.css:110`), keeping their existing explanatory comments.

- [x] **Step 5: Delete the superseded script 02 entries** `ANTIPATTERN-IMPORTANT`, `ANTIPATTERN-018-TRANSITION-ALL` (stylelint now covers `src/**/*.css`) and `ANTIPATTERN-003-METHOD-NON-ASYNC` (`@stencil/async-methods` now covers it; the compiler alone only warns, for `void` returns: `compiler/stencil.js:280060-280063`). In `02-stencil-antipatterns.spec.mjs` remove the three codes from the required list and delete the detection tests of all three (`:94-103` for 003; `:223-235` for `!important` and `transition: all`).

- [x] **Step 6: Verify and commit**

```bash
npx prettier --write eslint.config.mjs .stylelintrc.json scripts/audit/02-stencil-antipatterns.mjs scripts/__tests__/audit/02-stencil-antipatterns.spec.mjs src/components/mud-service-button/mud-service-button.css src/components/mud-accordion-item/mud-accordion-item.css src/components/mud-badge/mud-badge.tsx src/components/mud-separator/mud-separator.tsx src/components/mud-stepper/mud-stepper.tsx src/components/mud-table/mud-table.tsx src/components/mud-tooltip/mud-tooltip.tsx
yarn typecheck && yarn lint && node scripts/audit/__tests__/02-antipatterns.test.mjs && node --test "scripts/__tests__/**/*.spec.mjs"
git add eslint.config.mjs .stylelintrc.json scripts/audit/02-stencil-antipatterns.mjs scripts/__tests__/audit/02-stencil-antipatterns.spec.mjs src/components/mud-service-button/mud-service-button.css src/components/mud-accordion-item/mud-accordion-item.css src/components/mud-badge/mud-badge.tsx src/components/mud-separator/mud-separator.tsx src/components/mud-stepper/mud-stepper.tsx src/components/mud-table/mud-table.tsx src/components/mud-tooltip/mud-tooltip.tsx
git commit -m "build(lint): enable the measured Stencil and stylelint rules"
```

If `yarn build` regenerates `src/components.d.ts` or a component `readme.md` from these edits, stage those by name in the same commit (`.husky/pre-push` refuses a stale copy).

---

## Phase 2 — Canonical docs and the skill

**Executor**: Tasks 2.1–2.3 Opus 5 · medium · wave C · inline; Task 2.4 Sonnet 5 · medium · wave D · subagent `implementer`

Every edit in this phase is graded twice: by the Phase 3 guards, and by the acceptance-bar rows 6-7.
Codes cited must be exactly the `code` strings in `02-stencil-antipatterns.mjs` and `RULES` in
`16-stencil-contract.mjs` as they stand after Phase 1.

### Task 2.1: Canonical project docs

**Files:**
- Modify: `src/components/_agents/component-structure.md` (`### @Watch Rule`, `:48-72`)
- Modify: `src/components/AGENTS.md` (`## Stencil Compliance — Stencil 4.x`, `:84-100`)
- Modify: `_agents/anti-patterns.md` (item 26, `:32`)

- [x] **Step 1: Rewrite `### @Watch Rule`** to Decision 2. Keep the two existing examples, add a third "✅ ALLOWED — validation fallback" using the `mud-radio.tsx:134-143` shape, and state: "Enforced by `yarn audit:stencil-contract` (`STENCIL-WATCH-ASYNC`, `STENCIL-WATCH-WRITES-WATCHED`)." The old "Allowed only for syncing native DOM properties" sentence is removed.

- [x] **Step 2: Replace the Top-10 list** in `src/components/AGENTS.md` with three lines: the skill link, "Run `yarn audit:antipatterns <component>` and `yarn audit:stencil-contract <component>` first; the skill says what remains for judgment", and the heading renamed to `## Stencil Compliance`. Delete "14 areas" and "Stencil 4.x".

- [x] **Step 3: Item 26 in `_agents/anti-patterns.md`:** keep the rule text, append "Detected by `ANTIPATTERN-002-HOST-CLASSLIST`." Do not renumber the list (other docs cite item numbers; codes are the stable handle going forward).

- [x] **Step 4: Verify and commit**

```bash
grep -n "shadow: true\|14 areas\|Stencil 4.x" src/components/AGENTS.md   # → no output
node scripts/docs/check-ai-docs.mjs; node --test "scripts/__tests__/**/*.spec.mjs"
git add src/components/_agents/component-structure.md src/components/AGENTS.md _agents/anti-patterns.md
git commit -m "docs(agents): relax the @Watch rule and point component docs at the audit scripts"
```

### Task 2.2: `SKILL.md` as a run procedure

**Files:**
- Modify: `.claude/skills/stencil-compliance/SKILL.md` (full rewrite, currently 170 lines)

**Interfaces:**
- Produces: the section names Task 2.4 links to — `## Run contract`, `## Rule index`, `## Failure modes`, `## Self-check`, `## Out of scope`; the `enforced-by` cell grammar used in every rule table of the skill: exactly one of `compiler`, `tsc`, `eslint:<rule id>` (e.g. `eslint:@stencil/single-export`), `stylelint:<rule id>` (e.g. `stylelint:declaration-no-important`), `script-02:<code>`, `script-14`, `script-16:<code>`, `manual`, written in backticks. Task 3.2 parses `eslint:` and `stylelint:` cells.

- [x] **Step 1: Frontmatter `description`** — keep the trigger, add NOT clauses: "NOT `audit-component` (that is the whole production audit and calls this skill for Stencil rules). NOT `token-creation` (token and colour rules). NOT `accessibility-compliance` (WCAG)."

- [x] **Step 2: `## Run contract`** — input: one component name. Steps, in order:
  1. `node scripts/audit/run-all.mjs <component> --only 02,14,16 --json --out <scratch>/stencil.json`
  2. Read the envelope; quote each script's `summary` counts in the report — a report without them did not run step 1.
  3. `yarn lint` scoped output for the component's files, when the change touched TSX/CSS; for a form-associated component (`grep -l "formAssociated: true" <component tsx>` matches — the combined `run-all` envelope does not carry the contract), also `node --test scripts/__tests__/form-associated-contract.spec.mjs`.
  4. Judge only the `manual` rows of the rule index against the component source.
  5. Report: script findings grouped by code, then manual findings as `file:line — rule id — why`, then "not checked" with reasons.

- [x] **Step 3: `## Rule index`** — written in Task 2.3 Step 3 (after the references settle which rules survive); here add the heading and one sentence pointing at it. The table: one table, columns `Area | Rule | enforced-by | Code or reference`, one row per rule kept in the references after Task 2.3. Only `manual` rows carry a reference link. No "Key rule count" column (D8).

- [x] **Step 4: `## Failure modes`** — rows: reading a tool error as "0 results" (the old `rg` lookahead lines); applying an old-prefix name (`cor*`); treating `shadow: { delegatesFocus: true }` as a violation; demanding `formStateRestoreCallback` on a submitter; citing an anti-pattern by number instead of code; judging from memory without step 1's envelope.

- [x] **Step 5: `## Self-check`** — checklist: envelope counts quoted; every finding carries a code or a `manual` rule id; no rule judged that has an automated `enforced-by`.

- [x] **Step 6: `## Out of scope`** — hydrate/SSR output targets and declarative shadow DOM (the project builds no hydrate output: `stencil.config.ts`), slot fixes for `scoped` components (every component uses shadow DOM), testing (see `TESTING.md`), tokens, Figma, WCAG, Storybook configuration.

- [x] **Step 7: Delete** the Top-10 table, §3 grep commands, the "Key rule count" column, `yarn build` before commit (use "the narrowest check: `yarn lint`, `yarn test`"), and every Romanian word (`reflectarea`, `cu`, `decoratori`).

- [x] **Step 8: Verify and commit**

```bash
grep -nE "\(\?[!=<]|\bcor[A-Z]|\bCor[A-Z]|HTMLCor|reflectarea|decoratori|Key rule count" .claude/skills/stencil-compliance/SKILL.md   # → no output
node scripts/docs/check-ai-docs.mjs
git add .claude/skills/stencil-compliance/SKILL.md
git commit -m "docs(skills): turn stencil-compliance into a script-first run procedure"
```

### Task 2.3: References rewrite and `version-delta.md`

**Files:**
- Modify: `.claude/skills/stencil-compliance/references/decorators.md`, `lifecycle-host.md`, `jsx-styling.md`, `form-reactivity.md`, `functional-api.md`, `anti-patterns.md`
- Create: `.claude/skills/stencil-compliance/references/version-delta.md`

**Interfaces:**
- Consumes: Task 0.2 results; `RULES` codes; `ruleScope` from Task 1.1.
- Produces: `version-delta.md` with a heading `## Stencil 4.45` (exactly `## Stencil <major>.<minor>` of the pin — Task 3.2 asserts it) and an API table in `functional-api.md` under `### Public API` whose first column holds each exported name in backticks (Task 3.2 parses it).

- [x] **Step 1: Per-file edits** (each row is a required edit; every `enforced-by` value below is written in the cell grammar Task 2.2 defines, e.g. `eslint:@stencil/single-export`, `script-02:ANTIPATTERN-025-EVENT-PREFIX`):

| File | Edit |
| --- | --- |
| all six | Every `@Component` example uses `shadow: { delegatesFocus: true }` or `shadow: true` with a note that both are accepted; every `mud-input` becomes `mud-text-input` (check each name exists: `ls -d src/components/<name>`). Drop the per-file "Aligned with Stencil 4.x" header line (the version lives only in `version-delta.md`). Add `enforced-by` to each rule table. Replace every lookaround grep (`SKILL.md` done in 2.2; here `decorators.md:26,76,188,190,262`, `lifecycle-host.md:185`, `jsx-styling.md:24`, `anti-patterns.md:57,75,485,509,510,518`) with the rule's code or `manual`. Rename every `cor*`/`Cor*`/`HTMLCor*`/`onCor*` name to its `mud`/`Mud` form. English only |
| `decorators.md` | Q1/C3: shadow accepts `true` or an options object. P8 → form-associated only (Decision 5), `script-16:STENCIL-FORM-BOOLEAN-DEFAULT-TRUE`. `@Watch` section and "Member Order" section → one line each linking `src/components/_agents/component-structure.md`. L3 (passive) → `compiler`. `!` rules → `tsc`. E1 → `mud` prefix, `script-02:ANTIPATTERN-025-EVENT-PREFIX`. `@Method` async → `eslint:@stencil/async-methods`. `@Element` type → `eslint:@stencil/element-type`. Reserved member names → `manual`, citing #88 |
| `lifecycle-host.md` | EL6/#16 per Task 0.2 Step 2 (rewrite to the measured behaviour, or delete). "Anti-Pattern #26" → `ANTIPATTERN-002-HOST-CLASSLIST` |
| `jsx-styling.md` | Delete the invalid top-level `::slotted(*), > *` selector; link `_agents/shadow-dom-patterns.md` for dual selectors. `transition: all` → `stylelint:declaration-property-value-disallowed-list`; `!important` → `stylelint:declaration-no-important` (a load-bearing exception carries a disable comment with its reason). `:host` display → `script-02:ANTIPATTERN-HOST-DISPLAY` |
| `form-reactivity.md` | Replace the component list with: "Form-associated components: `grep -rl 'formAssociated: true' src/components --include='*.tsx'`". Q8 → submitters (call `internals.form?.requestSubmit()`) need no `formStateRestoreCallback`, `script-16:STENCIL-FORM-CALLBACKS`. Fix `formDisabledCallback` example to set a `@State` (not the `disabled` prop); `formResetCallback` resets to the declared default. Add the boolean `"false"` parsing fact with `internal/client/index.js:2352`. SE3/SE6/SE9 per Task 0.2 Step 1 (corrected with a runtime citation, or deleted). Note `@PropSerialize`/`@AttrDeserialize` arrived in 4.38 and are unused here. `setValidity` flags+message → `manual` |
| `functional-api.md` | Delete `### Testing utilities` (link `TESTING.md`). FC9 → "a component file exports only its class", `eslint:@stencil/single-export`. Replace the API list with `### Public API`: one row per name exported by `node_modules/@stencil/core/internal/stencil-core/index.d.ts` (`export { … }` and `export type { … }`), columns `Name | Kind | Use here`. Delete "getElement is legacy". `jsx`/`jsxs` → one sentence: automatic JSX runtime entry `@stencil/core/jsx-runtime`, not used by this project's `h` pragma |
| `anti-patterns.md` | Keep only `ruleScope: 'stencil'` rules, each headed by its code (`## ANTIPATTERN-002-HOST-CLASSLIST — …`). Project rules (`019`, `020`, `021`, RAW-PIXELS, TS-ANY, …) → one line linking `_agents/anti-patterns.md` and `token-creation`. `#12` fix without `<Host style-…>`. Identical ❌/✅ "method reference" pair → fix or delete. `.eslintrc.js` → `eslint.config.mjs`. Delete "Quick Grep Reference" |

- [x] **Step 1b: Fill `SKILL.md` `## Rule index`** (Task 2.2 Step 3's table) from the references as edited in Step 1: one row per rule that survived, `enforced-by` in the Task 2.2 grammar.

- [x] **Step 2: Write `version-delta.md`** with these sections, each fact carrying its source:

```markdown
# Stencil version delta

Pinned: `@stencil/core` `~4.45.0` (`package.json`). Re-check on every upgrade:
`npm view @stencil/core@<new> dist.tarball` → read `CHANGELOG.md` between the old and new versions;
stenciljs.com documents 4.43 as its default version.

## Stencil 4.45

- 4.37: `Mixin()` and class inheritance (`/docs/extends`); watchers fire earlier (breaking). Not adopted here.
- 4.38: `@PropSerialize` / `@AttrDeserialize`. Unused here.
- 4.41.3: form-associated components get `name`, `form`, `disabled` in their JSX typings when not declared as props — typing only (`compiler/stencil.js:277363,277406`).
- Form-associated boolean props: the attribute string `"false"` parses as `true` (`internal/client/index.js:2352-2353`). Default boolean props to `false` there.
- Local Yarn patch `.yarn/patches/@stencil-core-npm-4.45.0-053ef963ac.patch` adds `OneOf3` required-prop typing for JSX `attr:`/`prop:` prefixes. Re-create it on upgrade; the skill parity spec fails if it stops applying.

## Watch

- Stencil 5 is in beta with no migration guide. Re-read when a 5.0.0 stable ships.
```

- [x] **Step 3: Verify and commit**

```bash
grep -rnE "\(\?[!=<]|\bcor[A-Z]|\bCor[A-Z]|HTMLCor|mud-(input|toggle|radio-button|combobox)([^-a-z]|$)|\.eslintrc|reflectarea|Cu Fix" .claude/skills/stencil-compliance   # → no output
node scripts/docs/check-ai-docs.mjs; node --test "scripts/__tests__/**/*.spec.mjs"
git add .claude/skills/stencil-compliance/references .claude/skills/stencil-compliance/SKILL.md
git commit -m "docs(skills): correct the stencil-compliance references for Stencil 4.45"
```

### Task 2.4: Consumer docs

**Files:**
- Modify: `.claude/skills/audit-component/SKILL.md` (`:26`, `:57`, `:74-75`, `:224`, `:355-358`, `:374`)
- Modify: `.claude/skills/audit-component/references/wave-2-static-analysis.md`
- Modify: `.claude/commands/pre-pr-check.md`, `.claude/commands/audit-component.md`, `.claude/agents/audit-production.md`
- Modify: `.claude/skills/optimize-prompt/references/canonical-defaults.md`, `output-templates.md`, `must-enforce-checklist.md` (anti-pattern number citations)

- [x] **Step 1: Locate every consumer claim** to change:

```bash
grep -rnE "stencil-compliance|14 (sections|areas)|Anti-Pattern #|anti-patterns\.md#|Top-10|top-25|full rule pass|ANTIPATTERN-(003|018)-|ANTIPATTERN-IMPORTANT|20 patterns" .claude/skills .claude/commands .claude/agents CLAUDE.md .claude/skills/LOCAL-SETUP.md | grep -v "^.claude/skills/stencil-compliance/"
```

Known hits to expect: `CLAUDE.md:18` ("Stencil 4.x rules across 14 areas"), `.claude/skills/LOCAL-SETUP.md:81` ("6 reference files + top-25 anti-patterns"), `.claude/skills/audit-component/SKILL.md:224-231` ("20 patterns", citing the codes deleted in Task 1.3), `.claude/skills/audit-component/references/report-template.md:100` ("(14 sections)"). `.claude/commands/audit-accessibility.md` only names the skill — no edit. The "12 patterns" in `.claude/commands/optimize-prompt.md:61` and `.claude/skills/optimize-prompt/SKILL.md:97` count the contradiction detector, not anti-patterns — out of scope, no edit.

- [x] **Step 2: Apply**: `--deep` runs the skill's `## Run contract` (not "a pass through 14 sections"); citations of the stencil-compliance skill's own anti-pattern numbers become codes, while citations of `_agents/anti-patterns.md` item numbers stay (that list keeps its numbering, Task 2.1 Step 3) and gain a code only where one exists (item 26 → `ANTIPATTERN-002-HOST-CLASSLIST`; item 12 has none); "14 sections/areas" and fixed pattern/file counts are deleted (not replaced with new counts); citations of the three codes deleted in Task 1.3 become their lint rule ids. No other edits.

- [x] **Step 3: Verify and commit**

```bash
grep -rnE "14 (sections|areas)|20 patterns|stencil-compliance/references/anti-patterns\.md#[0-9]" .claude/skills .claude/commands .claude/agents CLAUDE.md   # → no output
node scripts/docs/check-ai-docs.mjs
git add .claude/skills/audit-component .claude/commands/pre-pr-check.md .claude/commands/audit-component.md .claude/agents/audit-production.md .claude/skills/optimize-prompt/references CLAUDE.md .claude/skills/LOCAL-SETUP.md
git commit -m "docs(agents): point audit consumers at the stencil-compliance run contract"
```

---

## Phase 3 — Guards

**Executor**: Task 3.1 Opus 5 · medium · wave E · inline (sweep renames: subagent `mechanical-worker`, Haiku 4.5); Task 3.2 Opus 5 · medium · wave F · inline

### Task 3.1: Docs checker rules `stale-prefix`, `lookaround`, `stencil-version`

**Files:**
- Modify: `scripts/docs/check-ai-docs.mjs` (header rule list `:13-40`, new rule sections before `// Rule: package-name`, wiring in `checkAiDocs` `:748-790`)
- Test: `scripts/__tests__/check-ai-docs.spec.mjs`
- Modify: every doc-scope file the new rules report (sweep)

**Interfaces:**
- Consumes: `isDocScope`, `isNodeVersionScope`, `findCodeSpans`, `makeHit`, `dependencyMajor`-style reading of `pkg`.
- Produces: rule IDs `stale-prefix`, `lookaround`, `stencil-version`.

- [x] **Step 1: Write the failing specs** (append to `check-ai-docs.spec.mjs`, reusing its `makeFixture`/`pkgJson`):

```js
describe('stale-prefix rule', () => {
  it('flags every spelling of the retired prefix in doc scope', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/x.md': 'Emit `corChange`.\n\nExtends `CorInput`.\n\nType `HTMLCorButtonElement`.\n\nJSX `onCorToggle`.\n\nCorlab is the vendor.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.file, h.line, h.ruleId]),
      [
        ['_agents/x.md', 1, 'stale-prefix'],
        ['_agents/x.md', 3, 'stale-prefix'],
        ['_agents/x.md', 5, 'stale-prefix'],
        ['_agents/x.md', 7, 'stale-prefix'],
      ],
    );
  });

  it('ignores plans', () => {
    const root = makeFixture({ 'package.json': pkgJson(), '.claude/plans/p.md': 'Grep for `corChange`.\n' });
    assert.deepEqual(checkAiDocs({ root }), []);
  });
});

describe('lookaround rule', () => {
  it('flags a lookaround inside a code span unless the span enables PCRE2', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '_agents/x.md': [
        '| Q2 | Grep `@Method\\(\\)\\s+(?!async)` |',
        '`rg "foo(?=bar)"`',
        '`rg --pcre2 "foo(?!bar)"`',
        '`rg -P "(?<!a)b"`',
        '`rg "(?<name>ab)c"`',
        'Prose (?!x) outside code.',
      ].join('\n') + '\n',
    });
    assert.deepEqual(
      checkAiDocs({ root }).map(h => [h.line, h.ruleId]),
      [[1, 'lookaround'], [2, 'lookaround']],
    );
  });
});

describe('stencil-version rule', () => {
  const pkg = () => JSON.stringify({ name: '@acme/widgets', engines: { node: '>=24.0.0 <25.0.0' }, devDependencies: { '@stencil/core': '~4.45.0' } });

  it('flags a Stencil version claim that differs from the pinned major.minor', () => {
    const root = makeFixture({
      'package.json': pkg(),
      '_agents/x.md': 'Built for Stencil 4.x.\n\nNeeds Stencil 4.46.\n\nStencil 4.45 is pinned.\n\nStencil 5 is in beta.\n\nStencil 4.38 added serializers.\n\nThe Stencil 4 harness was retired.\n',
    });
    assert.deepEqual(checkAiDocs({ root }).map(h => [h.line, h.ruleId]), [[1, 'stencil-version'], [3, 'stencil-version']]);
  });
});
```

The rule flags, for the pinned major only, the vague `4.x` form and a minor above the pin. A
different major ("Stencil 5 is in beta"), a lower minor ("Stencil 4.38 added …") and a bare major
("the Stencil 4 harness") are forward or history references and pass.

Run: `node --test scripts/__tests__/check-ai-docs.spec.mjs` → FAIL on the three new describes.

- [x] **Step 2: Implement**

```js
// ---------------------------------------------------------------------------
// Rule: stale-prefix
// ---------------------------------------------------------------------------

// The component prefix was renamed; a `cor`-prefixed identifier in agent docs is stale.
// `src/legacy` still defines `Cor*` classes; agent docs do not document it.
// `Corlab` (lowercase after the prefix) is the vendor name and does not match.
const STALE_PREFIX = /\b(?:on)?[Cc]or[A-Z]|HTMLCor[A-Z]/g;

function checkStalePrefix(relPath, lines) {
  const hits = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(STALE_PREFIX)) {
      hits.push(makeHit(relPath, i + 1, 'stale-prefix', `retired component prefix in \`${m[0]}…\`; use the mud prefix`));
      break;
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------
// Rule: lookaround
// ---------------------------------------------------------------------------

// ripgrep's default engine rejects lookahead/lookbehind ("regex parse error"),
// and the Grep tool is ripgrep-backed. Named groups `(?<name>` are supported.
const LOOKAROUND = /\(\?(?:[=!]|<[=!])/;
const PCRE2_FLAG = /(?:^|\s)(?:--pcre2|-P)(?:\s|$)/;

function checkLookaround(relPath, lines) {
  const hits = [];
  let inFence = false;
  let fenceHasPcre = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      fenceHasPcre = false;
      return;
    }
    if (inFence) {
      if (PCRE2_FLAG.test(line)) fenceHasPcre = true;
      if (LOOKAROUND.test(line) && !fenceHasPcre && !PCRE2_FLAG.test(line)) {
        hits.push(makeHit(relPath, i + 1, 'lookaround', 'lookaround needs `--pcre2`; ripgrep rejects it'));
      }
      return;
    }
    for (const span of findCodeSpans(line)) {
      if (LOOKAROUND.test(span.content) && !PCRE2_FLAG.test(span.content)) {
        hits.push(makeHit(relPath, i + 1, 'lookaround', 'lookaround needs `--pcre2`; ripgrep rejects it'));
        break;
      }
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------
// Rule: stencil-version
// ---------------------------------------------------------------------------

const STENCIL_CLAIM = /\bStencil\s+v?(\d+)(?:\.(\d+|x))?/gi;

function pinnedMajorMinor(pkg, name) {
  const range = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
  const m = typeof range === 'string' ? range.match(/(\d+)\.(\d+)/) : null;
  return m ? { major: Number(m[1]), minor: Number(m[2]) } : null;
}

function checkStencilVersion(relPath, lines, pin) {
  const hits = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^(```|~~~)/.test(line.trim())) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    for (const m of line.matchAll(STENCIL_CLAIM)) {
      if (Number(m[1]) !== pin.major) continue; // another major is a forward or history reference
      // `4.x` is a vague claim; a minor above the pin claims an API this repo does not have.
      // A lower minor ("Stencil 4.38 added …") and a bare major are history, not claims.
      if (m[2] === 'x' || (m[2] !== undefined && Number(m[2]) > pin.minor)) {
        hits.push(makeHit(relPath, i + 1, 'stencil-version', `Stencil ${m[0].replace(/^Stencil\s+/i, '')} claim does not match pinned ${pin.major}.${pin.minor}`));
        break;
      }
    }
  });
  return hits;
}
```

Wire into `checkAiDocs`:

```js
  const stencilPin = pinnedMajorMinor(pkg, '@stencil/core');
  // … inside the loop:
    if (needsDocScope && relPath.endsWith('.md')) hits.push(...checkStalePrefix(relPath, lines));
    if (needsDocScope && relPath.endsWith('.md')) hits.push(...checkLookaround(relPath, lines));
    if (needsNodeVersion && stencilPin) hits.push(...checkStencilVersion(relPath, lines, stencilPin));
```

Add the three rules to the header list (`:13-40`). Run: `node --test scripts/__tests__/check-ai-docs.spec.mjs` → PASS.


- [x] **Step 3: Sweep the repo**

```bash
node scripts/docs/check-ai-docs.mjs | grep -E "\[(stale-prefix|lookaround|stencil-version)\]" > /tmp/sweep.txt; wc -l < /tmp/sweep.txt
```

Each `stale-prefix` hit is a mechanical rename (`corX`→`mudX`, `CorX`→`MudX`, `HTMLCorX`→`HTMLMudX`,
`onCorX`→`onMudX`), applied line by line from `/tmp/sweep.txt`; each rename is checked to name a real
identifier where one exists (`grep -rn "<new name>" src/components`), and a line whose new name does
not exist gets the real name instead (e.g. `CorInput` → `MudTextInput`, `CorSelectInput` → `MudSelect`). A name with no component at all (on `18c3aae`: `CorCard`, `CorNotification`, `CorProgressTracker` in `.claude/skills/mud-design/SKILL.md`) is not renamed: its catalog row is deleted, and each deletion is listed in the commit body. The worker applies only the rename list the controller writes; existence checks and deletions stay with the controller. `lookaround` and
`stencil-version` hits outside the skill are edited by hand. Re-run until the checker prints
`check-ai-docs: clean`.

- [x] **Step 4: Verify and commit**

```bash
npx prettier --write scripts/docs/check-ai-docs.mjs scripts/__tests__/check-ai-docs.spec.mjs
yarn lint && node scripts/docs/check-ai-docs.mjs && node --test "scripts/__tests__/**/*.spec.mjs"
git add scripts/docs/check-ai-docs.mjs scripts/__tests__/check-ai-docs.spec.mjs <each swept file by name, from /tmp/sweep.txt>
git commit -m "feat(docs): fail the docs checker on retired prefixes, lookaround greps and stale Stencil versions"
```

### Task 3.2: Skill parity spec

**Files:**
- Create: `scripts/__tests__/stencil-compliance-skill.spec.mjs`

**Interfaces:**
- Consumes: `PATTERNS`, `FILE_CHECKS` (with `ruleScope`) from `02-stencil-antipatterns.mjs`; `RULES` from `16-stencil-contract.mjs`; `version-delta.md` heading; `functional-api.md` `### Public API` table; `eslint.config.mjs`; `.stylelintrc.json`.

- [x] **Step 1: Write the spec**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { ESLint } from 'eslint';

import { PATTERNS, FILE_CHECKS } from '../audit/02-stencil-antipatterns.mjs';
import { RULES } from '../audit/16-stencil-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SKILL = path.join(ROOT, '.claude/skills/stencil-compliance');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const skillText = () =>
  [path.join(SKILL, 'SKILL.md'), ...fs.readdirSync(path.join(SKILL, 'references')).map(f => path.join(SKILL, 'references', f))]
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\n');

const registry = [...PATTERNS, ...FILE_CHECKS, ...RULES];
const CODE = /\b(?:ANTIPATTERN|STENCIL)-[A-Z0-9-]+\b/g;

describe('stencil-compliance skill ↔ scripts', () => {
  it('every code the skill cites exists in a registry', () => {
    const known = new Set(registry.map(r => r.code));
    const cited = new Set(skillText().match(CODE) ?? []);
    assert.deepEqual([...cited].filter(c => !known.has(c)).sort(), []);
  });

  it('every stencil-scoped registry code is cited by the skill', () => {
    const cited = new Set(skillText().match(CODE) ?? []);
    const missing = registry.filter(r => r.ruleScope === 'stencil' && !cited.has(r.code)).map(r => r.code);
    assert.deepEqual(missing.sort(), []);
  });

  it('every eslint:/stylelint: enforced-by cell names a rule that is enabled', async () => {
    const text = skillText();
    const eslintRules = [...text.matchAll(/`eslint:(@?[\w/-]+)`/g)].map(m => m[1]);
    const styleRules = [...text.matchAll(/`stylelint:([\w-]+)`/g)].map(m => m[1]);
    // A grammar drift would make both lists empty and every assertion below vacuous.
    assert.ok(eslintRules.length > 0, 'no `eslint:<rule>` cells found — check the enforced-by grammar');
    assert.ok(styleRules.length > 0, 'no `stylelint:<rule>` cells found — check the enforced-by grammar');

    const cfg = await new ESLint({ cwd: ROOT }).calculateConfigForFile(path.join(ROOT, 'src/components/mud-button/mud-button.tsx'));
    const off = eslintRules.filter(r => {
      const v = cfg.rules?.[r];
      const level = Array.isArray(v) ? v[0] : v;
      return level === undefined || level === 0 || level === 'off';
    });
    assert.deepEqual(off, []);

    const stylelint = JSON.parse(read('.stylelintrc.json')).rules;
    assert.deepEqual(styleRules.filter(r => !stylelint[r]), []);
  });
});

describe('stencil-compliance skill ↔ installed Stencil', () => {
  const pkg = JSON.parse(read('package.json'));
  const stencilRange = pkg.dependencies?.['@stencil/core'] ?? pkg.devDependencies?.['@stencil/core'];
  const [, major, minor] = stencilRange.match(/(\d+)\.(\d+)/);

  it('version-delta.md carries a section for the pinned major.minor', () => {
    const delta = fs.readFileSync(path.join(SKILL, 'references/version-delta.md'), 'utf8');
    assert.match(delta, new RegExp(`^## Stencil ${major}\\.${minor}$`, 'm'));
  });

  it('the public API table matches the package entry both ways', () => {
    const dts = read('node_modules/@stencil/core/internal/stencil-core/index.d.ts');
    const exported = new Set();
    for (const block of dts.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
      for (const part of block[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop()?.trim();
        if (name) exported.add(name);
      }
    }
    const api = fs.readFileSync(path.join(SKILL, 'references/functional-api.md'), 'utf8');
    const section = api.split(/^### Public API$/m)[1]?.split(/^#{2,3} /m)[0] ?? '';
    const listed = new Set([...section.matchAll(/^\|\s*`([A-Za-z_$][\w$]*)`/gm)].map(m => m[1]));
    assert.deepEqual([...exported].filter(n => !listed.has(n)).sort(), [], 'exported but not in the table');
    assert.deepEqual([...listed].filter(n => !exported.has(n)).sort(), [], 'in the table but not exported');
  });

  it('the local Yarn patch still applies', () => {
    const resolutionKey = Object.keys(pkg.resolutions ?? {}).find(k => k.startsWith('@stencil/core@'));
    assert.ok(resolutionKey, 'resolutions entry for @stencil/core');
    assert.equal(resolutionKey, `@stencil/core@npm:${stencilRange}`);
    assert.match(read('node_modules/@stencil/core/compiler/stencil.js'), /OneOf3/);
  });

  it('form-associated boolean parsing still treats "false" as true', () => {
    const runtime = read('node_modules/@stencil/core/internal/client/index.js');
    assert.match(runtime, /isFormAssociated && typeof propValue === "string"\) \{\s*return propValue === "" \|\| !!propValue;/);
  });
});
```

Before relying on the `resolutions` key: `grep -n '"resolutions"' package.json` — the patch line sits
at `package.json:39-40`; if the block is named differently, read that name. Before the ESLint
import: the spec runs under `node --test` from the repo root, where `eslint` is a devDependency.

- [x] **Step 2: Run** `node --test scripts/__tests__/stencil-compliance-skill.spec.mjs` → PASS. Each failure is a Phase 2 omission; fix the doc, not the spec.

- [x] **Step 3: Mutation check** (proves each assertion can fail; revert each change with the Edit tool, never `git checkout`): (a) add `` `ANTIPATTERN-NOPE` `` to `version-delta.md` → test 1 fails; (b) rename `## Stencil 4.45` → `## Stencil 4.44` → heading test fails; (c) delete one `### Public API` row → API test fails; (d) change one `` `eslint:@stencil/single-export` `` cell to `` `eslint:@stencil/strict-mutable` `` → lint test fails; (e) change one `` `stylelint:declaration-no-important` `` cell to `` `stylelint:color-no-hex` `` → lint test fails; (f) delete one `stencil`-scoped code's only citation from the skill → "every stencil-scoped registry code is cited" fails; (g) in a scratch copy of the spec, point the patch assertion at `/OneOf3_SENTINEL/` → patch test fails; (h) same for the boolean-parsing regex (`"false_SENTINEL"`) → parsing test fails. (c') add a `` | `NotExported` | … | `` row → API test fails in the other direction; (g') in a scratch copy of `package.json`, change the resolution key's range → patch test fails. Restore each and re-run → PASS.

Then add the spec's path to `references/version-delta.md` ("the skill parity spec" → `` `scripts/__tests__/stencil-compliance-skill.spec.mjs` ``) — it exists now, so the docs checker's `path` rule passes.

- [x] **Step 4: Commit**

```bash
npx prettier --write scripts/__tests__/stencil-compliance-skill.spec.mjs
yarn lint && node scripts/docs/check-ai-docs.mjs && node --test "scripts/__tests__/**/*.spec.mjs"
git add scripts/__tests__/stencil-compliance-skill.spec.mjs .claude/skills/stencil-compliance/references/version-delta.md
git commit -m "test(skills): tie stencil-compliance to its scripts, lint config and installed Stencil"
```

---

## Phase 4 — Close

**Executor**: Opus 5 · low · wave G · inline

### Task 4.1: Full verification

- [x] **Step 1:** Run every acceptance-bar row 1-8 and record each literal result under "Measured".
- [x] **Step 2:** `git diff --stat fix/issue-53-ai-docs-alignment...HEAD` — every path is named in some task's **Files**; a stray path is removed or explained.

### Task 4.2: Issue text for the form-associated boolean bug

- [x] **Step 1:** Draft the issue in the style of #86 (title: "Form-associated boolean props defaulting to true cannot be disabled from HTML") with: the runtime lines `internal/client/index.js:2352-2353`, every `STENCIL-FORM-BOOLEAN-DEFAULT-TRUE` finding from Task 1.2 Step 6 (five on `18c3aae`, Decision 5), a reproduction (`<mud-search-input clearable="false">` renders the clear button), and the fix direction (invert to a default-`false` prop, a breaking API change). Save it to the scratch directory and hand it to Dan; Dan files it. (Superseded by the Decision 5 correction: the reproduction is `el.clearable = "false"` on the property; the markup attribute gives `false`.)

---

## Self-refute log

| # | Question | Answer |
| --- | --- | --- |
| 1 | Does a fix reuse the defect's own mechanism class? | The skill failed by restating facts that drifted (component list, API list, version). The fix deletes restated inventories where a command can replace them (form list) and, where a list must stay (API table, codes), guards it against its source both ways (Task 3.2) — not a second hand-kept copy |
| 2 | Can a rule's letter be met with its intent violated? | `stencil-version` is met by deleting version claims — acceptable, the version lives in `version-delta.md`, whose heading Task 3.2 pins. Parity is met by citing a code in prose without guidance — Task 2.2's rule index requires the code in a row with `enforced-by`; not machine-checked (stated in "Not verified") |
| 3 | Numeric targets: denominator, floor, instrument outside? | "0 false positives over the 46 components `--all` scans" (Task 1.2 Step 6) is graded by opening each hit, outside the script; ESLint/stylelint counts come from the tools, not from script 02 |
| 4 | Do two rules interact into an unintended pass? | `ruleScope: 'project'` exempts a code from parity; a Stencil rule mis-tagged `project` escapes both the skill and the guard. Counter: Task 1.1 Step 1 lists the assignment explicitly and `scripts/__tests__/audit/02-stencil-antipatterns.spec.mjs` (run by `test:scripts`, CI and pre-push) asserts every entry carries the field; the tag's correctness is reviewed, not checked |

## Measured

Pre-execution values, measured on `18c3aae` during plan review (2026-09-17) in a scratch copy — Task 0.1 re-measures on the branch and any difference stops Task 1.3:

```derived id=lint-baselines
$ npx eslint "src/components/**/*.tsx" --rule '{"@stencil/<rule>":"error"}' -f json   # per rule
async-methods 0 · element-type 5 · render-returns-host 0 · reserved-member-names 35 (32 ariaLabel, itemId, ariaValuetext, inputmode) · single-export 0 · props-must-be-public 0 · methods-must-be-public 0
$ npx stylelint "src/components/**/*.css" -f json --config <probe file>   # Task 0.1 Step 2
declaration-no-important 3 (mud-service-button.css:87,88; mud-accordion-item.css:110) · declaration-property-value-disallowed-list 0
$ node scripts/audit/02-stencil-antipatterns.mjs --all --json   # RAW-PIXELS groups
84 total: 41 var(--token, Npx) fallback · 11 @media/@container · 4 calc( · 1 0.5px · 27 other
$ node scripts/audit/16-stencil-contract.mjs --all --json   # plan code block, scratch copy
exit 1 · componentsScanned 46 · MEMBER-ORDER 20 · MAP-KEY 10 · FORM-BOOLEAN-DEFAULT-TRUE 5 · WATCH-ASYNC 3 · WATCH-WRITES-WATCHED 1 (mud-pagination.tsx:163)
```

Filled in during execution: Task 0.2, 1.1 Steps 3-4, 1.2 Step 6, 4.1.

Task 0.1, re-measured on the branch at `c4b3214` (tree identical to `ed19d51`: `git diff --quiet ed19d51 c4b3214` → exit 0), Node 24.19.0, `@stencil/core` 4.45.0:

```derived id=lint-baselines-execution
async-methods 0 · element-type 5 (mud-badge.tsx:83, mud-separator.tsx:21, mud-stepper.tsx:108, mud-table.tsx:139, mud-tooltip.tsx:162) · render-returns-host 0 · reserved-member-names 35 · single-export 0 · props-must-be-public 0 · methods-must-be-public 0
declaration-no-important 3 (mud-accordion-item.css:110, mud-service-button.css:87,88) · declaration-property-value-disallowed-list 0
RAW-PIXELS 84: 11 @media/@container · 1 0.5px · 27 other · 45 var fallback or calc( (3 lines hold both; split 41/4 when calc( is tested first)
```

All equal § Measured above; Task 1.3 is not stopped.

Task 0.2, read from `node_modules/@stencil/core/internal/client/index.js` (4.45.0, Yarn-patched):

- SE3 "serializer MUST return string or null; null removes the attribute": **partly true.** `null` or `false` removes the attribute (`:2537-2543`); `true` writes `""` and a number is coerced by `setAttribute` (`:2545-2550`); a complex value is never written (`:2545`, `!isComplex`). "MUST return string" is too strict; "return a string, or `null` to remove the attribute" is accurate.
- SE6 "`reflect: true` not required with `@PropSerialize`": **false.** The serializer runs only when the component has reflected attributes (`:3551`), and its output reaches the DOM only through the `$attrsToReflect$` loop (`:3093-3097`), which holds only props flagged `ReflectAttr` (`:3870-3871`). Without `reflect: true` the serialized value is never written.
- SE9 "both `reflect: true` and `@PropSerialize` → undefined behaviour": **false.** That combination is the defined path: the reflect loop prefers `$serializerValues$` over the raw prop (`:3096-3097`).
- #16/EL6 "host children are not available in `componentWillLoad`": **false for markup.** Probe (built with `yarn dx:stencil:once`, served from the repo root, Playwright console), `this.host.children.length` inside `componentWillLoad`: case 1 parser-inserted markup → `1`; case 2 element appended empty, child appended after `componentOnReady()` → `0`; case 3 markup via `innerHTML` on a connected container → `1`. Light-DOM children present in the markup are readable in `componentWillLoad`; children added after load reach the component only through `slotchange`. Temporary `componentWillLoad` removed (`git diff --quiet -- src/components/mud-accordion` → exit 0), `probe.html` deleted.
- Task 1.1 Step 3: `ANTIPATTERN-HOST-DISPLAY` over `--all` → 0. Independent check (brace-balanced body of the first bare `:host` rule, nested rules removed, in each of the 55 `src/components/*/*.css`) → every file declares `display`; the 0 is not a miss.
- Task 1.1 Step 4: `ANTIPATTERN-RAW-PIXELS` over `--all` → 27 (was 84), equal to the hand-counted "other" group.
- Task 1.2 Step 6: `node scripts/audit/16-stencil-contract.mjs --all --json` → exit 1, `componentsScanned` 46 · MEMBER-ORDER 20 · MAP-KEY 10 · FORM-BOOLEAN-DEFAULT-TRUE 5 (exactly Decision 5's props) · WATCH-ASYNC 3 (`mud-icon.tsx:86,92`, `mud-logo.tsx:68`) · WATCH-WRITES-WATCHED 1 (`mud-pagination.tsx:163`) · FORM-CALLBACKS 0 (neither `mud-button` nor `mud-service-button`). Equal to § Measured. Every hit opened: the 20 MEMBER-ORDER hits each show a group out of `component-structure.md:35-46` order in the class's member sequence (19 × `@Watch`/`@Listen` or `@State` after a later group, `mud-separator.tsx` `@Element` before `@Prop`); the 10 MAP-KEY roots carry no `key` (none within 40 lines of the `.map(`). 0 false positives.
- Task 1.3 Step 1: gate held without re-running the tools — `git diff --quiet c4b3214 HEAD -- src eslint.config.mjs .stylelintrc.json` → exit 0, so no input to either count changed since Task 0.1. Step 2: `mud-stepper.tsx:128` and `mud-tooltip.tsx:747` pass the host to DOM APIs typed `Element`; the narrowed type is not assignable there (its `ariaLabel?: string` conflicts with `Element.ariaLabel: string | null`, the #88 names), so both casts follow `mud-cookie-banner.tsx:164` (`this.host as unknown as Element`) — type-only. Step 4: the two stylelint rules, probed on a scratch CSS file inside `src/`, fire on `!important`, `transition: all` and `transition-property: all`, and not on `allow`.
- Task 2.3: committed before Task 2.2 — the rewritten `SKILL.md` links `references/version-delta.md`, so the references commit must land first for each commit to pass the docs checker. The Task 3.2 parity spec, run from a scratch copy against the rewritten skill, passed 7/7 before either commit. Facts checked while writing: stenciljs.com version selector defaults to v4.43; `npm view @stencil/core dist-tags` → `latest: 4.45.0`, `beta: 5.0.0-beta.12`; the Yarn patch touches only `compiler/stencil.js`; watchers are invoked without `await` (`internal/client/index.js:3602-3605`); a native-attribute `@Watch` runs from `attributeChangedCallback` (`:3830-3835`); script 14 extracts `tag` but does not check its prefix (C2 is `manual`).
- Task 2.4 (implementer subagent): 8 files edited; `output-templates.md` and `must-enforce-checklist.md` had no matching claim. Left for follow-up, not in this task's rules: `optimize-prompt/references/canonical-defaults.md:25,55,57,282` cite `_agents/anti-patterns.md` #14, #19, #20, #12 for rules those items do not state; `.claude/agents/audit-production.md:132` still restates the pre-Decision-2 `@Watch` rule.
- Task 3.1 Step 3: sweep found 72 hits (70 `stale-prefix`, 2 `stencil-version`, 0 `lookaround`) in 16 files. 66 rename pairs over 14 files applied by `mechanical-worker` after an existence check per new name; placeholders (`MudName`, `mudX`, `HTMLMudXElement`, `MudButtonArgs`) kept as placeholders; `CorInput` → `MudTextInput`, `CorSelectInput` → `MudSelect`; `CorCard` is prose proposing a new component (renamed, not deleted); catalog rows `CorNotification` and `CorProgressTracker` deleted (no component). The worker also moved `cor<PascalComponent>` → `mud<PascalComponent>` in `canonical-defaults.md:141` (same line, outside its list; kept). The two `Stencil 4.x` claims (`optimize-prompt/SKILL.md:3`, `INTEGRATION.md:417`) now say `Stencil`.
- Task 3.2: `node --test scripts/__tests__/stencil-compliance-skill.spec.mjs` → 7/7. Mutation check (anchored substitutions, restores asserted byte-equal, sentinel variants in a temporary spec copy; TAP names the failing test): a → "every code the skill cites exists"; b → "version-delta.md carries a section"; c and c' → "public API table matches … both ways"; d and e → "every eslint:/stylelint: enforced-by cell names a rule that is enabled"; f (all `STENCIL-MAP-KEY` citations removed) → "every stencil-scoped registry code is cited"; g and g' → "the local Yarn patch still applies"; h → "form-associated boolean parsing". 10/10 killed by the intended assertion; baseline 7/7 after restore.
- Task 4.2 reproduction probe (lazy build, served from the repo root, Playwright console), `mud-search-input value="abc"`: markup `clearable="false"` → prop `false`, attribute removed; `setAttribute('clearable','false')` → `false`; `el.clearable = 'false'` (string) → `true`, attribute `""`; `el.clearable = false` → `false`; `mud-textarea show-counter="false"` (form-associated, not reflected) → `false`. Cause: `attributeChangedCallback` maps `null`/`"false"` to `false` before assigning (`:3854-3856`), so `parsePropertyValue`'s string branch (`:2352-2353`) is reached only by a string set on the property. Contradicted Decision 5 → stopped; Dan chose to keep the check corrected (see Decision 5 note). The DOM query for the clear control did not match even on the default element, so the probe's evidence is the prop values, which `mud-search-input.tsx:404` reads directly.
- Task 4.1 (Node 24.19.0, before the Decision 5 correction at `69e7218`; rows 1, 4 and 8 re-run after it): row 1 `node --test "scripts/__tests__/**/*.spec.mjs"` → exit 0, 740/740; row 2 → `check-ai-docs: clean`, exit 0; row 3 `yarn lint` → exit 0; row 4 script 16 `--all --json` → exit 1 (findings), envelope check exit 0; after the correction `summary` = 3 errors, 36 warnings; row 5 fixture runner → 13 passed, 0 failed; row 6 covered by row 1; row 7 → both greps print nothing; row 8 `yarn check.verify` from a cleared `.wireit` → exit 0, 13 scripts run, 0 skipped; after the correction → exit 0. Step 2: every path in `git diff --stat fix/issue-53-ai-docs-alignment...HEAD` is named by a task's Files or by the Task 3.1 sweep; the only `src/` lines beyond the listed ones are the two type-only casts in the listed `mud-stepper.tsx` / `mud-tooltip.tsx` (Task 1.3 note). Task 4.2 draft saved to the session scratch directory, not filed.
- Grade round 2 (fresh-eyes critic, 4 lenses over `c4b3214...c22df50`, merged FORTIFY) fixes: script 16 resolves `.map(this.member)` callbacks, flags a member after `render()`, returns script 14's finding for a file with no component class, accepts `-N`/`undefined` as fallback literals and `boolean | undefined` props; `--all` now → MEMBER-ORDER 21 (+`mud-checkbox.tsx:376`), MAP-KEY 11 (+`mud-accordion.tsx:235`), summary 3 errors / 38 warnings, both new hits true positives. Docs checker: `stale-prefix` also matches kebab `cor-`, `--cor-` and the prefix named as a word (lines citing `src/legacy` exempt); `lookaround` accepts `-oP`/`--perl-regexp`, judges each fenced command alone and skips non-shell fences; `stencil-version` compares `x` case-insensitively and reads `@stencil/core` spellings — 3 new spec describes. Duplicate reference rows F8, R1, R5, API2, J10 replaced by links to their owning rows; H2 states the external-event exception; index adds W3 (`manual`); consumer copies of member order and the @Watch rule (`wave-2-static-analysis.md`, `audit-production.md`, `src/components/AGENTS.md`) and audit-component's code list became links; `_agents/anti-patterns.md` #3 names the disable-comment exception. Parity spec adds: index text = reference text both ways, `GROUP_ORDER` = the documented decorator order, `Pinned:` line = `package.json` range, a stylelint rule set to `{}` counts as off — each mutation-killed by its own assertion (6/6).
- Grade round 3 (critic, 4 lenses over `c4b3214...d38540d`, all FORTIFY) reached the 3-round cap with 15 above-bar findings; Dan chose to fix all 15 in one commit without a 4th round. Script 16 now checks every `@Component` `.tsx` in a component folder and resolves a sub-component name (`filesScanned` 55 of `componentsScanned` 46), follows every `return`, `?:`/logical branch, array literal and `this.method()` call to its JSX roots, and sees `this['x'] =` and destructuring writes. `--all` → errors 3 / warnings 45; the 7 added findings (MAP-KEY `mud-cookie-banner.tsx:486`, `mud-footer.tsx:306`, `mud-header-mega-menu.tsx:44,49`, `mud-header-services-menu.tsx:74`, `mud-pagination.tsx:516`; MEMBER-ORDER `mud-tab.tsx:93`) opened and true, none removed. Skill: P4, S5, S6, C11, AI1, AI3 deleted with links to SE1, R2, LC4, F1, F9; J9/J13 moved out as project rules; ST6 and H2 split into tool rows plus `manual` ST11 and H7; new `manual` rows P13, ST10, MO2; `enforced-by` grammar kept only in SKILL.md, `script-14` dropped; lint table in `anti-patterns.md` replaced by a pointer; `pre-pr-check.md` and audit-component name both anti-pattern homes. `stale-prefix` matches `Cor<…>`/`cor<…>`/`HTMLCor<`/`${` (4 live lines fixed); the parity spec refuses a duplicate index id. Mutations: drifted duplicate index row → parity test fails; reintroduced `Cor<New>` → 1 stale-prefix hit.
- Optional follow-ups (Dan, 2026-09-17), fixed without another review round: `ANTIPATTERN-HOST-DISPLAY` reads every bare `:host` block with nested rules removed; RAW-PIXELS reports decimal values whole (`1.5px`) and skips continued `@media` conditions; script 16 finds a submitter by an AST `internals.form.requestSubmit()` call (comments no longer count) and ignores a `;` after `render()`; `lookaround` skips JS regex literal spans, accepts `--engine pcre2`, and judges each chained command; `stale-prefix` flags `` `Cor` ``/`Cor prefix` and exempts only matches inside a `src/legacy/` path; `stencil-version` reads `>=`/`^`/parenthesised/table/JSON spellings and package claims inside fences. P10 split into `script-04` rows P10/P14 (run contract now `--only 02,04,14,16`); runtime line numbers moved from the rule index into `form-reactivity.md` prose; precedence, lint-coverage and script-14 notes in `SKILL.md`; `report-only` qualifiers on consumer links; `canonical-defaults.md` citations and the `CONTRIBUTING.md` count corrected. Parity spec now reads stylelint through `stylelint.resolveConfig`, checks `script-04` codes, and checks every `ANTIPATTERN-`/`STENCIL-` code in the doc scope — mutations: rule resolved to `{}`, unknown `script-04` code, unknown code in a consumer doc, each caught by its own test. Not changed: the @Watch rule's silence on sync side effects (1 of 119 watchers emits, `mud-select.tsx:270`; a Decision 2 question for Dan). `--all`: script 02 RAW-PIXELS 27, HOST-DISPLAY 0; script 16 unchanged (3 errors / 45 warnings).
- Pre-PR `dan-sentinel` gate over `c4b3214..f2e9236` (touch-check escalated `--quick` to the default gate; 5 legs): REQUEST-CHANGES — correctness FAIL (`/code-review xhigh`, 15 verified findings), architecture/testability/maintainability WARN, security PASS. Fixed after it: script 16 honours `--changed` (was a `"null"` component and a permanent `run-all` blocker); `run-all` treats script 16 as report-only (`blocking: false` — errors counted, never blockers); sub-components resolve in `lib/component-paths.mjs` for every script (`run-all mud-tab --only 02,04,14,16` → 4 summaries, no STRUCTURE-NOT-FOUND); H1 split into `eslint:@stencil/render-returns-host` (no array) + `manual` H8 (`<Host>` root) — the rule only reports arrays; authoring agents and `_agents/typescript-strict.md` use `HTMLMud<Name>Element`; `mud-design` lists `MudStepper`, `MudInlineMessage`, `MudInfoBox`, `MudToast`, `MudBanner` (the rows deleted in 1a1170b had successors); the orphan lint-table rows left in `anti-patterns.md` by 42a745f removed (the earlier "replaced by a pointer" note was only true from here); HOST-DISPLAY reads only top-level bare `:host` rules (selector lists included) and reports a stylesheet with none; RAW-PIXELS ignores digits inside names and skips `min()`/`max()`/`clamp()` and more media continuations; stylelint's transition value only matches the `all` token; `lookaround` splits commands outside quotes, joins `\` continuations and judges a span only in grep context; script 16 skips non-literal `shadow`, reports a member after `render()` once, and no longer exempts writes in nested callbacks or `if (true)`; P8's fix text no longer recommends inversion (a string `"false"` turns a default-`false` prop on too); story-title examples drop the prefix; parity spec checks `script-02`/`script-16` cells against their own script and the transition rule against a custom property. `--all` unchanged (02: RAW-PIXELS 27, HOST-DISPLAY 0; 16: 3 errors / 45 warnings). Unmeasured lint rules, for Dan: `@stencil/required-prefix` with `mud-` → 0 (C2 could move from `manual`); `strict-mutable` → 8; `prefer-vdom-listener` → 9.
- B3: `parsePropertyValue` form-associated boolean branch `:2352-2353` (`return propValue === "" || !!propValue`, so `"false"` → `true`); call sites `:3545` (`setValue`) and `:3728` (attribute setter).

## Not verified by this plan

- Whether the model actually follows the run contract: the envelope-count requirement makes skipping visible in a report, not impossible.
- That each `manual` rule's text is correct beyond the facts Task 0.2 verifies.
- `stencil-version` flags `4.x` and minors above the pin, not stale lower minors (they read as history); after an upgrade only `version-delta.md`'s heading is pinned.
- The parity spec reads stylelint rules from `.stylelintrc.json` `rules`, not the resolved config; a rule enabled only through `extends` would be reported as off.
- The HTML-spec claim that `setValidity` throws on flags with an empty message (kept `manual`, not asserted).
- ESLint/stylelint rule counts before Task 0.1 runs.
- That `ruleScope` tags are semantically right (reviewed, not checked — Self-refute 4).
