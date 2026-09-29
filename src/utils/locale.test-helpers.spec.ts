import { describe, render } from '@stencil/vitest';

import { describeLocales } from './locale.test-helpers';
import type { LocaleMessages, Plural } from './locale';
import { formatMessage, hostLang, localeMessages, watchDocumentLang } from './locale';

interface FixtureMessages {
  closeLabel: string;
  rejectedAnnouncement: Plural;
}

const FIXTURE_MESSAGES: LocaleMessages<FixtureMessages> = {
  'ro-MD': {
    closeLabel: 'Închide',
    rejectedAnnouncement: {
      one: '{count} fișier respins',
      few: '{count} fișiere respinse',
      other: '{count} de fișiere respinse',
    },
  },
  'en-US': {
    closeLabel: 'Close',
    rejectedAnnouncement: { one: '{count} file rejected', other: '{count} files rejected' },
  },
  'ru-MD': {
    closeLabel: 'Закрыть',
    rejectedAnnouncement: {
      one: '{count} файл отклонён',
      few: '{count} файла отклонены',
      many: '{count} файлов отклонены',
      other: '{count} файла отклонены',
    },
  },
};

/** A minimal, non-Stencil custom element exercising `localeMessages` + `formatMessage`. */
class MudLocaleFixture extends HTMLElement {
  static get observedAttributes() {
    return ['locale', 'close-label'];
  }

  private stopLang?: () => void;

  connectedCallback() {
    // A Stencil component gets this class when it hydrates; `render()` polls for it (5 s) before
    // returning. This plain custom element never hydrates, so it sets the flag itself.
    this.classList.add('hydrated');
    // Mirrors a real Stencil component's `connectedCallback` `watchDocumentLang` wiring, so this
    // fixture re-renders when an ancestor's `lang` changes too.
    this.stopLang = watchDocumentLang(
      this,
      () => this.locale,
      () => this.paint(),
    );
    this.paint();
  }

  disconnectedCallback() {
    this.stopLang?.();
  }

  attributeChangedCallback() {
    this.paint();
  }

  get locale(): string | null {
    return this.getAttribute('locale');
  }

  set locale(value: string | null | undefined) {
    // A real Stencil component removes the attribute on `undefined` too (its generated setter
    // never stringifies a nullish prop); this hand-rolled fixture must match, or clearing
    // `locale` here writes the literal string `"undefined"` instead of unsetting it.
    if (value === null || value === undefined) this.removeAttribute('locale');
    else this.setAttribute('locale', value);
  }

  /** The `lang` THIS fixture wrote on its own last paint (mirrors Stencil's own vnode bookkeeping). */
  private lastPaintedLang?: string;

  private paint() {
    // Mirrors a real Stencil component's `<Host lang={hostLang(this.host, this.locale)}>`: the
    // vdom only ever adds/removes an attribute IT previously rendered a value for — it never
    // reads the live DOM to decide, so a `lang` the consumer set directly (never rendered by
    // this fixture) is left untouched when `hostLang` returns `undefined`.
    const lang = hostLang(this, this.locale);
    if (lang) this.setAttribute('lang', lang);
    else if (this.lastPaintedLang !== undefined) this.removeAttribute('lang');
    this.lastPaintedLang = lang;
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
    const overrides = { closeLabel: this.getAttribute('close-label') };
    const m = localeMessages('mud-locale-fixture', this, this.locale, FIXTURE_MESSAGES, overrides);
    const count = Number(this.getAttribute('rejected-count') ?? '0');
    const announcement = formatMessage(
      FIXTURE_MESSAGES[resolvedTableLocale(this)].rejectedAnnouncement,
      this,
      this.locale,
      {
        count,
      },
    );
    shadow.textContent = '';
    const closeSpan = document.createElement('span');
    closeSpan.className = 'close-label';
    closeSpan.appendChild(document.createTextNode(m.closeLabel));
    const rejectedSpan = document.createElement('span');
    rejectedSpan.className = 'rejected';
    rejectedSpan.appendChild(document.createTextNode(announcement));
    shadow.appendChild(closeSpan);
    shadow.appendChild(rejectedSpan);
  }
}

// `formatMessage` resolves its own locale internally; this only picks which table row a
// plural override (never used here) would need — kept simple since the fixture has none.
function resolvedTableLocale(el: MudLocaleFixture): 'ro-MD' | 'en-US' | 'ru-MD' {
  const raw = (el.locale ?? '').toLowerCase();
  if (raw.startsWith('en')) return 'en-US';
  if (raw.startsWith('ru')) return 'ru-MD';
  return 'ro-MD';
}

if (!customElements.get('mud-locale-fixture')) customElements.define('mud-locale-fixture', MudLocaleFixture);

const attrsFrom = (props: Record<string, unknown>): string => {
  const map: Record<string, string> = { locale: 'locale', closeLabel: 'close-label', rejectedCount: 'rejected-count' };
  return Object.entries(props)
    .map(([key, value]) => `${map[key] ?? key}="${String(value)}"`)
    .join(' ');
};

// A case that waits out a timeout again fails here instead of costing seconds silently.
describe('mud-locale-fixture', { timeout: 1000 }, () => {
  describeLocales('mud-locale-fixture', FIXTURE_MESSAGES, {
    render: async (props, ancestorLang) => {
      const html = `<mud-locale-fixture ${attrsFrom(props)}></mud-locale-fixture>`;
      const { root } = await render(html, ancestorLang ? { stageAttrs: { lang: ancestorLang } } : undefined);
      return root as Element;
    },
    read: (host, key) => {
      if (key === 'closeLabel') return host.shadowRoot?.querySelector('.close-label')?.textContent ?? null;
      if (key === 'rejectedAnnouncement') return host.shadowRoot?.querySelector('.rejected')?.textContent ?? null;
      return null;
    },
    overrides: { closeLabel: 'closeLabel' },
    pluralCounts: { rejectedAnnouncement: 'rejectedCount' },
  });
});
