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
 *                tarball, not from the source tree), on a tracked file under any proxy output
 *                directory (the list comes from `proxy-dirs.ts`, not retyped), and on a root
 *                `components/` directory (the shim folder 6e557bf5 removed).
 *   3. install   copy `packages/<framework>/fixture/` to a temp directory and
 *                `npm install --ignore-scripts` the two tarballs plus the pins of
 *                `fixture/versions.json` for the requested major. No workspace link can hide
 *                a packaging defect, and no lockfile is read.
 *   4. build     the framework's own typecheck and build, then FAIL when the bundler's module
 *                graph holds a second runtime (`@egov-moldova/mud/loader` or `dist/esm`,
 *                `dist/cjs`, `dist/mud` JavaScript) or holds no core module at all (an empty
 *                graph would pass vacuously).
 *   5. negative  compile the fixture's negative case, kept outside the normal build: one
 *                wrapper input bound to a wrongly typed value. It passes ONLY on exactly one
 *                diagnostic of an accepted type-mismatch code, on the line under the
 *                `@negative-binding` marker, at the named input. No failure, or any other
 *                failure, fails the run.
 *   6. browser   install the pinned Playwright's Chromium, serve the production build on a
 *                free port, run the fixture's Playwright spec, then stop the server.
 *
 * The server and every long step run in their own process group, killed in `finally` and on
 * SIGINT/SIGTERM/exit, so no orphan outlives the runner.
 *
 * Adding a framework is one entry in `FRAMEWORKS` and a `fixture/` directory.
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

import { PROXY_OUT_DIRS } from './proxy-dirs.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** The Node-resolvable module ids that mean a SECOND runtime next to the standalone bundle. */
const SECOND_RUNTIME = /@egov-moldova\/mud\/(loader|dist\/(esm|cjs|mud))\//;
/** Only script modules count: the README's own `styles.css` and token imports resolve under `dist/mud`. */
const SCRIPT_MODULE = /\.(?:[cm]?[jt]s|[jt]sx)(?:$|\?)/;
const STANDALONE_RUNTIME = '/node_modules/@egov-moldova/mud/dist/components/';

class RunnerError extends Error {}

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

const FRAMEWORKS = {
  vue: {
    adapterPackage: '@egov-moldova/mud-vue',
    workspace: 'packages/vue',
    /** A file the adapter build writes, relative to the workspace: its absence fails the preflight. */
    built: 'dist/index.js',

    /** Typecheck with the framework's own checker, then build with its own bundler. */
    async build({ app, bin, run }) {
      await run('typecheck', bin('vue-tsc'), ['--noEmit'], { cwd: app });
      await run('build', bin('vite'), ['build'], { cwd: app });
    },

    /** Every module the bundler put in the graph, from the fixture's own build output. */
    moduleIds({ app }) {
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
    },

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

  angular: {
    adapterPackage: '@egov-moldova/mud-angular',
    workspace: 'packages/angular',
    built: 'dist/package.json',
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
};

/**
 * `ng build` prints esbuild-style errors: a `✘ [ERROR] TSnnnn: message [plugin angular-compiler]`
 * header, then the location as `    <file>:<line>:<column>:` on a following line. esbuild's column is
 * 0-based; the runner's columns are 1-based. A template error carries a second location (the
 * component's `templateUrl`) inside the same block, so diagnostics are counted by header, and the
 * first location of each is the one reported.
 */
function parseEsbuildDiagnostics(output) {
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

function parseTscDiagnostics(output) {
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

process.on('exit', killAll);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    killAll();
    process.exit(130);
  });
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
 * Runs one command to completion in its own process group. Returns the captured output when
 * `capture` is set. A non-zero exit fails the step unless `allowFailure`; a timeout kills the group.
 */
async function run(step, command, args, { cwd, env, capture = false, allowFailure = false, timeout = 600_000 } = {}) {
  log(`${step}: ${[command.split('/').at(-1), ...args].join(' ')}`);
  const child = start(command, args, { cwd, env, capture });
  let output = '';
  if (capture) {
    child.stdout.on('data', chunk => (output += chunk));
    child.stderr.on('data', chunk => (output += chunk));
  }
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    killGroup(child, 'SIGKILL');
  }, timeout);
  const status = await new Promise(resolveStatus => {
    child.once('error', error => {
      output += String(error);
      resolveStatus(127);
    });
    child.once('close', code => resolveStatus(code ?? 1));
  });
  clearTimeout(timer);
  if (timedOut) fail(step, `timed out after ${timeout / 1000}s`);
  if (status !== 0 && !allowFailure) {
    if (capture) console.error(output);
    fail(step, `${command.split('/').at(-1)} exited ${status}`);
  }
  return { status, output };
}

// ---------------------------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const [framework, ...rest] = argv;
  let requested;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--framework-version' && rest[i + 1]) requested = rest[++i];
    else fail('usage', `unexpected argument ${rest[i]}`);
  }
  if (!framework || !(framework in FRAMEWORKS)) {
    fail('usage', `consumer-fixture.mjs <${Object.keys(FRAMEWORKS).join('|')}> [--framework-version <major>]`);
  }
  return { framework, requested };
}

/** The pins of one major. With no `--framework-version`, the table's highest major is the default. */
function loadPins(fixtureDir, requested) {
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
  const { output } = await run('guard', 'tar', ['-xzOf', tarball, 'package/package.json'], { capture: true });
  return JSON.parse(output);
}

