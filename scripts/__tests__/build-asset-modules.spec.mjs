import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

import { danglingReferences, forbiddenIn, toModuleSource, transformSvg } from '../assets/build-asset-modules.mjs';

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

describe('forbiddenIn', () => {
  const after = svg => forbiddenIn(transformSvg(svg, { kind: 'flag', key: 'xx' }));
  const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3">${body}</svg>`;

  it('passes a plain drawing with local references', () => {
    assert.deepEqual(
      after(wrap('<defs><linearGradient id="g"/></defs><path fill="url(#g)" d="M0 0h1"/><use href="#g"/>')),
      [],
    );
  });

  // Each of these survived the transform in a probe of the generator; the check is what refuses it.
  for (const [name, body, reason] of [
    [
      'an animation retargeting an href',
      '<g><animate attributeName="href" to="https://evil.test/x.svg#a"/></g>',
      'an element that loads, navigates or retargets a reference',
    ],
    [
      'a <set> retargeting an href',
      '<use href="#x"><set attributeName="href" to="https://evil.test/x"/></use>',
      'an element that loads, navigates or retargets a reference',
    ],
    ['an external paint server', '<path fill="url(https://evil.test/x.svg#a)" d="M0 0h1"/>', 'a url() out of the file'],
    ['a protocol-relative filter', '<path filter="url(//evil.test/f.svg#f)" d="M0 0h1"/>', 'a url() out of the file'],
    [
      'an external url moved out of a style attribute',
      '<path style="fill:url(https://evil.test/x)" d="M0 0h1"/>',
      'a url() out of the file',
    ],
    [
      'a foreignObject',
      '<foreignObject width="1" height="1"><div/></foreignObject>',
      'an element that loads, navigates or retargets a reference',
    ],
    ['an image', '<image width="1" height="1"/>', 'an element that loads, navigates or retargets a reference'],
    [
      'a CSS-escaped url() in a presentation attribute',
      '<rect fill="u\\72l(https://evil.test/x.svg#a)" width="1" height="1"/>',
      'a backslash escape in an attribute value',
    ],
  ]) {
    it(`refuses ${name}`, () => {
      assert.ok(after(wrap(body)).includes(reason), `${name}: ${JSON.stringify(after(wrap(body)))}`);
    });
  }

  // One case per element, each alone, so dropping any name from the pattern fails its own case.
  for (const tag of [
    'animate',
    'animateMotion',
    'animateTransform',
    'set',
    'foreignObject',
    'image',
    'a',
    'iframe',
    'object',
    'embed',
  ]) {
    it(`refuses <${tag}> on its own`, () => {
      assert.deepEqual(forbiddenIn(wrap(`<g><${tag}/></g>`)), [
        'an element that loads, navigates or retargets a reference',
      ]);
    });
  }

  it('accepts a local url() with a space before the fragment, and an element whose name only starts like one', () => {
    assert.deepEqual(forbiddenIn(wrap('<path fill="url( #g)" d="M0 0h1"/><altGlyph/>')), []);
    assert.deepEqual(forbiddenIn(wrap(`<path fill="url('#g')" d="M0 0h1"/>`)), []);
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
