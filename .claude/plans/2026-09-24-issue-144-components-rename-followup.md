# Finish the Storybook `Components` rename

**Reviewed:** preflight d5fa1cc, critic 634c9e1, critic 4972ef0 — the 3-round cap ended the loop; round 3's two above-bar findings are folded into this revision and have had no round of their own, and the owner gave the go to implement on 2026-09-24

**Executor**: Sonnet 5 · medium

Dispatch verdict: inline — no task passes the brief-test: seven small tasks on one shared tree, and
Task 2 consumes what Task 1 exports, so a leg per task would pay its startup floor to hand back a
few lines each. The whole plan runs in one implementation session.

## Goal

Every place that names a Storybook story id or title agrees with the single `Components/<Name>`
category introduced by `0b4d020`, and a static test makes the next title change fail loudly instead
of silently breaking the audit harness.

## Spec/issue link

<https://github.com/egov-moldova/design-system/issues/144> — "fix: finish the Storybook Components
rename — stale story ids in manifests, audit fallbacks, scaffold and agent docs".

## Problem

`0b4d020` renamed every story title to `Components/<Name>`. A story id is derived from the title
(`Components/Input/Date` → `components-input-date`), so anything holding a pre-rename id points at a
story that no longer exists. The audit harness then waits for a component that never renders and
reports `capture failed` for every state, not "story not found".

Re-measured on `upstream/main` at 53f3579 (the issue was written at 38d3021; three other manifests
and `mud-file-input` landed since):

- 17 of 21 `src/components/*/test/*.figma.json` manifests carry a pre-rename `defaults.story`. All 17
  resolve mechanically: swapping the leading `atoms|molecules|organisms` for `components` yields an
  id that exists among the ids computed from the `*.stories.ts` files (dry run, 2026-09-24). The
  other four (`mud-numeric-input`, `mud-phone-input`, `mud-search-input`, `mud-stepper`) are already
  correct.
- `story-scaffold.mjs` still writes `title: 'Atoms/<Name>'` into every new stories file.
- Three audit rows infer `Atoms/<Name>` when a component has no stories file.

## Options

| Option | Cost |
| --- | --- |
| A. Fix the stale ids and add a static guard in this PR; remove `--atomic` | One PR; `--atomic` becomes an "unknown option" error for anyone passing it (its only caller in the repo is its own test) |
| B. Fix the ids now, guard and `--atomic` in follow-ups | Smallest diff; the window between PRs stays unprotected and #144 is not provably closed |
| C. A, but keep `--atomic` as a deprecated no-op | Dead code that mimics a choice that no longer exists |

## Decision

A — confirmed by the issue owner on 2026-09-24: `--atomic` (and the `atomicLevel` input of the
`story-writer` agent) is removed, and the guard test ships in this PR. Nothing consumer-visible
changes: the manifests are read only by `scripts/audit/*` and the `pixel-perfect` skill, and the
published package ships `dist/`, `loader/` and `CHANGELOG.md` only.

## Requirement coverage

Every item issue #144 lists, with the task that closes it or the disposition this plan gives it.

