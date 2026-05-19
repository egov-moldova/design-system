import { Component, h, Host, Prop, Element, State, Watch } from '@stencil/core';

import { LinkSize, LinkState, LinkUnderline } from './cor-link.enums';
import { textVariants } from '../cor-typography/cor-typography.enums';

/**
 * A link component for navigational elements with icon support.
 *
 * @element cor-link
 *
 * @cssprop --link-text-color - Text and icon color (overrides state-based color)
 * @cssprop --link-gap - Gap between icon and text (default: size-based token)
 * @cssprop --link-icon-size - Icon size (default: size-based token)
 * @cssprop --link-focus-outline-color - Focus ring color
 * @cssprop --link-focus-outline-width - Focus ring width
 * @cssprop --link-focus-outline-offset - Focus ring offset
 */
@Component({
  tag: 'cor-link',
  styleUrl: 'cor-link.css',
  shadow: true,
})
export class CorLink {
  @Element() el!: HTMLElement;

  /**
   * The size of the link.
   * @default md
   */
  @Prop({ reflect: true }) size: LinkSize = LinkSize.MD;

  /**
   * The visual state of the link.
   * Runtime-valid values: default, disabled, error, empty.
   * Design-time only (Storybook/Figma): hover, focus, pressed — these are handled by CSS pseudo-classes at runtime.
   * @default default
   */
  @Prop({ reflect: true, mutable: true }) state: LinkState = LinkState.DEFAULT;

  /**
   * The href for the anchor element.
   */
  @Prop() href: string = '#';

  /**
   * The target for the anchor element.
   */
  @Prop() target: string = '_self';

  /**
   * Accessible label for icon-only mode. Required when using icon slot without default slot content.
   */
  @Prop() ariaLabel?: string;

  /**
   * Indicates if the link is in skeleton/empty state
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  /**
   * Indicates this is an icon-only link (no text label).
   * Used for skeleton rendering and accessibility.
   * When true, ariaLabel is required for accessibility.
   * @default false
   */
  @Prop({ reflect: true }) iconOnly: boolean = false;

  /**
   * Convenience prop to set the link to disabled state.
   * Two-way synced with state='disabled'.
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) disabled: boolean = false;

  /**
   * Controls when the link is underlined.
   * - 'always': Always underlined (best for accessibility in body text)
   * - 'hover': Underlined only on hover
   * - 'none': Never underlined
   * @default always
   */
  @Prop({ reflect: true }) underline: LinkUnderline = LinkUnderline.ALWAYS;

  @Watch('disabled')
  watchDisabled(val: boolean) {
    this.state = val ? LinkState.DISABLED : LinkState.DEFAULT;
  }

  @Watch('state')
  watchState(val: LinkState) {
    this.disabled = val === LinkState.DISABLED;
  }

  @State() private hasDefaultSlotContent: boolean = true; // Default to true to show label slot initially
  @State() private hasIconLeftSlot: boolean = false;
  @State() private hasIconRightSlot: boolean = false;

  componentWillLoad() {
    if (this.disabled) {
      this.state = LinkState.DISABLED;
    } else if (this.state === LinkState.DISABLED) {
      this.disabled = true;
    }
    this.checkDefaultSlotContent();
    this.checkNamedSlots();
  }

  componentDidLoad() {
    this.setupSlotListeners();
  }

  private setupSlotListeners() {
    const slots = this.el.shadowRoot?.querySelectorAll('slot');
    slots?.forEach(slot => {
      slot.addEventListener('slotchange', () => {
        if (slot.name === '' || !slot.name) {
          this.checkDefaultSlotContent();
        } else if (slot.name === 'icon-left' || slot.name === 'icon-right') {
          this.checkNamedSlots();
        }
      });
    });
  }

  private checkNamedSlots() {
    this.hasIconLeftSlot = !!this.el.querySelector('[slot="icon-left"]');
    this.hasIconRightSlot = !!this.el.querySelector('[slot="icon-right"]');
  }

  private checkDefaultSlotContent() {
    // Check light DOM children directly
    const lightDomChildren = Array.from(this.el.childNodes);
    const hasContent = lightDomChildren.some(node => {
      // Skip nodes that are slotted to named slots
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const slotName = element.getAttribute('slot');
        if (slotName) return false; // This is for a named slot, not default
      }
      // Check for text content
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent?.trim() !== '';
      }
      // Element without slot attribute goes to default slot
      return true;
    });

    this.hasDefaultSlotContent = hasContent;
  }

  private get isIconOnly(): boolean {
    return this.iconOnly || !this.hasDefaultSlotContent;
  }

  private get isDisabled(): boolean {
    return this.state === LinkState.DISABLED || this.disabled;
  }

  render() {
    if (this.skeleton) {
      return (
        <Host class={{ 'is-icon-only-skeleton': this.iconOnly }}>
          <cor-skeleton class="skeleton-link"></cor-skeleton>
        </Host>
      );
    }

    const typographyVariantBySize: Record<LinkSize, textVariants | `${textVariants}`> = {
      [LinkSize.MD]: 'body-md',
      [LinkSize.SM]: 'body-sm',
    };

    return (
      <Host>
        <a
          class="link"
          href={this.isDisabled ? undefined : this.href}
          target={this.isDisabled ? undefined : this.target}
          rel={this.target === '_blank' ? 'noopener noreferrer' : undefined}
          aria-label={this.isIconOnly ? this.ariaLabel : undefined}
          aria-disabled={this.isDisabled ? 'true' : undefined}
          tabIndex={this.isDisabled ? -1 : undefined}
        >
          {!this.isIconOnly && this.hasIconLeftSlot && (
            <span class="link__icon link__icon--left">
              <slot name="icon-left"></slot>
            </span>
          )}

          {this.isIconOnly ? (
            <span class="link__icon link__icon--only">
              <slot name="icon"></slot>
            </span>
          ) : (
            <cor-typography variant={typographyVariantBySize[this.size]}>
              <span class="link__label">
                <slot></slot>
              </span>
            </cor-typography>
          )}

          {!this.isIconOnly && this.hasIconRightSlot && (
            <span class="link__icon link__icon--right">
              <slot name="icon-right"></slot>
            </span>
          )}
        </a>
      </Host>
    );
  }
}
