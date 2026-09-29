import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { compareVersions, nextVersion, parseVersion, setVersion } from '../version-bump.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../version-bump.mjs');

describe('version-bump: nextVersion', () => {
  const cases = [
    ['1.2.0-dev.1', 'dev', '1.2.0-dev.2'],
    ['1.2.0', 'dev', '1.2.1-dev.1'],
    ['1.2.0-dev.2', 'patch', '1.2.0'],
    ['1.2.0', 'patch', '1.2.1'],
    ['1.3.0-dev.2', 'minor', '1.3.0'],
    ['1.2.1-dev.2', 'minor', '1.3.0'],
    ['1.2.0', 'minor', '1.3.0'],
    ['2.0.0-dev.2', 'major', '2.0.0'],
    ['1.2.0-dev.2', 'major', '2.0.0'],
    ['1.2.0', 'major', '2.0.0'],
    ['1.2.0-dev.9', 'dev', '1.2.0-dev.10'],
  ];
  for (const [current, target, expected] of cases) {
    it(`${current} + ${target} → ${expected}`, () => {
      assert.equal(nextVersion(current, target), expected);
    });
  }

  it('sets an exact version higher than the current one', () => {
    assert.equal(nextVersion('1.2.0-dev.1', '1.3.0-dev.1'), '1.3.0-dev.1');
    assert.equal(nextVersion('1.2.0-dev.1', '1.2.0'), '1.2.0');
  });

  it('refuses an exact version that is not higher', () => {
    assert.throws(() => nextVersion('1.2.0-dev.2', '1.2.0-dev.1'), /not higher than the current 1\.2\.0-dev\.2/);
    assert.throws(() => nextVersion('1.2.0', '1.2.0'), /not higher/);
    assert.throws(() => nextVersion('1.2.0', '1.2.0-dev.5'), /not higher/);
  });

  it('refuses a target that is neither a strategy nor a version', () => {
    assert.throws(() => nextVersion('1.2.0', 'prerelease'), /neither dev, patch, minor, major nor a version/);
    assert.throws(() => nextVersion('1.2.0', '1.3.0-beta.1'), /neither/);
  });

  it('has no next step from the old placeholder, but takes an exact version', () => {
    assert.throws(() => nextVersion('0.0.0-development', 'dev'), /carries "0\.0\.0-development"/);
    assert.equal(nextVersion('0.0.0-development', '1.2.0-dev.1'), '1.2.0-dev.1');
  });
});

describe('version-bump: compareVersions', () => {
  it('orders cores numerically, then a release after its prereleases', () => {
    const sorted = ['1.10.0', '1.2.0', '1.2.0-dev.10', '1.2.0-dev.2', '0.9.9'].sort(compareVersions);
    assert.deepEqual(sorted, ['0.9.9', '1.2.0-dev.2', '1.2.0-dev.10', '1.2.0', '1.10.0']);
  });

  it('parses only the published scheme', () => {
    assert.deepEqual(parseVersion('1.2.3-dev.4'), { major: 1, minor: 2, patch: 3, dev: 4 });
    assert.deepEqual(parseVersion('1.2.3'), { major: 1, minor: 2, patch: 3, dev: null });
    assert.equal(parseVersion('1.2.3-rc.1'), null);
    assert.equal(parseVersion('v1.2.3'), null);
  });
});

describe('version-bump: setVersion', () => {
  it('replaces only the version line', () => {
    const text = '{\n  "name": "@egov-moldova/mud",\n  "version": "1.2.0-dev.1",\n  "type": "module"\n}\n';
    assert.equal(
      setVersion(text, '1.2.0-dev.1', '1.2.0-dev.2'),
      '{\n  "name": "@egov-moldova/mud",\n  "version": "1.2.0-dev.2",\n  "type": "module"\n}\n',
    );
  });
});

describe('version-bump: CLI', () => {
  const PACKAGE = '{\n  "name": "fixture",\n  "version": "1.2.0-dev.1",\n  "scripts": {}\n}\n';
  const setup = () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'version-bump-'));
    fs.writeFileSync(path.join(root, 'package.json'), PACKAGE);
    return root;
  };
  const run = (root, ...args) => spawnSync(process.execPath, [SCRIPT, ...args, '--root', root], { encoding: 'utf8' });
  const version = root => JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

  it('writes the next version', () => {
    const root = setup();
    const result = run(root, 'dev');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /1\.2\.0-dev\.1 → 1\.2\.0-dev\.2/);
    assert.equal(version(root), '1.2.0-dev.2');
  });

  it('writes nothing on --dry-run', () => {
    const root = setup();
    const result = run(root, 'minor', '--dry-run');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /→ 1\.2\.0 \(dry run, not written\)/);
    assert.equal(fs.readFileSync(path.join(root, 'package.json'), 'utf8'), PACKAGE);
  });

  it('reminds to cut the changelog for a release version only', () => {
    const release = run(setup(), 'patch');
    assert.match(release.stdout, /yarn changelog\.release 1\.2\.0/);
    const dev = run(setup(), 'dev');
    assert.doesNotMatch(dev.stdout, /changelog/);
  });

  it('exits 1 on invalid input and leaves package.json alone', () => {
    const root = setup();
    const lower = run(root, '1.1.0');
    assert.equal(lower.status, 1);
    assert.match(lower.stderr, /not higher/);
    assert.equal(run(root).status, 1);
    assert.equal(run(root, 'dev', '--force').status, 1);
    assert.equal(fs.readFileSync(path.join(root, 'package.json'), 'utf8'), PACKAGE);
  });
});
