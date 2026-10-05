import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

import { danglingReferences, toModuleSource, transformSvg } from '../assets/build-asset-modules.mjs';

describe('transformSvg', () => {
  it('strips scripts, event handlers and external references', () => {
    const out = transformSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"><script>x()</script><a href="https://evil.test"><path d="M0 0h1"/></a><use href="#a"/></svg>',
      { kind: 'icon', key: 'outlined/x' },
    );
    assert.doesNotMatch(out, /<script|onload|https:\/\/evil/);
    assert.match(out, /href="#mud-icon-outlined-x-/); // a local fragment survives, prefixed
  });
  it('prefixes every id and every reference to it with the asset key', () => {
    const out = transformSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><path fill="url(#g)" d="M0 0h1"/></svg>',
      { kind: 'flag', key: 'md' },
    );
    assert.match(out, /id="mud-flag-md-g"/);
    assert.match(out, /url\(#mud-flag-md-g\)/);
  });
  it('marks the root with its asset key', () => {
    assert.match(
      transformSvg('<svg xmlns="http://www.w3.org/2000/svg"/>', { kind: 'logo', key: 'mpass-logo-with-name' }),
      /data-mud-asset="logo:mpass-logo-with-name"/,
    );
  });
  it('makes a flag cover its box like object-fit: cover', () => {
    assert.match(
      transformSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"/>', { kind: 'flag', key: 'ro' }),
      /preserveAspectRatio="xMidYMid slice"/,
    );
  });
  it('leaves no style attribute, so a strict style-src-attr CSP allows the inline drawing', () => {
    const a = transformSvg('<svg xmlns="http://www.w3.org/2000/svg"><path style="fill:#fff" d="M0 0h1"/></svg>', {
      kind: 'flag',
      key: 'ro',
    });
    assert.doesNotMatch(a, /style=/);
    assert.match(a, /fill="#fff"/);
    // `marker` is outside SVGO's presentation-attribute set, so convertStyleToAttrs keeps it (bo.svg).
    const b = transformSvg('<svg xmlns="http://www.w3.org/2000/svg"><path style="marker:none" d="M0 0h1"/></svg>', {
      kind: 'flag',
      key: 'bo',
    });
    assert.doesNotMatch(b, /style=/);
  });
});

describe('toModuleSource', () => {
  it('emits one default-exported string, typed string so the declaration does not repeat the drawing', () => {
    assert.equal(toModuleSource('<svg a="1"/>'), 'const svg: string = \'<svg a="1"/>\';\nexport default svg;\n');
  });
});

describe('danglingReferences', () => {
  it('finds url(#…) and href="#…" references with no matching id', () => {
    assert.deepEqual(
      danglingReferences(
        '<svg><path id="a"/><path fill="url(#a)"/><path fill="url(#b)"/><path mask="url(\'#c\')"/><use href="#d"/><use xlink:href="#a"/></svg>',
      ),
      ['b', 'c', 'd'],
    );
  });
  it('passes a drawing whose every reference is defined', () => {
    assert.deepEqual(danglingReferences('<svg><linearGradient id="g"/><path fill="url(#g)"/></svg>'), []);
  });
});

describe('committed output', () => {
  it('src/generated matches what the generator would write', () => {
    const run = spawnSync(process.execPath, ['scripts/assets/build-asset-modules.mjs', '--check'], {
      encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stdout + run.stderr);
  });
});
