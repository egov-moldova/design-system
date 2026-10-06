import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import path from 'node:path';

import ts from 'typescript';

import {
  checkAbsolutePaths,
  assetModuleDirs,
  checkAssetModules,
  checkDeclaredEntries,
  checkDevSignature,
  checkFlagLicense,
  checkForbiddenPaths,
  checkEsmOnlySubpaths,
  checkNoPublishedSvg,
  checkPackerAgreement,
  checkPublicSpecifiers,
  checkScriptTagNotExported,
  checkSourceMaps,
  checkFontFaceCoverage,
  checkStylesheetAssets,
  collectDeclaredEntries,
  exportsKeyPattern,
  expectedAssetKeys,
  isPublishedSvg,
  lazyBundleDir,
  normalizePackagePath,
  PROJECT_ROOT,
  ESM_ONLY_SUBPATHS,
  PUBLIC_SPECIFIERS,
  REQUIRE_CAPABLE_SPECIFIERS,
  standaloneBundleDir,
} from '../validate-package.mjs';
import { pinWorkspaceRanges } from '../adapters/pin-workspace-ranges.mjs';
import { PROXY_DIRS, PROXY_OUT_DIRS } from '../adapters/proxy-dirs.ts';

const PKG = {
  'main': 'dist/index.cjs.js',
  'module': 'dist/index.js',
  'types': 'dist/types/index.d.ts',
  'unpkg': 'dist/mud/mud.esm.js',
  'collection': 'dist/collection/collection-manifest.json',
  'collection:main': 'dist/collection/index.js',
  'es2015': 'dist/esm/index.js',
  'es2017': 'dist/esm/index.js',
  'exports': {
    '.': {
      types: './dist/types/index.d.ts',
      import: './dist/index.js',
      require: './dist/index.cjs.js',
    },
    './loader': {
      types: './loader/index.d.ts',
      import: './loader/index.js',
      require: './loader/index.cjs.js',
    },
    './styles.css': './dist/mud/mud.css',
    './tokens/*.css': './dist/mud/tokens/*.css',
    './assets/*': './dist/mud/assets/*',
    './components': {
      types: './dist/components/index.d.ts',
      import: './dist/components/index.js',
    },
  },
};

describe('normalizePackagePath', () => {
  it('strips the leading ./ that exports entries carry', () => {
    assert.equal(normalizePackagePath('./dist/index.js'), 'dist/index.js');
  });

  it('leaves a bare field value untouched', () => {
    assert.equal(normalizePackagePath('dist/index.js'), 'dist/index.js');
  });
});

describe('collectDeclaredEntries', () => {
  it('collects every single-file field and every exports leaf', () => {
    const sources = collectDeclaredEntries(PKG).map(entry => entry.source);
    assert.ok(sources.includes('main'));
    assert.ok(sources.includes('collection:main'));
    assert.ok(sources.includes('$.exports[.][import]'));
    assert.ok(sources.includes('$.exports[./components][types]'));
  });

  it('collects a plain-string exports leaf, not only condition objects', () => {
    const entry = collectDeclaredEntries(PKG).find(candidate => candidate.source === '$.exports[./styles.css]');
    assert.deepEqual(entry, {
      source: '$.exports[./styles.css]',
      target: './dist/mud/mud.css',
    });
  });

  it('skips subpath patterns, which resolve to many files', () => {
    const targets = collectDeclaredEntries(PKG).map(entry => entry.target);
    assert.ok(!targets.some(target => target.includes('*')));
  });

  it('tolerates a package.json with no exports field', () => {
    assert.deepEqual(collectDeclaredEntries({ main: 'a.js' }), [{ source: 'main', target: 'a.js' }]);
  });
});

describe('checkDeclaredEntries', () => {
  it('reports a declared entry that is absent from the tarball', () => {
    const packed = ['dist/index.cjs.js', 'dist/types/index.d.ts'];
    const missing = checkDeclaredEntries(collectDeclaredEntries(PKG), packed);
    assert.ok(missing.some(entry => entry.target === 'dist/collection/index.js'));
    assert.ok(!missing.some(entry => entry.target === 'dist/index.cjs.js'));
  });

  it('matches an exports leaf against its ./-stripped path', () => {
    const missing = checkDeclaredEntries(
      [{ source: '$.exports[.][import]', target: './dist/index.js' }],
      ['dist/index.js'],
    );
    assert.deepEqual(missing, []);
  });
});

describe('checkForbiddenPaths', () => {
  it('flags a leaked build-machine declaration directory', () => {
    const packed = ['dist/types/index.d.ts', 'dist/types/home/vsts/work/1/s/.stencil/stencil.config.d.ts'];
    assert.deepEqual(checkForbiddenPaths(packed), ['dist/types/home/vsts/work/1/s/.stencil/stencil.config.d.ts']);
  });

  it('flags a root config compiled into dist', () => {
    assert.deepEqual(checkForbiddenPaths(['dist/vitest-setup.js']), ['dist/vitest-setup.js']);
  });

  it('passes a clean tarball', () => {
    assert.deepEqual(checkForbiddenPaths(['dist/index.js', 'loader/index.js']), []);
  });
});

describe('lazyBundleDir', () => {
  it('derives the bundle directory from the unpkg field', () => {
    assert.equal(lazyBundleDir(PKG), 'dist/mud/');
  });

  it('follows a renamed Stencil namespace without an edit here', () => {
    assert.equal(lazyBundleDir({ unpkg: 'dist/age/age.esm.js' }), 'dist/age/');
  });

  it('throws rather than silently scanning nothing when unpkg is unusable', () => {
    assert.throws(() => lazyBundleDir({}), /cannot locate the lazy bundle/);
    assert.throws(() => lazyBundleDir({ unpkg: 'mud.esm.js' }), /cannot locate the lazy bundle/);
  });
});

describe('standaloneBundleDir', () => {
  it('derives the directory from the exports entry', () => {
    assert.equal(standaloneBundleDir(PKG), 'dist/components/');
  });

  it('throws rather than silently disabling the asset check', () => {
    assert.throws(() => standaloneBundleDir({ exports: {} }), /cannot locate the standalone bundle/);
  });
});

