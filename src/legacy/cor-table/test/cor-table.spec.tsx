import { newSpecPage } from '@stencil/core/testing';
import { CorTable } from '../cor-table';
import { CorThead } from '../../cor-thead/cor-thead';
import { CorTbody } from '../../cor-tbody/cor-tbody';
import { CorTfoot } from '../../cor-tfoot/cor-tfoot';
import { CorRow } from '../../cor-row/cor-row';
import { CorColumn } from '../../cor-column/cor-column';
import { CorCell } from '../../cor-cell/cor-cell';

describe('cor-table', () => {
  describe('cor-table - main component', () => {
    it('renders with default props', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table></cor-table>`,
      });
      expect(page.root).toBeTruthy();
    });

    it('defaults to lg size', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table></cor-table>`,
      });
      expect(page.root?.getAttribute('size')).toBe('lg');
    });

    it('renders with md size', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table size="md"></cor-table>`,
      });
      expect(page.root?.getAttribute('size')).toBe('md');
    });

    it('renders with sm size', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table size="sm"></cor-table>`,
      });
      expect(page.root?.getAttribute('size')).toBe('sm');
    });

    it('reflects size attribute', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table size="md"></cor-table>`,
      });
      expect(page.root?.getAttribute('size')).toBe('md');
    });

    it('defaults zebra to false', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table></cor-table>`,
      });
      expect(page.root?.hasAttribute('zebra')).toBe(false);
    });

    it('reflects zebra attribute when true', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table zebra></cor-table>`,
      });
      expect(page.root?.getAttribute('zebra')).not.toBeNull();
    });

    it('defaults bordered to false', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table></cor-table>`,
      });
      expect(page.root?.hasAttribute('bordered')).toBe(false);
    });

    it('reflects bordered attribute when true', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table bordered></cor-table>`,
      });
      expect(page.root?.getAttribute('bordered')).not.toBeNull();
    });

    it('renders with role="table"', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table></cor-table>`,
      });
      expect(page.root?.getAttribute('role')).toBe('table');
    });

    it('applies aria-label when provided', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table aria-label="User Data"></cor-table>`,
      });
      expect(page.root?.getAttribute('aria-label')).toBe('User Data');
    });

    it('applies aria-labelledby when provided', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table aria-labelled-by="table-title"></cor-table>`,
      });
      expect(page.root?.getAttribute('aria-labelledby')).toBe('table-title');
    });

    it('applies aria-describedby when provided', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table aria-described-by="table-desc"></cor-table>`,
      });
      expect(page.root?.getAttribute('aria-describedby')).toBe('table-desc');
    });

    it('applies aria-rowcount when provided', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table row-count="100"></cor-table>`,
      });
      expect(page.root?.getAttribute('aria-rowcount')).toBe('100');
    });

    it('applies aria-colcount when provided', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table col-count="5"></cor-table>`,
      });
      expect(page.root?.getAttribute('aria-colcount')).toBe('5');
    });

    it('applies aria-busy when loading is true', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table loading></cor-table>`,
      });
      expect(page.root?.getAttribute('aria-busy')).toBe('true');
    });

    it('does not apply aria-busy when loading is false', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table></cor-table>`,
      });
      expect(page.root?.getAttribute('aria-busy')).toBeNull();
    });

    it('renders slotted content', async () => {
      const page = await newSpecPage({
        components: [CorTable],
        html: `<cor-table><div>Table Content</div></cor-table>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });
  });

  describe('cor-thead - table header', () => {
    it('renders with default props', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead></cor-thead>`,
      });
      expect(page.root).toBeTruthy();
    });

    it('renders with role="rowgroup"', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead></cor-thead>`,
      });
      expect(page.root?.getAttribute('role')).toBe('rowgroup');
    });

    it('renders header row with role="row"', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead></cor-thead>`,
      });
      const headerRow = page.root?.shadowRoot?.querySelector('.header-row');
      expect(headerRow?.getAttribute('role')).toBe('row');
    });

    it('defaults selectable to false', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead></cor-thead>`,
      });
      expect(page.root?.hasAttribute('selectable')).toBe(false);
    });

    it('reflects selectable attribute when true', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead selectable></cor-thead>`,
      });
      expect(page.root?.getAttribute('selectable')).not.toBeNull();
    });

    it('renders checkbox cell when selectable is true', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead selectable></cor-thead>`,
      });
      const checkboxCell = page.root?.shadowRoot?.querySelector('.checkbox-cell');
      expect(checkboxCell).toBeTruthy();
    });

    it('does not render checkbox cell when selectable is false', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead></cor-thead>`,
      });
      const checkboxCell = page.root?.shadowRoot?.querySelector('.checkbox-cell');
      expect(checkboxCell).toBeNull();
    });

    it('renders expand cell when expandable is true', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead expandable></cor-thead>`,
      });
      const expandCell = page.root?.shadowRoot?.querySelector('.expand-cell');
      expect(expandCell).toBeTruthy();
    });

    it('does not render expand cell when expandable is false', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead></cor-thead>`,
      });
      const expandCell = page.root?.shadowRoot?.querySelector('.expand-cell');
      expect(expandCell).toBeNull();
    });

    it('emits corSelectAll event when checkbox is clicked', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead selectable></cor-thead>`,
      });
      const eventSpy = jest.fn();
      page.root?.addEventListener('corSelectAll', eventSpy);

      const checkboxCell = page.root?.shadowRoot?.querySelector('.checkbox-cell') as HTMLButtonElement;
      checkboxCell?.click();
      await page.waitForChanges();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy.mock.calls[0][0].detail).toEqual({ selected: true });
    });

    it('renders cor-checkbox with correct props', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead selectable select-all-checked></cor-thead>`,
      });
      const checkbox = page.root?.shadowRoot?.querySelector('cor-checkbox');
      expect(checkbox?.getAttribute('size')).toBe('sm');
      expect(checkbox?.hasAttribute('checked')).toBe(true);
      expect(checkbox?.hasAttribute('inert')).toBe(true);
    });

    it('applies aria-checked="mixed" when indeterminate', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead selectable select-all-indeterminate></cor-thead>`,
      });
      const checkboxCell = page.root?.shadowRoot?.querySelector('.checkbox-cell');
      expect(checkboxCell?.getAttribute('aria-checked')).toBe('mixed');
    });

    it('applies aria-checked="true" when checked', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead selectable select-all-checked></cor-thead>`,
      });
      const checkboxCell = page.root?.shadowRoot?.querySelector('.checkbox-cell');
      expect(checkboxCell?.getAttribute('aria-checked')).toBe('true');
    });

    it('applies aria-checked="false" when not checked', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead selectable></cor-thead>`,
      });
      const checkboxCell = page.root?.shadowRoot?.querySelector('.checkbox-cell');
      expect(checkboxCell?.getAttribute('aria-checked')).toBe('false');
    });

    it('renders slot for columns', async () => {
      const page = await newSpecPage({
        components: [CorThead],
        html: `<cor-thead></cor-thead>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot:not([name])');
      expect(slot).toBeTruthy();
    });
  });

  describe('cor-tbody - table body', () => {
    it('renders with default props', async () => {
      const page = await newSpecPage({
        components: [CorTbody],
        html: `<cor-tbody></cor-tbody>`,
      });
      expect(page.root).toBeTruthy();
    });

    it('renders with role="rowgroup"', async () => {
      const page = await newSpecPage({
        components: [CorTbody],
        html: `<cor-tbody></cor-tbody>`,
      });
      expect(page.root?.getAttribute('role')).toBe('rowgroup');
    });

    it('renders slot for rows', async () => {
      const page = await newSpecPage({
        components: [CorTbody],
        html: `<cor-tbody></cor-tbody>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });

    it('renders slotted content', async () => {
      const page = await newSpecPage({
        components: [CorTbody],
        html: `<cor-tbody><div>Body Content</div></cor-tbody>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });
  });

  describe('cor-tfoot - table footer', () => {
    it('renders with default props', async () => {
      const page = await newSpecPage({
        components: [CorTfoot],
        html: `<cor-tfoot></cor-tfoot>`,
      });
      expect(page.root).toBeTruthy();
    });

    it('renders with role="rowgroup"', async () => {
      const page = await newSpecPage({
        components: [CorTfoot],
        html: `<cor-tfoot></cor-tfoot>`,
      });
      expect(page.root?.getAttribute('role')).toBe('rowgroup');
    });

    it('defaults topLine to true', async () => {
      const page = await newSpecPage({
        components: [CorTfoot],
        html: `<cor-tfoot></cor-tfoot>`,
      });
      expect(page.root?.getAttribute('top-line')).not.toBeNull();
    });

    it('reflects topLine attribute', async () => {
      const page = await newSpecPage({
        components: [CorTfoot],
        html: `<cor-tfoot top-line="false"></cor-tfoot>`,
      });
      expect(page.root?.getAttribute('top-line')).toBe('false');
    });

    it('renders slot for footer content', async () => {
      const page = await newSpecPage({
        components: [CorTfoot],
        html: `<cor-tfoot></cor-tfoot>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });
  });

  describe('cor-row - table row', () => {
    it('renders with default props', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row></cor-row>`,
      });
      expect(page.root).toBeTruthy();
    });

    it('renders with role="row"', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row></cor-row>`,
      });
      expect(page.root?.getAttribute('role')).toBe('row');
    });

    it('defaults selectable to false', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row></cor-row>`,
      });
      expect(page.root?.hasAttribute('selectable')).toBe(false);
    });

    it('defaults selected to false', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row></cor-row>`,
      });
      expect(page.root?.hasAttribute('selected')).toBe(false);
    });

    it('defaults disabled to false', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row></cor-row>`,
      });
      expect(page.root?.hasAttribute('disabled')).toBe(false);
    });

    it('defaults expandable to false', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row></cor-row>`,
      });
      expect(page.root?.hasAttribute('expandable')).toBe(false);
    });

    it('defaults expanded to false', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row></cor-row>`,
      });
      expect(page.root?.hasAttribute('expanded')).toBe(false);
    });

    it('reflects selectable attribute', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row selectable></cor-row>`,
      });
      expect(page.root?.getAttribute('selectable')).not.toBeNull();
    });

    it('reflects selected attribute', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row selected></cor-row>`,
      });
      expect(page.root?.getAttribute('selected')).not.toBeNull();
    });

    it('reflects disabled attribute', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row disabled></cor-row>`,
      });
      expect(page.root?.getAttribute('disabled')).not.toBeNull();
    });

    it('reflects expandable attribute', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row expandable></cor-row>`,
      });
      expect(page.root?.getAttribute('expandable')).not.toBeNull();
    });

    it('reflects expanded attribute', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row expanded></cor-row>`,
      });
      expect(page.root?.getAttribute('expanded')).not.toBeNull();
    });

    it('applies aria-selected when selected', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row selected></cor-row>`,
      });
      expect(page.root?.getAttribute('aria-selected')).toBe('true');
    });

    it('applies aria-disabled when disabled', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row disabled></cor-row>`,
      });
      expect(page.root?.getAttribute('aria-disabled')).toBe('true');
    });

    it('applies aria-expanded when expandable', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row expandable expanded></cor-row>`,
      });
      expect(page.root?.getAttribute('aria-expanded')).toBe('true');
    });

    it('applies aria-rowindex when provided', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row row-index="5"></cor-row>`,
      });
      expect(page.root?.getAttribute('aria-rowindex')).toBe('5');
    });

    it('emits corRowClick when clicked', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row row-id="row-1"></cor-row>`,
      });
      const eventSpy = jest.fn();
      page.root?.addEventListener('corRowClick', eventSpy);

      page.root?.click();
      await page.waitForChanges();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy.mock.calls[0][0].detail).toEqual({ rowId: 'row-1' });
    });

    it('emits corRowSelect when checkbox is clicked', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row selectable row-id="row-1"></cor-row>`,
      });
      const eventSpy = jest.fn();
      page.root?.addEventListener('corRowSelect', eventSpy);

      const checkboxCell = page.root?.shadowRoot?.querySelector('.checkbox-cell') as HTMLButtonElement;
      checkboxCell?.click();
      await page.waitForChanges();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy.mock.calls[0][0].detail).toEqual({ rowId: 'row-1', selected: true });
    });

    it('emits corRowExpand when expand button is clicked', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row expandable row-id="row-1"></cor-row>`,
      });
      const eventSpy = jest.fn();
      page.root?.addEventListener('corRowExpand', eventSpy);

      const expandButton = page.root?.shadowRoot?.querySelector('.expand-button') as HTMLButtonElement;
      expandButton?.click();
      await page.waitForChanges();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy.mock.calls[0][0].detail).toEqual({ rowId: 'row-1', expanded: true });
    });

    it('renders expand content when expanded', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row expandable expanded></cor-row>`,
      });
      const expandContent = page.root?.shadowRoot?.querySelector('.expand-content');
      expect(expandContent).toBeTruthy();
    });

    it('does not render expand content when not expanded', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row expandable></cor-row>`,
      });
      const expandContent = page.root?.shadowRoot?.querySelector('.expand-content');
      expect(expandContent).toBeNull();
    });

    it('renders action cell when selectable or expandable', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row selectable></cor-row>`,
      });
      const actionCell = page.root?.shadowRoot?.querySelector('.action-cell');
      expect(actionCell).toBeTruthy();
    });

    it('does not emit events when disabled', async () => {
      const page = await newSpecPage({
        components: [CorRow],
        html: `<cor-row disabled row-id="row-1"></cor-row>`,
      });
      const eventSpy = jest.fn();
      page.root?.addEventListener('corRowClick', eventSpy);

      page.root?.click();
      await page.waitForChanges();

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('cor-column - table column header', () => {
    it('renders with default props', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column></cor-column>`,
      });
      expect(page.root).toBeTruthy();
    });

    it('renders with role="columnheader"', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column></cor-column>`,
      });
      expect(page.root?.getAttribute('role')).toBe('columnheader');
    });

    it('defaults align to left', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column></cor-column>`,
      });
      expect(page.root?.getAttribute('align')).toBe('left');
    });

    it('reflects align attribute', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column align="center"></cor-column>`,
      });
      expect(page.root?.getAttribute('align')).toBe('center');
    });

    it('defaults active to false', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column></cor-column>`,
      });
      expect(page.root?.hasAttribute('active')).toBe(false);
    });

    it('reflects active attribute', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column active></cor-column>`,
      });
      expect(page.root?.getAttribute('active')).not.toBeNull();
    });

    it('applies aria-colindex when provided', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column col-index="3"></cor-column>`,
      });
      expect(page.root?.getAttribute('aria-colindex')).toBe('3');
    });

    it('renders column content wrapper', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column></cor-column>`,
      });
      const content = page.root?.shadowRoot?.querySelector('.column-content');
      expect(content).toBeTruthy();
    });

    it('renders label span', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column></cor-column>`,
      });
      const label = page.root?.shadowRoot?.querySelector('.label');
      expect(label).toBeTruthy();
    });

    it('renders action-left slot', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column></cor-column>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot[name="action-left"]');
      expect(slot).toBeTruthy();
    });

    it('renders action-right slot', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column></cor-column>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot[name="action-right"]');
      expect(slot).toBeTruthy();
    });

    it('renders default slot for label content', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column></cor-column>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('.label slot');
      expect(slot).toBeTruthy();
    });

    it('applies width style when width prop is provided', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column width="200px"></cor-column>`,
      });
      const style = page.root?.style;
      expect(style?.width).toBe('200px');
    });

    it('applies minWidth style when minWidth prop is provided', async () => {
      const page = await newSpecPage({
        components: [CorColumn],
        html: `<cor-column min-width="100px"></cor-column>`,
      });
      const style = page.root?.style;
      expect(style?.minWidth).toBe('100px');
    });
  });

  describe('cor-cell - table cell', () => {
    it('renders with default props', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell></cor-cell>`,
      });
      expect(page.root).toBeTruthy();
    });

    it('renders with role="cell"', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell></cor-cell>`,
      });
      expect(page.root?.getAttribute('role')).toBe('cell');
    });

    it('defaults align to left', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell></cor-cell>`,
      });
      expect(page.root?.getAttribute('align')).toBe('left');
    });

    it('reflects align attribute', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell align="right"></cor-cell>`,
      });
      expect(page.root?.getAttribute('align')).toBe('right');
    });

    it('defaults interactive to false', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell></cor-cell>`,
      });
      expect(page.root?.hasAttribute('interactive')).toBe(false);
    });

    it('reflects interactive attribute', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell interactive></cor-cell>`,
      });
      expect(page.root?.getAttribute('interactive')).not.toBeNull();
    });

    it('defaults active to false', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell></cor-cell>`,
      });
      expect(page.root?.hasAttribute('active')).toBe(false);
    });

    it('reflects active attribute', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell active></cor-cell>`,
      });
      expect(page.root?.getAttribute('active')).not.toBeNull();
    });

    it('applies aria-colindex when provided', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell col-index="2"></cor-cell>`,
      });
      expect(page.root?.getAttribute('aria-colindex')).toBe('2');
    });

    it('applies tabIndex when interactive', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell interactive></cor-cell>`,
      });
      expect(page.root?.getAttribute('tabIndex')).toBe('0');
    });

    it('does not apply tabIndex when not interactive', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell></cor-cell>`,
      });
      expect(page.root?.getAttribute('tabIndex')).toBeNull();
    });

    it('renders cell content wrapper', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell></cor-cell>`,
      });
      const content = page.root?.shadowRoot?.querySelector('.cell-content');
      expect(content).toBeTruthy();
    });

    it('renders default slot', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell></cor-cell>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });

    it('applies width style when width prop is provided', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell width="150px"></cor-cell>`,
      });
      const style = page.root?.style;
      expect(style?.width).toBe('150px');
    });

    it('applies minWidth style when minWidth prop is provided', async () => {
      const page = await newSpecPage({
        components: [CorCell],
        html: `<cor-cell min-width="80px"></cor-cell>`,
      });
      const style = page.root?.style;
      expect(style?.minWidth).toBe('80px');
    });
  });
});
