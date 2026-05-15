import { Component, Host, Element, Prop, Event, EventEmitter, Watch, Listen, h } from '@stencil/core';

import { BreadcrumbItemClickEvent } from './cor-breadcrumbs.types';

/** Tags that receive disabled propagation from the breadcrumb container. */
const PROPAGATE_DISABLED_TAGS = new Set(['cor-link', 'cor-breadcrumbs-ellipsis']);

/** Tags that are valid targets for aria-current="page". */
const ARIA_CURRENT_TAGS = new Set(['cor-link', 'a']);

/**
 * Breadcrumbs navigation molecule — renders a semantic nav/ol with separators and optional ellipsis.
 *
 * @element cor-breadcrumbs
 * @slot default - Breadcrumb items: cor-link, cor-breadcrumbs-ellipsis, or plain text elements
 */
@Component({
  tag: 'cor-breadcrumbs',
  styleUrl: 'cor-breadcrumbs.css',
  shadow: true,
})
export class CorBreadcrumbs {
  /**
   * Accessible label for the nav landmark.
   * @default Breadcrumbs
   */
  @Prop() navLabel: string = 'Breadcrumbs';

  /**
   * Disables all child breadcrumb items (cor-link, cor-breadcrumbs-ellipsis).
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Host element reference.
   */
  @Element() host!: HTMLElement;

  /**
   * Emitted when any breadcrumb item is clicked.
   */
  @Event() corBreadcrumbItemClick!: EventEmitter<BreadcrumbItemClickEvent>;

  /** Slot element ref used to attach/detach slotchange listener. */
  private slotEl?: HTMLSlotElement;

  @Watch('disabled')
  watchDisabled(val: boolean) {
    this.propagateDisabled(val);
  }

  componentDidLoad() {
    this.propagateDisabled(this.disabled);
    this.updateAriaCurrent();

    const slot = this.host.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
    if (slot) {
      this.slotEl = slot;
      slot.addEventListener('slotchange', this.handleSlotChange);
    }
  }

  disconnectedCallback() {
    this.slotEl?.removeEventListener('slotchange', this.handleSlotChange);
  }

  private handleSlotChange = () => {
    this.propagateDisabled(this.disabled);
    this.updateAriaCurrent();
  };

  private propagateDisabled(disabled: boolean) {
    const children = Array.from(this.host.children) as HTMLElement[];
    children.forEach(child => {
      const tag = child.tagName.toLowerCase();
      if (!PROPAGATE_DISABLED_TAGS.has(tag)) return;
      if (disabled) {
        child.setAttribute('disabled', '');
      } else {
        child.removeAttribute('disabled');
      }
    });
  }

  private updateAriaCurrent() {
    const items = Array.from(this.host.children) as HTMLElement[];
    if (items.length === 0) return;
    const navigableItems = items.filter(el => ARIA_CURRENT_TAGS.has(el.tagName.toLowerCase()));
    if (navigableItems.length === 0) return;
    items.forEach(item => item.removeAttribute('aria-current'));
    const last = navigableItems[navigableItems.length - 1];
    last.setAttribute('aria-current', 'page');
  }

  @Listen('corEllipsisItemClick')
  handleEllipsisItemClick(event: CustomEvent<BreadcrumbItemClickEvent>) {
    this.corBreadcrumbItemClick.emit(event.detail);
  }

  @Listen('click')
  handleHostClick(event: MouseEvent) {
    const path = event.composedPath();
    const linkEl = path.find(el => el instanceof HTMLElement && el.tagName.toLowerCase() === 'cor-link') as
      | HTMLElement
      | undefined;

    if (!linkEl) return;

    const value = linkEl.getAttribute('value') ?? linkEl.getAttribute('href') ?? '';
    this.corBreadcrumbItemClick.emit({ value });
  }

  render() {
    return (
      <Host>
        <nav aria-label={this.navLabel}>
          <ol>
            <slot></slot>
          </ol>
        </nav>
      </Host>
    );
  }
}
