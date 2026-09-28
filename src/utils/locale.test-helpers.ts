import { describe, expect, it, vi } from '@stencil/vitest';

import { formatMessage, resetLocaleWarnings } from './locale';
import type { LocaleMessages, Plural } from './locale';

/** Renders the component under test with the given props, waits for it to settle, and returns its host. */
export type DescribeLocalesRender = (props: Record<string, unknown>, ancestorLang?: string) => Promise<Element>;

/** Reads the rendered text for one message key off the host produced by `render`. */
export type DescribeLocalesRead<M> = (host: Element, key: keyof M) => string | null | undefined;

/**
 * One validity message a component reports through `ElementInternals.setValidity`, and how to
 * put the component in the state that reports it.
 */
export interface DescribeLocalesValidityCase<M> {
  /** The message key the component passes to `setValidity` in that state. */
  key: keyof M;
  /** The override prop that replaces the message, when it has one (`empty <prop> falls back` is generated from it). */
  prop?: string;
  /** Renders the component in the state that reports `key` (e.g. `required` and empty), with the given props. */
  render: DescribeLocalesRender;
  /** The `{name}` placeholder values (and `count`, for a `Plural`) the component fills into the message. */
  vars?: Record<string, string | number>;
}

/** The last `(flags, message)` a component handed to `internals.setValidity`, as recorded by `vitest-setup.ts`. */
export const lastValidity = (
  host: Element,
): { flags: Partial<ValidityState> | undefined; message: string | undefined } | undefined =>
  (host as unknown as { __mudInternals?: { lastValidity?: ReturnType<typeof lastValidity> } }).__mudInternals
    ?.lastValidity;

/**
 * A spec's `props` as host attributes: each key kebab-cased (`requiredMessage` → `required-message`,
 * the attribute every override prop has) and its value stringified. `undefined` entries are dropped.
 */
export const propsToAttrs = (props: Record<string, unknown>): Record<string, string> => {
  const attrs: Record<string, string> = {};
  for (const [name, value] of Object.entries(props)) {
    if (value !== undefined) attrs[name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)] = String(value);
  }
  return attrs;
};

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/**
 * Runs `run` with a `MutationObserver` stub in place (mock-doc has none, so `observeDocumentLang`
 * observes nothing otherwise) and hands it a `fire` that delivers a mutation to every observer
 * created meanwhile — the `<html lang>` listener path, without a real DOM.
 */
const withLangObserver = async (run: (fire: () => void) => Promise<void>): Promise<void> => {
  const original = globalThis.MutationObserver;
  const created: Array<{ callback: MutationCallback }> = [];
  class StubMutationObserver {
    constructor(readonly callback: MutationCallback) {
      created.push(this);
    }
    observe(): void {}
    disconnect(): void {}
    takeRecords(): MutationRecord[] {
      return [];
    }
  }
  (globalThis as unknown as { MutationObserver: unknown }).MutationObserver = StubMutationObserver;
  try {
    await run(() => {
      for (const observer of created) observer.callback([], observer as unknown as MutationObserver);
    });
  } finally {
    (globalThis as unknown as { MutationObserver: unknown }).MutationObserver = original;
  }
};

/** The closest element at or above `host` that carries a `lang` attribute. */
const langCarrier = (host: Element): Element | null => {
  let node: Node | null = host;
  while (node) {
    if (node.nodeType === 1 && (node as Element).hasAttribute('lang')) return node as Element;
    node = node.parentNode;
  }
  return null;
};

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
  /**
   * Message keys whose override prop is a visible optional caption (`scripts/eslint/override-classes.json`,
   * class `caption`): an empty override hides the text (`empty <prop> hides`) instead of falling back.
   */
  captions?: Array<keyof M>;
  /**
   * Validity messages, for a component that calls `internals.setValidity`. Each case renders the
   * component in the state that reports its `key` and asserts that the message last handed to
   * `setValidity` follows the locale — through the `locale` prop and through the `<html lang>`
   * observer — and that its override prop wins, an empty one falling back. A validity key is
   * covered by its case, so it needs neither `read` nor `unreachable`.
   */
  validity?: DescribeLocalesValidityCase<M> | Array<DescribeLocalesValidityCase<M>>;
}

const isPlural = (value: string | Plural): value is Plural => typeof value === 'object' && value !== null;

