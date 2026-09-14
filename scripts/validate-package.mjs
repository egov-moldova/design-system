#!/usr/bin/env node
/**
 * Publish gate — proves the tarball that would be published satisfies the
 * contract package.json declares, and carries no development-build artifacts.
 *
 * Run after a production build and before publishing. Prints every offender in
 * every category so one CI run reports the whole picture, then exits non-zero.
 *
 * Background: @egov-moldova/mud 1.0.x-1.1.9 shipped a development bundle with
 * most declared entrypoints absent, because the test step rebuilt dist/ in dev
 * mode after the production build. See GitHub issue #1.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** package.json fields whose value names exactly one entry file. */
export const ENTRY_FIELDS = ['main', 'module', 'types', 'unpkg', 'collection', 'collection:main', 'es2015', 'es2017'];

/**
 * Path segments that only ever appear in build-machine artifacts. `.stencil` is
 * Stencil's cache/staging directory; the three config basenames are root-level
 * TypeScript files that must not enter the published program.
 */
export const FORBIDDEN_SEGMENTS = ['.stencil', 'stencil.config.js', 'playwright.config.js', 'vitest-setup.js'];

/**
 * Markers Stencil leaves in a bundle built with `--dev`. A production build
 * minifies `isDev` to `!1` and drops the notice, so neither can match.
 */
export const DEV_BUILD_MARKERS = [/\bisDev:\s*true\b/, /Running in development mode/];

/**
 * Filesystem roots that can only appear in a tarball path when a declaration
 * was emitted under an absolute build-machine path: `/home/vsts/...` on the
 * Azure agent, `/Users/...` on macOS, `/private/var/folders/...` when the build
 * runs under a macOS temp directory, plus a Windows drive letter.
 *
 * `private` and `var` are on this list on purpose. An earlier revision dropped
 * them believing `dist/types/private/` was a directory this build legitimately
 * emits; it is not — it is the head of `/private/var/folders/...`, verified by
 * walking it. Colliding with a real source directory would need `src/private/`
 * or `src/var/` to exist; today `src/` holds assets, components, legacy and
 * utils. This asserts a shape, where FORBIDDEN_SEGMENTS enumerates today's
 * known offenders.
 */
export const ABSOLUTE_PATH_ROOTS = ['home', 'Users', 'private', 'var', 'root', 'tmp'];

