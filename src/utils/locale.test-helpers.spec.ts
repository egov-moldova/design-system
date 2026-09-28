import { render } from '@stencil/vitest';

import { describeLocales } from './locale.test-helpers';
import type { LocaleMessages, Plural } from './locale';
import { formatMessage, localeMessages } from './locale';

interface FixtureMessages {
  closeLabel: string;
  rejectedAnnouncement: Plural;
}

const FIXTURE_MESSAGES: LocaleMessages<FixtureMessages> = {
  'ro-RO': {
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
  'ru-RU': {
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

  connectedCallback() {
    this.paint();
  }

  attributeChangedCallback() {
    this.paint();
  }

  get locale(): string | null {
    return this.getAttribute('locale');
  }

  set locale(value: string | null) {
    if (value === null) this.removeAttribute('locale');
    else this.setAttribute('locale', value);
  }

  private paint() {
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
    shadow.innerHTML = `<span class="close-label">${m.closeLabel}</span><span class="rejected">${announcement}</span>`;
  }
}

// `formatMessage` resolves its own locale internally; this only picks which table row a
// plural override (never used here) would need — kept simple since the fixture has none.
function resolvedTableLocale(el: MudLocaleFixture): 'ro-RO' | 'en-US' | 'ru-RU' {
  const raw = (el.locale ?? '').toLowerCase();
  if (raw.startsWith('en')) return 'en-US';
  if (raw.startsWith('ru')) return 'ru-RU';
  return 'ro-RO';
}

if (!customElements.get('mud-locale-fixture')) customElements.define('mud-locale-fixture', MudLocaleFixture);

const attrsFrom = (props: Record<string, unknown>): string => {
  const map: Record<string, string> = { locale: 'locale', closeLabel: 'close-label', rejectedCount: 'rejected-count' };
  return Object.entries(props)
    .map(([key, value]) => `${map[key] ?? key}="${String(value)}"`)
    .join(' ');
};

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