describe('isPublishedSvg / checkNoPublishedSvg', () => {
  it('recognises an SVG path in any case and nothing else', () => {
    assert.equal(isPublishedSvg('dist/mud/assets/outlined/a.svg'), true);
    assert.equal(isPublishedSvg('dist/mud/assets/LOGO.SVG'), true);
    assert.equal(isPublishedSvg('dist/mud/assets/fonts/onest-variable.woff2'), false);
    assert.equal(isPublishedSvg('dist/mud/svg-assets.js'), false);
  });

  it('flags a packed SVG file', () => {
    assert.deepEqual(checkNoPublishedSvg(['dist/mud/assets/outlined/a.svg']), ['dist/mud/assets/outlined/a.svg']);
  });

  it('passes a tarball whose only asset is a font', () => {
    assert.deepEqual(checkNoPublishedSvg(['dist/mud/assets/fonts/onest-variable.woff2']), []);
  });
});

describe('assetModuleDirs', () => {
  it('names the standalone, the lazy ESM and the CDN directories', () => {
    assert.deepEqual(assetModuleDirs(PKG), ['dist/components/', 'dist/esm/', 'dist/mud/']);
  });

  it('refuses a package it cannot locate the ESM build of', () => {
    assert.throws(() => assetModuleDirs({ ...PKG, es2015: undefined }), /cannot locate the lazy ESM build/);
  });
});

describe('expectedAssetKeys', () => {
  it('covers every icon variant, logo and flag the sources hold', () => {
    const keys = expectedAssetKeys();
    const count = prefix => keys.filter(key => key.startsWith(prefix)).length;
    const files = dir => fs.readdirSync(path.join(PROJECT_ROOT, dir)).filter(isPublishedSvg).length;
    assert.equal(
      count('icon:'),
      files('src/components/mud-icon/assets/outlined') + files('src/components/mud-icon/assets/filled'),
    );
    assert.equal(count('logo:'), files('src/components/mud-logo/assets'));
    assert.equal(count('flag:'), files('src/components/mud-phone-input/assets/flags'));
    assert.ok(keys.includes('icon:outlined/alarm') && keys.includes('flag:ad'));
  });
});

describe('checkAssetModules', () => {
  const DIRS = ['dist/components/', 'dist/esm/', 'dist/mud/'];
  const KEYS = ['icon:outlined/a', 'logo:l', 'flag:ad'];
  const chunk = (...keys) => keys.map(key => `export default "<svg data-mud-asset=\\"${key}\\"></svg>";`).join('\n');
  const fixture = overrides => {
    const texts = {};
    for (const dir of DIRS) {
      texts[`${dir}p-1.js`] = chunk(...KEYS);
    }
    return { ...texts, ...overrides };
  };
  const run = texts => checkAssetModules(Object.keys(texts), file => texts[file], KEYS, DIRS);

  it('passes when every directory carries every key', () => {
    assert.deepEqual(run(fixture({})), []);
  });

  it('finds a marker spread over several chunks and quoted any way a minifier likes', () => {
    const texts = fixture({
      'dist/mud/p-1.js': 'x=\'<svg data-mud-asset="icon:outlined/a">\'',
      'dist/mud/p-2.js': 'y=`<svg data-mud-asset="logo:l">`',
      'dist/mud/p-3.js': 'z=\'<svg data-mud-asset="flag:ad">\'',
    });
    assert.deepEqual(run(texts), []);
  });

  it('reports a key with no marker anywhere', () => {
    const texts = {};
    for (const dir of DIRS) {
      texts[`${dir}p-1.js`] = chunk('icon:outlined/a', 'flag:ad');
    }
    const problems = run(texts);
    assert.equal(problems.length, 3);
    assert.match(problems[0], /dist\/components\/ has no module for 1 of 3 drawing\(s\): logo:l/);
  });

  it('reports a key missing only from dist/mud/', () => {
    const problems = run(fixture({ 'dist/mud/p-1.js': chunk('icon:outlined/a', 'logo:l') }));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^dist\/mud\/ has no module for 1 of 3 drawing\(s\): flag:ad$/);
  });

  it('fails every key for a directory with no JavaScript at all', () => {
    const texts = fixture({});
    delete texts['dist/esm/p-1.js'];
    const problems = run(texts);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^dist\/esm\/ has no module for 3 of 3/);
  });

  it('ignores a marker in a file that is not JavaScript', () => {
    const texts = fixture({ 'dist/mud/p-1.js': '', 'dist/mud/a.svg': chunk(...KEYS) });
    assert.equal(run(texts).length, 1);
  });
});

describe('checkFlagLicense', () => {
  const CONFIG = { licenseFile: 'dist/mud/licenses/flag-icons.txt', componentsDir: 'dist/components/' };
  const flagChunk = code => `export default"<svg data-mud-asset=\\"flag:${code}\\"></svg>";`;
  const FILES = {
    'dist/mud/licenses/flag-icons.txt': 'MIT',
    'dist/components/p-ad.js': flagChunk('ad'),
    'dist/components/p-ae.js': flagChunk('ae'),
    'dist/components/mud-phone-input.js':
      '/* flag-icons */const m={ad:()=>import("./p-ad.js"),ae:()=>import("./p-ae.js")};export{m as F}',
  };
  const run = (texts, config = CONFIG) => checkFlagLicense(Object.keys(texts), file => texts[file], config);

  it('passes when the licence is packed and the flag-map chunk names flag-icons', () => {
    assert.deepEqual(run(FILES), []);
  });

  it('reports a missing licence file', () => {
    const texts = { ...FILES };
    delete texts['dist/mud/licenses/flag-icons.txt'];
    assert.deepEqual(run(texts), ['dist/mud/licenses/flag-icons.txt is not packed']);
  });

  it('reports a flag-map chunk that lost flag-icons in minification', () => {
    const texts = {
      ...FILES,
      'dist/components/mud-phone-input.js':
        'const m={ad:()=>import("./p-ad.js"),ae:()=>import("./p-ae.js")};export{m as F}',
    };
    assert.deepEqual(run(texts), [
      'dist/components/mud-phone-input.js holds the flag map but no longer contains "flag-icons" after minification',
    ]);
  });

  it('is not satisfied by flag-icons in a chunk that is not the flag map', () => {
    const texts = {
      ...FILES,
      'dist/components/mud-phone-input.js':
        'const m={ad:()=>import("./p-ad.js"),ae:()=>import("./p-ae.js")};export{m as F}',
      'dist/components/other.js': '/* flag-icons */',
    };
    assert.equal(run(texts).length, 1);
  });

  it('reports a bundle with no flag drawing rather than passing vacuously', () => {
    const texts = { 'dist/mud/licenses/flag-icons.txt': 'MIT', 'dist/components/x.js': 'export{}' };
    assert.deepEqual(run(texts), ['no chunk under dist/components/ carries a flag drawing']);
  });
});

