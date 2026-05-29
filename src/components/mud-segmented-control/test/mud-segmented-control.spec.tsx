import { describe, expect, h, it, render, vi } from '@stencil/vitest';

import '../mud-segmented-control';

import type { SegmentedControlSegment } from '../mud-segmented-control.types';
import { SEGMENTED_CONTROL_SIZES } from '../mud-segmented-control.types';

type HostWithSegments = HTMLElement & {
  segments?: SegmentedControlSegment[];
  value?: string;
  size?: string;
};

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const setSegments = async (root: HTMLElement | null | undefined, segments: SegmentedControlSegment[]) => {
  (root as HostWithSegments).segments = segments;
  await flush();
};

const queryButtons = (root: Element | null | undefined): HTMLButtonElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('button.segment') ?? []) as HTMLButtonElement[];

const queryTrack = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.track') ?? null) as HTMLElement | null;

const sampleSegments: SegmentedControlSegment[] = [
  { value: 'toate', label: 'Toate' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

describe('mud-segmented-control', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on the host', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru"></mud-segmented-control>);
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('role')).toBe('radiogroup');
      expect(root?.getAttribute('aria-label')).toBe('Filtru');
    });

    it.each(SEGMENTED_CONTROL_SIZES)('reflects size="%s" to the host', async size => {
      const { root } = await render(<mud-segmented-control size={size} aria-label="Filtru"></mud-segmented-control>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-segmented-control aria-label="Filtru"></mud-segmented-control>);
      (root as HostWithSegments).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });

    it('renders an empty track when no segments are provided', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru"></mud-segmented-control>);
      expect(queryTrack(root)).toBeTruthy();
      expect(queryButtons(root)).toHaveLength(0);
    });

    it('renders one button per segment with role="radio"', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru"></mud-segmented-control>);
      await setSegments(root, sampleSegments);
      const buttons = queryButtons(root);
      expect(buttons).toHaveLength(3);
      expect(buttons.every(btn => btn.getAttribute('role') === 'radio')).toBe(true);
      expect(buttons.map(btn => btn.textContent?.trim())).toEqual(['Toate', 'Active', 'Inactive']);
    });
  });

  describe('selection + mudChange', () => {
    it('marks the segment matching `value` as aria-checked="true"', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru" value="active"></mud-segmented-control>);
      await setSegments(root, sampleSegments);
      const buttons = queryButtons(root);
      expect(buttons.map(btn => btn.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    });

    it('emits mudChange with the new value when an unselected segment is clicked', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-segmented-control aria-label="Filtru" value="toate" onMudChange={onChange}></mud-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      queryButtons(root)[1]!.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'active' });
      expect((root as HostWithSegments).value).toBe('active');
    });

    it('does not re-emit mudChange when the already-selected segment is clicked', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-segmented-control aria-label="Filtru" value="active" onMudChange={onChange}></mud-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      queryButtons(root)[1]!.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not emit mudChange when the whole control is disabled', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-segmented-control
          aria-label="Filtru"
          value="toate"
          disabled
          onMudChange={onChange}
        ></mud-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      queryButtons(root)[1]!.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not emit mudChange when a disabled segment is clicked', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-segmented-control aria-label="Filtru" value="toate" onMudChange={onChange}></mud-segmented-control>,
      );
      await setSegments(root, [
        { value: 'toate', label: 'Toate' },
        { value: 'active', label: 'Active', disabled: true },
        { value: 'inactive', label: 'Inactive' },
      ]);
      queryButtons(root)[1]!.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('keyboard contract (WAI-ARIA radiogroup)', () => {
    const pressKey = (button: HTMLElement, key: string) => {
      button.focus();
      button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
    };

    it('ArrowRight moves selection to the next enabled segment', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-segmented-control aria-label="Filtru" value="toate" onMudChange={onChange}></mud-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      pressKey(queryButtons(root)[0]!, 'ArrowRight');
      await flush();
      expect((root as HostWithSegments).value).toBe('active');
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ detail: { value: 'active' } }));
    });

    it('ArrowLeft from the first segment wraps to the last', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru" value="toate"></mud-segmented-control>);
      await setSegments(root, sampleSegments);
      pressKey(queryButtons(root)[0]!, 'ArrowLeft');
      await flush();
      expect((root as HostWithSegments).value).toBe('inactive');
    });

    it('Home jumps selection to the first enabled segment', async () => {
      const { root } = await render(
        <mud-segmented-control aria-label="Filtru" value="inactive"></mud-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      pressKey(queryButtons(root)[2]!, 'Home');
      await flush();
      expect((root as HostWithSegments).value).toBe('toate');
    });

    it('End jumps selection to the last enabled segment', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru" value="toate"></mud-segmented-control>);
      await setSegments(root, sampleSegments);
      pressKey(queryButtons(root)[0]!, 'End');
      await flush();
      expect((root as HostWithSegments).value).toBe('inactive');
    });

    it('Enter on a focused segment selects it', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-segmented-control aria-label="Filtru" onMudChange={onChange}></mud-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      pressKey(queryButtons(root)[2]!, 'Enter');
      await flush();
      expect((root as HostWithSegments).value).toBe('inactive');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('Space on a focused segment selects it', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-segmented-control aria-label="Filtru" onMudChange={onChange}></mud-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      pressKey(queryButtons(root)[1]!, ' ');
      await flush();
      expect((root as HostWithSegments).value).toBe('active');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('Arrow keys skip disabled segments', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru" value="toate"></mud-segmented-control>);
      await setSegments(root, [
        { value: 'toate', label: 'Toate' },
        { value: 'active', label: 'Active', disabled: true },
        { value: 'inactive', label: 'Inactive' },
      ]);
      pressKey(queryButtons(root)[0]!, 'ArrowRight');
      await flush();
      expect((root as HostWithSegments).value).toBe('inactive');
    });
  });

  describe('roving tabindex', () => {
    it('selected segment has tabindex 0; siblings -1', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru" value="active"></mud-segmented-control>);
      await setSegments(root, sampleSegments);
      const buttons = queryButtons(root);
      expect(buttons.map(btn => btn.tabIndex)).toEqual([-1, 0, -1]);
    });

    it('with no selection, the first enabled segment is the tab stop', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru"></mud-segmented-control>);
      await setSegments(root, [
        { value: 'a', label: 'A', disabled: true },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
      ]);
      const buttons = queryButtons(root);
      expect(buttons.map(btn => btn.tabIndex)).toEqual([-1, 0, -1]);
    });
  });

  describe('a11y wiring', () => {
    it('host carries role="radiogroup" and forwards aria-label', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Mod afișare"></mud-segmented-control>);
      expect(root?.getAttribute('role')).toBe('radiogroup');
      expect(root?.getAttribute('aria-label')).toBe('Mod afișare');
    });

    it('host carries aria-disabled="true" when disabled', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru" disabled></mud-segmented-control>);
      expect(root?.getAttribute('aria-disabled')).toBe('true');
    });

    it('per-segment aria-disabled mirrors the disabled segment flag', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru"></mud-segmented-control>);
      await setSegments(root, [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', disabled: true },
        { value: 'c', label: 'C' },
      ]);
      const buttons = queryButtons(root);
      expect(buttons[0]!.getAttribute('aria-disabled')).toBeNull();
      expect(buttons[1]!.getAttribute('aria-disabled')).toBe('true');
      expect(buttons[2]!.getAttribute('aria-disabled')).toBeNull();
    });
  });

  describe('form-associated callbacks (branch coverage)', () => {
    it('formResetCallback restores the initial value snapshot', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru" value="active"></mud-segmented-control>);
      await setSegments(root, sampleSegments);
      // Mutate value away from initial
      (root as HostWithSegments).value = 'inactive';
      await flush();
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      expect((root as HostWithSegments).value).toBe('active');
    });

    it('formStateRestoreCallback restores from a non-empty string', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru"></mud-segmented-control>);
      await setSegments(root, sampleSegments);
      (root as unknown as { formStateRestoreCallback: (s: string) => void }).formStateRestoreCallback('inactive');
      await flush();
      expect((root as HostWithSegments).value).toBe('inactive');
    });

    it('formStateRestoreCallback ignores non-string state (null branch)', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru" value="active"></mud-segmented-control>);
      await setSegments(root, sampleSegments);
      (root as unknown as { formStateRestoreCallback: (s: unknown) => void }).formStateRestoreCallback(null);
      await flush();
      // value unchanged
      expect((root as HostWithSegments).value).toBe('active');
    });

    it('formStateRestoreCallback ignores empty string (length === 0 branch)', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru" value="active"></mud-segmented-control>);
      await setSegments(root, sampleSegments);
      (root as unknown as { formStateRestoreCallback: (s: string) => void }).formStateRestoreCallback('');
      await flush();
      expect((root as HostWithSegments).value).toBe('active');
    });

    it('formDisabledCallback toggles the fieldsetDisabled state', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru"></mud-segmented-control>);
      await setSegments(root, sampleSegments);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(root?.classList.contains('is-disabled')).toBe(true);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(false);
      await flush();
      expect(root?.classList.contains('is-disabled')).toBe(false);
    });
  });

  describe('edge-case branch coverage', () => {
    it('renders correctly when value is unset (getSelectedIndex -1 branch)', async () => {
      const { root } = await render(<mud-segmented-control aria-label="Filtru"></mud-segmented-control>);
      await setSegments(root, sampleSegments);
      const buttons = queryButtons(root);
      // No selection → first enabled becomes the roving tab stop
      expect(buttons.map(b => b.getAttribute('aria-checked'))).toEqual(['false', 'false', 'false']);
      expect(buttons.map(b => b.tabIndex)).toEqual([0, -1, -1]);
    });

    it('Enter on a focused unselected segment also selects it (keyboard + onFocus path)', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-segmented-control aria-label="Filtru" onMudChange={onChange}></mud-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      // Force focus onto the segment so the focusedIndex internal state is set
      queryButtons(root)[2]!.focus();
      // Then dispatch Enter via keydown
      queryButtons(root)[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
      await flush();
      expect((root as HostWithSegments).value).toBe('inactive');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('arrow keys on an all-disabled segment list are a no-op', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-segmented-control aria-label="Filtru" onMudChange={onChange}></mud-segmented-control>,
      );
      await setSegments(root, [
        { value: 'a', label: 'A', disabled: true },
        { value: 'b', label: 'B', disabled: true },
      ]);
      queryButtons(root)[0]!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
      );
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('handleKeyDown ignores keys outside the radiogroup contract (default case)', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-segmented-control aria-label="Filtru" value="toate" onMudChange={onChange}></mud-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      queryButtons(root)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true, composed: true }));
      queryButtons(root)[0]!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
      );
      await flush();
      expect(onChange).not.toHaveBeenCalled();
      expect((root as HostWithSegments).value).toBe('toate');
    });
  });
});