function workspaceSpecifiers(manifest) {
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
    const { output } = await run('guard', 'git', ['ls-files', '--', dir], { cwd: ROOT, capture: true });
    tracked.push(...output.split('\n').filter(Boolean));
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
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) fail('serve', `the preview server exited ${server.exitCode}`);
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise(done => setTimeout(done, 250));
  }
  fail('serve', `${url} did not answer within 30s`);
}

function checkSecondRuntime(ids, adapterPackage) {
  const scripts = ids.map(id => id.replaceAll('\\', '/')).filter(id => SCRIPT_MODULE.test(id));
  if (!scripts.some(id => id.includes(STANDALONE_RUNTIME))) {
    fail('second runtime', `the module graph holds no ${STANDALONE_RUNTIME} module: the check would pass vacuously`);
  }
  if (!scripts.some(id => id.includes(`/node_modules/${adapterPackage}/`))) {
    fail('second runtime', `the module graph holds no ${adapterPackage} module: the fixture does not use the adapter`);
  }
  const second = scripts.filter(id => SECOND_RUNTIME.test(id));
  if (second.length > 0) {
    fail('second runtime', `the bundle holds a second Stencil runtime:\n  ${[...new Set(second)].join('\n  ')}`);
  }
  log(`second runtime: none in ${scripts.length} script modules`);
}

async function checkNegative(framework, ctx) {
  const { file, marker, command, parse, codes } = FRAMEWORKS[framework].negative;
  const lines = readFileSync(join(ctx.app, file), 'utf8').split('\n');
  const markerIndex = lines.findIndex(line => line.includes(marker));
  if (markerIndex < 0) fail('negative', `${file} has no ${marker} marker`);
  // `<!-- @negative-binding <name>: ... -->` on its own line, directly above the wrong binding.
  const binding = /^\s*([\w-]+)/.exec(
    lines[markerIndex].slice(lines[markerIndex].indexOf(marker) + marker.length),
  )?.[1];
  if (!binding) fail('negative', `the ${marker} marker in ${file} names no binding`);
  const bindingLine = markerIndex + 2;

  const [bin, args] = command(ctx);
  const { status, output } = await run('negative', bin, args, { cwd: ctx.app, capture: true, allowFailure: true });
  const show = () => console.error(output);
  if (status === 0) {
    show();
    fail('negative', `${file} compiled: a wrongly typed binding must fail the framework's checker`);
  }
  const diagnostics = parse(output);
  if (diagnostics.length !== 1) {
    show();
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
  if (problems.length > 0) {
    show();
    fail('negative', `the one diagnostic is not the expected one: ${problems.join('; ')}`);
  }
  log(`negative: ${diagnostic.code} at ${file}:${diagnostic.line}:${diagnostic.column} (${binding})`);
}

async function main() {
  const { framework, requested } = parseArgs(process.argv.slice(2));
  const spec = FRAMEWORKS[framework];
  const sourceFixture = join(ROOT, spec.workspace, 'fixture');
  const { major, pins } = loadPins(sourceFixture, requested);
  log(`${framework} ${requested ? '' : '(default major) '}major ${major}`);

  for (const built of ['dist/components/index.js', `${spec.workspace}/${spec.built}`]) {
    if (!existsSync(join(ROOT, built)))
      fail('preflight', `${built} is missing: run \`yarn build\` and \`yarn build.${framework}\` first`);
  }

  const temp = mkdtempSync(join(tmpdir(), `mud-fixture-${framework}-`));
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
    }
    await guardTree();
    log('guard: no workspace: specifier, no tracked proxy file, no root components/');

    // 3. install
    const app = join(temp, 'app');
    cpSync(sourceFixture, app, {
      recursive: true,
      filter: source => !/(^|\/)(node_modules|dist|\.angular|module-graph\.json|versions\.json)$/.test(source),
    });
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
    if (!existsSync(join(app, 'node_modules/@egov-moldova/mud/dist/components/assets/outlined'))) {
      fail(
        'install',
        'the packed core carries no dist/components/assets: the documented asset step has nothing to copy',
      );
    }

    // 4. typecheck + build, then the second-runtime check
    await spec.build(ctx);
    checkSecondRuntime(spec.moduleIds(ctx), spec.adapterPackage);

    // 5. negative case
    await checkNegative(framework, ctx);

    // 6. browser
    await run('browser', ctx.bin('playwright'), ['install', '--with-deps', 'chromium'], { cwd: app });
    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    const [serveBin, serveArgs] = spec.serve(ctx, port);
    log(`serve: ${url}`);
    server = start(serveBin, serveArgs, { cwd: app });
    await waitForServer(url, server);
    await run('playwright', ctx.bin('playwright'), ['test'], { cwd: app, env: { FIXTURE_URL: url } });
    passed = true;
  } finally {
    if (server) {
      killGroup(server);
      await new Promise(done => setTimeout(done, 300));
      killGroup(server, 'SIGKILL');
    }
    killAll();
    if (passed && !process.env.MUD_FIXTURE_KEEP) rmSync(temp, { recursive: true, force: true });
    else console.error(`[consumer-fixture] kept ${temp}`);
  }
  log(`PASS ${framework}@${major}`);
}

try {
  await main();
} catch (error) {
  if (error instanceof RunnerError) {
    console.error(`[consumer-fixture] FAIL ${error.message}`);
    process.exit(1);
  }
  throw error;
}