describe('checkStylesheetAssets', () => {
  const css = files => file => files[file];

  it('passes when every relative url resolves to a packed file', () => {
    const read = css({ 'dist/mud/mud.css': "@font-face{src:url('./assets/fonts/onest-variable.woff2')}" });
    const packed = ['dist/mud/mud.css', 'dist/mud/assets/fonts/onest-variable.woff2'];
    assert.deepEqual(checkStylesheetAssets(PKG, packed, read), []);
  });

  it('names the url and the missing file', () => {
    const read = css({ 'dist/mud/mud.css': "@font-face{src:url('./assets/fonts/onest-variable.woff2')}" });
    assert.deepEqual(checkStylesheetAssets(PKG, ['dist/mud/mud.css'], read), [
      'dist/mud/mud.css references ./assets/fonts/onest-variable.woff2, but the tarball does not contain dist/mud/assets/fonts/onest-variable.woff2',
    ]);
  });

  it('checks urls outside @font-face too', () => {
    const read = css({ 'dist/mud/mud.css': '.x{background:url(img/a.svg?v=2)}' });
    assert.deepEqual(checkStylesheetAssets(PKG, ['dist/mud/mud.css'], read), [
      'dist/mud/mud.css references img/a.svg?v=2, but the tarball does not contain dist/mud/img/a.svg',
    ]);
  });

  it('skips absolute, protocol-relative, data and fragment-only urls', () => {
    const read = css({
      'dist/mud/mud.css':
        '.a{background:url(https://cdn.example/a.svg)} .b{background:url(//cdn.example/b.svg)} ' +
        '.c{background:url(/abs.svg)} .d{background:url(data:image/svg+xml;base64,AA==)} .e{mask:url(#m)}',
    });
    assert.deepEqual(checkStylesheetAssets(PKG, ['dist/mud/mud.css'], read), []);
  });

  it('leaves a missing stylesheet to checkDeclaredEntries', () => {
    assert.deepEqual(
      checkStylesheetAssets(PKG, [], () => {
        throw new Error('must not read');
      }),
      [],
    );
  });

  it('throws when the package declares no global stylesheet', () => {
    assert.throws(() => checkStylesheetAssets({ exports: {} }, [], () => ''), /exports\["\.\/styles\.css"\]/);
  });
});

describe('checkFontFaceCoverage', () => {
  const STYLES = 'dist/mud/mud.css';
  const TOKENS = 'dist/mud/tokens/core.tokens.css';
  const FONT = 'dist/mud/assets/fonts/onest.woff2';
  const TOKEN_CSS = ':root{--font-family-primary:Onest;--font-weight-regular:400;--font-weight-semibold:600}';
  const VARIABLE_FONT = fs.readFileSync(path.join(PROJECT_ROOT, 'src/assets/fonts/onest-variable.woff2'));
  const STATIC_FONT = (() => {
    const buffer = Buffer.alloc(48); // a well-formed WOFF2 with no tables, so no fvar
    buffer.write('wOF2', 0, 'latin1');
    return buffer;
  })();
  const run = (css, { tokens = TOKEN_CSS, font = VARIABLE_FONT, packed = [STYLES, TOKENS, FONT] } = {}) =>
    checkFontFaceCoverage(
      PKG,
      packed,
      file => ({ [STYLES]: css, [TOKENS]: tokens })[file],
      () => font,
    );
  const face = (weight, style = 'normal') =>
    `@font-face{font-family:'Onest';font-style:${style};font-weight:${weight};src:url('./assets/fonts/onest.woff2') format('woff2')}`;

  it('passes a variable face whose file renders the declared range', () => {
    assert.deepEqual(run(face('100 900')), []);
  });

  it('names every token weight no upright face covers', () => {
    assert.deepEqual(run(face('400') + face('700') + face('100 900', 'italic')), [
      'dist/mud/mud.css has no Onest face covering font-weight 600, which dist/mud/tokens/core.tokens.css uses',
    ]);
  });

  it('refuses a static file declared as a variable range', () => {
    assert.deepEqual(run(face('100 900'), { font: STATIC_FONT }), [
      'dist/mud/assets/fonts/onest.woff2 is a static font, but dist/mud/mud.css declares it for Onest 100 900',
    ]);
  });

  it('reports a file that is not WOFF2 instead of throwing', () => {
    const [failure] = run(face('100 900'), {
      font: Buffer.from('ttf bytes that are long enough for the header check'),
    });
    assert.match(
      failure,
      /onest\.woff2 is declared for Onest 100 900 but is not a readable WOFF2 — woff2: missing wOF2/,
    );
  });

  it('reports token stylesheets with no primary family', () => {
    assert.deepEqual(run(face('100 900'), { tokens: ':root{--font-weight-regular:400}' }), [
      'dist/mud/tokens/core.tokens.css declares no --font-family-primary',
    ]);
  });

  it('leaves a missing stylesheet, token file or font to the checks that own them', () => {
    assert.deepEqual(run(face('100 900'), { packed: [STYLES] }), []);
    assert.deepEqual(run(face('100 900'), { packed: [STYLES, TOKENS], font: STATIC_FONT }), []);
  });
});

describe('checkAbsolutePaths', () => {
  it('flags a declaration emitted under a Linux build-machine path', () => {
    const packed = ['dist/types/home/vsts/work/1/s/.stencil/stencil.config.d.ts'];
    assert.deepEqual(checkAbsolutePaths(packed), packed);
  });

  it('flags a macOS one', () => {
    const packed = ['dist/types/Users/Dan/WORK/x/.stencil/vitest-setup.d.ts'];
    assert.deepEqual(checkAbsolutePaths(packed), packed);
  });

  it('flags a macOS temp-directory build, where the leak starts at /private/var', () => {
    const packed = ['dist/types/private/var/folders/91/T/mud-verify/.stencil/stencil.config.d.ts'];
    assert.deepEqual(checkAbsolutePaths(packed), packed);
  });

  it('flags a leak that lands at the tarball root, with no directory above it', () => {
    const packed = ['Users/Dan/WORK/x/.stencil/stencil.config.d.ts'];
    assert.deepEqual(checkAbsolutePaths(packed), packed);
  });

  it('leaves a normal declaration tree alone', () => {
    assert.deepEqual(
      checkAbsolutePaths([
        'dist/types/index.d.ts',
        'dist/types/components/mud-button/mud-button.d.ts',
        'dist/types/utils/dom.d.ts',
        'loader/index.d.ts',
      ]),
      [],
    );
  });
});

describe('checkSourceMaps', () => {
  it('flags any .map file', () => {
    assert.deepEqual(checkSourceMaps(['dist/mud/mud.esm.js', 'dist/mud/mud.esm.js.map']), ['dist/mud/mud.esm.js.map']);
  });
});

