import { Component, Element, Event, EventEmitter, h, Host, Listen, Prop } from '@stencil/core';

import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';

/**
 * Interactive icon button for table column headers.
 * Used for actions like sorting, filtering, and menus within cor-column.
 *
 * @element cor-column-action
 * @slot - Default slot for cor-icon element only
 */
@Component({
  tag: 'cor-column-action',
  styleUrl: 'cor-column-action.css',
  shadow: true,
})
export class CorColumnAction {
  /**
   * Disables the action button
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Sets the action button to active state
   * @default false
   */
  @Prop({ reflect: true }) active: boolean = false;

  /**
   * Whether the action button is tabbable (can receive keyboard focus via Tab)
   * @default true
   */
  @Prop() tabbable: boolean = true;

  /**
   * Whether to hide the focus ring when focused. When true, focus still bubbles to parent column.
   * @default false
   */
  @Prop({ reflect: true }) hideFocusRing: boolean = false;

  /**
   * Optional semantic type for analytics/debugging (not used for styling)
   */
  @Prop() type?: string;

  /**
   * Host element reference
   */
  @Element() host!: HTMLCorColumnActionElement;

  /**
   * Emitted when the action button is clicked
   */
  @Event() corAction!: EventEmitter<MouseEvent>;

  /**
   * Emitted when the action button loses focus or click-outside occurs
   */
  @Event() corActionBlur!: EventEmitter<void>;

  @Listen('focusout')
  handleFocusOut() {
    this.corActionBlur.emit();
  }

  @Listen('keydown')
  handleKeyDown(event: KeyboardEvent) {
    if (this.disabled) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.corAction.emit(event as unknown as MouseEvent);
    }
  }

  @Listen('click')
  handleClick(event: MouseEvent) {
    if (!this.disabled) {
      this.corAction.emit(event);
    }
  }

  private getHostClasses(): string {
    return '';
  }

  render() {
    const slottedElement = this.host.firstElementChild;
    const tag = slottedElement?.tagName?.toLowerCase() ?? '';

    if (tag && tag !== 'cor-icon') {
      return <Host>{invalidSlottedTag(tag, ['cor-icon'])}</Host>;
    }

    return (
      <Host
        role="button"
        tabIndex={this.disabled || !this.tabbable ? -1 : 0}
        aria-disabled={this.disabled ? 'true' : 'false'}
        class={this.getHostClasses()}
      >
        <slot />
      </Host>
    );
  }
}
