# Legacy component tokens

Snapshot of per-component token files from the previous design system.

These tokens are intentionally outside the Style Dictionary `source` globs
(`tokens/core/**`, `tokens/core.dark/**`), so they are **not compiled** into
`tokens/generated/core.tokens.css` / `core.dark.tokens.css` and **not shipped**
in `dist/design-system/tokens/`.

They live here as a reference for the previous DS surface, mirroring the
`src/legacy/` arrangement for component source code:

- `src/legacy/cor-X/` ↔ `tokens/legacy/components/X.tokens.json`
- `src/legacy.dark` overrides ↔ `tokens/legacy.dark/components/X.tokens.json`

## Redesign flow

As each component is redesigned, move its tokens back into the active
build by reversing the legacy move:

```sh
# 1. Move the component sources
git mv src/legacy/cor-X src/components/cor-X

# 2. Move the light theme tokens back into the SD source glob
git mv tokens/legacy/components/X.tokens.json tokens/core/components/X.tokens.json

# 3. If a dark override exists, move it too
git mv tokens/legacy.dark/components/X.tokens.json tokens/core.dark/components/X.tokens.json

# 4. Add the component back to src/index.ts and rebuild
yarn tokens.build && yarn build
```