describe('checkDevSignature', () => {
  const DIR = 'dist/mud/';

  it('flags a lazy bundle built in development mode', () => {
    const packed = ['dist/mud/p-abc.js', 'dist/mud/mud.esm.js'];
    const contents = {
      'dist/mud/p-abc.js': 'const BUILD = { isDev: true, isTesting: false };',
      'dist/mud/mud.esm.js': 'var patchBrowser = () => {};',
    };
    assert.deepEqual(
      checkDevSignature(packed, file => contents[file], DIR),
      ['dist/mud/p-abc.js'],
    );
  });

  it('flags the development-mode console notice', () => {
    const packed = ['dist/mud/mud.esm.js'];
    const contents = { 'dist/mud/mud.esm.js': 'consoleDevInfo("Running in development mode.")' };
    assert.deepEqual(
      checkDevSignature(packed, file => contents[file], DIR),
      ['dist/mud/mud.esm.js'],
    );
  });

  it('passes a minified production bundle', () => {
    const packed = ['dist/mud/p-abc.js'];
    const contents = { 'dist/mud/p-abc.js': 'const B={isDev:!1,isTesting:!1};' };
    assert.deepEqual(
      checkDevSignature(packed, file => contents[file], DIR),
      [],
    );
  });

  it('ignores files outside the bundle directory it was given', () => {
    const packed = ['dist/collection/thing.js'];
    const contents = { 'dist/collection/thing.js': 'isDev: true' };
    assert.deepEqual(
      checkDevSignature(packed, file => contents[file], DIR),
      [],
    );
  });

  // The default scope, which is what `main()` uses. Scanning only the two bundle
  // directories left `main`, `module` and all of `loader/` unread — the primary
  // entrypoints a bare `import '@egov-moldova/mud'` resolves to. The presence
  // check covered them, but it never opens a file, so a dev-built entrypoint that
  // exists satisfied both.
  it('scans the whole tarball when given no directory', () => {
    const packed = ['dist/index.js', 'dist/index.cjs.js', 'loader/index.js', 'dist/mud/p-abc.js'];
    const contents = {
      'dist/index.js': 'const BUILD = { isDev: true };',
      'dist/index.cjs.js': 'exports.x = 1;',
      'loader/index.js': 'consoleDevInfo("Running in development mode.")',
      'dist/mud/p-abc.js': 'const B={isDev:!1};',
    };
    assert.deepEqual(
      checkDevSignature(packed, file => contents[file]),
      ['dist/index.js', 'loader/index.js'],
    );
  });

  // The control for the test above: with the OLD scope, the same tarball reports
  // clean. Without this pair, a regression back to the bundle-dir-only scope would
  // leave the suite green.
  it('and the old bundle-directory scope would have missed both of them', () => {
    const packed = ['dist/index.js', 'loader/index.js'];
    const contents = {
      'dist/index.js': 'const BUILD = { isDev: true };',
      'loader/index.js': 'consoleDevInfo("Running in development mode.")',
    };
    assert.deepEqual(
      checkDevSignature(packed, file => contents[file], 'dist/mud/'),
      [],
    );
  });

  // A default parameter fires on `undefined` only, so `null` — the other way a caller
  // spells "no scope" — would have reached `startsWith(null)`, coerced to the literal
  // "null", and graded zero files while returning the empty array that reads as clean.
  it('treats a null directory as no scope, not as the string "null"', () => {
    const packed = ['dist/index.js'];
    const contents = { 'dist/index.js': 'const BUILD = { isDev: true };' };
    assert.deepEqual(
      checkDevSignature(packed, file => contents[file], null),
      ['dist/index.js'],
    );
  });

  it('reads a non-.js entrypoint as out of scope', () => {
    const packed = ['dist/index.d.ts'];
    const contents = { 'dist/index.d.ts': 'isDev: true' };
    assert.deepEqual(
      checkDevSignature(packed, file => contents[file]),
      [],
    );
  });
});

describe('checkPackerAgreement', () => {
  it('passes when both packers resolve the same file list', () => {
    const files = ['dist/index.js', 'loader/index.js'];
    assert.deepEqual(checkPackerAgreement(files, [...files].reverse()), []);
  });

  it('names a file yarn packs and npm does not', () => {
    assert.deepEqual(checkPackerAgreement(['dist/index.js', 'dist/extra.js'], ['dist/index.js']), [
      'dist/extra.js — packed by yarn, absent from npm',
    ]);
  });

  it('names a file npm packs and yarn does not', () => {
    assert.deepEqual(checkPackerAgreement(['dist/index.js'], ['dist/index.js', 'dist/extra.js']), [
      'dist/extra.js — packed by npm, absent from yarn',
    ]);
  });

  it('reports both directions of a divergence in one run', () => {
    assert.deepEqual(checkPackerAgreement(['a.js', 'shared.js'], ['b.js', 'shared.js']), [
      'a.js — packed by yarn, absent from npm',
      'b.js — packed by npm, absent from yarn',
    ]);
  });
});

// The fixture package, not the live manifest. Binding these to `package.json`
// would make the gate's own mutation check redden this suite while it is in
// place, and would turn any future key rename into a failure of tests that are
// not about that key.
const FIXTURE_PKG = path.join(PROJECT_ROOT, 'scripts', '__fixtures__', 'exports-pkg');

describe('checkPublicSpecifiers', () => {
  it('reports a specifier that the exports map does not expose', () => {
    const failures = checkPublicSpecifiers(['@egov-moldova/mud/no-such-key'], FIXTURE_PKG, []);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /no-such-key/);
    assert.match(failures[0], /ERR_PACKAGE_PATH_NOT_EXPORTED/);
  });

  it('reports a specifier that resolves to a path the tarball does not carry', () => {
    const failures = checkPublicSpecifiers(['@egov-moldova/mud/styles.css'], FIXTURE_PKG, []);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /styles\.css/);
    assert.match(failures[0], /the tarball does not contain/);
  });

  it('passes a specifier whose resolved path is packed', () => {
    const failures = checkPublicSpecifiers(['@egov-moldova/mud/styles.css'], FIXTURE_PKG, ['dist/mud/mud.css']);
    assert.deepEqual(failures, []);
  });

  it('resolves a pattern key through one representative', () => {
    const failures = checkPublicSpecifiers(['@egov-moldova/mud/tokens/core.tokens.css'], FIXTURE_PKG, [
      'dist/mud/tokens/core.tokens.css',
    ]);
    assert.deepEqual(failures, []);
  });
});