| Issue item | Disposition |
| --- | --- |
| 1. Generators that reintroduce the old category (`story-scaffold.mjs`, `scaffolders.spec.mjs`) | Task 3 |
| 2. Audit fallbacks and hints (`09`, `10`, `12`, `05`, `lib/figma-manifest.mjs`) | Task 4 |
| 3. State manifests (issue said 16; re-measured 17 of 21) | Tasks 1-2 |
| 4. Documentation and agent instructions that hand out old ids | Tasks 3 (`story-writer` and its three callers) and 6 (the other nine files) |
| 5. Test fixtures and doc comments | Task 5 (fixtures), Task 4 (doc comments in `scripts/audit/**`) |
| "Decide, don't sweep": what stays | Global constraints, second bullet |
| "Decide, don't sweep": fate of `--atomic` | Task 3 — removed, decided 2026-09-24 |
| Proposed guard: a static test over manifest ids | Task 1. "Nearest real one": the guard's suggestion covers the old-prefix swap, the only rename shape known; a general nearest-match heuristic would be a guess about future renames, so it is not built |
| Proposed guard, "optionally" — the harness names a missing story instead of `capture failed` | **Deferred, not in this PR.** It changes the harness's error path (behaviour, not a rename); #144's own text marks it optional. Follow-up issue, opened when this PR is ready; it should also make the three no-stories-file fallbacks return null rather than guess an id that cannot exist |
| Acceptance: the two `git grep` bars, guard exists and fails on a mutated id | Acceptance bar, rows 1, 2 and 4 |
| Acceptance: scaffolding a new story produces `title: 'Components/<Name>'` | Task 3's spec assertion `/title: 'Components\/Button'/`, run under bar row 5 (`yarn test:scripts`) |
| Two more docs that give the title form wrongly (`Components/MudButton`), found by review | Task 6, not listed in the issue; same class as item 4 |
| Acceptance: `yarn audit:component <fixed manifest>` captures states | Task 7 step 2 and the last acceptance row; reported under *Not verified* if the environment cannot run it |
| Item 3, "open PRs that add manifests must also use `components-…` ids" | No task: nothing to change. Checked 2026-09-24 — #141, #142, #145 use ids that exist, #138 is merged; residual risk under *Not verified* |

## Global constraints

- Branch `fix/issue-144-components-rename-followup`, cut from `upstream/main`. PR base is
  `egov-moldova/design-system:main`; `origin` is the fork.
- Open PRs #135, #137, #140, #141, #142 and #145 were listed on 2026-09-24. None edits a line
  this plan changes (checked against their file lists and hunks). #135 and #137 edit the archetype
  vocabulary in `.claude/skills/optimize-prompt/**` and `_agents/anti-patterns.md`, which this
  plan leaves alone, and #137 touches `_agents/verification-git.md` at `:117` and `:130`, clear of
  the one line this plan edits there (`:70`). Re-check before opening the PR.
- Atomic-design vocabulary is not stale and stays: the `atoms → molecules → organisms` build order,
  the `optimize-prompt` archetypes, `_agents/figma-extraction.md`, `_agents/pixel-perfect-qa.md`, the
  `--fast` routing table. Also untouched: `web-components/demo/manifest.ts` (a demo grouping),
  `src/legacy/**` (deleted by #135), `docs/screenshots/**`, and `.claude/plans/**` history.
- No `changes/` fragment: nothing a consumer of `@egov-moldova/mud` would notice.
- Commit messages in English, conventional style, no attribution trailers. Stage named paths only.
- Story ids are never typed by hand into a manifest: each is derived from the story's real title
  (Task 2) and proved by the guard (Task 1).

## Review Focus

- A manifest whose state overrides `defaults.story` (`states[].story`): the guard must check both
  places, not only `defaults`.
- A title with a space or a nested path (`Components/Date Picker`, `Components/Input/Date`): the id
  slug is Storybook's `toId`, not a kebab-case of the component name — `storyIdFor` is the one
  builder and the guard must not re-derive it.
- A manifest that names a real title but a story export that does not exist
  (`components-badge--nope`): the guard must fail on the export half too.
- A stories file whose title cannot be extracted: the guard must not read that as "no ids" and
  silently pass every manifest; it fails naming the file.
- `story-scaffold` invoked with `--atomic molecule`: exits 2 with the parser's message (strict
  `parseArgs`), never writes a `Molecules/…` file.

## Tasks

Sequential; one writer, one tree. Task 1 is written first and must fail on the current tree.

### Task 1: Guard — every manifest story id resolves to a real story

**Files:**
- Create: `scripts/__tests__/audit/figma-manifest-story-ids.spec.mjs`

reuse-candidates:
- `scripts/audit/lib/figma-manifest.mjs` `validateManifest` — not the home: it only checks that a
  story id is present and shaped like one (`:186`, `:336`); resolving it needs every stories file,
  which a per-component manifest validation does not load. Extending it would make every audit run
  parse the whole story tree.
