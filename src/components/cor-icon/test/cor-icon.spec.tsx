import { render, h, describe, it, expect, vi, beforeEach, afterEach } from '@stencil/vitest';

import '../cor-icon';
import manifest from '../assets/icons.manifest.json';
import { resolveIcon } from '../cor-icon.providers';
import type { IconRegistry } from '../cor-icon.types';

const ICON_NAMES = Object.keys(manifest);
const NAME_WITH_ALL_SIZES = ICON_NAMES.find(
  n => (manifest as Record<string, { sizes: number[] }>)[n].sizes.length === 4,
);
const NAME_PARTIAL_SIZES = ICON_NAMES.find(n => {
  const s = (manifest as Record<string, { sizes: number[] }>)[n].sizes;
  return s.length > 0 && s.length < 4;
});

describe('cor-icon', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('renders with default props (size=16, name="check")', async () => {
    // "check" may or may not exist in the real registry; pick the first real name as default for the test
    const defaultName = ICON_NAMES[0];
    const { root } = await render(<cor-icon name={defaultName} />);

    expect(root?.getAttribute('size')).toBe('16');
    expect(root?.getAttribute('color')).toBe('icon-base-secondary');
    expect(root?.shadowRoot?.querySelector('.svg-icon')).toBeTruthy();
  });

  it('reflects size to the host attribute', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<cor-icon name={name} size={24} />);
    expect(root?.getAttribute('size')).toBe('24');
  });

  it('reflects interactive + disabled flags', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<cor-icon name={name} interactive disabled />);
    expect(root?.hasAttribute('interactive')).toBe(true);
    expect(root?.hasAttribute('disabled')).toBe(true);
  });

  it('treats absent ariaLabel as decorative (aria-hidden on host)', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<cor-icon name={name} />);
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.hasAttribute('aria-label')).toBe(false);
  });

  it('announces with ariaLabel when provided', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<cor-icon name={name} aria-label="Confirm" />);
    expect(root?.getAttribute('aria-label')).toBe('Confirm');
    expect(root?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('adds button role + tabindex on host when interactive and not disabled', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<cor-icon name={name} interactive />);
    expect(root?.getAttribute('role')).toBe('button');
    expect(root?.getAttribute('tabindex')).toBe('0');
    expect(root?.hasAttribute('aria-disabled')).toBe(false);
  });

  it('announces aria-disabled and drops tabindex when interactive + disabled', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<cor-icon name={name} interactive disabled />);
    expect(root?.getAttribute('role')).toBe('button');
    expect(root?.getAttribute('aria-disabled')).toBe('true');
    expect(root?.getAttribute('tabindex')).toBeFalsy();
  });

  it('logs a warning and renders nothing when the name is unknown', async () => {
    const { root } = await render(<cor-icon name="this-icon-does-not-exist" />);
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.children.length ?? 0).toBe(0);
  });

  it('renders inline SVG markup in shadow DOM for a known icon', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<cor-icon name={name} size={24} />);
    const innerHtml = root?.shadowRoot?.querySelector('.svg-icon')?.innerHTML ?? '';
    expect(innerHtml.toLowerCase()).toContain('<svg');
  });
});

describe('resolveIcon (provider fallback)', () => {
  const registry: IconRegistry = {
    sun: {
      sizes: [16, 24],
      svgs: {
        16: '<svg data-marker="sun-16"></svg>',
        24: '<svg data-marker="sun-24"></svg>',
      },
    },
    moon: {
      sizes: [12],
      svgs: {
        12: '<svg data-marker="moon-12"></svg>',
      },
    },
  };

  it('returns an exact-size match when available', () => {
    const r = resolveIcon('sun', 16, registry);
    expect(r?.resolvedSize).toBe(16);
    expect(r?.svg).toContain('sun-16');
  });

  it('falls back UP to the next larger size when the requested size is missing', () => {
    // sun has 16 + 24; requesting 20 should pick 24 (next larger)
    const r = resolveIcon('sun', 20, registry);
    expect(r?.resolvedSize).toBe(24);
  });

  it('falls back DOWN to the largest smaller size when no larger size exists', () => {
    // moon only has 12; requesting 24 should pick 12
    const r = resolveIcon('moon', 24, registry);
    expect(r?.resolvedSize).toBe(12);
  });

  it('falls back UP rather than DOWN when both options exist', () => {
    // sun has 16 + 24; requesting 12 should prefer 16 over none-larger fallback path
    const r = resolveIcon('sun', 12, registry);
    expect(r?.resolvedSize).toBe(16);
  });

  it('returns undefined for unknown names', () => {
    const r = resolveIcon('unknown', 16, registry);
    expect(r).toBeUndefined();
  });

  // Sanity check against the real generated registry — at least one icon should resolve.
  it('resolves an icon from the real generated registry', () => {
    if (!ICON_NAMES.length) return;
    const name = NAME_WITH_ALL_SIZES ?? ICON_NAMES[0];
    const r = resolveIcon(name, 24);
    expect(r?.svg).toBeTruthy();
  });

  it('exercises fallback against the real registry when partial sizes exist', () => {
    if (!NAME_PARTIAL_SIZES) return;
    const entry = (manifest as Record<string, { sizes: number[] }>)[NAME_PARTIAL_SIZES];
    const allSizes = [12, 16, 20, 24];
    const missing = allSizes.find(s => !entry.sizes.includes(s)) as 12 | 16 | 20 | 24 | undefined;
    if (!missing) return;
    const r = resolveIcon(NAME_PARTIAL_SIZES, missing);
    expect(r?.svg).toBeTruthy();
    expect(r?.resolvedSize).not.toBe(missing);
  });
});
