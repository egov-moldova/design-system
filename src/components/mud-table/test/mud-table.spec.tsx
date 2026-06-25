import { render, h, describe, it, expect, vi } from '@stencil/vitest';

// Side-effect import: stencilVitestPlugin appends a customElements.define call
// so the element is registered before render().
import '../mud-table';
import '../../mud-checkbox/mud-checkbox';

// `mud-icon` is intentionally NOT imported here: its `componentWillLoad`
// resolves SVG asset URLs via `getAssetPath`, which the mock-doc test
// environment cannot resolve. The sort affordance still renders as an
// unupgraded `<mud-icon>` placeholder, which is sufficient for assertions
// about table behaviour, aria-sort, and selection.

import { TABLE_HEADER_STYLES, TABLE_ROW_STYLES } from '../mud-table.types';
import type { TableColumn, TableRowData } from '../mud-table.types';

const columns: TableColumn[] = [
  { key: 'name', label: 'Nume', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'amount', label: 'Sumă', align: 'end', sortable: true },
];

const rows: TableRowData[] = [
  { id: '1', name: 'Alexandra Pop', email: 'alexandra@gov.md', amount: '1.250 MDL' },
  { id: '2', name: 'Mihai Ionescu', email: 'mihai@gov.md', amount: '480 MDL' },
  { id: '3', name: 'Diana Cojocaru', email: 'diana@gov.md', amount: '3.120 MDL' },
];

const queryTable = (root: Element | null | undefined) =>
  root?.shadowRoot?.querySelector('table') as HTMLTableElement | null;

const queryHeaderCells = (root: Element | null | undefined) =>
  Array.from(root?.shadowRoot?.querySelectorAll('th') ?? []) as HTMLTableCellElement[];

const queryBodyRows = (root: Element | null | undefined) =>
  Array.from(root?.shadowRoot?.querySelectorAll('tbody tr') ?? []) as HTMLTableRowElement[];

const setProps = (el: Element | null | undefined, props: Record<string, unknown>) => {
  if (!el) return;
  Object.assign(el, props);
};

