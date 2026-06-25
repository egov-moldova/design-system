import { describe, expect, h, it, render, vi } from '@stencil/vitest';

import '../mud-tabs';
import '../mud-tab';

import type { TabDescriptor } from '../mud-tabs.types';
import { TABS_SIZES } from '../mud-tabs.types';

type HostWithTabs = HTMLElement & {
  tabs?: TabDescriptor[];
  value?: string;
  size?: string;
};

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const setTabs = async (root: HTMLElement | null | undefined, tabs: TabDescriptor[]) => {
  (root as HostWithTabs).tabs = tabs;
  await flush();
  // The component schedules sync work inside requestAnimationFrame on
  // tabs change; give it a second tick to land.
  await flush();
};

const queryTabs = (root: Element | null | undefined): HTMLElement[] => {
  // Mirror the component's own getTabs(): data-driven tabs live inside the
  // shadow DOM track; declarative children live in the light DOM.
  const light = Array.from(root?.children ?? []).filter(el => el.tagName === 'MUD-TAB');
  const shadow = Array.from(root?.shadowRoot?.querySelectorAll('mud-tab') ?? []);
  return [...light, ...shadow] as HTMLElement[];
};

const queryPanels = (root: Element | null | undefined): HTMLElement[] =>
  Array.from(root?.children ?? []).filter(el => {
    const slot = el.getAttribute('slot');
    return typeof slot === 'string' && slot.startsWith('panel-');
  }) as HTMLElement[];

const sampleTabs: TabDescriptor[] = [
  { value: 'profil', label: 'Profil' },
  { value: 'documente', label: 'Documente' },
  { value: 'notificari', label: 'Notificări' },
  { value: 'setari', label: 'Setări' },
];