describe('PUBLIC_SPECIFIERS covers the exports map', () => {
  // Not the tautology a derived list would be: this grades SET MEMBERSHIP
  // between two independently authored things, where `checkPublicSpecifiers`
  // grades resolution. It is the half that catches a key added to `exports`
  // and never given a specifier — the direction the resolve check is blind to.
  it('names every literal key and at least one representative per pattern key', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    const missing = Object.keys(pkg.exports).filter(key => {
      const suffix = key === '.' ? '' : key.slice(1);
      if (!key.includes('*')) {
        return !PUBLIC_SPECIFIERS.includes(`@egov-moldova/mud${suffix}`);
      }
      const shape = exportsKeyPattern(key);
      return !PUBLIC_SPECIFIERS.some(specifier => shape.test(specifier));
    });
    assert.deepEqual(missing, []);
  });
});

describe('checkScriptTagNotExported', () => {
  // The packed scripts of the lazy bundle, in the shape the tarball carries them, beside the
  // stylesheets that legitimately share the directory.
  const packed = [
    'dist/mud/mud.esm.js',
    'dist/mud/index.esm.js',
    'dist/mud/p-abc123.js',
    'dist/mud/p-def456.entry.js',
    'dist/mud/mud.css',
    'dist/mud/tokens/core.tokens.css',
    'dist/components/mud-button.js',
  ];
  const withExports = exports => ({ unpkg: 'dist/mud/mud.esm.js', exports });

  it('passes the package.json this repository publishes', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    assert.deepEqual(checkScriptTagNotExported(pkg, packed), []);
  });

  it('names a literal key on the entry, the shape 1.2.0-dev.1 to dev.3 published', () => {
    const failures = checkScriptTagNotExported(withExports({ './mud.esm.js': './dist/mud/mud.esm.js' }), packed);
    assert.deepEqual(failures, ['$.exports[./mud.esm.js]: ./dist/mud/mud.esm.js -> dist/mud/mud.esm.js']);
  });

  it('names a pattern that reaches the bundle, the shape 1.1.9 published', () => {
    const failures = checkScriptTagNotExported(withExports({ './dist/mud/*': './dist/mud/*' }), packed);
    assert.deepEqual(failures, ['$.exports[./dist/mud/*]: ./dist/mud/* -> dist/mud/mud.esm.js (+3 more)']);
  });

  it('reads a target nested under a condition', () => {
    const failures = checkScriptTagNotExported(
      withExports({ './bundle': { webpack: { import: './dist/mud/index.esm.js' } } }),
      packed,
    );
    assert.deepEqual(failures, [
      '$.exports[./bundle][webpack][import]: ./dist/mud/index.esm.js -> dist/mud/index.esm.js',
    ]);
  });

  it('treats a legacy folder mapping as reaching everything under it', () => {
    const failures = checkScriptTagNotExported(withExports({ './': './dist/mud/' }), packed);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /^\$\.exports\[\.\/\]: \.\/dist\/mud\/ -> /);
  });

  it('treats the root folder mapping, which normalizes to an empty path, as reaching the bundle', () => {
    const failures = checkScriptTagNotExported(withExports({ './': './' }), packed);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /^\$\.exports\[\.\/\]: \.\/ -> dist\/mud\//);
  });

  it('reads backslash separators and percent escapes the way Node resolves them', () => {
    const failures = checkScriptTagNotExported(
      withExports({
        './b': String.raw`./dist\mud\mud.esm.js`,
        './c': './dist/%6Dud/mud.esm.js',
        './d': './dist/%zz/x.js',
      }),
      packed,
    );
    assert.deepEqual(failures, [
      String.raw`$.exports[./b]: ./dist\mud\mud.esm.js -> dist/mud/mud.esm.js`,
      '$.exports[./c]: ./dist/%6Dud/mud.esm.js -> dist/mud/mud.esm.js',
    ]);
  });

  it('collapses dot segments and ignores case in a target', () => {
    const failures = checkScriptTagNotExported(
      withExports({ './a/*': './dist/x/../mud/*', './b/*': './dist/MUD/*' }),
      packed,
    );
    assert.equal(failures.length, 2);
  });

  it('fails closed on a wildcard narrowed by a null exclusion under another key', () => {
    // Node would let the longer `*.js` key win; the gate grades each target alone.
    const failures = checkScriptTagNotExported(
      withExports({ './dist/mud/*': './dist/mud/*', './dist/mud/*.js': null }),
      packed,
    );
    assert.equal(failures.length, 1);
  });

  it('skips a null exclusion and the stylesheets beside the bundle', () => {
    const failures = checkScriptTagNotExported(
      withExports({
        './styles.css': './dist/mud/mud.css',
        './tokens/*.css': './dist/mud/tokens/*.css',
        './dist/*': null,
        './components/mud-*.js': './dist/components/mud-*.js',
      }),
      packed,
    );
    assert.deepEqual(failures, []);
  });

  it('refuses to grade a package whose unpkg field cannot locate the bundle', () => {
    assert.throws(() => checkScriptTagNotExported({ exports: {} }, packed), /cannot locate the lazy bundle/);
  });
});

describe('checkEsmOnlySubpaths', () => {
  it('names a subpath that has grown a require condition', () => {
    const pkg = { exports: { './components': { import: './dist/components/index.js', require: './x.cjs' } } };
    const failures = checkEsmOnlySubpaths(pkg);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /\.\/components/);
    assert.match(failures[0], /ESM-only/);
  });

  it('passes the shape this package actually publishes', () => {
    const pkg = { exports: { './components': { types: './d.ts', import: './dist/components/index.js' } } };
    assert.deepEqual(checkEsmOnlySubpaths(pkg), []);
  });

  it('is silent when the subpath is absent altogether', () => {
    assert.deepEqual(checkEsmOnlySubpaths({ exports: {} }), []);
  });
});

describe('REQUIRE_CAPABLE_SPECIFIERS', () => {
  // Authored, not derived. A derived list would drop a specifier the moment its
  // `require` condition disappeared — which is the only failure the CJS probe
  // exists to catch — so this asserts the list against the map in the direction
  // that cannot go vacuous: every named specifier must still carry the condition.
  it('names specifiers whose exports entry declares a require condition', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    const withoutRequire = REQUIRE_CAPABLE_SPECIFIERS.filter(specifier => {
      const key = specifier === '@egov-moldova/mud' ? '.' : `.${specifier.slice('@egov-moldova/mud'.length)}`;
      return typeof pkg.exports?.[key]?.require !== 'string';
    });
    assert.deepEqual(withoutRequire, []);
  });
});

