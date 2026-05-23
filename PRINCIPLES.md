# PRINCIPLES.md — `@age/design-system`

Engineering posture for the Corlab Design System (Stencil web components, design tokens, Storybook). This file is durable policy. When a rule below collides with `AGENTS.md`, `AGENTS.md` wins on workflow specifics; this file owns code-shape opinions.

## A. Engineering posture

- **Main risk: losing maintainability.** Token drift, duplicated component logic, and accumulated anti-patterns are what hurt us, not shipping speed. Optimize every decision against this risk first.
- **Design correct the first time.** Figma extraction → token plan → implementation → pixel-perfect QA → audit. The pipeline is non-negotiable; steps do not get skipped to ship faster.
- **All gates stay under time pressure.** Token-first, pixel-perfect, a11y, and tests are all mandatory regardless of deadline. If we cannot meet the gates, the work is not done — we cut scope, not gates.

## B. Abstractions

- **Rule of two.** Extract a helper the second time a pattern duplicates, not the first. The second duplication is the signal — waiting for the third invites drift and divergent copies in the meantime.
- **No interfaces / abstract base classes with one implementation.** Generic types and TS interfaces enter the codebase only after ≥2 concrete consumers exist. Until then, ship the concrete class or shape.
- **Composition over inheritance for `cor-*` components.** Reuse happens via slots + CSS `::part()`. We do not extend one `cor-*` from another at the TS class level — even `cor-icon-button` composes `cor-icon` via slot, it does not inherit `cor-button`.

## C. Comments & naming

- **Zero comments by default; WHY-only when needed.** Comments exist for non-obvious workarounds, subtle invariants, hidden constraints, or behavior that would surprise a reader. Never WHAT-comments — naming covers that. Never reference the current task, PR, or caller — those rot.
- **Short names when the domain is clear; long names otherwise.** Inside `cor-button.tsx`, `variant` and `state` are fine. At module boundaries, prefer the explicit form (`getActiveTokenForVariant` over `getToken`). The test: would a new contributor reading this file cold understand the name?
- **Abbreviations: universal conventions only.** `i` / `idx` in loops, `ctx` for context, `el` for `@Element` host references, `props` / `attrs` for component inputs. Everything else is spelled out — no `usr`, `cfg`, `btn`, `cmp`.

## D. Error handling

- **Validate at the public `@Prop` boundary only.** Internal functions trust their callers and the type system. No defensive `if (!arg) return` in pure helpers. `@Prop` decorators with `!` plus `@Watch` for runtime range checks (e.g. invalid `variant`) cover the validation surface.
- **Invalid input → `console.warn` + fallback to default.** When a `@Watch` detects a bad `@Prop` value (e.g. `variant="bogus"`), warn in development with the component name and offending value, then coerce to the default. Never throw — a `cor-*` rendering with the wrong variant is better than a broken page.
- **Logging: critical errors in dev only; production silent.** Components must never `console.log`. `console.warn` only for clear integration mistakes (invalid props, required slot missing when variant demands it), stripped or quiet in production builds. State changes leave the component via `@Event` — the consumer decides what to log.

## E. Discipline

- **Refactor lives in its own PR.** A bug fix changes the buggy lines and nothing else. Cleanup, renames, and structural changes go through `/refactor-component` or a standalone refactor PR. Diffs stay focused and reviewable.
- **TODOs require an issue link.** `// TODO(#123): wire dark mode token` is acceptable. `// TODO` alone is not. The audit pipeline and code review should reject orphan TODOs.
- **Never hand-edit generated files.** `src/components.d.ts`, `src/components/*/readme.md`, `.storybook/custom-elements.json`, and `tokens/generated/**` are produced by `yarn build`. The pre-commit hook auto-unstages them. Merge conflicts in generated files are resolved by rebuilding, not by editing markers. See `AGENTS.md § Merge driver for auto-generated files`.

## Cross-references

- `AGENTS.md` — workflow rules, slash commands, MCP tools, Figma-first / token-first / pixel-perfect gates.
- `STACK.md` — language/runtime/library choices and the anti-choices.
- `TESTING.md` — what we test, what we don't, mocking policy, coverage target.
