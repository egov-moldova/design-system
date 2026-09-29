/** Locales with a built-in translation for every component's copy. */
export const MUD_LOCALES = ['ro-MD', 'ru-MD', 'en-US'] as const;

export type MudLocale = (typeof MUD_LOCALES)[number];

/** The library's language: used when neither `locale` nor an ancestor `lang` names a supported one. */
export const DEFAULT_LOCALE: MudLocale = 'ro-MD';

/** A component's built-in strings, one entry per key, for every supported locale. */
export type LocaleMessages<M> = Record<MudLocale, M>;

/**
 * The `locale` prop's type: autocompletes the three built-in locales, but accepts any BCP-47
 * tag, matching `resolveLocale`'s runtime subtag resolution (`en-GB` → `en-US`).
 */
export type LocaleProp = MudLocale | (string & {});

/**
 * The supported locale a BCP-47 tag resolves to: the exact tag first, then its language
 * subtag (`en-GB` → `en-US`, `ro` → `ro-MD`, a Romanian tag of another region → `ro-MD`). Case-insensitive; `undefined` when none matches.
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
    // Only a shadow root (nodeType 11) is crossed to its host. In mock-doc a detached Stencil
    // host's own `host` property is the element itself, so reading `.host` off any parentless
    // node would loop forever on a render scheduled after `remove()`.
    node = node.parentNode ?? (node.nodeType === 11 ? (node as ShadowRoot).host : null);
  }
  return undefined;
};

const warned = new Set<string>();

/** Resolution with no warning side effect: the `locale` prop, else the ancestor `lang`, else `ro-MD`. */
const resolveLocaleQuiet = (host: Element, locale: string | null | undefined): MudLocale => {
  if (locale && locale.trim()) return matchLocale(locale) ?? DEFAULT_LOCALE;
  return matchLocale(inheritedLang(host)) ?? DEFAULT_LOCALE;
};

/**
 * The locale a component renders its copy in: its own `locale` prop, else the closest
 * ancestor `lang`, else `ro-MD`. An explicit `locale` with no translation warns once per
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
 * override applied on top. Three classes of override prop exist (`scripts/eslint/override-classes.json`):
 * - an accessible name (`*Label`, `*AriaLabel`, announcements) and a validation message
 *   (`*Message`, `*ErrorText`, `requiredText`): wins only when it is a non-empty string — an
 *   empty `aria-label` names nothing, and `setValidity` throws on an empty message;
 * - a visible optional caption, listed in `captions`: any string wins, `""` included, so
 *   `""` renders nothing, exactly as HTML's own `placeholder=""` does. Only `undefined` / `null`
 *   falls back to the dictionary.
 * A plural message's override stays a plain string, applied for every count — the same rule,
 * since `messages[key]` only ever holds a string once an override wins.
 *
 * @param captions The keys whose override may be an empty string. Caption keys only: the list
 *   is checked against `override-classes.json` by `scripts/check-locale-specs.mjs`.
 */
export const localeMessages = <M extends { [K in keyof M]: string | Plural }>(
  component: string,
  host: Element,
  locale: string | null | undefined,
  table: LocaleMessages<M>,
  overrides: { [K in keyof M]?: string | null } = {},
  captions: ReadonlyArray<keyof M> = [],
): M => {
  const messages = { ...table[resolveLocale(component, host, locale)] };
  for (const key of Object.keys(overrides) as Array<keyof M>) {
    const value = overrides[key];
    if (typeof value !== 'string') continue;
    if (value.trim().length > 0 || captions.includes(key)) messages[key] = value as M[keyof M];
  }
  return messages;
};

/**
 * Canonical BCP-47 tag for `Intl` number/date/region formatting — never for picking a
 * dictionary (see `resolveLocale`). `_` separators are normalised to `-` first (`en_US` →
 * `en-US`), then `Intl.getCanonicalLocales` canonicalises the syntax; a tag that fails to
 * parse (`xx-!!`) falls back to the `MudLocale` it matches, else `ro-MD` — never throws.
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

/**
 * The BCP-47 tag every `Intl` call in a component uses (numbers, dates, region names), and
 * the `lang` of a component's shadow root once `locale` is explicit. The `locale` prop, else
 * the closest ancestor `lang`, else `DEFAULT_LOCALE`, canonicalised by `intlTag`:
 * - a tag with no region whose language has a `MudLocale` takes that locale's region
 *   (`ro` → `ro-MD`, `ru` → `ru-MD`);
 * - a tag with a region whose language has a `MudLocale` is used as given (`en-GB`, a Romanian tag of another region);
 * - a tag whose language has no `MudLocale` (`de-DE`) resolves to the shown dictionary's
 *   locale, so a component never mixes Romanian labels with German dates.
 * An explicit `locale` with no dictionary warns once, exactly as `resolveLocale` does.
 */
