## Scope

The static judgment of the `audit-component` skill: what a reviewer checks in a component's
source that no script decides. Everything a script decides is a verdict row and is listed only
as a pointer here. Load this file when judging a component's source at any depth. Record each
judgment as a finding in the session's `audit-component` `ai-findings.json` (contract in
[`../SKILL.md`](../SKILL.md)): it is advisory at every depth, and an `error` finding does not
change the state (Decision 12). Cite the rule's file and line in `expected.source`.

---

## Already decided by a script — do not re-judge

| Area | Row · codes |
| --- | --- |
| Required / optional files, tokens file | `01` (`REQUIRED_KINDS`, `OPTIONAL_KINDS` in `scripts/audit/01-component-structure.mjs`) |
| Anti-patterns, CSS + TSX | `02` — list the codes with `node -e "import('./scripts/audit/02-stencil-antipatterns.mjs').then(m => console.log([...m.PATTERNS, ...m.FILE_CHECKS].map(p => p.code).join('\n')))"` |
| JSDoc on class, props, events, methods | `04` |
| Story lineup, title, `docs.source` rules | `05` |
| Coverage | `06` |
| Token values vs the Figma export | `13` |
| Contract extraction, archetype | `14` |
| Shadow, form callbacks, member order, `@Watch`, `.map()` keys | `16` (report-only) |
| Adapter rules A1–A4; CEM parity | `17`, `18` — A4 overlaps lint `@stencil/reserved-member-names` and is kept for the names and the `@Event` members that rule does not check (comparison in `17-adapter-contract.mjs`'s header) |
| `@Method` async, element type, `import type`, `transition: all`, `!important` | `lint` row (ESLint + Stylelint) |
| DTCG shape, references, tier purity, generated CSS vars | `yarn tokens.validate` (CI job `tokens-validate`, repo-wide) |
| Stencil rules marked `manual` | the advisory `stencil-compliance` leg at `deep` — [`stencil-compliance` Rule index](../../stencil-compliance/SKILL.md#rule-index) |

## TypeScript

Rules: `_agents/typescript-strict.md`.
- Index-lookup maps are annotated `Record<K, V>` (inference already covers a literal map).
- Every optional chain that yields a value ends in `?? <fallback>`.
- Optional props use `?`; a prop with neither default nor `?` is a design question, not a `!`.

## Tokens

Rules: `tokens/AGENTS.md`.
- Name order `--{component}-{element}-{property}-{scale|state}`, scale or state last.
  ✅ `--input-border-color-focus` · ❌ `--input-focus-border-color`.
- The file's root key is the component name (`"button"`), never a `"components"` wrapper.

## CSS architecture

Rules: [`stencil-compliance` jsx-styling](../../stencil-compliance/references/jsx-styling.md#styling).
- One pattern, used consistently. **A — slotted** (`mud-button`): `::slotted(*)`,
  `:host([variant])` selectors, pseudo-states on slotted children. **B — internal DOM**
  (`mud-text-input`): `:host` custom properties for sizes, internal wrapper classes, state via
  host class. A mix is a finding.
- No `*` selector outside `::slotted(*)`.
- Disabled sets `pointer-events: none` and `cursor: not-allowed`.

## Slots

Rules: `src/components/_agents/slot-patterns.md`.
- Tag restrictions are enforced with `invalidSlottedTag()` where the slot accepts only some tags.
- Each slot has `::slotted` styling (pattern A), a `@slot` JSDoc line, and a story showing it with
  realistic content.

## Stories

Rules: `src/components/_agents/storybook-stories.md`.
- `Meta<Args>` and `StoryObj<Args>`, never bare; `type Story = StoryObj<Args>`, never
  `StoryObj<typeof meta>` (it nests `Meta` into the args slot in `@storybook/web-components-vite`).
- No `/* eslint-disable */` around the `Meta, StoryObj` import — it hides a forgotten generic.
- `render` args are typed, never `any` (ESLint's `no-explicit-any` is off for stories).
- Every `@Prop()` has an `argTypes` entry: control, `options` for enums, description, default.
- Inline `style` in stories uses semantic tokens, not raw hex, raw px (except `0`, `1px` borders,
  preview widths, grid gutters) or `var(--palette-*)` — a warning.

## Unit tests

Rules: `TESTING.md`, `src/components/_agents/testing.md`.
- Imports `render` from `@stencil/vitest`, never the retired `newSpecPage`, never `jest-axe`.
- First non-vitest import is the side-effect `import '../<component>';`. Without it `06` reads
  0 % — the spec is testing the dist bundle, not the source.
- Events are asserted with `spyOnEvent`, not `addEventListener` + `vi.fn()`.
- Each prop, event, state transition, slot, the disabled state and ARIA output is asserted; for
  form components also reset, disabled, restore and both `setFormValue` arguments.
- Branches stuck at exactly 50 % with everything else at 100 % is the injected
  `registerHost !== false` guard; the recipe is in `src/components/_agents/testing.md`
  ("Reaching 100% Branches").

## Performance

- No heavy computation in `render()`: derive once when inputs change.
- No DOM query inside a loop; cache the result.
