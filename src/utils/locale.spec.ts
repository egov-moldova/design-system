import { describe, it, expect, vi, afterEach, beforeEach } from '@stencil/vitest';

import {
  DEFAULT_LOCALE,
  formatMessage,
  inheritedLang,
  intlTag,
  localeMessages,
  matchLocale,
  observeDocumentLang,
  resetLocaleWarnings,
  resolveLocale,
  resolvedLocale,
} from './locale';
import type { LocaleMessages, Plural } from './locale';

interface TestMessages {
  closeLabel: string;
  openLabel: string;
}

const TABLE: LocaleMessages<TestMessages> = {
  'ro-RO': { closeLabel: 'Închide', openLabel: 'Deschide' },
  'en-US': { closeLabel: 'Close', openLabel: 'Open' },
  'ru-RU': { closeLabel: 'Закрыть', openLabel: 'Открыть' },
};

const inLang = (lang?: string): HTMLElement => {
  const wrapper = document.createElement('section');
  if (lang !== undefined) wrapper.setAttribute('lang', lang);
  const el = document.createElement('div');
  wrapper.appendChild(el);
  return el;
};

afterEach(() => vi.restoreAllMocks());

describe('matchLocale', () => {
  it('matches a supported tag exactly, case-insensitively', () => {
    expect(matchLocale('en-US')).toBe('en-US');
    expect(matchLocale('ru-ru')).toBe('ru-RU');
  });

  it('falls back to the language subtag', () => {
    expect(matchLocale('en-GB')).toBe('en-US');
    expect(matchLocale('ro')).toBe('ro-RO');
    expect(matchLocale('ru_MD')).toBe('ru-RU');
  });

  it('returns undefined for an unsupported or empty tag', () => {
    expect(matchLocale('fr-FR')).toBeUndefined();
    expect(matchLocale('')).toBeUndefined();
    expect(matchLocale(undefined)).toBeUndefined();
  });
});

describe('inheritedLang', () => {
  it('reads the closest ancestor lang', () => {
    expect(inheritedLang(inLang('ru'))).toBe('ru');
  });

  it('prefers the element’s own lang', () => {
    const el = inLang('ru');
    el.setAttribute('lang', 'en');
    expect(inheritedLang(el)).toBe('en');
  });

  it('crosses a shadow root to its host', () => {
    const host = inLang('en-US');
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');
    shadow.appendChild(inner);
    expect(inheritedLang(inner)).toBe('en-US');
  });

  it('terminates on a detached element whose own `host` points at itself (mock-doc Stencil host)', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'host', { value: el });
    expect(inheritedLang(el)).toBeUndefined();
  });

  it('stops at an empty lang', () => {
    const outer = document.createElement('div');
    outer.setAttribute('lang', 'en');
    const el = inLang('');
    outer.appendChild(el.parentElement as HTMLElement);
    expect(inheritedLang(el)).toBeUndefined();
  });
});

describe('resolveLocale', () => {
  it('uses the locale prop over the page lang', () => {
    expect(resolveLocale('mud-test', inLang('ru'), 'en-US')).toBe('en-US');
  });

  it('uses the ancestor lang when the prop is not set', () => {
    expect(resolveLocale('mud-test', inLang('ru'), undefined)).toBe('ru-RU');
  });

  it('defaults to ro-RO silently when neither names a supported locale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(resolveLocale('mud-test', inLang(), undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale('mud-test', inLang('fr'), undefined)).toBe(DEFAULT_LOCALE);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once for an unsupported locale prop and falls back to ro-RO', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(resolveLocale('mud-once', inLang(), 'de-DE')).toBe('ro-RO');
    expect(resolveLocale('mud-once', inLang(), 'de-DE')).toBe('ro-RO');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[mud-once] locale="de-DE"'));
  });
});

describe('localeMessages', () => {
  it('returns the resolved locale’s table', () => {
    expect(localeMessages('mud-test', inLang(), 'en-US', TABLE)).toEqual(TABLE['en-US']);
  });

  it('applies a non-empty override over the locale', () => {
    const messages = localeMessages('mud-test', inLang(), 'en-US', TABLE, { closeLabel: 'Dismiss' });
    expect(messages).toEqual({ closeLabel: 'Dismiss', openLabel: 'Open' });
  });

  it('ignores an empty, whitespace-only or unset override', () => {
    const messages = localeMessages('mud-test', inLang(), 'ru-RU', TABLE, {
      closeLabel: '  ',
      openLabel: undefined,
    });
    expect(messages).toEqual(TABLE['ru-RU']);
  });

  it('never mutates the table', () => {
    localeMessages('mud-test', inLang(), 'ro-RO', TABLE, { closeLabel: 'X' });
    expect(TABLE['ro-RO'].closeLabel).toBe('Închide');
  });
});

