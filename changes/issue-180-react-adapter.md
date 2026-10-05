---
type: Fixed
title: the React adapter loads one Stencil runtime
---

`@egov-moldova/mud-react` (private, not yet published) registered elements through both the lazy loader and the standalone bundle, so the asset path set on one was ignored by elements the other registered first. It now uses the standalone bundle only, and each wrapper registers its own element when it is imported. The asset path no longer exists: see the `asset-delivery` entry for how icons, logos and flags load, and for the removed `defineCustomElements()`.

**Migration:** a raw `<mud-*>` tag written without its wrapper needs the wrapper imported, or `defineCustomElement` from `@egov-moldova/mud/components/mud-<name>.js`.
