import { render, h, describe, it, expect, vi, beforeEach, afterEach } from '@stencil/vitest';
import fs from 'node:fs';
import path from 'node:path';

import '../mud-icon';
import manifest from '../assets/icons.manifest.json';
import { ICON_MODULES } from '../../../generated/icons';
import { clearSvgCaches } from '../../../utils/svg-assets';
import {
  hasIconVariant,
  ICON_NAMES,
  ICON_VARIANTS,
  type IconManifest,
  type IconName,
  type IconVariant,
} from '../mud-icon.types';

const REAL_MANIFEST = manifest as IconManifest;
const variantsOf = (name: IconName): readonly IconVariant[] => REAL_MANIFEST[name]?.variants ?? [];
const NAME_IN_BOTH_VARIANTS = ICON_NAMES.find(n => variantsOf(n).length === 2);
const FILLED_ONLY_NAME = ICON_NAMES.find(n => !variantsOf(n).includes('outlined'));

type ModuleThunks = Record<string, () => Promise<{ default: string }>>;
/** The generated map, writable only so a spec can hold or fail one import. */
const modules = ICON_MODULES as ModuleThunks;

/** The `data-mud-asset` marker the generator stamps on every drawing: which file was rendered. */
const marker = (root: Element | null | undefined) =>
  root?.shadowRoot?.querySelector('svg')?.getAttribute('data-mud-asset');

