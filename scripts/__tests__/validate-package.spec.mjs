import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkAbsolutePaths,
  checkBundleAssets,
  checkDeclaredEntries,
  checkDevSignature,
  checkForbiddenPaths,
  checkPackerAgreement,
  checkSourceMaps,
  collectDeclaredEntries,
  lazyBundleDir,
  normalizePackagePath,
  standaloneBundleDir,
} from '../validate-package.mjs';

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
    './dist/mud/mud.css': './dist/mud/mud.css',
    './dist/mud/tokens/*.css': './dist/mud/tokens/*.css',
    './dist/components': {
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
    assert.ok(sources.includes('$.exports[./dist/components][types]'));
  });

  it('collects a plain-string exports leaf, not only condition objects', () => {
    const entry = collectDeclaredEntries(PKG).find(candidate => candidate.source === '$.exports[./dist/mud/mud.css]');
    assert.deepEqual(entry, {
      source: '$.exports[./dist/mud/mud.css]',
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

describe('checkBundleAssets', () => {
  it('flags a standalone bundle shipped without the assets the lazy one has', () => {
    const packed = ['dist/mud/assets/icon.svg', 'dist/components/index.js'];
    assert.deepEqual(checkBundleAssets(packed, 'dist/mud/', 'dist/components/'), [
      'dist/components/assets/ is empty while dist/mud/assets/ carries 1 file(s)',
    ]);
  });

  it('passes when both carry assets', () => {
    const packed = ['dist/mud/assets/icon.svg', 'dist/components/assets/icon.svg'];
    assert.deepEqual(checkBundleAssets(packed, 'dist/mud/', 'dist/components/'), []);
  });

  it('is silent when the package has no assets at all', () => {
    assert.deepEqual(checkBundleAssets(['dist/mud/mud.esm.js'], 'dist/mud/', 'dist/components/'), []);
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

  it('reads a non-.js entrypoint as out of scope', () => {
    const packed = ['dist/index.d.ts'];
    const contents = { 'dist/index.d.ts': 'isDev: true' };
    assert.deepEqual(checkDevSignature(packed, file => contents[file]), []);
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
