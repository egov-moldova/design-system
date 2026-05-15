import '@age/design-system/dist/design-system/tokens/core.tokens.css';
import '@age/design-system/dist/design-system/design-system.css';
import './demo.css';

import { defineCustomElements } from '@age/web-components';

defineCustomElements().then(() => {
  console.info('[demo] @age/web-components registered all custom elements');
});
