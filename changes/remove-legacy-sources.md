---
type: Removed
title: the archived `cor-*` sources, and 36 illustration SVGs they leaked into the package
---

The archived `cor-*` component tree (61 components) under `src/`, its light and dark token
sources under `tokens/`, and `src/utils/css-helpers.ts` and `src/utils/token-parser.ts`, which
only `cor-tooltip` imported, are deleted. None of it was built, tested, linted or exported, but
`cor-illustration`'s `assetsDirs` copied 36 SVGs into `dist/collection/legacy/`, which the
package published.

**Migration:** none for `mud-*` consumers. Anything that loaded a file from
`dist/collection/legacy/` directly loses it. The sources stay in history at `328b233`:
`git show 328b233:<path>`.
