# AGENTS.md — Corlab Design System AI Engineering Guide

**Project**: `@egov-moldova/mud` — Stencil.js web components with design tokens, Storybook docs, multi-theme support via Style Dictionary.

**Tech Stack**: StencilJS, TypeScript, Storybook (`@storybook/web-components-vite`, Vite / Rolldown + Oxc, port **6007**), Style Dictionary (DTCG `$value`/`$type`), Vitest with `@stencil/vitest`'s Vite plugin (`yarn test` → `vitest run --project spec`), Wireit (script orchestration + caching), Yarn, Node. Versions: see `STACK.md`.

**MCP servers** (configured in `.mcp.json` at repo root): Playwright (`mcp__playwright__*`), Chrome DevTools (`mcp__chrome-devtools__*` — perf/network/memory/Lighthouse), Figma (`mcp__figma__*`), Image Compare (`mcp__image-compare__*`), agentation (`mcp__agentation__*`). See `_agents/mcp-tools.md` for full reference.

**This file is the single source of truth.** Claude Code loads it through `CLAUDE.md` (which imports it); other agents read it directly. It overrides all skill files. Scoped subfiles in `src/components/AGENTS.md` and `tokens/AGENTS.md` extend (never contradict) this file.

**Modular documentation**: Detailed rules live in `_agents/*.md` subfiles. This file serves as the index — load subfiles on-demand based on what you're doing.

---

## Figma-First Rule

**STOP** if the user requests a new component or visual change without a Figma link. Ask for the URL + node ID and wait. Exception: user explicitly says there's no design (utility components, internal tooling) — use `/custom-component` workflow.

---

## Subfile Index — When to Load Each

### Always Read First

| File | What It Covers | When to Load |
|------|---------------|--------------|
| `_agents/workflow-rules.md` | Auto-proceed/stop conditions, deferred summary, human oversight gates | **At conversation start** before any component work |
| `_agents/skills-and-workflows.md` | Skill invocation table, slash commands, parallelization rules | **When starting any component task** |
| `_agents/planning.md` | When a written plan is required, where it lives, required sections | **Before any non-trivial work** — a public-contract change, more than one component, or more than one viable approach |

### Project-Level Docs

| File | What It Covers | When to Load |
|------|---------------|--------------|
| `PRINCIPLES.md` | Code-shape decisions — the trade-offs behind how the codebase is structured | **When a change involves a code-shape decision** |
| `PRODUCT.md` | Users, tone, UX trade-offs | **When a change affects user-facing behavior or copy** |
| `STACK.md` | Versions and rejected choices | **When you need a version, or the reasoning behind a stack choice** |
| `DESIGN.md` | Visual language | **When a change touches visual design beyond a single component's tokens** |

### Design Extraction & Planning

| File | What It Covers | When to Load |
|------|---------------|--------------|
| `_agents/mcp-tools.md` | All MCP tools reference, correct prefixes, tool name corrections | **When calling any MCP tool** (Figma, Playwright) |
| `_agents/reuse-architecture.md` | Reuse-first protocol, decision matrix, architecture decision tree | **Before creating any component** |
| `_agents/figma-extraction.md` | Figma extraction Steps A–A.1.5, behavior exploration, state discovery | **When extracting designs from Figma** |
| `_agents/pre-implementation.md` | Component inventory, build order, approval gate, token-CSS validation | **After Figma extraction, before coding** |
| `_agents/state-extraction.md` | State × element matrix, typography checklist, interactive checklists | **When creating tokens for interactive components** |

### Implementation

| File | What It Covers | When to Load |
|------|---------------|--------------|
| `_agents/environment-commands.md` | Environment checks, build decision matrices, all yarn commands | **Before starting dev server or running builds** |
| `_agents/typescript-strict.md` | All 7 TypeScript strict mode rules + checklist (canonical location) | **When writing `.tsx` or `.stories.ts` files** |
| `_agents/shadow-dom-patterns.md` | Dual selector pattern for slots with default content | **When writing CSS for components with slot defaults** |
| `_agents/anti-patterns.md` | All 25 forbidden patterns | **Before writing component code** |

### Quality Assurance

| File | What It Covers | When to Load |
|------|---------------|--------------|
| `_agents/pixel-perfect-qa.md` | Pixel-perfect rules (tolerances, states); procedure in the `pixel-perfect` skill | **During QA phase — MANDATORY for every component** |
| `_agents/verification-git.md` | 4-phase verification checklist, troubleshooting, git & PR workflow | **Before claiming work complete or creating PR** |
| `_agents/continuous-improvement.md` | Workflow refinement, improvement analysis | **When encountering repeated issues or proposing doc changes** |

---

## Scoped AGENTS.md Files

| File | Scope | When to Load |
|------|-------|--------------|
| `src/components/AGENTS.md` | Component development: slots, CSS, stories, E2E, form elements | **When working in `src/components/`** |
| `tokens/AGENTS.md` | Token development: hierarchy, naming, semantic rules, build commands | **When working in `tokens/`** |

Each scoped file has its own `_agents/` subfiles — see those indexes for topic-specific loading instructions.

---

## Automation — Slash Commands & Subagents

The repo ships ready-to-use slash commands and subagents for routine workflows. See [`.claude/commands/README.md`](.claude/commands/README.md) and [`.claude/agents/README.md`](.claude/agents/README.md) for full quick-references and decision guide.

