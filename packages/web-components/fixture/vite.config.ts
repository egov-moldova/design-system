import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));

// Two Vite-built pages: the adapter page (`index.html`) and the side-effect-only page
// (`side-effect.html`), which exercises the core's `sideEffects` list in a production bundle.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        'index': resolve(here, 'index.html'),
        'side-effect': resolve(here, 'side-effect.html'),
      },
    },
  },
});
