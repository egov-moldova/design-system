import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

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
  plugins: [
    vue(),
    // The asset recipe of the README (Vue section), verbatim: the components fetch their SVGs from
    // `<assetPath>assets/...`, so the app serves the core's `dist/components/assets` under `mud/`
    // and passes `assetPath: '<base>mud/'` to `app.use(Mud, ...)` (see `src/main.ts`).
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@egov-moldova/mud/dist/components/assets',
          dest: 'mud',
          // The plugin keeps the source path: strip `node_modules/@egov-moldova/mud/dist/components/`.
          rename: { stripBase: 5 },
        },
      ],
    }),
    recordModuleGraph(),
  ],
  build: {
    // The runner reads `dist/.vite/manifest.json` and `module-graph.json` for a second runtime.
    manifest: true,
  },
});
