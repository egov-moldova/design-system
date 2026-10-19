import { bootstrapApplication } from '@angular/platform-browser';

import { WrongType } from './wrong-type';

// The negative case's entry point, built only by `ng build --configuration negative`, which the
// runner expects to FAIL on the one wrong binding in wrong-type.html.
bootstrapApplication(WrongType).catch((error: unknown) => console.error(error));
