# Project Specification — `@egov-moldova/mud`

## 1. Purpose

`@egov-moldova/mud` is a **Stencil web-component design system** that powers Corlab products. It exposes:

- Native custom elements (`mud-*` prefix) consumed directly in HTML or via framework wrappers
- Design tokens generated through Style Dictionary (DTCG format)
- Storybook documentation as the canonical visual reference
- Theme support — base (`core`) and AGE client variant; dark mode is a separate phase

The package is published as `@egov-moldova/mud` and is built to be framework-agnostic; React, Angular, and Vue wrappers consume the same web components.

## 2. Tech Stack

| Concern | Tool | Version |
|---|---|---|
| Component framework | StencilJS | 4.x |
| Language | TypeScript | 5.x |
| Documentation / visual testing | Storybook (`@storybook/web-components-vite`) | 10.x, port **6007** |
| Token pipeline | Style Dictionary (DTCG `$value` / `$type`) | 4.4+ |
| Build orchestration | Wireit | 0.11+ |
| Unit + E2E tests | Jest (with Stencil test runner) | 30.x |
| Package manager | Yarn | 4.x |
| Node | Node | >= 22 |
| Linting | ESLint + Prettier + Stylelint | latest |

Distribution: dual-format `dist/` (ESM + CJS), `loader/` for lazy loading, and per-framework workspace outputs.

## 3. Workspace Structure

Yarn monorepo with a single workspace (`web-components`):

```
age-design/
├── package.json              ← root: shared deps + scripts
├── src/                       ← Stencil source (mud-* components)
├── tokens/                    ← design tokens (DTCG JSON)
├── .storybook/                ← Storybook config
├── dist/                      ← built outputs (gitignored)
└── web-components/            ← workspace: consumable @egov-moldova/mud-web-components bundle
```

`web-components` is the supported consumable adapter. Framework wrappers (Angular, React, Vue) were retired in 2026-05; consumers use `defineCustomElements()` from `@egov-moldova/mud-web-components` directly.

## 4. Build Orchestration — Wireit

