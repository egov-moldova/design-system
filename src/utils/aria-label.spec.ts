import { describe, it, expect } from '@stencil/vitest';

import { nameHostWithFallback, observeAriaLabel } from './aria-label';

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

  it('reports an empty or whitespace-only label as undefined', () => {
    const seen: Array<string | undefined> = [];
    observeAriaLabel(host(''), value => seen.push(value));
    observeAriaLabel(host('  '), value => seen.push(value));
    expect(seen).toEqual([undefined, undefined]);
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

describe('nameHostWithFallback', () => {
  const host = (label?: string): HTMLElement => {
    const el = document.createElement('div');
    if (label !== undefined) el.setAttribute('aria-label', label);
    return el;
  };

  it('keeps the consumer label on the host and does not apply the fallback', () => {
    const el = host('Registration steps');
    nameHostWithFallback(el, () => 'Progress tracker');
    expect(el.getAttribute('aria-label')).toBe('Registration steps');
  });

  it('applies the fallback when the consumer gives no label', () => {
    const el = host();
    nameHostWithFallback(el, () => 'Progress tracker');
    expect(el.getAttribute('aria-label')).toBe('Progress tracker');
  });

  it('follows a changed fallback on update and removes it when the fallback is undefined', () => {
    const el = host();
    let text: string | undefined = '3 notifications';
    const label = nameHostWithFallback(el, () => text);
    text = '4 notifications';
    label.update();
    expect(el.getAttribute('aria-label')).toBe('4 notifications');
    text = undefined;
    label.update();
    expect(el.hasAttribute('aria-label')).toBe(false);
  });

  it('never overwrites a consumer label on update', () => {
    const el = host('Ana Popescu');
    const label = nameHostWithFallback(el, () => 'User avatar');
    label.update();
    expect(el.getAttribute('aria-label')).toBe('Ana Popescu');
  });

  it('keeps a consumer label that equals the current fallback when the fallback changes', () => {
    const el = host('3 notifications');
    let text = '3 notifications';
    const label = nameHostWithFallback(el, () => text);
    text = '4 notifications';
    label.update();
    expect(el.getAttribute('aria-label')).toBe('3 notifications');
  });

  it('treats an empty consumer label as none and applies the fallback', () => {
    const el = host('');
    nameHostWithFallback(el, () => 'Notification');
    expect(el.getAttribute('aria-label')).toBe('Notification');
  });

  it('takes its own fallback off the host on stop, so a reconnect still follows the fallback', () => {
    const el = host();
    let text = '3';
    const first = nameHostWithFallback(el, () => text);
    first.stop();
    expect(el.hasAttribute('aria-label')).toBe(false);
    const second = nameHostWithFallback(el, () => text);
    text = '4';
    second.update();
    expect(el.getAttribute('aria-label')).toBe('4');
  });

  it('leaves a consumer label on the host on stop', () => {
    const el = host('Registration steps');
    nameHostWithFallback(el, () => 'Progress tracker').stop();
    expect(el.getAttribute('aria-label')).toBe('Registration steps');
  });
});
