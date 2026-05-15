import { Config } from '@stencil/core';
import { OutputTarget } from '@stencil/core/internal';
import { reactOutputTarget as react } from '@stencil/react-output-target';
import { angularOutputTarget as angular } from '@stencil/angular-output-target';
import { vueOutputTarget as vue } from '@stencil/vue-output-target';
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

// PERF: dist-custom-elements is only needed for React/Angular adapter builds
// (build.react / build.angular). The base build only needs 'dist' (lazy).
// www output is unused — skip it entirely. docs-readme only on --docs.
const hasDocs = args.includes('--docs');
if (hasDocs) {
  outputTargets.push({ type: 'docs-readme' });
}

if (args?.find(arg => arg === '--react')) {
  console.info('build react adapter');
  outputTargets.push(
    react({
      outDir: 'react-design-system/src/components/stencil-generated/',
    }),
  );

  outputTargets.push({
    type: 'dist-custom-elements',
    externalRuntime: false,
    copy: [
      {
        src: '../tokens/generated',
        dest: 'react-design-system/src/components/stencil-generated/styles',
        warn: true,
      },
    ],
  });
}

if (args?.find(arg => arg === '--angular')) {
  console.info('build angular adapter');
  outputTargets.push(
    angular({
      componentCorePackage: '@age/design-system',
      outputType: 'standalone',
      directivesProxyFile: 'angular-design-system/src/directives/proxies.ts',
    }),
  );

  outputTargets.push({
    type: 'dist-custom-elements',
    copy: [
      {
        src: '../tokens/generated',
        dest: 'angular-design-system/src/styles',
        warn: true,
      },
    ],
  });
}

if (args?.find(arg => arg === '--vue')) {
  console.info('build vue adapter');
  outputTargets.push(
    vue({
      componentCorePackage: '@age/design-system',
      proxiesFile: 'vue-design-system/src/components/stencil-generated/components.ts',
    }),
  );

  outputTargets.push({
    type: 'dist-custom-elements',
    externalRuntime: false,
    copy: [
      {
        src: '../tokens/generated',
        dest: 'vue-design-system/src/components/stencil-generated/styles',
        warn: true,
      },
    ],
  });
}
export const config: Config = {
  namespace: 'design-system',
  srcDir: 'src',
  globalStyle: 'src/assets/css/index.css',
  sourceMap: shouldGenerateSourceMaps,
  // PERF: Always enable cache — allows incremental rebuilds in watch mode.
  enableCache: true,
  // PERF: Stable filenames in watch mode — no content-hash churn means Vite
  // module graph stays valid between rebuilds (fewer modules need invalidating).
  hashFileNames: !isWatchMode,
  outputTargets,
  testing: {
    setupFilesAfterEnv: ['./jest.setup.ts'],
  },
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
