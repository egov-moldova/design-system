import { describe, it, expect, vi, afterEach } from '@stencil/vitest';

import { DEFAULT_LOCALE, inheritedLang, localeMessages, matchLocale, resolveLocale } from './locale';
import type { LocaleMessages } from './locale';

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