- `scripts/audit/05-story-exports.mjs` `analyzeStoriesFile` — reused as-is for the id computation
  (`:146`, `:167`); nothing is copied.
- `scripts/__tests__/audit/figma-manifest.spec.mjs` — synthetic manifests only, never reads the
  repo tree; a repo-invariant spec is a different shape, so a new file.

**Interfaces:**
- Consumes: `analyzeStoriesFile(path, componentName)` from `scripts/audit/05-story-exports.mjs`
  (returns `{ stories: [{ storyId }] }`, `storyId` null when the title is missing) and the manifest
  shape from `scripts/audit/lib/figma-manifest.mjs` (`defaults.story`, `states[].story`).
- Produces: nothing exported. `knownStoryIds`, `storyRefs` and `deadStoryIds` stay local to the
  spec: a spec module calls `describe` at load, so importing it from anywhere else would run the
  suite.

- [ ] **Step 1: Write the spec** below verbatim — a repo invariant in the style of
  `scripts/__tests__/package-scripts-paths.spec.mjs`. It was run against `upstream/main` at
  53f3579 on 2026-09-24 and is Prettier- and ESLint-clean as written (the pre-commit hook runs both).

```js
/**
 * Repo invariant: every story id a Figma state manifest names resolves to a story that exists.
 *
 * A story id is derived from the story's `title`, so renaming a title leaves every manifest id
 * pointing at a page that no longer exists. The audit harness then waits for a component that never
 * renders and reports PIXEL-CAPTURE-FAILED for every state instead of "story not found" — see
 * GitHub issue #144, where the `Components` rename left 17 manifests stale.
 *
 * The known-id set is computed from the stories files with the audit's own `analyzeStoriesFile`,
 * so this test and the harness cannot disagree about what an id is. Known limit: that helper counts
 * every exported const of a stories file as a story, so a non-story helper export would count as a
 * known id (no stories file uses `includeStories`/`excludeStories` today).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { analyzeStoriesFile } from '../../audit/05-story-exports.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const COMPONENTS = path.join(ROOT, 'src/components');
// Storybook's own glob (`.storybook/main.mjs`): every *.stories.* under src/components.
const STORIES_RE = /\.stories\.(js|jsx|ts|tsx)$/;
const OLD_PREFIX_RE = /^(atoms|molecules|organisms)-/;

const walk = dir =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(e => e.isFile())
    .map(e => path.join(e.parentPath, e.name));

/** Every story id Storybook will serve, computed from the stories files' titles. */
function knownStoryIds() {
  const ids = new Set();
  const untitled = [];
  for (const file of walk(COMPONENTS).filter(f => STORIES_RE.test(f))) {
    const { stories } = analyzeStoriesFile(file, path.basename(path.dirname(file)));
    if (stories.some(s => s.storyId === null)) untitled.push(path.relative(ROOT, file));
    for (const s of stories) if (s.storyId) ids.add(s.storyId);
  }
  return { ids, untitled };
}

/** `[where, id]` for every story id a manifest names. */
function storyRefs(manifest) {
  const refs = [];
  if (manifest.defaults?.story) refs.push(['defaults.story', manifest.defaults.story]);
  (manifest.states ?? []).forEach((s, i) => {
    if (s.story) refs.push([`states[${i}].story`, s.story]);
  });
  return refs;
}

function deadStoryIds(manifests, knownIds) {
  const dead = [];
  for (const { file, manifest } of manifests) {
    for (const [where, id] of storyRefs(manifest)) {
      if (knownIds.has(id)) continue;
      const swapped = id.replace(OLD_PREFIX_RE, 'components-');
      dead.push({ manifest: file, where, id, suggestion: knownIds.has(swapped) ? swapped : null });
    }
  }
  return dead;
}

const repoManifests = () =>
  walk(COMPONENTS)
    .filter(f => f.endsWith('.figma.json'))
    .map(f => ({ file: path.relative(ROOT, f), manifest: JSON.parse(fs.readFileSync(f, 'utf8')) }));

describe('figma manifests: story ids resolve to real stories', () => {
  it('every stories file has an extractable title', () => {
    const { untitled } = knownStoryIds();
    assert.deepEqual(untitled, [], `stories files with no extractable title: ${untitled.join(', ')}`);
  });

  it('every defaults.story and states[].story exists in the stories files', () => {
    const { ids } = knownStoryIds();
    const dead = deadStoryIds(repoManifests(), ids);
    assert.deepEqual(
      dead,
      [],
      dead
        .map(d => `${d.manifest} ${d.where}: "${d.id}"${d.suggestion ? ` — did you mean "${d.suggestion}"?` : ''}`)
        .join('\n'),
    );
  });

  it('reports a dead id in defaults and in a state override, and names the swap', () => {
    const known = new Set(['components-badge--default', 'components-badge--sizes']);
    // The pre-rename spelling is derived, never typed: a literal old id in this file would trip
    // the repo-wide grep that this change's own acceptance bar runs.
    const old = 'components-badge--default'.replace(/^components-/, 'atoms-');
    const dead = deadStoryIds(
      [{ file: 'm.figma.json', manifest: { defaults: { story: old }, states: [{ story: 'components-badge--nope' }] } }],
      known,
    );
    assert.deepEqual(
      dead.map(d => [d.where, d.id, d.suggestion]),
      [
        ['defaults.story', old, 'components-badge--default'],
        ['states[0].story', 'components-badge--nope', null],
      ],
    );
  });
});
```

