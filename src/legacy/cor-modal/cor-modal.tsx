import { Component, Element, Event, EventEmitter, h, Host, Listen, Method, Prop, State, Watch } from '@stencil/core';

import { ButtonSize, ButtonVariant } from '../cor-button/cor-button.enums';
import { IconSize } from '../cor-icon/cor-icon.types';
import { ModalPlacement, ModalSize } from './cor-modal.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';

/**
 * A modal/drawer component with multiple placement and size variants.
 *
 * @element cor-modal
 * @slot title - Title content projected into the modal header
 * @slot header-actions - Extra action buttons in the header, rendered before the close button
 * @slot header - Full header override (replaces title, actions and close button entirely)
 * @slot - Default slot for modal body content
 * @slot footer - Footer content for actions
 */
@Component({
  tag: 'cor-modal',
  styleUrl: 'cor-modal.css',
  shadow: true,
})
export class CorModal {
  /**
   * Whether the modal is open/visible
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) open: boolean = false;

  /**
   * Placement of the modal: 'right' (drawer), 'center' (dialog), or 'full' (full-width)
   * @default center
   */
  @Prop({ reflect: true }) placement: ModalPlacement | `${ModalPlacement}` = ModalPlacement.CENTER;

  /**
   * Size variant: 'sm', 'md', or 'lg'
   * @default md
   */
  @Prop({ reflect: true }) size: ModalSize | `${ModalSize}` = ModalSize.MD;

  @Prop({ reflect: true }) hideHeader: boolean = false;

  /**
   * Whether clicking the backdrop closes the modal
   * @default true
   */
  @Prop() closeOnBackdrop: boolean = true;

  /**
   * Whether pressing Escape closes the modal
   * @default true
   */
  @Prop() closeOnEscape: boolean = true;

  /**
   * Accessible label for the modal (used for aria-label when header slot is used or header is hidden)
   */
  @Prop() ariaLabel?: string;

  @State() private hasHeaderSlot: boolean = false;
  @State() private hasFooterSlot: boolean = false;

  private titleId = `modal-title-${Math.random().toString(36).substring(2, 9)}`;

  @Element() host!: HTMLElement;

  /**
   * Emitted when the modal is closed
   */
  @Event() corModalClose!: EventEmitter<void>;

  /**
   * Emitted when the modal is opened
   */
  @Event() corModalOpen!: EventEmitter<void>;

  private previousActiveElement: HTMLElement | null = null;
  private modalContainerRef?: HTMLElement;

  private isCloseOnBackdropEnabled(): boolean {
    const attrValue = this.host.getAttribute('close-on-backdrop');
    if (attrValue === 'false') return false;
    if (attrValue === 'true') return true;
    return this.closeOnBackdrop;
  }

  private isCloseOnEscapeEnabled(): boolean {
    const attrValue = this.host.getAttribute('close-on-escape');
    if (attrValue === 'false') return false;
    if (attrValue === 'true') return true;
    return this.closeOnEscape;
  }

  @Listen('click')
  handleClick(event: MouseEvent) {
    if (!this.open) return;
    const path = event.composedPath() as Element[];
    const closer = path.find(el => el !== this.host && el.hasAttribute?.('data-modal-close'));
    if (closer) {
      this.close();
    }
  }

