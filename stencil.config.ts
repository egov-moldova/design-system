import { Config } from '@stencil/core';
import { OutputTarget } from '@stencil/core/internal';
import { postcss } from '@stencil/postcss';
import { reactOutputTarget as react } from '@stencil/react-output-target';
import * as postcssNested from 'postcss-nested';
// import postcssPresetEnv from 'postcss-preset-env';

const args = process.argv.slice(2);
const isWatchMode = args.includes('--watch');
const isDevMode = args.includes('--dev');
const isReactBuild = args.includes('--react');
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
          {
            src: 'assets/fonts/*.ttf',
            dest: 'assets/fonts',
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

// React adapter — only emit proxies when explicitly building the React workspace
// via `yarn build.react`. Keeps the default Stencil build framework-agnostic.
// dist-custom-elements is a hard prerequisite of @stencil/react-output-target.
if (isReactBuild) {
  // Note: Stencil's `dist-custom-elements` target ignores the `copy` option for
  // `assetsDirs` declared on components (Stencil v4 bug/limitation — copy on
  // this target type silently no-ops). See `scripts/copy-component-assets.mjs`
  // for the post-build copy that mirrors `dist/mud/assets/` into
  // `dist/components/assets/` so consumers of the standalone bundle (React
  // wrappers) can resolve `getAssetPath('./assets/foo.svg')` correctly.
  outputTargets.push({ type: 'dist-custom-elements', externalRuntime: false });
  outputTargets.push(
    react({
      outDir: 'react/src/components/stencil-generated',
      esModules: true,
      stencilPackageName: '@egov-moldova/mud',
      excludeComponents: [],
    }),
  );
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
      plugins: [
        (postcssNested.default ?? postcssNested)(),
      ],
    }),
  ],
};