describe('ESM_ONLY_SUBPATHS names live keys', () => {
  // The asymmetry this closes: its two sibling lists are each checked against
  // the live map, and this one was not. `checkEsmOnlySubpaths` reads
  // `pkg.exports?.[key]`, so a renamed key drops silently out of the filter and
  // the guard becomes a permanent no-op for that entry — with nothing failing.
  // This diff renames four keys, which is exactly how that happens.
  it('every guarded subpath is still a key in exports', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    const absent = ESM_ONLY_SUBPATHS.filter(key => !(key in (pkg.exports ?? {})));
    assert.deepEqual(absent, []);
  });
});

describe('the React output target names the exports key', () => {
  // `customElementsDir` in stencil.config.ts and the `./components/<pattern>` key
  // in package.json are two copies of one fact: the segment the generated
  // wrappers put in their import specifiers. Nothing else binds them, and the
  // only other detector is `tsc --noEmit` in a workspace whose build script is
  // `tsc || true`. Rename the key without this test and 56 wrappers hold a dead
  // specifier that no check reports.
  it('customElementsDir equals the first segment of the components pattern key', () => {
    const config = fs.readFileSync(path.join(PROJECT_ROOT, 'stencil.config.ts'), 'utf8');
    const declared = /customElementsDir:\s*'([^']+)'/.exec(config)?.[1];
    assert.ok(declared, 'stencil.config.ts declares no customElementsDir');

    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    const patternKey = Object.keys(pkg.exports).find(key => key.startsWith(`./${declared}/`) && key.includes('*'));
    assert.ok(patternKey, `exports has no pattern key under ./${declared}/ — the generated wrappers would not resolve`);
  });
});

describe('the proxy output directories agree across the build, git and Prettier', () => {
  // `scripts/adapters/proxy-dirs.ts` is the one list. Three files hold a copy of each
  // entry in a different dialect, and a stale copy never errors: a wireit `output` that
  // misses a directory restores the build from cache without its proxies, a missing
  // ignore entry lets a generated proxy be committed (the lesson of 6e557bf5), and a
  // missing `.prettierignore` entry turns `yarn lint` red after a build.
  const readLines = file =>
    fs.existsSync(file)
      ? fs
          .readFileSync(file, 'utf8')
          .split('\n')
          .map(line => line.trim())
      : [];

  it('names at least one directory, each repo-relative with no trailing slash', () => {
    assert.ok(PROXY_OUT_DIRS.length > 0);
    assert.deepEqual(PROXY_OUT_DIRS, Object.values(PROXY_DIRS));
    for (const dir of PROXY_OUT_DIRS) {
      assert.ok(!dir.startsWith('/') && !dir.endsWith('/') && !dir.includes('\\'), `malformed proxy directory: ${dir}`);
    }
  });

  it('declares every directory as an output of the wireit `build` entry', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    const output = pkg.wireit?.build?.output ?? [];
    const missing = PROXY_OUT_DIRS.filter(dir => !output.includes(`${dir}/**`));
    assert.deepEqual(missing, [], 'wireit build `output` must carry `<dir>/**` for each proxy directory');
  });

  it('git-ignores every directory, from the root `.gitignore` or a `.gitignore` above it', () => {
    const unignored = PROXY_OUT_DIRS.filter(dir => {
      const segments = dir.split('/');
      // Ancestors from the repo root down to the directory's parent: `''`, `packages`, ...
      return !segments.some((_, depth) => {
        const base = segments.slice(0, depth).join('/');
        const rel = segments.slice(depth).join('/');
        const accepted = [rel, `${rel}/`, `${rel}/*`, `${rel}/**`];
        return readLines(path.join(PROJECT_ROOT, base, '.gitignore')).some(line => accepted.includes(line));
      });
    });
    assert.deepEqual(unignored, []);
  });

  it('lists every directory in `.prettierignore`', () => {
    const lines = readLines(path.join(PROJECT_ROOT, '.prettierignore'));
    const missing = PROXY_OUT_DIRS.filter(dir => !lines.includes(`${dir}/`));
    assert.deepEqual(missing, []);
  });
});

describe('the Vue output target has one range', () => {
  // The root devDependency is the GENERATOR that writes the proxies; `packages/vue` depends on
  // the same package for its `/runtime`, which those proxies import. They are two halves of one
  // version (the target is 0.x, so a minor can break the generated call), and nothing but this
  // case notices when one is bumped alone.
  it('uses the same range for the root generator and the packages/vue runtime', () => {
    const readPkg = file => JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf8'));
    const generator = readPkg('package.json').devDependencies?.['@stencil/vue-output-target'];
    const runtime = readPkg('packages/vue/package.json').dependencies?.['@stencil/vue-output-target'];
    assert.ok(generator, 'the root package.json has no @stencil/vue-output-target devDependency');
    assert.ok(runtime, 'packages/vue/package.json has no @stencil/vue-output-target dependency');
    assert.equal(runtime, generator);
    assert.ok(generator.startsWith('~'), `the 0.x output target is pinned with ~, found ${generator}`);
  });
});

describe("pinWorkspaceRanges (the Angular adapter build rewrites ng-packagr's manifest)", () => {
  // ng-packagr copies `workspace:^` into `dist/package.json` verbatim and `dist/` is no Yarn
  // workspace, so `yarn pack` cannot rewrite it. The build does, with Yarn's own mapping; the
  // fixture runner's guard then reads the packed tarball. These cases pin the mapping.
  const versions = new Map([['@egov-moldova/mud', '1.2.0-dev.1']]);

  it("maps `^`, `~`, `*` and an explicit range the way Yarn's pack does", () => {
    const manifest = {
      peerDependencies: { '@egov-moldova/mud': 'workspace:^', '@angular/core': '^20.0.0' },
      dependencies: { '@egov-moldova/mud': 'workspace:~' },
      optionalDependencies: { '@egov-moldova/mud': 'workspace:*' },
      devDependencies: { '@egov-moldova/mud': 'workspace:>=1.0.0' },
    };
    const rewritten = pinWorkspaceRanges(manifest, versions);
    assert.equal(rewritten.length, 4);
    assert.deepEqual(manifest, {
      peerDependencies: { '@egov-moldova/mud': '^1.2.0-dev.1', '@angular/core': '^20.0.0' },
      dependencies: { '@egov-moldova/mud': '~1.2.0-dev.1' },
      optionalDependencies: { '@egov-moldova/mud': '1.2.0-dev.1' },
      devDependencies: { '@egov-moldova/mud': '>=1.0.0' },
    });
  });

  it('fails on a workspace: dependency that names no workspace, rather than shipping it', () => {
    assert.throws(
      () => pinWorkspaceRanges({ peerDependencies: { '@egov-moldova/other': 'workspace:^' } }, versions),
      /not a workspace/,
    );
  });

  it('keeps `workspace:^` in the Angular source manifest, so the core version lives only at the root', () => {
    const angular = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'packages/angular/package.json'), 'utf8'));
    assert.equal(angular.peerDependencies?.['@egov-moldova/mud'], 'workspace:^');
    assert.match(
      angular.scripts?.build ?? '',
      /ng-packagr .*&& node \.\.\/\.\.\/scripts\/adapters\/pin-workspace-ranges\.mjs dist\/package\.json$/,
    );
  });
});

