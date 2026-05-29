# Redesign `mud-button` — AGE Design System

## Context

`mud-button` is the next legacy atom queued for redesign, following the spinner → icon → button order documented in `memory/legacy-components-migration.md`. The legacy implementation at [src/legacy/mud-button/](src/legacy/mud-button/) exposes 12 colour variants × 4 sizes (`tiny`/`sm`/`md`/`lg`) using a flat CSS-variable API. The new AGE design system in Figma file `doJ7tDY0PlQ0PqMgbpFVIC` (primary node `653:14291`, state matrix `653:19201`) consolidates these into **5 filled variants × 3 sizes**, introduces a new shape axis (`rectangular`/`circular`), and adds first-class `loading` + slot-driven `icon-only` rendering.

The goal of this redesign is to ship a production-ready `src/components/mud-button/` that is Figma-pixel-perfect, follows the spinner/icon precedent (CSS Pattern A — slot-based, consumer-supplied `<button>`/`<a>`), uses the 3-tier token hierarchy, and unlocks the next wave of legacy-consumer migrations (`mud-calendar`, `mud-modal`, `mud-pagination-go-to`, `mud-upload-area`). The legacy folder stays untouched so existing consumers keep working until they are migrated one-by-one in follow-up PRs.

Out of scope (separate follow-up specs): **Button Outlined**, **Button Text**, **Button w/ Badge**.

---

## Critical files

### To create
| Path | Purpose |
|---|---|
| `tokens/core/focus-ring.tokens.json` | Shared focus-ring tokens (`focusRing.color.inner`, `focusRing.color.outer`, `focusRing.shadow.medium`) — reusable by future interactive atoms. |
| `tokens/core/components/button.tokens.json` | DTCG button tokens — 5 variants × 6 states × 4 elements + size rungs + shape radii. |
| `tokens/core.dark/components/button.tokens.json` | Dark-mode overrides for the variant × state colour grid (extracted from Figma state matrix `653:19201` dark frames). |
| `src/components/mud-button/mud-button.tsx` | Stencil component, Pattern A, slot-driven icon-only + loading detection. |
| `src/components/mud-button/mud-button.css` | `:host` + `::slotted(button)` / `::slotted(a)` styles; logical properties; reduced-motion guard. |
| `src/components/mud-button/mud-button.types.ts` | `BUTTON_SIZES` / `BUTTON_VARIANTS` / `BUTTON_SHAPES` const arrays + types (matches [mud-spinner.types.ts](src/components/mud-spinner/mud-spinner.types.ts)). |
| `src/components/mud-button/mud-button.constants.ts` | Local `BUTTON_TAGS = ['button', 'a']` (not promoted to shared.constants.ts — only one consumer). |
| `src/components/mud-button/mud-button.stories.ts` | CSF3 stories per archetype-router gated set (see § 7). |
| `src/components/mud-button/test/mud-button.spec.tsx` | `@stencil/vitest` unit suite — props, slots, ARIA, slot validation, loading/disabled gates. |

### To modify
| Path | Change |
|---|---|
| `src/index.ts` | Append `export { CorButton } from './components/mud-button/mud-button';` and `export type { ButtonSize, ButtonVariant, ButtonShape, BUTTON_SIZES, BUTTON_VARIANTS, BUTTON_SHAPES } from './components/mud-button/mud-button.types';` after the existing spinner export block. |

### Reused as-is (no edits)
| Path | Use |
|---|---|
| [src/components/mud-spinner/mud-spinner.tsx](src/components/mud-spinner/mud-spinner.tsx) | Loading overlay (`<mud-spinner size="sm\|xs" variant="…">`). |
| [src/components/mud-icon/mud-icon.tsx](src/components/mud-icon/mud-icon.tsx) | Consumed via `leading-icon` / `trailing-icon` / `icon-only` slots; uses `color="currentColor"` to inherit button label colour. |
| [src/utils/invalid-slotted-tag.ts](src/utils/invalid-slotted-tag.ts) | Default-slot validation fallback render. |
| [src/legacy/shared.constants.ts](src/legacy/shared.constants.ts) | `VALID_ICON_SLOT_TAGS` for `leading-icon` / `trailing-icon` / `icon-only` allowlist. |

