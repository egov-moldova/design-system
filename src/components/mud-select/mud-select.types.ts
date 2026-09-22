export const SELECT_SIZES = ['medium', 'large'] as const;
export const SELECT_VARIANTS = ['default', 'destructive'] as const;

export type SelectSize = (typeof SELECT_SIZES)[number];
export type SelectVariant = (typeof SELECT_VARIANTS)[number];

/**
 * A single choice.
 *
 * Also the element type of the deprecated `options` prop, which is why it stays
 * a standalone interface rather than being folded into `SelectOptionEntry`.
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** A choosable row — one `<option>`, or one entry of the `options` prop. */
export interface SelectOptionEntry extends SelectOption {
  kind: 'option';
  /**
   * The markup carried `selected`. Read once, at load, to seed `value` when the
   * host has no `value` attribute; ignored afterwards, so a re-read of the light
   * DOM never overrides what the user has since chosen.
   */
  selected?: boolean;
}

/**
 * A non-choosable heading — one `<optgroup label="…">`. The group's own options
 * follow it in the list; nesting lives in the markup, not in this model, so
 * keyboard navigation can walk a flat array.
 */
export interface SelectGroupEntry {
  kind: 'group';
  label: string;
}

/** A rule between groups of choices — one `<hr>`. */
export interface SelectSeparatorEntry {
  kind: 'separator';
}

/**
 * What the listbox renders, in document order: choices, headings and rules
 * flattened into one list.
 */
export type SelectEntry = SelectOptionEntry | SelectGroupEntry | SelectSeparatorEntry;

/** Narrows an entry to a choosable option. */
export const isOptionEntry = (entry: SelectEntry): entry is SelectOptionEntry => entry.kind === 'option';

export interface SelectChangeDetail {
  value: string;
}
