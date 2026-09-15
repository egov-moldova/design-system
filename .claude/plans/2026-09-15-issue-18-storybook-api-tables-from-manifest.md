# Storybook API Tables From Stencil's Manifest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every component's Storybook API table is generated from the component
source — properties, events, slots, shadow parts and methods — instead of only
from hand-written `argTypes`.

**Architecture:** Stencil's own `docs-custom-elements-manifest` output target
replaces `wca analyze` and writes `.storybook/custom-elements.json` from the
existing Stencil build (dev and prod alike). A small extractor in `.storybook/`
turns that manifest into Storybook `argTypes` for every tag, replacing both the
dead `__docgenInfo` branch and the accordion-only allowlist.

**Tech Stack:** Stencil 4.43.4, Storybook 10.4.0 (`@storybook/web-components-vite`),
wireit, Node 24 (`node --test` for tooling specs), Yarn 4.12.0.

**Spec:** this file. § Context and § Options carry the design approved by Dan in
session on 2026-09-15; issue egov-moldova/design-system#18 is the requirement source.

**Issues:** closes egov-moldova/design-system#18

**Reviewed:** preflight 1e6902a, critic 361bc07, critic 75266e2 — 3 rounds (the cap), 21 findings, all dispositioned in the ledger and folded here; round 3's goal-scope finding (9 child tags with no docs table) was decided by Dan on 2026-09-15: `subcomponents` on the parent metas.

## Global Constraints

- Branch `fix/issue-18-storybook-api-tables-from-manifest`, cut from `upstream/main` at `fe6d651`.
- Node 24 (`fnm exec --using 24 -- <cmd>`); `package.json` engines `>=24.0.0 <25.0.0`.
- Pinned versions: `@stencil/core` 4.43.4, `storybook` 10.4.0 — read behaviour from `node_modules`, not memory.
- Everything authored is English. Conventional Commits (`commitlint.config.js`). No AI attribution in commits.
- Stage paths explicitly; never `git add -A`. Do not push, do not open the PR.
- Generated files are never hand-edited: `src/components.d.ts`, `src/components/*/readme.md`, `.storybook/custom-elements.json`.
- No change to the published package contract (`exports`, `files`, `customElements` field).

---

## Context

Facts measured on `fe6d651` before planning (probe scripts lived in the session scratchpad):

1. `wca analyze` reads JSDoc tags only. Across 56 tags its manifest has 3 events,
   2 css parts, 0 attributes — the 2 parts and 3 events are the accordion's
   duplicated `@csspart`/`@fires` tags.
2. Stencil's `docs-custom-elements-manifest` (schema 2.1.0) over the same source:
   115 events, 216 css parts, 558 attributes, 582 property fields, 5 methods, 119 slots.
3. Docs targets run only when `buildDocs` is true; Stencil defaults it to
   `!devMode` (`node_modules/@stencil/core/compiler/stencil.js:275163`) and a
   boolean in the user config overrides the CLI flag (`:273706-273720`).
   Measured `stencil build --dev`, 3 runs each: 7.27 s mean without the target,
   7.19 s with it plus `buildDocs: true`; no `readme.md` was written (`docs-readme`
   is still added only under `--docs`, `stencil.config.ts:42-45`).
4. Stencil writes through its in-memory fs, which records `changedContent` and
   skips identical content (`compiler/stencil.js:283905-283906`).
5. Every manifest reader already needs a Stencil build: `.storybook/preview.js:17`
   imports `../dist/mud/mud.esm.js`. Docker runs `yarn build` then `yarn sp.docker`
   (`Dockerfile:36-40`), so `build` must keep producing the manifest.
6. Storybook's extractor (`node_modules/@storybook/web-components/dist/entry-preview-argtypes.js:48-91`)
   keys every row by bare name in one object, skips `kind === "method"`, drops
   items with an empty name (the default slot), and maps both `members` and
   `attributes`. Run over Stencil's manifest: 1150 rows, 205 props listed twice,
   330 props shown only as "attributes", 44 same-name collisions in 29 tags
   (e.g. `mud-input` prop `label`, slot `label`, part `label` → one row), 27 tags
   losing the default slot row.
7. Storybook infers a control only for an argType that has `type`
   (`node_modules/storybook/dist/_browser-chunks/chunk-SZQXB3JV.js:962-1001`), and
   merges extracted argTypes under the story's own by key
   (`chunk-SI6AKD4S.js:2815-2825`).
8. Stories key hand-written `argTypes` by camelCase prop name (261 multi-word keys,
   0 kebab keys); 43 rows in 15 files set `name: '<attribute>'` as the label
   (e.g. `src/components/mud-button/mud-button.stories.ts:619-624`).
9. CI (`.github/workflows/ci.yml`) runs `yarn lint`, `yarn typecheck`, `yarn test`
   (Vitest `spec`, `src/**/*.spec.{ts,tsx}`). `yarn test:scripts`
   (`node --test "scripts/__tests__/**/*.spec.mjs"`) is the project's runner for
   tooling code but is not wired into CI.
10. `package.json` has no `"type"` field, so tooling modules use `.mjs`.
11. Five directories hold several components (`mud-breadcrumb`, `mud-header`, `mud-menu`,
    `mud-sidebar`, `mud-tabs` — 14 tags); each has one `readme.md`, overwritten by the last
    component documented, whose `# <tag>` title names it (`src/components/mud-header/readme.md:1`
    is `# mud-header-services-menu`). A readme is a reference only for the tag in its title.
12. Correction to the issue text: methods will not appear through Storybook's own
    extractor even with a v2 manifest (fact 6); this plan adds them itself.

## Options

Three decisions, each approved by Dan on 2026-09-15.

### Options