### Untouched (intentional)
- [src/legacy/mud-button/](src/legacy/mud-button/) — keep until consumers migrate.
- [tokens/legacy/components/button.tokens.json](tokens/legacy/components/button.tokens.json) — keep, drives legacy CSS vars.

---

## API (final)

### Props
| Name | Type | Default | Reflect | Notes |
|---|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'strict' \| 'neutral' \| 'destructive'` | `'primary'` | yes | Filled treatment only. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | yes | Height + padding + font + min-width rung. |
| `shape` | `'rectangular' \| 'circular'` | `'rectangular'` | yes | `circular` → `border-radius: 9999px` (pill); combine with `icon-only` slot for a circle. |
| `disabled` | `boolean` | `false` | yes | Blocks interactivity; mirrors `aria-disabled` to slotted root. |
| `loading` | `boolean` | `false` | yes | Renders spinner overlay; sets `aria-busy`; suppresses pointer + key events. |

### Events
None. Pattern A opts out — the consumer's slotted `<button>` / `<a>` bubbles its own native `click`.

### Slots
| Name | Required | Detection | Allowed tags |
|---|---|---|---|
| (default) | yes | `firstElementChild` tag check at render → `invalidSlottedTag()` fallback | `button`, `a` |
| `leading-icon` | no | `@State() hasLeading` via `onSlotchange` → `getHostClasses()` adds `.has-leading` | `VALID_ICON_SLOT_TAGS` (`mud-icon`) |
| `trailing-icon` | no | `@State() hasTrailing` → `.has-trailing` | `VALID_ICON_SLOT_TAGS` |
| `icon-only` | no | `@State() hasIconOnly` → `.is-icon-only` (squares container; requires `aria-label` on slotted root — dev warning if absent) | `VALID_ICON_SLOT_TAGS` |

### Exported types
From `src/components/mud-button/mud-button.types.ts`:
- `BUTTON_SIZES`, `BUTTON_VARIANTS`, `BUTTON_SHAPES` (const tuples)
- `ButtonSize`, `ButtonVariant`, `ButtonShape` (derived types)

---

## Token mapping (verified from Figma)

### Sizing (numeric, from nodes 653:19578 / 19609 / 19637)

| Property | sm | md | lg | Semantic reference |
|---|---|---|---|---|
| `container.height` | `32px` | `40px` | `48px` | `{spacing.32}` / `{spacing.40}` / `{spacing.48}` |
| `container.minWidth` | `52px` | `56px` | `72px` | literal in component layer |
| `container.paddingInline` | `{spacing.12}` (12px) | `{spacing.16}` (16px) | `{spacing.20}` (20px) | — |
| `container.paddingBlock` | `0px` | `0px` | `0px` | flex `align-items: center` does the vertical centering |
| `container.gap` (text + icon) | `{spacing.6}` | `{spacing.6}` | `{spacing.6}` | All sizes 6px |
| `container.borderRadius` (rectangular) | `{borderRadius.6}` | `{borderRadius.6}` | `{borderRadius.8}` | sm/md = 6px; lg = 8px |
| `container.borderRadius` (circular) | `9999px` | `9999px` | `9999px` | pill |
| `label.fontSize` | `{fontSize.14}` | `{fontSize.14}` | `{fontSize.16}` | sm/md identical |
| `label.lineHeight` | `{lineHeight.20}` | `{lineHeight.20}` | `{lineHeight.24}` | — |
| `label.fontWeight` | `{fontWeight.500}` | `{fontWeight.500}` | `{fontWeight.500}` | Onest Medium |
| `icon.size` | `16px` (xs spinner) | `20px` | `20px` | spinner overlay matches: sm→`size="xs"`, md/lg→`size="sm"` |

### Variant × state colour grid (light mode, from state matrix `653:19201`)

All 5 variants share identical **focus** treatment (same brand-blue dual ring) and identical **disabled** treatment (`#f1f1f1` background, `#b2b2b2` label/icon). The five differ only in default/hover/active.

