import { describe, expect, h, it, render, vi } from '@stencil/vitest';

import '../cor-segmented-control';

import type { SegmentedControlSegment } from '../cor-segmented-control.types';
import { SEGMENTED_CONTROL_SIZES } from '../cor-segmented-control.types';

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

describe('cor-segmented-control', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on the host', async () => {
      const { root } = await render(<cor-segmented-control aria-label="Filtru"></cor-segmented-control>);
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('role')).toBe('radiogroup');
      expect(root?.getAttribute('aria-label')).toBe('Filtru');
    });

    it.each(SEGMENTED_CONTROL_SIZES)('reflects size="%s" to the host', async size => {
      const { root } = await render(<cor-segmented-control size={size} aria-label="Filtru"></cor-segmented-control>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-segmented-control aria-label="Filtru"></cor-segmented-control>);
      (root as HostWithSegments).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });

    it('renders an empty track when no segments are provided', async () => {
      const { root } = await render(<cor-segmented-control aria-label="Filtru"></cor-segmented-control>);
      expect(queryTrack(root)).toBeTruthy();
      expect(queryButtons(root)).toHaveLength(0);
    });

    it('renders one button per segment with role="radio"', async () => {
      const { root } = await render(<cor-segmented-control aria-label="Filtru"></cor-segmented-control>);
      await setSegments(root, sampleSegments);
      const buttons = queryButtons(root);
      expect(buttons).toHaveLength(3);
      expect(buttons.every(btn => btn.getAttribute('role') === 'radio')).toBe(true);
      expect(buttons.map(btn => btn.textContent?.trim())).toEqual(['Toate', 'Active', 'Inactive']);
    });
  });

  describe('selection + corChange', () => {
    it('marks the segment matching `value` as aria-checked="true"', async () => {
      const { root } = await render(<cor-segmented-control aria-label="Filtru" value="active"></cor-segmented-control>);
      await setSegments(root, sampleSegments);
      const buttons = queryButtons(root);
      expect(buttons.map(btn => btn.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    });

    it('emits corChange with the new value when an unselected segment is clicked', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-segmented-control aria-label="Filtru" value="toate" onCorChange={onChange}></cor-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      queryButtons(root)[1]!.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'active' });
      expect((root as HostWithSegments).value).toBe('active');
    });

    it('does not re-emit corChange when the already-selected segment is clicked', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-segmented-control aria-label="Filtru" value="active" onCorChange={onChange}></cor-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      queryButtons(root)[1]!.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not emit corChange when the whole control is disabled', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-segmented-control
          aria-label="Filtru"
          value="toate"
          disabled
          onCorChange={onChange}
        ></cor-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      queryButtons(root)[1]!.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not emit corChange when a disabled segment is clicked', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-segmented-control aria-label="Filtru" value="toate" onCorChange={onChange}></cor-segmented-control>,
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
        <cor-segmented-control aria-label="Filtru" value="toate" onCorChange={onChange}></cor-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      pressKey(queryButtons(root)[0]!, 'ArrowRight');
      await flush();
      expect((root as HostWithSegments).value).toBe('active');
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ detail: { value: 'active' } }));
    });

    it('ArrowLeft from the first segment wraps to the last', async () => {
      const { root } = await render(<cor-segmented-control aria-label="Filtru" value="toate"></cor-segmented-control>);
      await setSegments(root, sampleSegments);
      pressKey(queryButtons(root)[0]!, 'ArrowLeft');
      await flush();
      expect((root as HostWithSegments).value).toBe('inactive');
    });

    it('Home jumps selection to the first enabled segment', async () => {
      const { root } = await render(
        <cor-segmented-control aria-label="Filtru" value="inactive"></cor-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      pressKey(queryButtons(root)[2]!, 'Home');
      await flush();
      expect((root as HostWithSegments).value).toBe('toate');
    });

    it('End jumps selection to the last enabled segment', async () => {
      const { root } = await render(<cor-segmented-control aria-label="Filtru" value="toate"></cor-segmented-control>);
      await setSegments(root, sampleSegments);
      pressKey(queryButtons(root)[0]!, 'End');
      await flush();
      expect((root as HostWithSegments).value).toBe('inactive');
    });

    it('Enter on a focused segment selects it', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <cor-segmented-control aria-label="Filtru" onCorChange={onChange}></cor-segmented-control>,
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
        <cor-segmented-control aria-label="Filtru" onCorChange={onChange}></cor-segmented-control>,
      );
      await setSegments(root, sampleSegments);
      pressKey(queryButtons(root)[1]!, ' ');
      await flush();
      expect((root as HostWithSegments).value).toBe('active');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('Arrow keys skip disabled segments', async () => {
      const { root } = await render(<cor-segmented-control aria-label="Filtru" value="toate"></cor-segmented-control>);
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
      const { root } = await render(<cor-segmented-control aria-label="Filtru" value="active"></cor-segmented-control>);
      await setSegments(root, sampleSegments);
      const buttons = queryButtons(root);
      expect(buttons.map(btn => btn.tabIndex)).toEqual([-1, 0, -1]);
    });

    it('with no selection, the first enabled segment is the tab stop', async () => {
      const { root } = await render(<cor-segmented-control aria-label="Filtru"></cor-segmented-control>);
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
      const { root } = await render(<cor-segmented-control aria-label="Mod afișare"></cor-segmented-control>);
      expect(root?.getAttribute('role')).toBe('radiogroup');
      expect(root?.getAttribute('aria-label')).toBe('Mod afișare');
    });

    it('host carries aria-disabled="true" when disabled', async () => {
      const { root } = await render(<cor-segmented-control aria-label="Filtru" disabled></cor-segmented-control>);
      expect(root?.getAttribute('aria-disabled')).toBe('true');
    });

    it('per-segment aria-disabled mirrors the disabled segment flag', async () => {
      const { root } = await render(<cor-segmented-control aria-label="Filtru"></cor-segmented-control>);
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
});
