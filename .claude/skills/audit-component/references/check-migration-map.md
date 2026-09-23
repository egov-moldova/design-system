# Where the old manual checks went

**Scope:** a historical record of where each check of the removed manual Wave 1–3 fallback, WCAG quick-check and Security & Performance spot-check now lives, keyed by old check number. No audit step reads it. Load it when tracing where an old manual check went, or when a caller or reviewer asks whether a check was dropped.

The manual Wave 1–3 fallback, the WCAG quick-check and the Security & Performance spot-check are
gone. Every check they carried, and its home. "ref judgment" = the
[static-judgment reference](wave-2-static-analysis.md), recorded as findings in the
session's `audit-component` file (advisory). A leg named as a home is advisory too (Decision 12).

| # | Old check | Home |
| --- | --- | --- |
| 1 | Read TSX / CSS / types / enums / constants / stories / spec | `01` (file set), `14` (contract); legs read what they judge |
| 2 | Read the E2E spec (`--e2e`) | `e2e` row at `deep`, deferred: no E2E test project |
| 3 | Read the component tokens file | `01` `STRUCTURE-MISSING-TOKENS`, `13` |
| 4 | Read `mud-button` / `mud-text-input` for comparison | dropped: a comparison source, not a check; the rules they illustrate are in `02`, `16`, `17` and lint |
| 5 | Anti-pattern grep, CSS + TSX | `02` |
| 6 | `yarn lint` | `lint` row: ESLint + Stylelint on the component's files (Prettier stays in repo-wide `yarn lint`) |
| 7 | `yarn tokens.build` | prerequisite `yarn dx:prepare` (`standard`+) |
| 8 | Probe port 6007 / start Storybook | orchestrator: this worktree's Storybook, `.audit-storybook.json` |
| 9 | File structure | `01` |
| 10 | Member order, `@Watch` rules | `16` (report-only) |
| 11 | `!` on decorated fields, no implicit `any` | `tsc` strict in the `dx:stencil:once` prerequisite (a failure leaves Wave B/C rows `INCOMPLETE`); `02` `ANTIPATTERN-TS-ANY` |
| 12 | Generated `HTMLMud…Element` type | lint `@stencil/element-type` |
| 13 | `import type` | lint `consistent-type-imports` |
| 14 | `Record<>` maps, `?.` with `??`, `?` on optional props | ref judgment |
| 15 | Stencil decorator audit | `02`, `16`, `17` (A3, A4 — A4 checks the reserved names lint `@stencil/reserved-member-names` misses, and `@Event` names, which that rule never checks); `manual` rows → the `stencil-compliance` leg |
| 16 | Lifecycle leak / re-attach safety | `02` `ANTIPATTERN-007-LIFECYCLE-LEAK`; LC2 → the `stencil-compliance` leg |
| 17 | Reactivity mutation, `@State` only for render | `02` `ANTIPATTERN-005-ARRAY-MUTATION`; S1–S3 → the `stencil-compliance` leg |
| 18 | Form callbacks present | `16` `STENCIL-FORM-CALLBACKS` |
| 19 | `setFormValue` with two arguments | `02` `ANTIPATTERN-010-SETFORMVALUE-1ARG`, `19` BX7 |
| 20 | Reset / restore / validity behaviour | CX1–CX3 (FORM), the CX leg |
| 21 | DTCG shape, references resolve, tier purity, generated CSS vars exist | CI job `tokens-validate` (`yarn tokens.validate`, repo-wide, not an audit row) |
| 22 | Token naming order, root key | ref judgment |
| 23 | Token values vs the Figma export | `13` |
| 24 | CSS pattern A / B, universal selectors, disabled `pointer-events` / cursor, nesting | ref judgment |
| 25 | `:host { display }` | `02` `ANTIPATTERN-HOST-DISPLAY` |
| 26 | `transition: all`, `!important` | lint (Stylelint) |
| 27 | Prop mirrored as slot fallback | `02` `ANTIPATTERN-026-PROP-CONTENT-SLOT-FALLBACK` |
| 28 | Slot tag validation, `::slotted` rules, slot JSDoc and story | ref judgment |
| 29 | Story lineup and title | `05` |
| 30 | `docs.source` dynamic / typed / composite override | `05` |
| 31 | Story typing (`Meta<Args>`, `args: any`, `typeof meta`, eslint wrap), raw story values, argTypes | ref judgment |
| 32 | Spec anti-patterns, test content | ref judgment |
| 33 | Coverage gate | `06` (warning below its threshold, listed under the brief's "Warnings (non-blocking)"; a failing spec of the component is `COVERAGE-TESTS-FAILED`, an error) |
| 34 | Spec file missing | `01` `STRUCTURE-MISSING-REQUIRED` |
| 35 | Navigate to the story, snapshot | `09`, `19` BX1 |
| 36 | Console messages | `12` (errors; `console.warn` is info) |
| 37 | `yarn audit:contrast`, computed colours light + dark | `10`; per Figma state and theme `15` |
| 38 | Deep `stencil-compliance` pass | `02` + `16` rows; `manual` rows → the `stencil-compliance` leg |
| 39 | Deep `/audit-accessibility` | the `a11y-verifier` leg |
| 40 | Roles, redundant ARIA, `aria-disabled` | `09` captures the tree; judgment → the `a11y-verifier` leg |
| 41 | Accessible name without visible text | `09` `A11Y-MISSING-ACCESSIBLE-NAME` |
| 42 | `aria-invalid` + `aria-describedby` on error | CX1 (FORM) |
| 43 | `role="status"` / `alert` | CX1 (STATUS) |
| 44 | Focusable via Tab | `09` BX2 |
| 45 | Visible focus ring | `09` BX3 |
| 46 | Enter / Space activates | CX1–CX2 (ACTION); other archetypes the `a11y-verifier` leg |
| 47 | Escape closes overlays, no trap | `19` BX4 |
| 48 | Shift+Tab walks back | the `a11y-verifier` leg (not scripted) |
| 49 | Text contrast 4.5:1 / 3:1, both themes | `10` |
| 50 | UI and focus-ring contrast 3:1 (SC 1.4.11) | the `a11y-verifier` leg (`10` does not evaluate it) |
| 51 | Disabled distinguishable, no colour-only information | the `a11y-verifier` leg |
| 52 | Inline styles | `02` `ANTIPATTERN-001-INLINE-STYLE` |
| 53 | `innerHTML` | `02` `ANTIPATTERN-SECURITY-INNERHTML` |
| 54 | Dynamic code execution, unsanitised URLs, slot content validation, secrets in props / events, cookie / storage access, leaking payloads | the security leg (DX-security) |
| 55 | `@State` only for render values | the `stencil-compliance` leg (S1) |
| 56 | Heavy work in `render()`, DOM queries in loops | ref judgment |
| 57 | `shadow: true` | `16` `STENCIL-SHADOW-REQUIRED` |
| 58 | Scoped `window` / `document` listeners | `02` `ANTIPATTERN-007-LIFECYCLE-LEAK` |
| 59 | `transition: all` | lint (Stylelint) |
| 60 | Large inline SVG | `02` `ANTIPATTERN-021-RAW-SVG` |
| 61 | Large dependencies | `08` |