export const formatLocale = (host: Element, locale: string | null | undefined): string => {
  const raw = locale && locale.trim() ? locale : inheritedLang(host);
  if (!raw || !raw.trim()) return DEFAULT_LOCALE;
  const tag = intlTag(raw);
  const language = tag.split('-')[0].toLowerCase();
  const own = MUD_LOCALES.find(candidate => candidate.split('-')[0] === language);
  // Warns once per component and tag for an explicit unsupported `locale` (the host's tag name is
  // the component name), so a component that never asks for a message still reports it.
  if (!own) return resolveLocale(host.localName, host, locale);
  let region: string | undefined;
  try {
    region = new Intl.Locale(tag).region;
  } catch {
    region = undefined;
  }
  return region ? tag : own;
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

const numberFormatCache = new Map<string, Intl.NumberFormat>();

/** A grouping-off `Intl.NumberFormat` for `tag`, cached per resolved tag (never per call). */
const numberFormatFor = (tag: string): Intl.NumberFormat => {
  let formatter = numberFormatCache.get(tag);
  if (!formatter) {
    formatter = new Intl.NumberFormat(tag, { useGrouping: false, maximumFractionDigits: 20 });
    numberFormatCache.set(tag, formatter);
  }
  return formatter;
};

const isPlural = (value: string | Plural): value is Plural => typeof value === 'object' && value !== null;

/**
 * Fills `{name}` placeholders. A number is formatted in the component's `formatLocale` with
 * grouping off (`{max}` = 1000 → `1000`, never `1.000`; `{min}` = 0.5 → `0,5` under `ro-MD`),
 * so a message never shows a number the numeric parser would read back ambiguously.
 */
const fillPlaceholders = (
  text: string,
  host: Element,
  locale: string | null | undefined,
  vars: Record<string, string | number>,
): string => {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!(name in vars)) return match;
    const value = vars[name];
    if (typeof value !== 'number' || !Number.isFinite(value)) return String(value);
    return numberFormatFor(formatLocale(host, locale)).format(value);
  });
};

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
  if (!isPlural(value)) return fillPlaceholders(value, host, locale, vars);
  const resolved = resolveLocaleQuiet(host, locale);
  const count = Number(vars.count);
  const category = Number.isFinite(count) ? pluralRulesFor(resolved).select(count) : 'other';
  // `Intl.PluralRules.select` can also return 'zero' / 'two', which `Plural` has no form for —
  // only look up a category the interface actually declares, falling back to `other` otherwise.
  const text =
    (category === 'one' || category === 'few' || category === 'many' ? value[category] : undefined) ?? value.other;
  return fillPlaceholders(text, host, locale, vars);
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

/**
 * The `lang` a component with an explicit `locale` puts on the outermost element inside its
 * shadow root (WCAG 3.1.2, `_agents/localization.md` §7) — never on the host itself, whose
 * attribute is visible to `inheritedLang` on every descendant, including slotted light-DOM
 * content and a nested `mud-*` component reading an ancestor `lang`. `undefined` when `locale`
 * is unset, so the shadow element inherits normally.
 */
export const shadowLang = (host: Element, locale: string | null | undefined): string | undefined =>
  locale ? formatLocale(host, locale) : undefined;

/**
 * `observeDocumentLang`, labeled with the host's own tag so a throwing listener is traceable to
 * its component: `console.error('[<tag>] lang-change listener threw', err)`. `onChange` typically
 * calls `forceUpdate(this)`.
 *
 * @returns A function that stops listening; call it from `disconnectedCallback`.
 */
export const watchDocumentLang = (host: Element, onChange: () => void): (() => void) =>
  observeDocumentLang(() => {
    try {
      onChange();
    } catch (err) {
      console.error(`[${host.localName}] lang-change listener threw`, err);
    }
  });
