/**
 * Smoke tests for scripts/audit/13-token-diff.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  componentRoot,
  diffTokens,
  extractComponentBlock,
  flattenDtcg,
  resolveMode,
} from '../../audit/13-token-diff.mjs';

describe('13-token-diff: componentRoot', () => {
  it("reads the component file's own root, skipping DTCG `$` metadata", () => {
    assert.equal(componentRoot({ $description: 'x', searchInput: {} }, 'search-input'), 'searchInput');
  });

  it('falls back to the bare name for an empty, null or multi-root document', () => {
    assert.equal(componentRoot(null, 'search-input'), 'search-input');
    assert.equal(componentRoot({}, 'search-input'), 'search-input');
    assert.equal(componentRoot({ a: {}, b: {} }, 'search-input'), 'search-input');
  });
});

describe('13-token-diff: extractComponentBlock', () => {
  const block = { gap: { $value: '8px', $type: 'dimension' } };

  it("keys the Figma block by the current file's camelCase root, so paths line up", () => {
    // search-input.tokens.json has the root `searchInput`; the export may name the block either way.
    assert.deepEqual(extractComponentBlock({ 'search-input': block }, 'search-input', 'searchInput'), {
      searchInput: block,
    });
    assert.deepEqual(extractComponentBlock({ components: { searchInput: block } }, 'search-input', 'searchInput'), {
      searchInput: block,
    });
  });

  it('keys the block by the bare name when no root is given', () => {
    assert.deepEqual(extractComponentBlock({ button: block }, 'button'), { button: block });
  });

  it('returns null when the export has no block under either name', () => {
    assert.equal(extractComponentBlock({ button: block }, 'search-input', 'searchInput'), null);
  });
});

describe('13-token-diff: flattenDtcg', () => {
  it('flattens DTCG tree to dotted paths', () => {
    const tree = {
      button: {
        fontSize: { $value: '{fontSize.14}', $type: 'dimension' },
        gap: { $value: '{spacing.12}', $type: 'size' },
      },
    };
    const flat = flattenDtcg(tree);
    assert.deepEqual(Object.keys(flat).sort(), ['button.fontSize', 'button.gap']);
    assert.deepEqual(flat['button.fontSize'], { value: '{fontSize.14}', type: 'dimension' });
  });

  it('ignores $-prefixed metadata keys', () => {
    const tree = {
      button: {
        $description: 'a button',
        fontSize: { $value: '14px', $type: 'dimension' },
      },
    };
    const flat = flattenDtcg(tree);
    assert.deepEqual(Object.keys(flat), ['button.fontSize']);
  });

  it('handles deeply nested trees', () => {
    const tree = {
      button: {
        primary: {
          default: {
            background: { $value: '{color.brand.500}', $type: 'color' },
          },
        },
      },
    };
    const flat = flattenDtcg(tree);
    assert.deepEqual(Object.keys(flat), ['button.primary.default.background']);
  });

  it('returns empty for non-object input', () => {
    assert.deepEqual(flattenDtcg(null), {});
    assert.deepEqual(flattenDtcg(42), {});
  });
});

describe('13-token-diff: diffTokens', () => {
  const A = {
    button: {
      fontSize: { $value: '{fontSize.14}', $type: 'dimension' },
      gap: { $value: '{spacing.12}', $type: 'size' },
    },
  };

  it('reports identical trees as fully unchanged', () => {
    const diff = diffTokens(A, A);
    assert.deepEqual(diff.added, []);
    assert.deepEqual(diff.removed, []);
    assert.deepEqual(diff.changed, []);
    assert.equal(diff.unchanged, 2);
  });

  it('detects added tokens', () => {
    const B = {
      button: {
        ...A.button,
        borderRadius: { $value: '{spacing.4}', $type: 'size' },
      },
    };
    const diff = diffTokens(A, B);
    assert.equal(diff.added.length, 1);
    assert.equal(diff.added[0].token, 'button.borderRadius');
    assert.equal(diff.added[0].after, '{spacing.4}');
  });

  it('detects removed tokens', () => {
    const B = { button: { fontSize: A.button.fontSize } };
    const diff = diffTokens(A, B);
    assert.equal(diff.removed.length, 1);
    assert.equal(diff.removed[0].token, 'button.gap');
  });

  it('detects value changes', () => {
    const B = {
      button: {
        ...A.button,
        gap: { $value: '{spacing.16}', $type: 'size' },
      },
    };
    const diff = diffTokens(A, B);
    assert.equal(diff.changed.length, 1);
    assert.equal(diff.changed[0].token, 'button.gap');
    assert.equal(diff.changed[0].before, '{spacing.12}');
    assert.equal(diff.changed[0].after, '{spacing.16}');
  });

  it('detects $type changes (color → size, etc.)', () => {
    const B = {
      button: {
        ...A.button,
        gap: { $value: '{spacing.12}', $type: 'dimension' },
      },
    };
    const diff = diffTokens(A, B);
    assert.equal(diff.changed.length, 1);
    assert.equal(diff.changed[0]['before$type'], 'size');
    assert.equal(diff.changed[0]['after$type'], 'dimension');
  });

  it('sorts output deterministically by token path', () => {
    const B = {
      button: {
        zeta: { $value: 'z', $type: 'size' },
        alpha: { $value: 'a', $type: 'size' },
        middle: { $value: 'm', $type: 'size' },
      },
    };
    const diff = diffTokens({}, B);
    assert.deepEqual(
      diff.added.map(a => a.token),
      ['button.alpha', 'button.middle', 'button.zeta'],
    );
  });

  it('handles empty trees', () => {
    const diff = diffTokens({}, {});
    assert.equal(diff.added.length, 0);
    assert.equal(diff.removed.length, 0);
    assert.equal(diff.changed.length, 0);
    assert.equal(diff.unchanged, 0);
  });
});

describe('13-token-diff: resolveMode', () => {
  it('returns component mode when only component is given', () => {
    const m = resolveMode({ component: 'mud-button', figmaExport: 'tokens-tokenhaus.json' });
    assert.equal(m.ok, true);
    assert.equal(m.kind, 'component');
    assert.equal(m.componentName, 'mud-button');
  });

  it('returns file mode when --from and --to are both provided', () => {
    const m = resolveMode({ from: 'a.json', to: 'b.json' });
    assert.equal(m.ok, true);
    assert.equal(m.kind, 'file');
    assert.equal(m.from, 'a.json');
    assert.equal(m.to, 'b.json');
  });

  it('errors when only --from is provided', () => {
    const m = resolveMode({ from: 'a.json' });
    assert.equal(m.ok, false);
    assert.match(m.error, /together/);
  });

  it('errors on invalid component name', () => {
    const m = resolveMode({ component: 'NOT VALID!' });
    assert.equal(m.ok, false);
    assert.match(m.error, /invalid/i);
  });

  it('errors when neither component nor from/to given', () => {
    const m = resolveMode({});
    assert.equal(m.ok, false);
  });
});
