import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { expect, waitFor } from 'storybook/test';

import { TABLE_HEADER_STYLES, TABLE_ROW_STYLES } from './mud-table.types';
import type { TableColumn, TableHeaderStyle, TableRowData, TableRowStyle } from './mud-table.types';

type StoryArgs = {
  headerStyle: TableHeaderStyle;
  rowStyle: TableRowStyle;
  hoverable: boolean;
  selectable: boolean;
  disableSort: boolean;
  ariaLabel: string;
  locale: string;
};

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

const sectionStyle =
  'display: flex; flex-direction: column; gap: var(--spacing-32); padding: var(--spacing-24); max-width: 1200px;';
const groupStyle = 'display: flex; flex-direction: column; gap: var(--spacing-12);';
const captionStyle =
  'font-family: var(--font-family-primary); font-size: 12px; font-weight: 500; color: var(--color-text-base-secondary); margin: 0;';
const hintStyle =
  'font-family: var(--font-family-primary); font-size: 11px; color: var(--color-text-base-tertiary); margin: 0;';

const wrap = (body: string) => /*html*/ `<div style="${sectionStyle}">${body}</div>`;
const group = (caption: string, body: string, hint?: string) => /*html*/ `
  <div style="${groupStyle}">
    <p style="${captionStyle}">${caption}</p>
    ${hint ? `<p style="${hintStyle}">${hint}</p>` : ''}
    ${body}
  </div>
`;

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const baseColumns: TableColumn[] = [
  { key: 'name', label: 'Nume', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'status', label: 'Status', align: 'start' },
  { key: 'amount', label: 'Sumă', align: 'end', sortable: true },
];

// English copy of `baseColumns` for every story that is not a Figma reference.
const demoColumns: TableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'status', label: 'Status', align: 'start' },
  { key: 'amount', label: 'Amount', align: 'end', sortable: true },
];
const baseRows: TableRowData[] = [
  { id: 'r1', name: 'Alexandra Pop', email: 'alexandra.pop@gov.md', status: 'platit', amount: '1.250 MDL' },
  { id: 'r2', name: 'Mihai Ionescu', email: 'mihai.ionescu@gov.md', status: 'asteptare', amount: '480 MDL' },
  { id: 'r3', name: 'Diana Cojocaru', email: 'diana.cojocaru@gov.md', status: 'platit', amount: '3.120 MDL' },
  { id: 'r4', name: 'Radu Munteanu', email: 'radu.munteanu@gov.md', status: 'anulat', amount: '0 MDL' },
  { id: 'r5', name: 'Elena Stoica', email: 'elena.stoica@gov.md', status: 'asteptare', amount: '720 MDL' },
];

const statusTagMap: Record<string, { semantic: string; label: string }> = {
  platit: { semantic: 'success', label: 'Paid' },
  asteptare: { semantic: 'accent', label: 'Pending' },
  anulat: { semantic: 'danger', label: 'Cancelled' },
};

// Cell slots are named `cell-{key}-{rowId}`, so the content follows its row when the
// rows are sorted or filtered.
const renderStatusSlot = (rowId: string, statusKey: string) => {
  const tag = statusTagMap[statusKey];
  return /*html*/ `<mud-tag slot="cell-status-${rowId}" semantic="${tag.semantic}" size="sm">${tag.label}</mud-tag>`;
};

const renderRowActionsSlot = (rowId: string) => /*html*/ `
  <span slot="cell-actions-${rowId}" style="display:inline-flex; gap: var(--spacing-4);">
    <mud-button appearance="text" size="sm">View</mud-button>
    <mud-button appearance="text" size="sm" variant="destructive">Delete</mud-button>
  </span>
`;