- [ ] **Step 2: Run it and confirm it fails for the right reason.**
  Run: `node --test scripts/__tests__/audit/figma-manifest-story-ids.spec.mjs`
  Expected: the second test FAILS listing exactly 17 lines, each with a `did you mean
  "components-…"` suggestion; the first and third tests PASS. If the count is not 17, re-run
  `git grep -nE '"story": "(atoms|molecules|organisms)-' -- 'src/**/*.figma.json' | wc -l` and
  reconcile before continuing.

- [ ] **Step 3: Commit the failing guard alone** so the history shows it red, then green in Task 2:
  `test(audit): fail when a manifest names a story that does not exist`.

### Task 2: Rewrite the 17 manifest ids

**Files:**
- Modify: the 17 files reported by Task 1 — `src/components/mud-{accordion,accordion-item,avatar,
  badge,banner,breadcrumb,checkbox,chip,date-input,date-picker,file-input,segmented-control,select,
  table,time-input,time-picker,toast}/test/*.figma.json`

**Interfaces:**
- Consumes: `analyzeStoriesFile` from `scripts/audit/05-story-exports.mjs`, the same helper the
  guard uses.
- Produces: manifests whose every story id is in the known set.

- [ ] **Step 1: Apply the rewrite from computed ids**, not from a typed list. A throwaway script
  (not committed, kept outside the repo tree, and independent of the spec module) builds the set
  of known ids with `analyzeStoriesFile` over every `*.stories.ts`, then for each manifest reads
  the file as text and, for every `defaults.story` / `states[].story` id that is not in the set,
  replaces the exact quoted `"<id>"` with the same id whose leading `atoms|molecules|organisms`
  is swapped for `components`. It asserts per file that the text changed, that the swapped id IS
  in the known set (otherwise the run aborts and that manifest needs a human, not a guess), and
  that the number of replacements equals the number of dead ids in that file. JSON is edited as
  text so key order and formatting stay byte-identical. Judge the script by those assertions, not
  by an exit code.
- [ ] **Step 2: Run the guard.** `node --test scripts/__tests__/audit/figma-manifest-story-ids.spec.mjs`
  → all three PASS.
- [ ] **Step 3: Confirm nothing but ids moved.**
  `git diff --stat` lists exactly 17 manifests, and `git diff -U0 | grep -E '^[+-][^+-]' | grep -vE '"story":'`
  prints nothing.
- [ ] **Step 4: Commit** `fix(audit): point the state manifests at the Components story ids`.

