import { Component, Element, Event, Host, Method, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import type { ModalActionsLayout, ModalCloseEvent, ModalCloseReason, ModalSize, ModalVariant } from './cor-modal.types';

let modalIdCounter = 0;

/**
 * Modal — overlay dialog molecule.
 *
 * Renders a centered dialog card on top of a dimmed backdrop using the native
 * `<dialog>` element internally. The native element provides the focus trap,
 * ESC handling, and top-layer rendering required for WCAG 2.1 AA Modal
 * conformance (SC 2.1.2 No Keyboard Trap reversed: focus IS trapped inside an
 * active dialog and returned on close).
 *
 * Pattern B (internal DOM): the dialog, backdrop, header, body and footer all
 * live inside shadow DOM. Consumers project content through five slots
 * (`title`, `icon`, `image`, default body, `actions`) and toggle visibility
 * via the `open` prop or the imperative `openModal()` / `closeModal()`
 * methods.
 *
 * Variants control the header treatment:
 * - `default` — title + close button (text-only header)
 * - `with-image` — full-bleed hero image at top with overlaid close button
 * - `with-icon` — leading 48px icon above the body content (no top header bar)
 *
 * Dismiss reasons routed through `corClose<{reason}>`:
 * - `backdrop` — click on backdrop (suppressed by `closeOnBackdrop=false`)
 * - `escape` — ESC keypress (suppressed by `closeOnEscape=false`)
 * - `close-button` — trailing × button activated
 * - `action` — programmatic via `closeModal('action')`, used by footer buttons
 *
 * @element cor-modal
 *
 * @slot - (default) The dialog body content. Plain text or rich content.
 * @slot title - Rich title content. Overrides the `title` prop when populated.
 * @slot icon - Leading 48px icon for the `with-icon` variant.
 * @slot image - Full-bleed hero image for the `with-image` variant.
 * @slot actions - Footer action group. Typically `cor-button` instances.
 */
@Component({
  tag: 'cor-modal',
  styleUrl: 'cor-modal.css',
  shadow: true,
})
export class CorModal {
  /**
   * Whether the modal is currently shown. Reflected so consumers can target
   * `cor-modal[open]` in selectors. Mutable so the component can flip it back
   * to `false` on internal dismiss (backdrop / escape / close button).
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) open: boolean = false;

  /**
   * Visual size rung. Drives the dialog max-width and the typography scale of
   * title and body copy.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: ModalSize = 'md';

  /**
   * Header treatment.
   * - `default` — title bar + close button
   * - `with-image` — hero image as header (close button overlaid)
   * - `with-icon` — leading 48px icon, no top bar
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: ModalVariant = 'default';

  /**
   * Title text rendered in the header. The named `title` slot, when filled,
   * overrides this prop to allow rich content.
   */
  @Prop() titleText?: string;

  /**
   * Hero image URL for the `with-image` variant. Rendered as the slot fallback
   * — if a consumer projects their own `<img slot="image">` / `<picture>` it
   * wins. Pair with `imageAlt` for accessibility (empty alt is acceptable for
   * decorative images).
   */
  @Prop() imageSrc?: string;

  /**
   * Alt text for the prop-driven hero image. Use an empty string when the image
   * is purely decorative and the title/body already describes the action.
   * @default ''
   */
  @Prop() imageAlt: string = '';

  /**
   * When `true`, renders a trailing × close button in the header. Activating
   * it emits `corClose` with `reason: 'close-button'`. Hide it for required
   * confirmation flows by setting `closable=false`.
   * @default true
   */
  @Prop({ reflect: true }) closable: boolean = true;

  /**
   * Whether a click on the backdrop dismisses the modal. Disable for flows
   * that demand an explicit decision (e.g. unsaved-changes confirmation).
   * @default true
   */
  @Prop() closeOnBackdrop: boolean = true;

  /**
   * Whether pressing ESC dismisses the modal. Disable to enforce a deliberate
   * confirmation; pair with `closable=false` and footer actions for the
   * strictest dialog contract.
   * @default true
   */
  @Prop() closeOnEscape: boolean = true;

  /**
   * Styles the dialog frame and footer for an irreversible action (e.g.
   * delete account). Adds a red top border accent and is intended to be paired
   * with a destructive primary `cor-button` in the actions slot.
   * @default false
   */
  @Prop({ reflect: true }) destructive: boolean = false;

  /**
   * Footer button arrangement (Figma 358:16247).
   * - `inline` — buttons sit side-by-side, right-aligned (default)
   * - `stacked` — buttons span the full footer width, stacked vertically
   * @default 'inline'
   */
  @Prop({ reflect: true }) actionsLayout: ModalActionsLayout = 'inline';

  /**
   * Accessible name forwarded to the host as `aria-label`. Required when no
   * title is provided. The consumer-supplied `aria-label` attribute is captured
   * on connect into `resolvedAriaLabel` and stripped from the host to avoid
   * Stencil's attribute-observer / render-loop antipattern (same pattern as
   * cor-radio / cor-switch / cor-tooltip / cor-accordion / cor-breadcrumb /
   * cor-date-picker).
   */
  @Prop() label?: string;

  /**
   * Accessible label for the close × button. Defaults to the Romanian
   * "Închide".
   * @default 'Închide'
   */
  @Prop() closeLabel: string = 'Închide';

  @State() private hasTitleSlot: boolean = false;
  @State() private hasIconSlot: boolean = false;
  @State() private hasImageSlot: boolean = false;
  @State() private hasActionsSlot: boolean = false;
  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLCorModalElement;

  /**
   * Fires after the dialog has been shown.
   */
  @Event() corOpen!: EventEmitter<void>;

  /**
   * Fires after the dialog has been dismissed. Payload carries the `reason`
   * so consumers can distinguish backdrop vs. escape vs. close-button vs.
   * footer-action dismissals.
   */
  @Event() corClose!: EventEmitter<ModalCloseEvent>;

  private dialogRef?: HTMLDialogElement;
  private previousActiveElement: HTMLElement | null = null;
  private readonly titleId = `modal-title-${(modalIdCounter += 1)}`;
  private readonly bodyId = `modal-body-${modalIdCounter}`;
  private suppressNativeClose: boolean = false;

  componentWillLoad(): void {
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
  syncLabel(next?: string): void {
    if (next && next.length > 0) this.resolvedAriaLabel = next;
  }

  componentDidLoad(): void {
    if (this.open) this.showDialog();
  }

  disconnectedCallback(): void {
    if (this.dialogRef?.open) {
      this.suppressNativeClose = true;
      this.dialogRef.close();
    }
  }

  @Watch('open')
  handleOpenChange(next: boolean, prev: boolean): void {
    if (next === prev) return;
    if (next) this.showDialog();
    else this.hideDialog();
  }

  /**
   * Imperatively open the dialog. Equivalent to setting `open=true`.
   * Emits `corOpen` once the dialog is visible.
   */
  @Method()
  async openModal(): Promise<void> {
    this.open = true;
  }

  /**
   * Imperatively close the dialog. Emits `corClose` with the supplied reason
   * (defaults to `'action'`, intended for footer button handlers).
   */
  @Method()
  async closeModal(reason: ModalCloseReason = 'action'): Promise<void> {
    this.dismiss(reason);
  }

  private detectSlots(): void {
    let hasTitleSlot = false;
    let hasIconSlot = false;
    let hasImageSlot = false;
    let hasActionsSlot = false;
    const children = this.host.childNodes as unknown as Node[];
    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;
      const el = node as Element;
      const slot = el.getAttribute('slot');
      if (slot === 'title') hasTitleSlot = true;
      else if (slot === 'icon') hasIconSlot = true;
      else if (slot === 'image') hasImageSlot = true;
      else if (slot === 'actions') hasActionsSlot = true;
    }
    this.hasTitleSlot = hasTitleSlot;
    this.hasIconSlot = hasIconSlot;
    this.hasImageSlot = hasImageSlot;
    this.hasActionsSlot = hasActionsSlot;
  }

  private onTitleSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasTitleSlot = slot.assignedElements({ flatten: true }).length > 0;
  };

  private onIconSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasIconSlot = slot.assignedElements({ flatten: true }).length > 0;
  };

  private onImageSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasImageSlot = slot.assignedElements({ flatten: true }).length > 0;
  };

  private onActionsSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasActionsSlot = slot.assignedElements({ flatten: true }).length > 0;
  };

  private showDialog(): void {
    if (!this.dialogRef) return;
    if (this.dialogRef.open) return;
    this.previousActiveElement = (document.activeElement as HTMLElement) ?? null;
    try {
      this.dialogRef.showModal();
    } catch {
      // jsdom / older engines may throw — fall back to attribute open
      this.dialogRef.setAttribute('open', '');
    }
    this.corOpen.emit();
  }

  private hideDialog(): void {
    if (!this.dialogRef) return;
    if (this.dialogRef.open) {
      this.suppressNativeClose = true;
      this.dialogRef.close();
    }
    // Restore focus to the element that opened the modal.
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }
    this.previousActiveElement = null;
  }

  private dismiss(reason: ModalCloseReason): void {
    if (!this.open) return;
    this.open = false;
    this.corClose.emit({ reason });
  }

  private handleBackdropClick = (ev: MouseEvent) => {
    if (!this.closeOnBackdrop) return;
    // Native `<dialog>` receives clicks on its own padding area when the
    // backdrop is hit — we compare against the dialog rect to disambiguate.
    const dialog = this.dialogRef;
    if (!dialog) return;
    if (ev.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inDialog =
      ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
    if (!inDialog) this.dismiss('backdrop');
  };

  private handleDialogCancel = (ev: Event) => {
    // The `cancel` event fires for ESC. If `closeOnEscape=false`, suppress it.
    if (!this.closeOnEscape) {
      ev.preventDefault();
      return;
    }
    ev.preventDefault();
    this.dismiss('escape');
  };

  private handleDialogClose = () => {
    // Native `close` fires from any path that ends with `dialog.close()`.
    // We always route `open` through `dismiss()`, but we still need to keep
    // host state in sync when the close was driven externally.
    if (this.suppressNativeClose) {
      this.suppressNativeClose = false;
      return;
    }
    if (this.open) {
      // Fallback: programmatic `.close()` from outside our paths.
      this.open = false;
      this.corClose.emit({ reason: 'close-button' });
    }
  };

  private handleCloseButtonClick = (ev: MouseEvent) => {
    ev.stopPropagation();
    this.dismiss('close-button');
  };

  private handleCloseButtonKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      ev.stopPropagation();
      this.dismiss('close-button');
    }
  };

  private renderCloseButton() {
    if (!this.closable) return null;
    return (
      <button
        class="close"
        type="button"
        aria-label={this.closeLabel}
        onClick={this.handleCloseButtonClick}
        onKeyDown={this.handleCloseButtonKeyDown}
      >
        <span class="close-icon" aria-hidden="true">
          <cor-icon name="cross-small" size={16}></cor-icon>
        </span>
      </button>
    );
  }

  private renderHeader() {
    if (this.variant === 'with-image') {
      // The image is the actual header bar; the title (when provided) is rendered
      // below the image inside renderBody (per Figma 358:16247 — image variants
      // show the title underneath the hero, not in a separate header bar).
      // Slot-first content rule: when consumers project their own `<img>` or
      // `<picture>` it wins; otherwise the `imageSrc` prop renders an `<img>`
      // as the slot's fallback content.
      return (
        <div class="header header-image">
          <slot name="image" onSlotchange={this.onImageSlotChange}>
            {this.imageSrc ? <img src={this.imageSrc} alt={this.imageAlt} /> : null}
          </slot>
          {this.renderCloseButton()}
        </div>
      );
    }

    if (this.variant === 'with-icon') {
      // The icon variant has no top header bar — the close button (if any)
      // floats in the top-right corner. The icon itself sits above the body.
      return this.closable ? <div class="header-icon-close">{this.renderCloseButton()}</div> : null;
    }

    const showTitle = this.hasTitleSlot || (this.titleText && this.titleText.trim().length > 0);
    return (
      <div class="header">
        {showTitle ? (
          <div class="heading" id={this.titleId}>
            {/* Single slot path — when consumers provide a `slot="title"` child it
                wins; otherwise the slot fallback renders the `titleText` prop as
                an h2 (slot-first content rule, ANTIPATTERN-026 compliant). */}
            <slot name="title" onSlotchange={this.onTitleSlotChange}>
              <h2 class="title">{this.titleText}</h2>
            </slot>
          </div>
        ) : null}
        {this.renderCloseButton()}
      </div>
    );
  }

  private renderBody() {
    const hasTitle = this.hasTitleSlot || !!(this.titleText && this.titleText.trim().length > 0);
    // The with-icon and with-image variants both render the title INSIDE the
    // body (not in a separate header bar). For with-icon the title sits below
    // the icon glyph; for with-image it sits below the hero image (Figma 358:16247).
    const titleInBody = (this.variant === 'with-icon' || this.variant === 'with-image') && hasTitle;
    return (
      <div class="body" id={this.bodyId}>
        {this.variant === 'with-icon' ? (
          <div class="icon">
            <slot name="icon" onSlotchange={this.onIconSlotChange} />
          </div>
        ) : null}
        {titleInBody ? (
          <div class="heading heading-in-body" id={this.titleId}>
            <slot name="title" onSlotchange={this.onTitleSlotChange}>
              <h2 class="title">{this.titleText}</h2>
            </slot>
          </div>
        ) : null}
        <div class="body-content">
          <slot />
        </div>
      </div>
    );
  }

  private renderFooter() {
    return (
      <div class="footer">
        <slot name="actions" onSlotchange={this.onActionsSlotChange} />
      </div>
    );
  }

  render() {
    const hostClasses = {
      'has-title': this.hasTitleSlot || !!(this.titleText && this.titleText.trim().length > 0),
      'has-icon': this.hasIconSlot,
      'has-image': this.hasImageSlot || !!(this.imageSrc && this.imageSrc.length > 0),
      'has-actions': this.hasActionsSlot,
      'is-closable': this.closable,
      'is-destructive': this.destructive,
    };

    const hasTitle = this.hasTitleSlot || !!(this.titleText && this.titleText.trim().length > 0);
    // Prefer the in-shadow title (visible heading) when present; otherwise fall
    // back to the consumer-supplied accessible name. Avoid `aria-labelledby`
    // pointing at a non-existent ID — axe flags that as `aria-valid-attr-value`.
    const labelledBy = hasTitle ? this.titleId : undefined;
    const ariaLabel = !hasTitle ? this.resolvedAriaLabel : undefined;

    return (
      <Host class={hostClasses}>
        <dialog
          ref={el => (this.dialogRef = el as HTMLDialogElement)}
          class="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-label={ariaLabel}
          aria-describedby={this.bodyId}
          onClick={this.handleBackdropClick}
          onCancel={this.handleDialogCancel}
          onClose={this.handleDialogClose}
        >
          <div class="surface" role="document">
            {this.renderHeader()}
            {this.renderBody()}
            {this.renderFooter()}
          </div>
        </dialog>
      </Host>
    );
  }
}
