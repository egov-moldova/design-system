#!/usr/bin/env node
/**
 * Consumer-fixture runner: proves a framework adapter works for an application that installs
 * it the way a consumer would, from packed tarballs, and drives that application in a browser.
 *
 *   node scripts/adapters/consumer-fixture.mjs <framework> [--framework-version <major>]
 *
 * Prerequisite: `yarn build` and the adapter's own build (`yarn build.<framework>`), because the
 * runner packs what those wrote. Steps, in order; the first failure ends the run:
 *
 *   1. pack      `yarn pack` the core and the adapter into a temp directory. Yarn, not npm:
 *                only Yarn rewrites a `workspace:` specifier, so the guard below can see
 *                whether the rewrite happened. An adapter whose publishable package is a
 *                build directory (`packDirectory`: ng-packagr's `dist/`, which is not a Yarn
 *                workspace) is packed with `npm pack` from that directory; its build owns the
 *                `workspace:` rewrite, and the same guard checks it.
 *   2. guard     FAIL on a `workspace:` specifier in any packed manifest (read from the
 *                tarball, not from the source tree), on a packed SVG file in the core or the
 *                adapter (`isPublishedSvg`, the predicate the publish gate uses), on a tracked
 *                file under any proxy output
 *                directory (the list comes from `proxy-dirs.ts`, not retyped), and on a root
 *                `components/` directory (the shim folder 6e557bf5 removed).
 *   3. install   copy `packages/<framework>/fixture/` to a temp directory and
 *                `npm install --ignore-scripts` the two tarballs plus the pins of
 *                `fixture/versions.json` for the requested major. No workspace link can hide
 *                a packaging defect, and no lockfile is read.
 *   4. build     the framework's own typecheck and build, then FAIL when the bundler's module
 *                graph holds a second runtime (`@egov-moldova/mud/loader` or `dist/esm`,
 *                `dist/cjs`, `dist/mud` JavaScript, or a core copy nested inside an adapter) or
 *                holds no core module at all (an empty graph would pass vacuously).
 *   5. negative  compile the fixture's negative case, kept outside the normal build: one
 *                wrapper input bound to a wrongly typed value. It passes ONLY on exactly one
 *                diagnostic of an accepted type-mismatch code, on the line under the
 *                `@negative-binding` marker, at the named input. No failure, or any other
 *                failure, fails the run.
 *   6. browser   install the pinned Playwright's Chromium, serve the production build on a
 *                free port, run the fixture's Playwright specs, then stop the server. The runner
 *                then reads Playwright's JSON report and FAILS unless every test ended `expected`
 *                (a skipped or `fixme` test is not a pass) and every title the framework requires
 *                ran (`judgeReport`). `scripts/adapters/fixture-e2e/` is copied into the app's
 *                `e2e/` first: the asset tests are written once, for every framework.
 *
 * The server and every long step run in their own process group, killed in `finally` and on
 * SIGINT/SIGTERM/exit, so no orphan outlives the runner.
 *
 * The temp directory lives under `RUNNER_TEMP` when it is set (GitHub Actions), and a failed run
 * keeps it and prints its path, so CI can upload `mud-fixture-*` with the Playwright traces.
 *
 * Importing this module runs nothing: the guards below are exported for
 * `scripts/__tests__/consumer-fixture.spec.mjs`, which drives each one RED with canned input.
 *
 * Adding a framework is one entry in `FRAMEWORKS`, a `fixture/` directory and a page that renders
 * the contract of `scripts/adapters/fixture-e2e/asset-checks.ts`.
 *
 * `web-components` has no framework: its `versions.json` row is keyed by the adapter's major, and its
 * adapter is the lazy loader itself, so it has no second-runtime check and no negative case.
 */