describe('mud-tabs', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on the host', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare"></mud-tabs>);
      expect(root?.getAttribute('size')).toBe('md');
      // role="tablist" lives on .track (shadow DOM), not on the host, so that
      // data-driven <mud-tab> children inside shadow DOM are owned by the tablist
      // in the flat accessibility tree (fixes aria-required-children violation).
      expect(root?.getAttribute('role')).toBeNull();
    });

    it.each(TABS_SIZES)('reflects size="%s" to the host', async size => {
      const { root } = await render(<mud-tabs size={size} aria-label="Navigare"></mud-tabs>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-tabs aria-label="Navigare"></mud-tabs>);
      (root as HostWithTabs).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });

    it('renders one <mud-tab> per descriptor', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare"></mud-tabs>);
      await setTabs(root, sampleTabs);
      const tabs = queryTabs(root);
      expect(tabs).toHaveLength(4);
      expect(tabs.map(t => t.getAttribute('value'))).toEqual(['profil', 'documente', 'notificari', 'setari']);
    });

    it('selects the first enabled tab by default when no value is provided', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare"></mud-tabs>);
      await setTabs(root, sampleTabs);
      expect((root as HostWithTabs).value).toBe('profil');
      const tabs = queryTabs(root);
      expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
      expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');
    });

    it('honors an initial value', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare" value="notificari"></mud-tabs>);
      await setTabs(root, sampleTabs);
      const tabs = queryTabs(root);
      expect(tabs[2]!.getAttribute('aria-selected')).toBe('true');
      expect(tabs[0]!.getAttribute('aria-selected')).toBe('false');
    });
  });

  describe('selection + mudChange', () => {
    it('emits mudChange when an unselected tab is clicked', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-tabs aria-label="Navigare" value="profil" onMudChange={onChange}></mud-tabs>);
      await setTabs(root, sampleTabs);
      queryTabs(root)[1]!.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'documente' });
      expect((root as HostWithTabs).value).toBe('documente');
    });

    it('does not re-emit mudChange when the already-selected tab is clicked', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-tabs aria-label="Navigare" value="documente" onMudChange={onChange}></mud-tabs>,
      );
      await setTabs(root, sampleTabs);
      queryTabs(root)[1]!.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not emit mudChange when a disabled tab is clicked', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-tabs aria-label="Navigare" value="profil" onMudChange={onChange}></mud-tabs>);
      await setTabs(root, [
        { value: 'profil', label: 'Profil' },
        { value: 'documente', label: 'Documente', disabled: true },
        { value: 'notificari', label: 'Notificări' },
      ]);
      queryTabs(root)[1]!.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
      expect((root as HostWithTabs).value).toBe('profil');
    });

    it('updates the selected tab when value prop changes externally', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare" value="profil"></mud-tabs>);
      await setTabs(root, sampleTabs);
      (root as HostWithTabs).value = 'setari';
      await flush();
      const tabs = queryTabs(root);
      expect(tabs[3]!.getAttribute('aria-selected')).toBe('true');
      expect(tabs[0]!.getAttribute('aria-selected')).toBe('false');
    });
  });

  describe('keyboard contract (WAI-ARIA tabs)', () => {
    const pressKey = (host: HTMLElement, key: string, target?: HTMLElement) => {
      const focused = target ?? (host.querySelector('mud-tab[aria-selected="true"]') as HTMLElement | null);
      if (focused && typeof focused.focus === 'function') focused.focus();
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, composed: true });
      (focused ?? host).dispatchEvent(ev);
    };

    it('ArrowRight moves selection to the next enabled tab', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-tabs aria-label="Navigare" value="profil" onMudChange={onChange}></mud-tabs>);
      await setTabs(root, sampleTabs);
      pressKey(root!, 'ArrowRight', queryTabs(root)[0]!);
      await flush();
      expect((root as HostWithTabs).value).toBe('documente');
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ detail: { value: 'documente' } }));
    });

    it('ArrowLeft from the first tab wraps to the last', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare" value="profil"></mud-tabs>);
      await setTabs(root, sampleTabs);
      pressKey(root!, 'ArrowLeft', queryTabs(root)[0]!);
      await flush();
      expect((root as HostWithTabs).value).toBe('setari');
    });

    it('ArrowRight skips disabled tabs', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare" value="profil"></mud-tabs>);
      await setTabs(root, [
        { value: 'profil', label: 'Profil' },
        { value: 'documente', label: 'Documente', disabled: true },
        { value: 'notificari', label: 'Notificări' },
      ]);
      pressKey(root!, 'ArrowRight', queryTabs(root)[0]!);
      await flush();
      // Enabled tabs are [profil, notificari]; from index 0 → index 1.
      expect((root as HostWithTabs).value).toBe('notificari');
    });

    it('Home jumps selection to the first enabled tab', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare" value="setari"></mud-tabs>);
      await setTabs(root, sampleTabs);
      pressKey(root!, 'Home', queryTabs(root)[3]!);
      await flush();
      expect((root as HostWithTabs).value).toBe('profil');
    });

    it('End jumps selection to the last enabled tab', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare" value="profil"></mud-tabs>);
      await setTabs(root, sampleTabs);
      pressKey(root!, 'End', queryTabs(root)[0]!);
      await flush();
      expect((root as HostWithTabs).value).toBe('setari');
    });

    it('Enter on a focused tab activates it', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-tabs aria-label="Navigare" value="profil" onMudChange={onChange}></mud-tabs>);
      await setTabs(root, sampleTabs);
      const target = queryTabs(root)[2]!;
      target.focus();
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true });
      target.dispatchEvent(ev);
      await flush();
      expect((root as HostWithTabs).value).toBe('notificari');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('Space on a focused tab activates it', async () => {
      const onChange = vi.fn();
      const { root } = await render(<mud-tabs aria-label="Navigare" value="profil" onMudChange={onChange}></mud-tabs>);
      await setTabs(root, sampleTabs);
      const target = queryTabs(root)[1]!;
      target.focus();
      const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true });
      target.dispatchEvent(ev);
      await flush();
      expect((root as HostWithTabs).value).toBe('documente');
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('roving tabindex', () => {
    it('selected tab has tabindex 0, siblings -1', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare" value="notificari"></mud-tabs>);
      await setTabs(root, sampleTabs);
      const tabs = queryTabs(root);
      const tabIndices = tabs.map(t => Number(t.getAttribute('tabindex')));
      expect(tabIndices).toEqual([-1, -1, 0, -1]);
    });

    it('disabled tabs always have tabindex -1', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare" value="a"></mud-tabs>);
      await setTabs(root, [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', disabled: true },
        { value: 'c', label: 'C' },
      ]);
      const tabs = queryTabs(root);
      expect(Number(tabs[1]!.getAttribute('tabindex'))).toBe(-1);
      expect(Number(tabs[0]!.getAttribute('tabindex'))).toBe(0);
    });
  });

  describe('a11y wiring', () => {
    it('.track carries role="tablist", aria-label and aria-orientation', async () => {
      const { root } = await render(<mud-tabs aria-label="Cont"></mud-tabs>);
      const track = root?.shadowRoot?.querySelector('.track');
      expect(track?.getAttribute('role')).toBe('tablist');
      expect(track?.getAttribute('aria-label')).toBe('Cont');
      expect(track?.getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('each mud-tab carries role="tab" and aria-selected', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare" value="profil"></mud-tabs>);
      await setTabs(root, sampleTabs);
      const tabs = queryTabs(root);
      expect(tabs.every(t => t.getAttribute('role') === 'tab')).toBe(true);
      expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
      expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');
    });

    it('disabled tabs reflect aria-disabled="true"', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare"></mud-tabs>);
      await setTabs(root, [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', disabled: true },
      ]);
      const tabs = queryTabs(root);
      expect(tabs[0]!.getAttribute('aria-disabled')).toBeNull();
      expect(tabs[1]!.getAttribute('aria-disabled')).toBe('true');
    });

    it('panels are wired with role="tabpanel" + aria-labelledby + hidden', async () => {
      const { root } = await render(
        <mud-tabs aria-label="Navigare" value="profil">
          <mud-tab value="profil" label="Profil"></mud-tab>
          <mud-tab value="documente" label="Documente"></mud-tab>
          <div slot="panel-profil">Profil content</div>
          <div slot="panel-documente">Documente content</div>
        </mud-tabs>,
      );
      await flush();
      await flush();
      const panels = queryPanels(root);
      expect(panels).toHaveLength(2);
      expect(panels[0]!.getAttribute('role')).toBe('tabpanel');
      expect(panels[0]!.hasAttribute('aria-labelledby')).toBe(true);
      expect(panels[0]!.hidden).toBe(false);
      expect(panels[1]!.hidden).toBe(true);
    });
  });

  describe('overflow chevrons', () => {
    it('chevron-end button is rendered in the shadow DOM (hidden by default)', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare" value="profil"></mud-tabs>);
      await setTabs(root, sampleTabs);
      const chevronEnd = root?.shadowRoot?.querySelector('.chevron--end');
      const chevronStart = root?.shadowRoot?.querySelector('.chevron--start');
      expect(chevronEnd).toBeTruthy();
      expect(chevronStart).toBeTruthy();
    });

    it('chevron buttons carry aria-hidden="true" and tabindex="-1"', async () => {
      const { root } = await render(<mud-tabs aria-label="Navigare" value="profil"></mud-tabs>);
      await setTabs(root, sampleTabs);
      const chevronEnd = root?.shadowRoot?.querySelector('.chevron--end') as HTMLButtonElement;
      expect(chevronEnd.getAttribute('aria-hidden')).toBe('true');
      expect(chevronEnd.getAttribute('tabindex')).toBe('-1');
    });
  });
});
