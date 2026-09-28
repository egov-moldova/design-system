/** Locales with a built-in translation for every component's copy. */
export const MUD_LOCALES = ['ro-RO', 'en-US', 'ru-RU'] as const;

export type MudLocale = (typeof MUD_LOCALES)[number];

/** The library's language: used when neither `locale` nor an ancestor `lang` names a supported one. */
export const DEFAULT_LOCALE: MudLocale = 'ro-RO';

/** A component's built-in strings, one entry per key, for every supported locale. */
export type LocaleMessages<M> = Record<MudLocale, M>;

/**
 * The `locale` prop's type: autocompletes the three built-in locales, but accepts any BCP-47
 * tag, matching `resolveLocale`'s runtime subtag resolution (`en-GB` → `en-US`).
 */
export type LocaleProp = MudLocale | (string & {});

/**
 * The supported locale a BCP-47 tag resolves to: the exact tag first, then its language
 * subtag (`en-GB` → `en-US`, `ro` → `ro-RO`). Case-insensitive; `undefined` when none matches.
 */
export const matchLocale = (tag: string | null | undefined): MudLocale | undefined => {
  const wanted = tag?.trim().toLowerCase();
  if (!wanted) return undefined;
  const exact = MUD_LOCALES.find(locale => locale.toLowerCase() === wanted);
  if (exact) return exact;
  const language = wanted.split(/[-_]/)[0];
  return MUD_LOCALES.find(locale => locale.toLowerCase().split('-')[0] === language);
};

/**
 * The `lang` of the closest ancestor that sets one, crossing shadow roots, so a component
 * rendered inside another component's shadow DOM still reads the page's language.
 * An empty `lang=""` means "unknown" in HTML and stops the search.
 */
export const inheritedLang = (el: Element): string | undefined => {
  let node: Node | null = el;
  while (node) {
    if (node.nodeType === 1 && (node as Element).hasAttribute('lang')) {
      return (node as Element).getAttribute('lang') || undefined;
    }
    node = node.parentNode ?? (node as ShadowRoot).host ?? null;
  }
  return undefined;
};

const warned = new Set<string>();

/** Resolution with no warning side effect: the `locale` prop, else the ancestor `lang`, else `ro-RO`. */
const resolveLocaleQuiet = (host: Element, locale: string | null | undefined): MudLocale => {
  if (locale && locale.trim()) return matchLocale(locale) ?? DEFAULT_LOCALE;
  return matchLocale(inheritedLang(host)) ?? DEFAULT_LOCALE;
};

/**
 * The locale a component renders its copy in: its own `locale` prop, else the closest
 * ancestor `lang`, else `ro-RO`. An explicit `locale` with no translation warns once per
 * component and tag; an unsupported page `lang` does not, since the page did not address
 * the library.
 */
export const resolveLocale = (component: string, host: Element, locale: string | null | undefined): MudLocale => {
  if (locale && locale.trim() && !matchLocale(locale)) {
    const key = `${component}|${locale}`;
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(
        `[${component}] locale="${locale}" has no built-in translations. Supported: ${MUD_LOCALES.join(
          ', ',
        )}. Falling back to "${DEFAULT_LOCALE}".`,
      );
    }
  }
  return resolveLocaleQuiet(host, locale);
};

/**
 * The `MudLocale` whose dictionary a component shows — identical resolution to
 * `resolveLocale`, reused by the recipe to set the shadow root's `lang` attribute
 * once `locale` is explicit. Calling it after `messages()` already resolved the same
 * `(component, host, locale)` triple never re-warns: `resolveLocale`'s warning is
 * deduplicated per `component|locale` key, not per call.
 */
export const resolvedLocale = resolveLocale;

/** Resets the once-per-`component|locale` warning dedup. Test-only: call between specs asserting a warning. */
export const resetLocaleWarnings = (): void => {
  warned.clear();
};