import { spawn } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isEntrypoint } from '../lib/is-entrypoint.mjs';
import { isPublishedSvg } from '../validate-package.mjs';
import { PROXY_OUT_DIRS } from './proxy-dirs.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** The Node-resolvable module ids that mean a SECOND runtime next to the standalone bundle. */
const SECOND_RUNTIME = /@egov-moldova\/mud\/(loader|dist\/(esm|cjs|mud))\//;
/** An adapter that installed its OWN core: `node_modules/@egov-moldova/mud-*\/node_modules/@egov-moldova/mud/`. */
const NESTED_CORE = /\/node_modules\/@egov-moldova\/mud-[^/]+\/node_modules\/@egov-moldova\/mud\//;
/** Only script modules count: the README's own `styles.css` and token imports resolve under `dist/mud`. */
const SCRIPT_MODULE = /\.(?:[cm]?[jt]s|[jt]sx)(?:$|\?)/;
const STANDALONE_RUNTIME = '/node_modules/@egov-moldova/mud/dist/components/';

export class RunnerError extends Error {}

/** Tests 1-4 of `fixture-e2e/assets.spec.ts`: every framework's app page runs them. */
export const ASSET_TITLES = [
  'assets: named icon, logo and flag render',
  "assets: a component's own icon renders",
  'assets: never-shown assets are not downloaded',
  'bundle: an unimported component is not bundled',
];
/**
 * Tests 5-8 of the web-components fixture's own spec: the delivery shapes only the lazy loader has,
 * and the core's refusal to export its script-tag build.
 */
export const WEB_COMPONENTS_TITLES = [
  'cdn: loader page on a deep subpath renders',
  'cdn: import map and script-tag pages render',
  'exports: a bundled mud.esm.js import fails to resolve',
  'assets: one shown icon downloads exactly one asset chunk',
];

const log = message => console.log(`[consumer-fixture] ${message}`);
const fail = (step, message) => {
  throw new RunnerError(`${step}: ${message}`);
};

// ---------------------------------------------------------------------------------------------
// Per-framework knowledge. Everything the runner does not share lives here.
// ---------------------------------------------------------------------------------------------

/**
 * @typedef {object} Context
 * @property {string} app        the temp copy of the fixture, with its node_modules
 * @property {(name: string) => string} bin   path of a binary installed in the fixture
 * @property {typeof run} run
 * @property {{dependencies?: Record<string, string>, devDependencies?: Record<string, string>}} pins
 *                               the requested major's row of `fixture/versions.json`
 * @property {string} major
 */

/**
 * Every module a Vite build put in the graph, from the fixture's own build output: the
 * `module-graph.json` its `vite.config.ts` plugin writes, plus `build.manifest`'s entries.
 */
function viteModuleIds({ app }) {
  const ids = new Set();
  const graph = join(app, 'module-graph.json');
  if (!existsSync(graph)) fail('module graph', 'the build wrote no module-graph.json');
  for (const id of JSON.parse(readFileSync(graph, 'utf8'))) ids.add(id);
  // `build.manifest` lists entries and dynamic entries by source path.
  const manifest = join(app, 'dist/.vite/manifest.json');
  if (!existsSync(manifest)) fail('module graph', 'the build wrote no dist/.vite/manifest.json');
  for (const [key, entry] of Object.entries(JSON.parse(readFileSync(manifest, 'utf8')))) {
    ids.add(key);
    if (entry.src) ids.add(entry.src);
  }
  return [...ids];
}

