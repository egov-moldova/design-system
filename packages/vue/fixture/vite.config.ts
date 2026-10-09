import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));

/** Writes every module the bundler put into a chunk, so the runner can see the whole graph. */
function recordModuleGraph(): Plugin {
  return {
    name: 'record-module-graph',
    generateBundle(_options, bundle) {
      const ids = new Set<string>();
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        for (const id of chunk.moduleIds ?? []) ids.add(id);
        for (const id of Object.keys(chunk.modules ?? {})) ids.add(id);
      }
      writeFileSync(resolve(here, 'module-graph.json'), JSON.stringify([...ids].sort(), null, 2));
    },
  };
}

export default defineConfig({
  plugins: [vue(), recordModuleGraph()],
  build: {
    // The runner reads `dist/.vite/manifest.json` and `module-graph.json` for a second runtime.
    manifest: true,
  },
});
