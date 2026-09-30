import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-radio-group';
import '../../mud-radio/mud-radio';

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const radiosOf = (root: Element | null | undefined): HTMLMudRadioElement[] =>
  Array.from(root?.querySelectorAll('mud-radio') ?? []) as HTMLMudRadioElement[];

const queryGroup = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('[role="radiogroup"]') ?? null) as HTMLElement | null;

const queryError = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.error') ?? null) as HTMLElement | null;

const press = (target: Element, key: string) => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
};

const threeOptions = (extra: { secondDisabled?: boolean } = {}) => [
  <mud-radio value="a" label="A"></mud-radio>,
  <mud-radio value="b" label="B" disabled={extra.secondDisabled ?? false}></mud-radio>,
  <mud-radio value="c" label="C"></mud-radio>,
];

describe('mud-radio-group', () => {
  describe('defaults + ARIA', () => {
    it('renders a radiogroup named by its visible label', async () => {
      const { root } = await render(<mud-radio-group label="Livrare">{threeOptions()}</mud-radio-group>);
      const group = queryGroup(root);
      const labelId = group?.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();
      expect(root?.shadowRoot?.getElementById(labelId ?? '')?.textContent).toBe('Livrare');
      expect(group?.hasAttribute('aria-label')).toBe(false);
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('orientation')).toBe('vertical');
    });

    it('names the radiogroup from the host aria-label when there is no label', async () => {
      const { root } = await render(<mud-radio-group aria-label="Livrare">{threeOptions()}</mud-radio-group>);
      await flush();
      const group = queryGroup(root);
      expect(group?.getAttribute('aria-label')).toBe('Livrare');
      expect(group?.hasAttribute('aria-labelledby')).toBe(false);
      expect(root?.shadowRoot?.querySelector('.label')).toBeNull();
    });

    it('exposes aria-required and aria-disabled on the radiogroup', async () => {
      const { root } = await render(
        <mud-radio-group label="L" required disabled>
          {threeOptions()}
        </mud-radio-group>,
      );
      const group = queryGroup(root);
      expect(group?.getAttribute('aria-required')).toBe('true');
      expect(group?.getAttribute('aria-disabled')).toBe('true');
    });

    it('warns and falls back on an unsupported size or orientation', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root, setProps } = await render(<mud-radio-group label="L">{threeOptions()}</mud-radio-group>);
      await setProps({ size: 'xl', orientation: 'diagonal' });
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('orientation')).toBe('vertical');
      expect(warn).toHaveBeenCalledTimes(2);
      warn.mockRestore();
    });
  });

  describe('props the group owns', () => {
    it('gives every radio one generated name when none is set', async () => {
      const { root } = await render(<mud-radio-group label="L">{threeOptions()}</mud-radio-group>);
      const names = new Set(radiosOf(root).map(radio => radio.name));
      expect(names.size).toBe(1);
      expect([...names][0]).toMatch(/^mud-radio-group-\d+$/);
    });

    it('gives every radio the group name and size', async () => {
      const { root, setProps } = await render(
        <mud-radio-group label="L" name="livrare">
          {threeOptions()}
        </mud-radio-group>,
      );
      await setProps({ size: 'sm' });
      expect(radiosOf(root).map(radio => radio.name)).toEqual(['livrare', 'livrare', 'livrare']);
      expect(radiosOf(root).map(radio => radio.size)).toEqual(['sm', 'sm', 'sm']);
    });

    it('disables every radio, then re-enables only the ones it disabled', async () => {
      const { root, setProps } = await render(
        <mud-radio-group label="L">{threeOptions({ secondDisabled: true })}</mud-radio-group>,
      );
      await setProps({ disabled: true });
      expect(radiosOf(root).map(radio => radio.disabled)).toEqual([true, true, true]);
      await setProps({ disabled: false });
      expect(radiosOf(root).map(radio => radio.disabled)).toEqual([false, true, false]);
    });

    it('marks every radio invalid and shows the error message under the options', async () => {
      const { root, setProps } = await render(
        <mud-radio-group label="L" error-text="Selectați o opțiune.">
          {threeOptions()}
        </mud-radio-group>,
      );
      expect(queryError(root)).toBeNull();
      await setProps({ invalid: true });
      const error = queryError(root);
      expect(radiosOf(root).every(radio => radio.invalid)).toBe(true);
      expect(error?.tagName.toLowerCase()).toBe('mud-inline-message');
      expect(error?.getAttribute('variant')).toBe('error');
      expect(error?.getAttribute('size')).toBe('small');
      expect(error?.textContent).toBe('Selectați o opțiune.');
      const group = queryGroup(root);
      expect(group?.getAttribute('aria-invalid')).toBe('true');
      expect(group?.getAttribute('aria-describedby')).toBe(error?.id);
      await setProps({ invalid: false });
      expect(radiosOf(root).some(radio => radio.invalid)).toBe(false);
      expect(queryError(root)).toBeNull();
    });

    it('shows no message for a whitespace-only error-text', async () => {
      const { root } = await render(
        <mud-radio-group label="L" invalid error-text="  ">
          {threeOptions()}
        </mud-radio-group>,
      );
      expect(queryError(root)).toBeNull();
      expect(queryGroup(root)?.hasAttribute('aria-describedby')).toBe(false);
    });

    it('names a radio slotted in after load', async () => {
      const { root } = await render(
        <mud-radio-group label="L" name="livrare">
          {threeOptions()}
        </mud-radio-group>,
      );
      const late = document.createElement('mud-radio');
      late.setAttribute('value', 'd');
      root?.appendChild(late);
      (root?.shadowRoot?.querySelector('slot') as HTMLSlotElement).dispatchEvent(new Event('slotchange'));
      await flush();
      expect((late as HTMLMudRadioElement).name).toBe('livrare');
    });
  });

  describe('value', () => {
    it('reads its value from the radio checked in the markup', async () => {
      const { root } = await render(
        <mud-radio-group label="L">
          <mud-radio value="a" label="A"></mud-radio>
          <mud-radio value="b" label="B" checked></mud-radio>
        </mud-radio-group>,
      );
      expect((root as HTMLMudRadioGroupElement).value).toBe('b');
    });

    it('selects the radio whose value it is given, and clears the selection for an unknown value', async () => {
      const { root, setProps } = await render(
        <mud-radio-group label="L" value="c">
          {threeOptions()}
        </mud-radio-group>,
      );
      expect(radiosOf(root).map(radio => radio.checked)).toEqual([false, false, true]);
      await setProps({ value: 'a' });
      expect(radiosOf(root).map(radio => radio.checked)).toEqual([true, false, false]);
      await setProps({ value: 'zzz' });
      expect(radiosOf(root).map(radio => radio.checked)).toEqual([false, false, false]);
    });
  });

  describe('one Tab stop', () => {
    it('is the first enabled radio when nothing is selected', async () => {
      const { root } = await render(
        <mud-radio-group label="L">
          <mud-radio value="a" label="A" disabled></mud-radio>
          <mud-radio value="b" label="B"></mud-radio>
          <mud-radio value="c" label="C"></mud-radio>
        </mud-radio-group>,
      );
      expect(radiosOf(root).map(radio => radio.getAttribute('tabindex'))).toEqual(['-1', null, '-1']);
    });

    it('is the selected radio', async () => {
      const { root } = await render(
        <mud-radio-group label="L" value="c">
          {threeOptions()}
        </mud-radio-group>,
      );
      expect(radiosOf(root).map(radio => radio.getAttribute('tabindex'))).toEqual(['-1', '-1', null]);
    });
  });

  describe('keyboard', () => {
    it('ArrowDown selects the next enabled radio, skipping a disabled one, and emits mudChange once', async () => {
      const { root } = await render(
        <mud-radio-group label="L" value="a">
          {threeOptions({ secondDisabled: true })}
        </mud-radio-group>,
      );
      const spy = vi.fn();
      root?.addEventListener('mudChange', spy);
      const [a, , c] = radiosOf(root);
      const ev = press(a, 'ArrowDown');
      await flush();
      expect(ev.defaultPrevented).toBe(true);
      expect(c.checked).toBe(true);
      expect(a.checked).toBe(false);
      expect((root as HTMLMudRadioGroupElement).value).toBe('c');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail).toEqual({ value: 'c' });
    });

    it('ArrowRight / ArrowUp / ArrowLeft move the selection and wrap at the ends', async () => {
      const { root } = await render(
        <mud-radio-group label="L" value="a" orientation="horizontal">
          {threeOptions()}
        </mud-radio-group>,
      );
      const [a, b, c] = radiosOf(root);
      press(a, 'ArrowUp');
      await flush();
      expect(c.checked).toBe(true);
      press(c, 'ArrowRight');
      await flush();
      expect(a.checked).toBe(true);
      press(a, 'ArrowRight');
      await flush();
      expect(b.checked).toBe(true);
      press(b, 'ArrowLeft');
      await flush();
      expect(a.checked).toBe(true);
    });

    it('ignores other keys and keys from outside a radio', async () => {
      const { root } = await render(
        <mud-radio-group label="L" value="a">
          {threeOptions()}
        </mud-radio-group>,
      );
      const [a] = radiosOf(root);
      expect(press(a, 'Enter').defaultPrevented).toBe(false);
      expect(press(root as Element, 'ArrowDown').defaultPrevented).toBe(false);
      expect((root as HTMLMudRadioGroupElement).value).toBe('a');
    });
  });

  describe('pointer selection', () => {
    it('turns a radio mudChange into one group mudChange and keeps the radio event inside', async () => {
      const { root } = await render(
        <mud-radio-group label="L" value="a">
          {threeOptions()}
        </mud-radio-group>,
      );
      const spy = vi.fn();
      root?.addEventListener('mudChange', spy);
      const [, b] = radiosOf(root);
      // In the browser the radio's event reaches the `.options` listener
      // through the slot, target still the radio; the story's play function
      // covers that path. Here the handler gets the same event directly.
      const ev = new CustomEvent('mudChange', { detail: { checked: true, value: 'b' }, bubbles: true, composed: true });
      Object.defineProperty(ev, 'target', { value: b });
      const stop = vi.spyOn(ev, 'stopPropagation');
      b.checked = true;
      (root as unknown as { handleRadioChange: (ev: Event) => void }).handleRadioChange(ev);
      await flush();
      expect(stop).toHaveBeenCalled();
      expect((root as HTMLMudRadioGroupElement).value).toBe('b');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail).toEqual({ value: 'b' });
    });

    it('ignores a radio mudChange that does not select it', async () => {
      const { root } = await render(
        <mud-radio-group label="L" value="a">
          {threeOptions()}
        </mud-radio-group>,
      );
      const [, b] = radiosOf(root);
      const ev = new CustomEvent('mudChange', { detail: { checked: false, value: 'b' } });
      Object.defineProperty(ev, 'target', { value: b });
      (root as unknown as { handleRadioChange: (ev: Event) => void }).handleRadioChange(ev);
      expect((root as HTMLMudRadioGroupElement).value).toBe('a');
    });
  });
});