| Option | Complexity added now | Cost to build | Cost to maintain | Cost to reverse | Risk | Value |
| --- | --- | --- | --- | --- | --- | --- |
| A. Stencil `docs-custom-elements-manifest` from the existing build (`buildDocs: true`) | low — one output target, one config flag | med — config, 4 wireit edits, 1 dep removed | low — no second parser; source of truth is the compiler | med — build graph + dependency | Target is new (Stencil PR #6568, 2026-01); dev watch now rewrites the manifest | Fresh manifest in dev; zero added build time (fact 3); removes `web-component-analyzer` |
| B. Stencil target in a dedicated docs-only wireit task | low — one task renamed | med — same edits plus a flag branch in config | med — a second Stencil compile to keep in sync | med | Manifest stale in dev until restart, as today | Smallest graph change, but +4.2 s per uncached run (5.7 s vs wca 1.5 s) |
| C. Keep wca, add `@csspart`/`@fires` beside `@part`/`@Event` in ~41 files | med — two tags per fact in every file | high — 41 files | high — nothing enforces the duplicate on new components | low | Drift the day a component omits a tag; attributes stay empty | Status quo generator |

Recommendation: A — the compiler already knows every fact the table needs, and emitting it from the build that every reader already waits on costs nothing measurable.

Row handling (decision 2): Storybook's default extractor (205 duplicates, 44 collisions) and "strip `attributes` then delegate" (still 44 collisions, no default slot, no methods) were measured and rejected; a local extractor with namespaced non-property keys was chosen. Methods (decision 3): in this PR, as a `methods` category of that same extractor, rather than a follow-up issue.

## File Structure

- `.storybook/manifest-arg-types.mjs` (create) — pure function: manifest + tag name → Storybook argTypes. One responsibility, no Storybook imports, unit-testable in Node.
- `.storybook/preview.js` (modify) — `extractArgTypes` calls the extractor for every tag; `extractComponentDescription` keeps its accordion-only guard.
- `stencil.config.ts` (modify) — the manifest output target and `buildDocs: true`.
- `package.json` (modify) — drop `wca.custom-elements` script and wireit task, its three dependents, the devDependency; `build.output` and `dx:storybook` learn the manifest.
- `yarn.lock` (modify) — result of `yarn remove web-component-analyzer`.
- `scripts/ensure-custom-elements-manifest.mjs` (delete) — existed only because wca writes nothing for an empty tree.
- `src/components/mud-accordion/mud-accordion.tsx`, `src/components/mud-accordion-item/mud-accordion-item.tsx` (modify) — drop the `@csspart`/`@fires` tags wca needed; `src/components.d.ts` (regenerated) follows.
- `src/components/mud-accordion/mud-accordion.stories.ts`, `src/components/mud-accordion-item/mud-accordion-item.stories.ts`, `src/components/mud-accordion/mud-accordion.mdx` (modify) — retire the `host` exclusions wca made necessary.
- `STACK.md`, `_agents/environment-commands.md` (modify) — stop naming wca and its script.
- `scripts/__tests__/storybook-manifest.spec.mjs` (create) — contract over the generated manifest (the issue's reproduction).
- `scripts/__tests__/storybook-manifest-arg-types.spec.mjs` (create) — unit tests for the extractor.
- `AGENTS.md`, `Dockerfile`, `.gitattributes` (modify) — the three places that name `wca.custom-elements`.

## reuse-candidates: manifest-arg-types

Homes swept: `.storybook/`, `scripts/`, `scripts/__tests__/`, `src/` (`git grep -ln "extractArgTypes\|custom-elements.json"`), installed deps (`@storybook/web-components`). Stamp: `1e6902a`, 2026-09-15.

- `@storybook/web-components` `entry-preview-argtypes.js` `extractArgTypes` · tier 2 (same role) · rejected-because it keys rows by bare name (44 collisions), drops the default slot and methods, and exposes no hook to change either (Context fact 6).
- `.storybook/preview.js` inline `extractArgTypes` · tier 1 (same name) · extend — replaced in place by a call to the new module; no parallel copy remains.
- `scripts/audit/03-git-hygiene.mjs:96` · tier 3 (mentions the manifest) · rejected-because it only flags the file as generated.
- New specs (`storybook-manifest*.spec.mjs`) · follow `scripts/__tests__/validate-package.spec.mjs`'s `node:test` shape; no existing spec covers the manifest or preview.

## Acceptance bar

Numbers below were re-derived at planning time from the Stencil manifest probe
(`cem.json`) and the Storybook-extractor probe (`rows.mjs`) in the session scratchpad:

```derived-volatile
$ node rows.mjs   # Storybook's own extractArgTypes over every tag of cem.json
storybook default : { rows: 1150, dupPairs: 205, propsShownOnlyAsAttributes: 330 }
attributes removed: { rows: 947, dupPairs: 2, propsShownOnlyAsAttributes: 0 }
$ node -e "<count customElement declarations, method members, tags with a slot named ''>"
tags 56 methods 5 defaultSlotTags 27
```

Zero-tolerance (any miss = FAIL):

| # | Check | Command |
| --- | --- | --- |
| Z1 | Manifest contract passes after `yarn build`, and FAILED on `fe6d651`'s wca manifest | `node --test scripts/__tests__/storybook-manifest.spec.mjs` |
| Z2 | Extractor unit tests pass | `node --test scripts/__tests__/storybook-manifest-arg-types.spec.mjs` |
| Z3 | Project checks exit 0 | `yarn lint`, `yarn typecheck`, `yarn test`, `yarn test:scripts`, `yarn sp.build` |
| Z4 | `yarn build` changes no readme except `src/components/mud-accordion/readme.md`'s `mudChange` description (which gains the `detail.openIds` sentence moved from the retired `@fires` tag), and `src/components.d.ts` only by the removed accordion `@csspart`/`@fires` JSDoc lines | `git status --short -- 'src/components/**/readme.md'` → only `mud-accordion/readme.md`, whose diff is that one row; `git diff -U0 src/components.d.ts \| grep '^[-+][^-+]' \| grep -v '@csspart \|@fires \|item currently open (single entry in \|Emitted whenever the open set changes\|^- *\*$'` → empty (every removed line is a retired tag, the one continuation line of `@fires mudChange`, or a bare ` *` spacer) |
| Z8 | No `@csspart` / `@fires` left in component source | `git grep -n "@csspart\|@fires" -- 'src/**/*.tsx'` → empty |
| Z5 | No trace of wca in the tree | `git grep -n "web-component-analyzer\|wca\.custom-elements\|wca analyze" -- ':!.claude/plans/' ':!CHANGELOG.md'` → empty, and `git grep -nw "wca" -- src .storybook` → empty |
| Z6 | For every story, `initialArgs` identical before/after, and the set of argType keys carrying a non-null `control` identical before/after (the Controls panel gains no control). Measured exception, accepted: the two Accordion story metas lose the 10 controls Storybook had inferred from wca type strings (`size`, `iconPosition`, `items` on `molecules-accordion--default`; `appearance`, `breakpoint`, `itemId` and its event, slot and part rows on `molecules-accordion-item--default`) — all `object`/`text` editors no render function reads, removed by design because manifest rows carry no `type` (Context fact 7) | Task 1 Step 1 / Task 3 Step 6 capture (`args`, `argTypes[*].control`), compared per story id → 0 differing stories |

Numeric (over all 56 tags, from the built Storybook in Task 3):

| # | Metric | PASS | WARN | FAIL | Instrument |
| --- | --- | --- | --- | --- | --- |
| N1 | `mud-input` rows for `label` / `slot:label` / `part:label` | 3 distinct | — | < 3 | Instrument: Task 3 Step 3 probe, field `inputLabel` |
| N2 | `method:*` rows | 5 | — | ≠ 5 | Instrument: Task 3 Step 3 probe, field `methods` |
| N3 | `slot:default` rows | 27 | — | ≠ 27 | Instrument: Task 3 Step 3 probe, field `defaultSlots` |
| N4 | Tags whose extracted argTypes are `{}`, and tags that are neither the `component` nor a `subcomponents` value of any story (so no docs page renders their table) | 0 and 0 | — | > 0 | Instrument: Task 3 Step 3 probe, fields `emptyTags` and `undocumentedTags` |
| N5 | Tags where extracted rows per category ≠ manifest entries per category (fields, methods, events, slots, cssParts) | 0 | — | > 0 | Instrument: Task 3 Step 3 probe, field `countMismatches` |

## Phase 1 — Manifest from Stencil, tables from the manifest

**Executor**: opus-5 · high · wave 1 (inline, sequential — every task edits the same build graph)

**Files**:
- Create: `.storybook/manifest-arg-types.mjs`
- Create: `scripts/__tests__/storybook-manifest.spec.mjs`
- Create: `scripts/__tests__/storybook-manifest-arg-types.spec.mjs`
- Modify: `.claude/plans/2026-09-15-issue-18-storybook-api-tables-from-manifest.md`
- Modify: `.storybook/preview.js`
- Modify: `stencil.config.ts`
- Modify: `package.json`
- Modify: `yarn.lock`
- Modify: `scripts/ensure-custom-elements-manifest.mjs`
- Modify: `src/components/mud-accordion/mud-accordion.tsx`
- Modify: `src/components/mud-accordion-item/mud-accordion-item.tsx`
- Modify: `src/components.d.ts`
- Modify: `src/components/mud-accordion/readme.md`
- Modify: `src/components/mud-accordion/mud-accordion.stories.ts`
- Modify: `src/components/mud-accordion-item/mud-accordion-item.stories.ts`
- Modify: `src/components/mud-accordion/mud-accordion.mdx`
- Modify: `src/components/mud-breadcrumb/mud-breadcrumb.stories.ts`
- Modify: `src/components/mud-header/mud-header.stories.ts`
- Modify: `src/components/mud-menu/mud-menu.stories.ts`
- Modify: `src/components/mud-sidebar/mud-sidebar.stories.ts`
- Modify: `src/components/mud-tabs/mud-tabs.stories.ts`
- Modify: `STACK.md`
- Modify: `_agents/environment-commands.md`
- Modify: `AGENTS.md`
- Modify: `Dockerfile`
- Modify: `.gitattributes`

(`scripts/ensure-custom-elements-manifest.mjs` is deleted; the Files grammar has no Delete verb.)

### Task 1: Reproduce — manifest contract test, then emit the manifest from Stencil

**Interfaces:**
- Consumes: nothing.
- Produces: `.storybook/custom-elements.json` in CEM 2.x shape (`{ schemaVersion, modules: [{ path, declarations: [{ customElement: true, tagName, members, events, slots, cssParts, attributes }] }] }`), written by every Stencil build.

- [ ] **Step 1: Capture the before-state of every story's args (baseline for Z6)**

On the untouched tree: `fnm exec --using 24 -- yarn sp.build`, serve `storybook-static/`
(`npx http-server storybook-static -p 6107 -s`), and with Playwright evaluate on
`iframe.html`:

```js
const preview = window.__STORYBOOK_PREVIEW__;
await preview.ready?.();
const entries = Object.values((await preview.storyStoreValue?.storyIndex?.entries) ?? preview.storyStoreValue.storyIndex.entries)
  .filter(e => e.type === 'story');
const out = {};
for (const e of entries) {
  const story = await preview.storyStoreValue.loadStory({ storyId: e.id });
  out[e.id] = story.initialArgs;
}
JSON.stringify(out);
```

Save to the session scratchpad as `args-before.json`. If the preview API shape differs, adapt the accessor, not the captured field (`initialArgs`).

- [ ] **Step 2: Write the failing contract test**

Create `scripts/__tests__/storybook-manifest.spec.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// Contract for `.storybook/custom-elements.json`, the manifest every Storybook API
// table is built from (`.storybook/preview.js`). It is generated by the Stencil build,
// so run `yarn build` (or any `stencil build`) before this spec.
//
// The reference it is checked against is each component's `readme.md`: Stencil's
// `docs-readme` target writes those from the same `@part` tags and `@Event()`
// decorators, and issue #18 was precisely a manifest that disagreed with them.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MANIFEST_PATH = path.join(ROOT, '.storybook/custom-elements.json');

function loadManifest() {
  assert.ok(fs.existsSync(MANIFEST_PATH), `${MANIFEST_PATH} is missing — run \`yarn build\` first`);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  // A checkout that last built before this change still holds the old generator's
  // `version: "experimental"` manifest; name the fix rather than failing on its shape.
  assert.notEqual(manifest.version, 'experimental', 'stale pre-Stencil manifest on disk — run `yarn build`');
  return manifest;
}

function declarations(manifest) {
  return (manifest.modules ?? []).flatMap(module =>
    (module.declarations ?? []).filter(d => d.customElement).map(d => ({ ...d, modulePath: module.path })),
  );
}

// Tag names from Stencil's own generated typings, not from parsing component source.
function tagsFromTypings() {
  const typings = fs.readFileSync(path.join(ROOT, 'src/components.d.ts'), 'utf8');
  const map = typings.slice(typings.indexOf('interface HTMLElementTagNameMap'));
  return new Set([...map.slice(0, map.indexOf('}')).matchAll(/"(mud-[a-z0-9-]+)":/g)].map(m => m[1]));
}

// A directory holding several components has one `readme.md`, which the last component
// Stencil documents overwrites; its `# <tag>` title says whose it is. Only a readme
// titled with this declaration's tag is a reference for it.
function readmeFor(declaration) {
  const readmePath = path.join(ROOT, path.dirname(declaration.modulePath), 'readme.md');
  if (!fs.existsSync(readmePath)) return null;
  const readme = fs.readFileSync(readmePath, 'utf8');
  return readme.startsWith(`# ${declaration.tagName}\n`) ? readme : null;
}

function readmeSection(readme, heading) {
  const start = readme.indexOf(`\n## ${heading}\n`);
  if (start === -1) return null;
  const rest = readme.slice(start + heading.length + 5);
  const end = rest.indexOf('\n## ');
  return end === -1 ? rest : rest.slice(0, end);
}

// Names documented in a Stencil readme section: the first column of the Events and
// Shadow Parts tables (after header and separator rows; parts are quoted), or the
// `### \`name(...)\`` headings of the Methods section.
function documentedNames(section, heading) {
  if (heading === 'Methods') return [...section.matchAll(/^### `([A-Za-z0-9_]+)\(/gm)].map(m => m[1]);
  return section
    .split('\n')
    .filter(line => line.startsWith('|'))
    .slice(2)
    .map(line => line.split('|')[1].trim().replace(/^`"?|"?`$/g, ''));
}

describe('.storybook/custom-elements.json', () => {
  it('uses the Custom Elements Manifest 2.x shape Storybook reads through modules[]', () => {
    const manifest = loadManifest();
    assert.match(String(manifest.schemaVersion), /^2\./);
    assert.ok(Array.isArray(manifest.modules));
  });

  it('declares exactly the tags Stencil compiled', () => {
    const manifestTags = new Set(declarations(loadManifest()).map(d => d.tagName));
    assert.deepEqual([...manifestTags].sort(), [...tagsFromTypings()].sort());
  });

  for (const [heading, field] of [
    ['Events', 'events'],
    ['Shadow Parts', 'cssParts'],
    ['Methods', 'members'],
    ['Properties', 'members'],
    ['Slots', 'slots'],
  ]) {
    it(`lists every ${heading.toLowerCase()} entry the component readme documents`, () => {
      const missing = [];
      let compared = 0;
      for (const declaration of declarations(loadManifest())) {
        const readme = readmeFor(declaration);
        const section = readme && readmeSection(readme, heading);
        if (!section) continue;
        const listed = new Set((declaration[field] ?? []).map(item => item.name));
        for (const name of documentedNames(section, heading)) {
          compared++;
          if (!listed.has(name)) missing.push(`${declaration.tagName}: ${name}`);
        }
      }
      assert.ok(compared > 0, `no readme documented any ${heading.toLowerCase()} — the reference parser found nothing`);
      assert.deepEqual(missing, []);
    });
  }

  it('gives each property its attribute name', () => {
    const button = declarations(loadManifest()).find(d => d.tagName === 'mud-button');
    const fullWidth = button.members.find(m => m.kind === 'field' && m.name === 'fullWidth');
    assert.equal(fullWidth?.attribute, 'full-width');
  });
});
```

- [ ] **Step 3: Run it against the current (wca) manifest and confirm it fails**

```bash
fnm exec --using 24 -- yarn wca.custom-elements
node --test scripts/__tests__/storybook-manifest.spec.mjs
```

Expected: FAIL — `schemaVersion` undefined (wca writes `version: "experimental"`, `tags[]`). Record the output verbatim for the PR body.

The `compared > 0` assertion in each readme test is the vacuity guard: a parser that
finds no reference rows fails rather than passes. On the wca manifest (no `modules[]`)
every test fails: shape, tag set, and the five readme tests on `compared`. That proves
the shape defect, not the missing rows, so Step 6 must show the readme tests passing
with `compared > 0` on the Stencil manifest.

Planning dry-runs (session scratchpad, 2026-09-15): with the Properties and Slots readme
tests, Stencil manifest 8/8 pass. On the earlier 6-test version: wca manifest 0/6;
Stencil manifest with `events` emptied and `cssParts` removed → events and shadow-parts
tests fail with 392 named `missing` lines (e.g.
`mud-tabs: mudChange`). The readme tests therefore detect the issue's missing rows,
not only its shape.

- [ ] **Step 4: Emit the manifest from Stencil**

`stencil.config.ts` — after the `dist` target array literal (before `const hasDocs`):

```ts
// Storybook builds every API table from this manifest (`.storybook/preview.js`).
// It is written by Stencil from the same decorators and `@part` tags as `readme.md`,
// replacing `web-component-analyzer`, which read JSDoc tags only (issue #18).
outputTargets.push({
  type: 'docs-custom-elements-manifest',
  file: '.storybook/custom-elements.json',
});
```

and in `export const config`:

```ts
  // Docs output targets only run when this is true, and Stencil defaults it to false
  // under `--dev`. Forced on so the watch build behind `yarn dev` keeps the Storybook
  // manifest current. `docs-readme` is still added only under `--docs`, so dev builds
  // write no readme files. Measured on a one-shot `stencil build --dev` (3 runs each):
  // 7.27 s without the manifest target, 7.19 s with it; watch rebuilds were not timed.
  buildDocs: true,
```

- [ ] **Step 5: Retire wca from the build graph**

`package.json`:
- delete the `"wca.custom-elements": "wireit",` script line and the whole `wireit["wca.custom-elements"]` block;
- remove `"wca.custom-elements"` from `wireit.build.dependencies`, `wireit["dx:prepare"].dependencies`, `wireit["sp.build"].dependencies`;
- add `".storybook/custom-elements.json"` to `wireit.build.output`;
- `wireit["dx:storybook"].command`: add `.storybook/custom-elements.json` to the `wait-on` list;
- `wireit["test.storybook.watch"].command`: add `.storybook/custom-elements.json` to its `wait-on` list (the Storybook Vitest project applies `preview.js`, which imports the manifest);
- `wireit["dx:storybook"].files`: add `"!.storybook/custom-elements.json"` so watch rewrites do not restart the service.

Then:

```bash
fnm exec --using 24 -- yarn remove web-component-analyzer
git rm scripts/ensure-custom-elements-manifest.mjs
```

Docs: `AGENTS.md:139` line becomes a note that `yarn build` writes the manifest; `Dockerfile:30` and `:34` comments drop `wca.custom-elements`; `.gitattributes:24` comment names the Stencil build; `STACK.md:23` row drops `web-component-analyzer` (the manifest now comes from `@stencil/core`) and `:36` drops `wca.custom-elements` from the wireit task list; `_agents/environment-commands.md:7` drops it from `yarn build`'s dependencies, `:82` becomes `yarn tokens.build` only (the watch build writes the manifest), and `:181` becomes the same note as `AGENTS.md`.

Remove the duplicate tags wca needed, which nothing reads any more:
- `src/components/mud-accordion-item/mud-accordion-item.tsx` — delete the explanatory `//` block (lines 7-15) and the `@csspart` / `@fires` lines (36-40) with the blank line before them; `@part` (33-34) stays.
- `src/components/mud-accordion/mud-accordion.tsx` — delete the `@fires mudChange` tag (lines 28-29) and the blank ` *` line above it. Move its `detail.openIds lists every item currently open (single entry in `mode="single"`)` sentence onto the `mudChange` `@Event()` JSDoc (line 89), which Stencil reads, so the detail is not lost.
- `@element` stays in all 56 components: it is the repo-wide docblock convention, not a duplicate the issue names.

- [ ] **Step 6: Build and run the contract**

```bash
fnm exec --using 24 -- yarn build
node --test scripts/__tests__/storybook-manifest.spec.mjs
git status --short -- 'src/components/**/readme.md'
git diff -U0 src/components.d.ts
```

Expected: PASS with `compared > 0`; no readme changed; `src/components.d.ts` differs only by
the removed `@csspart` / `@fires` JSDoc lines (Z4). The accordion tags still carry both
events and both parts in the manifest (the readme tests cover them).

- [ ] **Step 7: Commit**

```bash
# scripts/ensure-custom-elements-manifest.mjs is already staged by Step 5's `git rm`;
# naming it here makes `git add` exit 128 and stage nothing.
git add stencil.config.ts package.json yarn.lock \
  scripts/__tests__/storybook-manifest.spec.mjs AGENTS.md Dockerfile .gitattributes STACK.md _agents/environment-commands.md \
  src/components/mud-accordion/mud-accordion.tsx src/components/mud-accordion-item/mud-accordion-item.tsx \
  src/components.d.ts .claude/plans/2026-09-15-issue-18-storybook-api-tables-from-manifest.md
git commit -F - <<'EOF'
build(storybook): generate the custom-elements manifest with Stencil

web-component-analyzer reads JSDoc tags only, so the manifest behind every
Storybook API table had no events, shadow parts or attributes for any component
that documents them with @Event() and @part. Stencil's own
docs-custom-elements-manifest target now writes it from the same build, dev
included, and wca is removed along with the @csspart/@fires tags the
Accordion carried only for it.

Refs #18
EOF
```

### Task 2: Extractor — manifest to Storybook argTypes

**Interfaces:**
- Consumes: the CEM 2.x shape from Task 1.
- Produces: `extractArgTypes(manifest: object | null | undefined, tagName: string): Record<string, ArgType>` exported from `.storybook/manifest-arg-types.mjs`. Keys: property name for fields; `event:<name>`, `slot:<name|default>`, `part:<name>`, `method:<name>` otherwise. Each value `{ name, description, table: { category, type?: { summary }, defaultValue?: { summary } } }`, never a top-level `type`.

- [ ] **Step 1: Write the failing unit tests**

Create `scripts/__tests__/storybook-manifest-arg-types.spec.mjs`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractArgTypes } from '../../.storybook/manifest-arg-types.mjs';

const MANIFEST = {
  schemaVersion: '2.1.0',
  modules: [
    {
      kind: 'javascript-module',
      path: 'src/components/mud-fixture/mud-fixture.tsx',
      declarations: [
        {
          kind: 'class',
          customElement: true,
          tagName: 'mud-fixture',
          name: 'MudFixture',
          members: [
            { kind: 'field', name: 'fullWidth', description: 'Stretch.', type: { text: 'boolean' }, default: 'false', attribute: 'full-width' },
            { kind: 'field', name: 'items', description: 'Rows.', type: { text: 'FixtureItem[]' } },
            { kind: 'field', name: 'label', description: 'Label prop.', type: { text: 'string' }, attribute: 'label' },
            { kind: 'method', name: 'setOpen', description: 'Open it.', parameters: [{ name: 'open', type: { text: 'boolean' } }], return: { type: { text: 'Promise<void>' } } },
            { kind: 'method', name: 'focusHeader', description: 'Focus.', return: { type: { text: 'Promise<void>' } } },
          ],
          attributes: [{ name: 'full-width', fieldName: 'fullWidth' }, { name: 'label', fieldName: 'label' }],
          events: [{ name: 'mudChange', description: 'Changed.', type: { text: 'CustomEvent<FixtureDetail>' } }],
          slots: [{ name: '', description: 'Body.' }, { name: 'label', description: 'Label slot.' }],
          cssParts: [{ name: 'label', description: 'Label part.' }],
        },
      ],
    },
  ],
};

describe('extractArgTypes', () => {
  it('keys a property by its name, labels it with its attribute, and fills type and default', () => {
    assert.deepEqual(extractArgTypes(MANIFEST, 'mud-fixture').fullWidth, {
      name: 'full-width',
      description: 'Stretch.',
      table: { category: 'properties', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    });
  });

  it('labels a property with no attribute by its own name', () => {
    const row = extractArgTypes(MANIFEST, 'mud-fixture').items;
    assert.equal(row.name, 'items');
    assert.equal(row.table.defaultValue, undefined);
  });

  it('keeps a property, a slot and a part that share a name as three rows', () => {
    const rows = extractArgTypes(MANIFEST, 'mud-fixture');
    assert.equal(rows.label.table.category, 'properties');
    assert.equal(rows['slot:label'].table.category, 'slots');
    assert.equal(rows['part:label'].table.category, 'css shadow parts');
    assert.equal(rows['part:label'].name, 'label');
  });

  it('lists the unnamed default slot', () => {
    assert.deepEqual(extractArgTypes(MANIFEST, 'mud-fixture')['slot:default'], {
      name: '(default)',
      description: 'Body.',
      table: { category: 'slots' },
    });
  });

  it('lists events with their event type', () => {
    assert.deepEqual(extractArgTypes(MANIFEST, 'mud-fixture')['event:mudChange'], {
      name: 'mudChange',
      description: 'Changed.',
      table: { category: 'events', type: { summary: 'CustomEvent<FixtureDetail>' } },
    });
  });

  it('lists methods with their signature', () => {
    const rows = extractArgTypes(MANIFEST, 'mud-fixture');
    assert.equal(rows['method:setOpen'].table.type.summary, '(open: boolean) => Promise<void>');
    assert.equal(rows['method:focusHeader'].table.type.summary, '() => Promise<void>');
    assert.equal(rows['method:setOpen'].table.category, 'methods');
  });

  it('does not emit attributes as rows of their own', () => {
    assert.equal(extractArgTypes(MANIFEST, 'mud-fixture')['full-width'], undefined);
  });

  it('gives no row a top-level type, so Storybook infers no control from the manifest', () => {
    assert.ok(Object.values(extractArgTypes(MANIFEST, 'mud-fixture')).every(row => !('type' in row)));
  });

  it('returns an empty object for an unknown tag, a legacy wca manifest, or no manifest', () => {
    assert.deepEqual(extractArgTypes(MANIFEST, 'mud-missing'), {});
    assert.deepEqual(extractArgTypes({ version: 'experimental', tags: [{ name: 'mud-fixture' }] }, 'mud-fixture'), {});
    assert.deepEqual(extractArgTypes(undefined, 'mud-fixture'), {});
  });
});
```

- [ ] **Step 2: Run — expect failure**

`node --test scripts/__tests__/storybook-manifest-arg-types.spec.mjs` → FAIL, `ERR_MODULE_NOT_FOUND` for `manifest-arg-types.mjs`.

- [ ] **Step 3: Implement**

Create `.storybook/manifest-arg-types.mjs`:

```js
// Storybook argTypes for one custom element, built from the Custom Elements Manifest
// (schema 2.x) that Stencil writes to `.storybook/custom-elements.json`.
//
// Storybook's web-components extractor is not used: it keys every row by bare name in
// one object, so a property, a slot and a shadow part named `label` collapse into a
// single row; it also drops the unnamed default slot and every method, and lists each
// property twice, once as a property and once as an attribute (issue #18).
//
// Property rows are keyed by property name, so they merge with the camelCase `argTypes`
// the stories declare, and are labelled with the attribute name an HTML author writes.
// Every other category is namespaced. No row carries a top-level `type`: Storybook
// infers controls only from `type`, so the manifest documents and the stories decide
// which controls exist.

const row = (name, category, description, typeSummary, defaultSummary) => ({
  name,
  description,
  table: {
    category,
    ...(typeSummary === undefined ? {} : { type: { summary: typeSummary } }),
    ...(defaultSummary === undefined ? {} : { defaultValue: { summary: defaultSummary } }),
  },
});

const signature = method => {
  const parameters = (method.parameters ?? []).map(p => (p.type?.text ? `${p.name}: ${p.type.text}` : p.name));
  return `(${parameters.join(', ')}) => ${method.return?.type?.text ?? 'void'}`;
};

function findDeclaration(manifest, tagName) {
  for (const module of manifest?.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.customElement && declaration.tagName === tagName) return declaration;
    }
  }
  return undefined;
}

export function extractArgTypes(manifest, tagName) {
  const declaration = findDeclaration(manifest, tagName);
  if (!declaration) return {};

  const argTypes = {};
  for (const member of declaration.members ?? []) {
    if (member.kind === 'field') {
      argTypes[member.name] = row(member.attribute ?? member.name, 'properties', member.description, member.type?.text, member.default);
    } else if (member.kind === 'method') {
      argTypes[`method:${member.name}`] = row(member.name, 'methods', member.description, signature(member));
    }
  }
  for (const event of declaration.events ?? []) {
    argTypes[`event:${event.name}`] = row(event.name, 'events', event.description, event.type?.text);
  }
  for (const slot of declaration.slots ?? []) {
    argTypes[`slot:${slot.name || 'default'}`] = row(slot.name || '(default)', 'slots', slot.description);
  }
  for (const part of declaration.cssParts ?? []) {
    argTypes[`part:${part.name}`] = row(part.name, 'css shadow parts', part.description);
  }
  return argTypes;
}
```

- [ ] **Step 4: Run — expect pass**

`node --test scripts/__tests__/storybook-manifest-arg-types.spec.mjs` → all PASS.

- [ ] **Step 5: Commit**

```bash
git add .storybook/manifest-arg-types.mjs scripts/__tests__/storybook-manifest-arg-types.spec.mjs
git commit -F - <<'EOF'
feat(storybook): build API table rows from the custom-elements manifest

Storybook's web-components extractor keys every row by bare name, so a
property, slot and shadow part sharing a name collapse into one row (44 cases
across 29 components), and it drops the default slot and every method. The
local extractor keys properties by name, labels them with their attribute, and
namespaces events, slots, parts and methods.

Refs #18
EOF
```

### Task 3: Wire every tag to the extractor and verify in the built Storybook

**Interfaces:**
- Consumes: `extractArgTypes(manifest, tagName)` from Task 2; the manifest from Task 1.
- Produces: `parameters.docs.extractArgTypes(tagName)` returning the extractor's rows for every tag.

- [ ] **Step 1: Wire `.storybook/preview.js`**

- Add `import { extractArgTypes as extractManifestArgTypes } from './manifest-arg-types.mjs';` beside the manifest import.
- Replace the comment block and `MANIFEST_ARG_TYPES` Set (lines 26-37) with:

```js
// Component descriptions stay hidden from docs pages except the Accordion's, whose MDX
// page renders <Description of={AccordionStories} /> and needs the real text.
const MANIFEST_DESCRIPTIONS = new Set(['mud-accordion', 'mud-accordion-item']);
```

- Replace the whole `extractArgTypes` function (lines 165-182) with:

```js
    // Every API table is generated from the Stencil-written manifest; the story's own
    // `argTypes` are merged over these rows by key (see ./manifest-arg-types.mjs).
    extractArgTypes: component => extractManifestArgTypes(customElements, component),
```

- `extractComponentDescription`: `MANIFEST_ARG_TYPES` → `MANIFEST_DESCRIPTIONS`, comment unchanged in meaning.

`setCustomElements(customElements)` stays: the description branch still delegates to Storybook's reader.

Restore attribute labels after the merge. Storybook normalizes a story's own `argTypes` with
`name: <key>` (`node_modules/storybook/dist/_browser-chunks/chunk-SZQXB3JV.js:537-542`) and merges
them over the extracted rows, so a declared prop would read `ariaLabel` beside an undeclared
`aria-labelledby`. Add `labelPropertiesWithAttributes(manifest, tagName, argTypes)` to
`.storybook/manifest-arg-types.mjs` (with unit tests: relabels a property that has an attribute,
leaves attribute-less properties, other categories and story-only args untouched, returns the input for an
unknown tag or no manifest) and export from `preview.js`
`argTypesEnhancers = [context => labelPropertiesWithAttributes(customElements, context.component, context.argTypes)]`
- project enhancers run after the framework's `enhanceArgTypes` merge.

Retire the `host` exclusions, which existed only because wca listed `@Element() host` as a
property. Stencil's manifest lists no `host` member on any tag (planning probe over the
56 declarations → `host fields: []`; re-confirm on the Task 1 build with
`node -e "const c=require('./.storybook/custom-elements.json');console.log(c.modules.flatMap(m=>m.declarations).filter(d=>(d.members||[]).some(x=>x.name==='host')).map(d=>d.tagName))"` → `[]` before editing):
- `src/components/mud-accordion/mud-accordion.stories.ts:460-464` and `src/components/mud-accordion-item/mud-accordion-item.stories.ts:74-78` — delete the four-line comment and `controls: { exclude: ['host'] },`.
- `src/components/mud-accordion/mud-accordion.mdx:22` — delete the `{/* … */}` comment line; `:24` `<Controls exclude={['host']} />` → `<Controls />`; `:33` `<ArgTypes of={ItemStories} exclude={['host']} />` → `<ArgTypes of={ItemStories} />`.

- [ ] **Step 1b: Give the 9 child tags a docs table through `subcomponents`**

Storybook 10.4's `ArgTypes` and `Controls` doc blocks render one tab per `subcomponents` entry, each
filled by `parameters.docs.extractArgTypes(tagName)` (`node_modules/@storybook/addon-docs/dist/blocks.js`,
`ArgTypesImpl` and `ControlsImpl`). Add to the default-export meta of:

- `src/components/mud-breadcrumb/mud-breadcrumb.stories.ts:322` → `subcomponents: { 'mud-breadcrumb-item': 'mud-breadcrumb-item' },`
- `src/components/mud-header/mud-header.stories.ts:49` → `subcomponents: { 'mud-header-nav-item': 'mud-header-nav-item', 'mud-header-mega-menu': 'mud-header-mega-menu', 'mud-header-services-menu': 'mud-header-services-menu', 'mud-header-mobile': 'mud-header-mobile' },`
- `src/components/mud-menu/mud-menu.stories.ts:87` → `subcomponents: { 'mud-menu-item': 'mud-menu-item' },`
- `src/components/mud-sidebar/mud-sidebar.stories.ts:528` → `subcomponents: { 'mud-sidebar-group': 'mud-sidebar-group', 'mud-sidebar-item': 'mud-sidebar-item' },`
- `src/components/mud-tabs/mud-tabs.stories.ts:63` → `subcomponents: { 'mud-tab': 'mud-tab' },`

Each line goes directly after that meta's `component:` line. `yarn typecheck` must accept it
(the CSF `Meta` types `subcomponents` as `Record<string, component>`, and a web-components
component is a tag-name string).

- [ ] **Step 2: Build Storybook**

`fnm exec --using 24 -- yarn sp.build` → exit 0.

- [ ] **Step 3: Measure N1–N5 on the built preview**

Serve `storybook-static/` and evaluate on `iframe.html`, for every tag in the manifest:

```js
const preview = window.__STORYBOOK_PREVIEW__;
const story = await preview.storyStoreValue.loadStory({ storyId: 'atoms-button--default' });
const extract = story.parameters.docs.extractArgTypes;
const manifest = window.__STORYBOOK_CUSTOM_ELEMENTS__;
const tags = manifest.modules.flatMap(m => m.declarations).filter(d => d.customElement).map(d => d.tagName);
const rows = Object.fromEntries(tags.map(t => [t, extract(t)]));
const declarations = Object.fromEntries(manifest.modules.flatMap(m => m.declarations).filter(d => d.customElement).map(d => [d.tagName, d]));
const byCategory = r => Object.values(r).reduce((acc, row) => ({ ...acc, [row.table.category]: (acc[row.table.category] ?? 0) + 1 }), {});
const expected = d => ({
  properties: (d.members ?? []).filter(m => m.kind === 'field').length,
  methods: (d.members ?? []).filter(m => m.kind === 'method').length,
  events: (d.events ?? []).length,
  slots: (d.slots ?? []).length,
  'css shadow parts': (d.cssParts ?? []).length,
});
({
  inputLabel: ['label', 'slot:label', 'part:label'].filter(k => rows['mud-input'][k]).length,
  methods: tags.reduce((n, t) => n + Object.keys(rows[t]).filter(k => k.startsWith('method:')).length, 0),
  defaultSlots: tags.filter(t => rows[t]['slot:default']).length,
  emptyTags: tags.filter(t => Object.keys(rows[t]).length === 0),
  undocumentedTags: await (async () => {
    const covered = new Set();
    for (const e of Object.values(preview.storyStoreValue.storyIndex.entries).filter(e => e.type === 'story')) {
      const s = await preview.storyStoreValue.loadStory({ storyId: e.id });
      if (typeof s.component === 'string') covered.add(s.component);
      for (const sub of Object.values(s.subcomponents ?? {})) covered.add(sub);
    }
    return tags.filter(t => !covered.has(t));
  })(),
  countMismatches: tags.filter(t => {
    const got = byCategory(rows[t]);
    return Object.entries(expected(declarations[t])).some(([category, n]) => (got[category] ?? 0) !== n);
  }),
});
```

Expected: `{ inputLabel: 3, methods: 5, defaultSlots: 27, emptyTags: [], undocumentedTags: [], countMismatches: [] }`.
The probe calls the extractor through the story's `parameters.docs.extractArgTypes`, so it
grades what Storybook actually receives, not the module in isolation. It reads rows before
the story's own `argTypes` are merged; merged-in story rows are graded by Steps 4-5. (Use any existing story id if `atoms-button--default` differs.)

- [ ] **Step 4: Look at the rendered tables**

Screenshot the docs pages for Button, Input, Modal, Accordion, Receipt and Banner in light mode
(Receipt and Banner carry story-only `argTypes` keys that are not component props, e.g.
`senderName`, `body`; they must still render, outside the manifest categories).
Pass condition per page: rows grouped under properties / events / slots / css shadow parts / methods; Button's `full-width` row carries the story's boolean control; Modal shows `openModal` / `closeModal` under methods; Accordion's two tables render with no `exclude` prop; no console errors (`browser_console_messages`).

- [ ] **Step 5: Controls panel spot-check**

Open `atoms-button--default` canvas: the Controls panel lists the story's controls, and manifest-only rows (events, slots, parts, methods) show no control.

- [ ] **Step 6: Z6 — args unchanged**

Re-run Task 1 Step 1's capture on the new build into `args-before.json`'s sibling `args-after.json`; `diff` → empty.

- [ ] **Step 7: Full project checks (Z3, Z5)**

```bash
fnm exec --using 24 -- yarn lint
fnm exec --using 24 -- yarn typecheck
fnm exec --using 24 -- yarn test
fnm exec --using 24 -- yarn test:scripts
git grep -n "web-component-analyzer\|wca\.custom-elements\|wca analyze" -- ':!.claude/plans/' ':!CHANGELOG.md'
git grep -nw "wca" -- src .storybook
```

(`yarn lint` runs `prettier --check .`, which covers every changed file.)

- [ ] **Step 8: Commit**

```bash
git add .storybook/preview.js src/components/mud-accordion/mud-accordion.stories.ts \
  src/components/mud-accordion-item/mud-accordion-item.stories.ts src/components/mud-accordion/mud-accordion.mdx \
  src/components/mud-breadcrumb/mud-breadcrumb.stories.ts src/components/mud-header/mud-header.stories.ts \
  src/components/mud-menu/mud-menu.stories.ts src/components/mud-sidebar/mud-sidebar.stories.ts src/components/mud-tabs/mud-tabs.stories.ts
git commit -F - <<'EOF'
fix(storybook): generate every component's API table from the manifest

extractArgTypes read component.__docgenInfo, which a Stencil tag-name string
never has, so every table outside the Accordion came only from hand-written
argTypes. It now returns the manifest rows for every tag; stories' own argTypes
still merge over them by key. Component descriptions stay limited to the
Accordion.

Closes #18
EOF
```

## Requirement coverage

Items issue #18 lists, and where each lands:

| Issue item | Disposition |
| --- | --- |
| Shadow Parts section generated from `@part` for every component | Task 1 (manifest), Task 3 (rows); Z1, N1 |
| Events section generated from `@Event()` for every component | Task 1, Task 3; Z1 |
| Slots and every prop nobody typed out in stories | Task 2 (rows for all fields and slots, incl. default slot); N3, N4, N5 |
| Replace `wca analyze` with `docs-custom-elements-manifest` | Task 1; Z5 |
| Remove the `@csspart`/`@fires` duplication | Task 1 Step 5; Z8 |
| Remove the `wca` dependency | Task 1 Step 5; Z5 |
| `attributes` empty for every component | Merged into property rows: each property row is labelled with its attribute name (decision 2, approved) — no separate attribute rows |
| Methods appear nowhere | Task 2 `methods` category; N2 |
| Lift the accordion-only guard so every component is fed from the manifest | Task 3 Step 1 (extractor for every tag) and Step 1b (`subcomponents` for the 9 child tags with no story meta); N4 `emptyTags` and `undocumentedTags` |
| Own PR and its own visual check | Task 3 Steps 4-6; this branch carries only #18 |

## Self-refute log

1. **Does the fix reuse the defect's mechanism class?** The defect is two generators
   reading two tag vocabularies for one fact. The fix has one generator (the compiler)
   feeding both `readme.md` and the manifest. The contract spec compares those two
   outputs, so it cannot catch a compiler that is wrong in both; that is accepted — it
   grades "Storybook sees what Stencil sees", and component unit specs grade the API
   itself. The extractor is a second reader of the manifest; its output is checked
   outside its own unit tests by Task 3 Step 3 (N1–N5 on the built preview) and Step 4.
2. **Letter met, intent violated?** Z1 and Z2 can pass while no page shows a row
   (manifest right, preview not wired) → closed by N4 measured on the built Storybook.
   N4 can pass with rows in wrong categories → Step 4 screenshots. Z6 (args unchanged)
   can pass with controls broken → Step 5.
3. **Denominators, instruments outside what they grade.** N1–N5 are over all 56 tags
   (the § Acceptance bar `derived-volatile` fence); the instrument is the built preview's
   own `parameters.docs.extractArgTypes`, not the unit-test fixture. Z1's readme tests
   carry `compared > 0` as a vacuity floor and were dry-run: 8/8 on the Stencil manifest;
   on the 6-test version 0/6 on wca and 392 named misses on a mutant with events and parts removed.
4. **Rule interactions.** (a) `wait-on .storybook/custom-elements.json` in `dx:storybook`
   × a stale wca manifest left on disk: wait-on passes on the stale file and the
   extractor returns `{}` for its shape (Z2's legacy-shape case), so tables are empty
   until the first watch build rewrites it — transient, not a failure. (b) The contract
   spec uses readmes as its reference × multi-component directories overwrite their
   readme: closed by the `# <tag>` title guard (Context fact 11). (c) `buildDocs: true`
   × `yarn build --docs` readme generation: the Z4 readme check proves no readme churn.

## Residual Risk

- `yarn test:scripts` is not in CI, so the two new specs guard only local runs; wiring it into `.github/workflows/ci.yml` is a separate tooling change.
- The Stencil CEM target is recent (merged 2026-01-27); an upgrade could change its shape. The contract spec is the tripwire.
- Story `argTypes` without `table.category` render outside the manifest categories; accepted, seen in Task 3 Step 4.
- Z1's readme comparison skips the 9 tags whose shared-directory readme is titled for a sibling (Context fact 11); for those, manifest completeness rests on the compiler writing both outputs. Accepted.
- The extractor ignores the manifest's `deprecated` flag. No component source carries `@deprecated` today (`git grep -c "@deprecated" -- 'src/components/**/*.tsx'` → no output); revisit when the first one lands.