/** Every built-in string is a plain string, or a plural form set keyed by `Intl.PluralRules` category. */
export interface Plural {
  one?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * A component's built-in strings in its resolved locale (see `resolveLocale`), with each
 * override applied on top. An override wins only when it is a non-empty string: an empty
 * `aria-label` names nothing, so it is never what a consumer meant. A plural message's
 * override stays a plain string, applied for every count — the same rule, since `messages[key]`
 * only ever holds a string once an override wins.
 */
export const localeMessages = <M extends { [K in keyof M]: string | Plural }>(
  component: string,
  host: Element,
  locale: string | null | undefined,
  table: LocaleMessages<M>,
  overrides: { [K in keyof M]?: string | null } = {},
): M => {
  const messages = { ...table[resolveLocale(component, host, locale)] };
  for (const key of Object.keys(overrides) as Array<keyof M>) {
    const value = overrides[key];
    if (typeof value === 'string' && value.trim().length > 0) messages[key] = value as M[keyof M];
  }
  return messages;
};

/**
 * Canonical BCP-47 tag for `Intl` number/date/region formatting — never for picking a
 * dictionary (see `resolveLocale`). `_` separators are normalised to `-` first (`en_US` →
 * `en-US`), then `Intl.getCanonicalLocales` canonicalises the syntax; a tag that fails to
 * parse (`xx-!!`) falls back to the `MudLocale` it matches, else `ro-RO` — never throws.
 */
export const intlTag = (raw: string | null | undefined): string => {
  const normalized = raw?.trim().replace(/_/g, '-');
  if (normalized) {
    try {
      const [canonical] = Intl.getCanonicalLocales(normalized);
      if (canonical) return canonical;
    } catch {
      // Falls through to the MudLocale match below.
    }
  }
  return matchLocale(raw) ?? DEFAULT_LOCALE;
};

const pluralRulesCache = new Map<string, Intl.PluralRules>();

const pluralRulesFor = (locale: MudLocale): Intl.PluralRules => {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(intlTag(locale));
    pluralRulesCache.set(locale, rules);
  }
  return rules;
};

const isPlural = (value: string | Plural): value is Plural => typeof value === 'object' && value !== null;

const fillPlaceholders = (text: string, vars: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));

/**
 * A built-in string or `Plural`, in its final rendered form: `{name}` placeholders filled
 * from `vars`, and — for a `Plural` — the form `Intl.PluralRules` selects for `vars.count`
 * under the RESOLVED `MudLocale` (the dictionary actually shown), never the raw `locale` tag.
 * A `Plural` with no usable `vars.count` (missing, non-finite) renders its `other` form.
 */
export const formatMessage = (
  value: string | Plural,
  host: Element,
  locale: string | null | undefined,
  vars: Record<string, string | number> = {},
): string => {
  if (!isPlural(value)) return fillPlaceholders(value, vars);
  const resolved = resolveLocaleQuiet(host, locale);
  const count = Number(vars.count);
  const category = Number.isFinite(count) ? pluralRulesFor(resolved).select(count) : 'other';
  const text = value[category as keyof Plural] ?? value.other;
  return fillPlaceholders(text, vars);
};

const langListeners = new Set<() => void>();
let langObserver: MutationObserver | undefined;

/**
 * Calls `onChange` whenever `<html lang>` changes, so a mounted component re-renders its copy
 * when an app switches language. One observer serves every component. A `lang` changed on an
 * intermediate ancestor is read on the component's next render only. Without
 * `MutationObserver` (the hydrate build, mock-doc) nothing is observed.
 *
 * @returns A function that stops listening; call it from `disconnectedCallback`.
 */
export const observeDocumentLang = (onChange: () => void): (() => void) => {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return () => undefined;
  langListeners.add(onChange);
  if (!langObserver) {
    langObserver = new MutationObserver(() => {
      // A listener that throws must not stop the rest — each is independent.
      for (const listener of langListeners) {
        try {
          listener();
        } catch (err) {
          console.error(err);
        }
      }
    });
    langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }
  return () => {
    langListeners.delete(onChange);
    if (langListeners.size === 0) {
      langObserver?.disconnect();
      langObserver = undefined;
    }
  };
};
