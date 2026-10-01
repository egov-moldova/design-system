// packages/react/src/setup.ts, run under Node's native type stripping. Node has no
// `document`, so this is also the server-render path of `setupMud`.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { defineCustomElements, setupMud, toAssetBaseUrl } from '../../packages/react/src/setup.ts';

describe('toAssetBaseUrl', () => {
  it('resolves a relative path against the base and adds the trailing slash', () => {
    assert.equal(toAssetBaseUrl('mud', 'https://app.test/base/page'), 'https://app.test/base/mud/');
  });
  it('keeps a relative path that already ends in a slash', () => {
    assert.equal(toAssetBaseUrl('mud/', 'https://app.test/base/'), 'https://app.test/base/mud/');
  });
  it('passes an absolute URL through', () => {
    const cdn = 'https://cdn.test/@egov-moldova/mud/dist/components/';
    assert.equal(toAssetBaseUrl(cdn, 'https://app.test/'), cdn);
  });
  it('resolves a root-relative path against the origin', () => {
    assert.equal(toAssetBaseUrl('/static/mud', 'https://app.test/a/b'), 'https://app.test/static/mud/');
  });
  it('names the path and the base when the base is opaque', () => {
    assert.throws(
      () => toAssetBaseUrl('mud/', 'about:blank'),
      /\[mud-react\] cannot resolve assetPath "mud\/" against the document base "about:blank"/,
    );
  });
});

describe('toAssetBaseUrl on a malformed absolute path', () => {
  it('keeps the original error text so the cause is not blamed on the base', () => {
    assert.throws(
      () => toAssetBaseUrl('https://', 'https://app.test/'),
      /well-formed absolute URL \(TypeError: Invalid URL\)/,
    );
  });
});

describe('setupMud', () => {
  for (const assetPath of ['', '   ', undefined, null, 42]) {
    it(`throws on assetPath ${JSON.stringify(assetPath)}`, () => {
      assert.throws(
        () => setupMud({ assetPath }),
        /\[mud-react\] `setupMud\(\{ assetPath \}\)` needs a non-blank `assetPath`/,
      );
    });
  }
  it('throws when called with no options', () => {
    assert.throws(() => setupMud(undefined), /needs a non-blank `assetPath`/);
  });
  it('is a no-op without a document (server render)', () => {
    assert.equal(setupMud({ assetPath: 'mud/' }), undefined);
  });
});

describe('defineCustomElements (deprecated alias)', () => {
  it('resolves without a document and without options', async () => {
    assert.equal(await defineCustomElements(), undefined);
  });
  it('treats a null assetPath as no override, like the old `??` did', async () => {
    assert.equal(await defineCustomElements({ assetPath: null }), undefined);
  });
  it('rejects an empty assetPath without a document, like the browser does', () => {
    assert.throws(() => defineCustomElements({ assetPath: '' }), /needs a non-blank `assetPath`/);
  });
});
