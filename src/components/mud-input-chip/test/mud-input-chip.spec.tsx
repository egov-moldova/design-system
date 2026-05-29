import { describe, expect, h, it, render, vi } from '@stencil/vitest';

import '../mud-input-chip';

import { INPUT_CHIP_SIZES, INPUT_CHIP_VARIANTS } from '../mud-input-chip.types';

const queryControl = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.control') ?? null) as HTMLElement | null;

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryLabel = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('label.label') ?? null) as HTMLElement | null;

const queryAssistive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.assistive') ?? null) as HTMLElement | null;

const queryChips = (root: Element | null | undefined): NodeListOf<HTMLElement> | null =>
  (root?.shadowRoot?.querySelectorAll('.chip') ?? null) as NodeListOf<HTMLElement> | null;

const queryChipRemoves = (root: Element | null | undefined): NodeListOf<HTMLButtonElement> | null =>
  (root?.shadowRoot?.querySelectorAll('.chip-remove') ?? null) as NodeListOf<HTMLButtonElement> | null;

const queryLiveRegion = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('[role="status"]') ?? null) as HTMLElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

// Stencil mock-doc does not propagate `keydown` events to JSX handlers via
// dispatchEvent (see mud-select-input spec). Invoke the registered handler
// off the component instance instead — same contract.
type ChipInstance = {
  handleInputKeyDown: (ev: KeyboardEvent) => void;
  handleChipKeyDown: (index: number) => (ev: KeyboardEvent) => void;
};

const pressOnInput = (root: Element | null | undefined, key: string) => {
  const instance = root as unknown as ChipInstance;
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  instance.handleInputKeyDown.call(instance, ev);
};

const pressOnChip = (root: Element | null | undefined, index: number, key: string) => {
  const instance = root as unknown as ChipInstance;
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  instance.handleChipKeyDown.call(instance, index)(ev);
};

