import { Component, Element, Event, EventEmitter, h, Host, Listen, Prop } from '@stencil/core';

import { TabSize, TabStyle } from '../cor-tab-button/cor-tab-button.enums';

/**
 * Tab container. Wraps `cor-tab-button` segments and propagates shared props.
 * Emits `corTabChange` when a child tab is selected — does NOT manage active state internally.
 *
 * @element cor-tabs
 * @slot - One or more `cor-tab-button` elements
 *
 * @cssprop --tab-border-color - Container border color
 * @cssprop --tab-border-radius - Container border radius
 * @cssprop --tab-padding - Inner padding (style-1 / style-2)
 * @cssprop --tab-background - Container background
 */
@Component({
  tag: 'cor-tabs',
  styleUrl: 'cor-tabs.css',
  shadow: true,
})
export class CorTabs {
  /**
   * Visual style variant for all child tab buttons.
   * @default style-1
   */
  @Prop({ reflect: true }) tabStyle: TabStyle = TabStyle.STYLE_1;

  /**
   * Size applied to all child tab buttons.
   * @default md
   */
  @Prop({ reflect: true }) size: TabSize = TabSize.MD;

  /**
   * Value of the currently selected tab. Propagated to children as `selected`.
   * When set, the matching child (by `value`) gets `selected`, all others are unselected.
   */
  @Prop({ reflect: true }) value: string = '';

  /**
   * Disables all child tab buttons.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Container-level error indicator (e.g. red border on the tabs container).
   * @default false
   */
  @Prop({ reflect: true }) error: boolean = false;

  /**
   * Accessible label for the tab list. Required for accessibility.
   */
  @Prop() label?: string;

  @Element() host!: HTMLCorTabsElement;

  @Event() corTabChange!: EventEmitter<{ value: string }>;

  @Listen('corTabSelect')
  handleTabSelect(event: CustomEvent<{ value: string }>) {
    event.stopPropagation();
    // Only emit corTabChange if the selected tab is different from the current value
    if (event.detail.value !== this.value) {
      this.corTabChange.emit({ value: event.detail.value });
    }
  }

  @Listen('keydown')
  handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    const children = this.getChildren().filter(btn => !btn.disabled);
    if (children.length === 0) {
      return;
    }
    const current = children.findIndex(btn => btn.shadowRoot?.querySelector('button') === document.activeElement);
    if (current < 0) {
      return;
    }
    const next =
      event.key === 'ArrowRight' ? (current + 1) % children.length : (current - 1 + children.length) % children.length;
    event.preventDefault();
    children[next].shadowRoot?.querySelector<HTMLButtonElement>('button')?.focus();
  }

  componentDidLoad() {
    this.propagateAll();
  }

  componentDidUpdate() {
    this.propagateAll();
  }

  private getChildren(): HTMLCorTabButtonElement[] {
    return Array.from(this.host.querySelectorAll('cor-tab-button')) as HTMLCorTabButtonElement[];
  }

  private propagateSelected(value: string) {
    this.getChildren().forEach(btn => {
      btn.selected = btn.value === value;
    });
  }

  private propagateDisabled(disabled: boolean) {
    this.getChildren().forEach(btn => {
      btn.disabled = disabled;
    });
  }

  private propagateSize(size: TabSize) {
    this.getChildren().forEach(btn => {
      btn.size = size;
    });
  }

  private propagateTabStyle(tabStyle: TabStyle) {
    this.getChildren().forEach(btn => {
      btn.tabStyle = tabStyle;
    });
  }

  private propagateAll() {
    this.propagateTabStyle(this.tabStyle);
    this.propagateSize(this.size);
    this.propagateDisabled(this.disabled);
    if (this.value) {
      this.propagateSelected(this.value);
    }
  }

  render() {
    return (
      <Host role="tablist" aria-label={this.label}>
        <slot />
      </Host>
    );
  }
}