describe('resolvedLocale', () => {
  it('is resolveLocale itself: same resolution, and calling both never double-warns', () => {
    resetLocaleWarnings();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(resolvedLocale('mud-alias', inLang(), 'de-DE')).toBe('ro-RO');
    expect(resolveLocale('mud-alias', inLang(), 'de-DE')).toBe('ro-RO');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('resetLocaleWarnings', () => {
  it('lets a previously-warned locale warn again', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    resolveLocale('mud-reset', inLang(), 'xx-XX');
    resetLocaleWarnings();
    resolveLocale('mud-reset', inLang(), 'xx-XX');
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('intlTag', () => {
  it('canonicalises an underscore-separated tag', () => {
    expect(intlTag('en_US')).toBe('en-US');
  });

  it('falls back to the matched MudLocale for a tag Intl cannot parse', () => {
    expect(intlTag('xx-!!')).toBe('ro-RO');
    expect(intlTag('fr-??')).toBe(DEFAULT_LOCALE); // "fr" matches no MudLocale either → ro-RO
  });

  it('falls back to ro-RO for a missing tag', () => {
    expect(intlTag(undefined)).toBe('ro-RO');
    expect(intlTag('')).toBe('ro-RO');
  });
});

describe('formatMessage', () => {
  it('fills a {name} placeholder', () => {
    expect(formatMessage('Ziua trebuie să fie între 01 și {max}', inLang(), 'ro-RO', { max: 31 })).toBe(
      'Ziua trebuie să fie între 01 și 31',
    );
  });

  it('leaves an unmatched placeholder untouched', () => {
    expect(formatMessage('{missing}', inLang(), 'ro-RO', {})).toBe('{missing}');
  });

  const PLURAL: Plural = {
    one: '{count} fișier respins',
    few: '{count} fișiere respinse',
    other: '{count} de fișiere respinse',
  };

  it('selects the plural form of the RESOLVED locale, never the raw tag', () => {
    // locale="de" has no dictionary → resolves to ro-RO, whose `few` form (2-19 except
    // 11-19) must be chosen for count 2 — not a form keyed by "de".
    expect(formatMessage(PLURAL, inLang(), 'de', { count: 2 })).toBe('2 fișiere respinse');
  });

  it.each([
    [1, 'one'],
    [2, 'few'],
    [20, 'other'],
  ])('ro-RO count %i selects the %s form', (count, form) => {
    const plural: Plural = { one: 'one', few: 'few', many: 'many', other: 'other' };
    expect(formatMessage(plural, inLang(), 'ro-RO', { count })).toBe(form);
  });

  it.each([
    [1, 'one'],
    [2, 'few'],
    [5, 'many'],
    [21, 'one'],
  ])('ru-RU count %i selects the %s form', (count, form) => {
    const plural: Plural = { one: 'one', few: 'few', many: 'many', other: 'other' };
    expect(formatMessage(plural, inLang(), 'ru-RU', { count })).toBe(form);
  });

  it.each([
    [1, 'one'],
    [2, 'other'],
  ])('en-US count %i selects the %s form', (count, form) => {
    const plural: Plural = { one: 'one', other: 'other' };
    expect(formatMessage(plural, inLang(), 'en-US', { count })).toBe(form);
  });

  it('renders the "other" form when count is missing or non-finite', () => {
    const plural: Plural = { one: 'one', other: 'other' };
    expect(formatMessage(plural, inLang(), 'ro-RO', {})).toBe('other');
    expect(formatMessage(plural, inLang(), 'ro-RO', { count: NaN })).toBe('other');
  });

  it('falls back to "other" when the selected form is not set', () => {
    const plural: Plural = { other: '{count} fallback' };
    expect(formatMessage(plural, inLang(), 'en-US', { count: 5 })).toBe('5 fallback');
  });
});

describe('observeDocumentLang', () => {
  class StubMutationObserver {
    static instances: StubMutationObserver[] = [];
    disconnected = false;
    constructor(private readonly callback: MutationCallback) {
      StubMutationObserver.instances.push(this);
    }
    observe(): void {}
    disconnect(): void {
      this.disconnected = true;
    }
    fire(): void {
      this.callback([], this as unknown as MutationObserver);
    }
  }

  let originalMutationObserver: typeof MutationObserver;

  beforeEach(() => {
    originalMutationObserver = globalThis.MutationObserver;
    StubMutationObserver.instances = [];
    (globalThis as unknown as { MutationObserver: unknown }).MutationObserver = StubMutationObserver;
  });

  afterEach(() => {
    (globalThis as unknown as { MutationObserver: unknown }).MutationObserver = originalMutationObserver;
  });

  it('fires every registered listener on a lang mutation', () => {
    const calls: string[] = [];
    const stop1 = observeDocumentLang(() => calls.push('a'));
    const stop2 = observeDocumentLang(() => calls.push('b'));
    StubMutationObserver.instances[0].fire();
    expect(calls).toEqual(['a', 'b']);
    stop1();
    stop2();
  });

  it('a throwing listener does not stop the next one', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const calls: string[] = [];
    const stop1 = observeDocumentLang(() => {
      throw new Error('boom');
    });
    const stop2 = observeDocumentLang(() => calls.push('b'));
    StubMutationObserver.instances[0].fire();
    expect(calls).toEqual(['b']);
    expect(errorSpy).toHaveBeenCalled();
    stop1();
    stop2();
  });

  it('disconnects only once the last listener unsubscribes', () => {
    const stop1 = observeDocumentLang(() => undefined);
    const stop2 = observeDocumentLang(() => undefined);
    const observer = StubMutationObserver.instances[0];
    stop1();
    expect(observer.disconnected).toBe(false);
    stop2();
    expect(observer.disconnected).toBe(true);
  });
});
