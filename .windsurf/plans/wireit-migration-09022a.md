# Wireit Migration — Full Refactor of `package.json` Scripts

Migrate all `package.json` scripts to [google/wireit](https://github.com/google/wireit) for declarative dependency graphs, automatic parallelism, incremental caching, and service orchestration — replacing `concurrently` and `wait-on`.

---

## Dependency Graph (current → wireit)

```
tokens.build ─────┐
tokens.build.prod ─┼──→ build (stencil --docs)
wca.custom-elements┘

tokens.build ──────┐
wca.custom-elements┘──→ dx:prepare

dx:prepare ──→ dev (services: tokens.watch, dx:stencil, dx:storybook)

wca.custom-elements ──→ sp.build ──→ sp.prod (storybook build)
build ─────────────┘

svg:remove-size + svg:remove-fill → process-svg → format
```

## Steps

### 1. Install wireit
```bash
yarn add -D wireit
```

### 2. Add `"wireit"` config block to `package.json`

Each script that becomes `"wireit"` gets its entry moved to `wireit.<name>` with:
- `command` — the actual shell command
- `dependencies` — array of script names it depends on
- `files` — input globs (enables caching + watch)
- `output` — output globs (enables caching)
- `service: true` — for long-running watch/dev processes
- `packageLocks: ["yarn.lock"]` — since we use Yarn 4

### 3. Script-by-script migration

| Script | Type | Key Changes |
|--------|------|-------------|
| `tokens.build` | **cached** | files: `tokens/core/**/*.tokens.json`, `tokens/core.dark/**/*.tokens.json`, configs; output: `tokens/generated/*.css` |
| `tokens.build.prod` | **cached** | files: same token inputs + prod configs; output: `dist/design-system/tokens/*`, `.storybook/stories/assets/*.json`, `tokens/generated/*.json` |
| `tokens.build.age` | **cached** | files: `tokens/core/**/*.tokens.json`, `tokens/age/**/*.tokens.json`; output: `dist/design-system/tokens/age.tokens.css`, `tokens/generated/age.*` |
| `wca.custom-elements` | **cached** | files: `src/**/*.ts`, `src/**/*.tsx`; output: `.storybook/custom-elements.json` |
| `build` | **cached** | deps: `tokens.build`, `tokens.build.prod`, `wca.custom-elements`; command: stencil build; output: `dist/**`, `loader/**` |
| `build.react` | **cached** | deps: `tokens.build.prod`; command: stencil build --react; output: `dist/**`, `loader/**`, `react-design-system/src/components/stencil-generated/**` |
| `build.angular` | **cached** | deps: `tokens.build.prod`; command: stencil build --angular; output: `dist/**`, `loader/**`, `angular-design-system/src/directives/**` |
| `dx:prepare` | **no-command** | deps: `tokens.build`, `wca.custom-elements` (dependency-only, no own command) |
| `dx:stencil` | **service** | `service: true`; command: stencil build --dev --watch |
| `dx:storybook` | **service** | `service: true`; deps: `dx:stencil` (ensures dist exists); command: storybook dev |
| `tokens.watch` | **service** | `service: true`; command: `node scripts/tokens-watch.mjs` |
| `dev` | **no-command** | deps: `dx:prepare`, `tokens.watch`, `dx:stencil`, `dx:storybook` — wireit runs all services in parallel |
| `lint` | **cached** | deps: `lint.css`; files: `src/**/*.ts`, `src/**/*.tsx`, config files; output: `[]` |
| `lint.css` | **cached** | files: `src/**/*.css`, `.stylelintrc.json`; output: `[]` |
| `test` | **no-cache** | files: `src/**/*`; no caching (stencil test handles its own) |
| `sp.build` | **cached** | deps: `wca.custom-elements`, `build`; then runs sp.prod |
| `sp.prod` | **cached** | deps: `build`; command: storybook build; output: `storybook-static/**` |
| `svg:icons` | **cached** | deps: internal chain; files: `assets/icons/**`; output: `src/components/cor-icon/assets/local-icons.json` |

### 4. Remove `concurrently` and `wait-on`
- Both become unnecessary — wireit handles parallelism via dependency graph and services via `service: true`.
- Remove from `devDependencies`.
- `cross-env` stays (still needed for env vars in some commands).

### 5. Scripts that stay as-is (no wireit)
- `prepare` (husky install — lifecycle hook, not a build script)
- `generate` (stencil generate — interactive CLI)
- `start` (simple alias)
- `carbon:names`, `tokens.audit` — utility scripts with no dependency graph

### 6. Update documentation
- Update `AGENTS.md` build quick reference to note wireit usage.
- Update `_agents/environment-commands.md` with any changed invocation patterns.

### 7. Verify
- `yarn build` — full build works
- `yarn dev` — dev mode with services launches correctly
- `yarn lint` — caching works
- `yarn test` — tests pass
- `yarn sp.build` — storybook static build works

---

## What wireit gives us
- **No more `concurrently`/`wait-on`** — dependency graph replaces both
- **Incremental caching** — skip unchanged steps (tokens, WCA, lint)
- **Automatic parallelism** — independent deps run simultaneously
- **Watch mode** — `yarn build --watch` works out of the box for any cached script
- **Service orchestration** — dev servers managed as first-class citizens

## Risks / Notes
- **Yarn 4 compatibility**: wireit works with Yarn via `yarn run <script>`. Need `packageLocks: ["yarn.lock"]` on cached scripts.
- **Stencil watch mode**: `dx:stencil` uses `service: true` — wireit will start/stop it as a managed service.
- **`dx:storybook` startup**: Currently uses `wait-on` for built artifacts. With wireit, it depends on `dx:stencil` (which must produce initial output before storybook starts). Since `dx:stencil` is a service, wireit starts it and considers it "ready" immediately — we may need to keep `wait-on` inside the storybook command itself for the initial artifact check, or add a `service.readyWhen` if wireit supports it. Will verify during implementation.