describe('exportsKeyPattern', () => {
  // Three decisions live in this helper's JSDoc and none of them were pinned:
  // it was reached only through two assertions over the live `exports` map, which
  // happens to contain no key that discriminates any of them. Reverting any one
  // would have passed the suite.
  it('keeps a literal `.` literal, so a wildcard key cannot match a run-together specifier', () => {
    const pattern = exportsKeyPattern('./tokens/*.css');
    assert.ok(pattern.test('@egov-moldova/mud/tokens/core.tokens.css'));
    assert.ok(!pattern.test('@egov-moldova/mud/tokens/coreXtokensYcss'));
  });

  it('expands EVERY wildcard, not just the first', () => {
    const pattern = exportsKeyPattern('./a/*/b/*.js');
    assert.ok(pattern.test('@egov-moldova/mud/a/one/b/two.js'));
    assert.ok(!pattern.test('@egov-moldova/mud/a/one/b/*.js'.replace('*', 'two') + 'x'));
  });

  it('treats `*` as zero-or-more, matching Node subpath-pattern semantics', () => {
    // Node resolves `./p/*` against `./p/` — the empty expansion is legal, so a
    // translation using `.+` would reject a specifier the package really exports.
    assert.ok(exportsKeyPattern('./components/mud-*.js').test('@egov-moldova/mud/components/mud-.js'));
  });

  it('anchors both ends, so a longer specifier does not satisfy a shorter key', () => {
    const pattern = exportsKeyPattern('./components');
    assert.ok(pattern.test('@egov-moldova/mud/components'));
    assert.ok(!pattern.test('@egov-moldova/mud/components/mud-button.js'));
  });

  it('maps the root key to the bare package name', () => {
    const pattern = exportsKeyPattern('.');
    assert.ok(pattern.test('@egov-moldova/mud'));
    assert.ok(!pattern.test('@egov-moldova/mud/loader'));
  });
});

describe('the React workspace names only exported subpaths', () => {
  // `the React output target names the exports key` above binds the CONFIG
  // (`stencil.config.ts`'s `customElementsDir`) to the `exports` key. It cannot
  // see the files that config produced: those are git-ignored
  // (`packages/react/.gitignore:6`), so a worktree whose last `yarn build` predates
  // an `exports` rename carries 56 wrappers holding a dead specifier that no
  // check reports. That is issue #23, and this is the half that reads the files.
  //
  // The scan covers all of `packages/react/src`, not just the generated subtree, so it
  // never reports a pass over zero files: on a fresh clone the generated
  // directory does not exist and `packages/react/src/index.ts` is still graded.
  // `yarn test:scripts` depends on `yarn build`, which generates the proxies, so a
  // run through the wireit entry grades all 56 wrappers; a bare `node --test` on a
  // machine that has not built grades one file.
  const REACT_SRC = path.join(PROJECT_ROOT, 'packages/react/src');
  // Anchored on the quote, not on `from`/`import`: `import("…")` has no space
  // before the quote and `require("…")` uses neither keyword, and a wrapper that
  // drifted into either would otherwise pass vacuously.
  //
  // What keeps it from firing on prose, stated exactly, because an earlier version
  // of this comment got it wrong: the non-import mentions in `packages/react/src` come in
  // two kinds. Those spelling `/node_modules/@egov-moldova/mud/…` have `/` as the
  // character after the quote, so they do not match. JSDoc mentions delimited by
  // BACKTICKS are skipped only because backtick is not in the `["']` class — not because
  // of any path shape. A future doc mention written with real quotes WOULD be reported,
  // and that is the known edge.
  //
  // A specifier assembled at runtime from fragments is outside what any static
  // check reads, and outside what this one claims.
  const SPECIFIER_RE = /["'](@egov-moldova\/mud(?:\/[^"']*)?)["']/g;
  const SOURCE_EXT = /\.tsx?$/;

  // `existsSync` before the recursion: without it a pruned, absent or renamed
  // `packages/react/` workspace dies on a raw ENOENT with a stack trace, instead of the
  // assertion below — which was written to diagnose exactly that case.
  const walk = dir =>
    !fs.existsSync(dir)
      ? []
      : fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) return walk(full);
          return entry.isFile() && SOURCE_EXT.test(full) ? [full] : [];
        });

  it('every `@egov-moldova/mud` specifier under packages/react/src resolves through the exports map', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    const patterns = Object.keys(pkg.exports).map(exportsKeyPattern);

    const files = walk(REACT_SRC);
    assert.ok(files.length > 0, 'packages/react/src holds no .ts/.tsx files — the scan would grade nothing');

    const dead = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const [, specifier] of source.matchAll(SPECIFIER_RE)) {
        if (!patterns.some(pattern => pattern.test(specifier))) {
          dead.push(`${path.relative(PROJECT_ROOT, file)}: ${specifier}`);
        }
      }
    }
    assert.deepEqual(dead, []);
  });

  // #180: the wrappers import the standalone bundle, so any other `@egov-moldova/mud` entry
  // registers tags through a second Stencil runtime. The root specifier resolves to
  // `dist/index.js`, which re-exports `dist/esm`, the lazy runtime, so it is allowed ONLY in an
  // import the compiler erases: `import type { … }`, or every binding marked `type` — the shape
  // the React output target writes for event-detail types (`stencilPackageName`).
  // Limit: that erasure is the default; a consumer compiling this `src/` with
  // `verbatimModuleSyntax` keeps `import {} from "@egov-moldova/mud"` and evaluates the lazy
  // runtime's modules (no tag registered). A specifier assembled at runtime is outside any
  // static read.
  const STANDALONE_RE = /^@egov-moldova\/mud\/components(?:\/mud-[a-z0-9-]+\.js)?$/;
  const ROOT_IMPORT_RE = /\bimport\s+(type\s+)?\{([^}]*)\}\s*from\s*["']@egov-moldova\/mud["']\s*;?/g;
  const isTypeOnly = (typeKeyword, bindings) =>
    Boolean(typeKeyword) ||
    bindings
      .split(',')
      .map(binding => binding.trim())
      .filter(Boolean)
      .every(binding => /^type\s/.test(binding));

  it('names only the standalone runtime, never the lazy loader (#180)', () => {
    const files = walk(REACT_SRC);
    assert.ok(files.length > 0, 'packages/react/src holds no .ts/.tsx files — the scan would grade nothing');

    const lazy = [];
    for (const file of files) {
      const source = fs
        .readFileSync(file, 'utf8')
        .replace(ROOT_IMPORT_RE, (statement, typeKeyword, bindings) =>
          isTypeOnly(typeKeyword, bindings) ? '' : statement,
        );
      for (const [, specifier] of source.matchAll(SPECIFIER_RE)) {
        if (!STANDALONE_RE.test(specifier)) lazy.push(`${path.relative(PROJECT_ROOT, file)}: ${specifier}`);
      }
    }
    assert.deepEqual(lazy, []);
  });
});

