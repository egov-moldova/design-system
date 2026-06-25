import { afterEach, beforeEach, describe, expect, h, it, render, vi } from '@stencil/vitest';

import '../mud-date-picker';

import { DATE_PICKER_BREAKPOINTS, DATE_PICKER_MODES } from '../mud-date-picker.types';

const queryCells = (root: Element | null | undefined): HTMLButtonElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll<HTMLButtonElement>('button.day-cell') ?? []);

const queryCellByIso = (root: Element | null | undefined, iso: string): HTMLButtonElement | null =>
  root?.shadowRoot?.querySelector<HTMLButtonElement>(`button.day-cell[data-iso="${iso}"]`) ?? null;

const queryTitle = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('button.title') ?? null) as HTMLElement | null;

const queryNavButtons = (root: Element | null | undefined): HTMLButtonElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll<HTMLButtonElement>('button.nav-button') ?? []);

const queryDayLabels = (root: Element | null | undefined): HTMLElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll<HTMLElement>('.day-label') ?? []);

const queryHostAttrs = (root: Element | null | undefined): Record<string, string | null> => {
  const attrs: Record<string, string | null> = {};
  if (!root) return attrs;
  for (const a of Array.from(root.attributes)) attrs[a.name] = a.value;
  return attrs;
};

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 10));

