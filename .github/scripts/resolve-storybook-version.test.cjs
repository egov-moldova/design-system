const assert = require('node:assert/strict');
const test = require('node:test');

const { resolveStorybookVersion } = require('./resolve-storybook-version.cjs');

const stableSha = '0123456789abcdef0123456789abcdef01234567';
const metadata = {
  'dist-tags': { latest: '1.2.3' },
  'versions': {
    '1.2.2': { gitHead: 'abcdef0123456789abcdef0123456789abcdef01' },
    '1.2.3': { gitHead: stableSha },
    '1.2.4-dev.1': {},
  },
};

test('defaults to the stable latest dist-tag', () => {
  assert.deepEqual(resolveStorybookVersion(metadata, ''), {
    version: '1.2.3',
    sourceSha: stableSha,
    shortSha: stableSha.slice(0, 12),
  });
});

test('accepts an exact published version', () => {
  assert.equal(resolveStorybookVersion(metadata, '1.2.2').version, '1.2.2');
});

test('rejects an unknown version before the image build', () => {
  assert.throws(() => resolveStorybookVersion(metadata, '9.9.9'), /does not exist in the npm registry/);
});

test('rejects a package without an immutable source commit', () => {
  assert.throws(() => resolveStorybookVersion(metadata, '1.2.4-dev.1'), /has no valid gitHead/);
});