### Task 3: Scaffold writes `Components/<Name>`; remove `--atomic` and `atomicLevel`

**Files:**
- Modify: `scripts/scaffold/story-scaffold.mjs` — remove the `--atomic` USAGE lines (`:50-51`), the
  `'atomic'` entry in `parseArgs` options (`:64`), `atomic: parsed.values.atomic ?? null` (`:87`),
  `const atomic = args.atomic ?? inferAtomicCategory(name)` (`:114`), the `atomic` key of
  `generateStoriesFile({ contract, atomic, target })` and its JSDoc line (`:145,149`),
  `const titleCategory = capitalize(atomic)` (`:153`), and `inferAtomicCategory` (`:257-262`). The
  title line becomes `` `  title: 'Components/${pascal}',` ``. Drop `capitalize` only if nothing
  else uses it.
- Modify: `scripts/__tests__/scaffold/scaffolders.spec.mjs` — every `generateStoriesFile` call drops
  `atomic: 'atoms'`; the title assertion becomes `/title: 'Components\/Button'/`; the
  `respects --atomic override` test is replaced by one asserting `--atomic` is refused:
  spawn `node scripts/scaffold/story-scaffold.mjs mud-button --atomic molecule`, expect exit 2 and
  stderr containing `Unknown option`. This test is the one place `--atomic` stays in the tree, so
  the two greps that hunt for it (Step 3 below and the acceptance bar) exclude that file by name.
- Modify: `.claude/agents/story-writer.md` — delete the `atomicLevel` input (`:18`) and rewrite the
  browser-verification URL (`:225`) to state the id as `components-<title-slug>--default` where the
  slug is the file's own `title` lowercased with `/` and spaces as `-` (`Components/Input/Date` →
  `components-input-date`), pointing at `storyIdFor` in `scripts/audit/lib/storybook-helpers.mjs`
  rather than a hand-typed id.
- Modify: `.claude/agents/{custom-component,new-component,redesign-component}.md` — remove
  `atomicLevel=<level>, ` from the `story-writer` dispatch prompts (`custom-component.md:146`,
  `new-component.md:161`, `redesign-component.md:211`).

- [ ] **Step 1: Edit the spec first** (title assertion, drop `atomic`, replace the override test);
  run `node --test scripts/__tests__/scaffold/scaffolders.spec.mjs` → FAILS on the title and on
  `--atomic` being accepted.
- [ ] **Step 2: Edit the scaffold and the four agent files**; re-run → PASS.
- [ ] **Step 3: Grep.** `git grep -nE "atomicLevel|--atomic|inferAtomicCategory" -- . ':!.claude/plans' ':!CHANGELOG.md' ':!src/legacy' ':!scripts/__tests__/scaffold/scaffolders.spec.mjs'`
  prints nothing, and so does `git grep -nE "atomic:" -- scripts` — the exclusion above hides the
  spec, so this second grep is what proves the leftover `atomic: '…'` keys are gone from it.
- [ ] **Step 4: Commit** `fix(scaffold): generate Components/<Name> stories and drop --atomic`.

### Task 4: Audit fallbacks, hints and helper docs

**Files:**
- Modify: `scripts/audit/09-a11y-tree.mjs:757`, `scripts/audit/10-contrast-pairs.mjs:808`,
  `scripts/audit/12-console-errors.mjs:215` — `` `Atoms/${pascal(...)}` `` → `` `Components/${pascal(...)}` ``.
- Modify: `scripts/audit/05-story-exports.mjs:159` — the `STORY-NO-TITLE` hint's title becomes
  `Components/…`; `:11` doc comment example likewise.
- Modify: `scripts/audit/lib/figma-manifest.mjs:20,336` — example id and error message quote
  `components-button--default`.
- Modify: doc-comment examples only, no behaviour: `scripts/audit/lib/storybook-helpers.mjs:55-56,75-78`,
  `scripts/audit/lib/browser-context.mjs:89`, `scripts/audit/09-a11y-tree.mjs:23,537`,
  `scripts/audit/10-contrast-pairs.mjs:42`. Keep the `InfoBox → infobox` example: it documents why
  `storyIdFor` delegates, so it becomes `storyIdFor('Components/InfoBox', 'Default')` →
  `'components-infobox--default'`.

