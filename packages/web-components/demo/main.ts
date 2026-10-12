import '@egov-moldova/mud/tokens/core.tokens.css';
import '@egov-moldova/mud/tokens/core.dark.tokens.css';
import '@egov-moldova/mud/styles.css';
import './demo.css';

import { defineCustomElements } from '@egov-moldova/mud-web-components';

import { CATEGORIES, indexPath, locate, pagePath, type ComponentEntry } from './manifest';

defineCustomElements();

type Theme = 'light' | 'dark';

type DemoLocale = 'ro-MD' | 'en-US' | 'ru-MD';

const THEME_STORAGE_KEY = 'mud-demo-theme';
const LANG_STORAGE_KEY = 'mud-demo-lang';

/** Language pickers name the language in that language; `ro-MD` is the library default. */
const LANG_OPTIONS: { value: DemoLocale; label: string; lang: string }[] = [
  { value: 'ro-MD', label: 'Română', lang: 'ro' },
  { value: 'en-US', label: 'English', lang: 'en' },
  { value: 'ru-MD', label: 'Русский', lang: 'ru' },
];

/* ----------------------------------------------------------------- */
/* Theme                                                              */
/* ----------------------------------------------------------------- */
function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (!button) return;
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  button.setAttribute('aria-pressed', String(theme === 'dark'));
  button.textContent = `Switch to ${next} mode`;
}

function buildThemeToggle(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('data-theme-toggle', '');
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    const current = (document.documentElement.dataset.theme as Theme) ?? 'light';
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  });
  return button;
}

/* ----------------------------------------------------------------- */
/* Language (component copy only — demo chrome and prose stay English) */
/* ----------------------------------------------------------------- */
const asDemoLocale = (value: string | null | undefined): DemoLocale | undefined =>
  LANG_OPTIONS.find(o => o.value === value)?.value;

/** `?lang=` beats the stored choice, which beats the library default. */
function getInitialLang(): DemoLocale {
  const fromUrl = asDemoLocale(new URLSearchParams(window.location.search).get('lang'));
  return fromUrl ?? asDemoLocale(localStorage.getItem(LANG_STORAGE_KEY)) ?? 'ro-MD';
}

function applyLang(lang: DemoLocale) {
  document.documentElement.lang = lang;
  const select = document.querySelector<HTMLSelectElement>('[data-lang-select]');
  if (select) select.value = lang;
}

/** A native <select>: a demo page loads only the component under test, never `mud-select`. */
function buildLangSelect(): HTMLSelectElement {
  const select = document.createElement('select');
  select.setAttribute('data-lang-select', '');
  select.setAttribute('aria-label', 'Component copy language');
  select.title = 'Changes the built-in component copy only; demo content stays in English';
  for (const option of LANG_OPTIONS) {
    const node = el('option', { value: option.value, lang: option.lang }, option.label);
    select.append(node);
  }
  select.addEventListener('change', () => {
    const lang = asDemoLocale(select.value);
    if (!lang) return;
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    // The explicit choice supersedes a `?lang=` override, or a reload would undo it.
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.delete('lang');
      window.history.replaceState(null, '', url);
    }
    applyLang(lang);
  });
  return select;
}

/* ----------------------------------------------------------------- */
/* Small DOM helpers                                                  */
/* ----------------------------------------------------------------- */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return node;
}

const strong = (t: string) => el('strong', {}, t);
const code = (t: string) => el('code', {}, t);

/** Flat, category-ordered list of every component for sequential prev/next. */
const FLAT: { entry: ComponentEntry; slug: string }[] = CATEGORIES.flatMap(cat =>
  cat.components.map(entry => ({ entry, slug: cat.slug })),
);

/* ----------------------------------------------------------------- */
/* Per-component page header                                          */
/* ----------------------------------------------------------------- */
function renderComponentChrome(tag: string) {
  const found = locate(tag);
  const flatIndex = FLAT.findIndex(f => f.entry.tag === tag);
  const prev = flatIndex > 0 ? FLAT[flatIndex - 1] : undefined;
  const next = flatIndex >= 0 && flatIndex < FLAT.length - 1 ? FLAT[flatIndex + 1] : undefined;

  const lead = el('div', { class: 'demo-header__lead' }, el('h1', {}, `<${tag}>`));
  if (found) lead.append(el('span', { class: 'label' }, found.category.title));

  const nav = el('div', { class: 'demo-header__nav' });
  nav.append(el('a', { class: 'demo-header__back', href: indexPath() }, 'Table of contents'));
  nav.append(
    prev
      ? el('a', { href: pagePath(prev.slug, prev.entry.tag), title: 'Previous component' }, `← ${prev.entry.tag}`)
      : el('span', {}, ''),
  );
  nav.append(
    next
      ? el('a', { href: pagePath(next.slug, next.entry.tag), title: 'Next component' }, `${next.entry.tag} →`)
      : el('span', {}, ''),
  );
  nav.append(buildLangSelect(), buildThemeToggle());

  const header = el('header', { class: 'demo-header', lang: 'en' }, lead, nav);
  document.body.insertBefore(header, document.body.firstChild);
  document.title = `${tag} · @egov-moldova/mud-web-components`;
}

