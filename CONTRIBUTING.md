# Contributing to MUD (Moldova UI Design System)

Thanks for your interest in contributing! This guide covers everything you need to develop, test, and submit changes to this repository.

> Looking to **use** MUD components in your own app? See [README.md](README.md) instead — this file is for people contributing *to* this repository.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)
4. [Repository Structure](#repository-structure)
5. [Development Workflow](#development-workflow)
6. [Design Tokens](#design-tokens)
7. [Coding Standards](#coding-standards)
8. [Testing](#testing)
9. [Commit Messages](#commit-messages)
10. [Submitting a Pull Request](#submitting-a-pull-request)
11. [Publishing](#publishing)
12. [Troubleshooting](#troubleshooting)
13. [Getting Help](#getting-help)

---

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you're expected to uphold it.

---

## Prerequisites

- **Node.js** `>=24.0.0 <25.0.0`
- **Yarn** `4.x` (this monorepo uses Yarn workspaces — install via [Corepack](https://yarnpkg.com/corepack), already bundled with Node)

---

## Getting Started

```bash
# 1. Clone and install
git clone https://github.com/e-government-md/design-system.git
cd design-system
yarn install

# 2. Build everything once (tokens → Stencil components → dist/)
yarn build

# 3. Start the dev loop (Stencil watch + Storybook + token watch, all in parallel)
yarn dev
```

Storybook opens at `http://localhost:6007` with hot-reload — this is where you'll do most of your day-to-day development and visual verification.

---

## Repository Structure

This is a monorepo (Yarn workspaces) publishing three packages:

| Package | Location | Description |
| --- | --- | --- |
| `@egov-moldova/design-system` | repo root | Core Stencil web components — framework-agnostic, Shadow DOM–isolated |
| `@egov-moldova/design-system-web-components` | `web-components/` | Vanilla HTML/JS adapter — thin re-export of the Stencil loader |
| `@egov-moldova/design-system-react` | `react/` | React adapter (typed JSX wrappers) — **in progress**, not yet published |

Key directories:

```text
src/components/     # mud-* Stencil components (source of truth)
src/hidden/         # components still in development (not yet graduated to src/components/)
src/assets/         # fonts, icons, shared assets
tokens/core/        # source design tokens (light) — Style Dictionary, DTCG format
tokens/core.dark/   # source design tokens (dark)
tokens/generated/   # build output — never hand-edit
web-components/     # vanilla JS/HTML adapter package
react/              # React adapter package (WIP)
scripts/            # build tooling, token sync, audits
.storybook/         # Storybook config + stories assets
```

Additional docs worth knowing about:

- [`AGENTS.md`](AGENTS.md) — AI-assisted development guide (component architecture, anti-patterns, workflow rules)
- [`STACK.md`](STACK.md) — full tech stack rationale
- [`PRINCIPLES.md`](PRINCIPLES.md) — design/engineering principles behind the system
- [`TESTING.md`](TESTING.md) — testing philosophy, coverage targets, mocking policy
- [`DESIGN.md`](DESIGN.md) — visual design language reference

---

## Development Workflow

1. **Create a branch** off `main`: `git checkout -b feat/short-description` (or `fix/`, `chore/`, `docs/` — matches the [commit conventions](#commit-messages) below).
2. **Edit components** in `src/components/` (or `src/hidden/` if the component isn't production-ready yet).
3. **Run the dev loop**: `yarn dev` — Stencil, Storybook, and token watch run together via Wireit; changes hot-reload in Storybook.
4. **For vanilla-adapter changes**, verify against the demo:
   ```bash
   yarn build && yarn build.web && yarn demo.web
   ```
   Opens `http://localhost:5174` with a live `<mud-button>` showcase served from [`web-components/demo/index.html`](web-components/demo/index.html).
5. **Lint and typecheck before committing**:
   ```bash
   yarn lint        # ESLint (src/**/*.{ts,tsx}) + Stylelint (src/**/*.css)
   yarn typecheck    # tsc --noEmit
   yarn format       # auto-fix lint + Prettier
   ```
6. **Run tests**: `yarn test` (see [Testing](#testing) below).
7. **Commit** using [Conventional Commits](#commit-messages), **push**, and **open a PR**.

### Script reference

| Script | Purpose |
| --- | --- |
| `yarn dev` | Dev server: Stencil watch + Storybook + token watch (port 6007) |
| `yarn build` | Full build: tokens → Stencil components → `dist/`, `loader/` |
| `yarn build.web` | Builds `@egov-moldova/design-system-web-components` (depends on `build`) |
| `yarn demo.web` | Runs the vanilla-adapter demo at `http://localhost:5174` |
| `yarn sp.build` | Production Storybook build → `storybook-static/` |
| `yarn sp.serve` | Serves `storybook-static/` locally at `http://localhost:6008` |
| `yarn lint` | ESLint + Stylelint (no fixes) |
| `yarn format` | ESLint `--fix` + Prettier `--write` |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn test` | Full unit test suite — `vitest run --project spec`, wireit-cached; compiles components from source and builds no `dist/` |
| `yarn check` | `format` then the full local verify gate (`typecheck` + `lint` + `test`) — run this before opening a PR |

---

## Design Tokens

MUD uses a three-tier design token hierarchy (**palette → semantic → component**) built with [Style Dictionary](https://styledictionary.io/). Tokens are synchronized from Figma via the **Tokenhaus** plugin.

**Sync workflow (review-first — never overwrites source tokens automatically):**

1. In Figma, export variables with the Tokenhaus plugin to `tokens-tokenhaus.json`.
2. Run the sync helper:
   ```bash
   yarn sync:tokens
   # or with a dry run first:
   node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --output tokens/figma-export --dry-run
   ```
3. Review the generated output in `tokens/figma-export/` — this step never touches `tokens/core/` or `tokens/core.dark/` directly.
4. Manually copy approved files into `tokens/core/` and `tokens/core.dark/`, then commit.
5. Rebuild and validate:
   ```bash
   yarn tokens.build
   yarn tokens.lint.all
   yarn tokens.audit && yarn tokens.audit.dark
   ```

**Always run `yarn tokens.lint.all` before opening a PR that touches tokens.** Keep token-only PRs separate from component PRs — tokens affect the entire system and are easier to review in isolation.

---

## Coding Standards

- **TypeScript / Stencil**: strict mode, no `any` escapes. See [`AGENTS.md`](AGENTS.md) and the `stencil-compliance` guidance for decorator usage, lifecycle rules, and the 25 documented anti-patterns.
- **Formatting**: Prettier + ESLint (`yarn format` auto-fixes both). CSS is linted with Stylelint (`stylelint-config-standard` + `stylelint-declaration-strict-value` — no hardcoded colors, tokens only).
- **Design tokens over hardcoded values** — any color, spacing, or typography value in component CSS must resolve to a token. `yarn lint.colors` catches hardcoded hex/rgb values.
- **Accessibility is not optional** — every component must meet WCAG 2.1 AA. See the accessibility contract in `TESTING.md` and the `accessibility-compliance` reference.
- **Auto-generated files are read-only.** Never hand-edit `src/components.d.ts`, `src/components/*/readme.md`, `.storybook/custom-elements.json`, or `tokens/generated/**` — they're regenerated by `yarn build`. See `AGENTS.md § Merge driver for auto-generated files` for how conflicts in these files are resolved.

---

## Testing

Every `mud-*` component ships with a co-located `*.spec.tsx` covering rendering, prop reflection, slots, events, and structural ARIA/a11y assertions. Full policy — including the **zero-mocks rule** and the **80% line coverage target** — is documented in [`TESTING.md`](TESTING.md).

```bash
yarn test              # canonical: vitest run --project spec (wireit-cached, builds nothing)
yarn test.dev          # fast loop, no wireit cache layer
yarn test.watch        # watch mode
yarn test.storybook    # browser-rendered story/interaction tests
```

Both `yarn test` and `yarn test.storybook` must pass before a component graduates from `src/hidden/` to `src/components/`.

---

## Commit Messages

This repo enforces [Conventional Commits](https://www.conventionalcommits.org/) via `commitlint` + Husky's `commit-msg` hook. Format:

```text
<type>(<optional scope>): <description>

[optional body]
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`. Examples:

```text
feat(mud-button): add loading state
fix(tokens): correct dark-mode contrast for mud-badge
docs(contributing): clarify token sync workflow
```

Husky hooks run automatically after `yarn install` (via the `prepare` script) — no manual setup needed.

---

## Submitting a Pull Request

1. Before opening a PR, run the full local verify gate: `yarn check` (format + typecheck + lint + test), plus `yarn build` to confirm generated files are up to date. If you touched a component, commit any resulting diff in `src/components.d.ts`, `src/components/*/readme.md`, etc. — these are auto-generated and must stay in sync with source.
2. Push your branch and open a PR against `main`. Describe what changed and why, and note the test plan (what you ran, e.g. `yarn check`, `yarn build`, manual Storybook verification).
3. Address review feedback with new commits (avoid force-pushing mid-review unless asked to squash/rebase).
4. A maintainer reviews and merges once the checklist is satisfied.

---

## Publishing

Publishing to npm (`@egov-moldova` scope) is handled by project maintainers — contributors don't need to publish packages themselves.

For local testing against another project without publishing, use path installs:

```bash
yarn add file:/absolute/path/to/design-system
yarn add file:/absolute/path/to/design-system/web-components
```

---

## Troubleshooting

### `yarn install` fails or dependencies look wrong

Make sure Corepack is enabled (`corepack enable`) so the pinned Yarn version (see `packageManager` in `package.json`) is used, not a system-wide Yarn.

### TypeScript errors for component properties in a consuming project

Not a contributing issue directly, but common when testing a local build — ensure the vanilla adapter's type augmentation is imported:

```ts
// src/types/mud.d.ts
import type {} from '@egov-moldova/design-system-web-components';
```

### `yarn dev` hangs or Storybook never opens

Wireit waits for `dist/mud/mud.esm.js`, `dist/mud/mud.css`, and `tokens/generated/core.tokens.css` before starting Storybook. If the initial build failed silently, run `yarn build` directly first to see the real error.

### Auto-generated files are out of sync

You edited a component's source but didn't rebuild before committing. Run `yarn build` locally and commit the residual diff in `src/components.d.ts`, `src/components/*/readme.md`, etc.

---

## Getting Help

- Check existing [issues](../../issues) before opening a new one.
- For questions about the design language or token model, see [`DESIGN.md`](DESIGN.md) and [`PRINCIPLES.md`](PRINCIPLES.md).
- For AI-assisted contributions (Claude Code or similar), start with [`AGENTS.md`](AGENTS.md) — it's the canonical index into the repo's `_agents/*.md` subfiles.