describe('mud-table', () => {
  describe('defaults', () => {
    it('reflects default props on the host', async () => {
      const { root } = await render(<mud-table />);
      expect(root?.getAttribute('header-style')).toBe('default');
      expect(root?.getAttribute('row-style')).toBe('divided');
    });

    it('renders an internal <table> with role="table"', async () => {
      const { root } = await render(<mud-table />);
      const table = queryTable(root);
      expect(table).toBeTruthy();
      expect(table?.getAttribute('role')).toBe('table');
    });

    it('renders empty-state row when no rows provided', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns });
      await waitForChanges();
      const emptyCell = root?.shadowRoot?.querySelector('.empty-cell');
      expect(emptyCell).toBeTruthy();
      expect(emptyCell?.textContent ?? '').toContain('Nu există date');
    });
  });

  describe('prop validation', () => {
    it.each(TABLE_HEADER_STYLES)('accepts headerStyle="%s"', async style => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { headerStyle: style });
      await waitForChanges();
      expect(root?.getAttribute('header-style')).toBe(style);
    });

    it.each(TABLE_ROW_STYLES)('accepts rowStyle="%s"', async style => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { rowStyle: style });
      await waitForChanges();
      expect(root?.getAttribute('row-style')).toBe(style);
    });

    it('warns and falls back when headerStyle is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { headerStyle: 'bogus' });
      await waitForChanges();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid headerStyle'));
      expect(root?.getAttribute('header-style')).toBe('default');
      warn.mockRestore();
    });

    it('warns and falls back when rowStyle is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { rowStyle: 'bogus' });
      await waitForChanges();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid rowStyle'));
      expect(root?.getAttribute('row-style')).toBe('divided');
      warn.mockRestore();
    });

    it('warns and falls back when sortDirection is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { sortDirection: 'sideways' });
      await waitForChanges();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid sortDirection'));
      warn.mockRestore();
    });
  });

  describe('rendering', () => {
    it('renders one <th> per column', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows });
      await waitForChanges();
      const headers = queryHeaderCells(root);
      expect(headers.length).toBe(columns.length);
      expect(headers[0]?.textContent ?? '').toContain('Nume');
      expect(headers[1]?.textContent ?? '').toContain('Email');
    });

    it('renders one <tr> per row inside <tbody>', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows });
      await waitForChanges();
      expect(queryBodyRows(root).length).toBe(rows.length);
    });

    it('renders cell values from row data', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows });
      await waitForChanges();
      const bodyRows = queryBodyRows(root);
      expect(bodyRows[0]?.textContent ?? '').toContain('Alexandra Pop');
      expect(bodyRows[1]?.textContent ?? '').toContain('mihai@gov.md');
    });

    it('reflects ariaLabel onto the <table>', async () => {
      const { root, waitForChanges } = await render(<mud-table aria-label="Tabel principal" />);
      setProps(root, { columns, rows });
      await waitForChanges();
      expect(queryTable(root)?.getAttribute('aria-label')).toBe('Tabel principal');
    });

    it('adds prepended selection column when selectable', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows, selectable: true });
      await waitForChanges();
      const firstHeader = root?.shadowRoot?.querySelector('th.th--selection');
      expect(firstHeader).toBeTruthy();
      expect(firstHeader?.querySelector('mud-checkbox')).toBeTruthy();
    });
  });

  describe('a11y — aria-sort + roles', () => {
    it('exposes role="columnheader" on every header', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows });
      await waitForChanges();
      const headers = queryHeaderCells(root);
      headers.forEach(th => expect(th.getAttribute('role')).toBe('columnheader'));
    });

    it('sets aria-sort="none" on sortable columns when no sort is active', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows });
      await waitForChanges();
      const headers = queryHeaderCells(root);
      expect(headers[0]?.getAttribute('aria-sort')).toBe('none');
      // Non-sortable column has no aria-sort attribute.
      expect(headers[1]?.hasAttribute('aria-sort')).toBe(false);
    });

    it('sets aria-sort="ascending" / "descending" reflecting active sort', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows, sortColumn: 'name', sortDirection: 'asc' });
      await waitForChanges();
      let headers = queryHeaderCells(root);
      expect(headers[0]?.getAttribute('aria-sort')).toBe('ascending');

      setProps(root, { sortDirection: 'desc' });
      await waitForChanges();
      headers = queryHeaderCells(root);
      expect(headers[0]?.getAttribute('aria-sort')).toBe('descending');
    });

    it('reflects aria-selected on rows when selectable', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows, selectable: true, selectedRows: ['2'] });
      await waitForChanges();
      const bodyRows = queryBodyRows(root);
      expect(bodyRows[0]?.getAttribute('aria-selected')).toBe('false');
      expect(bodyRows[1]?.getAttribute('aria-selected')).toBe('true');
    });

    it('makes sortable headers focusable via Tab and non-sortable ones not', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows });
      await waitForChanges();
      const headers = queryHeaderCells(root);
      // sortable
      expect(headers[0]?.tabIndex).toBe(0);
      // non-sortable
      expect(headers[1]?.tabIndex).toBeLessThan(0);
    });
  });

  describe('sort interaction', () => {
    it('emits mudSort with asc on first activation of a sortable header', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows });
      await waitForChanges();
      const handler = vi.fn();
      root?.addEventListener('mudSort', handler as EventListener);
      const headers = queryHeaderCells(root);
      headers[0]?.click();
      await waitForChanges();
      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({
        column: 'name',
        direction: 'asc',
      });
    });

    it('toggles to desc when the same column is activated twice', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows });
      await waitForChanges();
      const handler = vi.fn();
      root?.addEventListener('mudSort', handler as EventListener);
      const headers = queryHeaderCells(root);
      headers[0]?.click();
      await waitForChanges();
      headers[0]?.click();
      await waitForChanges();
      expect(handler).toHaveBeenCalledTimes(2);
      expect((handler.mock.calls[1][0] as CustomEvent).detail.direction).toBe('desc');
    });

    it('activates sort via Enter key on a focused sortable header', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows });
      await waitForChanges();
      const handler = vi.fn();
      root?.addEventListener('mudSort', handler as EventListener);
      const headers = queryHeaderCells(root);
      headers[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
      await waitForChanges();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('activates sort via Space key on a focused sortable header', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows });
      await waitForChanges();
      const handler = vi.fn();
      root?.addEventListener('mudSort', handler as EventListener);
      const headers = queryHeaderCells(root);
      headers[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true }));
      await waitForChanges();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not emit mudSort on non-sortable headers', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows });
      await waitForChanges();
      const handler = vi.fn();
      root?.addEventListener('mudSort', handler as EventListener);
      const headers = queryHeaderCells(root);
      headers[1]?.click();
      await waitForChanges();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('disableSort (table-level master switch)', () => {
    it('reflects the disable-sort attribute on the host', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows, disableSort: true });
      await waitForChanges();
      expect(root?.hasAttribute('disable-sort')).toBe(true);
    });

    it('strips sort affordances from every column when true', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows, disableSort: true });
      await waitForChanges();
      const headers = queryHeaderCells(root);
      headers.forEach(th => {
        // No aria-sort, not focusable, no sort hook on any header.
        expect(th.hasAttribute('aria-sort')).toBe(false);
        expect(th.tabIndex).toBeLessThan(0);
        expect(th.hasAttribute('data-sort-key')).toBe(false);
      });
      // Sort chevron is not rendered.
      expect(root?.shadowRoot?.querySelector('.sort-icon')).toBeNull();
    });

    it('does not emit mudSort on click when disabled, even for sortable columns', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows, disableSort: true });
      await waitForChanges();
      const handler = vi.fn();
      root?.addEventListener('mudSort', handler as EventListener);
      const headers = queryHeaderCells(root);
      headers[0]?.click();
      await waitForChanges();
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not emit mudSort on Enter/Space when disabled', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows, disableSort: true });
      await waitForChanges();
      const handler = vi.fn();
      root?.addEventListener('mudSort', handler as EventListener);
      const headers = queryHeaderCells(root);
      headers[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
      await waitForChanges();
      expect(handler).not.toHaveBeenCalled();
    });

    it('restores per-column sorting when toggled back off', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows, disableSort: true });
      await waitForChanges();
      setProps(root, { disableSort: false });
      await waitForChanges();
      const headers = queryHeaderCells(root);
      // First column is sortable again; second was never sortable.
      expect(headers[0]?.getAttribute('aria-sort')).toBe('none');
      expect(headers[0]?.tabIndex).toBe(0);
      expect(headers[1]?.hasAttribute('aria-sort')).toBe(false);
    });
  });

  describe('selection', () => {
    it('emits mudSelectionChange with the row id on row checkbox toggle', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows, selectable: true, selectedRows: [] });
      await waitForChanges();
      const handler = vi.fn();
      root?.addEventListener('mudSelectionChange', handler as EventListener);
      const checkboxes = root?.shadowRoot?.querySelectorAll('tbody mud-checkbox');
      const firstCheckbox = checkboxes?.[0] as HTMLInputElement & { checked: boolean };
      // Simulate the mudChange event from the inner checkbox.
      firstCheckbox.checked = true;
      firstCheckbox.dispatchEvent(new CustomEvent('mudChange', { detail: { checked: true } }));
      await waitForChanges();
      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0][0] as CustomEvent).detail.selectedRows).toEqual(['1']);
    });

    it('emits mudSelectionChange with all ids when the master checkbox toggles on', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows, selectable: true, selectedRows: [] });
      await waitForChanges();
      const handler = vi.fn();
      root?.addEventListener('mudSelectionChange', handler as EventListener);
      const masterCheckbox = root?.shadowRoot?.querySelector('thead mud-checkbox') as HTMLInputElement & {
        checked: boolean;
      };
      masterCheckbox.checked = true;
      masterCheckbox.dispatchEvent(new CustomEvent('mudChange', { detail: { checked: true } }));
      await waitForChanges();
      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0][0] as CustomEvent).detail.selectedRows).toEqual(['1', '2', '3']);
    });

    it('emits empty array when master checkbox toggles off', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows, selectable: true, selectedRows: ['1', '2', '3'] });
      await waitForChanges();
      const handler = vi.fn();
      root?.addEventListener('mudSelectionChange', handler as EventListener);
      const masterCheckbox = root?.shadowRoot?.querySelector('thead mud-checkbox') as HTMLInputElement & {
        checked: boolean;
      };
      masterCheckbox.checked = false;
      masterCheckbox.dispatchEvent(new CustomEvent('mudChange', { detail: { checked: false } }));
      await waitForChanges();
      expect((handler.mock.calls[0][0] as CustomEvent).detail.selectedRows).toEqual([]);
    });
  });

  describe('row click', () => {
    it('emits mudRowClick with row + index on body row click', async () => {
      const { root, waitForChanges } = await render(<mud-table />);
      setProps(root, { columns, rows });
      await waitForChanges();
      const handler = vi.fn();
      root?.addEventListener('mudRowClick', handler as EventListener);
      const bodyRows = queryBodyRows(root);
      bodyRows[1]?.click();
      await waitForChanges();
      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({
        row: rows[1],
        index: 1,
      });
    });
  });
});
