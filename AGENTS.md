# AGENTS.md — Corlab Design System AI Engineering Guide

**Project**: `@age/design-system` — Stencil.js web components with design tokens, Storybook docs, multi-theme support via Style Dictionary.

**Tech Stack**: StencilJS 4.x, TypeScript 5.x, Storybook 10.x (`@storybook/web-components-vite`, Vite 8 / Rolldown + Oxc, port **6007**), Style Dictionary 4.x (DTCG `$value`/`$type`), Jest, Wireit (script orchestration + caching), Yarn 4.x, Node >=22.

**MCP servers** (configured in `.mcp.json` at repo root): Playwright (`mcp__playwright__*`), Figma (`mcp__figma__*`), Context7 (`mcp__context7__*`), Image Compare (`mcp__image-compare__*`), agentation (`mcp__agentation__*`). See `_agents/mcp-tools.md` for full reference.

**This file is the single source of truth.** It overrides all skill files. Scoped subfiles in `src/components/AGENTS.md` and `tokens/AGENTS.md` extend (never contradict) this file.

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

### Design Extraction & Planning

| File | What It Covers | When to Load |
|------|---------------|--------------|
| `_agents/mcp-tools.md` | All MCP tools reference, correct prefixes, tool name corrections | **When calling any MCP tool** (Figma, Playwright, Context7) |
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
| `_agents/pixel-perfect-qa.md` | Full pixel-perfect loop Steps 1–8 | **During QA phase — MANDATORY for every component** |
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
| **Skill** ([.claude/skills/](.claude/skills/)) | `stencil-compliance`, `accessibility-compliance`, `audit-component`, `token-creation`, `systematic-debugging`, `verification-before-completion`, `figma-illustration-import` | Reusable knowledge invoked from inside commands/agents via the Skill tool. **`stencil-compliance`** catalogs Stencil 4.x rules across 14 areas (decorators, lifecycle, host, JSX, styling, form-associated, reactivity, serialization, functional components, public API). **`audit-component`** wraps the 3-wave production audit so other agents can invoke it programmatically. |

---

## Critical Rules (Always Active)

1. **Figma-First**: No component work without a Figma link (unless explicitly waived)
2. **Token-First**: Design tokens are the single source of truth — never hardcode values in CSS
3. **Reuse-First**: Check existing components before creating new ones
4. **Pixel-Perfect**: Every component MUST pass visual comparison against Figma — all states, all properties
5. **3-Tier Token Hierarchy**: Component CSS → component/semantic tokens (`--color-{type}-{role}-{variant}`) → palette primitives (`--palette-{family}-{shade}`). Never reference palette primitives directly from component CSS. See `tokens/AGENTS.md` for the Figma Foundations naming map.
6. **TypeScript Strict**: All decorator properties use `!`, all maps use `Record<>`, all optional chains use `??`
7. **Build Order**: Tokens → component CSS/TSX → stories (always bottom-up: atoms → molecules → organisms)
8. **No Boolean Slot Props**: Use CSS `:empty` or slot detection — never boolean props to control slot visibility
9. **Shadow DOM Dual Selectors**: If a slot has default content, style BOTH `::slotted()` and direct child
10. **Minimal Builds**: Use `yarn tokens.build` (~5s) or Stencil watch (~2-5s) during dev; full `yarn build` only for final QA

---

## Build Quick Reference

