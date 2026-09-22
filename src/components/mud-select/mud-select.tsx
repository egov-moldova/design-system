import type { EventEmitter } from '@stencil/core';
import { AttachInternals, Component, Element, Event, Host, Listen, Prop, State, Watch, h } from '@stencil/core';

import { SELECT_SIZES, SELECT_VARIANTS, isOptionEntry } from './mud-select.types';
import type { SelectChangeDetail, SelectEntry, SelectSize, SelectVariant, SelectOption } from './mud-select.types';
import {
  entriesFromOptions,
  filterEntries,
  foldForSearch,
  markupSelectedValue,
  readEntriesFromLightDom,
  toRows,
} from './mud-select.utils';
import type { SelectRowOption } from './mud-select.utils';
import { observeAriaLabel } from '../../utils/aria-label';

let selectInstanceCounter = 0;

/**
 * How long a type-ahead buffer survives between keystrokes. Matches the pause a
 * native `<select>` allows, so "be" + "ef" still reaches Beef but a later "b"
 * starts again.
 */
const TYPEAHEAD_RESET_MS = 500;

/**
 * Select — single-select dropdown atom.
 *
 * Matches the Figma `select-input` component (page "Select (Dropdown)",
 * node 411:23995) — kept here under the shorter `mud-select` name. Size rungs
 * follow Figma's own names: `medium` (40px) and `large` (48px).
 *
 * Pattern B (atom-interactive, form-associated): renders a custom-styled
 * trigger button and a listbox popover inside shadow DOM. Form participation
 * works via `formAssociated` + `ElementInternals`. Shares the visual primitives
 * of `mud-text-input` (border, focus ring, label, helper / error text, sizes,
 * states) and adds a trailing chevron icon, listbox menu, and keyboard
 * navigation (ArrowUp/Down/Home/End/Enter/Escape) per the WAI-ARIA combobox
 * pattern.
 *
 * @element mud-select
 *
 * @slot - (default) The option list, written as the markup a native `<select>` takes: `<option>`, `<optgroup label="…">` and `<hr>`. Not rendered directly — each option's `value`, text, `disabled` and `selected` are read, and re-read whenever the markup changes. Used unless the deprecated `options` prop is set.
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown.
 * @slot icon-start - Leading `mud-icon` rendered inside the control row.
 */
