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

/**
 * Folds case and strips diacritics so a query matches text the user cannot
 * easily type.
 *
 * Decomposes and drops combining marks rather than carrying a character map:
 * that covers Romanian in both spellings — `ș`/`ț` written with the correct
 * comma below (U+0219, U+021B) and with the cedilla (U+015F, U+0163) that
 * legacy data still uses — without a table to maintain.
 */
export const foldForSearch = (value: string): string => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Whether an option answers the query, following react-select's `createFilter`
 * defaults: the query is trimmed, case and accents are ignored, and the label
 * and value are searched together as one string.
 */
export const optionMatches = (option: SelectOptionEntry, query: string): boolean => {
  const needle = foldForSearch(query.trim());
  if (needle.length === 0) return true;
  return foldForSearch(`${option.label} ${option.value}`).includes(needle);
};

/**
 * Narrows the model to what answers the query.
 *
 * A group survives only while it still has a matching option — an empty heading
 * names nothing — and rules are re-collapsed afterwards, since removing the
 * options around one can leave it dividing nothing.
 */
export const filterEntries = (entries: SelectEntry[], query: string): SelectEntry[] => {
  if (query.trim().length === 0) return entries;

  const kept: SelectEntry[] = [];
  for (const entry of entries) {
    if (entry.kind === 'option') {
      if (optionMatches(entry, query)) kept.push(entry);
      continue;
    }
    // Drop a heading that its own options have just left empty.
    if (entry.kind === 'group' && kept[kept.length - 1]?.kind === 'group') kept.pop();
    kept.push(entry);
  }
  if (kept[kept.length - 1]?.kind === 'group') kept.pop();

  return collapseSeparators(kept);
};