const FRAMEWORKS = {
  'react': {
    adapterPackage: '@egov-moldova/mud-react',
    workspace: 'packages/react',
    /** A file the adapter build writes, relative to the workspace: its absence fails the preflight. */
    built: 'dist/index.js',
    /** Titles the Playwright run must report, beyond all being `expected`. */
    required: ASSET_TITLES,

    /** Typecheck with `tsc`, then build with Vite. */
    async build({ app, bin, run }) {
      await run('typecheck', bin('tsc'), ['--noEmit'], { cwd: app });
      await run('build', bin('vite'), ['build'], { cwd: app });
    },

    moduleIds: viteModuleIds,

    /** The negative case: a `MudTextInput` whose `value` is a number, outside the normal build. */
    negative: {
      file: 'negative/wrong-type.tsx',
      marker: '@negative-binding',
      command: ({ bin }) => [bin('tsc'), ['--noEmit', '--pretty', 'false', '-p', 'tsconfig.negative.json']],
      /** `tsc` prints `path(line,col): error TSnnnn: message`. */
      parse: parseTscDiagnostics,
      /** A wrong value for a typed prop is TS2322, and nothing else is the diagnostic we want. */
      codes: ['TS2322'],
    },

    serve: ({ bin }, port) => [bin('vite'), ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort']],
  },

  'vue': {
    adapterPackage: '@egov-moldova/mud-vue',
    workspace: 'packages/vue',
    built: 'dist/index.js',
    required: ASSET_TITLES,

    /** Typecheck with the framework's own checker, then build with its own bundler. */
    async build({ app, bin, run }) {
      await run('typecheck', bin('vue-tsc'), ['--noEmit'], { cwd: app });
      await run('build', bin('vite'), ['build'], { cwd: app });
    },

    moduleIds: viteModuleIds,

    /** The negative case: one input bound to a wrongly typed value, outside the normal build. */
    negative: {
      file: 'negative/WrongType.vue',
      marker: '@negative-binding',
      command: ({ bin }) => [bin('vue-tsc'), ['--noEmit', '--pretty', 'false', '-p', 'tsconfig.negative.json']],
      /** `vue-tsc` prints `path(line,col): error TSnnnn: message`. */
      parse: parseTscDiagnostics,
      /** A wrong value for a typed prop is TS2322, and nothing else is the diagnostic we want. */
      codes: ['TS2322'],
    },

    /** The command that serves the production build on `port`. */
    serve: ({ bin }, port) => [bin('vite'), ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort']],
  },

  'angular': {
    adapterPackage: '@egov-moldova/mud-angular',
    workspace: 'packages/angular',
    built: 'dist/package.json',
    required: ASSET_TITLES,
    /** ng-packagr writes the publishable package to `dist/`, which `npm pack` packs. */
    packDirectory: 'dist',

    /**
     * `ng build` is the typecheck (`strictTemplates`) and the build in one. The zone.js polyfill is
     * loaded exactly when the major's pins carry `zone.js`: Angular 20 runs on it, Angular 22 is
     * zoneless by default and does not install it. `--stats-json` writes the esbuild metafile the
     * second-runtime check reads.
     */
    async build({ app, bin, run, pins }) {
      const file = join(app, 'angular.json');
      const workspace = JSON.parse(readFileSync(file, 'utf8'));
      workspace.projects.fixture.architect.build.options.polyfills = Object.hasOwn(pins.dependencies ?? {}, 'zone.js')
        ? ['zone.js']
        : [];
      writeFileSync(file, JSON.stringify(workspace, null, 2));
      await run('build', bin('ng'), ['build', '--stats-json'], { cwd: app, env: { NG_CLI_ANALYTICS: 'false' } });
    },

    /**
     * Every input of the esbuild metafile: the whole module graph, tree-shaken modules included.
     * The file is `browser-stats.json` from Angular 22 on, `stats.json` before; the keys are
     * relative to the fixture root.
     */
    moduleIds({ app }) {
      const stats = ['dist/fixture/browser-stats.json', 'dist/fixture/stats.json']
        .map(file => join(app, file))
        .find(file => existsSync(file));
      if (!stats) fail('module graph', 'the build wrote neither dist/fixture/browser-stats.json nor stats.json');
      const { inputs } = JSON.parse(readFileSync(stats, 'utf8'));
      return Object.keys(inputs ?? {}).map(id => (isAbsolute(id) ? id : join(app, id)));
    },

    /**
     * The negative case: a separate build configuration (`negative` in angular.json) with its own
     * entry point and tsconfig, so the wrong binding never reaches the normal build, and its own
     * `outputPath`, so the failing build cannot delete the output the browser step serves.
     */
    negative: {
      file: 'negative/wrong-type.html',
      marker: '@negative-binding',
      command: ({ bin }) => [bin('ng'), ['build', '--configuration', 'negative']],
      parse: parseEsbuildDiagnostics,
      /** Angular reports a wrongly typed input binding as the TypeScript assignability error. */
      codes: ['TS2322'],
    },

    /** The production output, served by the fixture's own static server (`ng serve` is a dev server). */
    serve: ({ app }, port) => [process.execPath, [join(app, 'serve.mjs'), String(port)]],
  },

  'web-components': {
    adapterPackage: '@egov-moldova/mud-web-components',
    workspace: 'packages/web-components',
    built: 'dist/index.js',
    required: [...ASSET_TITLES, ...WEB_COMPONENTS_TITLES],

    /** Typecheck with `tsc`, then build the adapter page (`index.html`) with Vite. */
    async build({ app, bin, run }) {
      await run('typecheck', bin('tsc'), ['--noEmit'], { cwd: app });
      await run('build', bin('vite'), ['build'], { cwd: app });
    },

    // No `moduleIds`: the adapter IS the core's lazy loader, which the second-runtime check forbids.
    moduleIds: null,
    negative: null,

    /** The Vite build, the hand-written pages and the installed packages, from the fixture's own server. */
    serve: ({ app }, port) => [process.execPath, [join(app, 'serve.mjs'), String(port)]],
  },
};

/**
 * `ng build` prints esbuild-style errors: a `✘ [ERROR] TSnnnn: message [plugin angular-compiler]`
 * header, then the location as `    <file>:<line>:<column>:` on a following line. esbuild's column is
 * 0-based; the runner's columns are 1-based. A template error carries a second location (the
 * component's `templateUrl`) inside the same block, so diagnostics are counted by header, and the
 * first location of each is the one reported.
 */
export function parseEsbuildDiagnostics(output) {
  // eslint-disable-next-line no-control-regex
  const text = output.replace(/\u001b\[[0-9;]*m/g, '');
  return text
    .split(/^(?=\s*✘ \[ERROR\])/m)
    .filter(block => /^\s*✘ \[ERROR\]/.test(block))
    .map(block => {
      const head = /✘ \[ERROR\] (?:([A-Z]+\d+): )?(.*?)(?: \[plugin [^\]]+\])?$/m.exec(block);
      const at = /^\s+(\S.*?):(\d+):(\d+):$/m.exec(block);
      return {
        file: (at?.[1] ?? '').replaceAll('\\', '/'),
        line: Number(at?.[2] ?? 0),
        column: Number(at?.[3] ?? -1) + 1,
        code: head?.[1] ?? 'unknown',
        message: head?.[2] ?? '',
      };
    });
}

export function parseTscDiagnostics(output) {
  return [...output.matchAll(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/gm)].map(match => ({
    file: match[1].replaceAll('\\', '/'),
    line: Number(match[2]),
    column: Number(match[3]),
    code: match[4],
    message: match[5],
  }));
}

// ---------------------------------------------------------------------------------------------
// Process handling: every child gets its own process group, so killing it kills the whole tree.
// ---------------------------------------------------------------------------------------------

const live = new Set();

function killGroup(child, signal = 'SIGTERM') {
  try {
    process.kill(-child.pid, signal);
  } catch {
    // Already gone.
  }
}

function killAll() {
  for (const child of live) killGroup(child, 'SIGKILL');
  live.clear();
}

/** Registered by `main()` only: importing the module for its guards must not touch the process. */
function installProcessGuards() {
  process.on('exit', killAll);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      killAll();
      process.exit(130);
    });
  }
}

