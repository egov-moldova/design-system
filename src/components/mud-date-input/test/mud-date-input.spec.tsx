import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-date-input';
import '../../mud-date-picker/mud-date-picker';

import { DATE_INPUT_FORMATS, DATE_INPUT_SIZES, DATE_INPUT_VARIANTS } from '../mud-date-input.types';

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryLabel = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('label.label') ?? null) as HTMLElement | null;

const queryAssistive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.assistive') ?? null) as HTMLElement | null;

const queryTrailingIcon = (root: Element | null | undefined): Element | null =>
  root?.shadowRoot?.querySelector('.trailing-icon mud-icon') ?? null;

const queryClearButton = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.clear-button') ?? null) as HTMLButtonElement | null;

const queryGhostRemaining = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.ghost-remaining') ?? null) as HTMLElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('mud-date-input', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-date-input label="Birthday"></mud-date-input>);
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('format')).toBe('DD/MM/YYYY');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('readonly')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
    });

    it.each(DATE_INPUT_VARIANTS)('reflects variant="%s" to host', async variant => {
      const { root } = await render(<mud-date-input variant={variant} label="x"></mud-date-input>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it.each(DATE_INPUT_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<mud-date-input size={size} label="x"></mud-date-input>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it.each(DATE_INPUT_FORMATS)('reflects format="%s" to host', async format => {
      const { root } = await render(<mud-date-input format={format} label="x"></mud-date-input>);
      expect(root?.getAttribute('format')).toBe(format);
    });

    it('warns and falls back when variant is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      (root as unknown as { variant: string }).variant = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="bogus"'));
      expect(root?.getAttribute('variant')).toBe('default');
      warn.mockRestore();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });

    it('warns and falls back when format is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      (root as unknown as { format: string }).format = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('format="bogus"'));
      expect(root?.getAttribute('format')).toBe('DD/MM/YYYY');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders an internal <input> inside shadow DOM', async () => {
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      const native = queryNative(root);
      expect(native).toBeTruthy();
      expect(native?.tagName).toBe('INPUT');
      expect(native?.getAttribute('inputmode')).toBe('numeric');
      expect(native?.getAttribute('autocomplete')).toBe('off');
    });

    it('renders a trailing calendar icon', async () => {
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      const icon = queryTrailingIcon(root);
      expect(icon).toBeTruthy();
      expect(icon?.getAttribute('name')).toBe('calendar');
      // md size → 20px icon
      expect(icon?.getAttribute('size')).toBe('20');
    });

    it('uses a 24px calendar icon for size="lg"', async () => {
      const { root } = await render(<mud-date-input size="lg" label="x"></mud-date-input>);
      const icon = queryTrailingIcon(root);
      expect(icon?.getAttribute('size')).toBe('24');
    });

    it('renders the label text via `label` prop', async () => {
      const { root } = await render(<mud-date-input label="Birthday"></mud-date-input>);
      const label = queryLabel(root);
      expect(label?.textContent).toContain('Birthday');
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<mud-date-input label="x" required></mud-date-input>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeTruthy();
      // Figma draws the mark as the 12/asterisk icon (2975:10179). mud-icon's
      // smallest rung is 16; the stylesheet shrinks its box to the 12px mark.
      const icon = mark?.querySelector('mud-icon');
      expect(icon?.getAttribute('name')).toBe('asterisk');
      expect(icon?.getAttribute('size')).toBe('16');
    });

    it('omits the required mark when `required` is unset', async () => {
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeNull();
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(<mud-date-input label="x" helper-text="Pick a date"></mud-date-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('Pick a date');
    });

    it('renders an error assistive row with the error icon when invalid + error-text', async () => {
      const { root } = await render(
        <mud-date-input label="x" invalid error-text="Day must be between 01 and 31"></mud-date-input>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-error')).toBe(true);
      expect(assistive?.textContent).toContain('Day must be between 01 and 31');
      const icon = assistive?.querySelector('mud-icon');
      expect(icon?.getAttribute('name')).toBe('circle-error');
    });

    it('error message takes priority over helper text', async () => {
      const { root } = await render(
        <mud-date-input label="x" invalid helper-text="Hint" error-text="Required"></mud-date-input>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.textContent).toContain('Required');
      expect(assistive?.textContent).not.toContain('Hint');
    });

    it('omits the ghost overlay when the value is empty (native placeholder takes over)', async () => {
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      const ghost = queryGhostRemaining(root);
      expect(ghost).toBe(null);
      // The native input still exposes the same hint via its placeholder attribute,
      // so the visual cue is preserved without an overlapping ghost element.
      const input = root?.shadowRoot?.querySelector('input');
      expect(input?.getAttribute('placeholder')).toBe('DD/MM/YYYY');
    });

    it('shows the ghost remaining hint only while the input is focused (partial value)', async () => {
      const { root, waitForChanges } = await render(<mud-date-input label="x" value="15/04/"></mud-date-input>);
      // Unfocused — ghost is suppressed to avoid axe's `bgOverlap` false-positive
      // on a transient state. The native `placeholder` carries the format to AT.
      expect(queryGhostRemaining(root)).toBe(null);
      // Focus the native input to surface the ghost.
      const native = root?.shadowRoot?.querySelector<HTMLInputElement>('input');
      native?.dispatchEvent(new FocusEvent('focus'));
      await waitForChanges();
      // After `15/04/` the remaining hint should only be `YYYY`.
      expect(queryGhostRemaining(root)?.textContent).toBe('YYYY');
    });

    it('omits the ghost overlay when the value is fully populated', async () => {
      const { root } = await render(<mud-date-input label="x" value="15/04/2025"></mud-date-input>);
      const ghost = queryGhostRemaining(root);
      expect(ghost).toBe(null);
    });
  });

  describe('value + form association', () => {
    it('reflects value to the host attribute', async () => {
      const { root } = await render(<mud-date-input label="x" value="15/04/2025"></mud-date-input>);
      expect(root?.getAttribute('value')).toBe('15/04/2025');
      expect(queryNative(root)?.value).toBe('15/04/2025');
    });

    it('emits mudInput on each keystroke with masked value + segment + iso', async () => {
      const onInput = vi.fn();
      const { root } = await render(<mud-date-input label="x" onMudInput={onInput}></mud-date-input>);
      const native = queryNative(root)!;
      native.value = '15';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(onInput).toHaveBeenCalledTimes(1);
      const detail = onInput.mock.calls[0][0].detail;
      // A completed, valid DD gets its separator so the caret jumps to MM (Figma 487:7841).
      expect(detail.value).toBe('15/');
      expect(detail.isoValue).toBeNull();
      expect(detail.error).toBeNull();
      expect(detail.segment).toBe('MM');
    });

    it('does not re-add the separator while deleting', async () => {
      const { root } = await render(<mud-date-input label="x" value="15/"></mud-date-input>);
      const native = queryNative(root)!;
      native.value = '15';
      // mock-doc has no InputEvent constructor; the component only reads `inputType`.
      const deletion = new Event('input', { bubbles: true });
      Object.defineProperty(deletion, 'inputType', { value: 'deleteContentBackward' });
      native.dispatchEvent(deletion);
      await flush();
      expect(native.value).toBe('15');
    });

    it('keeps the caret in an invalid segment instead of jumping past it', async () => {
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      const native = queryNative(root)!;
      native.value = '45';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      // Figma 489:8104 shows `45|/MM/YYYY` — no separator after an invalid day.
      expect(native.value).toBe('45');
    });

    it('formats raw digit input by inserting separators inline', async () => {
      const onInput = vi.fn();
      const { root } = await render(<mud-date-input label="x" onMudInput={onInput}></mud-date-input>);
      const native = queryNative(root)!;
      // Simulate paste of `15042025` — the formatter should rewrite to `15/04/2025`.
      native.value = '15042025';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(native.value).toBe('15/04/2025');
      const detail = onInput.mock.calls[0][0].detail;
      expect(detail.value).toBe('15/04/2025');
      expect(detail.isoValue).toBe('2025-04-15');
    });

    it('strips non-digit characters from input', async () => {
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      const native = queryNative(root)!;
      native.value = 'ab1c5';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      expect(native.value).toBe('15/');
    });

    it('emits mudChange on change (blur) with iso payload when valid', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-date-input label="x" value="15/04/2025" onMudChange={onChange}></mud-date-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: '15/04/2025', isoValue: '2025-04-15', error: null });
    });

    it('emits mudChange with isoValue=null when value is incomplete', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-date-input label="x" value="15/04/" onMudChange={onChange}></mud-date-input>);
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: '15/04/', isoValue: null, error: null });
    });

    it('emits mudChange with isoValue=null when the calendar date is impossible', async () => {
      // 31/02 doesn't exist — toIsoValue should reject.
      const onChange = vi.fn();
      const { root } = await render(
        <mud-date-input label="x" value="31/02/2025" onMudChange={onChange}></mud-date-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail.isoValue).toBeNull();
    });

    it('emits mudFocus and mudBlur and toggles the is-focused class', async () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const { root } = await render(
        <mud-date-input label="x" onMudFocus={onFocus} onMudBlur={onBlur}></mud-date-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new FocusEvent('focus'));
      await flush();
      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(root?.classList.contains('is-focused')).toBe(true);
      native.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(onBlur).toHaveBeenCalledTimes(1);
      expect(root?.classList.contains('is-focused')).toBe(false);
    });
  });

  describe('format variations', () => {
    it('formats MM/DD/YYYY correctly', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-date-input label="x" format="MM/DD/YYYY" value="04/15/2025" onMudChange={onChange}></mud-date-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail.isoValue).toBe('2025-04-15');
    });

    it('formats YYYY-MM-DD correctly', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-date-input label="x" format="YYYY-MM-DD" value="2025-04-15" onMudChange={onChange}></mud-date-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail.isoValue).toBe('2025-04-15');
    });

    it('uses the format pattern as the default placeholder', async () => {
      const { root: rootDmy } = await render(<mud-date-input label="x"></mud-date-input>);
      expect(queryNative(rootDmy)?.getAttribute('placeholder')).toBe('DD/MM/YYYY');
      const { root: rootIso } = await render(<mud-date-input label="x" format="YYYY-MM-DD"></mud-date-input>);
      expect(queryNative(rootIso)?.getAttribute('placeholder')).toBe('YYYY-MM-DD');
    });
  });

  describe('min / max bounds', () => {
    it('returns null isoValue when the value falls below min', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-date-input label="x" value="15/04/2025" min="2025-05-01" onMudChange={onChange}></mud-date-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail.isoValue).toBeNull();
    });

    it('returns null isoValue when the value rises above max', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-date-input label="x" value="15/04/2025" max="2025-03-31" onMudChange={onChange}></mud-date-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail.isoValue).toBeNull();
    });

    it('returns iso when value sits within bounds', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-date-input
          label="x"
          value="15/04/2025"
          min="2025-01-01"
          max="2025-12-31"
          onMudChange={onChange}
        ></mud-date-input>,
      );
      const native = queryNative(root)!;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail.isoValue).toBe('2025-04-15');
    });
  });

  describe('segment validation (Figma 489:8090)', () => {
    it.each([
      ['45/', 'day', 'Ziua trebuie să fie între 01 și 31'],
      ['15/18/', 'month', 'Luna trebuie să fie între 01 și 12'],
      ['15/04/1550', 'year', 'Introduceți un an valid'],
      ['31/02/2025', 'date', 'Introduceți o dată validă'],
    ])('flags %s as a %s error with its message', async (value, error, message) => {
      const onChange = vi.fn();
      const { root } = await render(<mud-date-input label="x" value={value} onMudChange={onChange}></mud-date-input>);
      expect(root?.classList.contains('is-invalid')).toBe(true);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
      expect(queryAssistive(root)?.textContent).toContain(message);
      queryNative(root)!.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail.error).toBe(error);
    });

    it('flags a real date outside min / max as a range error', async () => {
      const { root } = await render(
        <mud-date-input label="x" value="15/04/2025" min="2025-05-01" max="2026-12-31"></mud-date-input>,
      );
      expect(queryAssistive(root)?.textContent).toContain('Data este în afara intervalului permis');
    });

    it('accepts overriding the built-in message', async () => {
      const { root } = await render(
        <mud-date-input label="x" value="45/" day-error-text="Day must be between 01 and 31"></mud-date-input>,
      );
      expect(queryAssistive(root)?.textContent).toContain('Day must be between 01 and 31');
    });

    it('lets the consumer error text win while `invalid` is set', async () => {
      const { root } = await render(
        <mud-date-input label="x" value="45/" invalid error-text="Custom"></mud-date-input>,
      );
      expect(queryAssistive(root)?.textContent).toContain('Custom');
    });

    it('does not flag incomplete segments', async () => {
      const { root } = await render(<mud-date-input label="x" value="4"></mud-date-input>);
      expect(root?.classList.contains('is-invalid')).toBe(false);
      expect(queryAssistive(root)).toBeNull();
    });

    it('clears the error once the value becomes valid', async () => {
      const { root, waitForChanges } = await render(<mud-date-input label="x" value="45/"></mud-date-input>);
      (root as unknown as { value: string }).value = '15/04/2025';
      await waitForChanges();
      expect(root?.classList.contains('is-invalid')).toBe(false);
      expect(queryAssistive(root)).toBeNull();
    });
  });

  describe('disabled + readonly behavior', () => {
    it('passes disabled through to the native input', async () => {
      const { root } = await render(<mud-date-input label="x" disabled></mud-date-input>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(true);
      expect(native?.getAttribute('aria-disabled')).toBe('true');
    });

    it('passes readonly through to the native input', async () => {
      const { root } = await render(<mud-date-input label="x" readonly value="15/04/2025"></mud-date-input>);
      const native = queryNative(root);
      expect(native?.readOnly).toBe(true);
    });

    it('does not open the calendar while readonly', async () => {
      const { root } = await render(<mud-date-input label="x" readonly value="15/04/2025"></mud-date-input>);
      const trigger = root?.shadowRoot?.querySelector<HTMLButtonElement>('.trailing-icon');
      expect(trigger?.hasAttribute('disabled')).toBe(true);
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeNull();
    });

    it('responds to fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      const native = queryNative(root);
      expect(native?.disabled).toBe(false);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryNative(root)?.disabled).toBe(true);
    });
  });

  describe('ARIA contract', () => {
    it('links the label via aria-labelledby', async () => {
      const { root } = await render(<mud-date-input label="Birthday"></mud-date-input>);
      const native = queryNative(root);
      const label = queryLabel(root);
      const id = native?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(label?.id).toBe(id);
    });

    it('exposes aria-required when required', async () => {
      const { root } = await render(<mud-date-input label="x" required></mud-date-input>);
      expect(queryNative(root)?.getAttribute('aria-required')).toBe('true');
    });

    it('exposes aria-invalid when invalid', async () => {
      const { root } = await render(<mud-date-input label="x" invalid></mud-date-input>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('wires aria-describedby to the helper id when helper-text present', async () => {
      const { root } = await render(<mud-date-input label="x" helper-text="hint"></mud-date-input>);
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(describedBy).toBeTruthy();
      expect(helper?.id).toBe(describedBy);
    });

    it('wires aria-describedby to the error id when invalid + error-text present', async () => {
      const { root } = await render(<mud-date-input label="x" invalid error-text="Required"></mud-date-input>);
      const describedBy = queryNative(root)?.getAttribute('aria-describedby');
      const error = root?.shadowRoot?.querySelector('.assistive-error');
      expect(describedBy).toBeTruthy();
      expect(error?.id).toBe(describedBy);
    });

    it('uses aria-label as the accessible name when no visible label is present', async () => {
      const { root } = await render(<mud-date-input aria-label="Birthday"></mud-date-input>);
      const native = queryNative(root);
      expect(native?.getAttribute('aria-label')).toBe('Birthday');
      expect(native?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('exposes the format pattern via aria-placeholder', async () => {
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      expect(queryNative(root)?.getAttribute('aria-placeholder')).toBe('DD/MM/YYYY');
    });

    it('trailing calendar icon is a labeled interactive button that opens the popover picker', async () => {
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      const trigger = root?.shadowRoot?.querySelector<HTMLButtonElement>('.trailing-icon');
      expect(trigger?.tagName.toLowerCase()).toBe('button');
      // It must NOT be aria-hidden — it's interactive and exposed to AT.
      expect(trigger?.getAttribute('aria-hidden')).toBe(null);
      expect(trigger?.getAttribute('aria-label')).toBeTruthy();
      expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog');
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('clear button (Figma clearButton axis)', () => {
    it('is hidden by default even with a value (clearable defaults to false)', async () => {
      const { root } = await render(<mud-date-input value="15/04/2025" label="x"></mud-date-input>);
      expect(queryClearButton(root)).toBeNull();
    });

    it('reflects the clearable attribute on the host', async () => {
      const { root } = await render(<mud-date-input clearable label="x"></mud-date-input>);
      expect(root?.hasAttribute('clearable')).toBe(true);
    });

    it('appears when clearable and the field has a value', async () => {
      const { root } = await render(<mud-date-input clearable value="15/04/2025" label="x"></mud-date-input>);
      expect(queryClearButton(root)).not.toBeNull();
    });

    it('stays hidden when clearable but the field is empty', async () => {
      const { root } = await render(<mud-date-input clearable label="x"></mud-date-input>);
      expect(queryClearButton(root)).toBeNull();
    });

    it('stays hidden when readonly, even with a value', async () => {
      const { root } = await render(<mud-date-input clearable readonly value="15/04/2025" label="x"></mud-date-input>);
      expect(queryClearButton(root)).toBeNull();
    });

    it('stays hidden when disabled, even with a value', async () => {
      const { root } = await render(<mud-date-input clearable disabled value="15/04/2025" label="x"></mud-date-input>);
      expect(queryClearButton(root)).toBeNull();
    });

    it('clears the value and emits mudClear + mudChange + mudInput on click', async () => {
      const onClear = vi.fn();
      const onChange = vi.fn();
      const onInput = vi.fn();
      const { root } = await render(
        <mud-date-input
          clearable
          value="15/04/2025"
          label="x"
          onMudClear={onClear}
          onMudChange={onChange}
          onMudInput={onInput}
        ></mud-date-input>,
      );
      queryClearButton(root)!.click();
      await flush();
      expect((root as unknown as { value: string }).value).toBe('');
      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onInput).toHaveBeenCalledTimes(1);
    });

    it('clear button is tabindex=-1 (reached programmatically, not via Tab)', async () => {
      const { root } = await render(<mud-date-input clearable value="15/04/2025" label="x"></mud-date-input>);
      expect(queryClearButton(root)?.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('responsive breakpoint', () => {
    const openPicker = async (root: Element | null | undefined) => {
      root?.shadowRoot?.querySelector<HTMLButtonElement>('.trailing-icon')?.click();
      await new Promise<void>(r => setTimeout(r, 0));
    };

    it('breakpoint="auto" resolves to the bottom sheet when the viewport matches mobile', async () => {
      // jsdom has no matchMedia — stub it to report a mobile viewport so the
      // `auto` default resolves to the bottom sheet (mirrors a 375px viewport).
      const original = window.matchMedia;
      window.matchMedia = ((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })) as typeof window.matchMedia;
      try {
        const { root } = await render(<mud-date-input label="x"></mud-date-input>);
        await openPicker(root);
        const popover = root?.shadowRoot?.querySelector('.picker-popover');
        expect(popover?.classList.contains('is-mobile')).toBe(true);
        expect(root?.shadowRoot?.querySelector('mud-date-picker')?.getAttribute('breakpoint')).toBe('mobile');
      } finally {
        window.matchMedia = original;
      }
    });

    it('opens a desktop dropdown (no backdrop) when breakpoint="desktop"', async () => {
      const { root } = await render(<mud-date-input label="x" breakpoint="desktop"></mud-date-input>);
      await openPicker(root);
      const popover = root?.shadowRoot?.querySelector('.picker-popover');
      expect(popover).toBeTruthy();
      expect(popover?.classList.contains('is-mobile')).toBe(false);
      expect(root?.shadowRoot?.querySelector('.picker-backdrop')).toBeNull();
      expect(root?.shadowRoot?.querySelector('mud-date-picker')?.getAttribute('breakpoint')).toBe('desktop');
    });

    it('opens a full-width bottom sheet with a backdrop when breakpoint="mobile"', async () => {
      const { root } = await render(<mud-date-input label="x" breakpoint="mobile"></mud-date-input>);
      await openPicker(root);
      const popover = root?.shadowRoot?.querySelector('.picker-popover');
      expect(popover?.classList.contains('is-mobile')).toBe(true);
      expect(popover?.getAttribute('aria-modal')).toBe('true');
      expect(root?.shadowRoot?.querySelector('.picker-backdrop')).toBeTruthy();
      expect(root?.shadowRoot?.querySelector('mud-date-picker')?.getAttribute('breakpoint')).toBe('mobile');
    });

    it('names the calendar dialog', async () => {
      const { root } = await render(<mud-date-input label="x" breakpoint="desktop"></mud-date-input>);
      await openPicker(root);
      expect(root?.shadowRoot?.querySelector('.picker-popover')?.getAttribute('aria-label')).toBe('Selectează data');
    });

    it('anchors the popover inside the field row, not below the assistive text', async () => {
      const { root } = await render(
        <mud-date-input label="x" breakpoint="desktop" helper-text="hint"></mud-date-input>,
      );
      await openPicker(root);
      expect(root?.shadowRoot?.querySelector('.control > .picker-popover')).toBeTruthy();
    });

    it('stops the inner picker mudChange so consumers get one event with the display value', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-date-input label="x" breakpoint="desktop" onMudChange={onChange}></mud-date-input>,
      );
      await openPicker(root);
      const picker = root?.shadowRoot?.querySelector('mud-date-picker');
      picker?.dispatchEvent(
        new CustomEvent('mudChange', { detail: { value: '2025-04-15' }, bubbles: true, composed: true }),
      );
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: '15/04/2025', isoValue: '2025-04-15', error: null });
    });

    it('locks page scroll while the bottom sheet is open and restores it on close', async () => {
      const { root } = await render(<mud-date-input label="x" breakpoint="mobile"></mud-date-input>);
      await openPicker(root);
      expect(document.body.style.overflow).toBe('hidden');
      root?.shadowRoot?.querySelector<HTMLElement>('.picker-backdrop')?.click();
      await new Promise<void>(r => setTimeout(r, 0));
      expect(document.body.style.overflow).toBe('');
    });

    it('tapping the backdrop dismisses the bottom sheet', async () => {
      const { root } = await render(<mud-date-input label="x" breakpoint="mobile"></mud-date-input>);
      await openPicker(root);
      root?.shadowRoot?.querySelector<HTMLElement>('.picker-backdrop')?.click();
      await new Promise<void>(r => setTimeout(r, 0));
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeNull();
    });
  });

  describe('type (Figma Types 470:32035: default / advanced / date-range)', () => {
    const open = async (root: Element | null | undefined) => {
      root?.shadowRoot?.querySelector<HTMLButtonElement>('.trailing-icon')?.click();
      await flush();
      return root?.shadowRoot?.querySelector('mud-date-picker') as HTMLMudDatePickerElement | null;
    };

    it('defaults to type="default": one date, calendar with the title header', async () => {
      const { root } = await render(<mud-date-input label="x" breakpoint="desktop"></mud-date-input>);
      expect(root?.getAttribute('type')).toBe('default');
      const picker = await open(root);
      expect(picker?.headerStyle).toBe('title');
      expect(picker?.mode).toBe('single');
    });

    it('type="advanced" opens the calendar with the month and year chips', async () => {
      const { root } = await render(<mud-date-input label="x" breakpoint="desktop" type="advanced"></mud-date-input>);
      const picker = await open(root);
      expect(picker?.headerStyle).toBe('dropdown');
      expect(picker?.mode).toBe('single');
    });

    it('type="date-range" opens the range calendar with the title header', async () => {
      const { root } = await render(<mud-date-input label="x" breakpoint="desktop" type="date-range"></mud-date-input>);
      const picker = await open(root);
      expect(picker?.headerStyle).toBe('title');
      expect(picker?.mode).toBe('range');
    });

    it('keeps the chips on the mobile bottom sheet for every type', async () => {
      const { root } = await render(<mud-date-input label="x" breakpoint="mobile" type="default"></mud-date-input>);
      expect((await open(root))?.headerStyle).toBe('dropdown');
    });

    it('falls back to default for an unsupported type', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-date-input label="x"></mud-date-input>);
      (root as HTMLMudDateInputElement).type = 'range' as unknown as 'default';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('type="range" is not supported'));
      expect(root?.getAttribute('type')).toBe('default');
      warn.mockRestore();
    });
  });

  describe('type="date-range" (Figma Types → date-range, 483:5705)', () => {
    const type = async (root: Element | null | undefined, raw: string) => {
      const native = queryNative(root)!;
      native.value = raw;
      native.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
      return native;
    };
    const openPicker = async (root: Element | null | undefined) => {
      root?.shadowRoot?.querySelector<HTMLButtonElement>('.trailing-icon')?.click();
      await flush();
    };
    const pickRange = (root: Element | null | undefined, rangeStart: string, rangeEnd?: string) => {
      root?.shadowRoot?.querySelector('mud-date-picker')?.dispatchEvent(
        new CustomEvent('mudChange', {
          detail: { value: rangeEnd ? [rangeStart, rangeEnd] : [rangeStart], rangeStart, rangeEnd },
          bubbles: true,
          composed: true,
        }),
      );
      return flush();
    };

    it('shows the two-date pattern as placeholder', async () => {
      const { root } = await render(<mud-date-input label="x" type="date-range"></mud-date-input>);
      const native = queryNative(root)!;
      expect(native.getAttribute('placeholder')).toBe('DD/MM/YYYY - DD/MM/YYYY');
      expect(native.maxLength).toBe(23);
    });

    it('writes the range separator once the first date is complete', async () => {
      const { root } = await render(<mud-date-input label="x" type="date-range"></mud-date-input>);
      const native = await type(root, '18012025');
      expect(native.value).toBe('18/01/2025 - ');
      await type(root, '1801202522012025');
      expect(native.value).toBe('18/01/2025 - 22/01/2025');
    });

    it('pads a part-typed day of the second date on "/"', async () => {
      const { root } = await render(<mud-date-input label="x" type="date-range"></mud-date-input>);
      const native = await type(root, '180120253');
      expect(native.value).toBe('18/01/2025 - 3');
      // mock-doc does not route KeyboardEvents through JSX listeners: call the
      // handler with an event targeting the field (as the banner spec does).
      const ev = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'target', { value: native });
      (root as unknown as { handleKeyDown: (e: KeyboardEvent) => void }).handleKeyDown(ev);
      await flush();
      expect(native.value).toBe('18/01/2025 - 03/');
      expect(ev.defaultPrevented).toBe(true);
    });

    it('never pads the year of the first date', async () => {
      const { root } = await render(<mud-date-input label="x" type="date-range"></mud-date-input>);
      const native = await type(root, '1801202');
      const ev = new KeyboardEvent('keydown', { key: '-', bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'target', { value: native });
      (root as unknown as { handleKeyDown: (e: KeyboardEvent) => void }).handleKeyDown(ev);
      expect(native.value).toBe('18/01/202');
      expect(ev.defaultPrevented).toBe(false);
    });

    it('reports the segment under the caret in the second date', async () => {
      const onInput = vi.fn();
      const { root } = await render(<mud-date-input label="x" type="date-range" onMudInput={onInput}></mud-date-input>);
      await type(root, '1801202522');
      expect(onInput.mock.calls.at(-1)?.[0].detail.segment).toBe('MM');
    });

    it('emits the ISO interval with isoStart / isoEnd once both dates are valid', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-date-input
          label="x"
          type="date-range"
          value="18/01/2025 - 22/01/2025"
          onMudChange={onChange}
        ></mud-date-input>,
      );
      queryNative(root)!.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail).toEqual({
        value: '18/01/2025 - 22/01/2025',
        isoValue: '2025-01-18/2025-01-22',
        isoStart: '2025-01-18',
        isoEnd: '2025-01-22',
        error: null,
      });
    });

    it('keeps isoValue null while only the start is complete', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-date-input label="x" type="date-range" value="18/01/2025 - 2" onMudChange={onChange}></mud-date-input>,
      );
      queryNative(root)!.dispatchEvent(new Event('change', { bubbles: true }));
      await flush();
      expect(onChange.mock.calls[0][0].detail).toEqual({
        value: '18/01/2025 - 2',
        isoValue: null,
        isoStart: '2025-01-18',
        isoEnd: null,
        error: null,
      });
    });

    it('flags an end date before the start with the order error', async () => {
      const { root } = await render(
        <mud-date-input label="x" type="date-range" value="22/01/2025 - 18/01/2025"></mud-date-input>,
      );
      await flush();
      expect(root?.classList.contains('is-invalid')).toBe(true);
      expect(queryAssistive(root)?.textContent).toContain('Data de sfârșit trebuie să fie după data de început');
    });

    it('uses order-error-text when set', async () => {
      const { root } = await render(
        <mud-date-input
          label="x"
          type="date-range"
          value="22/01/2025 - 18/01/2025"
          order-error-text="End before start"
        ></mud-date-input>,
      );
      await flush();
      expect(queryAssistive(root)?.textContent).toContain('End before start');
    });

    it('validates each date on its own: an impossible end date is a date error', async () => {
      const { root } = await render(
        <mud-date-input label="x" type="date-range" value="18/01/2025 - 31/02/2025"></mud-date-input>,
      );
      await flush();
      expect(queryAssistive(root)?.textContent).toContain('Introduceți o dată validă');
    });

    it('applies min / max to both dates', async () => {
      const { root } = await render(
        <mud-date-input label="x" type="date-range" max="2025-01-20" value="18/01/2025 - 22/01/2025"></mud-date-input>,
      );
      await flush();
      expect(queryAssistive(root)?.textContent).toContain('Data este în afara intervalului permis');
    });

    it('opens the calendar in range mode with the typed dates', async () => {
      const { root } = await render(
        <mud-date-input
          label="x"
          type="date-range"
          breakpoint="desktop"
          value="18/01/2025 - 22/01/2025"
        ></mud-date-input>,
      );
      await openPicker(root);
      const picker = root?.shadowRoot?.querySelector('mud-date-picker') as HTMLMudDatePickerElement | null;
      expect(picker?.mode).toBe('range');
      expect(picker?.rangeStart).toBe('2025-01-18');
      expect(picker?.rangeEnd).toBe('2025-01-22');
      expect(picker?.value).toBeUndefined();
    });

    it('keeps the calendar open and the value unchanged while only the start is picked', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-date-input
          label="x"
          type="date-range"
          breakpoint="desktop"
          value="18/01/2025 - 22/01/2025"
          onMudChange={onChange}
        ></mud-date-input>,
      );
      await openPicker(root);
      await pickRange(root, '2025-02-03');
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeTruthy();
      expect(queryNative(root)?.value).toBe('18/01/2025 - 22/01/2025');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('fills the field, emits once and closes when both ends are picked', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-date-input label="x" type="date-range" breakpoint="desktop" onMudChange={onChange}></mud-date-input>,
      );
      await openPicker(root);
      await pickRange(root, '2025-01-18');
      await pickRange(root, '2025-01-18', '2025-01-22');
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeNull();
      expect((root as HTMLMudDateInputElement).value).toBe('18/01/2025 - 22/01/2025');
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail.isoValue).toBe('2025-01-18/2025-01-22');
    });

    it('closes on an outside click mid-selection without applying anything', async () => {
      const { root } = await render(
        <mud-date-input
          label="x"
          type="date-range"
          breakpoint="desktop"
          value="18/01/2025 - 22/01/2025"
        ></mud-date-input>,
      );
      await openPicker(root);
      await pickRange(root, '2025-02-03');
      const outside = new MouseEvent('click', { bubbles: true, composed: true });
      Object.defineProperty(outside, 'composedPath', { value: () => [document.body, document, window] });
      (root as unknown as { handleOutsideClick: (e: MouseEvent) => void }).handleOutsideClick(outside);
      await flush();
      expect(root?.shadowRoot?.querySelector('.picker-popover')).toBeNull();
      expect((root as HTMLMudDateInputElement).value).toBe('18/01/2025 - 22/01/2025');
    });

    it('draws the field focused while the calendar is open', async () => {
      const { root } = await render(<mud-date-input label="x" type="date-range" breakpoint="desktop"></mud-date-input>);
      expect(root?.classList.contains('is-focused')).toBe(false);
      await openPicker(root);
      expect(root?.classList.contains('is-focused')).toBe(true);
    });
  });
});