  @Listen('keydown')
  handleKeyDown(event: KeyboardEvent) {
    if (!this.open) return;

    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  private handleDocumentKeydown = (event: KeyboardEvent) => {
    if (!this.open) return;

    if (event.key === 'Escape' && this.isCloseOnEscapeEnabled()) {
      event.preventDefault();
      this.close();
    }
  };

  @Watch('open')
  watchOpen(newValue: boolean) {
    if (newValue) {
      this.previousActiveElement = document.activeElement as HTMLElement;
      this.corModalOpen.emit();
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', this.handleDocumentKeydown);
      requestAnimationFrame(() => {
        this.focusFirstElement();
      });
    } else {
      this.corModalClose.emit();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', this.handleDocumentKeydown);
      if (this.previousActiveElement) {
        this.previousActiveElement.focus();
      }
    }
  }

  componentWillLoad() {
    this.checkSlots();
  }

  componentDidLoad() {
    this.setupSlotListeners();
    this.checkSlots();
  }

  disconnectedCallback() {
    if (this.open) {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', this.handleDocumentKeydown);
    }
  }

  /**
   * Opens the modal programmatically
   */
  @Method()
  async show(): Promise<void> {
    this.open = true;
  }

  /**
   * Closes the modal programmatically
   */
  @Method()
  async close(): Promise<void> {
    this.open = false;
  }

  private hasMeaningfulSlotContent(el: Element | null): boolean {
    if (!el) return false;
    if (el.children.length > 0) return true;
    return (el.textContent ?? '').trim().length > 0;
  }

  private checkSlots() {
    const headerSlot = this.host.shadowRoot?.querySelector('slot[name="header"]') as HTMLSlotElement | null;
    const footerSlot = this.host.shadowRoot?.querySelector('slot[name="footer"]') as HTMLSlotElement | null;

    if (headerSlot && typeof headerSlot.assignedNodes === 'function') {
      const nodes = headerSlot.assignedNodes({ flatten: true });
      this.hasHeaderSlot = nodes.some(node => {
        if (node.nodeType === Node.ELEMENT_NODE) return true;
        if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
        return false;
      });
    } else {
      this.hasHeaderSlot = this.hasMeaningfulSlotContent(this.host.querySelector('[slot="header"]'));
    }

    if (footerSlot && typeof footerSlot.assignedNodes === 'function') {
      const nodes = footerSlot.assignedNodes({ flatten: true });
      this.hasFooterSlot = nodes.some(node => {
        if (node.nodeType === Node.ELEMENT_NODE) return true;
        if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
        return false;
      });
    } else {
      this.hasFooterSlot = this.hasMeaningfulSlotContent(this.host.querySelector('[slot="footer"]'));
    }
  }

  private setupSlotListeners() {
    const slots = this.host.shadowRoot?.querySelectorAll('slot');
    slots?.forEach((slot: HTMLSlotElement) => {
      slot.addEventListener('slotchange', () => this.checkSlots());
    });
  }

  private handleBackdropClick = (event: MouseEvent) => {
    if (this.isCloseOnBackdropEnabled() && event.target === event.currentTarget) {
      this.close();
    }
  };

  private handleCloseClick = () => {
    this.close();
  };

  private focusFirstElement() {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      this.modalContainerRef?.focus();
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const shadowElements = Array.from(this.host.shadowRoot?.querySelectorAll(selector) ?? []) as HTMLElement[];
    const slottedElements = Array.from(this.host.querySelectorAll(selector)) as HTMLElement[];
    return [...shadowElements, ...slottedElements].filter(el => !el.hasAttribute('disabled'));
  }

  private trapFocus(event: KeyboardEvent) {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  render() {
    const labelledBy = !this.hideHeader && !this.hasHeaderSlot ? this.titleId : undefined;
    const ariaLabelValue = this.hasHeaderSlot || this.hideHeader ? this.ariaLabel : undefined;

    return (
      <Host>
        <div class="modal-backdrop" onClick={this.handleBackdropClick} aria-hidden="true" />
        <div
          class="modal-container"
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-label={ariaLabelValue}
          tabindex="-1"
          ref={el => (this.modalContainerRef = el)}
        >
          {!this.hideHeader && (
            <div class="modal-header">
              {this.hasHeaderSlot ? (
                <slot name="header" />
              ) : (
                <div class="modal-header-default">
                  <div class="modal-title-container" id={this.titleId}>
                    <slot name="title" />
                  </div>

                  <div class="modal-header-actions">
                    <slot name="header-actions" />

                    <cor-button variant={ButtonVariant.SECONDARY_GRAY} size={ButtonSize.MD} iconOnly={true}>
                      <button type="button" onClick={this.handleCloseClick} aria-label="Close modal">
                        <cor-icon name={ICON_NAMES.CLOSE__LARGE} size={IconSize.MD} />
                      </button>
                    </cor-button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div class="modal-body">
            <slot />
          </div>

          {this.hasFooterSlot && (
            <div class="modal-footer">
              <slot name="footer" />
            </div>
          )}
        </div>
      </Host>
    );
  }
}