function start(command, args, { cwd, env = {}, capture = false } = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    detached: true,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
  });
  live.add(child);
  child.once('close', () => live.delete(child));
  return child;
}

/**
 * Runs one command to completion in its own process group. Returns `stdout` and `stderr`, kept
 * apart, when `capture` is set: a caller that parses a command's result reads `stdout` only, so a
 * warning on stderr cannot corrupt it. A non-zero exit fails the step unless `allowFailure`; a
 * timeout kills the group, and a captured step prints what it captured before failing.
 */
async function run(step, command, args, { cwd, env, capture = false, allowFailure = false, timeout = 600_000 } = {}) {
  log(`${step}: ${[command.split('/').at(-1), ...args].join(' ')}`);
  const child = start(command, args, { cwd, env, capture });
  let stdout = '';
  let stderr = '';
  if (capture) {
    child.stdout.on('data', chunk => (stdout += chunk));
    child.stderr.on('data', chunk => (stderr += chunk));
  }
  const showCaptured = () => {
    if (stdout) console.error(stdout);
    if (stderr) console.error(stderr);
  };
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    killGroup(child, 'SIGKILL');
  }, timeout);
  const status = await new Promise(resolveStatus => {
    child.once('error', error => {
      stderr += String(error);
      resolveStatus(127);
    });
    child.once('close', code => resolveStatus(code ?? 1));
  });
  clearTimeout(timer);
  if (timedOut) {
    showCaptured();
    fail(step, `timed out after ${timeout / 1000}s`);
  }
  if (status !== 0 && !allowFailure) {
    showCaptured();
    fail(step, `${command.split('/').at(-1)} exited ${status}`);
  }
  return { status, stdout, stderr };
}

