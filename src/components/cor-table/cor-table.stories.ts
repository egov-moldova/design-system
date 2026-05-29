import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { TABLE_HEADER_STYLES, TABLE_ROW_STYLES } from './cor-table.types';
import type { TableColumn, TableHeaderStyle, TableRowData, TableRowStyle } from './cor-table.types';

type StoryArgs = {
  headerStyle: TableHeaderStyle;
  rowStyle: TableRowStyle;
  hoverable: boolean;
  selectable: boolean;
  ariaLabel: string;
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
// Romanian-voice fixture data
// ---------------------------------------------------------------------------

const baseColumns: TableColumn[] = [
  { key: 'name', label: 'Nume', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'status', label: 'Status', align: 'start' },
  { key: 'amount', label: 'Sumă', align: 'end', sortable: true },
];

const baseRows: TableRowData[] = [
  { id: 'r1', name: 'Alexandra Pop', email: 'alexandra.pop@gov.md', status: 'platit', amount: '1.250 MDL' },
  { id: 'r2', name: 'Mihai Ionescu', email: 'mihai.ionescu@gov.md', status: 'asteptare', amount: '480 MDL' },
  { id: 'r3', name: 'Diana Cojocaru', email: 'diana.cojocaru@gov.md', status: 'platit', amount: '3.120 MDL' },
  { id: 'r4', name: 'Radu Munteanu', email: 'radu.munteanu@gov.md', status: 'anulat', amount: '0 MDL' },
  { id: 'r5', name: 'Elena Stoica', email: 'elena.stoica@gov.md', status: 'asteptare', amount: '720 MDL' },
];

const statusTagMap: Record<string, { semantic: string; label: string }> = {
  platit: { semantic: 'success', label: 'Plătit' },
  asteptare: { semantic: 'warning', label: 'În așteptare' },
  anulat: { semantic: 'danger', label: 'Anulat' },
};

const renderStatusSlot = (rowIndex: number, statusKey: string) => {
  const tag = statusTagMap[statusKey];
  return /*html*/ `<cor-tag slot="cell-status-${rowIndex}" semantic="${tag.semantic}" size="sm">${tag.label}</cor-tag>`;
};

const renderRowActionsSlot = (rowIndex: number) => /*html*/ `
  <span slot="cell-actions-${rowIndex}" style="display:inline-flex; gap: var(--spacing-4);">
    <cor-button appearance="text" size="sm">Vizualizează</cor-button>
    <cor-button appearance="text" size="sm" variant="destructive">Șterge</cor-button>
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
    args.ariaLabel ? `aria-label="${args.ariaLabel}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return /*html*/ `
    <cor-table ${attrs}>${slotsHtml}</cor-table>
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
  title: 'Molecules/Table',
  component: 'cor-table',
  argTypes: {
    headerStyle: {
      control: 'select',
      options: TABLE_HEADER_STYLES,
      description: 'Header treatment — `default` is subtle gray; `inverted` is the dark high-emphasis header.',
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
    ariaLabel: {
      control: 'text',
      description: 'Accessible label propagated to the rendered `<table>` element.',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          '`cor-table` is a data table molecule built on a native `<table>` for full a11y semantics. ' +
          'It composes `cor-checkbox` (selection column), `cor-icon` (sort chevron), and accepts ' +
          '`cor-tag` / `cor-button` slotted content per cell. Below the 640 px container width, ' +
          'rows collapse into vertical key:value cards via a container query.',
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
    ariaLabel: 'Lista de plăți recente',
  },
  render: args => wrap(renderTable('tbl-default', baseColumns, baseRows, args)),
  parameters: {
    docs: {
      source: {
        code: `<cor-table id="payments" aria-label="Lista de plăți recente"></cor-table>
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
        group('divided', renderTable('tbl-divided', baseColumns, baseRows, { rowStyle: 'divided' })),
        group('zebra', renderTable('tbl-zebra', baseColumns, baseRows, { rowStyle: 'zebra' })),
        group('borderless', renderTable('tbl-borderless', baseColumns, baseRows, { rowStyle: 'borderless' })),
      ].join(''),
    ),
};

export const AllHeaderStyles: Story = {
  name: 'AllHeaderStyles',
  render: () =>
    wrap(
      [
        group('default', renderTable('tbl-hdr-default', baseColumns, baseRows, { headerStyle: 'default' })),
        group('inverted', renderTable('tbl-hdr-inverted', baseColumns, baseRows, { headerStyle: 'inverted' })),
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
              { key: 'name', label: 'Nume', sortable: true },
              { key: 'email', label: 'Email', sortable: true },
              { key: 'status', label: 'Status' },
              { key: 'amount', label: 'Sumă', align: 'end', sortable: true },
            ],
            baseRows,
            { ariaLabel: 'Tabel sortabil' },
          ),
          'aria-sort reflects the currently sorted column; the chevron rotates between asc and desc.',
        ),
      ].join(''),
    ),
};

export const Selectable: Story = {
  name: 'Selectable',
  render: () =>
    wrap(
      [
        group(
          'Multi-row selection',
          renderTable('tbl-selectable', baseColumns, baseRows, {
            selectable: true,
            hoverable: true,
            ariaLabel: 'Tabel cu selecție',
          }),
          'The leading checkbox column toggles row selection; the header checkbox toggles all rows (with indeterminate state).',
        ),
      ].join(''),
    ),
};

export const WithStatusBadges: Story = {
  name: 'WithStatusBadges',
  render: () => {
    const tagSlots = baseRows.map((row, idx) => renderStatusSlot(idx, String(row.status))).join('');
    return wrap(
      group(
        'Status cells composed with `cor-tag`',
        renderTable('tbl-status', baseColumns, baseRows, { rowStyle: 'divided' }, tagSlots),
        'Per-row slot name pattern: `cell-{key}-{index}` — drop in any element.',
      ),
    );
  },
};

export const WithActions: Story = {
  name: 'WithActions',
  render: () => {
    const columnsWithActions: TableColumn[] = [...baseColumns, { key: 'actions', label: 'Acțiuni', align: 'end' }];
    const slots = baseRows.map((_, idx) => renderRowActionsSlot(idx)).join('');
    return wrap(
      group(
        'Action cells composed with `cor-button appearance="text"`',
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
        renderTable('tbl-hover', baseColumns, baseRows, { hoverable: true }),
        'Hover affordance is independent of selection; rows still emit `corRowClick` when clicked.',
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
    const rows: TableRowData[] = [
      { id: 'r1', name: 'Alexandra Pop', amount: '1.250 MDL', status: 'platit', verified: true },
      { id: 'r2', name: 'Mihai Ionescu', amount: '480 MDL', status: 'asteptare', verified: false },
      { id: 'r3', name: 'Diana Cojocaru', amount: '3.120 MDL', status: 'platit', verified: true },
    ];
    const slots = rows
      .map((row, idx) => {
        const tag = statusTagMap[String(row.status)];
        return /*html*/ `
          <cor-tag slot="cell-status-${idx}" semantic="${tag.semantic}" size="md">${tag.label}</cor-tag>
          <cor-checkbox slot="cell-verified-${idx}" ${row.verified ? 'checked' : ''} aria-label="Confirmat"></cor-checkbox>
          <cor-button slot="cell-actions-${idx}" appearance="text" size="sm" icon-only label="Editează">
            <cor-icon name="edit" size="20"></cor-icon>
          </cor-button>
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
          renderTable('tbl-empty-default', baseColumns, [], { ariaLabel: 'Tabel gol' }),
        ),
        group(
          'Empty state — custom slot content',
          `<cor-table id="tbl-empty-custom" aria-label="Tabel gol cu mesaj personalizat">
             <span slot="empty" style="display:flex; flex-direction:column; gap: var(--spacing-8); align-items:center;">
               <cor-icon name="document" size="24" color="icon-base-tertiary"></cor-icon>
               <strong>Nu există plăți înregistrate.</strong>
               <span style="color: var(--color-text-base-tertiary);">Adăugați o plată nouă pentru a începe.</span>
             </span>
           </cor-table>
           <script>
             (function(){
               const el = document.getElementById('tbl-empty-custom');
               if (el) {
                 el.columns = ${stringify(baseColumns)};
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
        `<cor-table id="tbl-loading" aria-label="Tabel în încărcare">
           <span slot="empty" style="display:flex; flex-direction:column; gap: var(--spacing-12); align-items:center; padding: var(--spacing-24);">
             <cor-spinner size="md"></cor-spinner>
             <span style="color: var(--color-text-base-tertiary);">Se încarcă datele…</span>
           </span>
         </cor-table>
         <script>
           (function(){
             const el = document.getElementById('tbl-loading');
             if (el) {
               el.columns = ${stringify(baseColumns)};
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
  render: () => /*html*/ `
    <div style="${sectionStyle}">
      <p style="${captionStyle}">Container ≤ 640 px collapses to card-per-row layout</p>
      <p style="${hintStyle}">Resize the wrapper or test on a mobile viewport — the container query triggers automatically.</p>
      <div style="max-width: 420px;">
        ${renderTable('tbl-mobile', baseColumns, baseRows, { ariaLabel: 'Tabel mobil', rowStyle: 'divided' })}
      </div>
    </div>
  `,
};

export const EdgeCases: Story = {
  name: 'EdgeCases',
  render: () => {
    const wideColumns: TableColumn[] = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nume complet' },
      { key: 'email', label: 'Adresă de e-mail' },
      { key: 'phone', label: 'Telefon' },
      { key: 'address', label: 'Adresă' },
      { key: 'role', label: 'Rol' },
      { key: 'department', label: 'Departament' },
      { key: 'amount', label: 'Sumă', align: 'end' },
    ];
    const wideRows: TableRowData[] = [
      {
        id: 'A-001',
        name: 'Alexandra-Maria Constantinescu-Popescu',
        email: 'alexandra.maria.constantinescu@cancelaria.gov.md',
        phone: '+373 22 123 456',
        address: 'Str. Ștefan cel Mare 105, MD-2012 Chișinău',
        role: 'Director executiv',
        department: 'Cancelaria de Stat',
        amount: '12.450,75 MDL',
      },
      {
        id: 'A-002',
        name: 'Mihai Ionescu',
        email: 'mihai@gov.md',
        phone: '+373 22 222 333',
        address: 'Bd. Negruzzi 1',
        role: 'Inspector',
        department: 'Finanțe',
        amount: '480 MDL',
      },
      {
        id: 'A-003',
        name: 'Lorem ipsum dolor sit amet consectetur adipiscing elit',
        email: 'foarte.lung.de.email@subdomeniu.exemplu.gov.md',
        phone: '+373 22 999 888',
        address: 'Str. lungă fără limită care depășește mărimea coloanei standard 245A',
        role: 'Manager superior de proiecte digitale',
        department: 'Transformare digitală',
        amount: '99.999,99 MDL',
      },
    ];
    return wrap(
      [
        group(
          'Many columns + long content (horizontal scroll)',
          renderTable('tbl-wide', wideColumns, wideRows, { rowStyle: 'zebra', ariaLabel: 'Tabel cu multe coloane' }),
        ),
      ].join(''),
    );
  },
};