// Serialize for inlining into a <script> tag. JSON.stringify already produces
// valid JS literal syntax; we only need to defuse any literal "</script>"
// substrings so the parser does not close the script element early.
const stringify = (value: unknown) => JSON.stringify(value).replace(/<\//g, '<\\/');

// ---------------------------------------------------------------------------
// Base data-driven renderer (preserves slot composition)
// ---------------------------------------------------------------------------

const renderTable = (
  id: string,
  columns: TableColumn[],
  rows: TableRowData[],
  args: Partial<StoryArgs>,
  slotsHtml: string = '',
) => {
  const attrs = [
    `id="${id}"`,
    `header-style="${args.headerStyle ?? 'default'}"`,
    `row-style="${args.rowStyle ?? 'divided'}"`,
    args.hoverable ? 'hoverable' : '',
    args.selectable ? 'selectable' : '',
    args.disableSort ? 'disable-sort' : '',
    args.ariaLabel ? `aria-label="${args.ariaLabel}"` : '',
    args.locale ? `locale="${args.locale}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return /*html*/ `
    <mud-table ${attrs}>${slotsHtml}</mud-table>
    <script>
      (function(){
        const el = document.getElementById('${id}');
        if (el) {
          el.columns = ${stringify(columns)};
          el.rows = ${stringify(rows)};
        }
      })();
    </script>
  `;
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<StoryArgs> = {
  title: 'Components/Table',
  component: 'mud-table',
  argTypes: {
    headerStyle: {
      control: 'select',
      options: TABLE_HEADER_STYLES,
      description:
        'Header treatment — `default` is subtle gray; `inverted` is the dark high-emphasis header; `white` matches the body with a 0.5 px bottom stroke.',
      table: { defaultValue: { summary: 'default' } },
    },
    rowStyle: {
      control: 'select',
      options: TABLE_ROW_STYLES,
      description: 'Row treatment — `divided` (default), `zebra` (alternating), or `borderless`.',
      table: { defaultValue: { summary: 'divided' } },
    },
    hoverable: {
      control: 'boolean',
      description: 'Highlight rows on hover and switch cursor to pointer.',
    },
    selectable: {
      control: 'boolean',
      description: 'Render the leading checkbox column for multi-row selection.',
    },
    disableSort: {
      control: 'boolean',
      name: 'disable-sort',
      description:
        'Master switch — disables sorting on every column at once, overriding each column’s `sortable` flag.',
      table: { defaultValue: { summary: 'false' } },
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible label propagated to the rendered `<table>` element.',
    },
    locale: {
      control: 'select',
      options: ['', 'ro-MD', 'en-US', 'ru-MD'],
      description: 'Language of the built-in copy. Unset follows the closest ancestor `lang`, else `ro-MD`.',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          '`mud-table` is a data table molecule built on a native `<table>` for full a11y semantics. ' +
          'It composes `mud-checkbox` (selection column), `mud-icon` (sort chevron), and accepts ' +
          '`mud-tag` / `mud-button` slotted content per cell. At a viewport width of 640 px or less, ' +
          'the inline cell padding shrinks from 24 px to 16 px; the table scrolls horizontally when it does not fit.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Default: Story = {
  name: 'Default',
  args: {
    headerStyle: 'default',
    rowStyle: 'divided',
    hoverable: false,
    selectable: false,
    disableSort: false,
    ariaLabel: 'Lista de plăți recente',
    locale: '',
  },
  render: args => wrap(renderTable('tbl-default', baseColumns, baseRows, args)),
  parameters: {
    docs: {
      source: {
        code: `<mud-table id="payments" aria-label="Lista de plăți recente"></mud-table>
<script>
  document.querySelector('#payments').columns = [
    { key: 'name',   label: 'Nume',  sortable: true },
    { key: 'email',  label: 'Email', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'amount', label: 'Sumă',  align: 'end', sortable: true },
  ];
  document.querySelector('#payments').rows = [
    { id: 'r1', name: 'Alexandra Pop', email: 'alexandra.pop@gov.md', status: 'Plătit', amount: '1.250 MDL' },
    // ...
  ];
</script>`,
      },
    },
  },
};

export const AllRowStyles: Story = {
  name: 'AllRowStyles',
  render: () =>
    wrap(
      [
        group('divided', renderTable('tbl-divided', demoColumns, baseRows, { rowStyle: 'divided' })),
        group('zebra', renderTable('tbl-zebra', demoColumns, baseRows, { rowStyle: 'zebra' })),
        group('borderless', renderTable('tbl-borderless', demoColumns, baseRows, { rowStyle: 'borderless' })),
      ].join(''),
    ),
};

export const AllHeaderStyles: Story = {
  name: 'AllHeaderStyles',
  render: () =>
    wrap(
      [
        group('default', renderTable('tbl-hdr-default', demoColumns, baseRows, { headerStyle: 'default' })),
        group('inverted', renderTable('tbl-hdr-inverted', demoColumns, baseRows, { headerStyle: 'inverted' })),
        group('white', renderTable('tbl-hdr-white', demoColumns, baseRows, { headerStyle: 'white' })),
      ].join(''),
    ),
};

export const Sortable: Story = {
  name: 'Sortable',
  render: () =>
    wrap(
      [
        group(
          'Sortable headers — click or press Enter/Space to cycle asc/desc',
          renderTable(
            'tbl-sortable',
            [
              { key: 'name', label: 'Name', sortable: true },
              { key: 'email', label: 'Email', sortable: true },
              { key: 'status', label: 'Status' },
              { key: 'amount', label: 'Amount', align: 'end', sortable: true },
            ],
            baseRows,
            { ariaLabel: 'Sortable table' },
          ),
          'aria-sort reflects the currently sorted column; the chevron rotates between asc and desc.',
        ),
      ].join(''),
    ),
};

export const DisableSort: Story = {
  name: 'DisableSort',
  render: () => {
    // Same columns as Sortable (name/email/amount marked sortable) — the
    // table-level `disable-sort` switch overrides them all at once.
    const sortableColumns: TableColumn[] = [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'status', label: 'Status' },
      { key: 'amount', label: 'Amount', align: 'end', sortable: true },
    ];
    return wrap(
      [
        group(
          'Sorting enabled (per-column `sortable: true`)',
          renderTable('tbl-sort-on', sortableColumns, baseRows, { ariaLabel: 'Sortable table' }),
          'Headers show the sort chevron, are focusable, and emit `mudSort`.',
        ),
        group(
          'Sorting disabled (`disable-sort`)',
          renderTable('tbl-sort-off', sortableColumns, baseRows, {
            disableSort: true,
            ariaLabel: 'Table with sorting disabled',
          }),
          'The same columns now render as plain labels — no chevron, not focusable, no aria-sort, no `mudSort`. Useful for read-only or loading states without touching the columns array.',
        ),
      ].join(''),
    );
  },
};

export const Selectable: Story = {
  name: 'Selectable',
  render: () =>
    wrap(
      [
        group(
          'Multi-row selection',
          renderTable('tbl-selectable', demoColumns, baseRows, {
            selectable: true,
            hoverable: true,
            ariaLabel: 'Table with selection',
          }),
          'The leading checkbox column toggles row selection; the header checkbox toggles all rows (with indeterminate state).',
        ),
      ].join(''),
    ),
};

export const WithStatusBadges: Story = {
  name: 'WithStatusBadges',
  render: () => {
    const tagSlots = baseRows.map(row => renderStatusSlot(String(row.id), String(row.status))).join('');
    return wrap(
      group(
        'Status cells composed with `mud-tag`',
        renderTable('tbl-status', demoColumns, baseRows, { rowStyle: 'divided' }, tagSlots),
        "Per-cell slot name pattern: `cell-{key}-{rowId}`, where `rowId` is the row's `rowIdField` value. Drop in any element.",
      ),
    );
  },
};

export const WithActions: Story = {
  name: 'WithActions',
  render: () => {
    const columnsWithActions: TableColumn[] = [...demoColumns, { key: 'actions', label: 'Actions', align: 'end' }];
    const slots = baseRows.map(row => renderRowActionsSlot(String(row.id))).join('');
    return wrap(
      group(
        'Action cells composed with `mud-button appearance="text"`',
        renderTable('tbl-actions', columnsWithActions, baseRows, { rowStyle: 'divided' }, slots),
      ),
    );
  },
};

export const Hoverable: Story = {
  name: 'Hoverable',
  render: () =>
    wrap(
      group(
        'Hoverable rows — pointer cursor + background tint on hover',
        renderTable('tbl-hover', demoColumns, baseRows, { hoverable: true }),
        'Hover affordance is independent of selection; rows still emit `mudRowClick` when clicked.',
      ),
    ),
};

export const AllDataTypes: Story = {
  name: 'AllDataTypes',
  render: () => {
    // Mirrors the 5 cell data types from Figma 653:9544: text, number,
    // status-tag, checkbox (per-cell), action. All five are consumer
    // composition patterns over the same <td> primitive — no API change
    // needed; alignment + slot content do the work.
    const columns: TableColumn[] = [
      { key: 'name', label: 'Text' },
      { key: 'amount', label: 'Number', align: 'end' },
      { key: 'status', label: 'Status tag' },
      { key: 'verified', label: 'Checkbox', align: 'center' },
      { key: 'actions', label: 'Action', align: 'end' },
    ];
    // `verified` is deliberately NOT a `row` key: the "Checkbox" column has no fallback
    // text — every row slots in a real `<mud-checkbox>` — and mud-table's generic cell
    // renderer stringifies whatever raw value a column key holds (`String(row[key])`) as
    // that fallback, so a boolean `row.verified` would render the non-localizable text
    // "true"/"false" into the cell alongside (and behind) the slotted checkbox.
    const verifiedFlags = [true, false, true];
    const rows: TableRowData[] = [
      { id: 'r1', name: 'Alexandra Pop', amount: '1.250 MDL', status: 'platit' },
      { id: 'r2', name: 'Mihai Ionescu', amount: '480 MDL', status: 'asteptare' },
      { id: 'r3', name: 'Diana Cojocaru', amount: '3.120 MDL', status: 'platit' },
    ];
    const slots = rows
      .map((row, idx) => {
        const tag = statusTagMap[String(row.status)];
        return /*html*/ `
          <mud-tag slot="cell-status-${row.id}" semantic="${tag.semantic}" size="md">${tag.label}</mud-tag>
          <mud-checkbox slot="cell-verified-${row.id}" ${verifiedFlags[idx] ? 'checked' : ''} aria-label="Confirmed"></mud-checkbox>
          <mud-button slot="cell-actions-${row.id}" appearance="text" size="sm" icon-only label="Edit">
            <mud-icon slot="icon" name="edit" size="20" color="icon-base-default"></mud-icon>
          </mud-button>
        `;
      })
      .join('');
    return wrap(
      group(
        'All 5 data types — text, number (right-aligned), status-tag, checkbox, action',
        renderTable('tbl-datatypes', columns, rows, { rowStyle: 'divided' }, slots),
        'Mirrors Figma 653:9544 — each data type is a consumer composition pattern over the same <td>. Numbers use `align: "end"`; checkbox + action use `align: "center"` / `"end"` with slot overrides.',
      ),
    );
  },
};

export const EmptyState: Story = {
  name: 'EmptyState',
  render: () =>
    wrap(
      [
        group(
          'Empty state — default message',
          renderTable('tbl-empty-default', demoColumns, [], { ariaLabel: 'Empty table' }),
        ),
        group(
          'Empty state — custom slot content',
          `<mud-table id="tbl-empty-custom" aria-label="Empty table with a custom message">
             <span slot="empty" style="display:flex; flex-direction:column; gap: var(--spacing-8); align-items:center;">
               <mud-icon name="document" size="24" color="icon-base-tertiary"></mud-icon>
               <strong>No payments recorded.</strong>
               <span style="color: var(--color-text-base-tertiary);">Add a new payment to get started.</span>
             </span>
           </mud-table>
           <script>
             (function(){
               const el = document.getElementById('tbl-empty-custom');
               if (el) {
                 el.columns = ${stringify(demoColumns)};
                 el.rows = [];
               }
             })();
           </script>`,
        ),
      ].join(''),
    ),
};

export const Loading: Story = {
  name: 'Loading',
  render: () =>
    wrap(
      group(
        'Loading skeleton — slotted in via the `empty` slot',
        `<mud-table id="tbl-loading" aria-label="Table loading">
           <span slot="empty" style="display:flex; flex-direction:column; gap: var(--spacing-12); align-items:center; padding: var(--spacing-24);">
             <mud-spinner size="md"></mud-spinner>
             <span style="color: var(--color-text-base-tertiary);">Loading data…</span>
           </span>
         </mud-table>
         <script>
           (function(){
             const el = document.getElementById('tbl-loading');
             if (el) {
               el.columns = ${stringify(demoColumns)};
               el.rows = [];
             }
           })();
         </script>`,
        'Loading is a consumer concern — replace the `empty` slot with a spinner or skeleton.',
      ),
    ),
};

export const Mobile: Story = {
  name: 'Mobile',
  // The mobile padding follows the viewport, so the story sets a mobile viewport.
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  render: () => /*html*/ `
    <div style="${sectionStyle}">
      <p style="${captionStyle}">Viewport ≤ 640 px — inline cell padding 16 px</p>
      <p style="${hintStyle}">The table keeps its structure and scrolls horizontally when it does not fit.</p>
      <div style="max-width: 420px;">
        ${renderTable('tbl-mobile', demoColumns, baseRows, { ariaLabel: 'Mobile table', rowStyle: 'divided' })}
      </div>
    </div>
  `,
};

export const EdgeCases: Story = {
  name: 'EdgeCases',
  render: () => {
    const wideColumns: TableColumn[] = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Full name' },
      { key: 'email', label: 'Email address' },
      { key: 'phone', label: 'Phone' },
      { key: 'address', label: 'Address' },
      { key: 'role', label: 'Rol' },
      { key: 'department', label: 'Department' },
      { key: 'amount', label: 'Amount', align: 'end' },
    ];
    const wideRows: TableRowData[] = [
      {
        id: 'A-001',
        name: 'Alexandra-Maria Constantinescu-Popescu',
        email: 'alexandra.maria.constantinescu@cancelaria.gov.md',
        phone: '+373 22 123 456',
        address: '105 Ștefan cel Mare St., MD-2012 Chișinău',
        role: 'Executive director',
        department: 'State Chancellery',
        amount: '12.450,75 MDL',
      },
      {
        id: 'A-002',
        name: 'Mihai Ionescu',
        email: 'mihai@gov.md',
        phone: '+373 22 222 333',
        address: 'Bd. Negruzzi 1',
        role: 'Inspector',
        department: 'Finance',
        amount: '480 MDL',
      },
      {
        id: 'A-003',
        name: 'Lorem ipsum dolor sit amet consectetur adipiscing elit',
        email: 'foarte.lung.de.email@subdomeniu.exemplu.gov.md',
        phone: '+373 22 999 888',
        address: 'A long street name without limit that exceeds the standard column size 245A',
        role: 'Senior digital projects manager',
        department: 'Digital transformation',
        amount: '99.999,99 MDL',
      },
    ];
    return wrap(
      [
        group(
          'Many columns + long content (horizontal scroll)',
          renderTable('tbl-wide', wideColumns, wideRows, { rowStyle: 'zebra', ariaLabel: 'Table with many columns' }),
        ),
      ].join(''),
    );
  },
};

// Browser-lane guard for the cell slots: the DOM assigns a slot name to the first slot
// that carries it, so each row needs names of its own, and those names must follow the
// row when the rows are reordered. The mock-doc spec lane cannot assign slots.
export const CellSlotsFollowRows: Story = {
  tags: ['!autodocs', '!dev'],
  render: () =>
    renderTable(
      'tbl-cell-slots',
      demoColumns,
      baseRows.slice(0, 3),
      {},
      baseRows
        .slice(0, 3)
        .map(row => /*html*/ `<span slot="cell-status-${row.id}" data-row="${row.id}">${row.id}</span>`)
        .join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      disable: true,
      source: {
        code: `<mud-table>\n  <span slot="cell-status-r1">r1</span>\n  <span slot="cell-status-r2">r2</span>\n  <span slot="cell-status-r3">r3</span>\n</mud-table>`,
      },
    },
  },
  play: async ({ canvasElement }) => {
    const table = canvasElement.querySelector('mud-table') as HTMLMudTableElement;
    const assigned = () =>
      Array.from(table.shadowRoot?.querySelectorAll('tbody tr') ?? []).map(tr => {
        const slot = tr.querySelector('slot[name^="cell-status-"]') as HTMLSlotElement | null;
        return slot?.assignedElements({ flatten: true }).map(el => el.getAttribute('data-row')) ?? [];
      });

    await waitFor(() => expect(assigned()).toEqual([['r1'], ['r2'], ['r3']]));

    table.rows = [...baseRows.slice(0, 3)].reverse();
    await waitFor(() => expect(assigned()).toEqual([['r3'], ['r2'], ['r1']]));
  },
};

// ---------------------------------------------------------------------------
// Locales — the built-in empty-state message
// ---------------------------------------------------------------------------
const LOCALES = ['ro-MD', 'en-US', 'ru-MD'] as const;

export const Locales: Story = {
  render: () =>
    wrap(
      LOCALES.map(locale =>
        group(
          `locale="${locale}"`,
          renderTable(`tbl-locale-${locale}`, demoColumns, [], { ariaLabel: 'Empty table', locale }),
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The same component under each supported locale. Only the built-in copy changes; content stays as written. This is the one place a story pins `locale` — every other story follows the Storybook toolbar.',
      },
      source: {
        code: LOCALES.map(locale => `<mud-table locale="${locale}" aria-label="Empty table"></mud-table>`).join('\n'),
      },
    },
  },
};
