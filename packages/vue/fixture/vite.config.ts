import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));
const MUD_ASSETS = resolve(here, 'node_modules/@egov-moldova/mud/dist/components/assets');

/**
 * The documented asset step: the components fetch their SVGs from `<assetPath>assets/...`, so
 * the app copies the core's `dist/components/assets` into its served output and passes the URL
 * it is served at to `app.use(Mud, { assetPath })` (see `src/main.ts`). A real app can do the
 * same with a `public/` folder or a copy plugin; this one emits the files from the build.
 */
function copyMudAssets(): Plugin {
  return {
    name: 'copy-mud-assets',
    generateBundle() {
      if (!existsSync(MUD_ASSETS)) this.error(`${MUD_ASSETS} is missing from the installed core package`);
      for (const file of readdirSync(MUD_ASSETS, { recursive: true, withFileTypes: true })) {
        if (!file.isFile()) continue;
        const absolute = join(file.parentPath, file.name);
        const relative = absolute.slice(MUD_ASSETS.length + 1);
        this.emitFile({ type: 'asset', fileName: `mud/assets/${relative}`, source: readFileSync(absolute) });
      }
    },
  };
}

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
  plugins: [vue(), copyMudAssets(), recordModuleGraph()],
  build: {
    // The runner reads `dist/.vite/manifest.json` and `module-graph.json` for a second runtime.
    manifest: true,
  },
});