describe('mud-date-picker', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-date-picker></mud-date-picker>);
      expect(root?.getAttribute('mode')).toBe('single');
      expect(root?.getAttribute('breakpoint')).toBe('desktop');
      expect(root?.getAttribute('role')).toBe('application');
    });

    it.each(DATE_PICKER_MODES)('reflects mode="%s" to host', async mode => {
      const { root } = await render(<mud-date-picker mode={mode}></mud-date-picker>);
      expect(root?.getAttribute('mode')).toBe(mode);
    });

    it.each(DATE_PICKER_BREAKPOINTS)('reflects breakpoint="%s" to host', async breakpoint => {
      const { root } = await render(<mud-date-picker breakpoint={breakpoint}></mud-date-picker>);
      expect(root?.getAttribute('breakpoint')).toBe(breakpoint);
    });

    it('warns and falls back when mode is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-date-picker></mud-date-picker>);
      (root as unknown as { mode: string }).mode = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('mode="bogus"'));
      expect(root?.getAttribute('mode')).toBe('single');
      warn.mockRestore();
    });

    it('warns and falls back when breakpoint is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-date-picker></mud-date-picker>);
      (root as unknown as { breakpoint: string }).breakpoint = 'phablet';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('breakpoint="phablet"'));
      expect(root?.getAttribute('breakpoint')).toBe('desktop');
      warn.mockRestore();
    });
  });

  describe('grid + locale', () => {
    it('renders a 6×7 day grid (42 cells)', async () => {
      const { root } = await render(<mud-date-picker value="2026-05-23"></mud-date-picker>);
      const cells = queryCells(root);
      expect(cells.length).toBe(42);
    });

    it('renders 7 weekday labels', async () => {
      const { root } = await render(<mud-date-picker locale="ro-RO"></mud-date-picker>);
      const labels = queryDayLabels(root);
      expect(labels.length).toBe(7);
    });

    it('uses Romanian month name in title by default', async () => {
      const { root } = await render(<mud-date-picker value="2026-05-23"></mud-date-picker>);
      const title = queryTitle(root);
      // Romanian May = "mai", capitalized → "Mai"
      expect(title?.textContent?.toLowerCase()).toContain('mai');
      expect(title?.textContent).toContain('2026');
    });

    it('switches month label to English when locale=en-US', async () => {
      const { root } = await render(<mud-date-picker value="2026-05-23" locale="en-US"></mud-date-picker>);
      const title = queryTitle(root);
      expect(title?.textContent?.toLowerCase()).toContain('may');
    });

    it('first day of week defaults to Monday (ro-RO convention)', async () => {
      const { root } = await render(<mud-date-picker locale="ro-RO"></mud-date-picker>);
      const labels = queryDayLabels(root);
      const firstLabelLong = labels[0]?.getAttribute('aria-label')?.toLowerCase();
      expect(firstLabelLong).toMatch(/luni|monday/);
    });

    it('first day of week becomes Sunday when firstDayOfWeek=0', async () => {
      const { root } = await render(<mud-date-picker locale="en-US" firstDayOfWeek={0}></mud-date-picker>);
      const labels = queryDayLabels(root);
      const firstLabelLong = labels[0]?.getAttribute('aria-label')?.toLowerCase();
      expect(firstLabelLong).toMatch(/sunday|duminică/);
    });
  });

  describe('selection — single mode', () => {
    it('emits mudChange with ISO value on click', async () => {
      const { root } = await render(<mud-date-picker mode="single" value="2026-05-01"></mud-date-picker>);
      const onChange = vi.fn();
      root?.addEventListener('mudChange', onChange);
      const target = queryCellByIso(root, '2026-05-15');
      target?.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: '2026-05-15' });
      expect((root as unknown as { value: string }).value).toBe('2026-05-15');
    });

    it('marks the selected day with aria-selected="true"', async () => {
      const { root } = await render(<mud-date-picker mode="single" value="2026-05-15"></mud-date-picker>);
      const cell = queryCellByIso(root, '2026-05-15');
      expect(cell?.getAttribute('aria-selected')).toBe('true');
    });

    it('does not emit when clicking a disabled date', async () => {
      const { root } = await render(
        <mud-date-picker mode="single" value="2026-05-01" min="2026-05-10" max="2026-05-20"></mud-date-picker>,
      );
      const onChange = vi.fn();
      root?.addEventListener('mudChange', onChange);
      const target = queryCellByIso(root, '2026-05-05');
      expect(target?.hasAttribute('disabled')).toBe(true);
      target?.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('selection — range mode', () => {
    // These tests click hardcoded May-2026 cells without seeding a value, so the
    // visible month must be May 2026. Pin only the Date clock (leave setTimeout /
    // rAF real so `flush()` and focus management still work).
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('sets rangeStart on the first click and rangeEnd on the second', async () => {
      const { root } = await render(<mud-date-picker mode="range" viewDate="2026-05-01"></mud-date-picker>);
      const onChange = vi.fn();
      root?.addEventListener('mudChange', onChange);

      queryCellByIso(root, '2026-05-10')?.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail.rangeStart).toBe('2026-05-10');
      expect(onChange.mock.calls[0][0].detail.rangeEnd).toBeUndefined();

      queryCellByIso(root, '2026-05-15')?.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange.mock.calls[1][0].detail.rangeStart).toBe('2026-05-10');
      expect(onChange.mock.calls[1][0].detail.rangeEnd).toBe('2026-05-15');
    });

    it('swaps endpoints when the second click is earlier than the first', async () => {
      const { root } = await render(<mud-date-picker mode="range" viewDate="2026-05-01"></mud-date-picker>);
      const onChange = vi.fn();
      root?.addEventListener('mudChange', onChange);
      queryCellByIso(root, '2026-05-15')?.click();
      await flush();
      queryCellByIso(root, '2026-05-10')?.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange.mock.calls[1][0].detail.rangeStart).toBe('2026-05-10');
      expect(onChange.mock.calls[1][0].detail.rangeEnd).toBe('2026-05-15');
    });

    it('starts a new range when both endpoints are already set', async () => {
      const { root } = await render(
        <mud-date-picker mode="range" rangeStart="2026-05-10" rangeEnd="2026-05-15"></mud-date-picker>,
      );
      queryCellByIso(root, '2026-05-20')?.click();
      await flush();
      expect((root as unknown as { rangeStart: string }).rangeStart).toBe('2026-05-20');
      expect((root as unknown as { rangeEnd: string | undefined }).rangeEnd).toBeUndefined();
    });
  });

  describe('selection — multi mode', () => {
    // Same rationale as range mode: pin the clock to May 2026 so the hardcoded
    // cells are in the visible grid.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('toggles individual dates into and out of the value array', async () => {
      const { root } = await render(<mud-date-picker mode="multi" viewDate="2026-05-01"></mud-date-picker>);
      const onChange = vi.fn();
      root?.addEventListener('mudChange', onChange);
      queryCellByIso(root, '2026-05-10')?.click();
      await flush();
      queryCellByIso(root, '2026-05-12')?.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange.mock.calls[1][0].detail.value).toEqual(['2026-05-10', '2026-05-12']);
      // Re-click removes
      queryCellByIso(root, '2026-05-10')?.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange.mock.calls[2][0].detail.value).toEqual(['2026-05-12']);
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowRight moves focus by one day', async () => {
      const { root } = await render(<mud-date-picker mode="single" value="2026-05-15"></mud-date-picker>);
      const cell = queryCellByIso(root, '2026-05-15');
      cell?.focus();
      cell?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true, cancelable: true }),
      );
      await flush();
      expect((root as unknown as { focusedIso: string }).focusedIso).toBe('2026-05-16');
    });

    it('ArrowDown moves focus by seven days', async () => {
      const { root } = await render(<mud-date-picker mode="single" value="2026-05-15"></mud-date-picker>);
      const cell = queryCellByIso(root, '2026-05-15');
      cell?.focus();
      cell?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true }),
      );
      await flush();
      expect((root as unknown as { focusedIso: string }).focusedIso).toBe('2026-05-22');
    });

    it('PageDown advances the month', async () => {
      const { root } = await render(<mud-date-picker mode="single" value="2026-05-15"></mud-date-picker>);
      const onMonthChange = vi.fn();
      root?.addEventListener('mudMonthChange', onMonthChange);
      const cell = queryCellByIso(root, '2026-05-15');
      cell?.focus();
      cell?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, composed: true, cancelable: true }),
      );
      await flush();
      expect(onMonthChange).toHaveBeenCalledTimes(1);
      expect(onMonthChange.mock.calls[0][0].detail.month).toBe(5); // June (0-indexed)
    });

    it('Shift+PageDown advances the year', async () => {
      const { root } = await render(<mud-date-picker mode="single" value="2026-05-15"></mud-date-picker>);
      const onMonthChange = vi.fn();
      root?.addEventListener('mudMonthChange', onMonthChange);
      const cell = queryCellByIso(root, '2026-05-15');
      cell?.focus();
      cell?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'PageDown',
          shiftKey: true,
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );
      await flush();
      expect(onMonthChange).toHaveBeenCalledTimes(1);
      expect(onMonthChange.mock.calls[0][0].detail.year).toBe(2027);
    });

    it('Enter selects the focused day', async () => {
      const { root } = await render(<mud-date-picker mode="single" value="2026-05-15"></mud-date-picker>);
      const onChange = vi.fn();
      root?.addEventListener('mudChange', onChange);
      const cell = queryCellByIso(root, '2026-05-20');
      cell?.focus();
      cell?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true }),
      );
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail.value).toBe('2026-05-20');
    });

    it('Home jumps to the start of the visible week', async () => {
      // 2026-05-15 is a Friday; first day of week=Monday, so Home → Monday 2026-05-11.
      const { root } = await render(<mud-date-picker mode="single" value="2026-05-15"></mud-date-picker>);
      const cell = queryCellByIso(root, '2026-05-15');
      cell?.focus();
      cell?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true, cancelable: true }),
      );
      await flush();
      expect((root as unknown as { focusedIso: string }).focusedIso).toBe('2026-05-11');
    });
  });

  describe('navigation header', () => {
    it('clicking the next nav button advances one month', async () => {
      const { root } = await render(<mud-date-picker value="2026-05-15"></mud-date-picker>);
      const onMonthChange = vi.fn();
      root?.addEventListener('mudMonthChange', onMonthChange);
      const [, next] = queryNavButtons(root);
      next?.click();
      await flush();
      expect(onMonthChange.mock.calls[0][0].detail.month).toBe(5); // June
    });

    it('clicking the previous nav button goes back one month', async () => {
      const { root } = await render(<mud-date-picker value="2026-05-15"></mud-date-picker>);
      const onMonthChange = vi.fn();
      root?.addEventListener('mudMonthChange', onMonthChange);
      const [prev] = queryNavButtons(root);
      prev?.click();
      await flush();
      expect(onMonthChange.mock.calls[0][0].detail.month).toBe(3); // April
    });
  });

  describe('ARIA + a11y contracts', () => {
    it('host has role="application" labelled by the visible title', async () => {
      const { root } = await render(<mud-date-picker value="2026-05-15"></mud-date-picker>);
      const attrs = queryHostAttrs(root);
      expect(attrs.role).toBe('application');
      // Either aria-label (when user-provided) or aria-labelledby pointing at the visible title.
      const hasLabel = attrs['aria-label'] != null || attrs['aria-labelledby'] != null;
      expect(hasLabel).toBe(true);
      // The visible title still contains the localized month/year.
      const title = root?.shadowRoot?.querySelector('button.title');
      expect(title?.textContent?.toLowerCase()).toMatch(/mai|2026/);
    });

    it('honors user-supplied aria-label when provided', async () => {
      const { root } = await render(
        <mud-date-picker value="2026-05-15" aria-label="Selectează data"></mud-date-picker>,
      );
      expect(root?.getAttribute('aria-label')).toBe('Selectează data');
    });

    it('day grid uses role="grid" with row/gridcell descendants', async () => {
      const { root } = await render(<mud-date-picker></mud-date-picker>);
      expect(root?.shadowRoot?.querySelector('[role="grid"]')).toBeTruthy();
      expect(root?.shadowRoot?.querySelectorAll('[role="row"]').length).toBeGreaterThan(0);
      expect(root?.shadowRoot?.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0);
    });

    it('today cell carries aria-current="date"', async () => {
      // We can't pin "today" deterministically without freezing the system clock — instead,
      // assert that at most one cell has aria-current="date" and that any such cell is in the visible range.
      const { root } = await render(<mud-date-picker></mud-date-picker>);
      const today = new Date();
      const iso = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(
        today.getUTCDate(),
      ).padStart(2, '0')}`;
      const cell = queryCellByIso(root, iso);
      if (cell) {
        expect(cell.getAttribute('aria-current')).toBe('date');
      }
      const currents = Array.from(root?.shadowRoot?.querySelectorAll('[aria-current="date"]') ?? []);
      expect(currents.length).toBeLessThanOrEqual(1);
    });

    it('disabled dates expose aria-disabled', async () => {
      const { root } = await render(
        <mud-date-picker value="2026-05-15" disabledDates={['2026-05-09', '2026-05-10']}></mud-date-picker>,
      );
      const blocked = queryCellByIso(root, '2026-05-09');
      expect(blocked?.getAttribute('aria-disabled')).toBe('true');
      expect(blocked?.hasAttribute('disabled')).toBe(true);
    });

    it('each gridcell carries an Intl-formatted aria-label', async () => {
      const { root } = await render(<mud-date-picker value="2026-05-15"></mud-date-picker>);
      const cell = queryCellByIso(root, '2026-05-15');
      const label = cell?.getAttribute('aria-label');
      expect(label).toMatch(/2026/);
      // Romanian "mai" or English "May" depending on system Intl ICU support
      expect((label ?? '').length).toBeGreaterThan(5);
    });
  });

  describe('month and year views', () => {
    it('clicking the title opens the month picker', async () => {
      const { root } = await render(<mud-date-picker value="2026-05-15"></mud-date-picker>);
      const title = queryTitle(root);
      title?.click();
      await flush();
      expect(root?.shadowRoot?.querySelector('[part="month-cell"]')).toBeTruthy();
    });

    it('clicking the title again opens the year picker', async () => {
      const { root } = await render(<mud-date-picker value="2026-05-15"></mud-date-picker>);
      const title = queryTitle(root);
      title?.click();
      await flush();
      title?.click();
      await flush();
      expect(root?.shadowRoot?.querySelector('[part="year-cell"]')).toBeTruthy();
    });

    it('selecting a month from the month picker returns to days view', async () => {
      const { root } = await render(<mud-date-picker value="2026-05-15"></mud-date-picker>);
      const title = queryTitle(root);
      title?.click();
      await flush();
      const monthCell = root?.shadowRoot?.querySelector<HTMLButtonElement>('[part="month-cell"]');
      monthCell?.click();
      await flush();
      expect(root?.shadowRoot?.querySelector('[role="grid"]')).toBeTruthy();
      // Back to day cells
      expect(queryCells(root).length).toBe(42);
    });

    it('selecting a year from the year picker advances to month view', async () => {
      const { root } = await render(<mud-date-picker value="2026-05-15"></mud-date-picker>);
      const title = queryTitle(root);
      title?.click(); // months
      await flush();
      title?.click(); // years
      await flush();
      const yearCell = root?.shadowRoot?.querySelector<HTMLButtonElement>('[part="year-cell"]');
      yearCell?.click();
      await flush();
      expect(root?.shadowRoot?.querySelector('[part="month-cell"]')).toBeTruthy();
    });
  });

  describe('today shortcut + footer', () => {
    it('shows the Today shortcut by default', async () => {
      const { root } = await render(<mud-date-picker></mud-date-picker>);
      const todayButton = root?.shadowRoot?.querySelector('button.today-button');
      expect(todayButton).toBeTruthy();
    });

    it('hides the Today shortcut when hideTodayShortcut is set', async () => {
      const { root } = await render(<mud-date-picker hideTodayShortcut></mud-date-picker>);
      const todayButton = root?.shadowRoot?.querySelector('button.today-button');
      expect(todayButton).toBeNull();
    });

    it('clicking Today resets the view to the current month', async () => {
      const { root } = await render(<mud-date-picker value="2020-01-15"></mud-date-picker>);
      const onMonthChange = vi.fn();
      root?.addEventListener('mudMonthChange', onMonthChange);
      const todayButton = root?.shadowRoot?.querySelector<HTMLButtonElement>('button.today-button');
      todayButton?.click();
      await flush();
      expect(onMonthChange).toHaveBeenCalled();
      const now = new Date();
      expect((root as unknown as { viewYear: number }).viewYear).toBe(now.getUTCFullYear());
      expect((root as unknown as { viewMonth: number }).viewMonth).toBe(now.getUTCMonth());
    });
  });

  describe('breakpoint behavior', () => {
    it('renders a drag handle when breakpoint=mobile', async () => {
      const { root } = await render(<mud-date-picker breakpoint="mobile"></mud-date-picker>);
      expect(root?.shadowRoot?.querySelector('.drag-handle')).toBeTruthy();
    });

    it('does NOT render a drag handle when breakpoint=desktop', async () => {
      const { root } = await render(<mud-date-picker breakpoint="desktop"></mud-date-picker>);
      expect(root?.shadowRoot?.querySelector('.drag-handle')).toBeNull();
    });

    it('does NOT render a drag handle when breakpoint=docked', async () => {
      const { root } = await render(<mud-date-picker breakpoint="docked"></mud-date-picker>);
      expect(root?.shadowRoot?.querySelector('.drag-handle')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('renders Feb 29 correctly in a leap year', async () => {
      const { root } = await render(<mud-date-picker value="2024-02-29"></mud-date-picker>);
      const cell = queryCellByIso(root, '2024-02-29');
      expect(cell).toBeTruthy();
      expect(cell?.getAttribute('aria-selected')).toBe('true');
    });

    it('does NOT render Feb 29 in a non-leap year', async () => {
      const { root } = await render(<mud-date-picker value="2026-02-15"></mud-date-picker>);
      const cell = queryCellByIso(root, '2026-02-29');
      // 2026-02-29 doesn't exist — cells beyond Feb 28 belong to March (spillover)
      // and we only ever find an iso that maps to a real UTC date.
      expect(cell).toBeNull();
    });

    it('Dec→Jan boundary renders without crashing', async () => {
      const { root } = await render(<mud-date-picker value="2026-12-31"></mud-date-picker>);
      const cell = queryCellByIso(root, '2026-12-31');
      expect(cell?.getAttribute('aria-selected')).toBe('true');
      const cells = queryCellByIso(root, '2027-01-01');
      // Spillover into the next month should be present and marked outside.
      expect(cells?.classList.contains('is-outside')).toBe(true);
    });
  });

  describe('header style', () => {
    it('renders a single title button by default', async () => {
      const { root } = await render(<mud-date-picker value="2026-05-15"></mud-date-picker>);
      expect(root?.shadowRoot?.querySelector('.title')).toBeTruthy();
      expect(root?.shadowRoot?.querySelectorAll('.dropdown-trigger').length).toBe(0);
    });

    it('renders month + year dropdown chips when header-style="dropdown"', async () => {
      const { root } = await render(<mud-date-picker header-style="dropdown" value="2026-05-15"></mud-date-picker>);
      expect(root?.shadowRoot?.querySelector('.title')).toBeNull();
      expect(root?.shadowRoot?.querySelectorAll('.dropdown-trigger').length).toBe(2);
    });

    it('opens the month grid from the month dropdown chip', async () => {
      const { root } = await render(<mud-date-picker header-style="dropdown" value="2026-05-15"></mud-date-picker>);
      const monthChip = root?.shadowRoot?.querySelector<HTMLButtonElement>('[part="month-dropdown"]');
      monthChip?.click();
      await flush();
      expect(root?.shadowRoot?.querySelector('.month-grid')).toBeTruthy();
      expect(monthChip?.getAttribute('aria-expanded')).toBe('true');
    });

    it('opens the year grid from the year dropdown chip', async () => {
      const { root } = await render(<mud-date-picker header-style="dropdown" value="2026-05-15"></mud-date-picker>);
      const yearChip = root?.shadowRoot?.querySelector<HTMLButtonElement>('[part="year-dropdown"]');
      yearChip?.click();
      await flush();
      expect(root?.shadowRoot?.querySelector('.year-grid')).toBeTruthy();
      // Per the Figma, the year view collapses the month/year chips into a single
      // decade-range header label (e.g. "2016 - 2027").
      const title = root?.shadowRoot?.querySelector('button.title');
      expect(title?.textContent).toMatch(/\d{4}\s*-\s*\d{4}/);
    });
  });
});
