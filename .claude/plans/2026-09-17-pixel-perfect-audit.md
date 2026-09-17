# Pixel-Perfect Lane Audit and Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close [#87](https://github.com/egov-moldova/design-system/issues/87): make the `pixel-perfect` skill, the
`pixel-perfect-verifier` agent and `_agents/pixel-perfect-qa.md` correct for this repo, move the steps a script can
decide out of model judgment, and add guards that fail when the lane drifts again — without widening the lane.

**Architecture:** Four small script capabilities, each a pure function with a spec, then wiring, then docs, then guards.
(1) One home for the diff thresholds. (2) Manifest `shared` expectation blocks and per-state `mask` selectors.
(3) Token names on every `STYLE-MISMATCH` row, read from the element's own custom properties. (4) A `figma-refs --check`
mode that reports Figma variants the manifest does not cover, cited nodes that no longer exist, and references exported
before the Figma file last changed. The docs then run those scripts and judge only what remains.

**Tech Stack:** Node 24 ESM scripts (`.mjs`, no new dependency), Playwright (`scripts/audit/lib/browser-context.mjs`),
`pngjs` + `pixelmatch` (`scripts/audit/lib/image-diff.mjs`), `node:test`, Figma REST API v1 with `FIGMA_TOKEN`,
Storybook on port 6007.

