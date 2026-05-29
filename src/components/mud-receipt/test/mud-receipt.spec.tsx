import { render, h, describe, it, expect, vi } from '@stencil/vitest';

// Side-effect import: stencilVitestPlugin appends a customElements.define call
// so the element is registered before render().
import '../mud-receipt';

import { RECEIPT_SERVICES, RECEIPT_STATUSES } from '../mud-receipt.types';
import { encodeQrModules } from '../qr/qr-encoder';
import {
  SERVICE_DEFAULT_TITLE,
  SERVICE_LOGO_NAME,
  STATUS_DEFAULT_LABEL,
  STATUS_TAG_SEMANTIC,
  formatReceiptDate,
  maskIdnp,
} from '../mud-receipt.utils';

// ------ Pure helper tests ----------------------------------------------------

describe('mud-receipt — pure helpers', () => {
  describe('maskIdnp', () => {
    it('keeps the first 4 and last 3 digits, replaces the middle 6 with asterisks', () => {
      expect(maskIdnp('2002003456789')).toBe('2002******789');
    });
    it('returns empty string for nullish input', () => {
      expect(maskIdnp(undefined)).toBe('');
      expect(maskIdnp('')).toBe('');
    });
    it('returns the input unchanged when it does not match the 13-digit pattern', () => {
      expect(maskIdnp('not-an-idnp')).toBe('not-an-idnp');
      expect(maskIdnp('2002')).toBe('2002');
      expect(maskIdnp('20020034567890000')).toBe('20020034567890000');
    });
  });

  describe('formatReceiptDate', () => {
    it('formats an ISO date through Intl.DateTimeFormat with the ro-RO locale by default', () => {
      const out = formatReceiptDate('2026-05-22T14:32:00Z');
      // We can't assert the exact string (timezone-dependent), but it should
      // contain a 4-digit year and the Romanian month name "mai".
      expect(out).toMatch(/2026/);
      expect(out.toLowerCase()).toContain('mai');
    });
    it('returns empty string for nullish input', () => {
      expect(formatReceiptDate(undefined)).toBe('');
    });
    it('returns the raw input when parsing fails', () => {
      expect(formatReceiptDate('not-a-date')).toBe('not-a-date');
    });
  });

  describe('service → defaults maps', () => {
    it('has a logo asset name for every service', () => {
      for (const s of RECEIPT_SERVICES) {
        expect(SERVICE_LOGO_NAME[s]).toBeTruthy();
        expect(SERVICE_LOGO_NAME[s]).toContain(s);
      }
    });
    it('has a Romanian default title for every service', () => {
      for (const s of RECEIPT_SERVICES) {
        expect(SERVICE_DEFAULT_TITLE[s].length).toBeGreaterThan(0);
      }
    });
  });

  describe('status → tag semantic + label maps', () => {
    it('has a tag semantic for every status', () => {
      for (const st of RECEIPT_STATUSES) {
        expect(STATUS_TAG_SEMANTIC[st]).toMatch(/^(success|brand|warning|danger)$/);
      }
    });
    it('has a Romanian label for every status', () => {
      expect(STATUS_DEFAULT_LABEL.paid).toBe('Plătit');
      expect(STATUS_DEFAULT_LABEL.confirmed).toBe('Confirmat');
      expect(STATUS_DEFAULT_LABEL.pending).toBe('În curs');
      expect(STATUS_DEFAULT_LABEL.failed).toBe('Refuzat');
    });
  });

  describe('QR encoder', () => {
    it('encodes a short payload to a square module matrix', () => {
      const m = encodeQrModules('hello');
      expect(m.length).toBeGreaterThan(0);
      expect(m.length).toBe(m[0].length);
    });
    it('encodes a URL payload and produces at least one dark module', () => {
      const m = encodeQrModules('https://verify.mpay.gov.md/tx/0001');
      const darkCount = m.reduce((acc, row) => acc + row.filter(Boolean).length, 0);
      expect(darkCount).toBeGreaterThan(0);
    });
    it('is deterministic — same input yields identical output', () => {
      const a = encodeQrModules('deterministic');
      const b = encodeQrModules('deterministic');
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
    it('throws when payload is too large', () => {
      // 40 modules max ~ ~2953 bytes at level M, byte mode. 5000 chars goes over.
      const huge = 'x'.repeat(5000);
      expect(() => encodeQrModules(huge)).toThrow();
    });
  });
});

// ------ Component render tests -----------------------------------------------

const queryStatus = (root: Element | null | undefined): Element | null =>
  root?.shadowRoot?.querySelector('mud-tag.receipt-status') ?? null;
const queryTitle = (root: Element | null | undefined): Element | null =>
  root?.shadowRoot?.querySelector('.receipt-title') ?? null;
const queryAmount = (root: Element | null | undefined): Element | null =>
  root?.shadowRoot?.querySelector('.receipt-amount-value') ?? null;
const queryQr = (root: Element | null | undefined): Element | null =>
  root?.shadowRoot?.querySelector('.qr-svg') ?? null;
const queryButtons = (root: Element | null | undefined): NodeListOf<Element> | undefined =>
  root?.shadowRoot?.querySelectorAll('.receipt-actions mud-button');

describe('mud-receipt — component', () => {
  describe('defaults', () => {
    it('reflects service="mpay" by default', async () => {
      const { root } = await render(<mud-receipt></mud-receipt>);
      expect(root?.getAttribute('service')).toBe('mpay');
    });

    it('renders a role="article" host with an accessible name', async () => {
      const { root } = await render(<mud-receipt></mud-receipt>);
      expect(root?.getAttribute('role')).toBe('article');
      expect(root?.getAttribute('aria-label')).toBe('Bon de plată');
    });

    it('renders the Romanian default title when no title prop is set', async () => {
      const { root } = await render(<mud-receipt></mud-receipt>);
      expect(queryTitle(root)?.textContent).toBe('Bon de plată');
    });

    it('renders one default mud-button per primary action', async () => {
      const { root } = await render(<mud-receipt status="paid" amount="150,00"></mud-receipt>);
      const buttons = queryButtons(root);
      expect(buttons?.length).toBe(4);
    });
  });

  describe('service prop', () => {
    it.each(RECEIPT_SERVICES)('reflects service="%s" on the host', async service => {
      const { root } = await render(<mud-receipt service={service}></mud-receipt>);
      expect(root?.getAttribute('service')).toBe(service);
    });
    it('falls back to mpay on an invalid service string', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // @ts-expect-error — exercising runtime guard
      const { root } = await render(<mud-receipt service="bogus"></mud-receipt>);
      expect(root?.getAttribute('service')).toBe('mpay');
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('status prop', () => {
    it.each(RECEIPT_STATUSES)('renders the matching Romanian tag label for "%s"', async status => {
      const { root } = await render(<mud-receipt status={status}></mud-receipt>);
      const tag = queryStatus(root);
      expect(tag).toBeTruthy();
      expect(tag?.textContent).toContain(STATUS_DEFAULT_LABEL[status]);
      expect(tag?.getAttribute('semantic')).toBe(STATUS_TAG_SEMANTIC[status]);
    });
    it('omits the status tag when no status is set', async () => {
      const { root } = await render(<mud-receipt></mud-receipt>);
      expect(queryStatus(root)).toBeNull();
    });
    it('includes status in the resolved aria-label', async () => {
      const { root } = await render(<mud-receipt status="paid"></mud-receipt>);
      expect(root?.getAttribute('aria-label')).toBe('Bon de plată, Plătit');
    });
  });

  describe('amount block', () => {
    it('renders the amount and currency when amount is set', async () => {
      const { root } = await render(<mud-receipt amount="150,00" currency="MDL"></mud-receipt>);
      const v = queryAmount(root);
      expect(v?.textContent).toBe('150,00');
      const currency = root?.shadowRoot?.querySelector('.receipt-amount-currency');
      expect(currency?.textContent).toBe('MDL');
    });
    it('omits the amount block entirely when amount is empty', async () => {
      const { root } = await render(<mud-receipt></mud-receipt>);
      expect(queryAmount(root)).toBeNull();
    });
  });

  describe('IDNP masking', () => {
    it('renders sender and recipient with masked IDNPs', async () => {
      const { root } = await render(<mud-receipt></mud-receipt>);
      (root as unknown as { sender?: unknown; recipient?: unknown }).sender = {
        name: 'Ion Popescu',
        idnp: '2002003456789',
      };
      (root as unknown as { sender?: unknown; recipient?: unknown }).recipient = {
        name: 'Serviciul Fiscal',
        idnp: '1003600045678',
      };
      // Allow Stencil to flush
      await new Promise(r => setTimeout(r, 0));
      const text = root?.shadowRoot?.textContent ?? '';
      expect(text).toContain('Ion Popescu');
      expect(text).toContain('2002******789');
      expect(text).toContain('Serviciul Fiscal');
      expect(text).toContain('1003******678');
      // Verify raw IDNP digits are NOT exposed
      expect(text).not.toContain('2002003456789');
      expect(text).not.toContain('1003600045678');
    });
  });

  describe('QR rendering', () => {
    it('renders the inline SVG QR when qrData is provided', async () => {
      const { root } = await render(<mud-receipt qr-data="https://verify.mpay.gov.md/tx/0001"></mud-receipt>);
      expect(queryQr(root)).toBeTruthy();
    });
    it('omits the QR figure entirely when qrData is empty and no slot is used', async () => {
      const { root } = await render(<mud-receipt></mud-receipt>);
      expect(queryQr(root)).toBeNull();
    });
    it('the QR figure carries a Romanian accessible label by default', async () => {
      const { root } = await render(<mud-receipt qr-data="x"></mud-receipt>);
      const fig = root?.shadowRoot?.querySelector('.receipt-qr');
      expect(fig?.getAttribute('aria-label')).toBe('Cod QR pentru verificare');
    });
  });

  describe('action events', () => {
    it('emits mudDownload with the action detail when the primary button is activated', async () => {
      const { root } = await render(<mud-receipt service="mpay" status="paid" transaction-id="TXN-1"></mud-receipt>);
      const handler = vi.fn();
      root?.addEventListener('mudDownload', handler as EventListener);
      const buttons = queryButtons(root);
      // First button is "Descarcă PDF" — mud-button is Pattern B (renders its own
      // internal <button> inside shadow DOM), so we click the host element and
      // rely on the bubbling click event captured by onClick on the host.
      (buttons?.[0] as HTMLElement | undefined)?.click();
      expect(handler).toHaveBeenCalledTimes(1);
      const ev = handler.mock.calls[0][0] as CustomEvent;
      expect(ev.detail).toMatchObject({
        service: 'mpay',
        status: 'paid',
        transactionId: 'TXN-1',
      });
    });

    it('emits mudEmail, mudPrint, mudShare on the remaining buttons', async () => {
      const { root } = await render(<mud-receipt status="paid"></mud-receipt>);
      const emailFn = vi.fn();
      const printFn = vi.fn();
      const shareFn = vi.fn();
      // Stub window.print so the test does not block on a print dialog
      const originalPrint = window.print;
      window.print = vi.fn();
      root?.addEventListener('mudEmail', emailFn as EventListener);
      root?.addEventListener('mudPrint', printFn as EventListener);
      root?.addEventListener('mudShare', shareFn as EventListener);
      const buttons = queryButtons(root);
      const [, btnEmail, btnPrint, btnShare] = Array.from(buttons ?? []) as HTMLElement[];
      btnEmail.click();
      btnPrint.click();
      btnShare.click();
      expect(emailFn).toHaveBeenCalledTimes(1);
      expect(printFn).toHaveBeenCalledTimes(1);
      expect(shareFn).toHaveBeenCalledTimes(1);
      window.print = originalPrint;
    });

    it('omits the actions footer when showActions is false', async () => {
      const { root } = await render(<mud-receipt></mud-receipt>);
      (root as unknown as { showActions?: boolean }).showActions = false;
      await new Promise(r => setTimeout(r, 0));
      const footer = root?.shadowRoot?.querySelector('.receipt-actions');
      expect(footer).toBeNull();
    });
  });

  describe('locale formatting', () => {
    it('formats the date through the supplied locale', async () => {
      const { root } = await render(<mud-receipt date="2026-05-22T14:32:00Z" locale="ro-RO"></mud-receipt>);
      const text = root?.shadowRoot?.textContent ?? '';
      expect(text.toLowerCase()).toContain('mai');
    });
    it('respects an English locale override', async () => {
      const { root } = await render(<mud-receipt date="2026-05-22T14:32:00Z" locale="en-US"></mud-receipt>);
      const text = root?.shadowRoot?.textContent ?? '';
      expect(text.toLowerCase()).toContain('may');
    });
  });

  describe('a11y contract', () => {
    it('uses an overridden aria-label when provided', async () => {
      const { root } = await render(<mud-receipt aria-label="Custom name"></mud-receipt>);
      expect(root?.getAttribute('aria-label')).toBe('Custom name');
    });
    it('exposes role="article" so assistive tech treats the receipt as a self-contained section', async () => {
      const { root } = await render(<mud-receipt></mud-receipt>);
      expect(root?.getAttribute('role')).toBe('article');
    });
  });
});
