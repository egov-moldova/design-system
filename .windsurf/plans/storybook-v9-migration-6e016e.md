# Storybook v9 + Vite v7 Migration Plan

Staged upgrade: Vite 6→7 first, then Storybook 8→9, with all compatible plugin/addon versions resolved in each step.

---

## Context Snapshot

| Package | Current | Target |
|---|---|---|
| `vite` | `^6.4.1` | `^7.x` |
| `storybook` | `^8.6.14` | `^9.x` |
| `@storybook/web-components-vite` | `^8.6.14` | `^9.x` |
| `@storybook/addon-essentials` | `^8.6.14` | **removed** (consolidated into `storybook` core in v9) |
| `@storybook/addon-a11y` | `^8.6.14` | `^9.x` |
| `@storybook/addon-links` | `^8.6.14` | `^9.x` |
| `@storybook/blocks` | `^8.6.14` | **import path** → `storybook/blocks` |
| `@storybook/test` | `^8.6.14` | **import path** → `storybook/test` |
| `@storybook/theming` | `^8.6.14` | **import path** → `storybook/theming` |
| `@storybook/manager-api` | (transitive) | **import path** → `storybook/manager-api` |
| `eslint-plugin-storybook` | `10.2.7` | **drop** (repo archived Nov 2025) |
| `@etchteam/storybook-addon-css-variables-theme` | `^2.1.2` | keep, verify v9 compat or replace with `@storybook/addon-themes` |

---

## Phase 1 — Upgrade Vite 6 → 7

**Scope**: `vite` only. Storybook stays at v8. Confirm nothing breaks before touching SB.

1. **Bump `vite`** → `"^7.0.0"` in `package.json` devDependencies
2. **Tighten Node engines**: Vite 7 requires Node 20.19+ or 22.12+. Update `"node": ">=22.12.0"` (currently `>=22.0.0`)
3. **Handle `build.target` change**: Vite 7 default changed from `'modules'` → `'baseline-widely-available'` (Chrome 107+). Add explicit `build.target: 'esnext'` in `viteFinal` to preserve the current dev behavior (already set in `esbuild.target`)
4. **Run `yarn install`** → update lockfile
5. **Smoke-test**: `yarn sp.dev` — Storybook still launches on port 6007 with no Vite errors

---

## Phase 2 — Upgrade Storybook 8 → 9

### 2a. Package changes

**Remove from `package.json`** (consolidated into `storybook` core — no separate install needed in v9):
- `@storybook/addon-essentials`
- `eslint-plugin-storybook` (archived repo, no SB9 support)

**Bump to `^9.x`**:
- `storybook`
- `@storybook/web-components` (renderer)
- `@storybook/web-components-vite` (framework)
- `@storybook/addon-a11y`
- `@storybook/addon-links`
- `@storybook/blocks`
- `@storybook/test`
- `@storybook/theming`

**Check `@etchteam/storybook-addon-css-variables-theme`**: Verify peer dep accepts SB9. If not, replace with `@storybook/addon-themes ^9.x` and update `main.mjs` + `preview.js` accordingly.

### 2b. Config file changes

**`.storybook/main.mjs`**:
- Remove `@storybook/addon-essentials` from `devAddons` / `prodAddons` arrays
- Clean up `optimizeDeps.include` — remove all `@storybook/addon-essentials/*` sub-path entries (they no longer exist in SB9)
- Keep `@storybook/addon-a11y`, `@storybook/addon-links`, `@etchteam/storybook-addon-css-variables-theme` (or `@storybook/addon-themes`)

**`.storybook/manager.mjs`**:
- Change `import { addons } from '@storybook/manager-api'` → `import { addons } from 'storybook/manager-api'`

**`.storybook/preview.js`**:
- Remove duplicate `parameters.actions` block (defined twice; one is a no-op)
- `parameters.actions.argTypesRegex` is removed in SB9 — delete it
- Verify `setCustomElements` import from `@storybook/web-components` (renderer package stays, so this likely unchanged)

**`.eslintrc.js`**:
- Remove `'plugin:storybook/recommended'` from `extends`
- Remove `eslint-plugin-storybook` from plugins if explicitly listed

### 2c. Verify

1. `yarn install`
2. `yarn dx:stencil:once` (rebuild components)
3. `yarn sp.dev` — Storybook launches, all stories render, no console errors
4. `yarn sp.build` — static build succeeds
5. `yarn lint` — no ESLint errors from removed plugin

---

## Phase 3 — Post-migration cleanup

- Update `AGENTS.md` build quick reference if any commands change
- Confirm `wait-on` + `wca.custom-elements` still works with SB9 startup
- Remove dead `optimizeDeps.include` paths in `main.mjs`
- Run `yarn test` to confirm Jest/Stencil tests are unaffected (they don't depend on Storybook)

---

## Risk Notes

- **`@etchteam` addon** is deprecated (successor: `@storybook/addon-themes`). The `themeDecorator` in `preview.js` already handles `data-theme` switching manually — if the addon fails SB9 peer dep, we can drop the addon entirely and rely on the decorator alone.
- **`eslint-plugin-storybook`**: Archived Nov 2025. Removing it is the only safe path. No SB9-native replacement for the ESLint rules yet.
- **`actions.argTypesRegex`**: Removed in SB9. Already disabled (`actions: { disable: true }`) so it's a safe delete.
- **Vite 7 + Node 22**: Already on Node >=22, but must be >=22.12.0 for ESM `require()` support that Vite 7 depends on.
