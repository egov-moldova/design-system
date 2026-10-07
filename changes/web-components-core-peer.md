---
type: Changed
title: "@egov-moldova/mud-web-components takes the core as a peer dependency"
breaking: true
---

`@egov-moldova/mud-web-components` now lists `@egov-moldova/mud` under `peerDependencies` instead of `dependencies`, like the React, Vue and Angular adapters. The application installs the one copy of the core, so a core version outside the adapter's range can no longer be nested under it and load a second Stencil runtime that defines the same `mud-*` tags.

**Migration:** npm 7 and later install the peer for you. With yarn or pnpm, add the core next to the adapter if the application does not list it already: `yarn add @egov-moldova/mud @egov-moldova/mud-web-components`, as the README has always shown.
