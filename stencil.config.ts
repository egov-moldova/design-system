import { Config } from '@stencil/core';
import { OutputTarget } from '@stencil/core/internal';
import { postcss } from '@stencil/postcss';
import * as postcssNested from 'postcss-nested';

const args = process.argv.slice(2);
const isWatchMode = args.includes('--watch');
const isDevMode = args.includes('--dev');
// PERF: Source maps only for non-watch dev builds (dx:stencil:once).
// Watch mode skips them for faster incremental rebuilds.
const shouldGenerateSourceMaps = isDevMode && !isWatchMode;

const outputTargets: OutputTarget[] = [
  {
    type: 'dist',
    esmLoaderPath: '../loader',
    // PERF: In watch mode, Style Dictionary writes directly to tokens/generated/
    // and Storybook reads from there — no copy needed. Skip in watch to avoid a second
    // dist write that triggers an extra stencil-hot-reload cycle in Storybook.
    copy: isWatchMode
      ? []
      : [
          {
            src: '../tokens/generated/*.css',
            dest: 'tokens',
            warn: false,
          },
        ],
  },
];

// PERF: The base build only needs 'dist' (lazy). www output is unused —
// skip it entirely. docs-readme only on --docs.
const hasDocs = args.includes('--docs');
if (hasDocs) {
  outputTargets.push({ type: 'docs-readme' });
}

export const config: Config = {
  namespace: 'mud',
  srcDir: 'src',
  globalStyle: 'src/assets/css/index.css',
  sourceMap: shouldGenerateSourceMaps,
  // PERF: Always enable cache — allows incremental rebuilds in watch mode.
  enableCache: true,
  // PERF: Stable filenames in watch mode — no content-hash churn means Vite
  // module graph stays valid between rebuilds (fewer modules need invalidating).
  hashFileNames: !isWatchMode,
  outputTargets,
  // Testing is now handled by Vitest via @stencil/vitest.
  // See vitest.config.ts + vitest-setup.ts.
  extras: {
    // Enable import injection for Vite/Storybook static build compatibility
    enableImportInjection: true,
  },
  plugins: [
    postcss({
      plugins: [(postcssNested.default ?? postcssNested)()],
    }),
  ],
};
