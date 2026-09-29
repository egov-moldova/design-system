import { Component, Element, Host, Prop, forceUpdate, h } from '@stencil/core';

import { localeMessages, watchDocumentLang, shadowLang } from '../../utils/locale';
import type { LocaleProp } from '../../utils/locale';
import { SPINNER_MESSAGES } from './mud-spinner.messages';
import type { SpinnerMessages } from './mud-spinner.messages';
import type { SpinnerSize, SpinnerVariant } from './mud-spinner.types';

/**
 * Spinner — animated circular loading indicator.
 *
 * Pattern B (atom-visual): renders a CSS-only rotating arc.
 * No slots, no events, no interactivity.
 *
 * @element mud-spinner
 */
@Component({
  tag: 'mud-spinner',
  styleUrl: 'mud-spinner.css',
  shadow: true,
})
export class MudSpinner {
  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: SpinnerSize = 'md';

  /**
   * Color treatment.
   * @default 'brand'
   */
  @Prop({ reflect: true }) variant: SpinnerVariant = 'brand';

  /**
   * Language of the built-in copy. Unset, the component follows the closest ancestor `lang`
   * (`<html lang>` included), else `ro-MD`.
   */
  @Prop() locale?: LocaleProp;

  /**
   * Accessible label for screen readers. Overrides the `locale`'s copy when set to a
   * non-empty string.
   * @default 'Se încarcă' (ro-MD)
   */
  @Prop() label?: string;

  @Element() host!: HTMLMudSpinnerElement;

  private stopLang?: () => void;

  connectedCallback() {
    this.stopLang = watchDocumentLang(this.host, () => forceUpdate(this));
  }

  disconnectedCallback() {
    this.stopLang?.();
  }

  /** Built-in strings in the resolved locale, with the override props on top. */
  private messages(): SpinnerMessages {
    return localeMessages('mud-spinner', this.host, this.locale, SPINNER_MESSAGES, {
      label: this.label,
    });
  }

  render() {
    const m = this.messages();
    const hostLang = shadowLang(this.host, this.locale);
    return (
      <Host role="status" aria-label={m.label} aria-live="polite">
        <div class="arc" aria-hidden="true" lang={hostLang} />
      </Host>
    );
  }
}
