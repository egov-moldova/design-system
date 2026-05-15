# Environment & Commands — Checks, Build Matrices, Yarn Commands

## Scope

Environment awareness checks and all build/dev commands. **Read before starting dev server or running builds.**

> **Wireit**: All build scripts use [google/wireit](https://github.com/google/wireit) for declarative dependency graphs, automatic parallelism, and incremental caching. When you run a command like `yarn build`, wireit automatically runs its dependencies (`tokens.build`, `tokens.build.prod`, `wca.custom-elements`) in parallel first, then runs the stencil build. Unchanged inputs are skipped via caching — repeated `yarn tokens.build` calls return in ~0.1s if nothing changed. Services (`dev`, `dx:stencil`, `dx:storybook`, `tokens.watch`) use `service: true` for long-running processes.

---

## Environment Awareness — Check Before Starting

**Never start duplicate servers. Never rebuild what's already built. Speed = skip unnecessary steps.**

### Check Storybook (port 6007)

```bash
# Windows (PowerShell)
netstat -ano | findstr :6007

# macOS / Linux (Unix)
lsof -i :6007
```

- **Output shows LISTENING** → Storybook is already running. Use it. Do NOT start another.
- **No output** → Start: `yarn sp.dev.watch` (non-blocking, wait ~10s for ready)

### Check Browser Session

1. Try `browser_snapshot()` — if it returns content, a session exists. Reuse it.
2. If error → call `browser_navigate({ url: "http://localhost:6007" })`.
3. If already showing Storybook, navigate directly to target story URL.

### Check Token Build Freshness

```bash
# Windows (PowerShell)
Get-ChildItem dist/design-system/tokens/*.css -ErrorAction SilentlyContinue

# macOS / Linux (Unix)
ls dist/design-system/tokens/*.css
```

- **Files exist** → skip `yarn tokens.build` unless you changed a `.tokens.json` file
- **Files missing** → run `yarn tokens.build` before any component work

### Check Stencil Build

- Storybook renders components correctly → build is current, skip `yarn build`
- Components blank / errors → run `yarn build` or rely on `yarn sp.dev.watch` (watch mode)

### Startup Decision Matrix

```text
Storybook running? ─── YES → reuse
                   └── NO  → yarn sp.dev.watch (tokens watch + Stencil watch + Storybook)

Browser open? ──────── YES → browser_snapshot() to verify, then navigate
                   └── NO  → browser_navigate({ url: "http://localhost:6007" })

Tokens built? ──────── YES + no JSON changes → skip
                   └── NO or JSON changed   → yarn tokens.build

yarn sp.dev.watch handles all three in watch mode. Only run it once.
```

---

## Development Build Decision Matrix

**During iterative dev (QA loop), use the minimal build for what changed.** Full `yarn build` reserved for final verification only.

**Prerequisite**: `yarn sp.dev.watch` should be running.

| What Changed | Command | Time | Why |
|---|---|---|---|
| `.tokens.json` only | `yarn tokens.build` | ~5s | Token CSS vars are runtime — no Stencil rebuild needed |
| `.css` / `.tsx` (watch running) | *(wait for Stencil watch)* | ~2-5s | Watch auto-detects changes |
| `.css` / `.tsx` (NO watch) | `yarn dx:stencil:once` | ~20s | Single Stencil build without docs |
| `.stories.ts` only | *(nothing — Storybook HMR)* | ~1s | Vite hot-reloads instantly |
| `.tokens.json` + `.css` | `yarn tokens.build` → wait for watch | ~7s | Tokens first, watch handles CSS |
| New component (all files) | `yarn tokens.build` + `yarn wca.custom-elements` | ~10s | Watch handles Stencil; WCA updates metadata |

**Why safe**: Token CSS files are standalone (`dist/design-system/tokens/*.css`) loaded at runtime via `<link>`. Components use `var(--name)` — no inline values. Stories processed by Vite independently.

**Full `yarn build`**: Includes tokens, custom-elements analysis, and Stencil docs generation. Only for final verification, pre-PR checks, and production audits.

---

## Test Commands

**Two test commands for different workflows:**

### `yarn test.dev` — Fast Development Testing

**Purpose**: Rapid iteration during development without token rebuild overhead.

**Use cases**:
- Testing specific components during development
- Quick verification after code changes
- Iterative TDD workflow
- Pattern-based test filtering

**Examples**:
```bash
# Test specific component file
yarn test.dev src/components/cor-button/test/cor-button.spec.tsx
# or for all tests in a component folder
yarn test.dev src/components/cor-button

# Test multiple components
yarn test.dev src/components/cor-button src/components/cor-input

# Run all tests (fast)
yarn test.dev
```

**Speed**: ~0.8s startup (no token rebuild)

### `yarn test` — Full CI/Production Testing

**Purpose**: Complete verification with token rebuild guarantee.

**Use cases**:
- Pre-commit verification
- CI/CD pipelines
- Production readiness checks
- When token changes may affect tests

**Speed**: ~5-6s startup (includes token build dependency check via wireit)

**Note**: Wireit caching means if tokens haven't changed, the overhead is minimal (~0.1s).

---

## Quick Reference Commands

```bash
# Development (wireit orchestrates dependencies + services automatically)
yarn sp.dev.watch              # Storybook (port 6007) + Stencil watch + auto-rebuild
yarn dev                       # Stencil + Storybook + token watch (wireit services)
yarn dx:prepare                # First-time setup: tokens + custom-elements (wireit parallel)
yarn dx:clean                  # Clean all build artifacts

# Build (production / final verification)
yarn build                     # Full build: tokens + custom-elements + Stencil + docs (4GB RAM)
yarn build.react               # Production build with React output target (6GB RAM)
yarn build.angular             # Production build with Angular output target (6GB RAM)
yarn sp.build                  # Storybook static export (validates everything)
yarn sp.docker                 # Docker-optimized Storybook build

# Build (dev — targeted per change type)
yarn tokens.build              # After .tokens.json changes only (~5s)
yarn tokens.build.prod         # Production tokens (core + dark, optimized)
yarn tokens.build.age          # Build AGE theme tokens only
yarn dx:stencil:once           # After .css/.tsx changes without watch (~20s)

# Tokens
yarn tokens.build              # Build all token themes (core + core.dark)
yarn tokens.build.prod         # Production tokens (optimized)
yarn tokens.build.age         # AGE theme tokens only
yarn tokens.watch              # Watch token files and rebuild on change
yarn tokens.audit              # Debug missing token references

# Test & Lint
yarn test                      # Jest unit + Stencil E2E tests (with token rebuild)
yarn test.dev                  # Fast tests without token rebuild (accepts args for specific components)
yarn test.watch                # Test in watch mode
yarn lint                      # ESLint (TS/TSX) + Prettier + Stylelint CSS check
yarn lint.css                  # Stylelint CSS-only lint (src/**/*.css)
yarn lint.css.fix              # Auto-fix CSS issues via Stylelint
yarn format                    # Auto-fix TS/TSX + Prettier

# Test Examples
yarn test.dev src/components/cor-button/test/cor-button.spec.tsx  # Test specific component file
yarn test.dev src/components/cor-button                           # Test all tests in a component folder
yarn test.dev                                                     # Run all tests (fast)

# Utilities
yarn generate                  # Stencil component generator scaffolding
yarn wca.custom-elements       # Generate custom-elements.json for Storybook
yarn svg:icons                 # Process SVG icons (remove size/fill + generate JSON)
yarn svg:remove-size           # Remove size attributes from SVGs
yarn svg:remove-fill           # Remove fill attributes from SVGs
yarn carbon:names              # Generate Carbon icon name mappings
yarn format.icons              # Format SVG icons with SVGO

# Storybook URLs (port 6007)
# Story iframe: http://localhost:6007/iframe.html?id={path}--{story}&viewMode=story
# Example:      http://localhost:6007/iframe.html?id=atoms-cor-button--default&viewMode=story
```