describe('mud-input-chip', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-input-chip label="Destinatari"></mud-input-chip>);
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('readonly')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
    });

    it.each(INPUT_CHIP_VARIANTS)('reflects variant="%s" to host', async variant => {
      const { root } = await render(<mud-input-chip variant={variant} label="x"></mud-input-chip>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it.each(INPUT_CHIP_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<mud-input-chip size={size} label="x"></mud-input-chip>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('warns and falls back when variant is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-input-chip label="x"></mud-input-chip>);
      (root as unknown as { variant: string }).variant = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="bogus"'));
      expect(root?.getAttribute('variant')).toBe('default');
      warn.mockRestore();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-input-chip label="x"></mud-input-chip>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders an internal <input> inside shadow DOM', async () => {
      const { root } = await render(<mud-input-chip label="x"></mud-input-chip>);
      expect(queryNative(root)).toBeTruthy();
    });

    it('renders the label text via `label` prop', async () => {
      const { root } = await render(<mud-input-chip label="Destinatari"></mud-input-chip>);
      expect(queryLabel(root)?.textContent).toContain('Destinatari');
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<mud-input-chip label="x" required></mud-input-chip>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeTruthy();
      expect(mark?.textContent?.trim()).toBe('*');
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(<mud-input-chip label="x" helper-text="Tip"></mud-input-chip>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('Tip');
    });

    it('renders an error assistive row when invalid + error-text', async () => {
      const { root } = await render(<mud-input-chip label="x" invalid error-text="Required"></mud-input-chip>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-error')).toBe(true);
      expect(assistive?.textContent).toContain('Required');
    });

    it('error message takes priority over helper text', async () => {
      const { root } = await render(
        <mud-input-chip label="x" invalid helper-text="Hint" error-text="Bad"></mud-input-chip>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.textContent).toContain('Bad');
      expect(assistive?.textContent).not.toContain('Hint');
    });

    it('exposes a live region for screen-reader announcements', async () => {
      const { root } = await render(<mud-input-chip label="x"></mud-input-chip>);
      const live = queryLiveRegion(root);
      expect(live).toBeTruthy();
      expect(live?.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('chip rendering', () => {
    it('renders one chip per entry in `chips`', async () => {
      const { root } = await render(<mud-input-chip label="x" chips={['a', 'b', 'c']}></mud-input-chip>);
      const chips = queryChips(root);
      expect(chips?.length).toBe(3);
      expect(chips?.[0].textContent).toContain('a');
      expect(chips?.[1].textContent).toContain('b');
      expect(chips?.[2].textContent).toContain('c');
    });

    it('renders a remove button per chip with localized aria-label', async () => {
      const { root } = await render(<mud-input-chip label="x" chips={['ana@gov.md']}></mud-input-chip>);
      const removes = queryChipRemoves(root);
      expect(removes?.length).toBe(1);
      expect(removes?.[0].getAttribute('aria-label')).toBe('Elimină ana@gov.md');
    });

    it('marks chip-remove buttons as `disabled` when host is disabled', async () => {
      const { root } = await render(<mud-input-chip label="x" disabled chips={['a']}></mud-input-chip>);
      const remove = queryChipRemoves(root)?.[0];
      expect(remove?.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('control container ARIA', () => {
    it('sets role="group" on the control', async () => {
      const { root } = await render(<mud-input-chip label="x"></mud-input-chip>);
      expect(queryControl(root)?.getAttribute('role')).toBe('group');
    });

    it('points group label to the host label when visible', async () => {
      const { root } = await render(<mud-input-chip label="Destinatari"></mud-input-chip>);
      const control = queryControl(root);
      const labelEl = queryLabel(root);
      expect(control?.getAttribute('aria-labelledby')).toBe(labelEl?.getAttribute('id'));
    });

    it('forwards aria-required to the inner input when required', async () => {
      const { root } = await render(<mud-input-chip label="x" required></mud-input-chip>);
      expect(queryNative(root)?.getAttribute('aria-required')).toBe('true');
      // Group itself no longer carries aria-required (not a supported attr on role="group").
      expect(queryControl(root)?.hasAttribute('aria-required')).toBe(false);
    });

    it('forwards aria-invalid to the inner input when invalid', async () => {
      const { root } = await render(<mud-input-chip label="x" invalid></mud-input-chip>);
      expect(queryNative(root)?.getAttribute('aria-invalid')).toBe('true');
      // Avoid duplicate aria-invalid on the group wrapper.
      expect(queryControl(root)?.hasAttribute('aria-invalid')).toBe(false);
    });

    it('wires aria-describedby on the inner input (not the group)', async () => {
      const { root } = await render(<mud-input-chip label="x" helper-text="Tip"></mud-input-chip>);
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(queryNative(root)?.getAttribute('aria-describedby')).toBe(helper?.id);
      expect(queryControl(root)?.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('add chip via Enter', () => {
    it('adds a chip and fires mudChipAdd + mudChange on Enter', async () => {
      const onAdd = vi.fn();
      const onChange = vi.fn();
      const { root } = await render(
        <mud-input-chip label="x" onMudChipAdd={onAdd} onMudChange={onChange}></mud-input-chip>,
      );
      (root as unknown as { value: string }).value = 'foo';
      await flush();
      pressOnInput(root, 'Enter');
      await flush();
      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd.mock.calls[0][0].detail).toEqual({ chip: 'foo', chips: ['foo'] });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(queryChips(root)?.length).toBe(1);
    });

    it('ignores Enter on empty input', async () => {
      const onAdd = vi.fn();
      const { root } = await render(<mud-input-chip label="x" onMudChipAdd={onAdd}></mud-input-chip>);
      pressOnInput(root, 'Enter');
      await flush();
      expect(onAdd).not.toHaveBeenCalled();
    });

    it('trims whitespace before adding', async () => {
      const onAdd = vi.fn();
      const { root } = await render(<mud-input-chip label="x" onMudChipAdd={onAdd}></mud-input-chip>);
      (root as unknown as { value: string }).value = '  foo  ';
      await flush();
      pressOnInput(root, 'Enter');
      await flush();
      expect(onAdd.mock.calls[0][0].detail.chip).toBe('foo');
    });
  });

  describe('add chip via separator', () => {
    it('adds a chip when the comma separator key is pressed', async () => {
      const onAdd = vi.fn();
      const { root } = await render(<mud-input-chip label="x" onMudChipAdd={onAdd}></mud-input-chip>);
      (root as unknown as { value: string }).value = 'foo';
      await flush();
      pressOnInput(root, ',');
      await flush();
      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd.mock.calls[0][0].detail.chip).toBe('foo');
    });

    it('honors a custom `separators` prop', async () => {
      const onAdd = vi.fn();
      const { root } = await render(<mud-input-chip label="x" separators=";" onMudChipAdd={onAdd}></mud-input-chip>);
      (root as unknown as { value: string }).value = 'foo';
      await flush();
      pressOnInput(root, ';');
      await flush();
      expect(onAdd).toHaveBeenCalledTimes(1);
    });
  });

  describe('duplicate detection', () => {
    it('does NOT add a duplicate value and fires mudError', async () => {
      const onAdd = vi.fn();
      const onError = vi.fn();
      const { root } = await render(
        <mud-input-chip label="x" chips={['foo']} onMudChipAdd={onAdd} onMudError={onError}></mud-input-chip>,
      );
      (root as unknown as { value: string }).value = 'foo';
      await flush();
      pressOnInput(root, 'Enter');
      await flush();
      expect(onAdd).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].detail.code).toBe('duplicate');
    });
  });

  describe('max-chips enforcement', () => {
    it('rejects additions beyond `max-chips` and emits mudError code="max"', async () => {
      const onError = vi.fn();
      const { root } = await render(
        <mud-input-chip label="x" chips={['a', 'b', 'c']} max-chips={3} onMudError={onError}></mud-input-chip>,
      );
      (root as unknown as { value: string }).value = 'd';
      await flush();
      pressOnInput(root, 'Enter');
      await flush();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].detail.code).toBe('max');
      expect(queryChips(root)?.length).toBe(3);
    });

    it('disables the inline input when max is reached', async () => {
      const { root } = await render(<mud-input-chip label="x" chips={['a', 'b', 'c']} max-chips={3}></mud-input-chip>);
      expect(queryNative(root)?.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('pattern validation', () => {
    it('rejects values that fail the regex with mudError code="pattern"', async () => {
      const onError = vi.fn();
      const { root } = await render(<mud-input-chip label="x" onMudError={onError}></mud-input-chip>);
      // Set the prop imperatively to dodge JSX attribute escaping of backslashes.
      (root as unknown as { validatePattern: string }).validatePattern = '^[0-9]+$';
      (root as unknown as { value: string }).value = 'not-numeric';
      await flush();
      pressOnInput(root, 'Enter');
      await flush();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].detail.code).toBe('pattern');
    });

    it('accepts values that match the regex', async () => {
      const onAdd = vi.fn();
      const onError = vi.fn();
      const { root } = await render(
        <mud-input-chip label="x" onMudChipAdd={onAdd} onMudError={onError}></mud-input-chip>,
      );
      (root as unknown as { validatePattern: string }).validatePattern = '^[0-9]+$';
      (root as unknown as { value: string }).value = '12345';
      await flush();
      pressOnInput(root, 'Enter');
      await flush();
      expect(onError).not.toHaveBeenCalled();
      expect(onAdd).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove chip', () => {
    it('removes the last chip on Backspace when input is empty', async () => {
      const onRemove = vi.fn();
      const { root } = await render(
        <mud-input-chip label="x" chips={['a', 'b']} onMudChipRemove={onRemove}></mud-input-chip>,
      );
      pressOnInput(root, 'Backspace');
      await flush();
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove.mock.calls[0][0].detail).toEqual({ chip: 'b', index: 1, chips: ['a'] });
    });

    it('removes a chip on remove-button click', async () => {
      const onRemove = vi.fn();
      const { root } = await render(
        <mud-input-chip label="x" chips={['a', 'b']} onMudChipRemove={onRemove}></mud-input-chip>,
      );
      const removes = queryChipRemoves(root);
      removes?.[0].click();
      await flush();
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove.mock.calls[0][0].detail).toEqual({ chip: 'a', index: 0, chips: ['b'] });
    });

    it('removes a chip when its remove-button is activated with Enter', async () => {
      const onRemove = vi.fn();
      const { root } = await render(
        <mud-input-chip label="x" chips={['a']} onMudChipRemove={onRemove}></mud-input-chip>,
      );
      pressOnChip(root, 0, 'Enter');
      await flush();
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('does NOT remove on Backspace when input has text', async () => {
      const onRemove = vi.fn();
      const { root } = await render(
        <mud-input-chip label="x" chips={['a']} onMudChipRemove={onRemove}></mud-input-chip>,
      );
      (root as unknown as { value: string }).value = 'foo';
      await flush();
      pressOnInput(root, 'Backspace');
      await flush();
      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  describe('Escape key', () => {
    it('clears the partial value on Escape without touching chips', async () => {
      const onRemove = vi.fn();
      const { root } = await render(
        <mud-input-chip label="x" chips={['a']} onMudChipRemove={onRemove}></mud-input-chip>,
      );
      (root as unknown as { value: string }).value = 'partial';
      await flush();
      pressOnInput(root, 'Escape');
      await flush();
      expect((root as unknown as { value: string }).value).toBe('');
      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('ignores keyboard input when disabled', async () => {
      const onAdd = vi.fn();
      const { root } = await render(<mud-input-chip label="x" disabled onMudChipAdd={onAdd}></mud-input-chip>);
      (root as unknown as { value: string }).value = 'foo';
      await flush();
      pressOnInput(root, 'Enter');
      await flush();
      expect(onAdd).not.toHaveBeenCalled();
    });
  });

  describe('aria-label capture', () => {
    it('puts aria-label on the inner input when no visible label is present', async () => {
      const { root } = await render(<mud-input-chip aria-label="Destinatari"></mud-input-chip>);
      // Native label association (<label for=>) is hidden because hasVisibleLabel() is false;
      // the input carries the accessible name via aria-label.
      expect(queryNative(root)?.getAttribute('aria-label')).toBe('Destinatari');
    });

    it('omits aria-label on the input when a visible label is provided', async () => {
      const { root } = await render(<mud-input-chip label="Destinatari" aria-label="Other"></mud-input-chip>);
      expect(queryNative(root)?.hasAttribute('aria-label')).toBe(false);
      // The group is still labelled via aria-labelledby in this case.
      expect(queryControl(root)?.getAttribute('aria-labelledby')).toBeTruthy();
    });
  });

  describe('form validity', () => {
    type InstanceWithInternals = { internals: ElementInternals };

    it('calls setValidity with valueMissing when required + empty', async () => {
      const { root } = await render(<mud-input-chip label="x" required></mud-input-chip>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      // Force a re-sync to capture the call shape.
      (root as unknown as { chips: string[] }).chips = [];
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('clears validity once a chip is added', async () => {
      const { root } = await render(<mud-input-chip label="x" required></mud-input-chip>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = 'foo';
      await flush();
      pressOnInput(root, 'Enter');
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({});
      spy.mockRestore();
    });

    it('reports the error-text as validation message when required + empty', async () => {
      const { root } = await render(<mud-input-chip label="x" required error-text="Câmp obligatoriu"></mud-input-chip>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { chips: string[] }).chips = [];
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[1]).toBe('Câmp obligatoriu');
      spy.mockRestore();
    });
  });
});
