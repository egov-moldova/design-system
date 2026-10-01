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
});

describe('setupMud', () => {
  for (const assetPath of ['', undefined, null, 42]) {
    it(`throws on assetPath ${JSON.stringify(assetPath)}`, () => {
      assert.throws(
        () => setupMud({ assetPath }),
        /\[mud-react\] `setupMud\(\{ assetPath \}\)` needs a non-empty `assetPath`/,
      );
    });
  }
  it('throws when called with no options', () => {
    assert.throws(() => setupMud(undefined), /needs a non-empty `assetPath`/);
  });
  it('is a no-op without a document (server render)', () => {
    assert.equal(setupMud({ assetPath: 'mud/' }), undefined);
  });
});

describe('defineCustomElements (deprecated alias)', () => {
  it('resolves without a document and without options', async () => {
    assert.equal(await defineCustomElements(), undefined);
  });
});