// ---------------------------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------------------------

export function parseArgs(argv) {
  const [framework, ...rest] = argv;
  let requested;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--framework-version' && rest[i + 1]) requested = rest[++i];
    else fail('usage', `unexpected argument ${rest[i]}`);
  }
  if (!framework || !Object.hasOwn(FRAMEWORKS, framework)) {
    fail('usage', `consumer-fixture.mjs <${Object.keys(FRAMEWORKS).join('|')}> [--framework-version <major>]`);
  }
  return { framework, requested };
}

/** The pins of one major. With no `--framework-version`, the table's highest major is the default. */
export function loadPins(fixtureDir, requested) {
  const table = JSON.parse(readFileSync(join(fixtureDir, 'versions.json'), 'utf8'));
  const majors = Object.keys(table).sort((a, b) => Number(a) - Number(b));
  const major = requested ?? majors.at(-1);
  if (!Object.hasOwn(table, major)) {
    fail('versions', `fixture/versions.json has no major "${major}" (it has: ${majors.join(', ')})`);
  }
  return { major, pins: table[major] };
}

/** Reads `package/package.json` out of a tarball, which is what a consumer's installer sees. */
async function readPackedManifest(tarball) {
  const { stdout } = await run('guard', 'tar', ['-xzOf', tarball, 'package/package.json'], { capture: true });
  return JSON.parse(stdout);
}

/** Every path a tarball holds, without the `package/` prefix `npm` and `yarn` both add. */
async function readPackedPaths(tarball) {
  const { stdout } = await run('guard', 'tar', ['-tzf', tarball], { capture: true });
  return stdout
    .split('\n')
    .filter(Boolean)
    .map(entry => entry.replace(/^package\//, ''));
}

/** Every `workspace:` specifier a packed manifest still carries: a consumer's installer cannot resolve one. */
export function workspaceSpecifiers(manifest) {
  const found = [];
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (String(range).startsWith('workspace:')) found.push(`${field}.${name} = ${range}`);
    }
  }
  return found;
}

async function guardTree() {
  const tracked = [];
  for (const dir of PROXY_OUT_DIRS) {
    const { stdout } = await run('guard', 'git', ['ls-files', '--', dir], { cwd: ROOT, capture: true });
    tracked.push(...stdout.split('\n').filter(Boolean));
  }
  if (tracked.length > 0) fail('guard', `generated proxy files are tracked by git:\n  ${tracked.join('\n  ')}`);
  const shim = join(ROOT, 'components');
  if (existsSync(shim) && statSync(shim).isDirectory()) {
    fail('guard', 'a root components/ directory exists: resolution goes through the core `exports` map, never a shim');
  }
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });
}

async function waitForServer(url, server) {
  // A wall-clock bound: each attempt can itself take up to its 2s fetch timeout.
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) fail('serve', `the preview server exited ${server.exitCode}`);
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise(done => setTimeout(done, 250));
  }
  fail('serve', `${url} did not answer within 30s`);
}