- [ ] **Step 1: Edit** the three fallbacks and the hint, then the doc comments, in one message per
  file.
- [ ] **Step 2: Run** `node --test "scripts/__tests__/audit/*.spec.mjs"` — fixtures still pass where
  they test the derivation function; the ones asserting an `atoms-…` fallback id fail and are
  fixed in Task 5. Only `09` has a test that sees its fallback, so this run cannot prove `10` and
  `12`: run `git grep -nE '[[:punct:]](Atoms|Molecules|Organisms)/' -- scripts/audit` → prints
  nothing, and `git grep -nE '(atoms|molecules|organisms)-[^[:space:]]*--' -- scripts/audit` →
  prints nothing (the lowercase id-shaped doc comments). Those greps, not a test, decide those
  two fallbacks and the comments.
- [ ] **Step 3: Commit** `fix(audit): infer Components/<Name> when a component has no stories file`.

### Task 5: Test fixtures

**Files:**
- Modify: `scripts/__tests__/audit/{05-story-exports,story-id,figma-manifest,figma-refs,run-all,
  state-page,09-a11y-tree,10-contrast-pairs}.spec.mjs`

- [ ] **Step 1: Replace** each old title/id with the `Components` form, keeping what the case
  proves: `Atoms/Button` → `Components/Button`, `Molecules/Tooltip` → `Components/Tooltip`,
  `Atoms/InfoBox` → `Components/InfoBox`; ids `atoms-button--default` → `components-button--default`
  and so on. `story-id.spec.mjs:41-43` keeps its `InfoBox`/`InlineMessage` regression, re-titled.
  `10-contrast-pairs.spec.mjs:291` is a comment quoting `molecules-tabs--default`: re-word it to
  `components-tabs--default`.
- [ ] **Step 2: Run** `yarn test:scripts` → PASS, and both `git grep -nE '[[:punct:]](Atoms|Molecules|Organisms)/' -- scripts`
  and `git grep -nE '(atoms|molecules|organisms)-[^[:space:]]*--' -- scripts` → print nothing. The
  suite alone passes whether or not a fixture still says `Atoms/` — those tests exercise the
  id-derivation function, and an old title derives an old id consistently — so the greps are what
  decide this task.
- [ ] **Step 3: Commit** `test(audit): use the Components category in story-id fixtures`.

### Task 6: Documentation that hands out story ids

**Files:**
- Modify: `.claude/agents/a11y-verifier.md:23`, `.claude/agents/audit-production.md:97`,
  `.claude/agents/redesign-component.md:195,257`, `.claude/commands/pre-pr-check.md:191`,
  `.claude/commands/update-tokens.md:161`, `.claude/skills/pixel-perfect/SKILL.md:68`,
  `_agents/environment-commands.md:196`, `_agents/mcp-tools.md:231-232`,
  `_agents/pre-implementation.md:24`
- Modify, found by review and the same class (a title convention documented wrongly):
  `src/components/_agents/storybook-stories.md:64` and `_agents/verification-git.md:70` give
  `Components/MudButton` as the title form, while the real titles carry no `Mud` prefix
  (`Components/Button`, as `storybook-stories.md:241` already says). One line each.

