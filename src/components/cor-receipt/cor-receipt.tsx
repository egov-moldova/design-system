import { Component, Element, Event, Host, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import { encodeQrModules } from './qr/qr-encoder';
import { RECEIPT_SERVICES, RECEIPT_STATUSES } from './cor-receipt.types';
import type { ReceiptActionDetail, ReceiptParty, ReceiptService, ReceiptStatus } from './cor-receipt.types';
import {
  SERVICE_DEFAULT_TITLE,
  SERVICE_LOGO_NAME,
  STATUS_DEFAULT_LABEL,
  STATUS_TAG_SEMANTIC,
  formatReceiptDate,
  maskIdnp,
} from './cor-receipt.utils';

/**
 * Receipt — confirmation surface for a finished Moldovan e-Gov transaction
 * (molecule).
 *
 * Pattern B (composed molecule): renders its own header / amount block /
 * details list / QR / footer in shadow DOM. Composes `cor-logo`, `cor-tag`,
 * and `cor-button` for the interactive pieces.
 *
 * Four sibling variants share one element via the `service` attribute —
 * each maps to one of the e-Gov properties:
 *
 * - `service="mpay"` (default) — payment receipt
 * - `service="mpass"` — authentication session log
 * - `service="msign"` — signature receipt
 * - `service="mdelivery"` — delivery confirmation
 *
 * The receipt is a presentational artifact. It does not fetch, validate,
 * or persist; callers pass already-formatted values. The QR (default slot
 * `qr` overrides) is generated client-side from the `qrData` prop via a
 * vendored byte-mode QR encoder — no runtime dependency, no network.
 *
 * Print: the host carries `@media print` rules to hide action buttons,
 * drop shadows, and force ink-primary text so a citizen can print the
 * receipt without the surrounding UI bleeding through.
 *
 * Romanian voice ships as defaults; every label is overridable via the
 * public `@Prop` surface for localisation.
 *
 * @element cor-receipt
 *
 * @slot qr - Override the generated QR. When populated, the built-in
 *            encoder is skipped and the consumer takes full ownership of
 *            the verification visual.
 * @slot actions - Override the footer action buttons. When populated, the
 *                 built-in `Imprimă / Descarcă PDF / Trimite email /
 *                 Distribuie` set is replaced wholesale.
 * @slot extra - Optional additional detail rows appended after the
 *               built-in description / transaction-id block.
 */
@Component({
  tag: 'cor-receipt',
  styleUrl: 'cor-receipt.css',
  shadow: true,
})
export class CorReceipt {
  /**
   * Which e-Gov property this receipt belongs to. Drives the rendered logo,
   * the default title, and the `service` attribute carried in event detail.
   * @default 'mpay'
   */
  @Prop({ reflect: true }) service: ReceiptService = 'mpay';

  /**
   * Plain-text receipt title. Defaults to a Romanian per-service string
   * (`Bon de plată`, `Confirmare autentificare`, `Confirmare semnătură`,
   * `Confirmare livrare`).
   *
   * Attribute name is `title-text` to avoid collision with the built-in
   * HTML `title` global attribute (Stencil warns and the global wins at
   * runtime). Prop name remains `titleText` for ergonomic JS access.
   */
  @Prop({ attribute: 'title-text' }) titleText?: string;

  /**
   * Transaction lifecycle state. Drives the status tag color + label.
   */
  @Prop({ reflect: true }) status?: ReceiptStatus;

  /**
   * Pre-formatted amount string (e.g. `"150,00"`). The receipt does NOT
   * format numbers — locale-aware grouping and decimal style belong to
   * the caller. Omit to hide the amount panel entirely (used by mpass /
   * msign receipts that carry no monetary value).
   */
  @Prop() amount?: string;

  /**
   * Currency code rendered next to the amount.
   * @default 'MDL'
   */
  @Prop() currency: string = 'MDL';

  /**
   * Date in ISO-8601 form (`"2026-05-22T14:32:00Z"`). Rendered via
   * `Intl.DateTimeFormat(this.locale, …)`. Falls back to the raw string
   * on a parse failure.
   */
  @Prop() date?: string;

  /**
   * BCP-47 locale used by the built-in date formatter. Override for
   * non-Romanian surfaces.
   * @default 'ro-RO'
   */
  @Prop() locale: string = 'ro-RO';

  /** Sender party. `idnp` is auto-masked (`2002******789`). */
  @Prop() sender?: ReceiptParty;

  /** Recipient party. `idnp` is auto-masked. */
  @Prop() recipient?: ReceiptParty;

  /** Free-text description rendered as its own row. */
  @Prop() description?: string;

  /** Opaque transaction identifier rendered in the footer caption. */
  @Prop() transactionId?: string;

  /**
   * Payload encoded into the QR. When empty AND no `qr` slot is provided,
   * the QR panel is hidden entirely.
   */
  @Prop() qrData?: string;

  /**
   * Whether the built-in action footer renders. Disable for read-only
   * archival views.
   * @default true
   */
  @Prop() showActions: boolean = true;

  /**
   * Override for the receipt's accessible name. Defaults to the resolved
   * title plus status (e.g. "Bon de plată — Plătit"). Setting `aria-label`
   * directly on the host also works — captured on connect into
   * `resolvedAriaLabel` and stripped to avoid Stencil's attribute-observer /
   * render-loop antipattern (same pattern as cor-radio / cor-switch /
   * cor-tooltip / cor-accordion / cor-breadcrumb / cor-date-picker / cor-modal
   * / cor-pagination).
   */
  @Prop() label?: string;

  // ---- Per-row label overrides (Romanian defaults) ----
  /** "Status:" inline label preceding the tag. */
  @Prop() statusLabel?: string;
  /** "Suma" label preceding the amount value. */
  @Prop() amountLabel?: string;
  /** "Data" label preceding the date. */
  @Prop() dateLabel?: string;
  /** "Plătitor" label preceding the sender. */
  @Prop() senderLabel?: string;
  /** "Beneficiar" label preceding the recipient. */
  @Prop() recipientLabel?: string;
  /** "Descriere" label preceding the free text. */
  @Prop() descriptionLabel?: string;
  /** "Cod tranzacție" label preceding the transaction ID. */
  @Prop() transactionIdLabel?: string;
  /** "Scanează pentru verificare" caption under the QR. */
  @Prop() qrCaption?: string;
  /** "Cod QR pentru verificare" accessible label on the QR figure. */
  @Prop() qrAriaLabel?: string;

  // ---- Action button labels ----
  /** "Imprimă" button label. */
  @Prop() printLabel?: string;
  /** "Descarcă PDF" button label. */
  @Prop() downloadLabel?: string;
  /** "Trimite email" button label. */
  @Prop() emailLabel?: string;
  /** "Distribuie" button label. */
  @Prop() shareLabel?: string;

  @State() private hasQrSlot: boolean = false;
  @State() private hasActionsSlot: boolean = false;
  @State() private hasExtraSlot: boolean = false;
  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLCorReceiptElement;

  /** Fires when the user activates the "Descarcă PDF" action. */
  @Event() corDownload!: EventEmitter<ReceiptActionDetail>;
  /** Fires when the user activates the "Distribuie" action. */
  @Event() corShare!: EventEmitter<ReceiptActionDetail>;
  /** Fires when the user activates the "Trimite email" action. */
  @Event() corEmail!: EventEmitter<ReceiptActionDetail>;
  /** Fires when the user activates the "Imprimă" action. */
  @Event() corPrint!: EventEmitter<ReceiptActionDetail>;

  componentWillLoad() {
    if (!RECEIPT_SERVICES.includes(this.service)) {
      console.warn(
        `[cor-receipt] Invalid service="${String(this.service)}". ` +
          `Expected one of ${RECEIPT_SERVICES.join(', ')}. Falling back to 'mpay'.`,
      );
      this.service = 'mpay';
    }
    if (this.status !== undefined && !RECEIPT_STATUSES.includes(this.status)) {
      console.warn(
        `[cor-receipt] Invalid status="${String(this.status)}". ` +
          `Expected one of ${RECEIPT_STATUSES.join(', ')}. Ignoring.`,
      );
      this.status = undefined;
    }
    this.captureAriaLabel();
    this.detectSlots();
  }

  private captureAriaLabel(): void {
    const userLabel = this.host.getAttribute('aria-label');
    if (userLabel && userLabel.length > 0) {
      this.resolvedAriaLabel = userLabel;
      this.host.removeAttribute('aria-label');
    } else if (this.label && this.label.length > 0) {
      this.resolvedAriaLabel = this.label;
    }
  }

  @Watch('label')
  protected syncLabel(next?: string): void {
    if (next && next.length > 0) this.resolvedAriaLabel = next;
  }

  private detectSlots(): void {
    let qr = false;
    let actions = false;
    let extra = false;
    const children = this.host.childNodes as unknown as Node[];
    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;
      const el = node as Element;
      const slot = el.getAttribute('slot');
      if (slot === 'qr') qr = true;
      else if (slot === 'actions') actions = true;
      else if (slot === 'extra') extra = true;
    }
    this.hasQrSlot = qr;
    this.hasActionsSlot = actions;
    this.hasExtraSlot = extra;
  }

  private onSlotChange = (which: 'qr' | 'actions' | 'extra') => (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    const has = slot.assignedElements({ flatten: true }).length > 0;
    if (which === 'qr') this.hasQrSlot = has;
    else if (which === 'actions') this.hasActionsSlot = has;
    else this.hasExtraSlot = has;
  };

  private resolveTitle(): string {
    if (this.titleText && this.titleText.trim().length > 0) return this.titleText.trim();
    return SERVICE_DEFAULT_TITLE[this.service];
  }

  private resolveAriaLabel(): string {
    if (this.resolvedAriaLabel && this.resolvedAriaLabel.trim().length > 0) return this.resolvedAriaLabel.trim();
    const t = this.resolveTitle();
    if (this.status) return `${t}, ${STATUS_DEFAULT_LABEL[this.status]}`;
    return t;
  }

  private actionDetail(): ReceiptActionDetail {
    return {
      service: this.service,
      status: this.status,
      transactionId: this.transactionId,
    };
  }

  private onDownload = () => this.corDownload.emit(this.actionDetail());
  private onShare = () => this.corShare.emit(this.actionDetail());
  private onEmail = () => this.corEmail.emit(this.actionDetail());
  private onPrint = () => {
    this.corPrint.emit(this.actionDetail());
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  /**
   * Render the QR as inline SVG. The encoder returns a `boolean[][]` module
   * grid; we rasterise it into a single SVG `<path>` made of horizontal runs
   * so the resulting markup is small enough for inline use.
   */
  private renderQrSvg() {
    if (!this.qrData || this.qrData.trim().length === 0) return null;
    let modules: boolean[][];
    try {
      modules = encodeQrModules(this.qrData);
    } catch (err) {
      console.warn('[cor-receipt] QR encoding failed:', err);
      return null;
    }
    const size = modules.length;
    // Build a path of horizontal run rectangles → small DOM, crisp at any size.
    const segments: string[] = [];
    for (let r = 0; r < size; r += 1) {
      let c = 0;
      while (c < size) {
        if (!modules[r][c]) {
          c += 1;
          continue;
        }
        const start = c;
        while (c < size && modules[r][c]) c += 1;
        segments.push(`M${start} ${r}h${c - start}v1h-${c - start}z`);
      }
    }
    // Intentional inline vector markup (suppresses ANTIPATTERN-021-RAW-SVG):
    // the QR matrix is computed at runtime from the consumer's `qrData` prop.
    // The path is built per-receipt from the encoded modules — there is no
    // static glyph to ship through `<cor-icon>`. Same precedent as cor-spinner /
    // cor-checkbox check / cor-accordion trigger.
    return (
      <svg
        class="qr-svg"
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        shape-rendering="crispEdges"
        aria-hidden="true"
      >
        <path d={segments.join('')} fill="currentColor" />
      </svg>
    );
  }

  private renderHeader() {
    const title = this.resolveTitle();
    const logoName = SERVICE_LOGO_NAME[this.service];
    return (
      <header class="receipt-header">
        <cor-logo name={logoName} class="receipt-logo" />
        <h2 class="receipt-title">{title}</h2>
        {this.status ? (
          <cor-tag
            class="receipt-status"
            variant="status"
            type="subtle"
            semantic={STATUS_TAG_SEMANTIC[this.status]}
            aria-label={STATUS_DEFAULT_LABEL[this.status]}
          >
            {STATUS_DEFAULT_LABEL[this.status]}
          </cor-tag>
        ) : null}
      </header>
    );
  }

  private renderAmount() {
    if (!this.amount) return null;
    return (
      <section class="receipt-amount" aria-labelledby="receipt-amount-label">
        <span id="receipt-amount-label" class="receipt-amount-label">
          {this.amountLabel ?? 'Suma transferată'}
        </span>
        <p class="receipt-amount-row">
          <span class="receipt-amount-value">{this.amount}</span>
          <span class="receipt-amount-currency">{this.currency}</span>
        </p>
      </section>
    );
  }

  private renderRow(label: string, value: string | null, key: string) {
    if (value === null || value === undefined || value === '') return null;
    return (
      <div class="receipt-row" data-row={key}>
        <dt class="receipt-row-label">{label}</dt>
        <dd class="receipt-row-value">{value}</dd>
      </div>
    );
  }

  private renderParty(party: ReceiptParty | undefined) {
    if (!party) return null;
    const name = (party.name ?? '').trim();
    const idnp = maskIdnp(party.idnp);
    if (!name && !idnp) return null;
    return (
      <div class="receipt-party">
        {name ? <span class="receipt-party-name">{name}</span> : null}
        {idnp ? (
          <span class="receipt-party-idnp" aria-label={`IDNP ${idnp}`}>
            IDNP {idnp}
          </span>
        ) : null}
      </div>
    );
  }

  private renderDetails() {
    const dateLabel = this.dateLabel ?? 'Data';
    const senderLabel = this.senderLabel ?? 'Plătitor';
    const recipientLabel = this.recipientLabel ?? 'Beneficiar';
    const descLabel = this.descriptionLabel ?? 'Descriere';
    const txLabel = this.transactionIdLabel ?? 'Cod tranzacție';
    const dateText = this.date ? formatReceiptDate(this.date, this.locale) : '';

    return (
      <dl class="receipt-details">
        {dateText ? this.renderRow(dateLabel, dateText, 'date') : null}
        {this.sender ? (
          <div class="receipt-row" data-row="sender">
            <dt class="receipt-row-label">{senderLabel}</dt>
            <dd class="receipt-row-value">{this.renderParty(this.sender)}</dd>
          </div>
        ) : null}
        {this.recipient ? (
          <div class="receipt-row" data-row="recipient">
            <dt class="receipt-row-label">{recipientLabel}</dt>
            <dd class="receipt-row-value">{this.renderParty(this.recipient)}</dd>
          </div>
        ) : null}
        {this.description ? this.renderRow(descLabel, this.description, 'description') : null}
        {this.transactionId ? this.renderRow(txLabel, this.transactionId, 'transactionId') : null}
        <slot name="extra" onSlotchange={this.onSlotChange('extra')} />
      </dl>
    );
  }

  private renderQr() {
    const showSlot = this.hasQrSlot;
    const hasGenerated = !!this.qrData && this.qrData.trim().length > 0;
    if (!showSlot && !hasGenerated) return null;

    const caption = this.qrCaption ?? 'Scanează pentru verificare';
    const ariaLabel = this.qrAriaLabel ?? 'Cod QR pentru verificare';

    return (
      <figure class="receipt-qr" aria-label={ariaLabel} role="figure">
        <div class="receipt-qr-frame">
          {/* Single slot path — when consumers project their own `<slot="qr">`
              child it wins; otherwise the slot fallback renders the built-in
              byte-mode QR (slot-first content rule, ANTIPATTERN-026 compliant). */}
          <slot name="qr" onSlotchange={this.onSlotChange('qr')}>
            {this.renderQrSvg()}
          </slot>
        </div>
        <figcaption class="receipt-qr-caption">{caption}</figcaption>
      </figure>
    );
  }

  private renderActions() {
    if (!this.showActions) return null;
    if (this.hasActionsSlot) {
      return (
        <footer class="receipt-actions" data-custom="true">
          <slot name="actions" onSlotchange={this.onSlotChange('actions')} />
        </footer>
      );
    }
    const dl = this.downloadLabel ?? 'Descarcă PDF';
    const em = this.emailLabel ?? 'Trimite email';
    const pr = this.printLabel ?? 'Imprimă';
    const sh = this.shareLabel ?? 'Distribuie';
    return (
      <footer class="receipt-actions" data-custom="false">
        <slot name="actions" onSlotchange={this.onSlotChange('actions')} />
        <cor-button variant="primary" size="md" onClick={this.onDownload}>
          {dl}
        </cor-button>
        <cor-button variant="secondary" size="md" onClick={this.onEmail}>
          {em}
        </cor-button>
        <cor-button variant="secondary" size="md" onClick={this.onPrint}>
          {pr}
        </cor-button>
        <cor-button variant="secondary" size="md" onClick={this.onShare}>
          {sh}
        </cor-button>
      </footer>
    );
  }

  render() {
    const ariaLabel = this.resolveAriaLabel();
    const hostClasses: Record<string, boolean> = {
      'has-amount': !!this.amount,
      'has-qr': !!this.qrData || this.hasQrSlot,
      'has-status': !!this.status,
    };
    return (
      <Host role="article" aria-label={ariaLabel} class={hostClasses}>
        <article class="receipt-card">
          {this.renderHeader()}
          <div class="receipt-divider" aria-hidden="true" />
          <div class="receipt-body">
            <div class="receipt-body-main">
              {this.renderAmount()}
              {this.renderDetails()}
            </div>
            {this.renderQr()}
          </div>
          {this.renderActions()}
        </article>
        {/* keep hasExtraSlot referenced for state-driven re-render */}
        <span hidden>{this.hasExtraSlot ? '' : ''}</span>
      </Host>
    );
  }
}