describe('no adapter build masks a failure (#180)', () => {
  // A `build` that swallows its exit status turns `yarn build.<adapter>`, the CI step and
  // the audit's `adapter-*` rows into checks that cannot fail. Masking idioms cannot be
  // enumerated (`|| true`, `|| echo`, `; exit 0`, `; next-command`), so the positive shape is
  // asserted instead: commands chained by `&&` only. A legitimate `||` needs an explicit
  // exception here.
  // Each `&&` segment must hold no other shell control operator: `;`, `|` (also `||`), `&`, newline.
  const propagates = build => build.split('&&').every(segment => !/[;|&\n]/.test(segment));
  const PACKAGES = path.join(PROJECT_ROOT, 'packages');

  it('every packages/*/package.json build script propagates its exit status', () => {
    const masked = fs
      .readdirSync(PACKAGES, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && fs.existsSync(path.join(PACKAGES, entry.name, 'package.json')))
      .map(entry => [
        entry.name,
        JSON.parse(fs.readFileSync(path.join(PACKAGES, entry.name, 'package.json'), 'utf8')).scripts?.build,
      ])
      .filter(([, build]) => typeof build === 'string' && !propagates(build))
      .map(([name, build]) => `packages/${name}: ${build}`);
    assert.deepEqual(masked, []);
  });
});

describe('every adapter compiles in strict mode (#180)', () => {
  const PACKAGES = path.join(PROJECT_ROOT, 'packages');
  // The compiler's own list, so a flag a TypeScript upgrade adds to `strict` is covered
  // without editing this spec (5.9.3: nine flags, incl. `noImplicitThis`,
  // `strictBuiltinIteratorReturn`). `optionDeclarations` is not in the public typings but is
  // exported at runtime; the guard below fails loudly if an upgrade removes it.
  const STRICT_FAMILY = (ts.optionDeclarations ?? []).filter(option => option.strictFlag).map(option => option.name);
  assert.ok(STRICT_FAMILY.length >= 9, `typescript exposes ${STRICT_FAMILY.length} strict flags; expected at least 9`);

  // The EFFECTIVE options, `extends` resolved: `tsconfig.react19.json` declares no `strict` of
  // its own and a base turning a flag off would otherwise be invisible. The unrecoverable
  // diagnostic throws, so a config the compiler cannot read fails here, not as a silent pass.
  const readEffectiveOptions = file =>
    ts.getParsedCommandLineOfConfigFile(
      file,
      {},
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: diagnostic => {
          throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        },
      },
    ).options;
  // Every `packages/<name>/tsconfig*.json`, not just `tsconfig.json`: a build can compile with
  // `tsc -p <other config>`.
  const adapterConfigs = fs
    .readdirSync(PACKAGES, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry =>
      fs
        .readdirSync(path.join(PACKAGES, entry.name))
        .filter(name => /^tsconfig(\..+)?\.json$/.test(name))
        .map(name => path.join(PACKAGES, entry.name, name)),
    );

  it('every packages/*/tsconfig*.json sets strict and turns no strict-family flag back off', () => {
    // One config per workspace package, so a deleted or renamed `tsconfig.json` cannot leave a
    // package ungraded while another file keeps the total the same.
    const ungraded = fs
      .readdirSync(PACKAGES, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && fs.existsSync(path.join(PACKAGES, entry.name, 'package.json')))
      .filter(entry => !adapterConfigs.includes(path.join(PACKAGES, entry.name, 'tsconfig.json')))
      .map(entry => `packages/${entry.name}`);
    assert.deepEqual(ungraded, []);
    const lax = adapterConfigs.flatMap(file => {
      const options = readEffectiveOptions(file);
      // `noCheck: true` skips type checking while `tsc` still exits 0.
      const off = [
        ...STRICT_FAMILY.filter(flag => options[flag] === false),
        ...(options.noCheck === true ? ['noCheck'] : []),
      ];
      return options.strict === true && off.length === 0
        ? []
        : [`${path.relative(PROJECT_ROOT, file)}: strict=${options.strict} off=[${off.join(', ')}]`];
    });
    assert.deepEqual(lax, []);
  });

  it('the React build runs a program that resolves `react` to the React 19 types', () => {
    const react = path.join(PACKAGES, 'react');
    const build = JSON.parse(fs.readFileSync(path.join(react, 'package.json'), 'utf8')).scripts?.build ?? '';
    // Whole `&&` segments, so `echo tsc -p …` or `tsc -p … || true` cannot satisfy it (the
    // masked-build spec above already rejects any non-`&&` operator).
    const commands = build.split('&&').map(command => command.trim());
    assert.ok(commands.includes('tsc'), 'the React build no longer runs the base `tsc` program');
    assert.ok(commands.includes('tsc -p tsconfig.react19.json'), 'the React build no longer runs the React 19 program');
    // A `paths` target that does not exist makes TypeScript fall back to the React 18 types
    // without a diagnostic, so the second `tsc` would pass while checking nothing new. Both
    // mappings matter: `react/*` carries `react/jsx-runtime`, which `jsx: react-jsx` imports.
    const options = readEffectiveOptions(path.join(react, 'tsconfig.react19.json'));
    for (const key of ['react', 'react/*']) {
      const target = options.paths?.[key]?.[0]?.replace(/\/\*$/, '');
      assert.ok(target, `tsconfig.react19.json maps no \`${key}\` path`);
      const manifest = path.join(options.pathsBasePath ?? react, target, 'package.json');
      assert.ok(
        fs.existsSync(manifest),
        `paths["${key}"] → ${target} holds no package.json; TypeScript falls back to React 18`,
      );
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      assert.equal(pkg.name, '@types/react');
      assert.match(pkg.version, /^19\./);
    }
  });
});
