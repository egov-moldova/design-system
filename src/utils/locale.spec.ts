import { describe, it, expect, vi, afterEach, beforeEach } from '@stencil/vitest';

import {
  DEFAULT_LOCALE,
  formatLocale,
  formatMessage,
  inheritedLang,
  intlTag,
  localeMessages,
  matchLocale,
  observeDocumentLang,
  resetLocaleWarnings,
  resolveLocale,
  MUD_LOCALES,
} from './locale';
import type { LocaleMessages, Plural } from './locale';

interface TestMessages {
  closeLabel: string;
  openLabel: string;
}

const TABLE: LocaleMessages<TestMessages> = {
  'ro-MD': { closeLabel: 'Închide', openLabel: 'Deschide' },
  'en-US': { closeLabel: 'Close', openLabel: 'Open' },
  'ru-MD': { closeLabel: 'Закрыть', openLabel: 'Открыть' },
};

const inLang = (lang?: string): HTMLElement => {
  const wrapper = document.createElement('section');
  if (lang !== undefined) wrapper.setAttribute('lang', lang);
  const el = document.createElement('div');
  wrapper.appendChild(el);
  return el;
};

afterEach(() => vi.restoreAllMocks());

describe('locale identity', () => {
  it('names the three built-in locales by their Moldovan regions', () => {
    expect([...MUD_LOCALES]).toEqual(['ro-MD', 'ru-MD', 'en-US']);
    expect(DEFAULT_LOCALE).toBe('ro-MD');
  });

  it('still accepts the legacy regional tags and bare languages', () => {
    expect(matchLocale('ro-RO')).toBe('ro-MD');
    expect(matchLocale('ru-RU')).toBe('ru-MD');
    expect(matchLocale('ru')).toBe('ru-MD');
  });
});

describe('matchLocale', () => {
  it('matches a supported tag exactly, case-insensitively', () => {
    expect(matchLocale('en-US')).toBe('en-US');
    expect(matchLocale('ru-md')).toBe('ru-MD');
  });

  it('falls back to the language subtag', () => {
    expect(matchLocale('en-GB')).toBe('en-US');
    expect(matchLocale('ro')).toBe('ro-MD');
    expect(matchLocale('ru_MD')).toBe('ru-MD');
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
    expect(resolveLocale('mud-test', inLang('ru'), undefined)).toBe('ru-MD');
  });

  it('defaults to ro-MD silently when neither names a supported locale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(resolveLocale('mud-test', inLang(), undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale('mud-test', inLang('fr'), undefined)).toBe(DEFAULT_LOCALE);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once for an unsupported locale prop and falls back to ro-MD', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(resolveLocale('mud-once', inLang(), 'de-DE')).toBe('ro-MD');
    expect(resolveLocale('mud-once', inLang(), 'de-DE')).toBe('ro-MD');
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
    const messages = localeMessages('mud-test', inLang(), 'ru-MD', TABLE, {
      closeLabel: '  ',
      openLabel: undefined,
    });
    expect(messages).toEqual(TABLE['ru-MD']);
  });

  it('never mutates the table', () => {
    localeMessages('mud-test', inLang(), 'ro-MD', TABLE, { closeLabel: 'X' });
    expect(TABLE['ro-MD'].closeLabel).toBe('Închide');
  });
});

describe('formatLocale', () => {
  it('keeps an explicit locale that carries a region', () => {
    expect(formatLocale(inLang(), 'ro-RO')).toBe('ro-RO');
    expect(formatLocale(inLang(), 'en-GB')).toBe('en-GB');
  });

  it('gives a bare supported language the locale region', () => {
    expect(formatLocale(inLang('ru'), undefined)).toBe('ru-MD');
    expect(formatLocale(inLang('ro'), undefined)).toBe('ro-MD');
  });

  it('prefers the locale prop over the ancestor lang', () => {
    expect(formatLocale(inLang('ru'), 'en-US')).toBe('en-US');
  });

  it('falls back to the default locale with nothing set', () => {
    expect(formatLocale(inLang(), undefined)).toBe('ro-MD');
    expect(formatLocale(inLang(), '  ')).toBe('ro-MD');
  });

  it('canonicalises an underscore tag', () => {
    expect(formatLocale(inLang(), 'en_US')).toBe('en-US');
  });

  it('resolves a language with no dictionary to the shown dictionary locale', () => {
    expect(formatLocale(inLang(), 'de-DE')).toBe('ro-MD');
    expect(formatLocale(inLang('ar-EG'), undefined)).toBe('ro-MD');
  });

  it('warns once for an explicit locale with no dictionary, not for a page lang', () => {
    resetLocaleWarnings();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    formatLocale(inLang('ar-EG'), undefined);
    expect(warn).not.toHaveBeenCalled();
    formatLocale(inLang(), 'de-DE');
    formatLocale(inLang(), 'de-DE');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('formats numbers in placeholders in that locale with grouping off', () => {
    expect(formatMessage('{min}', inLang(), 'ro-MD', { min: 0.5 })).toBe('0,5');
    expect(formatMessage('{min}', inLang(), 'en-US', { min: 0.5 })).toBe('0.5');
    for (const locale of ['ro-MD', 'ru-MD', 'en-US', 'de-DE']) {
      expect(formatMessage('{max}', inLang(), locale, { max: 1000 })).toBe('1000');
    }
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
    expect(intlTag('xx-!!')).toBe('ro-MD');
    expect(intlTag('fr-??')).toBe(DEFAULT_LOCALE); // "fr" matches no MudLocale either → ro-MD
  });

  it('falls back to ro-MD for a missing tag', () => {
    expect(intlTag(undefined)).toBe('ro-MD');
    expect(intlTag('')).toBe('ro-MD');
  });
});

describe('formatMessage', () => {
  it('fills a {name} placeholder', () => {
    expect(formatMessage('Ziua trebuie să fie între 01 și {max}', inLang(), 'ro-MD', { max: 31 })).toBe(
      'Ziua trebuie să fie între 01 și 31',
    );
  });

  it('leaves an unmatched placeholder untouched', () => {
    expect(formatMessage('{missing}', inLang(), 'ro-MD', {})).toBe('{missing}');
  });

  const PLURAL: Plural = {
    one: '{count} fișier respins',
    few: '{count} fișiere respinse',
    other: '{count} de fișiere respinse',
  };

  it('selects the plural form of the RESOLVED locale, never the raw tag', () => {
    // locale="de" has no dictionary → resolves to ro-MD, whose `few` form (2-19 except
    // 11-19) must be chosen for count 2 — not a form keyed by "de".
    expect(formatMessage(PLURAL, inLang(), 'de', { count: 2 })).toBe('2 fișiere respinse');
  });

  it.each([
    [1, 'one'],
    [2, 'few'],
    [20, 'other'],
  ])('ro-MD count %i selects the %s form', (count, form) => {
    const plural: Plural = { one: 'one', few: 'few', many: 'many', other: 'other' };
    expect(formatMessage(plural, inLang(), 'ro-MD', { count })).toBe(form);
  });

  it.each([
    [1, 'one'],
    [2, 'few'],
    [5, 'many'],
    [21, 'one'],
  ])('ru-MD count %i selects the %s form', (count, form) => {
    const plural: Plural = { one: 'one', few: 'few', many: 'many', other: 'other' };
    expect(formatMessage(plural, inLang(), 'ru-MD', { count })).toBe(form);
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
    expect(formatMessage(plural, inLang(), 'ro-MD', {})).toBe('other');
    expect(formatMessage(plural, inLang(), 'ro-MD', { count: NaN })).toBe('other');
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
