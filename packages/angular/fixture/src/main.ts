import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';

// No asset setup: `mud-icon` and `mud-logo` load their SVGs through `import()`, so the bundler
// emits them as chunks. The tokens and `styles.css` are the `styles` entries in angular.json.
//
// No change-detection provider: Angular 20 runs on zone.js (the runner adds the polyfill when
// the major's pins carry it) and Angular 22 is zoneless by default.
bootstrapApplication(App).catch((error: unknown) => console.error(error));
