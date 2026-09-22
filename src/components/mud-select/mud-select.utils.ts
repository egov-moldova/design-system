import type { SelectEntry, SelectOption, SelectOptionEntry } from './mud-select.types';

/** One choice, paired with its position in the flat option list. */
export interface SelectRowOption {
  option: SelectOptionEntry;
  index: number;
}

/** What the listbox lays out: a loose choice, a rule, or a labelled run of choices. */
export type SelectRow =
  | ({ kind: 'option' } & SelectRowOption)
  | { kind: 'separator' }
  | { kind: 'group'; label: string; options: SelectRowOption[] };

/** Tag names accepted as a choice. `core-option` is the legacy spelling. */
const OPTION_TAGS = new Set(['OPTION', 'CORE-OPTION']);

const isOptionElement = (el: Element): boolean => OPTION_TAGS.has(el.tagName);

/**
 * Reads one `<option>`. A native option with no `value` attribute submits its
 * own text, so the label doubles as the value.
 *
 * `inheritedDisabled` carries `<optgroup disabled>` down: the native element
 * disables its whole group, and an option cannot opt back in.
 */
const toOptionEntry = (el: Element, inheritedDisabled: boolean): SelectOptionEntry => {
  const label = (el.textContent ?? '').trim();
  return {
    kind: 'option',
    value: el.getAttribute('value') ?? label,
    label,
    disabled: inheritedDisabled || el.hasAttribute('disabled'),
    selected: el.hasAttribute('selected'),
  };
};

/**
 * Drops rules that have nothing to divide: at either end of the list, doubled
 * up, or against a group heading, which draws its own rule above its label.
 * A native `<select>` renders nothing in those positions either.
 */
export const collapseSeparators = (entries: SelectEntry[]): SelectEntry[] => {
  const out: SelectEntry[] = [];

  for (const entry of entries) {
    if (entry.kind === 'separator') {
      const prev = out[out.length - 1];
      if (!prev || prev.kind === 'separator' || prev.kind === 'group') continue;
      out.push(entry);
      continue;
    }
    // A heading supplies its own rule, so a preceding one would double it.
    if (entry.kind === 'group' && out[out.length - 1]?.kind === 'separator') out.pop();
    out.push(entry);
  }

  while (out[out.length - 1]?.kind === 'separator') out.pop();
  return out;
};

/**
 * Flattens the light-DOM children into the rows the listbox renders.
 *
 * `<optgroup>` contributes a heading followed by its own options, so nesting
 * stays in the markup and never reaches the rendered model — keyboard
 * navigation walks one array. An `<optgroup>` with no `label` contributes its
 * options and no heading.
 */
export const readEntriesFromLightDom = (host: Element): SelectEntry[] => {
  const entries: SelectEntry[] = [];

  for (const child of Array.from(host.children)) {
    if (isOptionElement(child)) {
      entries.push(toOptionEntry(child, false));
      continue;
    }

    if (child.tagName === 'OPTGROUP') {
      const label = (child.getAttribute('label') ?? '').trim();
      if (label) entries.push({ kind: 'group', label });
      const groupDisabled = child.hasAttribute('disabled');
      for (const grandchild of Array.from(child.children)) {
        if (isOptionElement(grandchild)) entries.push(toOptionEntry(grandchild, groupDisabled));
      }
      continue;
    }

    if (child.tagName === 'HR') entries.push({ kind: 'separator' });
  }

  return collapseSeparators(entries);
};

/**
 * The value a native `<select>` would start on: the first selectable option
 * marked `selected`. Returns `undefined` when the markup marks none, so the
 * caller can leave `value` alone rather than guessing.
 */
export const markupSelectedValue = (entries: SelectEntry[]): string | undefined =>
  entries.find((entry): entry is SelectOptionEntry => entry.kind === 'option' && !!entry.selected && !entry.disabled)
    ?.value;

/** Wraps the deprecated `options` prop in the entry model. */
export const entriesFromOptions = (options: SelectOption[]): SelectEntry[] =>
  options.map(option => ({ kind: 'option', ...option }) as SelectOptionEntry);

/**
 * Rebuilds the nesting the flat model threw away, so a group can render as one
 * `role="group"` around its own choices.
 *
 * A heading owns every choice up to the next heading or rule. `index` counts
 * choices in document order and ignores the nesting, which is what keeps it in
 * step with the flat list the keyboard walks.
 */
export const toRows = (entries: SelectEntry[]): SelectRow[] => {
  const rows: SelectRow[] = [];
  let index = 0;
  let openGroup: Extract<SelectRow, { kind: 'group' }> | undefined;

  for (const entry of entries) {
    if (entry.kind === 'group') {
      openGroup = { kind: 'group', label: entry.label, options: [] };
      rows.push(openGroup);
      continue;
    }
    if (entry.kind === 'separator') {
      openGroup = undefined;
      rows.push({ kind: 'separator' });
      continue;
    }
    const row: SelectRowOption = { option: entry, index: index++ };
    if (openGroup) openGroup.options.push(row);
    else rows.push({ kind: 'option', ...row });
  }

  return rows;
};
