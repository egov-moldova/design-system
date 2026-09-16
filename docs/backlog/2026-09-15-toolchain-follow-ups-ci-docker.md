# Toolchain Follow-ups — CI Audit Scope, Docker Runtime, Open Test-Lane Items

**Status**: Backlog — documented, not applied. Each item needs a decision from whoever owns the CI/CD and Azure DevOps release path.
**Captured**: 2026-09-15, measured on `b50b870`
**Source**: GitHub issue #36 (follow-ups after the 2026-09 toolchain refresh, #37)
**Affects**: `.github/workflows/ci.yml`, `Dockerfile`, the external Azure DevOps pipelines, `src/legacy/**`, `.storybook/main.mjs` (dev telemetry)

The parts of #36 that stay inside the repo's own code and tests were fixed in the
PR that closes it. The items below touch CI/CD or the deployed image, so they
are written down with a recommendation instead of being changed.

---

## 1. The CI dependency audit does not see the tree it gates

`.github/workflows/ci.yml` runs `yarn npm audit --severity high`. Without
`--all --recursive`, Yarn audits only the root workspace's direct dependencies.

| Command | Result on `b50b870` |
|---|---|
| `yarn npm audit --severity high` | `No audit suggestions` |
| `yarn npm audit --severity high --all --recursive` | 29 advisories |

Breakdown of the 29 (package: count, severity):

- `axios`: 7 high, via `wait-on`
- `fast-uri`: 7 high
- `brace-expansion`: 3 high
- `js-yaml`: 3 high
- `tar`: 1 critical and 2 high, via `node-gyp`
- `browserslist`: 2 high
- `postcss@8.3.11`: 2 high, via `@stencil/postcss@2.1.0`
- `form-data`: 1 high, via `wait-on`
- `undici`: 1 high, via `node-gyp`

All of them are in devDependency-only transitive packages. The published
package's only runtime dependency is `@stencil/core`.

### Recommended order

1. **Lockfile-only bump.** No manifest change:

   ```sh
   yarn up -R axios brace-expansion browserslist fast-uri form-data js-yaml tar undici
   ```

   The #36 comment measured this at 29 → 2, with the 2 left both `postcss@8.3.11`.
   That trial was reverted and has not been re-run for this note.
   It was not run through the full gate, so run `yarn lint && yarn typecheck && yarn test && yarn test:scripts && yarn build && yarn test.storybook`
   after it.
2. **Accept the 2 `postcss@8.3.11` advisories** in `.yarnrc.yml` under
   `npmAuditIgnoreAdvisories`, with the reason stated next to them. postcss only
   processes first-party CSS at build time. `@stencil/postcss@2.1.0` is already
   the latest release and pins `postcss: ~8.3.8`, so no parent bump can fix them.
   - Alternative: `resolutions: { "postcss": "^8.5.x" }`. This forces a version the
     plugin does not declare. It needs proof that the compiled CSS is unchanged,
     either a `dist/` diff or a visual regression run.
3. **Only after 1 and 2**, change the CI step to
   `yarn npm audit --severity high --all --recursive`. Doing it first turns CI red.

## 2. The Docker image runs outside `engines`

`Dockerfile:3` uses `node:22-alpine`, and `Dockerfile:17` runs
`corepack prepare yarn@4.9.4`. The manifests require Node `>=24.0.0 <25.0.0` and
`packageManager: yarn@4.12.0`. The `build` job in `.github/workflows/ci.yml`
builds this image. The Azure DevOps pipeline definitions introduced in #32 were
removed from this repository in `428b746` ("Remove old Azure template"). Whether
the external pipeline still builds this `Dockerfile` is not verifiable from here.

### Recommendation

- `FROM node:24-alpine AS builder`.
- Drop the explicit `corepack prepare yarn@4.9.4 --activate`. Once `corepack enable`
  is on, Corepack reads `packageManager` from `package.json`, so the Yarn version
  has a single source.
- Verify with a local `docker build .` and one Azure DevOps pipeline run before
  merging. Neither can be verified from a feature branch without access to that
  pipeline.

## 3. `src/legacy/**/*.e2e.ts` have no runner

15 files import `newE2EPage` from `@stencil/core/testing`. No script runs them:
`yarn test` is the Vitest spec lane, and `tsconfig.json` excludes `src/legacy/**`.
They are not coverage, but they look like it.

Options:

- Delete them when each legacy component is migrated or removed. This fits the
  existing migration flow.
- Delete all 15 now, if the legacy tree is only reference material.

This was left open because `src/legacy/**` is still mid-redesign
(`src/components/_agents/testing.md`).

**Recommendation:** delete each legacy component's `*.e2e.ts` in the same commit
that migrates or removes that component, and do not port them to a runner.
The `mud-*` replacements already carry `*.spec.tsx` and Storybook Vitest
coverage.

**Decision for the owner:** is `src/legacy/**` still used as behavioural
reference during the redesign? If not, delete all 15 in one commit.

## 4. Two test lanes run nowhere in CI

`.github/workflows/ci.yml` runs `yarn lint`, `yarn typecheck`, `yarn test` and the
audit. It does not run `yarn test:scripts` or `yarn test.storybook`, and the repo
has no committed git hooks. That is how the `form-associated-contract` ratchet
failed on `main` unnoticed: a 0-byte residue from merge `89142a1` and a stale
floor. It is also how a story's unguarded `requestAnimationFrame` callback in
`mud-tabs.stories.ts` went unnoticed; it only surfaced in the Storybook panel.
Both are fixed in the #36 PR, but nothing stops them recurring.

**Recommendation:** add `yarn test:scripts` to the `test` job. It needs no build
and takes about a second. Add `yarn test.storybook` as a separate job after
`yarn build && yarn tokens.build` and `yarn playwright install chromium`.

**Related, dev only:** `storybook dev` runs without `--disable-telemetry`, so the
re-enabled `@storybook/addon-vitest` panel reports its test-run events along
with Storybook's own. If the project's opt-out on build paths is meant to apply
to dev as well, set `core: { disableTelemetry: true }` in `.storybook/main.mjs`.

## 5. Stencil past 4.43.x

Tracked in #43, because the fix waits on stenciljs/core#6855, which is still open.