/* ----------------------------------------------------------------- */
/* Table of contents (index.html)                                               */
/* ----------------------------------------------------------------- */
function renderToc() {
  const header = el(
    'header',
    { class: 'demo-header', lang: 'en' },
    el('div', { class: 'demo-header__lead' }, el('h1', {}, '@egov-moldova/mud-web-components')),
    el('div', { class: 'demo-header__nav' }, buildLangSelect(), buildThemeToggle()),
  );

  const p1 = el(
    'p',
    {},
    'Vanilla-HTML playground for the ',
    strong('compiled'),
    ' MUD Design System bundle. Each component lives on its own page and is exercised through its ',
    strong('public API only'),
    ' — the way a downstream consumer integrates it. One component per page means the browser console shows ',
    strong('only that component’s'),
    ' warnings, so real integration issues are easy to attribute.',
  );
  const p2 = el(
    'p',
    { class: 'muted' },
    'Array / object props (table ',
    code('rows'),
    ', select ',
    code('options'),
    ', breadcrumb ',
    code('items'),
    ', …) are assigned as JS ',
    strong('properties'),
    ' via ',
    code('customElements.whenDefined()'),
    '. Some edge specimens intentionally feed invalid input, so a few dev-time ',
    code('console.warn'),
    ' messages are expected.',
  );
  const intro = el('div', { class: 'toc__intro', lang: 'en' }, p1, p2);

  const search = el('input', {
    'class': 'toc__search',
    'type': 'search',
    'placeholder': 'Filter components…',
    'aria-label': 'Filter components',
  }) as HTMLInputElement;

  const groups: HTMLElement[] = [];
  for (const cat of CATEGORIES) {
    const list = el('ul', { class: 'toc__list' });
    for (const entry of cat.components) {
      const card = el(
        'a',
        { class: 'toc__card', href: pagePath(cat.slug, entry.tag) },
        el('span', { class: 'toc__card-tag' }, entry.tag),
      );
      if (entry.blurb) card.append(el('span', { class: 'toc__card-blurb' }, entry.blurb));
      const li = el('li', {}, card);
      li.dataset.search = `${entry.tag} ${entry.blurb ?? ''} ${cat.title}`.toLowerCase();
      list.append(li);
    }
    groups.push(el('section', { class: 'toc__group' }, el('h2', {}, cat.title), list));
  }

  const empty = el('p', { class: 'toc__empty', hidden: 'hidden' }, 'No components match your filter.');

  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let anyVisible = false;
    for (const group of groups) {
      let groupVisible = false;
      group.querySelectorAll<HTMLLIElement>('li').forEach(li => {
        const match = !q || (li.dataset.search ?? '').includes(q);
        li.hidden = !match;
        if (match) groupVisible = true;
      });
      group.hidden = !groupVisible;
      if (groupVisible) anyVisible = true;
    }
    empty.hidden = anyVisible;
  });

  // `/` jumps to the filter unless the user is already typing somewhere (composedPath
  // reaches into shadow roots, where a component's own input is the real target).
  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.composedPath()[0];
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    ) {
      return;
    }
    event.preventDefault();
    search.focus();
  });

  const main = el('main', { class: 'toc' }, intro, search, ...groups, empty);
  document.body.append(header, main);
  document.title = '@egov-moldova/mud-web-components — table of contents';
}

/* ----------------------------------------------------------------- */
/* Boot                                                               */
/* ----------------------------------------------------------------- */
function boot() {
  const tag = document.body.dataset.component;
  if (tag) renderComponentChrome(tag);
  else if ('toc' in document.body.dataset) renderToc();

  applyTheme(getInitialTheme());
  applyLang(getInitialLang());
  console.info('[demo] @egov-moldova/mud custom elements registered');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
