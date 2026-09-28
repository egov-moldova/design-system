/** Locales with a built-in translation for every component's copy. */
export const MUD_LOCALES = ['ro-RO', 'en-US', 'ru-RU'] as const;

export type MudLocale = (typeof MUD_LOCALES)[number];

/** The library's language: used when neither `locale` nor an ancestor `lang` names a supported one. */
export const DEFAULT_LOCALE: MudLocale = 'ro-RO';

/** A component's built-in strings, one entry per key, for every supported locale. */
export type LocaleMessages<M> = Record<MudLocale, M>;

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

/**
 * The locale a component renders its copy in: its own `locale` prop, else the closest
 * ancestor `lang`, else `ro-RO`. An explicit `locale` with no translation warns once per
 * component and tag; an unsupported page `lang` does not, since the page did not address
 * the library.
 */
export const resolveLocale = (component: string, host: Element, locale: string | null | undefined): MudLocale => {
  if (locale && locale.trim()) {
    const match = matchLocale(locale);
    if (match) return match;
    const key = `${component}|${locale}`;
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(
        `[${component}] locale="${locale}" has no built-in translations. Supported: ${MUD_LOCALES.join(
          ', ',
        )}. Falling back to "${DEFAULT_LOCALE}".`,
      );
    }
    return DEFAULT_LOCALE;
  }
  return matchLocale(inheritedLang(host)) ?? DEFAULT_LOCALE;
};

/**
 * A component's built-in strings in its resolved locale (see `resolveLocale`), with each
 * override applied on top. An override wins only when it is a non-empty string: an empty
 * `aria-label` names nothing, so it is never what a consumer meant.
 */
export const localeMessages = <M extends { [K in keyof M]: string }>(
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
    langObserver = new MutationObserver(() => langListeners.forEach(listener => listener()));
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