/**
 * Generates the shared locale contract's spec cases for one component: default `ro-MD`,
 * `locale="en-US"`, an ancestor `lang="ru"`, an override beating the locale, an empty override
 * falling back to the dictionary (a caption's hiding the text instead), an unsupported `locale`
 * warning and falling back, a `locale` change after mount re-rendering the copy, and — under
 * `ru-MD` — the rendered shadow DOM holding no `ro-MD`/`en-US` dictionary value. With the
 * `validity` option, each validity message also follows the locale through the `locale` prop and
 * the `<html lang>` observer. Iterates every key of `table['ro-MD']`; a key neither reachable
 * through `read`, nor a validity case, nor listed in `unreachable` fails the run.
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
    captions = [] as Array<keyof M>,
  } = options;
  const validityCases = options.validity === undefined ? [] : [options.validity].flat();
  const validityKeys = validityCases.map(entry => entry.key);
  const keys = Object.keys(table['ro-MD']) as Array<keyof M>;
  const stringKeys = keys.filter(
    key => !isPlural(table['ro-MD'][key]) && !(key in unreachable) && !validityKeys.includes(key),
  );
  const pluralKeys = keys.filter(key => isPlural(table['ro-MD'][key]));

  const expectMessages = async (host: Element, locale: 'ro-MD' | 'en-US' | 'ru-MD', onlyKeys = stringKeys) => {
    for (const key of onlyKeys) {
      expect(read(host, key)).toBe(table[locale][key]);
    }
  };

  describe(`${component} — shared locale contract`, () => {
    it('covers every message key: reachable through read, or named in unreachable', () => {
      for (const key of keys) {
        const covered =
          stringKeys.includes(key) || pluralKeys.includes(key) || key in unreachable || validityKeys.includes(key);
        expect(covered, `key "${String(key)}" is neither read-reachable nor in unreachable`).toBe(true);
      }
    });

    it('defaults to ro-MD with no locale and no ancestor lang', async () => {
      const host = await render({});
      await expectMessages(host, 'ro-MD');
    });

    it('renders en-US when locale="en-US"', async () => {
      const host = await render({ locale: 'en-US' });
      await expectMessages(host, 'en-US');
    });

    it('renders ru-MD from an ancestor lang="ru"', async () => {
      const host = await render({}, 'ru');
      await expectMessages(host, 'ru-MD');
    });

    for (const [key, propName] of Object.entries(overrides) as [keyof M, string][]) {
      it(`override "${String(key)}" beats the locale`, async () => {
        const host = await render({ locale: 'en-US', [propName]: 'Custom override' });
        expect(read(host, key)).toBe('Custom override');
      });

      if (captions.includes(key)) {
        it(`empty ${propName} hides`, async () => {
          const host = await render({ locale: 'en-US', [propName]: '' });
          expect((read(host, key) ?? '').trim()).toBe('');
        });
      } else {
        it(`empty ${propName} falls back`, async () => {
          const host = await render({ locale: 'en-US', [propName]: '' });
          expect(read(host, key)).toBe(table['en-US'][key]);
        });
      }
    }

    for (const { key, prop, render: renderInvalid, vars = {} } of validityCases) {
      const message = (host: Element) => lastValidity(host)?.message;
      const expected = (host: Element, locale: 'ro-MD' | 'en-US' | 'ru-MD') =>
        formatMessage(table[locale][key], host, locale, vars);

      it(`validity "${String(key)}" defaults to ro-MD`, async () => {
        const host = await renderInvalid({});
        expect(message(host)).toBe(expected(host, 'ro-MD'));
      });

      it(`validity "${String(key)}" follows a locale prop change`, async () => {
        const host = await renderInvalid({ locale: 'en-US' });
        expect(message(host)).toBe(expected(host, 'en-US'));
        (host as unknown as Record<string, unknown>).locale = 'ru-MD';
        await flush();
        expect(message(host)).toBe(expected(host, 'ru-MD'));
      });

      it(`validity "${String(key)}" follows the <html lang> observer`, async () => {
        await withLangObserver(async fire => {
          const host = await renderInvalid({}, 'en');
          try {
            expect(message(host)).toBe(expected(host, 'en-US'));
            langCarrier(host)?.setAttribute('lang', 'ru');
            fire();
            await flush();
            expect(message(host)).toBe(expected(host, 'ru-MD'));
          } finally {
            host.remove();
          }
        });
      });

      if (prop) {
        it(`validity override "${prop}" beats the locale`, async () => {
          const host = await renderInvalid({ locale: 'en-US', [prop]: 'Custom override' });
          expect(message(host)).toBe('Custom override');
        });

        it(`empty ${prop} falls back`, async () => {
          const host = await renderInvalid({ locale: 'en-US', [prop]: '' });
          expect(message(host)).toBe(expected(host, 'en-US'));
        });
      }
    }

    it('warns and renders ro-MD for an unsupported locale', async () => {
      // At least once: a component that hands `locale` down to a locale-aware child (e.g.
      // mud-time-input → mud-time-picker) warns once per component, each deduplicated on
      // its own `component|locale` key — never zero, but not pinned to exactly one either.
      resetLocaleWarnings();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const host = await render({ locale: 'de-DE' });
      await expectMessages(host, 'ro-MD');
      expect(warn.mock.calls.length).toBeGreaterThanOrEqual(1);
      warn.mockRestore();
    });

    it('re-renders its copy when locale changes after mount', async () => {
      const host = await render({ locale: 'en-US' });
      await expectMessages(host, 'en-US');
      (host as unknown as Record<string, unknown>).locale = 'ru-MD';
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      await expectMessages(host, 'ru-MD');
    });

    it('shows no ro-MD or en-US dictionary value under ru-MD', async () => {
      const host = await render({ locale: 'ru-MD' });
      for (const key of stringKeys) {
        const rendered = read(host, key);
        if (table['ro-MD'][key] !== table['ru-MD'][key]) expect(rendered).not.toBe(table['ro-MD'][key]);
        if (table['en-US'][key] !== table['ru-MD'][key]) expect(rendered).not.toBe(table['en-US'][key]);
      }
    });

    for (const key of pluralKeys) {
      const propName = pluralCounts[key];
      if (!propName) continue;
      it.each([1, 2, 5, 21])(`plural "${String(key)}" formats count %i for ro-MD`, async count => {
        const host = await render({ locale: 'ro-MD', [propName]: count });
        const plural = table['ro-MD'][key] as Plural;
        expect(read(host, key)).toBe(formatMessage(plural, host, 'ro-MD', { count }));
      });
    }
  });
};
