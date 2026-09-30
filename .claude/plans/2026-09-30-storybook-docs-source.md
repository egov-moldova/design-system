# Storybook Code panel: an explicit docs source for every visible story

## Goal

Every sidebar-visible story shows consumer markup in the Code panel and in the Docs page's
"Show code", never the CSF story object. A spec-lane test keeps it that way.

## Problem

The Storybook Code panel and the Docs page's "Show code" show the CSF story object
(`render: …, args: {…}`) instead of markup for 87 of 439 sidebar-visible stories, because the
global `docs.source.type: 'code'` shows a story's source text and those stories set no source of
their own. The story-authoring rules described `'code'` wrongly and allowed omitting the source.

## Spec / issue

egov-moldova/design-system#176.

## Options

| Option | Cost | Taken |
|---|---|---|
| Flip the global `docs.source.type` to `'dynamic'` | One line, but `render` returns HTML strings, so every snippet comes out HTML-escaped, and composite stories would expose their demo chrome | No |
| Explicit source per story and per component | 87 hand-written snippets across 15 files | Yes |

## Decision

Explicit source per story and per component, as the issue specifies (owner decision,
2026-09-30):

- The five args-driven stories get a `docsSourceDefault(args)` builder and
  `docs.source: { type: 'dynamic', transform }`, as in `mud-button.stories.ts`. The builder
  omits attributes left at the component's prop default.
- Every other story gets a `docsSource<Story>` constant set as `docs.source.code`: minimal
  markup, one element per line, no wrapper `<div>`, no `style=`, no demo labels. A property
  that is not an attribute (arrays, objects) is set in a `<script>` block on an element `id`,
  as in `mud-breadcrumb.stories.ts`.
- The global `type: 'code'` stays; its comment in `.storybook/preview.js` is corrected.
- Guard: `src/components/stories-docs-source.spec.ts` fails on any `dev`-tagged story with
  neither `source.code` nor `type: 'dynamic'` plus a `transform` (owner decision, 2026-09-30).

The issue's acceptance example for Date Picker → Default lists four attributes that equal the
component's defaults (`mode`, `breakpoint`, `header-style`, `first-day-of-week`). The builder
follows the issue's own rule and the button precedent and omits them, so with default controls
the snippet is `<mud-date-picker></mud-date-picker>`.

## Acceptance bar

Zero tolerance:

- `npx vitest run --project spec src/components/stories-docs-source.spec.ts` fails, or `node probe.mjs` reports any `originalSource` (today 87 of 439).
- `node probe.mjs` diff against the baseline shows a changed snippet among the 352 correct stories (see Deviation).
- `LINT=1 node probe.mjs` flags a new snippet with a `<div>`, `style=` or an attribute the manifest (`.storybook/custom-elements.json`) does not declare; demo labels are reviewed by reading.
- `node probe.mjs` fingerprint diff shows a change to a story's render/args/argTypes/play/decorators/tags/name or non-`docs.source` parameters. New `docsSource*` constants are allowed.

Deviations (accepted 2026-09-30, stated in the PR): Date Picker → Default with default controls
prints `<mud-date-picker></mud-date-picker>`, not the issue's acceptance string, which lists four
attributes equal to their prop defaults (see Decision). Stepper Default, Vertical and Interactive share
the `docsSourceDefault` helper that NonInteractive now also uses. Extending it changed their
snippets: the blank continuation lines and the default `orientation="horizontal"` are gone, and
the `aria-label` their args already set now appears. Keeping the old bytes would need a second,
parallel helper. `Input/File › WithMaxSize` renders a `Math.random()` id, so its `render(args)`
output differs between runs while its render source is unchanged.

Instrument: a node-side probe (esbuild-bundles every `*.stories.ts`, merges meta and story
parameters, applies the addon-docs rule `source.code || dynamic snippet || originalSource`, and
fingerprints each story's render/args/argTypes/play/decorators/tags/name/other parameters plus
its `render(args)` output). It is a one-off measurement, not a repo script: the guard spec is the
lasting check. The baseline was taken at `77eca9e3` before any story edit; the probe's source, its
output and the before/after comparison are attached to the PR, so the bar can be re-run.

Tolerances: none — graded by `yarn test && yarn typecheck && yarn lint` (exit 0) and the probe below.

```derived
node probe.mjs <outdir> baseline.json | head -1
{"total":439,"by":{"code":310,"originalSource":87,"dynamic+transform":42}}
gh pr list --repo egov-moldova/design-system --state open
(empty)
```

## Global constraints

- Base: `upstream/main` at `77eca9e3` (includes #174). No open PR touches story files.
- In the 15 story files only `docs.source` and snippet-only constants, data and helpers change. The 352
  stories that are correct today keep their resolved snippet byte for byte. Two unrelated
  story files (`mud-chip`, `mud-spinner`) get a comment correction only.
- Commits: Conventional Commits, one per concern; no generated file staged.

## Tasks

- [x] Guard spec, written first and failing on the 87 stories.
  Verify: `npx vitest run --project spec src/components/stories-docs-source.spec.ts`
- [x] Snippets, per component (verify: the guard lists none of the component's stories;
  `npx eslint <file> --max-warnings 0`; `npx prettier --check <file>`):
  - [x] Accordion Item (1) · Avatar (1) · Badge (1) · Tag (1) · Input/Text (1) · Date Picker (9)
  - [x] Input/Chip (12) · Input/File (7) · Checkbox (5)
  - [x] Modal (11) · Banner (3) · Stepper (7)
  - [x] Table (13) · Tabs (7) · Segmented Control (8)
- [x] `src/components/_agents/storybook-stories.md` and `.claude/agents/story-writer.md`
  describe `'code'` correctly and require a source on every visible story; the preview
  comment is corrected. Verify: `grep -n "snapshots\|verbatim\|CAN omit\|preview.js:113"` on
  both files returns nothing.
- [x] Regression: the node-side probe's per-story output for the 352 stories matches the
  baseline taken before any edit; the 87 now resolve to `code` or `dynamic+transform`.
  Verify: `yarn test`, `yarn typecheck`, `yarn lint`.

## Work split

| Phase | Work | Parallel |
|---|---|---|
| 1 | Guard spec (failing first), rules, preview comment | with phase 2 |
| 2 | Snippets, in 4 disjoint groups of story files (the task groups above) | 4 groups at once |
| 3 | Regression diff against the baseline, checks, commits | after 1 and 2 |

## Not verified

- The static `yarn sp.build` output. The resolution code is the same as in the dev server.
- The rendered Code panel in a browser for every story: the node-side probe applies the
  addon-docs resolution rule (`manager.js:48`) to the prepared parameters instead.