| Type | Examples | Use when |
|---|---|---|
| **Slash command** ([.claude/commands/](.claude/commands/)) | `/audit-component`, `/audit-accessibility`, `/pre-pr-check`, `/update-tokens`, `/fix-visual-bug`, `/migrate-component`, `/modify-component`, `/optimize-prompt` (mode-routed: new / redesign / modify / fix / tokens) | Linear, single-pass workflows. Argument-driven. Invoke directly in prompt. |
| **Subagent** ([.claude/agents/](.claude/agents/)) | `new-component`, `custom-component`, `audit-production`, `refactor-component` | Multi-phase pipelines with separate context window. Invoke via Task tool or auto-trigger. |
| **Skill** ([.claude/skills/](.claude/skills/)) | `stencil-compliance`, `accessibility-compliance`, `audit-component`, `pixel-perfect`, `token-creation`, `figma-illustration-import`, plus `superpowers:systematic-debugging` and `superpowers:verification-before-completion` from the globally-installed [`superpowers`](.claude/skills/LOCAL-SETUP.md) plugin | Reusable knowledge invoked from inside commands/agents via the Skill tool. **`pixel-perfect`** verifies a component against Figma: a per-component state manifest, exact computed-style parity (`15-style-parity`) and screenshot diffs (`11-pixel-diff-states`). **`stencil-compliance`** catalogs Stencil 4.x rules across 14 areas (decorators, lifecycle, host, JSX, styling, form-associated, reactivity, serialization, functional components, public API). **`audit-component`** wraps the 3-wave production audit so other agents can invoke it programmatically. |

---

## Critical Rules (Always Active)

1. **Figma-First**: No component work without a Figma link (unless explicitly waived). Full rule: `_agents/workflow-rules.md`.
2. **Token-First**: Design tokens are the single source of truth — never hardcode values in CSS
3. **Reuse-First**: Check existing components before creating new ones
4. **Pixel-Perfect**: Every component MUST pass visual comparison against Figma — all states, all properties
5. **3-Tier Token Hierarchy**: Component CSS → component/semantic tokens (`--color-{type}-{role}-{variant}`) → palette primitives (`--palette-{family}-{shade}`). Never reference palette primitives directly from component CSS. See `tokens/AGENTS.md` for the Figma Foundations naming map.
6. **TypeScript Strict**: All decorator properties use `!`, all maps use `Record<>`, all optional chains use `??`. Full rules: `_agents/typescript-strict.md`.
7. **Build Order**: Tokens → component CSS/TSX → stories (always bottom-up: atoms → molecules → organisms)
8. **No Boolean Slot Props**: Use CSS `:empty` or slot detection — never boolean props to control slot visibility
9. **Shadow DOM Dual Selectors**: If a slot has default content, style BOTH `::slotted()` and direct child
10. **Minimal Builds**: Use `yarn tokens.build` (~5s) or Stencil watch (~2-5s) during dev; full `yarn build` only for final QA
11. **Change Scope**: A PR touches only files the task required. `yarn format` is repo-wide (`prettier --write .`) — harmless while the repo is Prettier-clean, but if it rewrites files your task never touched, that drift ships as its own `style:` PR, never mixed into yours. Check `git diff --stat main...HEAD` before opening a PR. See `_agents/verification-git.md`.
12. **Docs Audience**: `README.md` is written for institutions/companies that *consume* `@egov-moldova/mud` — install, import, use, upgrade. Contributor mechanics (dependency install, local builds, demo servers, dev loop, publishing steps) belong in `CONTRIBUTING.md`. See `_agents/verification-git.md`.

---

## Build Quick Reference

**All build scripts use [Wireit](https://github.com/google/wireit)** for declarative dependency graphs, automatic parallelism, and incremental caching. Dependencies run automatically — no need to manually chain commands.

```bash
# Check Token Build Freshness
ls dist/mud/tokens/*.css

# Development
yarn sp.dev.watch              # Check Storybook (port 6007)
lsof -i :6007
yarn dev                       # Stencil + Storybook + token watch (wireit services)
yarn dx:prepare                # First-time setup: tokens + custom-elements
yarn dx:clean                  # Clean all build artifacts (.stencil, storybook-static, dist, loader, www)

# Build (production / final verification)
yarn build                     # Full production build with tokens, custom-elements, and docs
yarn build.web                 # Build @egov-moldova/mud-web-components vanilla adapter
yarn demo.web                  # Serve the @egov-moldova/mud-web-components demo (http://localhost:5174)
yarn sp.build                  # Storybook static export (validates everything)
yarn validate.package          # Publish gate: every declared entrypoint present, no dev build, no leaked paths, packers agree
yarn sp.docker                 # Docker-optimized Storybook build

# Build (dev — targeted per change type)
yarn tokens.build              # Build core + dark theme tokens (~5s, cached)
yarn tokens.build.prod         # Production tokens (core + dark, optimized)
yarn tokens.watch              # Watch token files and rebuild on change
yarn dx:stencil:once           # Single Stencil dev build without docs (~20s)

# Test & Lint
yarn test                      # Vitest spec project via `vitest run --project spec` (wireit-cached; builds nothing)
yarn test.dev                  # `vitest --project spec --run` — compiles components from source; does not build dist
yarn test.watch                # `vitest --project spec --watch`
yarn lint                      # ESLint + Prettier check (cached)
yarn format                    # Auto-fix code style

# Utilities
npx stencil generate           # Stencil component generator scaffolding (not wired as a yarn script)
yarn tokens.audit              # Debug missing token references
yarn svg:icons                 # Normalize src/components/mud-icon/assets/** + rebuild icons.manifest.json and icon-names.ts
```

See `_agents/environment-commands.md` for the full decision matrix and all commands.

---

## Merge driver for auto-generated files

`git worktree` isolation, a `merge=ours` driver, `.husky/pre-push` and CI together let several
parallel branches regenerate `src/components.d.ts` and the component `readme.md` files without
merge conflicts. Never hand-edit these files or stage them with `git add -A`/`git add .`. Full
mechanism, setup and verification: `_agents/generated-files.md`.
