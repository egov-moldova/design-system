import { bootstrapApplication } from '@angular/platform-browser';
import { provideMud } from '@egov-moldova/mud-angular';

import { App } from './app/app';

// The documented asset step copies the core's `dist/components/assets` to `mud/assets` in the
// build output (the `assets` entry in angular.json); `assetPath` is the URL of the folder that
// holds it, relative to `<base href>`. The tokens and `styles.css` are the `styles` entries there.
//
// No change-detection provider: Angular 20 runs on zone.js (the runner adds the polyfill when
// the major's pins carry it) and Angular 22 is zoneless by default.
bootstrapApplication(App, { providers: [provideMud({ assetPath: 'mud/' })] }).catch((error: unknown) =>
  console.error(error),
);
