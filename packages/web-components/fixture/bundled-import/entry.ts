// The import a bundled app would write for the script-tag build. It must fail to resolve: the core
// does not export `./mud.esm.js` (#193). Kept outside `src/`, so neither `tsc` nor the page build
// reads it; test 7 of `e2e/fixture.spec.ts` builds it on its own.
import '@egov-moldova/mud/mud.esm.js';
