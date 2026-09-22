/**
 * Smoke tests for scripts/audit/13-token-diff.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  componentRoot,
  diffTokens,
  extractComponentBlock,
  flattenDtcg,
  resolveMode,
  loadComponentSources,
  resolveTokensFile,
  undeclaredCustomProperties,
} from '../../audit/13-token-diff.mjs';

describe('13-token-diff: U3 — the tokens file resolves by the component CSS prefix (Decision 13)', () => {
  it('a component with its own file uses it (mud-button → button.tokens.json)', () => {
    assert.equal(resolveTokensFile('mud-button').file, 'tokens/core/components/button.tokens.json');
  });

  it('mud-text-input resolves to input.tokens.json through its var(--input-…) usage', () => {
    assert.equal(resolveTokensFile('mud-text-input').file, 'tokens/core/components/input.tokens.json');
  });

  it('mud-accordion-item resolves to accordion.tokens.json through its var(--accordion-item-…) usage', () => {
    assert.equal(resolveTokensFile('mud-accordion-item').file, 'tokens/core/components/accordion.tokens.json');
  });

  it('mud-icon uses no component tokens (its --icon-size is defined in its own CSS) → no file', () => {
    assert.equal(resolveTokensFile('mud-icon').file, null);
  });

  it('mud-icon → TOKEN-DIFF-NO-CURRENT as a visible notApplicable finding, never noTarget', () => {
    const { error } = loadComponentSources('mud-icon', 'tokenhaus/export.json');
    assert.equal(error.code, 'TOKEN-DIFF-NO-CURRENT');
    assert.equal(error.severity, 'info');
    assert.equal(error.notApplicable, true);
    assert.notEqual(error.noTarget, true);
  });

  it("names mud-icon's --icon-color as published API in the note, so the not-applicable says why", () => {
    const { error } = loadComponentSources('mud-icon', 'tokenhaus/export.json');
    assert.match(error.message, /--icon-color/);
    assert.match(error.message, /fallback/);
  });

  it('own-prefixed reads split by fallback: with one it is API, without one it is required', () => {
    const css = ':host { color: var(--icon-color, currentColor); gap: var(--icon-gap); --icon-size: 16px; }';
    assert.deepEqual(undeclaredCustomProperties(css), { required: ['--icon-gap'], api: ['--icon-color'] });
  });

  it('one fallback-less read among several makes the property required', () => {
    const css = 'a { gap: var(--x-gap, 0); } b { gap: var(--x-gap); }';
    assert.deepEqual(undeclaredCustomProperties(css), { required: ['--x-gap'], api: [] });
  });

  it('mud-icon has no fallback-less own read — its --icon-color is the API case', () => {
    const { required, api } = resolveTokensFile('mud-icon');
    assert.deepEqual(required, []);
    assert.deepEqual(api, ['--icon-color']);
  });

  it('Decision 13, third case: a fallback-less --<bare>-* read with no tokens file is noTarget, not a note', () => {
    // An empty tokens dir reproduces "the component reads its own tokens and
    // nothing defines them" against real component CSS: mud-button's
    // `--button-container-*` reads carry no fallback.
    const empty = mkdtempSync(join(tmpdir(), 'token-diff-'));
    const { error } = loadComponentSources('mud-button', 'tokens-tokenhaus.json', { tokensDir: empty });
    assert.equal(error.code, 'TOKEN-DIFF-NO-CURRENT');
    assert.equal(error.noTarget, true);
    assert.notEqual(error.notApplicable, true);
    assert.match(error.message, /--button-container-border-radius-circular-lg/);
    assert.match(error.fix, /create/);
  });
});

describe('13-token-diff: U3 — a Figma export with no block for the component does not silently pass', () => {
  it('TOKEN-DIFF-NO-FIGMA-BLOCK is a visible notApplicable, never a bare info', () => {
    const { error } = loadComponentSources('mud-button', 'tokens-tokenhaus.json');
    assert.equal(error.code, 'TOKEN-DIFF-NO-FIGMA-BLOCK');
    assert.equal(error.severity, 'info');
    assert.equal(error.notApplicable, true);
    assert.match(error.message, /nothing to diff against/);
  });

  it('mud-text-input is diffed, not not-applicable', () => {
    const res = loadComponentSources('mud-text-input', 'no/such/figma-export.json');
    assert.equal(res.error.code, 'TOKEN-DIFF-NO-FIGMA-EXPORT', 'reached the export step, so a tokens file was found');
  });

  it('current tokens file exists but the Figma export path does not → TOKEN-DIFF-NO-FIGMA-EXPORT, noTarget: true', () => {
    const { error } = loadComponentSources('mud-button', 'no/such/figma-export.json');
    assert.equal(error.code, 'TOKEN-DIFF-NO-FIGMA-EXPORT');
    assert.equal(error.noTarget, true);
  });
});

describe('13-token-diff: componentRoot', () => {
  it("reads the component file's own root, skipping DTCG `$` metadata", () => {
    assert.equal(componentRoot({ $description: 'x', searchInput: {} }, 'search-input'), 'searchInput');
  });

  it('falls back to the bare name for an empty or null document', () => {
    assert.equal(componentRoot(null, 'search-input'), 'search-input');
    assert.equal(componentRoot({ $description: 'x' }, 'search-input'), 'search-input');
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