**Issue:** [#87](https://github.com/egov-moldova/design-system/issues/87). Base: `origin/main` at `c4b3214` or later
(PR #77, #80 and #83 are merged there).

**Reviewed:** preflight 2026-09-17 at `c4b3214` — leg 1 (decision quality) FORTIFY, 2 above-bar findings folded; leg 2
(tool blast radius, retention) RETHINK, 2 above-bar findings folded, 1 beyond-bar rejected with reason (§ Review log).

**Spec:** issue #87 (scope items 1–7 and "Done when") plus the in-session analysis of 2026-09-17 — restated in full in
§ Findings, so this plan stands alone.

## The problem

The lane is dispatched by five consumers and is the project's "Pixel-Perfect" gate (`AGENTS.md` critical rule 4).
Today it grants tools no configured server provides, points at a skill that does not exist, asks the model to do work a
script can do (name the controlling token, check that the manifest covers every Figma variant), lets stale references and
mock data turn into permanent "not verified", keeps the pass/fail thresholds in three places, and is dispatched with
inputs the agent no longer accepts. Nothing fails when any of this drifts again.

## Findings

Located at `c4b3214`. Disposition: **fix** (task), **correct the issue** (the issue text is wrong), **keep** (checked,
no change).

| # | Finding | Located cause | Disposition |
| --- | --- | --- | --- |
| F1 | Agent grants `mcp__figma-mcp__*`; `.mcp.json` configures no `figma-mcp` server (servers: `agentation`, `playwright`, `chrome-devtools`, `figma`, `image-compare`) | `.claude/agents/pixel-perfect-verifier.md:4,33`; `.claude/skills/pixel-perfect/SKILL.md:48,113`; `scripts/audit/figma-refs.mjs:14-16,78-88,171-188`; `_agents/mcp-tools.md:97` | fix — D1, Tasks 2.3, 3.1, 3.2, 3.4; guard 4.1 |
| F2 | Skill routes website cloning to a `clone-ui` skill that is not installed | `SKILL.md:10` | fix — Task 3.1 |
| F3 | Agent drafts a whole manifest when none exists (a sonnet leg authoring values, the failure PR #77's review already caught once: "a manifest value that was inferred rather than copied") | `pixel-perfect-verifier.md:32,64` | fix — Task 3.2 (`manifest-missing` + coverage list) |
| F4 | Consumers pass inputs the agent does not accept: `figmaNodeId` without a file key and `threshold` (agent reads `acceptThreshold`); `figmaReferenceDir` (removed in PR #77); `useBaseline=true`; "vs pre-refactor baseline"; report line "max diff X%" | `.claude/agents/new-component.md:159`; `redesign-component.md:209,274`; `custom-component.md:142,145`; `refactor-component.md:105,112`; `.claude/skills/parallel-aux-tasks/SKILL.md:47` | fix — D2, D3, Task 3.4 |
| F5 | `acceptThreshold` input is accepted but never passed to a script | `pixel-perfect-verifier.md:24,35` | fix — Task 3.2 removes it (one threshold home, Task 1.1) |
| F6 | Diff thresholds 0.5 / 2.0 live in three code/doc places; `visual-diff.mjs` classifies on its own copy | `scripts/visual-diff.mjs:94-96`; `scripts/audit/11-pixel-diff-states.mjs:81-82`; `_agents/pixel-perfect-qa.md:28`; `SKILL.md:132` | fix — Task 1.1, 3.1, 3.3 |
| F7 | A `STYLE-MISMATCH` row says Figma value vs rendered value but not which token; the agent is told to name it by hand | `15-style-parity.mjs:230`; `pixel-perfect-verifier.md:36` | fix — Tasks 1.4, 2.1 |
| F8 | "Manifest covers every Figma state" is checked by the model | `pixel-perfect-verifier.md:31`; `SKILL.md:55` | fix — Tasks 2.3, 3.1 |
| F9 | Identical `expect` blocks repeated across states: 5 of 37 (date-picker), 16 of 57 (date-input), 10 of 32 (table) | the three manifests; no reuse construct in `scripts/audit/lib/figma-manifest.mjs` | fix — Tasks 1.2, 1.3 |
| F10 | States with mock data (dates, avatars) "cannot reach PASS" and stay not verified | `SKILL.md:132`; no mask in the manifest schema | fix — Tasks 1.2, 2.2 |
| F11 | References are git-ignored and carry no Figma version, so a stale export diffs silently | `figma-refs.mjs:113` writes PNGs only | fix — Task 2.3 |
| F12 | Report has no single verdict line; "Not verified" can read as a pass | `pixel-perfect-verifier.md:42-74`; `SKILL.md:147-165` | fix — Tasks 3.1, 3.2 |
| F13 | Issue says the four scripts have no test | false: `scripts/__tests__/audit/{11-pixel-diff-states,15-style-parity,figma-manifest,figma-refs,image-diff,style-values,state-page}.spec.mjs` exist and run in `yarn test:scripts` (`.github/workflows/ci.yml:80`). What is missing is proof each spec can fail | correct the issue — PR body; mutation check Task 4.3 |
| F14 | No rule ties MCP tool names in agent frontmatter or docs to `.mcp.json` | `scripts/docs/check-ai-docs.mjs` rules list `:13-31` | fix — Task 4.1 |
| F15 | The skill has no rule index saying which rule a script enforces and which the model judges | `SKILL.md` (no such section) | fix — Task 3.1 |
| F16 | Agent failure modes do not cover a missing manifest, a missing story, or missing references | `pixel-perfect-verifier.md:82-92` | fix — Task 3.2 |
| F17 | QA doc lists typography as zero tolerance and "line height ±1px" as rendering tolerance, without saying the first is computed style and the second glyph pixels | `_agents/pixel-perfect-qa.md:24,26` | fix — Task 3.3 |
| F18 | Official Figma MCP tool names the lane uses (`get_design_context`, `get_metadata`, `get_screenshot`, `get_variable_defs` under `mcp__figma__`) | present in the session tool list on 2026-09-17 | keep; server-level guard only (Task 4.1), tool-level stays unverified |
| F19 | Settling before a read | `scripts/audit/lib/state-page.mjs:45,77,83-85` waits for hydration, `document.fonts.ready` and 350 ms | keep |
| F20 | The verifier is "read-only" by instruction only: it holds unscoped `Bash` and reads untrusted Figma content (`get_design_context`, `get_metadata`) before running commands; nothing detects a write it makes | `.claude/agents/pixel-perfect-verifier.md:4,78`; `.claude/skills/parallel-aux-tasks/SKILL.md:164-170` (completion checklist has no write check) | fix (detect) — Task 3.4 adds a before/after tracked-change check for the read-only legs; prevention (a PreToolUse hook scoped to the agent) is D6, Dan's call |

## Decisions (confirmed by Dan, 2026-09-17: D1–D6 as written)

1. **D1 — FIGMA_TOKEN is the only reference route.** Remove the Framelink route from the agent, the skill, the docs and
   `figma-refs.mjs` (`mcpCall`, the no-token print). No token → `figma-refs` exits 1 with a one-line instruction; the
   pixel diff then reports `PIXEL-NO-REFERENCE` and style parity still runs. The official Figma MCP stays for design
   extraction (step 1); its `get_screenshot` returns inline images, not files.
   Server choice (confirmed): the repo configures only the remote Figma MCP (`https://mcp.figma.com/mcp`, OAuth, no key
   in the repo). The desktop server (`http://127.0.0.1:3845/mcp`) is not configured in the repo or named by any agent or
   doc; a contributor who wants selection-based context adds it at user scope under another name. `FIGMA_TOKEN` is a
   `file_content:read` personal access token held in the shell environment only, never in a tracked file.
2. **D2 — `custom-component` stops dispatching `pixel-perfect-verifier`.** There is no Figma node, and
   `validateManifest` requires every expectation to cite one (`figma-manifest.mjs:198-201`), so the agent can verify
   nothing there.
3. **D3 — refactor runs the manifest checks, not a screenshot baseline.** In `refactor-3`, the verifier runs `15` and `11`
   against the existing manifest (design-anchored, so it is also a regression check); no manifest → `manifest-missing`.
   The before/after screenshot comparison stays in `refactor-component.md` Step 5 (`:134`), which already owns it.
   `useBaseline` is removed.
4. **D4 — masked pixels are reported, never hidden.** A state's `mask` selectors are painted with the page background on
   both images before the diff; the envelope carries `maskedPixels` and the finding message says how much was masked.
   Style parity still checks the masked elements.
5. **D5 — `shared` blocks are opt-in.** Only `mud-date-input` and `mud-table` are migrated, and only if their resolved
   states are byte-identical before and after (Task 1.3).

6. **D6 — read-only legs are checked after the fact, not sandboxed.** Task 3.4 makes the orchestrator compare tracked
   changes before and after the parallel dispatch and treat any change outside the writer legs' files as a finding. A
   hook that refuses the verifier's writes is not in this plan: it is repo-wide hook configuration for one agent, and
   the lane has no observed write (Not verified). Confirm, or ask for the hook as a follow-up issue.

If Dan rejects D1–D3, drop the matching steps in Tasks 2.3, 3.2 and 3.4; the rest of the plan does not depend on them.

## Global Constraints

- Branch `fix/issue-87-pixel-perfect-audit` from `origin/main`, in its own worktree. Never commit to `main`.
- First commit on the branch is this plan file, copied from
  `/Users/Dan/orca/workspaces/design-system/ai-docs-are-stale-and-never-load-in-claude-code/.claude/plans/2026-09-17-pixel-perfect-audit.md`.
- Stage paths by name; never `git add -A` / `git add .` / `commit -a`. Never hand-edit `src/components.d.ts` or a component `readme.md`.
- Every authored file is English. Conventional commit subjects, as in `git log`. Commit messages go through `git commit -F -` with a quoted heredoc.
- `yarn check.verify` (typecheck, lint, test, test:scripts, docs:check) passes at every commit — a guard lands only in the commit that makes the repo satisfy it.
- Before every commit: `npx prettier --write <each changed .mjs/.json/.md path>` then `yarn lint` → exit 0.
- No component `.tsx`/`.css` change. The only `src/` edits are the two manifest migrations in Task 1.3.
- No new npm dependency.
- Push, PR and merge are Dan's. The branch ends with a drafted PR body (Task 5.2).
- `scripts/docs/check-ai-docs.mjs` is also edited by the #86 plan (`.claude/plans/2026-09-17-stencil-compliance-skill.md` Task 3.1). Whichever branch lands second rebases; the rules are separate sections and do not share code.
- Stop and return to Dan: a Phase 0 measurement that contradicts § Measured; `figma-refs --check` reporting a cited node gone; any change the plan does not name.

## Acceptance bar

Zero-tolerance, each decided by the command beside it:

| # | Condition | Command → pass value |
| --- | --- | --- |
| 1 | Script suite green, new specs included | `node --test "scripts/__tests__/**/*.spec.mjs"` → exit 0 |
| 2 | Docs checker clean with `mcp-server` active | `node scripts/docs/check-ai-docs.mjs` → exit 0, `check-ai-docs: clean` |
| 3 | No doc or agent names the Framelink server | `grep -rn "figma-mcp" .claude _agents AGENTS.md CLAUDE.md scripts/audit` → no output |
| 4 | Every mutation is caught | `node scripts/__tests__/audit/pixel-perfect.mutations.mjs` → exit 0, prints `caught 6/6` |
| 5 | Skill ↔ scripts parity (codes both ways, command paths exist) | covered by #1 (`scripts/__tests__/pixel-perfect-skill.spec.mjs`) |
| 6 | Every manifest in the repo resolves identically before and after (origin/main code + file vs branch code + file) | the `row-6` block below → prints no `FAILED` line |
| 7 | No exact-duplicate expectation block left outside `shared` in the migrated manifests | the `row-7` command below → prints `mud-date-input 0` and `mud-table 0` |
| 8 | Full gate | `yarn check.verify` → exit 0 |

```bash
# row-6 (repo root). Resolves every manifest twice: origin/main's resolver on origin/main's
# file, and the branch resolver on the branch file. The new `mask` key is dropped when empty,
# so the comparison is behaviour, not shape. A manifest new on the branch is reported, not compared.
git show origin/main:scripts/audit/lib/figma-manifest.mjs > scripts/audit/lib/.figma-manifest.origin.mjs
for f in src/components/*/test/*.figma.json; do
  OLD=$(mktemp)
  git show "origin/main:$f" > "$OLD" 2>/dev/null || { echo "$f new on branch"; continue; }
  node --input-type=module -e "
import { readFileSync } from 'node:fs';
import * as before from './scripts/audit/lib/.figma-manifest.origin.mjs';
import * as after from './scripts/audit/lib/figma-manifest.mjs';
const [oldPath, newPath] = process.argv.slice(1);
const load = p => JSON.parse(readFileSync(p, 'utf8'));
const a = load(oldPath);
const b = load(newPath);
const errs = after.validateManifest(b);
if (errs.length) { console.error(errs); process.exit(1); }
const ra = a.states.map(s => before.resolveState(a, s, a.component));
const rb = b.states.map(s => {
  const { mask, ...rest } = after.resolveState(b, s, b.component);
  return mask?.length ? { ...rest, mask } : rest;
});
process.exit(JSON.stringify(ra) === JSON.stringify(rb) ? 0 : 1);
" "$OLD" "$f" || echo "$f FAILED"
done
rm scripts/audit/lib/.figma-manifest.origin.mjs
```

```bash
# row-7
node -e '
for (const c of ["mud-date-input", "mud-table"]) {
  const m = require(`./src/components/${c}/test/${c}.figma.json`);
  const seen = new Map();
  for (const s of m.states) for (const e of s.expect ?? []) {
    if (e.use) continue;
    const k = JSON.stringify(e); seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  console.log(c, [...seen.values()].filter(v => v > 1).reduce((a, v) => a + v - 1, 0));
}'
```

Graded live in Task 5.1 against Storybook with `FIGMA_TOKEN` set. Thresholds are stated in words on purpose: none of
them is a measured baseline, and the one that compares against a measurement names the section that records it.

| Metric | Tolerance | Instrument |
| --- | --- | --- |
| Token arrays on style mismatches | every non-pseudo failing check on `mud-date-picker` carries both `observedTokens` and `expectedTokens` | `node scripts/audit/15-style-parity.mjs mud-date-picker --json` + the Task 2.1 Step 4 counter |
| Token names present | at least one failing check names a token | same counter, `named` |
| False token names | none, in a hand check of five named rows (each name's `getPropertyValue`, compared with `compareStyleValue`, passes) | `mcp__playwright__browser_evaluate` on the state's story |
| Coverage run | exit is never the usage/API code for any manifest; counts recorded in § Measured | `node scripts/audit/figma-refs.mjs <component> --check --json` |
| Masked pixels reported | above none on the masked probe state, and no red pixel inside the mask in its diff image | `node scripts/audit/11-pixel-diff-states.mjs mud-date-picker --manifest "$TMP_MANIFEST" --json` (Task 2.2 Step 7) |
| Style parity unchanged | `propertiesChecked` and `propertiesFailed` per component equal the pre-change baseline in § Measured | Task 0.2 Step 3 snippet |
| Read-only legs wrote nothing | no tracked change outside the writer legs' files after a dispatch | the Task 3.4 `aux-write-check` block |

## Execution matrix

Dispatch verdict: **inline.** Every phase carries exact code or a doc rewrite graded by a spec written in the same plan;
no phase is a brief a cheaper tier could take without the context of the phases before it.

| Phase | Model | Effort | Wave | Mode | Depends on / notes |
| --- | --- | --- | --- | --- | --- |
| 0 Branch, environment, baseline | Opus 5 | low | A | inline | none |
| 1 Pure functions + specs | Opus 5 | medium | B | inline | 0 |
| 2 Script wiring | Opus 5 | medium | C | inline | 1; Storybook + `FIGMA_TOKEN` |
| 3 Skill, agent, QA doc, consumers | Opus 5 | medium | D | inline | 2 (codes and flags the docs cite) |
| 4 Guards + mutation check | Opus 5 | medium | E | inline | 3 (the guard grades Phase 3's output) |
| 5 Close | Opus 5 | low | F | inline | 1–4 |

reuse-candidates: (homes swept: `scripts/audit/`, `scripts/audit/lib/`, `scripts/__tests__/`, `scripts/docs/`, `scripts/visual-diff.mjs`)
- `scripts/audit/lib/token-match.mjs` — candidate `scripts/audit/lib/style-values.mjs` · tier: partial (reuses `compareStyleValue`, `normalizeColor`, `splitTopLevel`) · verdict: create, importing them
- `classifyDiff` in `lib/image-diff.mjs` — candidate `11-pixel-diff-states.mjs:87` · tier: exact · verdict: move, re-export from 11
- `figma-refs --check` — candidate `buildImagesUrl`/`downloadViaRest` in the same file · tier: partial · verdict: extend the same script
- `mcp-server` rule — candidate `checkAgentCatalog` frontmatter reading in `check-ai-docs.mjs:525` · tier: partial · verdict: new rule section, same helpers
- `pixel-perfect.mutations.mjs` — candidate none in repo · verdict: create, not matched by the `*.spec.mjs` glob so CI does not run it

Every wave holds one phase. Escalation: a phase that fails its verify twice restarts with fresh context.

---

## Phase 0 — Branch, environment, baseline

**Executor**: Opus 5 · low · wave A · inline

### Task 0.1: Create the branch and commit the plan

- [x] **Step 1: Create the worktree and branch**

```bash
git fetch origin
git worktree add ../fix-issue-87-pixel-perfect-audit -b fix/issue-87-pixel-perfect-audit origin/main
cd ../fix-issue-87-pixel-perfect-audit
yarn install
```

- [x] **Step 2: Copy and commit this plan**

```bash
mkdir -p .claude/plans
cp /Users/Dan/orca/workspaces/design-system/ai-docs-are-stale-and-never-load-in-claude-code/.claude/plans/2026-09-17-pixel-perfect-audit.md .claude/plans/
npx prettier --write .claude/plans/2026-09-17-pixel-perfect-audit.md
git add .claude/plans/2026-09-17-pixel-perfect-audit.md
git commit -F - <<'EOF'
docs(plans): add the pixel-perfect lane audit plan

Refs #87
EOF
```

### Task 0.2: Environment and baseline (no commits)

- [x] **Step 1: Start Storybook and confirm the environment**

```bash
yarn dx:prepare                     # tokens + custom elements, first run only
yarn sp.dev.watch                   # separate terminal / background
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:6007/   # expect 200
npx playwright install chromium-headless-shell
[ -n "$FIGMA_TOKEN" ] && echo token-set                           # expect token-set
```

- [x] **Step 2: Run every command the skill, agent and QA doc name, record exit codes** (issue scope item 1)

```bash
for c in mud-date-picker mud-date-input mud-table; do
  node scripts/audit/figma-refs.mjs $c --json > /dev/null; echo "figma-refs $c $?"
  node scripts/audit/15-style-parity.mjs $c --json > .audit-screenshots/$c.style.baseline.json; echo "15 $c $?"
  node scripts/audit/11-pixel-diff-states.mjs $c --json > .audit-screenshots/$c.pixel.baseline.json; echo "11 $c $?"
done
node scripts/audit/05-story-exports.mjs mud-date-picker --json > /dev/null; echo "05 $?"
```

Expected: each exits 0 or 1 (1 = findings), never 2.

- [x] **Step 3: Record the baseline in § Measured**

```bash
for c in mud-date-picker mud-date-input mud-table; do
  node -e '
const c = process.argv[1];
const s = require(`./.audit-screenshots/${c}.style.baseline.json`);
const p = require(`./.audit-screenshots/${c}.pixel.baseline.json`);
const st = (p.meta?.states ?? []).flatMap(x => [x.light, x.dark].filter(Boolean)).map(t => t.status);
const count = k => st.filter(v => v === k).length;
console.log(c, "checked", s.meta.propertiesChecked, "failed", s.meta.propertiesFailed,
  "pixel PASS", count("PASS"), "WARNING", count("WARNING"), "FAIL", count("FAIL"), "UNKNOWN", count("UNKNOWN"));
' $c
done
```

If the pixel envelope shape differs from `meta.states[].light|dark.status`, read one state from the JSON, fix the
snippet, and record the shape. Any exit code 2 in Step 2 → stop and return to Dan.

---

## Phase 1 — Pure functions and specs

**Executor**: Opus 5 · medium · wave B · inline

### Task 1.1: One home for the diff thresholds

**Files:**
- Modify: `scripts/audit/lib/image-diff.mjs` (add `DEFAULT_PASS`, `DEFAULT_WARN`, `classifyDiff`)
- Modify: `scripts/audit/11-pixel-diff-states.mjs:81-95` (import and re-export instead of defining)
- Modify: `scripts/visual-diff.mjs:92-99` (classify with the shared function)
- Test: `scripts/__tests__/audit/image-diff.spec.mjs`

**Interfaces:**
- Produces: `DEFAULT_PASS = 0.5`, `DEFAULT_WARN = 2.0`, `classifyDiff(diffPercent, { passThreshold, warnThreshold }) → { status: 'PASS'|'WARNING'|'FAIL'|'UNKNOWN', requiresReview: boolean }` exported from `lib/image-diff.mjs`; `11-pixel-diff-states.mjs` keeps exporting `classifyDiff`.

- [ ] **Step 1: Read the current `classifyDiff` body** (`11-pixel-diff-states.mjs:84-95`) and copy it verbatim into the move in Step 3 — its `UNKNOWN` branch for a non-number percent must survive unchanged.

- [ ] **Step 2: Write the failing spec** (append to `image-diff.spec.mjs`; add `classifyDiff, DEFAULT_PASS, DEFAULT_WARN` to its import)

```js
describe('image-diff: classifyDiff', () => {
  it('bands on the shared defaults, with the lower bound exclusive', () => {
    assert.equal(DEFAULT_PASS, 0.5);
    assert.equal(DEFAULT_WARN, 2.0);
    assert.equal(classifyDiff(0.49).status, 'PASS');
    assert.equal(classifyDiff(0.5).status, 'WARNING');
    assert.equal(classifyDiff(1.99).status, 'WARNING');
    assert.equal(classifyDiff(2.0).status, 'FAIL');
  });

  it('is the function 11-pixel-diff-states exports', async () => {
    const eleven = await import('../../audit/11-pixel-diff-states.mjs');
    assert.equal(eleven.classifyDiff, classifyDiff);
  });
});

describe('visual-diff CLI: status', () => {
  it('reports the status classifyDiff gives for the measured percent', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-diff-'));
    const a = path.join(dir, 'a.png');
    const b = path.join(dir, 'b.png');
    fs.writeFileSync(a, PNG.sync.write(image(10, 10, [255, 255, 255, 255])));
    fs.writeFileSync(b, PNG.sync.write(image(10, 10, [255, 255, 255, 255], (x, y) => (x < 3 && y < 3 ? [0, 0, 0, 255] : null))));
    const res = spawnSync(process.execPath, [SCRIPT, '--figma', a, '--browser', b, '--output', path.join(dir, 'd.png')], { encoding: 'utf8' });
    const out = JSON.parse(res.stdout);
    assert.ok(out.diffPercent > 2, `expected a FAIL-band percent, got ${out.diffPercent}`);
    assert.equal(out.status, classifyDiff(out.diffPercent).status);
  });
});
```

Add to the spec's imports: `import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';` and `const SCRIPT = fileURLToPath(new URL('../../visual-diff.mjs', import.meta.url));`.

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test scripts/__tests__/audit/image-diff.spec.mjs`
Expected: FAIL — `classifyDiff` is not exported by `lib/image-diff.mjs`.

- [ ] **Step 4: Move the function**

In `lib/image-diff.mjs`, after `WHITE`:

```js
export const DEFAULT_PASS = 0.5;
export const DEFAULT_WARN = 2.0;

// classifyDiff — moved verbatim from 11-pixel-diff-states.mjs (Step 1); defaults now DEFAULT_PASS / DEFAULT_WARN.
```

In `11-pixel-diff-states.mjs`, delete the `DEFAULT_PASS`, `DEFAULT_WARN` constants and the `classifyDiff` function,
extend the import on line 50 and re-export:

```js
import { DEFAULT_PASS, DEFAULT_WARN, classifyDiff, describeSizeMismatch } from './lib/image-diff.mjs';

export { classifyDiff };
```

In `scripts/visual-diff.mjs`, import `classifyDiff` beside `diffImages` and replace the `if/else` status block with:

```js
const { status } = classifyDiff(diff.diffPercent);
```

- [ ] **Step 5: Run the suite**

Run: `node --test "scripts/__tests__/audit/*.spec.mjs"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
npx prettier --write scripts/audit/lib/image-diff.mjs scripts/audit/11-pixel-diff-states.mjs scripts/visual-diff.mjs scripts/__tests__/audit/image-diff.spec.mjs
yarn lint
git add scripts/audit/lib/image-diff.mjs scripts/audit/11-pixel-diff-states.mjs scripts/visual-diff.mjs scripts/__tests__/audit/image-diff.spec.mjs
git commit -F - <<'EOF'
refactor(audit): keep the pixel diff thresholds in one place

visual-diff.mjs classified on its own copy of 0.5 / 2.0; both callers now
use classifyDiff from lib/image-diff.mjs.

Refs #87
EOF
```

### Task 1.2: Manifest `shared` blocks, `mask` selectors and `figma.skip`

**Files:**
- Modify: `scripts/audit/lib/figma-manifest.mjs` (header doc, `validateManifest`, `validateCommon`, `resolveState`)
- Test: `scripts/__tests__/audit/figma-manifest.spec.mjs`

**Interfaces:**
- Produces, in the manifest schema:
  - top-level `shared: { "<kebab-key>": Expectation[] }`; a state `expect` entry `{ "use": "<key>" }` expands to that list.
  - `mask: string[]` (selectors) on a state or on `defaults`.
  - `figma.skip: [{ "node": "<id>", "reason": "<text>" }]` — Figma variants intentionally not covered.
- Produces: `resolveState(...)` returns `mask: string[]` and `expect` with `use` entries expanded (each expanded entry cites `e.node ?? state.node`).

- [ ] **Step 1: Write the failing specs** (append; reuse the spec's `manifest()` helper)

```js
describe('figma-manifest: shared blocks', () => {
  const shared = { 'cell-base': [{ target: 'mud-x .cell', styles: { borderRadius: '6px' } }] };

  it('expands a use entry into the shared expectations, citing the state node', () => {
    const m = manifest([{ name: 'hover', node: '1:2', expect: [{ use: 'cell-base' }] }], { shared });
    assert.deepEqual(validateManifest(m), []);
    assert.deepEqual(resolveState(m, m.states[0], 'mud-x').expect, [
      { target: 'mud-x .cell', styles: { borderRadius: '6px' }, node: '1:2' },
    ]);
  });

  it('rejects an unknown key and a use entry with other fields', () => {
    const errors = validateManifest(
      manifest([{ name: 'a', node: '1:2', expect: [{ use: 'nope' }, { use: 'cell-base', target: 'x' }] }], { shared }),
    );
    assert.ok(errors.some(e => /use "nope" names no shared block/.test(e)));
    assert.ok(errors.some(e => /a use entry cannot carry other fields/.test(e)));
  });

  it('validates shared entries with the state that uses them', () => {
    const bad = { broken: [{ target: 'mud-x .cell', styles: {} }] };
    const errors = validateManifest(manifest([{ name: 'a', node: '1:2', expect: [{ use: 'broken' }] }], { shared: bad }));
    assert.ok(errors.some(e => /styles must be a non-empty object/.test(e)));
  });
});

describe('figma-manifest: mask', () => {
  it('resolves state mask over defaults mask, empty by default', () => {
    const m = manifest([{ name: 'a', node: '1:2', mask: ['mud-x .date'] }, { name: 'b', node: '1:3' }], {
      defaults: { story: 'molecules-date-picker--default', mask: ['mud-x .avatar'] },
    });
    assert.deepEqual(validateManifest(m), []);
    assert.deepEqual(resolveState(m, m.states[0], 'mud-x').mask, ['mud-x .date']);
    assert.deepEqual(resolveState(m, m.states[1], 'mud-x').mask, ['mud-x .avatar']);
    assert.deepEqual(resolveState(manifest([{ name: 'c', node: '1:4' }]), { name: 'c', node: '1:4' }, 'mud-x').mask, []);
  });

  it('rejects a mask that is not a list of selectors', () => {
    const errors = validateManifest(manifest([{ name: 'a', node: '1:2', mask: 'mud-x .date' }]));
    assert.ok(errors.some(e => /mask must be a non-empty array of selectors/.test(e)));
  });
});

describe('figma-manifest: figma.skip', () => {
  it('accepts node + reason and rejects a missing reason', () => {
    assert.deepEqual(validateManifest(manifest([{ name: 'a', node: '1:2' }], { figma: { fileKey: 'abc123', skip: [{ node: '9:9', reason: 'Size=XL is not implemented' }] } })), []);
    const errors = validateManifest(manifest([{ name: 'a', node: '1:2' }], { figma: { fileKey: 'abc123', skip: [{ node: '9:9' }] } }));
    assert.ok(errors.some(e => /figma.skip\[0\] needs a node id and a reason/.test(e)));
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test scripts/__tests__/audit/figma-manifest.spec.mjs`
Expected: FAIL on every new case.

- [ ] **Step 3: Implement**

In `validateManifest`, inside the `manifest.figma !== undefined` block:

```js
    if (manifest.figma?.skip !== undefined) {
      if (!Array.isArray(manifest.figma.skip)) {
        errors.push('figma.skip must be an array of { node, reason }');
      } else {
        manifest.figma.skip.forEach((s, i) => {
          if (typeof s?.node !== 'string' || !NODE_ID_RE.test(s.node) || typeof s?.reason !== 'string' || !s.reason.trim()) {
            errors.push(`figma.skip[${i}] needs a node id and a reason`);
          }
        });
      }
    }
```

After the `figma` block:

```js
  const shared = manifest.shared ?? {};
  if (manifest.shared !== undefined && (typeof manifest.shared !== 'object' || Array.isArray(manifest.shared))) {
    errors.push('shared must be an object of { key: expectations[] }');
  }
  for (const [key, list] of Object.entries(shared)) {
    if (!STATE_NAME_RE.test(key)) errors.push(`shared["${key}"] key must be kebab-case`);
    if (!Array.isArray(list) || list.length === 0) errors.push(`shared["${key}"] must be a non-empty array`);
  }
```

Replace the `state.expect.forEach(...)` line with:

```js
        state.expect.forEach((e, j) => {
          const where2 = `${where}.expect[${j}]`;
          if (e && e.use !== undefined) {
            if (Object.keys(e).length !== 1) errors.push(`${where2}: a use entry cannot carry other fields`);
            const list = shared[e.use];
            if (!Array.isArray(list)) {
              errors.push(`${where2}: use "${e.use}" names no shared block`);
              return;
            }
            list.forEach((s, k) => validateExpectation(s, `${where2} → shared["${e.use}"][${k}]`, state, errors));
            return;
          }
          validateExpectation(e, where2, state, errors);
        });
```

In `validateCommon`:

```js
  if (obj.mask !== undefined) {
    const ok = Array.isArray(obj.mask) && obj.mask.length > 0 && obj.mask.every(s => typeof s === 'string' && s.length > 0);
    if (!ok) errors.push(`${where}.mask must be a non-empty array of selectors`);
  }
```

In `resolveState`, replace the `expect` line and add `mask`:

```js
    mask: state.mask ?? d.mask ?? [],
    expect: (state.expect ?? [])
      .flatMap(e => (e.use !== undefined ? (manifest.shared?.[e.use] ?? []) : [e]))
      .map(e => ({ ...e, node: normalizeNodeId(e.node ?? state.node) })),
```

Add to the header doc comment, after the `pixel: false` bullet:

```js
 * - `shared` holds expectation lists several states repeat; a state lists
 *   `{ "use": "<key>" }` in `expect`. Each expanded entry cites its own `node`
 *   or the using state's node.
 * - `mask` (state or defaults) lists selectors painted with the page
 *   background on both images before the pixel diff — for mock data such as
 *   dates. Masked pixels are reported; style parity still checks the elements.
 * - `figma.skip` lists Figma variants the manifest deliberately does not cover,
 *   each with a reason; `figma-refs --check` reports every other uncovered one.
```

- [ ] **Step 4: Run the suite**

Run: `node --test "scripts/__tests__/audit/*.spec.mjs"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npx prettier --write scripts/audit/lib/figma-manifest.mjs scripts/__tests__/audit/figma-manifest.spec.mjs
yarn lint
git add scripts/audit/lib/figma-manifest.mjs scripts/__tests__/audit/figma-manifest.spec.mjs
git commit -F - <<'EOF'
feat(audit): add shared expectation blocks, masks and skipped variants to the Figma manifest

Refs #87
EOF
```

### Task 1.3: Migrate the two most duplicated manifests to `shared`

**Files:**
- Modify: `src/components/mud-date-input/test/mud-date-input.figma.json`
- Modify: `src/components/mud-table/test/mud-table.figma.json`

- [ ] **Step 1: List the duplicated blocks**

```bash
node -e '
for (const c of ["mud-date-input", "mud-table"]) {
  const m = require(`./src/components/${c}/test/${c}.figma.json`);
  const seen = new Map();
  m.states.forEach(s => (s.expect ?? []).forEach(e => {
    const k = JSON.stringify(e); if (!seen.has(k)) seen.set(k, []); seen.get(k).push(s.name);
  }));
  for (const [k, states] of seen) if (states.length > 1) console.log(c, states.join(","), k.slice(0, 160));
}'
```

- [ ] **Step 2: Move each repeated block into `shared`** under a key named after what it checks (e.g. `header-cell-base`), and replace every occurrence with `{ "use": "<key>" }`. A block that carries an explicit `node` keeps it. Order inside each state's `expect` does not change.

- [ ] **Step 3: Prove equivalence** — acceptance-bar `row-6` → no `FAILED` line for any manifest (this also re-proves Task 1.2 left `mud-date-picker` unchanged); `row-7` → `0` for both. Record line counts before/after in § Measured (`git show origin/main:<path> | wc -l` vs `wc -l <path>`).

- [ ] **Step 4: Commit**

```bash
npx prettier --write src/components/mud-date-input/test/mud-date-input.figma.json src/components/mud-table/test/mud-table.figma.json
git add src/components/mud-date-input/test/mud-date-input.figma.json src/components/mud-table/test/mud-table.figma.json
git commit -F - <<'EOF'
test(date-input, table): factor repeated Figma expectations into shared blocks

Resolved states are identical before and after (row-6 of the #87 plan).

Refs #87
EOF
```

### Task 1.4: Token matching

**Files:**
- Create: `scripts/audit/lib/token-match.mjs`
- Test: `scripts/__tests__/audit/token-match.spec.mjs`

**Interfaces:**
- Consumes: `compareStyleValue`, `normalizeColor`, `splitTopLevel` from `lib/style-values.mjs`.
- Produces:
  - `matchTokens(prop, value, vars, { tolerance = 0.01, limit = 5 }) → string[]` — sorted custom-property names whose resolved value equals `value` for `prop`, same kind only, `--palette-*` excluded.
  - `attributeTokens(prop, figmaValue, renderedValue, vars, opts) → { expectedTokens: string[], observedTokens: string[] }`.
  - `formatTokens(tokens | null) → string` — `''` for null, else ` · tokens: rendered = a, b; Figma value = none`.

- [ ] **Step 1: Write the failing spec**

```js
/**
 * Tests for scripts/audit/lib/token-match.mjs — naming the design token behind
 * a STYLE-MISMATCH value.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { attributeTokens, formatTokens, matchTokens } from '../../audit/lib/token-match.mjs';

const vars = {
  '--color-background-primary-default': '#0058D2',
  '--color-background-primary-hover': '#0046a8',
  '--palette-blue-500': '#0058d2',
  '--spacing-4': '16px',
  '--font-weight-semibold': '16',
  '--radius-md': '6px',
  '--shadow-100': '0px 1px 3px 0px rgba(0, 0, 0, 0.08)',
};

describe('token-match: matchTokens', () => {
  it('matches colours across notations and excludes palette primitives', () => {
    assert.deepEqual(matchTokens('backgroundColor', 'rgb(0, 88, 210)', vars), ['--color-background-primary-default']);
  });

  it('matches a length only against a px (or 0) token, never a unitless number', () => {
    assert.deepEqual(matchTokens('paddingLeft', '16px', vars), ['--spacing-4']);
  });

  it('matches shadows layer by layer regardless of colour position', () => {
    assert.deepEqual(matchTokens('boxShadow', 'rgba(0, 0, 0, 0.08) 0px 1px 3px 0px', vars), ['--shadow-100']);
  });

  it('returns [] when nothing matches or the value is empty', () => {
    assert.deepEqual(matchTokens('backgroundColor', '#123456', vars), []);
    assert.deepEqual(matchTokens('backgroundColor', '', vars), []);
  });

  it('caps the list', () => {
    const many = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`--alias-${i}`, '6px']));
    assert.equal(matchTokens('borderTopLeftRadius', '6px', many, { limit: 5 }).length, 5);
  });
});

describe('token-match: attributeTokens + formatTokens', () => {
  it('names the rendered token and the token the Figma value would need', () => {
    const t = attributeTokens('backgroundColor', '#0046A8', 'rgb(0, 88, 210)', vars);
    assert.deepEqual(t, {
      expectedTokens: ['--color-background-primary-hover'],
      observedTokens: ['--color-background-primary-default'],
    });
    assert.equal(
      formatTokens(t),
      ' · tokens: rendered = --color-background-primary-default; Figma value = --color-background-primary-hover',
    );
  });

  it('says none, and formats null as empty', () => {
    assert.equal(formatTokens({ expectedTokens: [], observedTokens: [] }), ' · tokens: rendered = none; Figma value = none');
    assert.equal(formatTokens(null), '');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scripts/__tests__/audit/token-match.spec.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
/**
 * Name the design tokens behind a style value. A STYLE-MISMATCH row says the
 * Figma value and the rendered value; this adds which custom properties
 * resolve to each, so the fix is a token swap rather than a guess.
 *
 * `vars` is every custom property the element sees (`getComputedStyle`
 * enumerates inherited ones through shadow roots, with `var()` substituted).
 * Palette primitives are excluded: component CSS never references them
 * (AGENTS.md rule 5). Several names for one value are all listed — the
 * computed style cannot say which one the CSS used. Pure — no DOM.
 */
import { compareStyleValue, normalizeColor, splitTopLevel } from './style-values.mjs';

export const TOKEN_MATCH_LIMIT = 5;
const EXCLUDED = /^--palette-/;
const PX_OR_ZERO = /^(-?\d*\.?\d+px|0)$/i;
const NUMBER = /^-?\d*\.?\d+$/;

const kind = t => (normalizeColor(t) ? 'color' : PX_OR_ZERO.test(t) ? 'px' : NUMBER.test(t) ? 'number' : 'other');

function sameKind(prop, tokenValue, value) {
  if (/shadow$/i.test(prop) || /^fontfamily$/i.test(prop)) return true;
  const a = splitTopLevel(value, ' ');
  const b = splitTopLevel(tokenValue, ' ');
  return a.length === b.length && a.every((t, i) => kind(t) === kind(b[i]));
}

export function matchTokens(prop, value, vars, { tolerance = 0.01, limit = TOKEN_MATCH_LIMIT } = {}) {
  const v = String(value ?? '').trim();
  if (!v) return [];
  return Object.entries(vars ?? {})
    .filter(([name, raw]) => !EXCLUDED.test(name) && typeof raw === 'string' && raw.trim() !== '')
    .filter(([, raw]) => sameKind(prop, raw.trim(), v) && compareStyleValue(prop, raw.trim(), v, { tolerance }).pass)
    .map(([name]) => name)
    .sort()
    .slice(0, limit);
}

export function attributeTokens(prop, figmaValue, renderedValue, vars, opts = {}) {
  return {
    expectedTokens: matchTokens(prop, figmaValue, vars, opts),
    observedTokens: matchTokens(prop, renderedValue, vars, opts),
  };
}

export function formatTokens(tokens) {
  if (!tokens) return '';
  const list = names => (names.length ? names.join(', ') : 'none');
  return ` · tokens: rendered = ${list(tokens.observedTokens)}; Figma value = ${list(tokens.expectedTokens)}`;
}
```

- [ ] **Step 4: Run the spec**

Run: `node --test scripts/__tests__/audit/token-match.spec.mjs`
Expected: PASS. If the shadow case fails because `compareStyleValue` needs the Figma string on the `expected` side, keep the token as `expected` (as written) and fix the fixture string to the exact form `parseShadow` accepts — do not loosen `sameKind`.

- [ ] **Step 5: Commit**

```bash
npx prettier --write scripts/audit/lib/token-match.mjs scripts/__tests__/audit/token-match.spec.mjs
yarn lint
git add scripts/audit/lib/token-match.mjs scripts/__tests__/audit/token-match.spec.mjs
git commit -F - <<'EOF'
feat(audit): match style values to the design tokens that resolve to them

Refs #87
EOF
```

---

## Phase 2 — Script wiring

**Executor**: Opus 5 · medium · wave C · inline. Needs Storybook on 6007 and `FIGMA_TOKEN` (Task 0.2).

### Task 2.1: Token names on `STYLE-MISMATCH`

**Files:**
- Modify: `scripts/audit/15-style-parity.mjs:42` (import), `:87-105` (add `readCustomProperties`), `:221-234` (attribution)
- Test: `scripts/__tests__/audit/15-style-parity.spec.mjs`

**Interfaces:**
- Consumes: `attributeTokens`, `formatTokens` (Task 1.4); `PSEUDO_PROPS`.
- Produces: each failing check in `meta.states[].checks[]` carries `expectedTokens` and `observedTokens` unless its prop is in `PSEUDO_PROPS`; the `STYLE-MISMATCH` message ends with `formatTokens(...)`. New pure export `mismatchTokens(check, exp, actual, vars, opts) → tokens | null`.

- [ ] **Step 1: Write the failing spec** (append; add `mismatchTokens` to the import)

```js
describe('15-style-parity: mismatchTokens', () => {
  const vars = { '--a': '#0058d2', '--b': '#0046a8' };
  it('attributes a failing style check', () => {
    const check = { prop: 'backgroundColor', pass: false };
    const t = mismatchTokens(check, { styles: { backgroundColor: '#0046A8' } }, { backgroundColor: 'rgb(0, 88, 210)' }, vars);
    assert.deepEqual(t, { expectedTokens: ['--b'], observedTokens: ['--a'] });
  });
  it('returns null for a passing check or a pseudo property', () => {
    assert.equal(mismatchTokens({ prop: 'backgroundColor', pass: true }, { styles: {} }, {}, vars), null);
    assert.equal(mismatchTokens({ prop: 'boxWidth', pass: false }, { styles: { boxWidth: '1px' } }, { boxWidth: '2px' }, vars), null);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scripts/__tests__/audit/15-style-parity.spec.mjs`
Expected: FAIL — `mismatchTokens` is not exported.

- [ ] **Step 3: Implement**

```js
import { attributeTokens, formatTokens } from './lib/token-match.mjs';

/** Tokens for one failing, non-pseudo check; null otherwise. Pure — exported for tests. */
export function mismatchTokens(check, exp, actualValues, vars, opts = {}) {
  if (check.pass || PSEUDO_PROPS.includes(check.prop)) return null;
  return attributeTokens(check.prop, exp.styles[check.prop], actualValues[check.prop], vars, opts);
}

/** Every custom property the element sees, resolved. Read only when a check fails. */
async function readCustomProperties(page, selector) {
  return page
    .locator(selector)
    .first()
    .evaluate(el => {
      const cs = getComputedStyle(el);
      const out = {};
      for (let i = 0; i < cs.length; i++) {
        if (cs[i].startsWith('--')) out[cs[i]] = cs.getPropertyValue(cs[i]).trim();
      }
      return out;
    });
}
```

Replace the loop at `:221-234`:

```js
          const checks = compareExpectation(exp.styles, actual, { tolerance });
          const needsVars = checks.some(c => !c.pass && !PSEUDO_PROPS.includes(c.prop));
          const vars = needsVars ? await readCustomProperties(session.page, exp.target) : {};
          for (const check of checks) {
            checked++;
            const tokens = mismatchTokens(check, exp, actual, vars, { tolerance });
            stateResult.checks.push({ target: exp.target, node: exp.node, ...check, ...(tokens ?? {}) });
            if (!check.pass) {
              findings.push(
                finding({
                  severity: 'error',
                  code: 'STYLE-MISMATCH',
                  file: manifestRel,
                  message: `${state.name} › ${exp.target} › ${check.prop}: Figma ${exp.node} = ${check.expected}, rendered ${check.actual}${formatTokens(tokens)}`,
                }),
              );
            }
          }
```

- [ ] **Step 4: Run spec, then live**

```bash
node --test scripts/__tests__/audit/15-style-parity.spec.mjs
node scripts/audit/15-style-parity.mjs mud-date-picker --json > .audit-screenshots/mud-date-picker.style.after.json; echo $?
node -e '
const r = require("./.audit-screenshots/mud-date-picker.style.after.json");
const fails = r.meta.states.flatMap(s => s.checks).filter(c => c.pass === false && !["boxWidth","boxHeight","textContent"].includes(c.prop));
const both = fails.filter(c => Array.isArray(c.expectedTokens) && Array.isArray(c.observedTokens));
const named = fails.filter(c => (c.expectedTokens?.length || c.observedTokens?.length));
console.log("fails", fails.length, "with arrays", both.length, "named", named.length, "checked", r.meta.propertiesChecked, "failed", r.meta.propertiesFailed);
'
```

Expected: `with arrays` = `fails`; `named` ≥ 1; `checked` and `failed` equal the Phase 0 baseline. Check 5 named rows by
hand (acceptance bar) and record the numbers in § Measured.

- [ ] **Step 5: Commit**

```bash
npx prettier --write scripts/audit/15-style-parity.mjs scripts/__tests__/audit/15-style-parity.spec.mjs
yarn lint
git add scripts/audit/15-style-parity.mjs scripts/__tests__/audit/15-style-parity.spec.mjs
git commit -F - <<'EOF'
feat(audit): name the design tokens behind every style mismatch

Refs #87
EOF
```

### Task 2.2: Masks in the pixel diff

**Files:**
- Modify: `scripts/audit/lib/image-diff.mjs` (`applyMasks`, `diffImages` option `masks`)
- Modify: `scripts/visual-diff.mjs` (`--masks <json>`, output `maskedPixels`)
- Modify: `scripts/audit/lib/state-page.mjs:146-163` (`captureState` accepts `mask`, returns `clip` and `maskRects`; new pure `maskRects`)
- Modify: `scripts/audit/11-pixel-diff-states.mjs` (`analyzeManifest` passes `mask`, `compare`/`runVisualDiff` pass rects, entry carries `maskedPixels`, `findingsFor` mentions it)
- Test: `scripts/__tests__/audit/image-diff.spec.mjs`, `scripts/__tests__/audit/state-page.spec.mjs`

**Interfaces:**
- Consumes: `resolveState(...).mask` (Task 1.2).
- Produces: `applyMasks(img, rects, background) → number` (pixels painted, in place); `diffImages(..., { masks })` returns `maskedPixels`; `maskRects(boxes, clip, scale) → Array<{x,y,width,height}>` in `state-page.mjs`; `captureState(page, { selector, bleed, mask = [] }, outputPath) → { path, box, bleed, clip, maskRects }`.

- [ ] **Step 1: Write the failing specs**

`image-diff.spec.mjs` (add `applyMasks` to the import):

```js
describe('image-diff: masks', () => {
  it('paints a rect with the background and counts each pixel once', () => {
    const img = image(4, 4, [0, 0, 0, 255]);
    const n = applyMasks(img, [{ x: 0, y: 0, width: 2, height: 2 }, { x: 1, y: 1, width: 2, height: 2 }], [255, 255, 255]);
    assert.equal(n, 7);
    assert.deepEqual(pixel(img, 1, 1), [255, 255, 255, 255]);
    assert.deepEqual(pixel(img, 3, 3), [0, 0, 0, 255]);
  });

  it('clips rects to the canvas', () => {
    assert.equal(applyMasks(image(2, 2, [0, 0, 0, 255]), [{ x: 1, y: 1, width: 5, height: 5 }]), 1);
  });

  it('removes a difference inside the mask from the diff and reports the masked pixels', () => {
    const ref = image(10, 10, [255, 255, 255, 255]);
    const cap = image(10, 10, [255, 255, 255, 255], (x, y) => (x < 2 && y < 2 ? [0, 0, 0, 255] : null));
    assert.ok(diffImages(ref, cap).diffPixels > 0);
    const r = diffImages(ref, cap, { masks: [{ x: 0, y: 0, width: 2, height: 2 }] });
    assert.equal(r.diffPixels, 0);
    assert.equal(r.maskedPixels, 4);
  });
});
```

`state-page.spec.mjs` (add `maskRects` to the import):

```js
describe('state-page: maskRects', () => {
  it('maps element boxes into capture pixels relative to the clip', () => {
    assert.deepEqual(maskRects([{ x: 110, y: 60, width: 20, height: 10 }], { x: 100, y: 50, width: 200, height: 100 }, 2), [
      { x: 20, y: 20, width: 40, height: 20 },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test scripts/__tests__/audit/image-diff.spec.mjs scripts/__tests__/audit/state-page.spec.mjs`
Expected: FAIL — `applyMasks` / `maskRects` not exported.

- [ ] **Step 3: Implement `applyMasks` and the `masks` option** (`lib/image-diff.mjs`)

```js
/** Paint rects (image pixels) with `background`, in place. Returns distinct pixels painted inside the canvas. */
export function applyMasks(img, rects = [], background = WHITE) {
  const painted = new Uint8Array(img.width * img.height);
  let count = 0;
  for (const r of rects) {
    const x0 = Math.max(0, Math.floor(r.x));
    const y0 = Math.max(0, Math.floor(r.y));
    const x1 = Math.min(img.width, Math.ceil(r.x + r.width));
    const y1 = Math.min(img.height, Math.ceil(r.y + r.height));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = y * img.width + x;
        const i = p * 4;
        img.data[i] = background[0];
        img.data[i + 1] = background[1];
        img.data[i + 2] = background[2];
        img.data[i + 3] = 255;
        if (!painted[p]) {
          painted[p] = 1;
          count++;
        }
      }
    }
  }
  return count;
}
```

In `diffImages`, add `masks = []` to the options, and after `a`/`b` are built:

```js
  const maskedPixels = applyMasks(a, masks, background);
  applyMasks(b, masks, background);
```

Note `padImage` returns the same object when no padding is needed and `flattenImage` always allocates, so painting `a`/`b`
never mutates the caller's PNGs. Return `maskedPixels` beside `diffPixels`. Update the JSDoc `@param`/`@returns`.

- [ ] **Step 4: `visual-diff.mjs`** — parse `--masks` and pass it through:

```js
let masks = [];
const masksArg = getArg('masks', '');
if (masksArg) {
  try {
    masks = JSON.parse(masksArg);
    if (!Array.isArray(masks)) throw new Error('not an array');
  } catch (e) {
    console.error(`ERROR: --masks must be a JSON array of {x, y, width, height}: ${e.message}`);
    process.exit(2);
  }
}
```

Pass `masks` to `diffImages(img1, img2, { threshold, align, background: parseHexColor(background), masks })`, add
`maskedPixels: diff.maskedPixels` to `result`, and add `[--masks <json>]` to the usage line.

- [ ] **Step 5: `state-page.mjs`**

```js
/** Element boxes (CSS px, page) → rects in capture pixels relative to the clip. Pure — exported for tests. */
export function maskRects(boxes, clip, scale) {
  return boxes.map(b => ({
    x: Math.round((b.x - clip.x) * scale),
    y: Math.round((b.y - clip.y) * scale),
    width: Math.round(b.width * scale),
    height: Math.round(b.height * scale),
  }));
}
```

In `captureState`, change the signature to `{ selector, bleed = 'auto', mask = [] }` and, after `clip` is computed:

```js
  const boxes = [];
  for (const sel of mask) {
    const all = page.locator(sel);
    const n = await all.count();
    if (n === 0) throw new Error(`mask target not found: ${sel}`);
    for (let i = 0; i < n; i++) {
      const b = await all.nth(i).boundingBox();
      if (b) boxes.push(b);
    }
  }
  const scale = await page.evaluate(() => window.devicePixelRatio);
```

Return `{ path: outputPath, box, bleed: ext, clip, maskRects: maskRects(boxes, clip, scale) }`.

- [ ] **Step 6: `11-pixel-diff-states.mjs`**

- `analyzeManifest`: `const shot = await captureState(session.page, { ...state.capture, mask: state.mask }, screenshotPath);` and `entry.maskRects = shot.maskRects;`.
- `compare({ …, masks })` → `runVisualDiff({ …, masks })`; in `runVisualDiff` push `'--masks', JSON.stringify(masks)` when `masks?.length`; `compare` returns `maskedPixels: diff.maskedPixels ?? 0`.
- Call site: `compare({ …, masks: entry.maskRects })`.
- `findingsFor`: when `themed.maskedPixels > 0`, append to the FAIL / WARNING messages ` (${themed.maskedPixels} px masked)`, and push one `info` finding `PIXEL-MASKED` with message `${label}: ${themed.maskedPixels} px masked by the manifest — not compared.`

- [ ] **Step 7: Run specs, then live on a temporary manifest copy**

```bash
node --test "scripts/__tests__/audit/*.spec.mjs"
TMP_MANIFEST=$(mktemp).json
node -e '
const m = require("./src/components/mud-date-picker/test/mud-date-picker.figma.json");
const s = m.states.find(x => x.pixel !== false);
s.mask = ["mud-date-picker .day-cell"];
require("fs").writeFileSync(process.argv[1], JSON.stringify(m));
console.log("masked state:", s.name);
' "$TMP_MANIFEST"
node scripts/audit/11-pixel-diff-states.mjs mud-date-picker --manifest "$TMP_MANIFEST" --json > .audit-screenshots/mask-probe.json; echo $?
node -e 'const r=require("./.audit-screenshots/mask-probe.json"); console.log(JSON.stringify((r.meta?.states??[]).map(s=>[s.name,(s.light??s.dark)?.maskedPixels])))'
```

Expected: the masked state reports `maskedPixels > 0`. `Read` its `.diff.png`: no red inside the masked cells. If
`.day-cell` is not the right selector for the chosen state, pick a selector from that state's `expect` list. Record in
§ Measured.

- [ ] **Step 8: Commit**

```bash
npx prettier --write scripts/audit/lib/image-diff.mjs scripts/visual-diff.mjs scripts/audit/lib/state-page.mjs scripts/audit/11-pixel-diff-states.mjs scripts/__tests__/audit/image-diff.spec.mjs scripts/__tests__/audit/state-page.spec.mjs
yarn lint
git add scripts/audit/lib/image-diff.mjs scripts/visual-diff.mjs scripts/audit/lib/state-page.mjs scripts/audit/11-pixel-diff-states.mjs scripts/__tests__/audit/image-diff.spec.mjs scripts/__tests__/audit/state-page.spec.mjs
git commit -F - <<'EOF'
feat(audit): mask mock-data regions in the Figma pixel diff and report them

Refs #87
EOF
```

### Task 2.3: `figma-refs` — REST only, `--check`, export version

**Files:**
- Modify: `scripts/audit/figma-refs.mjs` (header, remove `mcpCall` and the no-token print, add `citedNodeIds`, `buildNodesUrl`, `componentSetIds`, `checkCoverage`, `staleness`, the `--check` flag, `export.json`)
- Test: `scripts/__tests__/audit/figma-refs.spec.mjs` (delete the `mcpCall` describe; add the cases below)
- Create: `scripts/__tests__/audit/__fixtures__/figma-nodes.json` (trimmed from the 2026-09-17 probe shape)

**Interfaces:**
- Consumes: `normalizeNodeId`, `loadManifest`, `manifestPathFor` (`figma-manifest.mjs`); `buildResult`, `finding`, `emit` (`lib/json-output.mjs`).
- Produces:
  - `citedNodeIds(manifest) → string[]` (state and expectation nodes, `shared` included, sorted).
  - `buildNodesUrl(fileKey, ids) → string` (`/v1/files/:key/nodes?ids=…&depth=1`).
  - `componentSetIds(nodesResponse) → string[]` — from `nodes[id].components[id].componentSetId`, plus any cited node whose `document.type` is `COMPONENT_SET`.
  - `checkCoverage(manifest, citedResponse, setsResponse) → { version, lastModified, gone: string[], missing: Array<{ setId, setName, node, name }> }`.
  - `staleness(exportMeta | null, version) → 'none' | 'never-exported' | 'changed'`.
  - Finding codes: `FIGMA-NODE-GONE` (error), `FIGMA-STATE-MISSING` (warning), `FIGMA-REFERENCE-STALE` (warning), `FIGMA-NO-TOKEN` (error).
  - `.audit-figma/<name>/export.json`: `{ fileKey, version, lastModified, exportedAt }`.

Facts this task relies on, probed 2026-09-17 against file `doJ7tDY0PlQ0PqMgbpFVIC` with `FIGMA_TOKEN`:
`GET /v1/files/:key/nodes?ids=157:4570,158:402,99999:1&depth=1` → 200; top-level keys
`name,lastModified,thumbnailUrl,version,role,editorType,linkAccess,nodes`; `nodes["99999:1"]` is `null`;
`nodes["158:402"].components["158:402"].componentSetId` = `"158:401"`.

- [ ] **Step 1: Create the fixture** `scripts/__tests__/audit/__fixtures__/figma-nodes.json`

```json
{
  "cited": {
    "version": "2399758890123564281",
    "lastModified": "2026-09-16T09:26:19Z",
    "nodes": {
      "158:402": {
        "document": { "id": "158:402", "type": "COMPONENT", "name": "State=Default", "children": [] },
        "components": { "158:402": { "name": "State=Default", "componentSetId": "158:401" } }
      },
      "99999:1": null
    }
  },
  "sets": {
    "version": "2399758890123564281",
    "nodes": {
      "158:401": {
        "document": {
          "id": "158:401",
          "type": "COMPONENT_SET",
          "name": ".day-cell",
          "children": [
            { "id": "158:402", "type": "COMPONENT", "name": "State=Default" },
            { "id": "158:404", "type": "COMPONENT", "name": "State=Hover" },
            { "id": "158:406", "type": "COMPONENT", "name": "State=Selected" },
            { "id": "158:499", "type": "FRAME", "name": "notes" }
          ]
        }
      }
    }
  }
}
```

- [ ] **Step 2: Write the failing specs** (in `figma-refs.spec.mjs`; delete `describe('figma-refs: mcpCall', …)` and `mcpCall` from the import; add the new names)

```js
import { readFileSync } from 'node:fs';

const probe = JSON.parse(readFileSync(new URL('./__fixtures__/figma-nodes.json', import.meta.url), 'utf8'));
const coverageManifest = {
  figma: { fileKey: 'doJ7tDY0PlQ0PqMgbpFVIC', skip: [{ node: '158:406', reason: 'selected is covered by the date-picker state' }] },
  defaults: { story: 'molecules-date-picker--default' },
  shared: { base: [{ target: 'x', styles: { color: '#000' }, node: '99999:1' }] },
  states: [{ name: 'default', node: '158:402', expect: [{ use: 'base' }] }],
};

describe('figma-refs: citedNodeIds', () => {
  it('collects state, expectation and shared nodes', () => {
    assert.deepEqual(citedNodeIds(coverageManifest), ['158:402', '99999:1']);
  });
});

describe('figma-refs: buildNodesUrl', () => {
  it('requests depth 1 for de-duplicated ids', () => {
    assert.equal(
      buildNodesUrl('abc', ['1:2', '1:2', '3:4']),
      'https://api.figma.com/v1/files/abc/nodes?ids=1%3A2%2C3%3A4&depth=1',
    );
  });
});

describe('figma-refs: coverage', () => {
  it('finds component sets, gone nodes and uncovered variants, honouring skip', () => {
    assert.deepEqual(componentSetIds(probe.cited), ['158:401']);
    assert.deepEqual(checkCoverage(coverageManifest, probe.cited, probe.sets), {
      version: '2399758890123564281',
      lastModified: '2026-09-16T09:26:19Z',
      gone: ['99999:1'],
      missing: [{ setId: '158:401', setName: '.day-cell', node: '158:404', name: 'State=Hover' }],
    });
  });
});

describe('figma-refs: staleness', () => {
  it('distinguishes never exported, changed and current', () => {
    assert.equal(staleness(null, '1'), 'never-exported');
    assert.equal(staleness({ version: '1' }, '2'), 'changed');
    assert.equal(staleness({ version: '2' }, '2'), 'none');
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `node --test scripts/__tests__/audit/figma-refs.spec.mjs`
Expected: FAIL — new functions not exported.

- [ ] **Step 4: Implement the pure functions** (replace `mcpCall`)

```js
/** Every node a manifest cites. Pure. */
export function citedNodeIds(manifest) {
  const ids = new Set();
  const add = id => id && ids.add(normalizeNodeId(id));
  for (const s of manifest.states ?? []) {
    add(s.node);
    for (const e of s.expect ?? []) add(e.node);
  }
  for (const list of Object.values(manifest.shared ?? {})) for (const e of list) add(e.node);
  return [...ids].sort();
}

/** Figma REST nodes endpoint, one level of children. Pure. */
export function buildNodesUrl(fileKey, nodeIds) {
  const params = new URLSearchParams({ ids: [...new Set(nodeIds)].join(','), depth: '1' });
  return `${API}/files/${encodeURIComponent(fileKey)}/nodes?${params.toString()}`;
}

/** Component sets the cited nodes belong to (or are). Pure. */
export function componentSetIds(response) {
  const ids = new Set();
  for (const [id, entry] of Object.entries(response.nodes ?? {})) {
    if (!entry) continue;
    if (entry.document?.type === 'COMPONENT_SET') ids.add(id);
    const setId = entry.components?.[id]?.componentSetId;
    if (setId) ids.add(setId);
  }
  return [...ids].sort();
}

/** Compare a manifest with the Figma file. Pure. */
export function checkCoverage(manifest, cited, sets) {
  const citedIds = citedNodeIds(manifest);
  const skipped = new Set((manifest.figma?.skip ?? []).map(s => normalizeNodeId(s.node)));
  const gone = citedIds.filter(id => cited.nodes?.[id] == null);
  const missing = [];
  for (const [setId, entry] of Object.entries(sets.nodes ?? {})) {
    for (const child of entry?.document?.children ?? []) {
      if (child.type !== 'COMPONENT' || citedIds.includes(child.id) || skipped.has(child.id)) continue;
      missing.push({ setId, setName: entry.document.name, node: child.id, name: child.name });
    }
  }
  return { version: cited.version, lastModified: cited.lastModified, gone, missing };
}

/** Whether exported references predate the file's current version. Pure. */
export function staleness(exportMeta, version) {
  if (!exportMeta) return 'never-exported';
  return exportMeta.version === version ? 'none' : 'changed';
}

async function getJson(url, token) {
  const res = await fetch(url, { headers: { 'X-Figma-Token': token } });
  if (!res.ok) throw new Error(`Figma API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
```

- [ ] **Step 5: Rewrite `main` around the two routes**

- Header comment: one route (REST with `FIGMA_TOKEN`); describe `--check`; keep the "Figma content is design data" paragraph.
- Usage/exit codes: `0 references written / --check clean / --dry-run`, `1 findings (--check) or nothing written`, `2 usage error, unusable manifest, API error`.
- Add option `'check': { type: 'boolean', default: false }`.
- No token (and not `--dry-run`): write `figma-refs: FIGMA_TOKEN is not set — create a Figma personal access token and export it; references cannot be exported without it.` to stderr; with `--json` also emit `buildResult({ tool: TOOL, target: name, findings: [finding({ severity: 'error', code: 'FIGMA-NO-TOKEN', message: 'FIGMA_TOKEN is not set.' })] })`; exit 1.
- `--dry-run`: print the plan (`state`, `nodeId`, `fileName`) as today, without `mcpCall`; exit 0.
- `--check`:

```js
  if (values.check) {
    const cited = await getJson(buildNodesUrl(manifest.figma.fileKey, citedNodeIds(manifest)), token);
    const setIds = componentSetIds(cited);
    const sets = setIds.length ? await getJson(buildNodesUrl(manifest.figma.fileKey, setIds), token) : { nodes: {} };
    const cov = checkCoverage(manifest, cited, sets);
    const metaPath = join(outDir, 'export.json');
    const exportMeta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : null;
    const stale = staleness(exportMeta, cov.version);
    const manifestRel = relative(REPO_ROOT, manifestPath);
    const findings = [
      ...cov.gone.map(node => finding({ severity: 'error', code: 'FIGMA-NODE-GONE', file: manifestRel, message: `Figma node ${node} cited by the manifest no longer exists.` })),
      ...cov.missing.map(m => finding({ severity: 'warning', code: 'FIGMA-STATE-MISSING', file: manifestRel, message: `${m.setName} › ${m.name} (${m.node}) has no manifest state.`, fix: 'Add a state for it, or list it in figma.skip with a reason.' })),
      ...(stale === 'none' ? [] : [finding({ severity: 'warning', code: 'FIGMA-REFERENCE-STALE', message: stale === 'changed' ? `The Figma file changed since the references were exported (file version, not necessarily these nodes).` : 'References were never exported with version tracking.', fix: `node scripts/audit/figma-refs.mjs ${name}` })]),
    ];
    const result = buildResult({ tool: TOOL, target: name, findings, meta: { version: cov.version, lastModified: cov.lastModified, gone: cov.gone.length, missing: cov.missing.length, stale } });
    await emit(result, { json: values.json });
    process.exit(findings.length ? EXIT_FINDINGS : 0);
  }
```

- Export path (token present, no `--check`): before `downloadViaRest`, fetch `buildNodesUrl(fileKey, plan.map(p => p.nodeId))`; after a run with no failed download write `export.json` `{ fileKey, version, lastModified, exportedAt: new Date().toISOString() }` into `outDir`.
- Imports: add `existsSync`, `readFileSync` from `node:fs`; `buildResult`, `emit`, `finding` from `./lib/json-output.mjs`.

`emit(result, opts)` reads `opts.json` (`lib/json-output.mjs:28`), so `{ json: values.json }` is the shape it needs.

- [ ] **Step 6: Run spec, then live**

```bash
node --test scripts/__tests__/audit/figma-refs.spec.mjs
for c in mud-date-picker mud-date-input mud-table; do
  node scripts/audit/figma-refs.mjs $c; echo "export $c $?"
  node scripts/audit/figma-refs.mjs $c --check --json > .audit-figma/$c.check.json; echo "check $c $?"
  node -e 'const r=require(process.argv[1]); console.log(process.argv[2], JSON.stringify(r.meta))' "./.audit-figma/$c.check.json" $c
done
env -u FIGMA_TOKEN -u FIGMA_ACCESS_TOKEN -u FIGMA_API_KEY node scripts/audit/figma-refs.mjs mud-table; echo "no-token $?"
```

Expected: exports exit 0; checks exit 0 or 1, `stale: "none"` right after export; no-token exit 1 with the message.
`gone > 0` on any component → stop and return to Dan (Global Constraints). Record `missing` counts in § Measured — they
are coverage findings for the component owners, not fixed here.

- [ ] **Step 7: Commit**

```bash
npx prettier --write scripts/audit/figma-refs.mjs scripts/__tests__/audit/figma-refs.spec.mjs scripts/__tests__/audit/__fixtures__/figma-nodes.json
yarn lint
git add scripts/audit/figma-refs.mjs scripts/__tests__/audit/figma-refs.spec.mjs scripts/__tests__/audit/__fixtures__/figma-nodes.json
git commit -F - <<'EOF'
feat(audit): check manifest coverage and reference freshness against Figma

figma-refs --check reports Figma variants no manifest state covers, cited
nodes that no longer exist, and references exported before the file last
changed. The Framelink MCP route is removed: no configured server provides it.

Refs #87
EOF
```

---

## Phase 3 — Skill, agent, QA doc, consumers

**Executor**: Opus 5 · medium · wave D · inline

### Task 3.1: `SKILL.md`

**Files:** Modify `.claude/skills/pixel-perfect/SKILL.md`

- [ ] **Step 1: Apply the edits**
  - `:10` → `**Not for** cloning an external website or screenshot into code.`
  - Step 0 route table (`:43-51`): two rows — official Figma MCP (design extraction, step 1) and Figma REST with `FIGMA_TOKEN` (references, step 3, and `--check`). Delete the Framelink row. "If no route works" → "No `FIGMA_TOKEN` → references cannot be exported: style parity still runs, the pixel diff reports `PIXEL-NO-REFERENCE`, and the report lists the pixel states under Not verified."
  - Pipeline table: step 1 adds `node scripts/audit/figma-refs.mjs <name> --check --json` after extraction ("uncovered variants, gone nodes, stale references"); step 6 unchanged.
  - Step 2 authoring rules: add bullets for `shared` + `use`, `mask`, `figma.skip` (one sentence each, same wording as the `figma-manifest.mjs` header).
  - Step 3 (`:107-113`): REST only; the export writes `export.json`; `--check` reports `FIGMA-REFERENCE-STALE`.
  - Step 4: `STYLE-MISMATCH` rows carry `observedTokens` / `expectedTokens`; "several names = the computed style cannot say which one the CSS used; read the component CSS".
  - Step 5 (`:132`): thresholds cite `DEFAULT_PASS` / `DEFAULT_WARN` in `scripts/audit/lib/image-diff.mjs` instead of restating numbers; mock-data states use `mask`, and masked pixels are reported (`PIXEL-MASKED`).
  - New section `## Rule index`, before Step 6:

```markdown
## Rule index

| Rule | Enforced by | Codes |
| --- | --- | --- |
| Manifest is well-formed; every expectation cites a node | script — `lib/figma-manifest.mjs` | `STYLE-MANIFEST-INVALID`, `PIXEL-MANIFEST-INVALID` |
| No manifest → nothing verified | script — `15-style-parity` | `STYLE-NO-MANIFEST` |
| Every Figma variant has a state or a skip reason | script — `figma-refs --check` | `FIGMA-STATE-MISSING` |
| Cited nodes exist | script — `figma-refs --check` | `FIGMA-NODE-GONE` |
| References match the current file | script — `figma-refs --check` | `FIGMA-REFERENCE-STALE` |
| References can be exported | script — `figma-refs` | `FIGMA-NO-TOKEN` |
| Exact computed values, tokens named | script — `15-style-parity` | `STYLE-MISMATCH` |
| No element without a design | script — `15-style-parity` | `STYLE-UNEXPECTED-ELEMENT` |
| Target renders; state reachable | script — `15-style-parity` | `STYLE-TARGET-NOT-FOUND`, `STYLE-STATE-FAILED` |
| Canvas size matches | script — `11-pixel-diff-states` | `PIXEL-SIZE-MISMATCH` |
| Pixel difference within thresholds | script — `11-pixel-diff-states` | `PIXEL-DIFF-WARNING`, `PIXEL-DIFF-FAIL` |
| A reference exists for every pixel state | script — `11-pixel-diff-states` | `PIXEL-NO-REFERENCE` |
| Masked regions are disclosed | script — `11-pixel-diff-states` | `PIXEL-MASKED` |
| Capture succeeded | script — `11-pixel-diff-states` | `PIXEL-CAPTURE-FAILED`, `PIXEL-DIFF-SKIPPED` |
| Story mode (no manifest) | script — `11-pixel-diff-states` | `PIXEL-NO-REFERENCES`, `PIXEL-NO-STORIES` |
| Values are copied from Figma, never inferred | model — step 1–2 | — |
| Drift vs not in design vs design question vs tooling limit | model — step 6 | — |
| A WARNING diff image is explained | model — step 5 | — |
| Figma contradicts itself → design question | model — step 6 | — |
```

  - Step 7 report template: first line `**Verdict: FAIL | INCOMPLETE | WARN | PASS**` with the rule "FAIL if any error finding; INCOMPLETE if anything is under Not verified; WARN if any warning; PASS otherwise." Add a `Tokens` column to the Drift table.

- [ ] **Step 2: Verify codes against the scripts**

```bash
grep -ohE "code: '(STYLE|PIXEL|FIGMA)-[A-Z-]+'" scripts/audit/11-pixel-diff-states.mjs scripts/audit/15-style-parity.mjs scripts/audit/figma-refs.mjs | sort -u
grep -oE '`(STYLE|PIXEL|FIGMA)-[A-Z-]+`' .claude/skills/pixel-perfect/SKILL.md | sort -u
```

Expected: the two sets are equal (the spec in Task 4.2 makes this permanent).

- [ ] **Step 3: Commit** (`docs(skills): make the pixel-perfect skill run its scripts and index its rules`, `Refs #87`), staging only `SKILL.md`, after `npx prettier --write` and `node scripts/docs/check-ai-docs.mjs`.

### Task 3.2: `pixel-perfect-verifier.md`

**Files:** Modify `.claude/agents/pixel-perfect-verifier.md`

- [ ] **Step 1: Apply the edits**
  - Frontmatter `tools`: remove `mcp__figma-mcp__get_figma_data`, `mcp__figma-mcp__download_figma_images`.
  - Inputs: required `componentName`; `figmaUrl` (preferred — carries file key and node) or `figmaNodeId`, read with the manifest's `figma.fileKey`. Remove `acceptThreshold` (thresholds live in `lib/image-diff.mjs`). Keep `storybookBaseUrl`, `statesToVerify`.
  - Procedure step 2: manifest exists → `node scripts/audit/figma-refs.mjs <name> --check --json` and report `FIGMA-*` findings. Missing → return `manifest-missing` with the list of Figma variants (name + node id) from `mcp__figma__get_metadata`; **do not draft values**.
  - Step 3: REST route only; no token → `FIGMA-NO-TOKEN`, continue with style parity, list pixel states under Not verified.
  - Step 6: token names come from the `STYLE-MISMATCH` row; the agent reports them and does not guess one the row does not name.
  - Report: first line `Verdict: FAIL | INCOMPLETE | WARN | PASS` (same rule as the skill); Evidence adds `Coverage: <missing> uncovered variants, <gone> gone nodes, references <stale>`; Drift table gains `Tokens`; delete the `Draft manifest` section; Acceptance adds "0 `FIGMA-NODE-GONE`; every `FIGMA-STATE-MISSING` added or skipped with a reason".
  - Failure modes, add rows: `manifest-missing` (no `<name>.figma.json`); `story-not-found` (`STYLE-STATE-FAILED` / `PIXEL-CAPTURE-FAILED` with a Storybook 404 or missing story id → report the id from `05-story-exports`); `references-missing` (`PIXEL-NO-REFERENCE`, or `FIGMA-NO-TOKEN`); `figma-node-gone` (`FIGMA-NODE-GONE` → stop, the manifest cites a deleted node). Replace the `figma-unavailable` row's cause with "official Figma MCP not authenticated (`/mcp`) and no `FIGMA_TOKEN`".

- [ ] **Step 2: Commit** (`docs(agents): align pixel-perfect-verifier with the tools and scripts it has`, `Refs #87`), staging only the agent file, after prettier and the docs checker.

### Task 3.3: `_agents/pixel-perfect-qa.md` and `_agents/mcp-tools.md`

**Files:** Modify `_agents/pixel-perfect-qa.md`, `_agents/mcp-tools.md:97`

- [ ] **Step 1: Apply the edits**
  - Loop step 1: "a working Figma route" → "`FIGMA_TOKEN` for references; the official Figma MCP for design extraction".
  - Loop step 3: after writing the manifest, run `node scripts/audit/figma-refs.mjs <name> --check`.
  - Tolerances: "Zero tolerance — computed values, checked by `15-style-parity` (including `lineHeight`)". "Rendering tolerance — glyph pixels only, judged on the diff image". Pixel diff line → "thresholds: `DEFAULT_PASS` / `DEFAULT_WARN` in `scripts/audit/lib/image-diff.mjs` (PASS below the first, WARNING below the second, FAIL at or above it)."
  - States table: add rows "Mock data (dates, avatars) | `mask: [selector]` — reported, not hidden" and "Variant deliberately not covered | `figma.skip: [{ node, reason }]`".
  - `mcp-tools.md:97`: drop the Framelink sentence; keep OAuth; "For pixel-perfect references set `FIGMA_TOKEN` (see the `pixel-perfect` skill, step 0)."

- [ ] **Step 2: Commit** (`docs(agents): keep pixel-perfect tolerances and Figma access in one place`, `Refs #87`).

### Task 3.4: Consumers

**Files:** Modify `.claude/agents/new-component.md:159`, `redesign-component.md:209,274`, `refactor-component.md:105,112`, `custom-component.md:142,145`, `.claude/skills/parallel-aux-tasks/SKILL.md:37,47,55`

- [ ] **Step 1: Apply the edits**
  - `new-component.md:159`, `redesign-component.md:209` → `Agent(subagent_type="pixel-perfect-verifier", prompt="componentName=mud-<name>, figmaUrl=<figma url with node-id>")`.
  - `redesign-component.md:274` → `- pixel-perfect-verifier: Verdict <FAIL|INCOMPLETE|WARN|PASS> (<n> style mismatches, pixel PASS/WARNING/FAIL <a>/<b>/<c>, <m> uncovered variants)`.
  - `refactor-component.md:105` → `prompt="componentName=mud-<name>, figmaUrl=<url-if-available>"`; `:112` → "`pixel-perfect-verifier`: Verdict PASS or WARN against the existing manifest; no manifest → `manifest-missing`, and the before/after screenshots of Step 5 are the regression check" (D3).
  - `custom-component.md:142,145`: remove the verifier from the parallel set and from the sentence; the set becomes four (D2). Fix any "full-5" wording in that file to match.
  - `parallel-aux-tasks/SKILL.md`: `:47` → `pixel-perfect-verifier   (read-only)  — manifest checks; before/after screenshots stay with refactor-component Step 5`; full-5 note: "`custom-component` dispatches this set without `pixel-perfect-verifier` (no Figma node to verify against)".
  - `parallel-aux-tasks/SKILL.md` (D6, F20): before the dispatch example, add "Snapshot tracked changes before dispatching" with the first half of the block below; in the completion checklist (`:164-170`) add "✅ Read-only legs wrote nothing: the second half of the block prints nothing." Block, verbatim:

```bash
# aux-write-check — before the parallel dispatch
git status --porcelain=v1 > "${TMPDIR:-/tmp}/aux-before.txt"
# after every leg has reported: lines that are new or changed since the snapshot, minus the writer legs' own files
git status --porcelain=v1 | diff "${TMPDIR:-/tmp}/aux-before.txt" - | grep '^>' | grep -v -E '\.stories\.ts$|\.spec\.tsx$'
```

  The check sees a file whose status line changes (new, deleted, first modification). It does not see a second edit to a
  file the orchestrator had already modified before the dispatch — stated under Not verified.

- [ ] **Step 2: Verify no consumer passes a removed input**

```bash
grep -rnE "pixel-perfect-verifier.*(threshold|figmaReferenceDir|useBaseline|figmaNodeId=)" .claude
grep -rn "pre-refactor baseline" .claude/skills/parallel-aux-tasks .claude/agents/refactor-component.md
```

Expected: no output from either.

- [ ] **Step 3: Prove the write check fires**

```bash
git status --porcelain=v1 > "${TMPDIR:-/tmp}/aux-before.txt"
touch src/components/mud-table/aux-probe.txt
git status --porcelain=v1 | diff "${TMPDIR:-/tmp}/aux-before.txt" - | grep '^>' | grep -v -E '\.stories\.ts$|\.spec\.tsx$'
rm src/components/mud-table/aux-probe.txt
```

Expected: exactly one line, `> ?? src/components/mud-table/aux-probe.txt`; after `rm`, re-running the last pipeline prints nothing.

- [ ] **Step 4: Commit** (`docs(agents): dispatch pixel-perfect-verifier with the inputs it accepts`, `Refs #87`), staging the five files by name.

---

## Phase 4 — Guards and mutation check

**Executor**: Opus 5 · medium · wave E · inline

### Task 4.1: Docs checker rule `mcp-server`

**Files:**
- Modify: `scripts/docs/check-ai-docs.mjs` (header rule list, new section before `// Core`, wiring in `checkAiDocs`)
- Test: `scripts/__tests__/check-ai-docs.spec.mjs`

**Interfaces:**
- Consumes: `readIfExists`, `findCodeSpans`, `makeHit`, `isDocScope`.
- Produces: rule id `mcp-server`.

- [ ] **Step 1: Write the failing spec** (append; reuse `makeFixture`/`pkgJson`)

```js
describe('mcp-server rule', () => {
  const mcp = JSON.stringify({ mcpServers: { figma: {}, playwright: {} } });

  it('flags a tool whose server .mcp.json does not configure, in agent frontmatter and in code spans', () => {
    const root = makeFixture({
      'package.json': pkgJson(),
      '.mcp.json': mcp,
      '.claude/agents/README.md': '| Agent |\n| --- |\n| `v` |\n',
      '.claude/agents/v.md': '---\nname: v\ntools: Read, mcp__figma__get_metadata, mcp__figma-mcp__get_figma_data\n---\n\nUse `mcp__playwright__browser_click` or `mcp__ghost__run`.\n',
    });
    assert.deepEqual(
      checkAiDocs({ root })
        .filter(h => h.ruleId === 'mcp-server')
        .map(h => [h.file, h.line]),
      [
        ['.claude/agents/v.md', 3],
        ['.claude/agents/v.md', 6],
      ],
    );
  });

  it('is silent without .mcp.json', () => {
    const root = makeFixture({ 'package.json': pkgJson(), '_agents/x.md': '`mcp__ghost__run`\n', 'AGENTS.md': '`_agents/x.md`\n' });
    assert.deepEqual(checkAiDocs({ root }).filter(h => h.ruleId === 'mcp-server'), []);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scripts/__tests__/check-ai-docs.spec.mjs`
Expected: FAIL — no `mcp-server` hits.

- [ ] **Step 3: Implement**

```js
// ---------------------------------------------------------------------------
// Rule: mcp-server
// ---------------------------------------------------------------------------

const MCP_TOOL_RE = /\bmcp__([a-z0-9-]+)__[a-z0-9_]+/gi;

function mcpServers(root) {
  const text = readIfExists(root, '.mcp.json');
  if (text === null) return null;
  return new Set(Object.keys(JSON.parse(text).mcpServers ?? {}));
}

function checkMcpServers(relPath, lines, servers) {
  const hits = [];
  lines.forEach((line, i) => {
    const frontmatterTools = relPath.startsWith('.claude/agents/') && /^tools:/.test(line);
    const segments = frontmatterTools ? [line] : findCodeSpans(line).map(s => s.content);
    for (const segment of segments) {
      for (const m of segment.matchAll(MCP_TOOL_RE)) {
        if (!servers.has(m[1])) {
          hits.push(makeHit(relPath, i + 1, 'mcp-server', `\`${m[0]}\` needs MCP server "${m[1]}", which .mcp.json does not configure`));
        }
      }
    }
  });
  return hits;
}
```

Header rule list:

```js
 *   mcp-server     — an `mcp__<server>__<tool>` name, in agent frontmatter
 *                     `tools:` or a doc code span, whose server `.mcp.json`
 *                     does not configure.
```

In `checkAiDocs`: `const servers = mcpServers(root);` beside `yarnNames`, and in the loop
`if (needsDocScope && servers) hits.push(...checkMcpServers(relPath, lines, servers));`.

The fixture's `v.md` line 3 is the frontmatter `tools:` line and line 6 carries both code spans; `mcp__figma__…` and
`mcp__playwright__…` are configured and do not hit. If the header regex also matches a `tools:` line whose first token
is a Markdown table in some other agent, the live run in Step 4 shows it.

- [ ] **Step 4: Run spec and the live checker**

```bash
node --test scripts/__tests__/check-ai-docs.spec.mjs
node scripts/docs/check-ai-docs.mjs
```

Expected: spec PASS; live `check-ai-docs: clean` (Phase 3 removed every `figma-mcp` name — 8 on `c4b3214`). A live hit on
any other server → stop and return to Dan.

- [ ] **Step 5: Commit** (`feat(docs): fail when an agent or doc names an MCP server .mcp.json does not configure`, `Refs #87`).

### Task 4.2: Skill parity spec

**Files:** Create `scripts/__tests__/pixel-perfect-skill.spec.mjs`

- [ ] **Step 1: Write the spec**

```js
/**
 * The pixel-perfect skill and agent against the scripts they run: every
 * finding code the scripts emit is indexed in the skill and every code the
 * skill cites is emitted, and every script path the docs name exists.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SCRIPTS = ['scripts/audit/11-pixel-diff-states.mjs', 'scripts/audit/15-style-parity.mjs', 'scripts/audit/figma-refs.mjs'];
const DOCS = ['.claude/skills/pixel-perfect/SKILL.md', '.claude/agents/pixel-perfect-verifier.md', '_agents/pixel-perfect-qa.md'];

const emitted = new Set(SCRIPTS.flatMap(f => [...read(f).matchAll(/code: '((?:STYLE|PIXEL|FIGMA)-[A-Z-]+)'/g)].map(m => m[1])));
const cited = new Set([...read(DOCS[0]).matchAll(/`((?:STYLE|PIXEL|FIGMA)-[A-Z-]+)`/g)].map(m => m[1]));

describe('pixel-perfect skill parity', () => {
  it('indexes every emitted code', () => {
    assert.deepEqual([...emitted].filter(c => !cited.has(c)).sort(), []);
  });

  it('cites no code the scripts do not emit', () => {
    assert.deepEqual([...cited].filter(c => !emitted.has(c)).sort(), []);
  });

  it('names only script paths that exist', () => {
    const missing = DOCS.flatMap(d => [...read(d).matchAll(/node (scripts\/[\w/.-]+\.mjs)/g)].map(m => m[1])).filter(
      p => !fs.existsSync(path.join(ROOT, p)),
    );
    assert.deepEqual(missing, []);
  });
});
```

- [ ] **Step 2: Run it**

Run: `node --test scripts/__tests__/pixel-perfect-skill.spec.mjs`
Expected: PASS. A failure means Task 3.1's index and the scripts disagree — fix the doc, not the spec.

- [ ] **Step 3: Commit** (`test(docs): keep the pixel-perfect skill in step with the codes its scripts emit`, `Refs #87`).

### Task 4.3: Mutation check

**Files:** Create `scripts/__tests__/audit/pixel-perfect.mutations.mjs` (not a `*.spec.mjs`: CI does not run it)

- [ ] **Step 1: Write the script**

```js
#!/usr/bin/env node
/**
 * Proves the pixel-perfect specs can fail: copies scripts/ to a temp dir,
 * applies one mutation at a time, and expects the named spec to fail. Each
 * substitution is asserted to have changed the file, so a stale anchor stops
 * the run instead of passing silently.
 *
 *   node scripts/__tests__/audit/pixel-perfect.mutations.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const MUTATIONS = [
  {
    file: 'scripts/audit/lib/figma-manifest.mjs',
    from: "if (typeof node !== 'string' || !NODE_ID_RE.test(node)) {",
    to: 'if (false) {',
    spec: 'scripts/__tests__/audit/figma-manifest.spec.mjs',
  },
  {
    file: 'scripts/audit/lib/style-values.mjs',
    from: 'Math.abs(a - b) <= tolerance + 1e-9',
    to: 'Math.abs(a - b) <= tolerance + 1',
    spec: 'scripts/__tests__/audit/15-style-parity.spec.mjs',
  },
  {
    file: 'scripts/audit/lib/image-diff.mjs',
    from: 'diffPercent < passThreshold',
    to: 'diffPercent <= passThreshold',
    spec: 'scripts/__tests__/audit/image-diff.spec.mjs',
  },
  {
    file: 'scripts/audit/lib/token-match.mjs',
    from: '!EXCLUDED.test(name) && ',
    to: '',
    spec: 'scripts/__tests__/audit/token-match.spec.mjs',
  },
  {
    file: 'scripts/audit/figma-refs.mjs',
    from: '|| skipped.has(child.id)',
    to: '',
    spec: 'scripts/__tests__/audit/figma-refs.spec.mjs',
  },
  {
    file: 'scripts/audit/lib/image-diff.mjs',
    from: 'const maskedPixels = applyMasks(a, masks, background);',
    to: 'const maskedPixels = 0;',
    spec: 'scripts/__tests__/audit/image-diff.spec.mjs',
  },
];

function runSpec(dir, spec) {
  return spawnSync(process.execPath, ['--test', spec], { cwd: dir, encoding: 'utf8' }).status;
}

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-mutations-'));
  fs.cpSync(path.join(ROOT, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  return dir;
}

let caught = 0;
for (const m of MUTATIONS) {
  const dir = sandbox();
  if (runSpec(dir, m.spec) !== 0) throw new Error(`baseline failed before mutating: ${m.spec}`);
  const target = path.join(dir, m.file);
  const before = fs.readFileSync(target, 'utf8');
  if (!before.includes(m.from)) throw new Error(`anchor not found in ${m.file}: ${m.from}`);
  const after = before.replace(m.from, m.to);
  if (after === before) throw new Error(`mutation changed nothing in ${m.file}`);
  fs.writeFileSync(target, after);
  const status = runSpec(dir, m.spec);
  const ok = status !== 0;
  if (ok) caught++;
  console.log(`${ok ? 'caught ' : 'MISSED '} ${m.file}: ${m.from} → ${m.to} (${m.spec} exit ${status})`);
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(`caught ${caught}/${MUTATIONS.length}`);
process.exit(caught === MUTATIONS.length ? 0 : 1);
```

- [ ] **Step 2: Run it**

Run: `node scripts/__tests__/audit/pixel-perfect.mutations.mjs`
Expected: `caught 6/6`, exit 0. An `anchor not found` means an earlier task's code differs from this plan — read the
file and update the anchor to the real text, never to a fallback. A `MISSED` means the spec cannot fail on that rule —
add the missing assertion to that spec.

- [ ] **Step 3: Commit** (`test(audit): prove each pixel-perfect spec fails when its rule is broken`, `Refs #87`).

---

## Phase 5 — Close

**Executor**: Opus 5 · low · wave F · inline

### Task 5.1: Full verification

- [ ] **Step 1:** Run every acceptance-bar row (1–8) and the four numeric tolerances; record results in § Measured.
- [ ] **Step 2:** Re-run Task 0.2 Step 3's snippet; `propertiesChecked` / `propertiesFailed` per component must equal the baseline.
- [ ] **Step 3:** `git log --oneline origin/main..HEAD` and `git diff --stat origin/main...HEAD` — only files this plan names.

### Task 5.2: Draft the PR body (Dan opens the PR)

- [ ] Write the PR body into the session, not a file: title `Audit and tighten the pixel-perfect lane`; `Closes #87`;
  a findings table with each F-row's disposition and commit; the F13 correction to the issue text; § Measured values;
  "Not verified" from this plan; the #86 rebase note. Stop there — push and PR are Dan's.

## Self-refute log

| # | Question | Answer |
| --- | --- | --- |
| 1 | Does a fix reuse the defect's mechanism? | The lane drifted by restating names and numbers by hand (tool names, thresholds, codes). The fixes delete the copies (thresholds → one constant; codes → spec both ways; tool names → checker rule) rather than re-typing them correctly |
| 2 | Can a rule's letter be met with its intent violated? | `mask` can hide real drift. Counter: `PIXEL-MASKED` is emitted per state and style parity still checks the masked elements. `figma.skip` can silence coverage — each entry needs a reason, reviewed in the manifest diff, not checked |
| 3 | Numeric targets: denominator and instrument outside the thing measured? | Token names: denominator is every non-pseudo failing check in the envelope; false names are checked by reading `getPropertyValue` by hand. Coverage counts come from the Figma API, not the manifest |
| 4 | Do two changes interact into an unintended pass? | `shared` expansion + `citedNodeIds`: an expanded entry without its own `node` cites the state node, so coverage sees it through the state. Mutation 5 proves `skip` handling is tested; the equivalence rows prove `shared` changed nothing resolved |
| 5 | Does token matching name a wrong token? | Kind-matching stops `--font-weight-*: 16` matching `16px`; palette primitives are excluded; ties list every name. Remaining false-name risk: two semantic tokens with equal values — listed together, never picked |

## Review log

| Leg | Finding | Band | Disposition |
| --- | --- | --- | --- |
| 1 | Numeric tolerances were prose bullets `plan-bar.mjs` cannot parse | above | folded: § Acceptance bar tolerance table (`Metric / Tolerance / Instrument`) |
| 1 | Resolver and threshold changes reach every manifest, but equivalence was proven on three named ones | above | folded: `row-6` now resolves every `*.figma.json` with origin/main's resolver vs the branch resolver (three exist at `c4b3214`; the loop covers any added later) |
| 2 | Same bar-format finding | above | merged into leg 1's |
| 2 | Verifier is read-only by instruction only; unscoped `Bash` after untrusted Figma input | above | folded as F20 + D6: detection in `parallel-aux-tasks` (Task 3.4); a blocking hook left to Dan |
| 2 | Scratch output (`.audit-figma/`, `.audit-screenshots/`) has no retention | beyond | rejected: every file is written under a fixed name per component and state (`<state>.png`, `<state>.diff.png`, `export.json`), so a re-run overwrites rather than accumulates; growth is bounded by manifest size |

## Measured

Pre-execution values, measured 2026-09-17 on `c4b3214`:

```derived id=preexecution
$ node -e '<duplicate expect blocks per manifest>'   # plan analysis snippet
mud-date-picker states 15 expect 37 duplicates 5 pixel:false 9 · mud-date-input states 27 expect 57 duplicates 16 pixel:false 4 · mud-table states 11 expect 32 duplicates 10 pixel:false 2
$ wc -l src/components/*/test/*.figma.json
320 mud-date-picker · 888 mud-date-input · 1185 mud-table
$ grep -rn -o -E "mcp__[a-zA-Z0-9_-]+" AGENTS.md CLAUDE.md _agents .claude/agents .claude/commands .claude/skills | <server count>
figma-mcp 8 (the only server not in .mcp.json)
$ curl -H "X-Figma-Token: $FIGMA_TOKEN" ".../v1/files/doJ7tDY0PlQ0PqMgbpFVIC/nodes?ids=157:4570,158:402,99999:1&depth=1"
200 · version 2399758890123564281 · lastModified 2026-09-16T09:26:19Z · 99999:1 → null · 158:402 componentSetId 158:401
$ Playwright probe: getComputedStyle(shadow-root child) enumeration
custom properties from :root and :host enumerated, var() substituted (value keeps authored case: #0058D2)
```

Filled in during execution: Task 0.2 Step 3, Task 1.3 Step 3, Task 2.1 Step 4, Task 2.2 Step 7, Task 2.3 Step 6, Task 5.1.

Task 0.2, measured 2026-09-17 on `2ab30d8` (base `c4b3214`), Storybook 6007 served from this worktree, `FIGMA_TOKEN`
set:

```derived id=task-0.2
$ exit codes (Step 2)
figma-refs 0/0/0 · 15-style-parity date-picker 1, date-input 0, table 0 · 11-pixel-diff-states date-picker 1, date-input 0, table 0 · 05-story-exports 0 · no exit 2
$ baseline (Step 3 snippet; pixel envelope shape is meta.states[].light|dark.status as assumed)
mud-date-picker checked 97 failed 31 pixel PASS 0 WARNING 0 FAIL 6 UNKNOWN 0 (6 pixel states)
mud-date-input checked 272 failed 0 pixel PASS 15 WARNING 8 FAIL 0 UNKNOWN 0 (23 pixel states)
mud-table checked 118 failed 0 pixel PASS 0 WARNING 9 FAIL 0 UNKNOWN 0 (9 pixel states)
$ mud-date-picker findings on main
STYLE-MISMATCH 31 · STYLE-UNEXPECTED-ELEMENT 7 · every pixel FAIL pairs with PIXEL-SIZE-MISMATCH (capture 438 px tall vs Figma 390–392)
```

Pixel-state counts agree with the pre-execution `pixel:false` counts (15−9, 27−4, 11−2). The date-picker drift is
pre-existing component work, not in scope.

## Not verified by this plan

- Tool-level Figma MCP names: the guard checks servers against `.mcp.json`, not that a tool exists on the server.
- That the model follows the rule index — the verdict line makes a skipped script visible in a report, not impossible.
- `figma.skip` reasons are reviewed, not checked.
- `FIGMA-REFERENCE-STALE` fires on any file edit (the REST version is per file), so it over-reports; it never under-reports.
- Token matching reads computed values: which alias the CSS actually used is not recoverable, so ties are listed.
- CI still does not run `11`/`15`/`figma-refs --check` against components (no Storybook or token in CI); only their specs run.
- Coverage findings (`FIGMA-STATE-MISSING`) on the three manifests are reported, not resolved — that is component work.
- The write check detects a new status line, not a second edit to a file already dirty before the dispatch; no write by the verifier has been observed, so a blocking hook was not measured against a real failure (D6).