- [ ] **Step 1: Rewrite each id** to `components-<name>--default` **without the `mud-` prefix** (the
  old `atoms-mud-<name>` form was already wrong: the id comes from the title, which has no `mud-`).
  Where a placeholder stands for a component, write the derivation once
  (`components-<title-slug>--default`, slug from the stories file's `title`) instead of guessing the
  slug from the tag name; `mud-date-input` is `components-input-date`.
- [ ] **Step 2: Run** `git grep -nE '(atoms|molecules|organisms)-[^[:space:]]*--' -- .claude/agents .claude/commands .claude/skills _agents`
  → prints nothing. This widened form is the one that sees placeholders such as
  `atoms-<componentName>--default` and `atoms-mud-[name]--default`; the issue's own
  `[a-z0-9-]+` form cannot match them (7 of these 11 lines), and `yarn docs:check` has no story-id
  rule, so without this grep nothing would notice a half-done task. Also
  `git grep -n "Components/Mud" -- . ':!.claude/plans'` → prints nothing. Then `yarn docs:check`
  → PASS (validates agent/command/skill docs).
- [ ] **Step 3: Commit** `docs: name the Components story ids in agent and command instructions`.

### Task 7: Close the acceptance bar

- [ ] **Step 1: Run every bar command below**, each alone, exit status unmasked.
- [ ] **Step 2: Runtime proof.** With Storybook built for this worktree, run
  `yarn audit:component mud-badge --depth standard --json`. It judges capture, which is what a
  stale story id breaks: it passes only if check 11 lists every state in `mud-badge`'s manifest
  with a `screenshotPath`, and no finding carries the code `PIXEL-CAPTURE-FAILED`
  (`scripts/audit/11-pixel-diff-states.mjs:281`). Status `UNKNOWN` with a `PIXEL-NO-REFERENCE`
  finding (`:294-305`) is expected and does not fail the row: the Figma reference images live in
  the git-ignored `.audit-figma/<component>/` and nothing at `standard` depth fetches them
  (`scripts/audit/figma-refs.mjs` does, with `FIGMA_TOKEN`). A run in which check 11 captured
  nothing (browser waived, `--no-figma`) does not pass. If the environment cannot build Storybook,
  say so in the report — the static guard is then the only proof.

## Acceptance bar

- `git grep -nE '(atoms|molecules|organisms)-[^[:space:]]*--' -- . ':!CHANGELOG.md' ':!changes' ':!.claude/plans' ':!src/legacy'`
  prints nothing. The issue's `[a-z0-9-]+` form is narrower than the ids it means to find: it
  skips placeholder ids (`atoms-<componentName>--default`), which is most of the documentation.
- `git grep -nE '[[:punct:]](Atoms|Molecules|Organisms)/' -- scripts` prints nothing. The issue's
  form required a single quote and could not see the backtick templates in the audit fallbacks.
- `git grep -nE "atomicLevel|--atomic|inferAtomicCategory" -- . ':!.claude/plans' ':!CHANGELOG.md' ':!src/legacy' ':!scripts/__tests__/scaffold/scaffolders.spec.mjs'`
  prints nothing, and so does `git grep -nE "atomic:" -- scripts`.
- `node --test scripts/__tests__/audit/figma-manifest-story-ids.spec.mjs` passes, and fails when one
  manifest id is changed to a non-existent story (mutation check, reverted after).
- `yarn test:scripts`, `yarn docs:check`, `yarn lint` pass.
- `git diff --stat upstream/main...HEAD` names no file outside the Files lists above and this plan.
- Runtime proof (Task 7 step 2): `yarn audit:component mud-badge --depth standard --json` lists
  every `mud-badge` manifest state under check 11 with a `screenshotPath` and no
  `PIXEL-CAPTURE-FAILED` finding; a missing Figma reference (`PIXEL-NO-REFERENCE`, status
  `UNKNOWN`) is expected and does not fail it. Where Storybook cannot be built in the
  environment, this row is reported as not verified with the reason, and the guard is then the
  only evidence.

## Not verified

- Whether any CI job or hook already validates manifest ids against a built Storybook index: not
  found by grep (no workflow names `figma.json`); if one exists the guard duplicates it. The guard
  itself runs in CI: `.github/workflows/ci.yml` runs `yarn test:scripts`.
- The runtime capture proof depends on a local Storybook build; if it cannot run, the guard is the
  only evidence that the audit reaches the stories.
- #145, #142 and #141 (open) carry `components-…` ids by inspection of their diffs, not by
  running their audits; once they merge, the guard covers them.
- `--atomic` external callers outside this repository (someone's shell history) are unknowable.