/** Strips the leading `./` that `exports` values carry and tarball paths do not. */
export function normalizePackagePath(target) {
  return target.replace(/^\.\//, '');
}

function walkExports(node, trail, entries) {
  if (typeof node === 'string') {
    entries.push({ source: trail, target: node });
    return;
  }
  if (node === null || typeof node !== 'object') {
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    // A subpath pattern resolves to many files; a literal existence check on it
    // would be meaningless. Its directory is covered by the sibling literals,
    // and `checkBundleAssets` covers the one subtree that has no literal.
    if (key.includes('*')) {
      continue;
    }
    walkExports(child, `${trail}[${key}]`, entries);
  }
}

/** Every single-file path package.json declares, each tagged with where it came from. */
export function collectDeclaredEntries(pkg) {
  const entries = [];
  for (const field of ENTRY_FIELDS) {
    if (typeof pkg[field] === 'string') {
      entries.push({ source: field, target: pkg[field] });
    }
  }
  walkExports(pkg.exports, '$.exports', entries);
  return entries.filter(entry => !entry.target.includes('*'));
}

export function checkDeclaredEntries(entries, packedFiles) {
  const packed = new Set(packedFiles);
  return entries.filter(entry => !packed.has(normalizePackagePath(entry.target)));
}

export function checkForbiddenPaths(packedFiles) {
  return packedFiles.filter(file => file.split('/').some(segment => FORBIDDEN_SEGMENTS.includes(segment)));
}

export function checkAbsolutePaths(packedFiles) {
  // Every segment, index 0 included. An earlier revision skipped the first,
  // which would have let a declaration emitted at the tarball root (`Users/...`)
  // through — the exact leak class this exists to catch, escaping at index 0.
  // Nothing needs skipping: `dist` and `loader` are not roots on the list.
  return packedFiles.filter(file =>
    file.split('/').some(segment => ABSOLUTE_PATH_ROOTS.includes(segment) || /^[A-Za-z]:$/.test(segment)),
  );
}

export function checkSourceMaps(packedFiles) {
  return packedFiles.filter(file => file.endsWith('.map'));
}

/**
 * The directory the lazy browser bundle is published into, derived from the
 * `unpkg` field rather than hardcoded. Hardcoding `dist/mud/` would make this
 * check answer "no dev build" by scanning a directory that no longer exists the
 * moment the Stencil namespace is renamed — the rule's letter met with its
 * intent violated. Throws instead of degrading to a vacuous scan.
 */
export function lazyBundleDir(pkg) {
  if (typeof pkg.unpkg !== 'string' || !pkg.unpkg.includes('/')) {
    throw new Error('validate-package: cannot locate the lazy bundle — package.json has no usable "unpkg" field');
  }
  return `${path.posix.dirname(normalizePackagePath(pkg.unpkg))}/`;
}

/**
 * Where `exports["./components"]` points. Throws rather than returning
 * null: a null would make `checkBundleAssets` a silent no-op, which is the same
 * vacuous-scan failure `lazyBundleDir` exists to avoid one function up. If the
 * standalone bundle is ever dropped from the contract deliberately, drop the
 * asset check with it — do not let it quietly stop grading while the gate
 * still reports PASS.
 */
export function standaloneBundleDir(pkg) {
  const target = pkg.exports?.['./components']?.import;
  if (typeof target !== 'string' || !target.includes('/')) {
    throw new Error(
      'validate-package: cannot locate the standalone bundle — exports["./components"].import is missing or unusable',
    );
  }
  return `${path.posix.dirname(normalizePackagePath(target))}/`;
}

/**
 * The specifiers the documentation promises a consumer can write. Authored
 * rather than derived from `exports`: a list generated from the map would only
 * ask the map about itself and would stay green through any rename. This is the
 * consumer's side of the contract.
 *
 * What enforces it and what does not, stated precisely because it is easy to
 * assume more. `checkPublicSpecifiers` fails when this list names something
 * `exports` does not expose. It CANNOT fail when `exports` gains a key nobody
 * listed, and it never reads a README. The first gap is closed by the
 * set-membership test in `__tests__/validate-package.spec.mjs`; the second is
 * not closed by anything, and the READMEs staying in step with this list is a
 * convention rather than a mechanism.
 *
 * The two pattern keys — `./tokens/*.css` and `./components/mud-*.js` — are
 * represented by one concrete member each, because `collectDeclaredEntries`
 * skips patterns by design and would otherwise leave them ungraded entirely.
 * Each representative is a shape a consumer actually writes, not the cheapest
 * string that matches: `mud-button.js` is what the generated React wrappers
 * import, where `index.js` would have been graded already by the literal
 * `./components` key and so would have tested nothing new.
 */
// `./tokens/*.css` is deliberately narrower than a bare `./tokens/*`: the `.css`
// suffix reserves `./tokens` and `./tokens/*.json` for a future JS/DTCG token
// surface, which today's Style Dictionary config could emit by adding a second
// platform. Widening the key later would be an ordinary addition; narrowing it
// after publishing would be breaking. Do not "simplify" it to `./tokens/*`.
export const PUBLIC_SPECIFIERS = [
  '@egov-moldova/mud',
  '@egov-moldova/mud/loader',
  '@egov-moldova/mud/styles.css',
  '@egov-moldova/mud/tokens/core.tokens.css',
  '@egov-moldova/mud/tokens/core.dark.tokens.css',
  '@egov-moldova/mud/mud.esm.js',
  '@egov-moldova/mud/components',
  '@egov-moldova/mud/components/mud-button.js',
];

/**
 * Subpaths this package publishes as ESM only, and the reason each one is on the
 * list. `dist-custom-elements` — the Stencil target that emits `dist/components/`
 * — has no format option, so a `require` condition here could only ever point at
 * a file the build cannot produce.
 *
 * This exists because the invariant was otherwise enforced only by accident: a
 * `require` target naming a non-existent file happens to trip
 * `checkDeclaredEntries`, but one naming a real-but-wrong file trips nothing,
 * and neither failure would say what rule was broken.
 * Baseline: `node -e "const p=require('./package.json');console.log(Object.keys(p.exports['./components']))"`
 * -> `[ 'types', 'import' ]`.
 */
export const ESM_ONLY_SUBPATHS = ['./components', './components/mud-*.js'];

/** Any ESM-only subpath that has grown a `require` condition. */
export function checkEsmOnlySubpaths(pkg, subpaths = ESM_ONLY_SUBPATHS) {
  return subpaths
    .filter(key => {
      const entry = pkg.exports?.[key];
      return entry !== null && typeof entry === 'object' && typeof entry.require === 'string';
    })
    .map(key => `exports["${key}"] declares a require condition, but this subpath is ESM-only`);
}

/**
 * The specifiers a CommonJS consumer must be able to `require`. AUTHORED, and
 * that is the whole point — an earlier revision derived this from the map by
 * collecting every key that already declared a `require` condition, which made
 * the check tautological: dropping the condition removed the specifier from its
 * own list, so the probe stayed green over an empty set.
 * Verified by mutation: deleting `exports["./loader"].require` with the derived
 * form produced PASS, and produces FAIL with this one.
 *
 * A `require` condition dropped or mistyped would otherwise pass the whole gate
 * — `checkDeclaredEntries` confirms the CJS file is packed, and the ESM probe
 * resolves through `import` — while every `require()` of this package failed in
 * production.
 */
export const REQUIRE_CAPABLE_SPECIFIERS = ['@egov-moldova/mud', '@egov-moldova/mud/loader'];

/**
 * Resolves each specifier through Node's own algorithm and confirms the PACKED
 * TARBALL contains what it resolved to.
 *
 * Both halves are needed. `import.meta.resolve` applies the exports map but
 * never stats, so a key pointing at a missing file resolves happily; and every
 * other check in this gate grades declared TARGETS, never KEYS, so a renamed or
 * mistyped key passes them all while no consumer can reach it.
 *
 * The membership test is against `packedFileList`, not `fs.existsSync`, for the
 * reason `checkDevSignature` gives below: a consumer resolves against the
 * published tarball, so a check that grades the working tree is the one
 * furthest from the consumer. A file present here and excluded by `files` or an
 * ignore rule would otherwise pass.
 *
 * Self-referencing — a package importing itself by its own name — is what makes
 * this need no symlink and no extracted tarball. The probe runs in a child
 * process because resolution is evaluated against the referring module's URL,
 * and that referrer has to sit inside the package.
 */
export function checkPublicSpecifiers(specifiers, cwd, packedFiles, condition = 'import') {
  const resolver =
    condition === 'require'
      ? [
          "const { createRequire } = await import('node:module');",
          "const resolve = createRequire(process.cwd() + '/probe.cjs').resolve;",
        ]
      : ['const resolve = spec => fileURLToPath(import.meta.resolve(spec));'];

  const probe = [
    "const { fileURLToPath } = await import('node:url');",
    ...resolver,
    'const specs = JSON.parse(process.argv[1]);',
    'const out = [];',
    'for (const spec of specs) {',
    '  try {',
    '    out.push({ spec, file: resolve(spec) });',
    '  } catch (err) {',
    '    out.push({ spec, code: err.code ?? String(err) });',
    '  }',
    '}',
    'console.log(JSON.stringify(out));',
  ].join('\n');

  // Guarded, because a child that dies for any reason other than a per-specifier
  // resolve error — an unreadable `cwd`, no package.json there, an OOM — would
  // otherwise throw out of `main` and replace the whole categorised report with a
  // Node stack trace. The gate would still exit non-zero, so nothing is wrongly
  // published; what is lost is every other check's verdict in that run.
  let resolved;
  try {
    const raw = execFileSync(process.execPath, ['--input-type=module', '-e', probe, JSON.stringify(specifiers)], {
      cwd,
      encoding: 'utf8',
      // The two packer helpers above raise this for the same reason; the default
      // 1 MB is generous for today's nine specifiers and silently truncating is
      // the one failure this whole function exists to make impossible.
      maxBuffer: 64 * 1024 * 1024,
    });
    // Inside the guard, not after it. A child that exits 0 having also written
    // something to stdout — an experimental-feature notice, a NODE_OPTIONS
    // preload banner, a CI instrumentation line — makes this throw, and outside
    // the guard that throw escapes `main` and replaces the categorised report
    // with a stack trace: the exact failure the guard is here to prevent.
    resolved = JSON.parse(raw);
  } catch (err) {
    return [`could not run the ${condition} resolution probe in ${cwd} — ${err.message.split('\n')[0]}`];
  }

  const packed = new Set(packedFiles);
  return resolved.flatMap(entry => {
    if (entry.code) {
      return [`${entry.spec} (${condition}) — does not resolve (${entry.code})`];
    }
    const file = path.posix.normalize(path.relative(cwd, entry.file));
    return packed.has(file)
      ? []
      : [`${entry.spec} (${condition}) — resolves to ${file}, which the tarball does not contain`];
  });
}

/**
 * Every packed `.js` carrying a development-build marker.
 *
 * `bundleDir` defaults to the WHOLE TARBALL, and that default is the point. This
 * check ran over the two bundle directories only — `dist/mud/` and
 * `dist/components/` — which left `main` (`dist/index.cjs.js`), `module`
 * (`dist/index.js`) and all of `loader/` unscanned. Those are the primary
 * entrypoints: a bare `import '@egov-moldova/mud'` resolves to one of them, so
 * the check furthest from the consumer was the one that ran. `checkDeclaredEntries`
 * did cover them, but only for PRESENCE — it never opens a file — so a dev-built
 * `dist/index.js` that exists passes both.
 *
 * Scanning everything rather than deriving two more directories is deliberate. A
 * derived list has to be kept in step with `package.json` forever and silently
 * under-scans the day a new output target is added; an unfiltered scan cannot go
 * stale and cannot be vacuous. The scope was measured before it was chosen: on
 * the current production tree of 461 `.js` files, zero carry either marker, so
 * completeness costs no false positive. And the markers are not decorative —
 * `Running in development mode` ships inside `@stencil/core`'s own
 * `internal/client/patch-browser.js`, so a `--dev` bundle does carry one.
 *
 * The parameter is retained so a caller can still ask about a single directory.
 */
export function checkDevSignature(packedFiles, readText, bundleDir) {
  // A default parameter fires on `undefined` only. `null` is the other way a caller
  // spells "no scope", and it would reach `startsWith(null)`, which coerces to the
  // literal `"null"` and matches nothing — a scan that silently grades zero files
  // while returning the empty array that means "clean". That is the exact failure
  // this function was just widened to remove, one layer up, so it is closed by a
  // type test rather than by a default.
  const prefix = typeof bundleDir === 'string' ? bundleDir : '';
  return packedFiles
    .filter(file => file.startsWith(prefix) && file.endsWith('.js'))
    .filter(file => DEV_BUILD_MARKERS.some(marker => marker.test(readText(file))));
}

/**
 * The standalone custom-elements bundle resolves `getAssetPath('./assets/x')`
 * relative to itself, but Stencil's `dist-custom-elements` target silently
 * ignores `assetsDirs` — `scripts/copy-component-assets.mjs` mirrors them in as
 * a post-build step. Without it a component with assets "renders empty
 * silently" (that script's own words). Nothing else in the tarball reveals it:
 * `exports["./components/*"]` is a pattern, so checkDeclaredEntries skips
 * it by design.
 */
export function checkBundleAssets(packedFiles, lazyDir, standaloneDir) {
  const lazy = packedFiles.filter(file => file.startsWith(`${lazyDir}assets/`));
  if (lazy.length === 0) {
    return [];
  }
  const standalone = packedFiles.filter(file => file.startsWith(`${standaloneDir}assets/`));
  return standalone.length === 0
    ? [`${standaloneDir}assets/ is empty while ${lazyDir}assets/ carries ${lazy.length} file(s)`]
    : [];
}

/**
 * The exact file list that would be published — `files`, ignore rules and the
 * packer's own built-in rules all applied. Asking the packer beats
 * reimplementing its rules.
 *
 * Yarn, because this repo is Yarn 4 (`packageManager` in package.json) and
 * `web-components` already publishes with `yarn npm publish`. Two properties
 * make it the better instrument here, both measured rather than assumed:
 *
 *   1. `yarn pack --dry-run` runs NO lifecycle script — neither `prepare` nor
 *      `prepack`. `npm pack --dry-run` runs `prepare`, and a `prepare` that
 *      exits non-zero aborts the pack with that code. This package's `prepare`
 *      is `husky install && ...`, so an npm-based gate would reinstall git
 *      hooks as a side effect of a read-only validation.
 *   2. On this package the two packers agree exactly. That agreement is what
 *      lets a yarn-measured list stand for an npm-published tarball, so it is
 *      not assumed here: `checkPackerAgreement` re-derives it on every run and
 *      fails the gate the moment the two lists diverge.
 *
 * Output is NDJSON: one `{"base":...}` line, then one `{"location":...}` per
 * file, with no `package/` prefix.
 */
export function packedFileList(cwd = PROJECT_ROOT) {
  const raw = execFileSync('yarn', ['pack', '--dry-run', '--json'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return raw
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => JSON.parse(line))
    .filter(entry => typeof entry.location === 'string')
    .map(entry => entry.location);
}

/**
 * The same list as `packedFileList`, asked of the packer the release path
 * actually uses (`pipline-mud-publish-npm.yml` publishes with `npm publish`).
 *
 * `--ignore-scripts` is required, not cosmetic: without it `npm pack --dry-run`
 * runs this package's `prepare` (`husky install && ...`), so a read-only
 * validation would reinstall git hooks as a side effect. It also keeps the
 * comparison honest — yarn runs no lifecycle script either, so both sides are
 * measured under the same conditions.
 *
 * Output is a JSON array with one entry, whose `files[].path` are the tarball
 * paths without the `package/` prefix — the same shape yarn's `location` has.
 */
export function npmPackedFileList(cwd = PROJECT_ROOT) {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(raw)[0].files.map(file => file.path);
}

/**
 * Every other check in this gate reads a list produced by `yarn pack`, while
 * the pipeline ships whatever `npm publish` builds. That substitution is only
 * legitimate while the two packers resolve `files` and the ignore rules
 * identically — so this asserts it rather than trusting it, and the gate's
 * verdict stops meaning anything about the published tarball the moment it
 * fails.
 *
 * A divergence is not something to paper over by widening a rule: bring the
 * publish step onto the same tool (`yarn npm publish`, which `web-components`
 * already uses) and re-run.
 */
export function checkPackerAgreement(yarnFiles, npmFiles) {
  const yarnSet = new Set(yarnFiles);
  const npmSet = new Set(npmFiles);
  return [
    ...yarnFiles.filter(file => !npmSet.has(file)).map(file => `${file} — packed by yarn, absent from npm`),
    ...npmFiles.filter(file => !yarnSet.has(file)).map(file => `${file} — packed by npm, absent from yarn`),
  ];
}

export function main({ cwd = PROJECT_ROOT, log = console.log, error = console.error } = {}) {
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  const declared = collectDeclaredEntries(pkg);
  const files = packedFileList(cwd);
  const readText = file => fs.readFileSync(path.join(cwd, file), 'utf8');
  const lazyDir = lazyBundleDir(pkg);
  const standaloneDir = standaloneBundleDir(pkg);

  const categories = [
    // First, because it grades the instrument the other checks read from: if
    // the two packers disagree, every verdict below is about a tarball that is
    // not the one being published.
    ['gate packer disagrees with the publisher packer', checkPackerAgreement(files, npmPackedFileList(cwd))],
    [
      'declared entrypoint missing from tarball',
      checkDeclaredEntries(declared, files).map(entry => `${entry.source} -> ${entry.target}`),
    ],
    // Keys, not targets. Every check above grades a declared TARGET; this one
    // asks whether a consumer writing the documented specifier gets a file
    // back, which is the property a key rename breaks while the rest stay green.
    ['public specifier does not resolve', checkPublicSpecifiers(PUBLIC_SPECIFIERS, cwd, files, 'import')],
    // The ESM probe above exercises only the `import` condition. A `require`
    // condition dropped or pointed at the wrong file resolves for nobody, and
    // every other check in this gate would still pass.
    [
      'public specifier does not resolve for a CommonJS consumer',
      checkPublicSpecifiers(REQUIRE_CAPABLE_SPECIFIERS, cwd, files, 'require'),
    ],
    ['ESM-only subpath declares a require condition', checkEsmOnlySubpaths(pkg)],
    ['build-machine artifact in tarball', checkForbiddenPaths(files)],
    ['absolute build-machine path in tarball', checkAbsolutePaths(files)],
    ['source map in tarball (development build)', checkSourceMaps(files)],
    [
      'development runtime in tarball',
      // EVERY packed `.js`, not a list of bundle directories. The previous scope
      // named two dirs and read as complete — the comment here even claimed "the
      // tarball carries two" — while `main`, `module` and all of `loader/` went
      // unread. The bar says "no development-build artifacts", so the scope is
      // the tarball. Rationale and the measurement behind it: `checkDevSignature`.
      checkDevSignature(files, readText),
    ],
    ['standalone bundle published without its assets', checkBundleAssets(files, lazyDir, standaloneDir)],
  ];

  const failures = categories.filter(([, offenders]) => offenders.length > 0);

  if (failures.length === 0) {
    log(
      `validate-package: PASS — ${files.length} files packed (yarn and npm agree), ` +
        `${declared.length}/${declared.length} declared entrypoints present`,
    );
    return 0;
  }

  for (const [label, offenders] of failures) {
    error(`validate-package: FAIL — ${label} (${offenders.length})`);
    for (const offender of offenders) {
      error(`  ${offender}`);
    }
  }
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
