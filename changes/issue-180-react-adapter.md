---
type: Fixed
title: the React adapter loads one Stencil runtime
---

`@egov-moldova/mud-react` (private, not yet published) registered elements through both the lazy loader and the standalone bundle, so the asset path set on one was ignored by elements the other registered first. It now uses the standalone bundle only. `setupMud({ assetPath })` replaces `defineCustomElements()`, which stays as a deprecated alias and, like `setupMud`, only sets the asset path: each wrapper registers its own element.

**Migration:** call `setupMud({ assetPath })` once at startup. A raw `<mud-*>` tag written without its wrapper needs the wrapper imported, or `defineCustomElement` from `@egov-moldova/mud/components/mud-<name>.js`.