describe('mud-icon', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    clearSvgCaches();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.restoreAllMocks();
    clearSvgCaches();
  });

  it('renders with default props (size=16, variant=outlined)', async () => {
    const defaultName = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={defaultName} />);
    await waitForChanges();

    expect(root?.getAttribute('size')).toBe('16');
    expect(root?.getAttribute('variant')).toBe('outlined');
    expect(root?.getAttribute('color')).toBe('currentColor');
    expect(root?.shadowRoot?.querySelector('.svg-icon')).toBeTruthy();
  });

  it('reflects size to the host attribute', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<mud-icon name={name} size={32} />);
    expect(root?.getAttribute('size')).toBe('32');
  });

  it('renders the filled drawing when variant="filled"', async () => {
    const name = NAME_IN_BOTH_VARIANTS ?? ICON_NAMES[0];
    const { root } = await render(<mud-icon name={name} variant="filled" />);
    expect(root?.getAttribute('variant')).toBe('filled');
    await vi.waitFor(() => expect(marker(root)).toBe(`icon:filled/${name}`));
  });

  it('falls back to the drawing that exists and warns when the variant is missing', async () => {
    if (!FILLED_ONLY_NAME) return;
    const { root } = await render(<mud-icon name={FILLED_ONLY_NAME} variant="outlined" />);
    await vi.waitFor(() => expect(marker(root)).toBe(`icon:filled/${FILLED_ONLY_NAME}`));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`No "outlined" drawing for name="${FILLED_ONLY_NAME}"`),
    );
  });

  it('reflects interactive + disabled flags', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<mud-icon name={name} interactive disabled />);
    expect(root?.hasAttribute('interactive')).toBe(true);
    expect(root?.hasAttribute('disabled')).toBe(true);
  });

  it('treats absent ariaLabel as decorative (aria-hidden on host)', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} />);
    await waitForChanges();
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.hasAttribute('aria-label')).toBe(false);
  });

  it('announces with ariaLabel when provided', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} aria-label="Confirm" />);
    await waitForChanges();
    expect(root?.getAttribute('aria-label')).toBe('Confirm');
    expect(root?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('adds button role + tabindex on host when interactive and not disabled', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} interactive />);
    await waitForChanges();
    expect(root?.getAttribute('role')).toBe('button');
    expect(root?.getAttribute('tabindex')).toBe('0');
    expect(root?.hasAttribute('aria-disabled')).toBe(false);
  });

  it('announces aria-disabled and drops tabindex when interactive + disabled', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} interactive disabled />);
    await waitForChanges();
    expect(root?.getAttribute('role')).toBe('button');
    expect(root?.getAttribute('aria-disabled')).toBe('true');
    expect(root?.getAttribute('tabindex')).toBeFalsy();
  });

  // Mock-doc does not propagate keyboard events to JSX-bound `onKeyDown` handlers. In
  // Stencil's custom-elements output the element IS the instance, so the arrow-function
  // field `handleKeyDown` is reachable directly on `root`.
  type Instance = { handleKeyDown: (ev: KeyboardEvent) => void };
  const getHandler = (root: Element): ((ev: KeyboardEvent) => void) => {
    const instance = root as unknown as Instance;
    return instance.handleKeyDown.bind(instance);
  };

  it('activates on Enter when interactive (preventDefault + click)', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} interactive />);
    await waitForChanges();
    const clickSpy = vi.spyOn(root as unknown as HTMLElement, 'click').mockImplementation(() => {});
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    getHandler(root!)(ev);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('activates on Space when interactive', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} interactive />);
    await waitForChanges();
    const clickSpy = vi.spyOn(root as unknown as HTMLElement, 'click').mockImplementation(() => {});
    getHandler(root!)(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys (does not activate on Tab/ArrowDown)', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} interactive />);
    await waitForChanges();
    const clickSpy = vi.spyOn(root as unknown as HTMLElement, 'click').mockImplementation(() => {});
    const handler = getHandler(root!);
    handler(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    handler(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('keydown handler is a no-op when interactive + disabled', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} interactive disabled />);
    await waitForChanges();
    const clickSpy = vi.spyOn(root as unknown as HTMLElement, 'click').mockImplementation(() => {});
    getHandler(root!)(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('sets --icon-color on the host for a token name and removes it for currentColor', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} color="icon-brand-default" />);
    await waitForChanges();
    expect((root as HTMLElement).style.getPropertyValue('--icon-color')).toBe('var(--color-icon-brand-default)');

    (root as unknown as { color: string }).color = 'currentColor';
    await waitForChanges();
    expect((root as HTMLElement).style.getPropertyValue('--icon-color')).toBe('');
  });

  it('unknown name → warns, no SVG, but host stays decorative (aria-hidden)', async () => {
    const { root, waitForChanges } = await render(<mud-icon name={'this-icon-does-not-exist' as IconName} />);
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.querySelector('.svg-icon')).toBeNull();
    // Host must still be aria-hidden so screen readers don't traverse it as a
    // nameless generic element. (Same contract as mud-logo Issue 3.)
    expect(root?.getAttribute('aria-hidden')).toBe('true');
  });

  it('omitted name → warns, no SVG, host stays decorative', async () => {
    const { root, waitForChanges } = await render(<mud-icon {...({} as { name: IconName })} />);
    await waitForChanges();
    expect(root?.hasAttribute('name')).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.querySelector('.svg-icon')).toBeNull();
    expect(root?.getAttribute('aria-hidden')).toBe('true');
  });

  it.each(['constructor', 'toString', 'hasOwnProperty', '__proto__'])(
    'Object.prototype member name "%s" degrades like an unknown name',
    async prototypeName => {
      const { root, waitForChanges } = await render(<mud-icon name={prototypeName as IconName} />);
      await waitForChanges();
      expect(warnSpy).toHaveBeenCalled();
      expect(root?.shadowRoot?.querySelector('.svg-icon')).toBeNull();
      expect(root?.getAttribute('aria-hidden')).toBe('true');
    },
  );

  it('renders inline SVG markup in shadow DOM for a known icon', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<mud-icon name={name} size={24} />);
    await vi.waitFor(() =>
      expect(root?.shadowRoot?.querySelector('.svg-icon')?.innerHTML.toLowerCase() ?? '').toContain('<svg'),
    );
  });

  it('never lets a superseded import replace the latest name', async () => {
    const { root, waitForChanges } = await render(<mud-icon name="wallet" />);
    let release!: (m: { default: string }) => void;
    vi.spyOn(modules, 'outlined/calendar').mockReturnValueOnce(new Promise(r => (release = r)));
    root!.setAttribute('name', 'calendar');
    root!.setAttribute('name', 'umbrella');
    await vi.waitFor(() => expect(marker(root)).toBe('icon:outlined/umbrella'));
    release({ default: '<svg xmlns="http://www.w3.org/2000/svg" data-mud-asset="icon:outlined/calendar"></svg>' });
    await new Promise(r => setTimeout(r, 0));
    // Without this, a superseded result would only reach the DOM after the check below ran.
    await waitForChanges();
    expect(marker(root)).toBe('icon:outlined/umbrella');
  });

  it('renders a second instance of a loaded icon without importing again', async () => {
    const first = await render(<mud-icon name="calendar" />);
    await vi.waitFor(() => expect(marker(first.root)).toBe('icon:outlined/calendar'));
    const spy = vi.spyOn(modules, 'outlined/calendar');
    const { root } = await render(<mud-icon name="calendar" />);
    expect(marker(root)).toBe('icon:outlined/calendar');
    expect(spy).not.toHaveBeenCalled();
  });

  it('imports once for two instances rendered together', async () => {
    const spy = vi.spyOn(modules, 'outlined/calendar');
    const [a, b] = await Promise.all([render(<mud-icon name="calendar" />), render(<mud-icon name="calendar" />)]);
    await vi.waitFor(() => expect(marker(a.root)).toBe('icon:outlined/calendar'));
    await vi.waitFor(() => expect(marker(b.root)).toBe('icon:outlined/calendar'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('graceful degrade: a failed import warns once and leaves .svg-icon empty', async () => {
    vi.spyOn(modules, 'outlined/calendar').mockRejectedValueOnce(
      new Error('Failed to fetch dynamically imported module'),
    );
    const { root } = await render(<mud-icon name="calendar" />);
    await vi.waitFor(() =>
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[mud-icon] Failed to load SVG: name="calendar"')),
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(root?.shadowRoot?.querySelector('.svg-icon')?.children.length ?? 0).toBe(0);
  });

  it('graceful degrade: markup that sanitizes to nothing warns and leaves .svg-icon empty', async () => {
    vi.spyOn(modules, 'outlined/calendar').mockResolvedValueOnce({ default: '' });
    const { root } = await render(<mud-icon name="calendar" />);
    await vi.waitFor(() =>
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[mud-icon] Failed to load SVG')),
    );
    expect(root?.shadowRoot?.querySelector('.svg-icon')?.children.length ?? 0).toBe(0);
  });

  it('a failed import is not cached: a later render imports again and draws', async () => {
    vi.spyOn(modules, 'outlined/calendar').mockRejectedValueOnce(new Error('offline'));
    const failed = await render(<mud-icon name="calendar" />);
    await vi.waitFor(() => expect(warnSpy).toHaveBeenCalledTimes(1));
    expect(marker(failed.root)).toBeFalsy();

    const { root } = await render(<mud-icon name="calendar" />);
    await vi.waitFor(() => expect(marker(root)).toBe('icon:outlined/calendar'));
  });

  it('onNameChange: changing name to a different icon loads the new SVG', async () => {
    const { root } = await render(<mud-icon name="calendar" size={16} />);
    await vi.waitFor(() => expect(marker(root)).toBe('icon:outlined/calendar'));

    (root as unknown as { name: string }).name = 'umbrella';
    await vi.waitFor(() => expect(marker(root)).toBe('icon:outlined/umbrella'));
  });

  it('onVariantChange: changing variant redraws from the other style', async () => {
    const name = NAME_IN_BOTH_VARIANTS ?? ICON_NAMES[0];
    const { root } = await render(<mud-icon name={name} variant="outlined" />);
    await vi.waitFor(() => expect(marker(root)).toBe(`icon:outlined/${name}`));

    (root as unknown as { variant: string }).variant = 'filled';
    await vi.waitFor(() => expect(marker(root)).toBe(`icon:filled/${name}`));
  });

  it('changing size alone does not import again — one drawing covers every size', async () => {
    const { root, waitForChanges } = await render(<mud-icon name="calendar" size={16} />);
    await vi.waitFor(() => expect(marker(root)).toBe('icon:outlined/calendar'));
    clearSvgCaches();
    const spy = vi.spyOn(modules, 'outlined/calendar');

    (root as unknown as { size: number }).size = 32;
    await waitForChanges();

    expect(spy).not.toHaveBeenCalled();
    expect(root?.getAttribute('size')).toBe('32');
    expect(marker(root)).toBe('icon:outlined/calendar');
  });

  it('onNameChange: same-value guard (newVal === oldVal) skips reload', async () => {
    const { root, waitForChanges } = await render(<mud-icon name="calendar" />);
    await vi.waitFor(() => expect(marker(root)).toBe('icon:outlined/calendar'));
    clearSvgCaches();
    const spy = vi.spyOn(modules, 'outlined/calendar');

    // Invoke the watch handler directly with identical values to exercise the equality guard
    type WatchInstance = { onNameChange: (newVal: string, oldVal: string) => Promise<void> };
    await (root as unknown as WatchInstance).onNameChange('calendar', 'calendar');
    await waitForChanges();

    expect(spy).not.toHaveBeenCalled();
  });

  it('onVariantChange: same-value guard (newVal === oldVal) skips reload', async () => {
    const { root, waitForChanges } = await render(<mud-icon name="calendar" />);
    await vi.waitFor(() => expect(marker(root)).toBe('icon:outlined/calendar'));
    clearSvgCaches();
    const spy = vi.spyOn(modules, 'outlined/calendar');

    type WatchInstance = { onVariantChange: (newVal: string, oldVal: string) => Promise<void> };
    await (root as unknown as WatchInstance).onVariantChange('outlined', 'outlined');
    await waitForChanges();

    expect(spy).not.toHaveBeenCalled();
  });

  it('svgCacheKey guard: variant fallback to the already-loaded style skips the import', async () => {
    if (!FILLED_ONLY_NAME) return;

    const { root, waitForChanges } = await render(<mud-icon name={FILLED_ONLY_NAME} variant="filled" />);
    await vi.waitFor(() => expect(marker(root)).toBe(`icon:filled/${FILLED_ONLY_NAME}`));
    clearSvgCaches();
    const spy = vi.spyOn(modules, `filled/${FILLED_ONLY_NAME}`);

    // variant=outlined falls back to filled → same key as the loaded drawing → early return
    (root as unknown as { variant: string }).variant = 'outlined';
    await waitForChanges();

    expect(spy).not.toHaveBeenCalled();
    expect(marker(root)).toBe(`icon:filled/${FILLED_ONLY_NAME}`);
  });
});

describe('hasIconVariant', () => {
  // Named icons, not values derived from the same data the function reads —
  // otherwise the assertion restates the source instead of checking it.
  it('is true for both styles of an icon drawn in both', () => {
    expect(hasIconVariant('calendar', 'outlined')).toBe(true);
    expect(hasIconVariant('calendar', 'filled')).toBe(true);
  });

  it('is false for the style an icon is not drawn in', () => {
    expect(hasIconVariant('facebook', 'outlined')).toBe(false);
    expect(hasIconVariant('facebook', 'filled')).toBe(true);
    expect(hasIconVariant('search', 'filled')).toBe(false);
    expect(hasIconVariant('search', 'outlined')).toBe(true);
  });

  it('agrees with the manifest for every name and style', () => {
    const disagreements = ICON_NAMES.flatMap(name =>
      ICON_VARIANTS.filter(
        variant => hasIconVariant(name, variant) !== (REAL_MANIFEST[name]?.variants.includes(variant) ?? false),
      ).map(variant => `${name}/${variant}`),
    );
    expect(disagreements).toEqual([]);
  });

  it('is false for an absent name instead of throwing', () => {
    expect(hasIconVariant(undefined, 'filled')).toBe(false);
    expect(hasIconVariant('this-icon-does-not-exist', 'filled')).toBe(false);
  });

  // `manifest['constructor']` resolves through Object.prototype to a truthy
  // function, so an unguarded lookup read `.variants` off it and threw inside
  // five components' render(). Same hazard as mud-icon's own isIconName guard.
  it.each(['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty'])(
    'is false for the Object.prototype member "%s"',
    member => {
      expect(hasIconVariant(member, 'filled')).toBe(false);
      expect(hasIconVariant(member, 'outlined')).toBe(false);
    },
  );
});

describe('icons.manifest.json (public icon names)', () => {
  it('exposes the calendar family under the correct spelling', () => {
    expect(REAL_MANIFEST['calendar-add']?.variants).toEqual(['outlined']);
    expect(REAL_MANIFEST['calendar-remove']?.variants).toEqual(['outlined', 'filled']);
  });

  it('no longer exposes the misspelled "calender" names', () => {
    expect(ICON_NAMES.filter(n => n.includes('calender'))).toEqual([]);
  });

  it('no longer encodes the style in the name', () => {
    expect(ICON_NAMES.filter(n => /-(filled|fill|solid)$/.test(n))).toEqual([]);
  });
});

describe('icon asset shape (what `yarn svg:icons` normalizes to)', () => {
  const ASSETS_ROOT = path.resolve(__dirname, '../assets');

  const files = ICON_VARIANTS.flatMap(variant => {
    const dir = path.join(ASSETS_ROOT, variant);
    return fs
      .readdirSync(dir)
      .filter(name => name.endsWith('.svg'))
      .map(name => ({ rel: `${variant}/${name}`, source: fs.readFileSync(path.join(dir, name), 'utf8') }));
  });

  // Guards against a vacuous scan: a moved assets directory would make every
  // assertion below pass over an empty list.
  it('reads the whole icon set', () => {
    expect(files.length).toBe(Object.values(REAL_MANIFEST).reduce((n, e) => n + (e?.variants.length ?? 0), 0));
  });

  // `mud-icon` inlines the SVG into its shadow root, where `mud-icon.css`'s
  // `color: var(--icon-color, currentColor)` cascades into it. Paint that is not
  // `currentColor` or `none` wins over that cascade, so the icon stops answering
  // to the `color` prop — silently, and only in the themes that differ.
  it('carries no paint other than currentColor or none', () => {
    const offenders = files
      .filter(({ source }) =>
        [...source.matchAll(/\s(?:fill|stroke)="([^"]*)"/g)].some(
          ([, value]) => value !== 'currentColor' && value !== 'none',
        ),
      )
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  // The host element carries the size and the CSS stretches the svg to it, so a
  // root `width`/`height` is dead weight that contradicts the rendered size.
  it('carries no intrinsic size on the root element', () => {
    const offenders = files
      .filter(({ source }) => /<svg[^>]*\s(?:width|height)=/.test(source.slice(0, source.indexOf('>') + 1)))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  // Both styles of one icon stretch to the same host box, so a 24-grid drawing
  // beside a 16-grid one makes the glyph resize when `variant` toggles.
  it('draws both styles of an icon on the same grid', () => {
    const viewBoxOf = (rel: string) => {
      const source = files.find(f => f.rel === rel)?.source ?? '';
      return source.slice(0, source.indexOf('>') + 1).match(/viewBox="0 0 (\d+(?:\.\d+)?) /)?.[1] ?? null;
    };
    const mismatched = ICON_NAMES.filter(name => {
      if (!hasIconVariant(name, 'outlined') || !hasIconVariant(name, 'filled')) return false;
      return viewBoxOf(`outlined/${name}.svg`) !== viewBoxOf(`filled/${name}.svg`);
    });
    expect(mismatched).toEqual([]);
  });

  // Every drawing must scale from its viewBox alone — `size` is the only thing
  // that decides the rendered box now that the assets are style-keyed.
  it('carries a viewBox on every drawing', () => {
    const offenders = files
      .filter(({ source }) => !/<svg[^>]*\sviewBox="/.test(source.slice(0, source.indexOf('>') + 1)))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });
});