| Variant | bg.default | bg.hover | bg.active | label/icon |
|---|---|---|---|---|
| `primary` | `{color.background.brand.default}` (#0058d2) | `{color.background.brand.default-hover}` (#0046a8) | `{color.background.brand.default-active}` (#00357e) | `{color.text.base.inverse-on-color}` (white) |
| `secondary` | `{color.background.brand.secondary}` (#e8f0fb) | `{color.background.brand.secondary-hover}` (#ccdef6) | `{color.background.brand.secondary-active}` (#99bced) | `{color.text.brand.on-secondary}` (#0058d2) |
| `strict` | `{color.background.base-inverse.default}` (#1e1e1e) | `{color.background.base-inverse.default-hover}` (#383838) | `{color.background.base-inverse.default-active}` (#444444) | `{color.text.base.inverse-on-color}` (white) |
| `neutral` | `{color.background.base.tertiary}` (#f1f1f1) | `{color.background.base.tertiary-hover}` (#d9d9d9) | `{color.background.base.tertiary-active}` (#b2b2b2) | `{color.text.base.default}` (#121212) |
| `destructive` | `{color.background.danger.default}` (#d92d20) | `{color.background.danger.default-hover}` (#b32318) | `{color.background.danger.default-active}` (#912018) | `{color.text.base.inverse-on-color}` (white) |

**Disabled** (all variants): `bg = {color.background.disabled.default}` (#f1f1f1), `label/icon = {color.text.disabled.on-disabled}` (#b2b2b2).
**Loading** (all variants): bg unchanged from default; label `opacity: 0` preserved for AT; spinner overlays centred.
**Focus**: dual `box-shadow: 0 0 0 2px {focusRing.color.inner}, 0 0 0 5px {focusRing.color.outer}` — same ring on every variant; bg unchanged from default.

Dark mode counterpart values are extracted at execution time from the dark frames of `653:19201` and written to `tokens/core.dark/components/button.tokens.json`.

### Focus-ring tokens (shared — new file)

`tokens/core/focus-ring.tokens.json`:

| Token | $value | Notes |
|---|---|---|
| `focusRing.color.inner` | `{color.background.base.default}` (white in light, near-black in dark) | inner 2px halo |
| `focusRing.color.outer` | `{color.background.brand.focus-ring}` (semantic alias for #3379db) | outer 5px halo — needs semantic alias in `color.tokens.json` (or fall back to `{palette.blue-sky.500}` if alias not present, with a TODO) |
| `focusRing.shadow.medium` | composite — see implementation note | Style Dictionary will emit two CSS vars (`--focus-ring-color-inner`, `--focus-ring-color-outer`) that the consumer combines in a `box-shadow` declaration. The `shadow.medium` token itself is documented but won't be a single CSS var — DTCG `shadow` composites aren't first-class in our current SD config. |

**Implementation note**: CSS pulls the two colour vars directly:
```css
::slotted(button:focus-visible),
::slotted(a:focus-visible) {
  outline: none;
  box-shadow:
    0 0 0 2px var(--focus-ring-color-inner),
    0 0 0 5px var(--focus-ring-color-outer);
}
```

---

## Implementation order (strict token-first)

Per AGENTS.md § "Build Order" and § "Token-First":

1. **Tokens** — write `tokens/core/focus-ring.tokens.json` → `tokens/core/components/button.tokens.json` → `tokens/core.dark/components/button.tokens.json`. Run `yarn tokens.build`. Run `yarn tokens.validate` until clean (3-tier, no palette refs, DTCG-shape).
2. **CSS** — `mud-button.css` consuming only `--mud-button-*` and `--focus-ring-*` vars. No hex/px literals. Logical properties throughout (`padding-inline`, `padding-block`, `inset-inline-start`). `@media (prefers-reduced-motion: reduce)` disables transitions + spinner rotation.
3. **TSX** — `mud-button.tsx` in member order (props → state → element → lifecycle → private → render). Slot detection via `onSlotchange` → `@State`. Declarative `<Host class={this.getHostClasses()}>`. Default-slot validation via `invalidSlottedTag()`. Loading overlay renders `<mud-spinner>` inside shadow tree; size mapped `sm→xs`, `md|lg→sm`.
4. **Types/constants** — `mud-button.types.ts` (const-tuple pattern from spinner), `mud-button.constants.ts` (`BUTTON_TAGS`).
5. **Registration** — append exports to `src/index.ts`.
6. **Storybook smoke** — `yarn dx:stencil:once && yarn sp.dev`. Visit `/iframe.html?id=atoms-button--default`. Confirm shadow DOM is clean (no console errors, no missing CSS vars).
7. **Auxiliary work** — dispatch `parallel-aux-tasks` skill in `parallel-write` mode with the standard 5-subagent set (see § 8).

Verification gates after each layer:
- After § 1: `yarn tokens.build` exit 0; `yarn tokens.validate` exit 0; `dist/design-system/tokens/*.css` regenerated.
- After § 2: storybook iframe renders default story without console errors; `yarn lint.css` clean.
- After § 3: `yarn lint` clean; element upgrades in browser; `<Host>` reflects all 5 attributes; `aria-disabled` / `aria-busy` mirror to slotted root.

---

## Stories (archetype `atom-interactive` gated set)

Per `src/components/_agents/storybook-stories.md` and the spinner precedent, write these stories in `mud-button.stories.ts`:

| Story | Purpose |
|---|---|
| `Default` | Single button, full argTypes controls, `docs.source.type: 'dynamic'`. |
| `AllVariants` | 5 variants in a row, `size: md`, `shape: rectangular`. |
| `AllSizes` | 3 sizes in a row, `variant: primary`. |
| `AllShapes` | `rectangular` vs `circular` (icon-only on the circular for visual interest). |
| `SlotVariations` | 4 cells: text-only, leading-icon, trailing-icon, icon-only. |
| `States` | 6 states (default/hover/active/focus/loading/disabled) for `primary` at `md`. Uses `pseudo` classes from `storybook-addon-pseudo-states` if available, else duplicate buttons with `data-state="hover"` etc. and forced class. |
| `AllStatesTable` | Full 5 × 6 matrix (variant × state). Hidden from autodocs (`tags: ['!autodocs']`); used by pixel-perfect-verifier. |
| `LoadingPlayground` | Live `loading` toggle; demonstrates focus + AT preservation + reduced-motion. |
| `IconOnlyA11yWarning` | An `icon-only` button **without** `aria-label` on the slotted root — used to demonstrate the dev-time console warning. Tagged `['!autodocs']`. |
| `CoverageGuard` | Mirrors spinner's constructor-branch coverage trick. Hidden. |
| `ReducedMotion` | Override `--mud-button-transition-duration: 0ms` wrapper; mirrors spinner story 173–209. |

---

## Tests

`src/components/mud-button/test/mud-button.spec.tsx` — `@stencil/vitest` + `render(<jsx>)`. Mirror the [spinner spec](src/components/mud-spinner/test/mud-spinner.spec.tsx) shape. Coverage target ≥ 80% per project standard.

Cases:
- Default render — variant=primary, size=md, shape=rectangular reflected to host.
- `it.each(BUTTON_VARIANTS)` — variant attribute reflects + correct CSS var resolves.
- `it.each(BUTTON_SIZES)` — size attribute reflects + correct min-width applied.
- `it.each(BUTTON_SHAPES)` — shape attribute reflects.
- `disabled` prop → host has `aria-disabled="true"` and slotted button has `aria-disabled` mirrored.
- `loading` prop → host has `aria-busy="true"`, `mud-spinner` rendered in shadow tree with mapped size (`button.sm → spinner.xs`, `button.md|lg → spinner.sm`), variant-mapped colour.
- Invalid default-slot tag (e.g. `<p>`) → fallback string from `invalidSlottedTag()` rendered.
- Valid default slot — `<button>` and `<a>` both accepted.
- Slot detection — adding/removing `[slot="leading-icon"]` toggles `has-leading` class on host; same for `trailing-icon` and `icon-only`.
- Icon-only slot without `aria-label` on slotted root → dev-mode `console.warn` called once.
- `CoverageGuard` parity: constructor with `registerHost=false` exercises the Stencil-injected branch.

---

## Aux-tasks dispatch (after Core Build)

Once the Storybook smoke story renders cleanly, invoke the `parallel-aux-tasks` skill in `parallel-write` mode with the full-5 subagent set, single message:

| Subagent | Mode | Output |
|---|---|---|
| `pixel-perfect-verifier` | read-only | Per-state diff report against Figma nodes 653:19205…653:19304, 653:21100, 653:21110, 653:19116/19120/19124/19128 — both light & dark. |
| `a11y-verifier` | read-only | WCAG 2.1 AA findings — keyboard nav, focus ring contrast (3:1 vs adjacent), label contrast (4.5:1), ARIA reflection, `prefers-reduced-motion`. |
| `story-writer` | parallel-write | Writes `mud-button.stories.ts` per the § 7 gated set. (Plan already contains the spec; story-writer fills in the helper functions.) |
| `test-writer` | parallel-write | Writes `mud-button.spec.tsx` per § 8. |
| `integration-checker` | read-only | Confirms `src/index.ts` exports added; greps `mud-button` usages across the repo; flags `src/legacy/*` consumers as out-of-scope for this PR. |

After dispatch returns, fold the findings back into the codebase, re-run the smoke gates.

---

## Acceptance criteria (final gate)

**Visual**: `mcp__image-compare__compare_images` diff < 0.5% for every variant × state × size × shape × slot configuration node in both light and dark mode.

**Functional**:
- Slotted `<button>`/`<a>` receives native `click`; invalid root renders fallback string.
- `disabled` blocks click + mirrors to slotted root; `loading` blocks click + sets `aria-busy`.
- `:focus-visible` ring shows on keyboard focus only (Tab), not mouse click.
- Text truncates with ellipsis at one line; `min-width` of 52/56/72 px enforces baseline.

**A11y (WCAG 2.1 AA)**:
- Accessible name on every interactive element; `icon-only` requires `aria-label` on slotted root — dev warning when absent (SC 2.5.3, 4.1.2).
- Keyboard parity — Tab focuses, Enter/Space activates (native) (SC 2.1.1).
- Focus ring ≥ 3:1 against adjacent surfaces in light + dark (SC 2.4.7, 1.4.11).
- Text contrast ≥ 4.5:1 per variant per state (SC 1.4.3) — verified via `yarn audit:contrast`.
- ARIA reflects state: `aria-disabled`, `aria-busy` (SC 4.1.2).
- Touch target ≥ 48 px (md/lg); sm (32 px) extended to 40 × 40 via invisible `::before` tap area (SC 2.5.5).
- `prefers-reduced-motion` disables transitions + spinner rotation (SC 2.3.3).
- RTL via logical properties (auto).

**Quality**:
- `yarn build` exit 0.
- `yarn lint` + `yarn lint.css` exit 0.
- `yarn tokens.validate` exit 0.
- `yarn audit:contrast` exit 0 (light + dark).
- `yarn test` exit 0 with ≥ 80% coverage on `mud-button.tsx`.
- `yarn sp.build` exit 0; new stories render without console errors.

---

## Verification (end-to-end test plan)

After implementation, run from the repo root (PowerShell):

```powershell
yarn tokens.build              # 1. Rebuild tokens
yarn tokens.validate           # 2. Validate 3-tier hierarchy
yarn audit:contrast            # 3. WCAG light + dark
yarn lint; yarn lint.css       # 4. JS + CSS lint
yarn test                      # 5. Vitest unit suite
yarn sp.dev                    # 6. Storybook dev server (port 6007)
```

Then in the browser:
1. Open `http://localhost:6007/?path=/story/atoms-button--all-states-table` — verify pixel-perfect match against Figma node `653:19201`.
2. Switch theme to dark — re-verify the matrix.
3. Open `/story/atoms-button--slot-variations` — tab through each cell, confirm dual-ring focus.
4. Open `/story/atoms-button--loading-playground` — toggle `loading`, confirm spinner shows + ATs hear "Loading", `aria-busy` reflects.
5. Open `/story/atoms-button--icon-only-a11y-warning` — open DevTools console; confirm `console.warn` fires once.
6. Set OS `prefers-reduced-motion: reduce` (or use the `ReducedMotion` story) — confirm spinner doesn't spin.

Use `mcp__playwright__browser_navigate` + `mcp__playwright__browser_take_screenshot` + `mcp__image-compare__compare_images` to automate the visual gate against the Figma reference screenshots captured for the state matrix.

Final step: open a draft PR with the **Migration table** (§ 9 of the user-supplied spec) included in the description so consumers of the legacy `mud-button` understand the rename map (`primary-gray → secondary`, `tertiary → neutral`, `positive → primary`, `negative → destructive`, etc. — final mapping confirmed at PR-author time).