/**
 * Fails unless the module graph holds the standalone runtime and the adapter, and holds no second
 * runtime: the loader, the `dist/esm|cjs|mud` builds, or a core copy nested inside an adapter.
 * Returns the number of script modules it read.
 */
export function checkSecondRuntime(ids, adapterPackage) {
  const scripts = ids.map(id => id.replaceAll('\\', '/')).filter(id => SCRIPT_MODULE.test(id));
  if (!scripts.some(id => id.includes(STANDALONE_RUNTIME))) {
    fail('second runtime', `the module graph holds no ${STANDALONE_RUNTIME} module: the check would pass vacuously`);
  }
  if (!scripts.some(id => id.includes(`/node_modules/${adapterPackage}/`))) {
    fail('second runtime', `the module graph holds no ${adapterPackage} module: the fixture does not use the adapter`);
  }
  // NESTED_CORE catches a core nested deeper than the install step's directory guard in `main()` looks.
  const second = scripts.filter(id => SECOND_RUNTIME.test(id) || NESTED_CORE.test(id));
  if (second.length > 0) {
    fail('second runtime', `the bundle holds a second Stencil runtime:\n  ${[...new Set(second)].join('\n  ')}`);
  }
  return scripts.length;
}

/** The binding a `@negative-binding <name>` marker names, and the line the wrong binding sits on. */
export function negativeTarget(lines, marker, file) {
  const markerIndex = lines.findIndex(line => line.includes(marker));
  if (markerIndex < 0) fail('negative', `${file} has no ${marker} marker`);
  // `<!-- @negative-binding <name>: ... -->` on its own line, directly above the wrong binding.
  const binding = /^\s*([A-Za-z_][\w-]*)/.exec(
    lines[markerIndex].slice(lines[markerIndex].indexOf(marker) + marker.length),
  )?.[1];
  if (!binding) fail('negative', `the ${marker} marker in ${file} names no binding`);
  return { binding, bindingLine: markerIndex + 2 };
}

/**
 * Passes ONLY on a failed compile with exactly one diagnostic, of an accepted code, in `file`, on
 * the binding's line and at the named input. Anything else fails: no failure (the wrong binding
 * compiled), zero or several diagnostics (another failure is a runner error), a wrong code, place
 * or column. Returns the diagnostic.
 */
export function judgeNegative({ status, diagnostics, file, lines, binding, bindingLine, codes }) {
  if (status === 0) fail('negative', `${file} compiled: a wrongly typed binding must fail the framework's checker`);
  if (diagnostics.length !== 1) {
    fail('negative', `expected exactly one diagnostic, found ${diagnostics.length}: another failure is a runner error`);
  }
  const [diagnostic] = diagnostics;
  const problems = [];
  if (!diagnostic.file.endsWith(file)) problems.push(`in ${diagnostic.file}, not ${file}`);
  if (diagnostic.line !== bindingLine)
    problems.push(`at line ${diagnostic.line}, not the binding's line ${bindingLine}`);
  if (!codes.includes(diagnostic.code))
    problems.push(`${diagnostic.code} is not a type-mismatch code (${codes.join(', ')})`);
  const at = (lines[diagnostic.line - 1] ?? '').slice(diagnostic.column - 1);
  if (!at.startsWith(binding) && !at.startsWith(`:${binding}`))
    problems.push(`column ${diagnostic.column} is not at \`${binding}\``);
  if (problems.length > 0) fail('negative', `the one diagnostic is not the expected one: ${problems.join('; ')}`);
  return diagnostic;
}

/** Every test of a Playwright JSON report, with the status Playwright gave it. */
export function reportedTests(report) {
  const tests = [];
  const walk = suite => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) tests.push({ title: spec.title, status: test.status });
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return tests;
}

/**
 * The verdict of a Playwright run, from its JSON report. A zero exit is not enough: a test marked
 * `skip` or `fixme` exits 0 and reads as a pass. Passes ONLY when the report holds a test, every test
 * ended `expected`, none was skipped, no error sits outside a test, and every title in `required` ran.
 * Returns the number of tests.
 */
