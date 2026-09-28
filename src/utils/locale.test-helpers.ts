import { describe, expect, it, vi } from '@stencil/vitest';

import { formatMessage, resetLocaleWarnings } from './locale';
import type { LocaleMessages, Plural } from './locale';

/** Renders the component under test with the given props, waits for it to settle, and returns its host. */
export type DescribeLocalesRender = (props: Record<string, unknown>, ancestorLang?: string) => Promise<Element>;

/** Reads the rendered text for one message key off the host produced by `render`. */
export type DescribeLocalesRead<M> = (host: Element, key: keyof M) => string | null | undefined;

export interface DescribeLocalesOptions<M> {
  render: DescribeLocalesRender;
  read: DescribeLocalesRead<M>;
  /** Message key → the prop name `render`'s `props` accepts to override it with a plain string. */
  overrides?: Partial<Record<keyof M, string>>;
  /**
   * Message keys `read` cannot reach yet, each with the reason. `describeLocales` fails on any
   * table key absent from both the overrides sweep's reach and this list, rather than silently
   * skipping it.
   */
  unreachable?: Partial<Record<keyof M, string>>;
  /**
   * Plural message key → the prop name `render`'s `props` accepts a numeric `count` through,
   * for the "counts 1, 2, 5, 21" cases. Omitted for a table with no `Plural` keys.
   */
  pluralCounts?: Partial<Record<keyof M, string>>;
}

const isPlural = (value: string | Plural): value is Plural => typeof value === 'object' && value !== null;

/**
 * Generates the shared locale contract's spec cases for one component: default `ro-RO`,
 * `locale="en-US"`, an ancestor `lang="ru"`, an override beating the locale, an empty override
 * falling back to the dictionary, an unsupported `locale` warning and falling back, a `locale`
 * change after mount re-rendering the copy, and — under `ru-RU` — the rendered shadow DOM
 * holding no `ro-RO`/`en-US` dictionary value. Iterates every key of `table['ro-RO']`; a key
 * neither reachable through `read` nor listed in `unreachable` fails the run.
 */
export const describeLocales = <M extends { [K in keyof M]: string | Plural }>(
  component: string,
  table: LocaleMessages<M>,
  options: DescribeLocalesOptions<M>,
): void => {
  const {
    render,
    read,
    overrides = {} as NonNullable<DescribeLocalesOptions<M>['overrides']>,
    unreachable = {} as NonNullable<DescribeLocalesOptions<M>['unreachable']>,
    pluralCounts = {} as NonNullable<DescribeLocalesOptions<M>['pluralCounts']>,
  } = options;
  const keys = Object.keys(table['ro-RO']) as Array<keyof M>;
  const stringKeys = keys.filter(key => !isPlural(table['ro-RO'][key]) && !(key in unreachable));
  const pluralKeys = keys.filter(key => isPlural(table['ro-RO'][key]));

  const expectMessages = async (host: Element, locale: 'ro-RO' | 'en-US' | 'ru-RU', onlyKeys = stringKeys) => {
    for (const key of onlyKeys) {
      expect(read(host, key)).toBe(table[locale][key]);
    }
  };

  describe(`${component} — shared locale contract`, () => {
    it('covers every message key: reachable through read, or named in unreachable', () => {
      for (const key of keys) {
        const covered = stringKeys.includes(key) || pluralKeys.includes(key) || key in unreachable;
        expect(covered, `key "${String(key)}" is neither read-reachable nor in unreachable`).toBe(true);
      }
    });

    it('defaults to ro-RO with no locale and no ancestor lang', async () => {
      const host = await render({});
      await expectMessages(host, 'ro-RO');
    });

    it('renders en-US when locale="en-US"', async () => {
      const host = await render({ locale: 'en-US' });
      await expectMessages(host, 'en-US');
    });

    it('renders ru-RU from an ancestor lang="ru"', async () => {
      const host = await render({}, 'ru');
      await expectMessages(host, 'ru-RU');
    });

    for (const [key, propName] of Object.entries(overrides) as [keyof M, string][]) {
      it(`override "${String(key)}" beats the locale`, async () => {
        const host = await render({ locale: 'en-US', [propName]: 'Custom override' });
        expect(read(host, key)).toBe('Custom override');
      });

      it(`an empty override "${String(key)}" falls back to the dictionary`, async () => {
        const host = await render({ locale: 'en-US', [propName]: '' });
        expect(read(host, key)).toBe(table['en-US'][key]);
      });
    }

    it('warns and renders ro-RO for an unsupported locale', async () => {
      // At least once: a component that hands `locale` down to a locale-aware child (e.g.
      // mud-time-input → mud-time-picker) warns once per component, each deduplicated on
      // its own `component|locale` key — never zero, but not pinned to exactly one either.
      resetLocaleWarnings();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const host = await render({ locale: 'de-DE' });
      await expectMessages(host, 'ro-RO');
      expect(warn.mock.calls.length).toBeGreaterThanOrEqual(1);
      warn.mockRestore();
    });

    it('re-renders its copy when locale changes after mount', async () => {
      const host = await render({ locale: 'en-US' });
      await expectMessages(host, 'en-US');
      (host as unknown as Record<string, unknown>).locale = 'ru-RU';
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      await expectMessages(host, 'ru-RU');
    });

    it('shows no ro-RO or en-US dictionary value under ru-RU', async () => {
      const host = await render({ locale: 'ru-RU' });
      for (const key of stringKeys) {
        const rendered = read(host, key);
        if (table['ro-RO'][key] !== table['ru-RU'][key]) expect(rendered).not.toBe(table['ro-RO'][key]);
        if (table['en-US'][key] !== table['ru-RU'][key]) expect(rendered).not.toBe(table['en-US'][key]);
      }
    });

    for (const key of pluralKeys) {
      const propName = pluralCounts[key];
      if (!propName) continue;
      it.each([1, 2, 5, 21])(`plural "${String(key)}" formats count %i for ro-RO`, async count => {
        const host = await render({ locale: 'ro-RO', [propName]: count });
        const plural = table['ro-RO'][key] as Plural;
        expect(read(host, key)).toBe(formatMessage(plural, host, 'ro-RO', { count }));
      });
    }
  });
};
