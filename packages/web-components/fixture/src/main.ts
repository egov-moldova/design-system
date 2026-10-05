import '@egov-moldova/mud/tokens/core.tokens.css';
import '@egov-moldova/mud/styles.css';

import { defineCustomElements } from '@egov-moldova/mud-web-components';

// No asset setup and no `resourcesUrl`: the icon, logo and flag modules load through `import()`,
// so the bundler emits them as chunks.
void defineCustomElements();