All scripts are declared via [Wireit](https://github.com/google/wireit). Dependencies, parallelism, and caching are declarative. Never chain commands manually with `&&` — let Wireit resolve the graph.

Key entry points (see `package.json` and [`_agents/environment-commands.md`](../_agents/environment-commands.md)):

| Command | Effect | Time |
|---|---|---|
| `yarn dev` | Stencil + Storybook + token watch (services) | n/a |
| `yarn build` | Full production: tokens + components + custom-elements + docs | ~30–60s |
| `yarn build.web` | Build the `@egov-moldova/mud-web-components` vanilla adapter | varies |
| `yarn demo.web` | Serve the `@egov-moldova/mud-web-components` demo (<http://localhost:5174>) | service |
| `yarn tokens.build` | Build core + dark tokens (cached) | ~5s |
| `yarn tokens.build.prod` | Production tokens (optimized) | ~5s |
| `yarn tokens.build.age` | AGE client theme tokens only | ~5s |
| `yarn tokens.watch` | Watch token files | service |
| `yarn tokens.audit` | Debug missing token references | ~2s |
| `yarn dx:stencil:once` | Single Stencil dev build (no docs) | ~20s |
| `yarn sp.dev.watch` | Storybook dev server on port 6007 | service |
| `yarn sp.build` | Storybook static export (strictest gate) | ~60s |
| `yarn test` | Jest unit + Stencil E2E | varies |
| `yarn lint` | ESLint + Prettier + Stylelint | ~10s |

## 5. Distribution

Published artifacts:

- `dist/` — ESM + CJS bundles, types, design-system CSS, token CSS, custom-elements JSON
- `loader/` — Stencil lazy loader
- `dist/mud/tokens/*.css` — generated CSS variables consumable by any framework

Consumers:

- Direct HTML: `<script type="module" src="...mud.esm.js">` + `defineCustomElements()` from `@egov-moldova/mud-web-components`
- Vanilla / bundler-based apps: install `@egov-moldova/mud` + `@egov-moldova/mud-web-components`, then call `defineCustomElements()` once at startup
- Token CSS: import `@egov-moldova/mud/tokens/core.tokens.css`

## 6. AI Automation & Agentic Tooling

The repo ships a layered automation stack:

| Layer | Location | Purpose |
|---|---|---|
| Root `AGENTS.md` | [`AGENTS.md`](../AGENTS.md) | Index + critical rules — load first |
| Scoped `AGENTS.md` | [`src/components/AGENTS.md`](../src/components/AGENTS.md), [`tokens/AGENTS.md`](../tokens/AGENTS.md) | Scope-specific extensions |
| `_agents/*.md` subfiles | [`_agents/`](../_agents/) + scoped equivalents | Detailed rules, anti-patterns, command references — load on demand |
| `.claude/commands/` | [`.claude/commands/`](../.claude/commands/) | Slash commands for linear workflows |
| `.claude/agents/` | [`.claude/agents/`](../.claude/agents/) | Subagents for multi-phase pipelines |
| `.claude/skills/` | [`.claude/skills/`](../.claude/skills/) | Reusable knowledge invoked from commands/agents |

### MCP servers (`.mcp.json` at repo root)

| Server | Logical alias | Use |
|---|---|---|
| `playwright` | `mcp__playwright__browser_*` | Browser automation, screenshots, computed styles, accessibility tree |
| `figma` | `mcp__figma__*` | Figma design extraction, screenshots, variable defs |
| `context7` | `mcp__context7__*` | Stencil / Style Dictionary / Storybook runtime docs |
| `image-compare` | `mcp__image-compare__*` | Pixel-perfect QA diff |
| `agentation` | `mcp__agentation__*` | Browser-annotation feedback loop |

See [`_agents/mcp-tools.md`](../_agents/mcp-tools.md) for the full reference and tool list.

## 7. Quality Gates

Every component must pass before merge:

1. **Lint**: `yarn lint` clean (ESLint + Prettier + Stylelint)
2. **Tests**: `yarn test` — Jest unit + Stencil E2E
3. **Build**: `yarn build` — full production build with no TypeScript errors
4. **Storybook**: `yarn sp.build` — static export succeeds (strictest gate)
5. **Token audit**: `yarn tokens.audit` — zero missing references
6. **Console**: zero runtime errors when navigating the component story
7. **Pixel-perfect**: visual diff against Figma < 0.5% (see [`_agents/pixel-perfect-qa.md`](../_agents/pixel-perfect-qa.md))
8. **Accessibility**: WCAG 2.1 AA — keyboard nav, ARIA, focus indicators, color contrast (see `/audit-accessibility`)

Pre-PR: run [`/pre-pr-check`](../.claude/commands/pre-pr-check.md). Pre-merge / production-readiness: run [`audit-production`](../.claude/agents/audit-production.md) subagent.

## 8. Form-Associated Components

Form elements (input, select, checkbox, radio, textarea, toggle) must implement Stencil's form-associated API:

- `formAssociated: true` on `@Component`
- `@AttachInternals() internals!: ElementInternals`
- `internals.setFormValue()` on change handlers
- Lifecycle callbacks: `formResetCallback()`, `formDisabledCallback(disabled)`, `formStateRestoreCallback(state, mode)`
- `updateValidity()` — copies all `ValidityState` flags to `internals.setValidity()`

See [`src/components/_agents/form-associated.md`](../src/components/_agents/form-associated.md) for the full API and patterns.

## 9. Theming

| Theme | Path | Status |
|---|---|---|
| Core | `tokens/core/` | Active — default light theme |
| AGE | `tokens/age/` | Active — Corlab AGE product variant |
| Core Dark | `tokens/core.dark/` | DEFERRED — out of scope until final project phase |

Theme switching via `data-theme` attribute on the document root.

## 10. Project Boundaries

**In scope**:

- Stencil web components with `mud-` prefix
- Design tokens in DTCG format
- Storybook docs and visual reference
- Framework wrappers (consume same web components)

**Out of scope**:

- Business logic, data fetching, state management — consumer concern
- Backend validation — design system implements client-side validation only
- Dark mode tokens — DEFERRED
- Custom illustrations beyond `mud-illustration-*` components — handled via `figma-illustration-import` skill on demand

## 11. References

- [`AGENTS.md`](../AGENTS.md) — runtime guidance, critical rules, subfile index
- [`TOKEN-ARCHITECTURE.md`](TOKEN-ARCHITECTURE.md) — token design and pipeline
- [`COMPONENT-DEVELOPMENT-GUIDE.md`](COMPONENT-DEVELOPMENT-GUIDE.md) — component anatomy and workflow
- [`README.md`](../README.md) — public-facing project README
