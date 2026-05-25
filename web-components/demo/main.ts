import '@age/design-system/dist/design-system/tokens/core.tokens.css';
import '@age/design-system/dist/design-system/tokens/core.dark.tokens.css';
import '@age/design-system/dist/design-system/design-system.css';
import './demo.css';

// Import the lazy bundle entry directly so Stencil resolves `getAssetPath()`
// relative to dist/design-system/ (where the SVG assets live) via import.meta.url.
import '@age/design-system/dist/design-system/design-system.esm.js';

import { CATEGORIES, locate, pagePath, type ComponentEntry } from './manifest';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'age-demo-theme';

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
  nav.append(el('a', { class: 'demo-header__back', href: '/index.html' }, 'Table of contents'));
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
  nav.append(buildThemeToggle());

  const header = el('header', { class: 'demo-header' }, lead, nav);
  document.body.insertBefore(header, document.body.firstChild);
  document.title = `${tag} · @age/web-components`;
}

/* ----------------------------------------------------------------- */
/* Table of contents (index.html)                                               */
/* ----------------------------------------------------------------- */
function renderToc() {
  const header = el(
    'header',
    { class: 'demo-header' },
    el('div', { class: 'demo-header__lead' }, el('h1', {}, '@age/web-components')),
    el('div', { class: 'demo-header__nav' }, buildThemeToggle()),
  );

  const p1 = el(
    'p',
    {},
    'Vanilla-HTML playground for the ',
    strong('compiled'),
    ' AGE Design System bundle. Each component lives on its own page and is exercised through its ',
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
  const intro = el('div', { class: 'toc__intro' }, p1, p2);

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
      li.dataset.search = `${entry.tag} ${entry.blurb ?? ''}`.toLowerCase();
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

  const main = el('main', { class: 'toc' }, intro, search, ...groups, empty);
  document.body.append(header, main);
  document.title = '@age/web-components — table of contents';
}

/* ----------------------------------------------------------------- */
/* Boot                                                               */
/* ----------------------------------------------------------------- */
function boot() {
  const tag = document.body.dataset.component;
  if (tag) renderComponentChrome(tag);
  else if ('toc' in document.body.dataset) renderToc();

  applyTheme(getInitialTheme());
  console.info('[demo] @age/design-system custom elements registered');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
