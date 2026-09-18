import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-time-picker';

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const queryOption = (root: Element | null | undefined, column: 'hours' | 'minutes', n: number) =>
  root?.shadowRoot?.querySelector<HTMLElement>(`[role="option"][data-column="${column}"][data-value="${n}"]`) ?? null;

const queryColumn = (root: Element | null | undefined, column: 'hours' | 'minutes') =>
  root?.shadowRoot?.querySelector<HTMLElement>(`.column[data-column="${column}"]`) ?? null;

/** mock-doc does not route KeyboardEvents through listeners: call the host handler with the option as origin. */
const pressKey = (root: Element | null | undefined, option: HTMLElement | null, key: string) => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'composedPath', { value: () => [option] });
  (root as unknown as { handleKeyDown: (e: KeyboardEvent) => void }).handleKeyDown(ev);
  return ev;
};

describe('mud-time-picker', () => {
  describe('structure + ARIA', () => {
    it('renders a labelled group with an hour and a minute listbox', async () => {
      const { root } = await render(<mud-time-picker></mud-time-picker>);
      expect(root?.getAttribute('role')).toBe('group');
      expect(root?.getAttribute('aria-label')).toBe('Selectează ora');
      expect(queryColumn(root, 'hours')?.getAttribute('role')).toBe('listbox');
      expect(queryColumn(root, 'hours')?.getAttribute('aria-label')).toBe('Ore');
      expect(queryColumn(root, 'minutes')?.getAttribute('aria-label')).toBe('Minute');
    });

    it('lists hours 00–23 and minutes 00–59, zero-padded', async () => {
      const { root } = await render(<mud-time-picker></mud-time-picker>);
      const hours = queryColumn(root, 'hours')?.querySelectorAll('[role="option"]');
      const minutes = queryColumn(root, 'minutes')?.querySelectorAll('[role="option"]');
      expect(hours).toHaveLength(24);
      expect(minutes).toHaveLength(60);
      expect(hours?.[0]?.textContent).toBe('00');
      expect(hours?.[23]?.textContent).toBe('23');
      expect(minutes?.[59]?.textContent).toBe('59');
    });

    it('renders seven aria-hidden separator cells', async () => {
      const { root } = await render(<mud-time-picker></mud-time-picker>);
      const separator = root?.shadowRoot?.querySelector('.separator');
      expect(separator?.getAttribute('aria-hidden')).toBe('true');
      expect(separator?.querySelectorAll('.separator-cell')).toHaveLength(7);
    });

    it('uses custom column labels', async () => {
      const { root } = await render(
        <mud-time-picker label="Pick a time" hours-label="Hours" minutes-label="Minutes"></mud-time-picker>,
      );
      expect(root?.getAttribute('aria-label')).toBe('Pick a time');
      expect(queryColumn(root, 'hours')?.getAttribute('aria-label')).toBe('Hours');
      expect(queryColumn(root, 'minutes')?.getAttribute('aria-label')).toBe('Minutes');
    });
  });

  describe('selection state', () => {
    it('marks the value: solid in the hour column (edited first), tinted in the minute column', async () => {
      const { root } = await render(<mud-time-picker value="11:15"></mud-time-picker>);
      const hour = queryOption(root, 'hours', 11);
      const minute = queryOption(root, 'minutes', 15);
      expect(hour?.getAttribute('aria-selected')).toBe('true');
      expect(hour?.classList.contains('is-active')).toBe(true);
      expect(minute?.getAttribute('aria-selected')).toBe('true');
      expect(minute?.classList.contains('is-selected')).toBe(true);
      expect(minute?.classList.contains('is-active')).toBe(false);
    });

    it('gives each column one tab stop, on the selected option', async () => {
      const { root } = await render(<mud-time-picker value="11:15"></mud-time-picker>);
      const hourStops = queryColumn(root, 'hours')?.querySelectorAll('[tabindex="0"]');
      expect(hourStops).toHaveLength(1);
      expect(hourStops?.[0]?.textContent).toBe('11');
      expect(queryColumn(root, 'minutes')?.querySelector('[tabindex="0"]')?.textContent).toBe('15');
    });

    it('puts the tab stop on the first option without a value', async () => {
      const { root } = await render(<mud-time-picker></mud-time-picker>);
      expect(queryColumn(root, 'hours')?.querySelector('[tabindex="0"]')?.textContent).toBe('00');
    });

    it('ignores a malformed value', async () => {
      const { root } = await render(<mud-time-picker value="25:99"></mud-time-picker>);
      expect(root?.shadowRoot?.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);
    });

    it('follows a value change', async () => {
      const { root } = await render(<mud-time-picker value="11:15"></mud-time-picker>);
      (root as HTMLMudTimePickerElement).value = '08:05';
      await flush();
      expect(queryOption(root, 'hours', 8)?.getAttribute('aria-selected')).toBe('true');
      expect(queryOption(root, 'minutes', 5)?.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('picking', () => {
    it('picking an hour moves on to the minutes without firing mudChange', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-time-picker value="11:15" onMudChange={onChange}></mud-time-picker>);
      queryOption(root, 'hours', 13)?.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
      expect(queryOption(root, 'hours', 13)?.classList.contains('is-selected')).toBe(true);
      expect(queryOption(root, 'hours', 13)?.classList.contains('is-active')).toBe(false);
      expect(queryOption(root, 'minutes', 15)?.classList.contains('is-active')).toBe(true);
    });

    it('picking a minute completes the time and fires mudChange', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-time-picker onMudChange={onChange}></mud-time-picker>);
      queryOption(root, 'hours', 9)?.click();
      await flush();
      queryOption(root, 'minutes', 5)?.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: '09:05', hours: 9, minutes: 5 });
      expect((root as HTMLMudTimePickerElement).value).toBe('09:05');
    });

    it('a minute picked before any hour sends the user to the hours', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-time-picker onMudChange={onChange}></mud-time-picker>);
      queryOption(root, 'minutes', 30)?.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
      expect(queryOption(root, 'minutes', 30)?.classList.contains('is-selected')).toBe(true);
      queryOption(root, 'hours', 10)?.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
      queryOption(root, 'minutes', 30)?.click();
      await flush();
      expect(onChange.mock.calls[0][0].detail.value).toBe('10:30');
    });
  });

  describe('min / max', () => {
    it('disables hours with no selectable minute', async () => {
      const { root } = await render(<mud-time-picker min="09:30" max="17:00"></mud-time-picker>);
      expect(queryOption(root, 'hours', 8)?.getAttribute('aria-disabled')).toBe('true');
      expect(queryOption(root, 'hours', 9)?.getAttribute('aria-disabled')).toBeNull();
      expect(queryOption(root, 'hours', 17)?.getAttribute('aria-disabled')).toBeNull();
      expect(queryOption(root, 'hours', 18)?.getAttribute('aria-disabled')).toBe('true');
    });

    it('disables minutes outside the bounds for the chosen hour', async () => {
      const { root } = await render(<mud-time-picker value="09:45" min="09:30" max="17:00"></mud-time-picker>);
      expect(queryOption(root, 'minutes', 29)?.getAttribute('aria-disabled')).toBe('true');
      expect(queryOption(root, 'minutes', 30)?.getAttribute('aria-disabled')).toBeNull();
    });

    it('ignores clicks on disabled options', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-time-picker min="09:30" onMudChange={onChange}></mud-time-picker>);
      queryOption(root, 'hours', 8)?.click();
      await flush();
      expect(queryOption(root, 'hours', 8)?.classList.contains('is-selected')).toBe(false);
    });

    it('drops a pending minute that the new hour puts out of bounds', async () => {
      const { root } = await render(<mud-time-picker value="10:15" max="17:10"></mud-time-picker>);
      queryOption(root, 'hours', 17)?.click();
      await flush();
      expect(queryOption(root, 'minutes', 15)?.classList.contains('is-selected')).toBe(false);
      expect(queryOption(root, 'minutes', 15)?.getAttribute('aria-disabled')).toBe('true');
    });

    it('puts the tab stop on the first enabled option', async () => {
      const { root } = await render(<mud-time-picker min="09:30"></mud-time-picker>);
      expect(queryColumn(root, 'hours')?.querySelector('[tabindex="0"]')?.textContent).toBe('09');
    });
  });

  describe('keyboard', () => {
    it('ArrowDown / ArrowUp move the tab stop within a column, skipping disabled options', async () => {
      const { root } = await render(<mud-time-picker value="11:15" max="12:59"></mud-time-picker>);
      const ev = pressKey(root, queryOption(root, 'hours', 11), 'ArrowDown');
      await flush();
      expect(ev.defaultPrevented).toBe(true);
      expect(queryOption(root, 'hours', 12)?.getAttribute('tabindex')).toBe('0');
      pressKey(root, queryOption(root, 'hours', 12), 'ArrowDown');
      await flush();
      // 13 and later are past max: the stop stays on 12.
      expect(queryOption(root, 'hours', 12)?.getAttribute('tabindex')).toBe('0');
      pressKey(root, queryOption(root, 'hours', 12), 'ArrowUp');
      await flush();
      expect(queryOption(root, 'hours', 11)?.getAttribute('tabindex')).toBe('0');
    });

    it('Home / End jump to the ends of a column', async () => {
      const { root } = await render(<mud-time-picker value="11:15"></mud-time-picker>);
      pressKey(root, queryOption(root, 'minutes', 15), 'End');
      await flush();
      expect(queryOption(root, 'minutes', 59)?.getAttribute('tabindex')).toBe('0');
      pressKey(root, queryOption(root, 'minutes', 59), 'Home');
      await flush();
      expect(queryOption(root, 'minutes', 0)?.getAttribute('tabindex')).toBe('0');
    });

    it('ArrowRight / ArrowLeft switch the active column', async () => {
      const { root } = await render(<mud-time-picker value="11:15"></mud-time-picker>);
      pressKey(root, queryOption(root, 'hours', 11), 'ArrowRight');
      await flush();
      expect(queryOption(root, 'minutes', 15)?.classList.contains('is-active')).toBe(true);
      // ArrowRight in the minutes column is not handled.
      const ignored = pressKey(root, queryOption(root, 'minutes', 15), 'ArrowRight');
      expect(ignored.defaultPrevented).toBe(false);
      pressKey(root, queryOption(root, 'minutes', 15), 'ArrowLeft');
      await flush();
      expect(queryOption(root, 'hours', 11)?.classList.contains('is-active')).toBe(true);
    });

    it('Enter picks the focused option', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-time-picker value="11:15" onMudChange={onChange}></mud-time-picker>);
      pressKey(root, queryOption(root, 'minutes', 40), 'Enter');
      await flush();
      expect(onChange.mock.calls[0][0].detail.value).toBe('11:40');
    });

    it('ignores keys that do not come from an option', async () => {
      const { root } = await render(<mud-time-picker></mud-time-picker>);
      const ev = pressKey(root, root?.shadowRoot?.querySelector<HTMLElement>('.separator') ?? null, 'ArrowDown');
      expect(ev.defaultPrevented).toBe(false);
    });

    it('focusing an option makes its column the active one', async () => {
      const { root } = await render(<mud-time-picker value="11:15"></mud-time-picker>);
      queryOption(root, 'minutes', 20)?.dispatchEvent(new FocusEvent('focus'));
      await flush();
      expect(queryOption(root, 'minutes', 15)?.classList.contains('is-active')).toBe(true);
      expect(queryOption(root, 'minutes', 20)?.getAttribute('tabindex')).toBe('0');
    });
  });
});