@Component({
  tag: 'mud-select',
  styleUrl: 'mud-select.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudSelect {
  /**
   * Color treatment. `destructive` is forced when `invalid` is set.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: SelectVariant = 'default';

  /**
   * Visual size rung.
   * @default 'medium'
   */
  @Prop({ reflect: true }) size: SelectSize = 'medium';

  /**
   * Disables interactivity. The trigger receives `aria-disabled` and the
   * hidden native `<select>` receives the `disabled` attribute.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Marks the field as mandatory. Adds a red asterisk to the label and sets
   * `aria-required` on the trigger.
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Renders the field read-only. The trigger remains focusable but the
   * listbox cannot be opened.
   * @default false
   */
  @Prop({ reflect: true }) readonly: boolean = false;

  /**
   * Forces destructive visuals regardless of `variant`. Sets `aria-invalid`.
   * Use together with `errorText` to surface the message.
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Reflects the open state of the listbox popover. Read-only externally —
   * use `mudOpen` / `mudClose` to react to changes.
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) open: boolean = false;

  /**
   * Selected value. Reflects to the host attribute. Set to empty string when
   * no option is selected.
   * @default ''
   */
  @Prop({ mutable: true, reflect: true }) value: string = '';

  /** Form-control `name`. Used during form submission. */
  @Prop({ reflect: true }) name?: string;

  /** Placeholder shown when no option is selected. */
  @Prop() placeholder?: string;

  /** Plain-text label. Use the `label` slot for richer content. */
  @Prop() label?: string;

  /** Plain-text helper / hint shown below the control. */
  @Prop({ attribute: 'helper-text' }) helperText?: string;

  /**
   * Plain-text error message shown below the control when `invalid` is set.
   * When present it replaces `helperText` and pairs with the error icon.
   */
  @Prop({ attribute: 'error-text' }) errorText?: string;

  /**
   * Lets the user narrow the list by typing into the control.
   *
   * Off by default: turning it on makes the control a text field, which changes
   * how every existing select behaves — including raising an on-screen keyboard
   * on touch — so it is the consumer's call, not a default.
   * @default false
   */
  @Prop({ reflect: true }) searchable: boolean = false;

  /**
   * Declarative option list.
   *
   * @deprecated Write the options as markup instead — `<option>`, `<optgroup>`
   * and `<hr>` children, the same list a native `<select>` takes. Markup also
   * expresses grouping and `selected`, which this array cannot. Still honoured,
   * and still wins over markup when both are present, so existing callers keep
   * working; scheduled for removal in the next major.
   */
  @Prop() options?: SelectOption[];

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private hasIconStart: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private highlightedIndex: number = -1;
  @State() private entries: SelectEntry[] = [];
  /** What the user has typed. Empty unless `searchable` and the user is typing. */
  @State() private query: string = '';
  /** The host's `aria-label` (attribute or native `ariaLabel` property), mirrored to the trigger when no visible label is present. */
  @State() private resolvedAriaLabel?: string;
  /** True when the listbox is flipped above the control (not enough room below). */
  @State() private dropUp: boolean = false;
  /** Runtime cap (px) on the listbox height so it never spills past the viewport. */
  @State() private listboxMaxBlockSize?: number;

  @Element() host!: HTMLMudSelectElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires when the selected value changes. `detail.value` is the new value. */
  @Event() mudChange!: EventEmitter<SelectChangeDetail>;

  /** Fires when the listbox opens. */
  @Event() mudOpen!: EventEmitter<void>;

  /** Fires when the listbox closes. */
  @Event() mudClose!: EventEmitter<void>;

  /** Fires when the trigger gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the trigger loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++selectInstanceCounter;
  private readonly labelId = `mud-select-label-${this.instanceId}`;
  private readonly helperId = `mud-select-helper-${this.instanceId}`;
  private readonly errorId = `mud-select-error-${this.instanceId}`;
  private readonly triggerId = `mud-select-trigger-${this.instanceId}`;
  private readonly listboxId = `mud-select-listbox-${this.instanceId}`;
  private initialValue: string = '';
  private triggerEl?: HTMLInputElement;
  private listboxEl?: HTMLElement;
  private stopAriaLabel?: () => void;
  private optionsObserver?: MutationObserver;
  private typeaheadBuffer: string = '';
  private typeaheadTimer?: ReturnType<typeof setTimeout>;

  connectedCallback() {
    this.stopAriaLabel = observeAriaLabel(this.host, label => (this.resolvedAriaLabel = label));
    this.observeOptions();
  }

  /**
   * `slotchange` is not enough on its own. Appending an `<option>` inside an
   * `<optgroup>` leaves the slot's assigned nodes untouched — the `optgroup`
   * itself did not change — so the event never fires and the listbox keeps
   * showing a stale list. The same goes for flipping `disabled` or rewriting an
   * option's text, neither of which is a slot change at all.
   */
  private observeOptions() {
    if (typeof MutationObserver === 'undefined') return;
    this.optionsObserver = new MutationObserver(() => this.refreshEntries());
    this.optionsObserver.observe(this.host, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'label', 'disabled', 'selected'],
    });
  }

  componentWillLoad() {
    this.refreshEntries();
    this.adoptMarkupSelection();
    // Captured after the markup has had its say, so a form reset restores what
    // the page shipped with — which is what resetting a native <select> does.
    this.initialValue = this.value;
    this.internals.setFormValue(this.value, this.value);
    this.syncValidity();
    if (this.open) this.primeHighlight();
  }

  componentDidLoad() {
    // An initially-`open` select still needs its popover measured (the `@Watch`
    // doesn't fire for the starting prop value). componentDidRender handles the
    // measure; here we only wire the reposition listeners.
    if (this.open && typeof window !== 'undefined') {
      window.addEventListener('resize', this.positionListbox);
      window.addEventListener('scroll', this.positionListbox, true);
    }
  }

  private primeHighlight() {
    const idx = this.resolvedOptions().findIndex(opt => opt.value === this.value && !opt.disabled);
    this.highlightedIndex = idx >= 0 ? idx : this.firstEnabledIndex();
  }

  /**
   * Reflects required + value into `ElementInternals` so the host participates
   * in native form validation. Anchored on the trigger button so a11y focus
   * lands on the visible control.
   */
  private syncValidity() {
    if (!this.internals) return;
    const value = (this.value ?? '').trim();
    if (this.required && value.length === 0) {
      this.internals.setValidity({ valueMissing: true }, 'Selectați o opțiune.', this.triggerEl);
      return;
    }
    this.internals.setValidity({});
  }

  @Watch('variant')
  validateVariant(next: SelectVariant) {
    if (!SELECT_VARIANTS.includes(next)) {
      console.warn(
        `[mud-select] variant="${String(next)}" is not supported. Supported: ${SELECT_VARIANTS.join(
          ', ',
        )}. Falling back to "default".`,
      );
      this.variant = 'default';
    }
  }

  @Watch('size')
  validateSize(next: SelectSize) {
    if (!SELECT_SIZES.includes(next)) {
      console.warn(
        `[mud-select] size="${String(next)}" is not supported. Supported: ${SELECT_SIZES.join(
          ', ',
        )}. Falling back to "medium".`,
      );
      this.size = 'medium';
    }
  }

  @Watch('value')
  handleValueChange(next: string) {
    const value = next ?? '';
    this.internals.setFormValue(value, value);
    this.syncValidity();
  }

  @Watch('required')
  handleRequiredChange() {
    this.syncValidity();
  }

  @Watch('options')
  handleOptionsChange() {
    this.refreshEntries();
    if (this.open && this.highlightedIndex < 0) this.primeHighlight();
  }

  @Watch('open')
  handleOpenChange(next: boolean) {
    // Thin sync only — open/close imperative work lives in setListboxOpen().
    if (next) {
      this.primeHighlight();
      // Once the listbox is in the DOM: decide drop-down vs flip-up and cap its
      // height to the visible viewport (see positionListbox).
      requestAnimationFrame(() => this.positionListbox());
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this.positionListbox);
        window.addEventListener('scroll', this.positionListbox, true);
      }
      this.mudOpen.emit();
    } else {
      this.highlightedIndex = -1;
      this.dropUp = false;
      this.listboxMaxBlockSize = undefined;
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', this.positionListbox);
        window.removeEventListener('scroll', this.positionListbox, true);
      }
      this.mudClose.emit();
    }
  }

  /**
   * The listbox stays `position: absolute` under the control (predictable, no
   * containing-block surprises). This only measures the room above / below the
   * trigger to (a) flip the popover above it when it doesn't fit below and
   * (b) cap its height so it never spills past the viewport edge. Pure DOM read
   * + two primitive `@State` writes — safe to call on scroll / resize.
   */
  private positionListbox = () => {
    if (!this.open || typeof window === 'undefined') return;
    const control = this.host.shadowRoot?.querySelector('.control') as HTMLElement | null;
    const listbox = this.listboxEl;
    if (!control || !listbox) return;

    const rect = control.getBoundingClientRect();
    const EDGE_MARGIN = 8; // breathing room from the viewport edge
    const GAP = 4; // matches --select-listbox-margin-block-start
    const HARD_CAP = 320; // --select-listbox-max-block-size
    const MIN_HEIGHT = 120;

    const spaceBelow = window.innerHeight - rect.bottom - GAP - EDGE_MARGIN;
    const spaceAbove = rect.top - GAP - EDGE_MARGIN;
    // scrollHeight already reflects the current cap; add it back so a listbox
    // that's *currently* clamped can still un-flip when space opens up on scroll.
    const naturalHeight = Math.max(listbox.scrollHeight, this.listboxMaxBlockSize ?? 0);
    const wanted = Math.min(naturalHeight, HARD_CAP);

    const dropUp = spaceBelow < wanted && spaceAbove > spaceBelow;
    const available = dropUp ? spaceAbove : spaceBelow;

    this.dropUp = dropUp;
    this.listboxMaxBlockSize = Math.round(Math.max(MIN_HEIGHT, Math.min(HARD_CAP, available)));
  };

  componentDidRender() {
    if (this.open) this.positionListbox();
  }

  disconnectedCallback() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.positionListbox);
      window.removeEventListener('scroll', this.positionListbox, true);
    }
    this.stopAriaLabel?.();
    this.optionsObserver?.disconnect();
    this.optionsObserver = undefined;
    if (this.typeaheadTimer !== undefined) clearTimeout(this.typeaheadTimer);
  }

  /** Mirrors `disabled` from an ancestor `<fieldset disabled>` without clobbering the consumer-set prop. */
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.value = this.initialValue;
    this.internals.setFormValue(this.initialValue, this.initialValue);
    this.syncValidity();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      this.value = state;
      this.internals.setFormValue(state, state);
      this.syncValidity();
    }
  }

  @Listen('click', { target: 'document' })
  handleDocumentClick(ev: MouseEvent) {
    if (!this.open) return;
    // The trigger's onClick handler stops propagation, so any click that
    // reaches the document listener originated outside this component.
    // Defensive check: composedPath / host.contains for environments that
    // don't honor stopPropagation across shadow boundaries.
    if (ev.target === this.host) return;
    const path = typeof ev.composedPath === 'function' ? ev.composedPath() : [];
    if (path.includes(this.host)) return;
    const target = ev.target as Node | null;
    if (target && this.host.contains(target)) return;
    this.closeListbox();
  }

  private onLabelSlotChange = (ev: Event) => {
    this.hasLabelSlot = this.slotHasContent(ev);
  };
  private onHelperSlotChange = (ev: Event) => {
    this.hasHelperSlot = this.slotHasContent(ev);
  };
  private onIconStartSlotChange = (ev: Event) => {
    this.hasIconStart = this.slotHasContent(ev);
  };
  private onDefaultSlotChange = () => {
    this.refreshEntries();
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  }

  /**
   * Seeds `value` from `<option selected>`, the way a native `<select>` starts on
   * its selected option.
   *
   * Only when the author set no value. A non-empty `value` is explicit however it
   * arrived, which matters because a framework — and JSX — sets the property
   * before the attribute exists, so an attribute check alone would clobber it.
   * The attribute is still consulted, since `value=""` is an explicit empty
   * choice that the reflected default is otherwise indistinguishable from.
   */
  private adoptMarkupSelection() {
    if (this.value !== '' || this.host.hasAttribute('value')) return;
    const selected = markupSelectedValue(this.entries);
    if (selected !== undefined) this.value = selected;
  }

  /**
   * Rebuilds the rendered model. The deprecated `options` prop still wins over
   * markup so existing callers keep their behaviour.
   */
  private refreshEntries() {
    this.entries =
      this.options && this.options.length > 0 ? entriesFromOptions(this.options) : readEntriesFromLightDom(this.host);
  }

  /**
   * The model after the query — what is rendered, and what the keyboard walks.
   * Everything downstream indexes into this, never into the unfiltered list, so
   * a highlight always points at a row the user can see.
   */
  private visibleEntries(): SelectEntry[] {
    return this.searchable && this.query.trim().length > 0 ? filterEntries(this.entries, this.query) : this.entries;
  }

  /** The choices, in render order — what `highlightedIndex` and `value` index into. */
  private resolvedOptions(): SelectOption[] {
    return this.visibleEntries().filter(isOptionEntry);
  }

  private resolvedVariant(): SelectVariant {
    return this.invalid ? 'destructive' : this.variant;
  }

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private hasVisibleLabel(): boolean {
    return Boolean(this.label && this.label.trim().length > 0) || this.hasLabelSlot;
  }

  private hasErrorMessage(): boolean {
    return this.invalid && Boolean(this.errorText && this.errorText.trim().length > 0);
  }

  private hasHelperMessage(): boolean {
    if (this.hasErrorMessage()) return false;
    if (this.helperText && this.helperText.trim().length > 0) return true;
    return this.hasHelperSlot;
  }

  private describedBy(): string | undefined {
    const ids: string[] = [];
    if (this.hasErrorMessage()) ids.push(this.errorId);
    else if (this.hasHelperMessage()) ids.push(this.helperId);
    return ids.length > 0 ? ids.join(' ') : undefined;
  }

  private firstEnabledIndex(): number {
    const opts = this.resolvedOptions();
    for (let i = 0; i < opts.length; i++) if (!opts[i].disabled) return i;
    return -1;
  }

  private lastEnabledIndex(): number {
    const opts = this.resolvedOptions();
    for (let i = opts.length - 1; i >= 0; i--) if (!opts[i].disabled) return i;
    return -1;
  }

  private nextEnabledIndex(from: number, step: 1 | -1): number {
    const opts = this.resolvedOptions();
    if (opts.length === 0) return -1;
    let i = from;
    for (let n = 0; n < opts.length; n++) {
      i = (i + step + opts.length) % opts.length;
      if (!opts[i].disabled) return i;
    }
    return from;
  }

  /**
   * Single entrypoint for open/close. Owns the imperative side effects
   * (focus return on close) so `@Watch('open')` can stay a thin DOM sync.
   */
  private setListboxOpen(next: boolean, opts: { returnFocus?: boolean } = {}) {
    if (this.open === next) return;
    this.open = next;
    // A query outlives nothing: a closed listbox showing a filtered label would
    // be lying about what is selected.
    if (!next) this.query = '';
    if (!next && opts.returnFocus !== false) this.triggerEl?.focus();
  }

  private openListbox = () => {
    if (this.isInert() || this.readonly) return;
    this.setListboxOpen(true);
  };

  private closeListbox = () => {
    this.setListboxOpen(false);
  };

  /**
   * One handler for the whole control row, the input included. The chevron and
   * the icon-start slot sit beside the input, so a click there would otherwise
   * be dead; letting the input's own click bubble here instead of handling it
   * separately keeps a single click from being acted on twice.
   */
  /**
   * Takes the browser's default focus handling off the control row and does it
   * ourselves. Clicking a row whose input already has focus otherwise leaves the
   * input focused but no longer accepting text — keydown and beforeinput fire,
   * the edit never lands. react-select prevents the same default for the same
   * reason.
   */
  private handleControlMouseDown = (ev: MouseEvent) => {
    if (this.isInert() || this.readonly) return;
    ev.preventDefault();
    this.triggerEl?.focus();
  };

  private handleControlClick = (ev: MouseEvent) => {
    // Keep this click from reaching the document listener, which would read it
    // as an outside-click and immediately close what we just opened.
    ev.stopPropagation();
    if (this.isInert() || this.readonly) return;

    if (this.host.shadowRoot?.activeElement !== this.triggerEl) this.triggerEl?.focus();
    // A searchable field that is already open reads the click as the user
    // placing the caret in their query, not as a request to close.
    if (this.searchable && this.open) return;
    this.setListboxOpen(!this.open);
  };

  private handleInput = (ev: Event) => {
    if (!this.searchable || this.readonly || this.isInert()) return;
    this.query = (ev.target as HTMLInputElement).value;
    if (!this.open) this.setListboxOpen(true);
    // The old highlight indexed the unfiltered list; re-aim it at the new first row.
    this.highlightedIndex = this.firstEnabledIndex();
  };

  private selectIndex(index: number, { returnFocus = true }: { returnFocus?: boolean } = {}) {
    const opts = this.resolvedOptions();
    const opt = opts[index];
    if (!opt || opt.disabled) return;
    const next = opt.value;
    if (next !== this.value) {
      this.value = next;
      this.mudChange.emit({ value: next });
    }
    this.query = '';
    this.setListboxOpen(false, { returnFocus });
  }

  /**
   * Jumps the highlight to the first option starting with what was typed — what
   * a native `<select>` does with the same keystrokes. Only when the control is
   * not searchable; there, the same keys build a query instead.
   */
  private handleTypeahead(key: string) {
    this.typeaheadBuffer += key;
    if (this.typeaheadTimer !== undefined) clearTimeout(this.typeaheadTimer);
    this.typeaheadTimer = setTimeout(() => (this.typeaheadBuffer = ''), TYPEAHEAD_RESET_MS);

    const needle = foldForSearch(this.typeaheadBuffer);
    const match = this.resolvedOptions().findIndex(opt => !opt.disabled && foldForSearch(opt.label).startsWith(needle));
    if (match < 0) return;

    this.highlightedIndex = match;
    if (!this.open) this.openListbox();
    this.scrollHighlightedIntoView();
  }

  /** A character the user meant as text, rather than a command. */
  private isTypeaheadKey(ev: KeyboardEvent): boolean {
    return ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey;
  }

  private handleTriggerKeyDown = (ev: KeyboardEvent) => {
    if (this.isInert() || this.readonly) return;
    const key = ev.key;
    // Space continues a type-ahead buffer rather than acting on the list, the
    // same exception react-select makes for a space inside a query.
    const spaceIsText = key === ' ' && (this.query.length > 0 || this.typeaheadBuffer.length > 0);

    if (!this.searchable && this.isTypeaheadKey(ev) && (key !== ' ' || spaceIsText)) {
      ev.preventDefault();
      this.handleTypeahead(key);
      return;
    }

    if (!this.open) {
      // Closed: arrows + Enter/Space open the listbox and prime the highlight.
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        ev.preventDefault();
        this.openListbox();
      }
      return;
    }

    switch (key) {
      case 'ArrowDown':
        ev.preventDefault();
        this.highlightedIndex = this.nextEnabledIndex(this.highlightedIndex, 1);
        this.scrollHighlightedIntoView();
        break;
      case 'ArrowUp':
        ev.preventDefault();
        this.highlightedIndex = this.nextEnabledIndex(this.highlightedIndex, -1);
        this.scrollHighlightedIntoView();
        break;
      case 'Home':
        ev.preventDefault();
        this.highlightedIndex = this.firstEnabledIndex();
        this.scrollHighlightedIntoView();
        break;
      case 'End':
        ev.preventDefault();
        this.highlightedIndex = this.lastEnabledIndex();
        this.scrollHighlightedIntoView();
        break;
      case 'Enter':
        ev.preventDefault();
        if (this.highlightedIndex >= 0) this.selectIndex(this.highlightedIndex);
        break;
      case ' ':
        // With a query underway the space belongs to the text, not to the list.
        if (spaceIsText) return;
        ev.preventDefault();
        if (this.highlightedIndex >= 0) this.selectIndex(this.highlightedIndex);
        break;
      case 'Escape':
        ev.preventDefault();
        this.closeListbox();
        break;
      case 'Tab':
        // Tab commits the highlighted option, which is both react-select's
        // default and what a native <select> does. Focus moves on naturally, so
        // no focus return on close.
        if (this.highlightedIndex >= 0) this.selectIndex(this.highlightedIndex, { returnFocus: false });
        this.setListboxOpen(false, { returnFocus: false });
        break;
    }
  };

  private scrollHighlightedIntoView() {
    requestAnimationFrame(() => {
      const list = this.listboxEl;
      if (!list) return;
      const opt = list.querySelector(`[data-option-index="${this.highlightedIndex}"]`) as HTMLElement | null;
      opt?.scrollIntoView({ block: 'nearest' });
    });
  }

  private handleTriggerFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    this.mudFocus.emit(ev);
  };

  private handleTriggerBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.mudBlur.emit(ev);
  };

  private handleOptionPointerEnter = (index: number) => () => {
    this.highlightedIndex = index;
  };

  private handleOptionClick = (index: number) => (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.selectIndex(index);
  };

  private renderOption = ({ option, index }: SelectRowOption, iconSize: 20 | 24) => {
    const isSelected = option.value === this.value;
    const isHighlighted = index === this.highlightedIndex;
    return (
      <div
        id={`${this.listboxId}-opt-${index}`}
        class={{
          'option': true,
          'is-selected': isSelected,
          'is-highlighted': isHighlighted && !option.disabled,
          'is-disabled': Boolean(option.disabled),
        }}
        role="option"
        aria-selected={isSelected ? 'true' : 'false'}
        aria-disabled={option.disabled ? 'true' : null}
        data-option-index={index}
        data-value={option.value}
        onClick={option.disabled ? undefined : this.handleOptionClick(index)}
        onMouseEnter={option.disabled ? undefined : this.handleOptionPointerEnter(index)}
      >
        <span class="option-label">{option.label}</span>
        {isSelected ? <mud-icon class="option-check" name="checkmark-small" size={iconSize} /> : null}
      </div>
    );
  };

  render() {
    const effectivelyDisabled = this.isInert();
    const variant = this.resolvedVariant();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const errorText = this.errorText?.trim();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.resolvedAriaLabel : undefined;
    const opts = this.resolvedOptions();
    // From the whole model, not the filtered view: a query that matches nothing
    // must not make the current selection look as though it had been cleared.
    const selected = this.entries.filter(isOptionEntry).find(opt => opt.value === this.value);
    const canType = this.searchable && !this.readonly && !effectivelyDisabled;
    // Open and searchable, the field is the query box: it starts empty however
    // full the selection is, so the first keystroke begins a query instead of
    // being appended to the selected label. The selection steps back to the
    // placeholder, where it stays readable. Closed, the field is the selection.
    const showsQuery = canType && this.open;
    const triggerText = showsQuery ? this.query : (selected?.label ?? '');
    const placeholderText = showsQuery ? (selected?.label ?? this.placeholder) : this.placeholder;
    const isPlaceholder = !selected;
    const activeDescendantId =
      this.open && this.highlightedIndex >= 0 ? `${this.listboxId}-opt-${this.highlightedIndex}` : undefined;
    // Chevron + selected-option check scale with the size rung (medium 20 / large 24)
    // to match the Figma spec; the responsive CSS box sizes the host, this
    // keeps the SVG glyph dimensions in step so the two never diverge.
    const iconSize: 20 | 24 = this.size === 'large' ? 24 : 20;

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-invalid': this.invalid,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'is-open': this.open && !effectivelyDisabled,
      'is-drop-up': this.open && this.dropUp && !effectivelyDisabled,
      'is-placeholder': isPlaceholder,
      'has-label': this.hasVisibleLabel(),
      'has-icon-start': this.hasIconStart,
      [`variant-${variant}`]: true,
    };

    return (
      <Host class={hostClasses}>
        <label class="label" htmlFor={this.triggerId} id={this.labelId} part="label">
          <span class="label-text">
            {this.hasLabelSlot ? null : labelText}
            <slot name="label" onSlotchange={this.onLabelSlotChange} />
          </span>
          {this.required ? (
            <span class="required-mark" aria-hidden="true" part="required-mark">
              *
            </span>
          ) : null}
        </label>

        <div class="control-wrapper">
          {/* A click on the non-button chrome (chevron / icon-start) is forwarded
              to the trigger, which stays the keyboard-focusable control. */}
          <div
            class="control"
            part="control"
            onMouseDown={this.handleControlMouseDown}
            onClick={this.handleControlClick}
          >
            <span class="control-icon control-icon-start" aria-hidden={this.hasIconStart ? null : 'true'}>
              <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />
            </span>

            {/* An input, not a button: ARIA 1.2 names <input role="combobox"> as
                the pattern, and a filter has to be typed into something. Without
                `searchable` it is not editable — `readonly` plus
                `inputmode="none"` keep the caret and the on-screen keyboard
                away while leaving it focusable and keyboard-operable. */}
            <input
              ref={el => (this.triggerEl = el)}
              id={this.triggerId}
              class={{ 'trigger': true, 'is-placeholder': isPlaceholder && !showsQuery }}
              part="trigger"
              type="text"
              role="combobox"
              autocomplete="off"
              spellcheck={false}
              inputmode={canType ? undefined : 'none'}
              readOnly={!canType}
              value={triggerText}
              placeholder={placeholderText}
              aria-haspopup="listbox"
              aria-expanded={this.open ? 'true' : 'false'}
              aria-controls={this.listboxId}
              aria-activedescendant={activeDescendantId}
              aria-autocomplete="list"
              aria-label={ariaLabelAttr}
              aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
              aria-describedby={this.describedBy()}
              aria-invalid={this.invalid ? 'true' : null}
              aria-required={this.required ? 'true' : null}
              aria-readonly={this.readonly ? 'true' : null}
              disabled={effectivelyDisabled}
              onInput={this.handleInput}
              onKeyDown={this.handleTriggerKeyDown}
              onFocus={this.handleTriggerFocus}
              onBlur={this.handleTriggerBlur}
            />

            <span class="control-icon control-icon-end" aria-hidden="true">
              <mud-icon class="chevron" name="chevron-bottom" size={iconSize} />
            </span>
          </div>

          <div
            ref={el => (this.listboxEl = el)}
            id={this.listboxId}
            class="listbox"
            part="listbox"
            role="listbox"
            aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
            aria-label={!this.hasVisibleLabel() ? (this.resolvedAriaLabel ?? 'Options') : undefined}
            hidden={!this.open}
            style={
              this.listboxMaxBlockSize
                ? { '--_listbox-max-block-size': `${String(this.listboxMaxBlockSize)}px` }
                : undefined
            }
          >
            {opts.length === 0 ? (
              <div class="listbox-empty" role="presentation">
                No options
              </div>
            ) : (
              toRows(this.visibleEntries()).map((row, rowIndex) => {
                if (row.kind === 'separator') return <div class="listbox-separator" role="separator"></div>;
                if (row.kind === 'option') return this.renderOption(row, iconSize);

                // `role="group"` needs a name, and the heading is it — a listbox
                // child with no role of its own would otherwise be announced as
                // one more option.
                const headingId = `${this.listboxId}-group-${rowIndex}`;
                return (
                  <div class="option-group" role="group" aria-labelledby={headingId}>
                    <div class="group-heading" id={headingId} role="presentation">
                      <span class="group-label">{row.label}</span>
                    </div>
                    {row.options.map(item => this.renderOption(item, iconSize))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <span class="default-slot" aria-hidden="true">
          <slot onSlotchange={this.onDefaultSlotChange} />
        </span>

        {this.hasErrorMessage() ? (
          <div class="assistive assistive-error" id={this.errorId} part="error">
            <mud-icon
              class="assistive-icon"
              name="circle-error"
              variant="filled"
              size={20}
              color="icon-danger-default"
            />
            <span class="assistive-text">{errorText}</span>
          </div>
        ) : this.hasHelperMessage() ? (
          <div class="assistive assistive-helper" id={this.helperId} part="helper">
            <span class="assistive-text">
              {this.hasHelperSlot ? null : helperText}
              <slot name="helper" onSlotchange={this.onHelperSlotChange} />
            </span>
          </div>
        ) : null}
      </Host>
    );
  }
}
