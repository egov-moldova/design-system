import { describe, it, expect, vi } from '@stencil/vitest';

import { usesItemsProp, warnIfBothSources } from './collection-source';

describe('usesItemsProp', () => {
  it('is true only for a non-empty array', () => {
    expect(usesItemsProp([{}])).toBe(true);
    expect(usesItemsProp([])).toBe(false);
    expect(usesItemsProp(undefined)).toBe(false);
  });
});

describe('warnIfBothSources', () => {
  const host = (...children: string[]): HTMLElement => {
    const el = document.createElement('mud-fake');
    for (const tag of children) el.appendChild(document.createElement(tag));
    return el;
  };

  it('warns once per host when the prop and the children are both set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = host('mud-fake-item');
    warnIfBothSources(el, [{}], 'items', 'mud-fake-item');
    warnIfBothSources(el, [{}], 'items', 'mud-fake-item');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('[mud-fake] Both `items` and <mud-fake-item> children are set');
    warn.mockRestore();
  });

  it('stays quiet with only one source, or with children of another tag', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    warnIfBothSources(host('mud-fake-item'), [], 'items', 'mud-fake-item');
    warnIfBothSources(host('mud-fake-item'), undefined, 'items', 'mud-fake-item');
    warnIfBothSources(host(), [{}], 'items', 'mud-fake-item');
    warnIfBothSources(host('span'), [{}], 'items', 'mud-fake-item');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
