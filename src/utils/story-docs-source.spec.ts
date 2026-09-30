import { describe, expect, it } from '@stencil/vitest';

import { attr, jsLiteral, jsValue, text } from './story-docs-source';

describe('attr', () => {
  it('escapes what would end or break a double-quoted attribute', () => {
    expect(attr('Delete "draft" & <b>')).toBe('Delete &quot;draft&quot; &amp; &lt;b>');
  });
});

describe('text', () => {
  it('escapes markup in text content and leaves quotes alone', () => {
    expect(text('Amount < 100 & "fees"')).toBe('Amount &lt; 100 &amp; "fees"');
  });
});

describe('jsValue', () => {
  it('writes every < as \\u003c so a value cannot end or re-mode the script block', () => {
    const snippet = jsValue(['</script>', '<!--<script>']);
    expect(snippet).not.toContain('<');
    expect(JSON.parse(snippet)).toEqual(['</script>', '<!--<script>']);
  });

  it('pretty-prints with the given indent', () => {
    expect(jsValue({ a: 1 }, 2)).toBe('{\n  "a": 1\n}');
  });

  it('writes values JSON has no form for as JS', () => {
    expect(jsValue(undefined)).toBe('undefined');
    expect(jsValue(() => 1)).toBe('undefined');
    expect(jsValue(Number.NaN)).toBe('NaN');
    expect(jsValue(Number.POSITIVE_INFINITY)).toBe('Infinity');
  });
});

describe('jsLiteral', () => {
  it('quotes only the keys that are not plain identifiers', () => {
    expect(jsLiteral({ 'label': "Citizen's area", 'due-date': '2026-05-09', 'count': 3, 'meta': { x: 1 } })).toBe(
      `{ label: "Citizen's area", "due-date": "2026-05-09", count: 3, meta: {"x":1} }`,
    );
  });
});
