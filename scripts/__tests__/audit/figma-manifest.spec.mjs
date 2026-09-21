/**
 * Tests for scripts/audit/lib/figma-manifest.mjs — the Figma state manifest
 * shared by 11-pixel-diff-states, 15-style-parity and figma-refs.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  expectedStyles,
  headManifestRelPath,
  isDesignNone,
  isPixelState,
  listOverrides,
  loadManifest,
  manifestPathFor,
  normalizeNodeId,
  referenceFileName,
  resolveHeadManifest,
  resolveState,
  validateManifest,
} from '../../audit/lib/figma-manifest.mjs';

function manifest(states, extra = {}) {
  return {
    figma: { fileKey: 'abc123', scale: 2 },
    defaults: { story: 'molecules-date-picker--default' },
    states,
    ...extra,
  };
}

describe('figma-manifest: validateManifest', () => {
  it('accepts a minimal valid manifest', () => {
    assert.deepEqual(validateManifest(manifest([{ name: 'default', node: '157:4570' }])), []);
  });

  it('requires a non-empty states array', () => {
    assert.match(validateManifest({ states: [] })[0], /non-empty array/);
    assert.match(validateManifest([])[0], /JSON object/);
  });

  it('requires kebab-case, unique state names', () => {
    const errors = validateManifest(manifest([{ name: 'Default' }, { name: 'a' }, { name: 'a' }]));
    assert.ok(errors.some(e => /kebab-case/.test(e)));
    assert.ok(errors.some(e => /duplicated/.test(e)));
  });

  it('requires a story from the state or the defaults', () => {
    const errors = validateManifest({ figma: { fileKey: 'k' }, states: [{ name: 'a' }] });
    assert.ok(errors.some(e => /needs a story/.test(e)));
  });

  it('rejects malformed node ids, story ids, clocks and bleeds', () => {
    const errors = validateManifest(
      manifest([
        {
          name: 'a',
          node: 'I158:570;226:4608',
          story: 'Molecules/Date Picker',
          clock: 'yesterday',
          capture: { bleed: -1 },
        },
      ]),
    );
    assert.ok(errors.some(e => /\.node must be a Figma node id/.test(e)));
    assert.ok(errors.some(e => /\.story must be a Storybook story id/.test(e)));
    assert.ok(errors.some(e => /\.clock must be an ISO/.test(e)));
    assert.ok(errors.some(e => /\.bleed must be "auto"/.test(e)));
  });

  it('needs figma.fileKey when a state names a node', () => {
    const errors = validateManifest({ defaults: { story: 'a--b' }, states: [{ name: 'a', node: '1:2' }] });
    assert.ok(errors.some(e => /needs figma.fileKey/.test(e)));
  });

  it('validates single and multi-step interactions', () => {
    assert.deepEqual(
      validateManifest(
        manifest([
          { name: 'a', interaction: { type: 'hover', target: 'mud-x' } },
          {
            name: 'b',
            interaction: [
              { type: 'click', target: 'mud-x .t' },
              { type: 'focus', target: 'mud-x .c' },
            ],
          },
        ]),
      ),
      [],
    );
    const errors = validateManifest(manifest([{ name: 'a', interaction: [{ type: 'drag', target: '' }] }]));
    assert.ok(errors.some(e => /interaction\[0\]\.type/.test(e)));
    assert.ok(errors.some(e => /interaction\[0\]\.target/.test(e)));
  });

  it('requires every expectation to cite a Figma node', () => {
    const errors = validateManifest(
      manifest([{ name: 'a', expect: [{ target: 'mud-x', styles: { color: '#000' } }] }]),
    );
    assert.ok(errors.some(e => /must cite a Figma node/.test(e)));
    assert.deepEqual(
      validateManifest(
        manifest([{ name: 'a', node: '1:2', expect: [{ target: 'mud-x', styles: { color: '#000' } }] }]),
      ),
      [],
    );
  });

  it('accepts absent entries without styles and rejects mixing the two', () => {
    assert.deepEqual(
      validateManifest(manifest([{ name: 'a', node: '1:2', expect: [{ target: 'mud-x .footer', absent: true }] }])),
      [],
    );
    const errors = validateManifest(
      manifest([{ name: 'a', node: '1:2', expect: [{ target: 'mud-x', absent: true, styles: { color: '#000' } }] }]),
    );
    assert.ok(errors.some(e => /both absent and styles/.test(e)));
  });

  it('requires string style values', () => {
    const errors = validateManifest(
      manifest([{ name: 'a', node: '1:2', expect: [{ target: 'x', styles: { width: 12 } }] }]),
    );
    assert.ok(errors.some(e => /styles\.width must be a string/.test(e)));
  });
});

describe('figma-manifest: resolveState', () => {
  it('merges defaults and normalises interactions and node ids', () => {
    const m = manifest(
      [
        {
          name: 'hover',
          node: '489-9029',
          interaction: { type: 'hover', target: 'mud-x .c' },
          expect: [{ target: 'mud-x', styles: { color: '#000' } }],
        },
      ],
      { defaults: { story: 'a--b', clock: '2025-01-07T10:00:00Z', capture: { bleed: 0 } } },
    );
    const s = resolveState(m, m.states[0], 'mud-x');
    assert.equal(s.node, '489:9029');
    assert.equal(s.story, 'a--b');
    assert.equal(s.clock, '2025-01-07T10:00:00Z');
    assert.equal(s.theme, 'light');
    assert.deepEqual(s.capture, { selector: 'mud-x', bleed: 0 });
    assert.deepEqual(s.interactions, [{ type: 'hover', target: 'mud-x .c' }]);
    assert.equal(s.expect[0].node, '489:9029');
    assert.deepEqual(s.viewport, { width: 1280, height: 900 });
  });

  it('defaults capture bleed to auto', () => {
    const m = manifest([{ name: 'a' }]);
    assert.equal(resolveState(m, m.states[0], 'mud-x').capture.bleed, 'auto');
  });
});

describe('figma-manifest: helpers', () => {
  it('isPixelState needs a node and no pixel:false', () => {
    assert.equal(isPixelState({ name: 'a', node: '1:2' }), true);
    assert.equal(isPixelState({ name: 'a', node: '1:2', pixel: false }), false);
    assert.equal(isPixelState({ name: 'a' }), false);
  });

  it('normalizeNodeId converts the URL form', () => {
    assert.equal(normalizeNodeId('158-401'), '158:401');
    assert.equal(normalizeNodeId('158:401'), '158:401');
  });

  it('referenceFileName is <state>.png', () => {
    assert.equal(referenceFileName({ name: 'month-picker' }), 'month-picker.png');
  });

  it('manifestPathFor points at the component test folder', () => {
    assert.match(manifestPathFor('mud-x'), /src[/\\]components[/\\]mud-x[/\\]test[/\\]mud-x\.figma\.json$/);
  });

  it('loadManifest reports a missing file', () => {
    const { manifest: m, errors } = loadManifest('/nonexistent/mud-x.figma.json');
    assert.equal(m, null);
    assert.match(errors[0], /not found/);
  });
});

describe('figma-manifest: committed manifests', () => {
  it('mud-date-picker manifest is valid', () => {
    const { manifest: m, errors } = loadManifest(manifestPathFor('mud-date-picker'));
    assert.ok(m, 'manifest should load');
    assert.deepEqual(errors, []);
  });
});

describe('figma-manifest: shared blocks', () => {
  const shared = { 'cell-base': [{ target: 'mud-x .cell', styles: { borderRadius: '6px' } }] };

  it('expands a use entry into the shared expectations, citing the state node', () => {
    const m = manifest([{ name: 'hover', node: '1:2', expect: [{ use: 'cell-base' }] }], { shared });
    assert.deepEqual(validateManifest(m), []);
    assert.deepEqual(resolveState(m, m.states[0], 'mud-x').expect, [
      { target: 'mud-x .cell', styles: { borderRadius: '6px' }, node: '1:2' },
    ]);
  });

  it('rejects an unknown key and a use entry with other fields', () => {
    const errors = validateManifest(
      manifest([{ name: 'a', node: '1:2', expect: [{ use: 'nope' }, { use: 'cell-base', target: 'x' }] }], { shared }),
    );
    assert.ok(errors.some(e => /use "nope" names no shared block/.test(e)));
    assert.ok(errors.some(e => /a use entry cannot carry other fields/.test(e)));
  });

  it('validates shared entries with the state that uses them', () => {
    const bad = { broken: [{ target: 'mud-x .cell', styles: {} }] };
    const errors = validateManifest(
      manifest([{ name: 'a', node: '1:2', expect: [{ use: 'broken' }] }], { shared: bad }),
    );
    assert.ok(errors.some(e => /styles must be a non-empty object/.test(e)));
  });
});

describe('figma-manifest: mask', () => {
  it('resolves state mask over defaults mask, empty by default', () => {
    const m = manifest(
      [
        { name: 'a', node: '1:2', mask: ['mud-x .date'] },
        { name: 'b', node: '1:3' },
      ],
      {
        defaults: { story: 'molecules-date-picker--default', mask: ['mud-x .avatar'] },
      },
    );
    assert.deepEqual(validateManifest(m), []);
    assert.deepEqual(resolveState(m, m.states[0], 'mud-x').mask, ['mud-x .date']);
    assert.deepEqual(resolveState(m, m.states[1], 'mud-x').mask, ['mud-x .avatar']);
    assert.deepEqual(
      resolveState(manifest([{ name: 'c', node: '1:4' }]), { name: 'c', node: '1:4' }, 'mud-x').mask,
      [],
    );
  });

  it('rejects a mask that is not a list of selectors', () => {
    const errors = validateManifest(manifest([{ name: 'a', node: '1:2', mask: 'mud-x .date' }]));
    assert.ok(errors.some(e => /mask must be an array of selectors/.test(e)));
    const empty = validateManifest(manifest([{ name: 'a', node: '1:2', mask: [''] }]));
    assert.ok(empty.some(e => /mask must be an array of selectors/.test(e)));
  });

  it('lets a state opt out of the defaults mask with an empty list', () => {
    const m = manifest([{ name: 'a', node: '1:2', mask: [] }], {
      defaults: { story: 'molecules-date-picker--default', mask: ['mud-x .day-cell'] },
    });
    assert.deepEqual(validateManifest(m), []);
    assert.deepEqual(resolveState(m, m.states[0], 'mud-x').mask, []);
  });
});

describe('figma-manifest: figma.skip', () => {
  it('accepts node + reason and rejects a missing reason', () => {
    assert.deepEqual(
      validateManifest(
        manifest([{ name: 'a', node: '1:2' }], {
          figma: { fileKey: 'abc123', skip: [{ node: '9:9', reason: 'Size=XL is not implemented' }] },
        }),
      ),
      [],
    );
    const errors = validateManifest(
      manifest([{ name: 'a', node: '1:2' }], { figma: { fileKey: 'abc123', skip: [{ node: '9:9' }] } }),
    );
    assert.ok(errors.some(e => /figma.skip\[0\] needs a node id and a reason/.test(e)));
  });
});

describe('figma-manifest: figma.design "none"', () => {
  const none = { figma: { design: 'none', reason: 'internal utility, no design', decidedBy: 'Dan' } };

  it('accepts design "none" with a reason and decidedBy, and no fileKey and no states', () => {
    assert.deepEqual(validateManifest(none), []);
    assert.equal(isDesignNone(none), true);
  });

  it('rejects it without a reason or decidedBy, or with a fileKey or states', () => {
    assert.ok(validateManifest({ figma: { design: 'none', decidedBy: 'Dan' } }).some(e => /needs a reason/.test(e)));
    assert.ok(validateManifest({ figma: { design: 'none', reason: 'r' } }).some(e => /needs decidedBy/.test(e)));
    assert.ok(
      validateManifest({ figma: { ...none.figma, fileKey: 'abc' } }).some(e => /cannot carry a fileKey/.test(e)),
    );
    assert.ok(
      validateManifest({ ...none, states: [{ name: 'a', node: '1:2' }] }).some(e => /cannot carry states/.test(e)),
    );
    assert.ok(validateManifest({ figma: { design: 'maybe', reason: 'r', decidedBy: 'd' } }).length > 0);
  });

  it('still requires fileKey and states for a regular manifest', () => {
    assert.ok(validateManifest({ figma: { scale: 2 } }).some(e => /fileKey/.test(e)));
  });
});

describe('figma-manifest: expect[].override (Figma corrections)', () => {
  const withOverride = override =>
    manifest([
      {
        name: 'a',
        node: '1:2',
        expect: [{ target: 'mud-x', styles: { color: '#000000' }, ...(override ? { override } : {}) }],
      },
    ]);
  const ok = { value: '#111111', reason: 'Figma typo', decidedBy: 'Dan' };

  it('accepts an override with value, reason and decidedBy on a one-property entry', () => {
    assert.deepEqual(validateManifest(withOverride(ok)), []);
  });

  it('rejects an override without a reason or decidedBy, or on an entry with several properties', () => {
    assert.ok(
      validateManifest(withOverride({ value: '#1', decidedBy: 'Dan' })).some(e => /override needs a reason/.test(e)),
    );
    assert.ok(
      validateManifest(withOverride({ value: '#1', reason: 'r' })).some(e => /override needs decidedBy/.test(e)),
    );
    const two = manifest([
      { name: 'a', node: '1:2', expect: [{ target: 'x', styles: { color: '#0', width: '1px' }, override: ok }] },
    ]);
    assert.ok(validateManifest(two).some(e => /exactly one property/.test(e)));
  });

  it('expectedStyles checks the override value instead of the Figma one', () => {
    assert.deepEqual(expectedStyles({ styles: { color: '#000000' }, override: ok }), { color: '#111111' });
    assert.deepEqual(expectedStyles({ styles: { color: '#000000' } }), { color: '#000000' });
  });

  it('listOverrides names where, target, property, the Figma value and the correction', () => {
    assert.deepEqual(listOverrides(withOverride(ok)), [
      {
        where: 'a',
        target: 'mud-x',
        prop: 'color',
        figma: '#000000',
        value: '#111111',
        reason: 'Figma typo',
        decidedBy: 'Dan',
      },
    ]);
  });
});

describe('figma-manifest: resolveHeadManifest (every Figma input from HEAD)', () => {
  const REL = 'src/components/mud-x/test/mud-x.figma.json';
  const head = JSON.stringify(
    manifest([{ name: 'a', node: '1:2', expect: [{ target: 'mud-x', styles: { color: '#000000' } }] }]),
  );

  function deps({ headText, wtText }) {
    const written = new Map();
    return {
      written,
      git: args => {
        if (args[0] === 'show')
          return headText === null ? { status: 128, stdout: '' } : { status: 0, stdout: headText };
        return { status: 0, stdout: 'c0ffee\n' };
      },
      repoRoot: '/repo',
      readWorkingTree: p => (p === `/repo/${REL}` ? wtText : null),
      writeFile: (p, text) => written.set(p, text),
    };
  }

  it('writes the HEAD text to the fixed .audit-figma path and records the commit', () => {
    const d = deps({ headText: head, wtText: head });
    const r = resolveHeadManifest('mud-x', d);
    assert.equal(r.status, 'present');
    assert.equal(r.path, headManifestRelPath('mud-x'));
    assert.equal(r.path, '.audit-figma/mud-x/manifest@HEAD.json');
    assert.equal(r.commit, 'c0ffee');
    assert.equal(r.pending, false);
    assert.equal(d.written.get('/repo/.audit-figma/mud-x/manifest@HEAD.json'), head);
  });

  it('an uncommitted edit is pending and not honoured: the HEAD text is what the checks read', () => {
    const edited = head.replace('#000000', '#ffffff');
    const d = deps({ headText: head, wtText: edited });
    const r = resolveHeadManifest('mud-x', d);
    assert.equal(r.pending, true);
    assert.equal(d.written.get('/repo/.audit-figma/mud-x/manifest@HEAD.json'), head);
  });

  it('a manifest only in the working tree counts as absent', () => {
    const r = resolveHeadManifest('mud-x', deps({ headText: null, wtText: head }));
    assert.equal(r.status, 'absent');
    assert.equal(r.workingTreeOnly, true);
    assert.equal(r.path, null);
  });

  it('reads design "none" and committed overrides from HEAD', () => {
    const none = JSON.stringify({ figma: { design: 'none', reason: 'utility', decidedBy: 'Dan' } });
    const r = resolveHeadManifest('mud-x', deps({ headText: none, wtText: none }));
    assert.equal(r.status, 'design-none');
    assert.deepEqual(r.design, { reason: 'utility', decidedBy: 'Dan' });

    const withOverride = JSON.stringify(
      manifest([
        {
          name: 'a',
          node: '1:2',
          expect: [
            {
              target: 'mud-x',
              styles: { color: '#000' },
              override: { value: '#111', reason: 'typo', decidedBy: 'Dan' },
            },
          ],
        },
      ]),
    );
    assert.equal(
      resolveHeadManifest('mud-x', deps({ headText: withOverride, wtText: withOverride })).overrides.length,
      1,
    );
    // The same override only in the working tree is not honoured.
    assert.deepEqual(resolveHeadManifest('mud-x', deps({ headText: head, wtText: withOverride })).overrides, []);
  });
});
