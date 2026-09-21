import { describe, it, expect } from '@stencil/vitest';

import { observeAriaLabel } from './aria-label';

// The spec environment (mock-doc) has no MutationObserver, so these cover the read at call
// time; the live path is exercised in a real browser by the component stories.
describe('observeAriaLabel', () => {
  const host = (label?: string): HTMLElement => {
    const el = document.createElement('div');
    if (label !== undefined) el.setAttribute('aria-label', label);
    return el;
  };

  it('reports the label and strips it from the host', () => {
    const el = host('Search');
    const seen: Array<string | undefined> = [];
    observeAriaLabel(el, value => seen.push(value));
    expect(seen).toEqual(['Search']);
    expect(el.hasAttribute('aria-label')).toBe(false);
  });

  it('leaves the label on the host with keepOnHost', () => {
    const el = host('Section break');
    const seen: Array<string | undefined> = [];
    observeAriaLabel(el, value => seen.push(value), { keepOnHost: true });
    expect(seen).toEqual(['Section break']);
    expect(el.getAttribute('aria-label')).toBe('Section break');
  });

  it('reports an empty label as undefined', () => {
    const seen: Array<string | undefined> = [];
    observeAriaLabel(host(''), value => seen.push(value));
    expect(seen).toEqual([undefined]);
  });

  it('reports nothing when the host has no label and the label is stripped', () => {
    const seen: Array<string | undefined> = [];
    observeAriaLabel(host(), value => seen.push(value));
    expect(seen).toEqual([]);
  });

  it('reports undefined when the host has no label and keepOnHost is set', () => {
    const seen: Array<string | undefined> = [];
    observeAriaLabel(host(), value => seen.push(value), { keepOnHost: true });
    expect(seen).toEqual([undefined]);
  });

  it('returns a stop function that is safe without MutationObserver', () => {
    const stop = observeAriaLabel(host('x'), () => undefined);
    expect(() => stop()).not.toThrow();
  });
});
