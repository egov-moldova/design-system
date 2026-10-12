import '@egov-moldova/mud/tokens/core.tokens.css';
import '@egov-moldova/mud/styles.css';

import { createRoot } from 'react-dom/client';

import { App } from './App';

// No asset setup and no `defineCustomElements()`: each wrapper registers its own element, and the
// icon, logo and flag modules load through `import()`, so the bundler emits them as chunks.
createRoot(document.getElementById('root')!).render(<App />);