export function judgeReport(report, required) {
  const tests = reportedTests(report);
  if (tests.length === 0) fail('playwright', 'the report holds no test');
  const problems = [];
  const notExpected = tests.filter(test => test.status !== 'expected');
  for (const test of notExpected) problems.push(`"${test.title}" ended ${test.status}, not expected`);
  const titles = new Set(tests.map(test => test.title));
  for (const title of required) if (!titles.has(title)) problems.push(`required test "${title}" did not run`);
  if ((report.errors ?? []).length > 0) problems.push(`${report.errors.length} error(s) outside any test`);
  if (problems.length > 0) fail('playwright', `the report is not all-expected:\n  ${problems.join('\n  ')}`);
  return tests.length;
}

async function checkNegative(framework, ctx) {
  const { negative } = FRAMEWORKS[framework];
  if (negative === null) {
    log('negative: none for this framework');
    return;
  }
  const { file, marker, command, parse, codes } = negative;
  const lines = readFileSync(join(ctx.app, file), 'utf8').split('\n');
  const { binding, bindingLine } = negativeTarget(lines, marker, file);

  const [bin, args] = command(ctx);
  const { status, stdout, stderr } = await run('negative', bin, args, {
    cwd: ctx.app,
    capture: true,
    allowFailure: true,
  });
  try {
    // The checker may report on either stream, so the diagnostics are read from both.
    const diagnostic = judgeNegative({
      status,
      diagnostics: parse(`${stdout}\n${stderr}`),
      file,
      lines,
      binding,
      bindingLine,
      codes,
    });
    log(`negative: ${diagnostic.code} at ${file}:${diagnostic.line}:${diagnostic.column} (${binding})`);
  } catch (error) {
    console.error(stdout, stderr);
    throw error;
  }
}

