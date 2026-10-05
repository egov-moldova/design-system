---
type: Added
title: Angular and Vue adapters (not yet published)
---

Two workspace packages, `@egov-moldova/mud-angular` and `@egov-moldova/mud-vue`, wrap the custom elements in typed components and bind every form control to `ngModel`, `formControl` or `v-model`. Both are private for now, like `@egov-moldova/mud-react`, so nothing changes for consumers of `@egov-moldova/mud` until they are published. When they are, the core is a peer dependency of both: the application installs one copy, and the adapters never bring their own.

The core adds one type re-export, so the generated proxies can import the component types from `@egov-moldova/mud/components`. Its `exports`, `files` and version are unchanged. `yarn build` now also generates the React, Vue and Angular proxies, which are git-ignored.

The React and vanilla adapters moved to `packages/react` and `packages/web-components`. Their package names are unchanged. The `repository.directory` of `@egov-moldova/mud-web-components` changed with the move (`packages/web-components`). The Git hook installer that `@egov-moldova/mud-react` ran as a `postinstall` script now belongs to the private `tooling/hooks` workspace, so installing the React adapter runs no script.