**All build scripts use [Wireit](https://github.com/google/wireit)** for declarative dependency graphs, automatic parallelism, and incremental caching. Dependencies run automatically — no need to manually chain commands.

```bash
# Check Token Build Freshness
ls dist/design-system/tokens/*.css

# Development
yarn sp.dev.watch              # Check Storybook (port 6007)
lsof -i :6007
yarn dev                       # Stencil + Storybook + token watch (wireit services)
yarn dx:prepare                # First-time setup: tokens + custom-elements
yarn dx:clean                  # Clean all build artifacts (.stencil, storybook-static, dist, loader, www)

# Build (production / final verification)
yarn build                     # Full production build with tokens, custom-elements, and docs
yarn build.web                 # Build @age/web-components vanilla adapter
yarn demo.web                  # Serve the @age/web-components demo (http://localhost:5174)
yarn sp.build                  # Storybook static export (validates everything)
yarn sp.docker                 # Docker-optimized Storybook build

# Build (dev — targeted per change type)
yarn tokens.build              # Build core + dark theme tokens (~5s, cached)
yarn tokens.build.prod         # Production tokens (core + dark, optimized)
yarn tokens.build.age          # Build AGE theme tokens only
yarn tokens.watch              # Watch token files and rebuild on change
yarn dx:stencil:once           # Single Stencil dev build without docs (~20s)

# Test & Lint
yarn test                      # Jest unit + Stencil E2E tests (with token rebuild)
yarn test.dev                  # Fast tests without token rebuild (for specific components)
yarn test.watch                # Test in watch mode
yarn lint                      # ESLint + Prettier check (cached)
yarn format                    # Auto-fix code style

# Utilities
yarn generate                  # Stencil component generator scaffolding
yarn tokens.audit              # Debug missing token references
yarn wca.custom-elements       # Generate custom-elements.json for Storybook
yarn svg:icons                 # Process SVG icons (remove size/fill + generate JSON)
```

See `_agents/environment-commands.md` for the full decision matrix and all commands.

---

## Merge driver for auto-generated files

The repo runs **parallel agent worktrees** (Cline Kanban + `.claude` orchestrators) where 3–5 components are built/redesigned simultaneously. Each worktree runs `yarn sp.build`, which regenerates the same tracked files. Without coordination, PR merges would conflict on every parallel branch.

### How conflicts are prevented

| Layer | File | Role |
| --- | --- | --- |
| Filesystem isolation | `.claude/kanban/worktree-init.{ps1,sh}` | Each agent runs in its own git worktree — no in-flight write collisions |
| Built-in merge strategy | `.gitattributes` (`merge=ours`) | Cross-branch merges silently keep current branch — no conflict markers |
| Pre-commit safety net | `.husky/pre-commit` (`GENERATED_PATTERNS`) | Auto-unstages generated files so `git add -A` is harmless |
| Canonical regeneration | `.github/workflows/ci.yml` (`Validate (PR)`) | Rebuilds + `git diff --exit-code` proves committed snapshot is current |

### Setup (runs automatically)

`yarn install` invokes `scripts/git/setup-merge-drivers.mjs` via the `prepare` script. It installs a `post-merge` git hook that hints to rebuild when a merge touches generated files. The hook is installed into the **shared** git hooks dir (`git rev-parse --git-common-dir`), so it applies to every linked worktree of one clone automatically.

### Manual setup (only if you ran `yarn install --skip-scripts`)

```bash
node scripts/git/setup-merge-drivers.mjs
```

### Verify the setup

```bash
git check-attr merge -- src/components.d.ts
# expect: src/components.d.ts: merge: ours
```

### What contributors and agents must NEVER do

- Hand-edit `src/components.d.ts`, `src/components/*/readme.md`, `.storybook/custom-elements.json`, `tokens/generated/**`.
- Force-stage these files with `git add -A`. The pre-commit hook auto-unstages them — but if you bypass it (`--no-verify`), you can introduce stale snapshots.
- Resolve a merge conflict in any of these by hand-editing. Run `yarn build` instead.

### Why `merge=ours` (and not a custom regenerate driver)

A custom driver that ran `yarn build` on every 3-way merge would add 60–120 s per file per merge and would fail in IDE/GUI git clients that don't load the project environment. The built-in `merge=ours` is instant; CI's `Validate (PR)` job is the single canonical regeneration point and the hard gate that prevents stale content from reaching `main`.