async function main() {
  installProcessGuards();
  const { framework, requested } = parseArgs(process.argv.slice(2));
  const spec = FRAMEWORKS[framework];
  const sourceFixture = join(ROOT, spec.workspace, 'fixture');
  const { major, pins } = loadPins(sourceFixture, requested);
  log(`${framework} ${requested ? '' : '(default major) '}major ${major}`);

  for (const built of ['dist/components/index.js', `${spec.workspace}/${spec.built}`]) {
    if (!existsSync(join(ROOT, built)))
      fail('preflight', `${built} is missing: run \`yarn build\` and \`yarn build.${framework}\` first`);
  }

  // Under `RUNNER_TEMP` on GitHub Actions, where the workflow uploads `mud-fixture-*` on failure.
  const temp = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), `mud-fixture-${framework}-`));
  let passed = false;
  let server;
  try {
    // 1. pack
    const tarballs = join(temp, 'tarballs');
    mkdirSync(tarballs);
    const coreTarball = join(tarballs, 'core.tgz');
    const adapterTarball = join(tarballs, 'adapter.tgz');
    await run('pack', 'yarn', ['pack', '--out', coreTarball], { cwd: ROOT, capture: true });
    if (spec.packDirectory) {
      const directory = join(ROOT, spec.workspace, spec.packDirectory);
      await run('pack', 'npm', ['pack', directory, '--pack-destination', tarballs, '--ignore-scripts'], {
        cwd: ROOT,
        capture: true,
      });
      const packed = readdirSync(tarballs).filter(name => name.endsWith('.tgz') && name !== 'core.tgz');
      if (packed.length !== 1) fail('pack', `npm pack wrote ${packed.length} tarballs: ${packed.join(', ')}`);
      renameSync(join(tarballs, packed[0]), adapterTarball);
    } else {
      await run('pack', 'yarn', ['workspace', spec.adapterPackage, 'pack', '--out', adapterTarball], {
        cwd: ROOT,
        capture: true,
      });
    }

    // 2. guard
    for (const [name, tarball] of [
      ['core', coreTarball],
      ['adapter', adapterTarball],
    ]) {
      const specifiers = workspaceSpecifiers(await readPackedManifest(tarball));
      if (specifiers.length > 0)
        fail('guard', `the packed ${name} manifest carries workspace: specifiers:\n  ${specifiers.join('\n  ')}`);
      const svgs = (await readPackedPaths(tarball)).filter(isPublishedSvg);
      if (svgs.length > 0)
        fail(
          'guard',
          `the packed ${name} tarball publishes ${svgs.length} SVG file(s):\n  ${svgs.slice(0, 5).join('\n  ')}`,
        );
    }
    await guardTree();
    log('guard: no workspace: specifier, no packed SVG, no tracked proxy file, no root components/');

    // 3. install
    const app = join(temp, 'app');
    cpSync(sourceFixture, app, {
      recursive: true,
      filter: source => !/(^|\/)(node_modules|dist|\.angular|module-graph\.json|versions\.json)$/.test(source),
    });
    // The asset tests are written once and run in every app, beside the fixture's own spec.
    cpSync(join(ROOT, 'scripts/adapters/fixture-e2e'), join(app, 'e2e'), { recursive: true });
    writeFileSync(
      join(app, 'package.json'),
      JSON.stringify(
        {
          name: `mud-${framework}-fixture`,
          private: true,
          type: 'module',
          dependencies: {
            '@egov-moldova/mud': `file:${coreTarball}`,
            [spec.adapterPackage]: `file:${adapterTarball}`,
            ...pins.dependencies,
          },
          devDependencies: pins.devDependencies,
        },
        null,
        2,
      ),
    );
    await run('install', 'npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: app });
    const ctx = { app, bin: name => join(app, 'node_modules/.bin', name), run, pins, major };

    if (existsSync(join(app, 'node_modules', spec.adapterPackage, 'node_modules/@egov-moldova/mud'))) {
      fail('install', `${spec.adapterPackage} installed its own copy of the core: two runtimes would load`);
    }

    // 4. typecheck + build, then the second-runtime check
    await spec.build(ctx);
    if (spec.moduleIds) {
      log(`second runtime: none in ${checkSecondRuntime(spec.moduleIds(ctx), spec.adapterPackage)} script modules`);
    } else {
      log('second runtime: not checked (the adapter is the lazy loader)');
    }

    // 5. negative case
    await checkNegative(framework, ctx);

    // 6. browser
    // `--with-deps` installs system packages through the OS package manager (sudo): CI only.
    const install = process.env.CI ? ['install', '--with-deps', 'chromium'] : ['install', 'chromium'];
    await run('browser', ctx.bin('playwright'), install, { cwd: app });
    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    const [serveBin, serveArgs] = spec.serve(ctx, port);
    log(`serve: ${url}`);
    server = start(serveBin, serveArgs, { cwd: app });
    await waitForServer(url, server);
    const reportFile = join(temp, 'playwright-report.json');
    await run('playwright', ctx.bin('playwright'), ['test', '--reporter=json,list'], {
      cwd: app,
      env: { FIXTURE_URL: url, FIXTURE_FRAMEWORK: framework, PLAYWRIGHT_JSON_OUTPUT_NAME: reportFile },
    });
    if (!existsSync(reportFile)) fail('playwright', `the run wrote no JSON report at ${reportFile}`);
    log(`playwright: ${judgeReport(JSON.parse(readFileSync(reportFile, 'utf8')), spec.required)} tests, all expected`);
    passed = true;
  } finally {
    if (server) {
      killGroup(server);
      await new Promise(done => setTimeout(done, 300));
      killGroup(server, 'SIGKILL');
    }
    killAll();
    if (passed && !process.env.MUD_FIXTURE_KEEP) rmSync(temp, { recursive: true, force: true });
    else console.error(`[consumer-fixture] kept ${temp} (the fixture copy, its build output and Playwright traces)`);
  }
  log(`PASS ${framework}@${major}`);
}

if (isEntrypoint(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    if (error instanceof RunnerError) {
      console.error(`[consumer-fixture] FAIL ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}
