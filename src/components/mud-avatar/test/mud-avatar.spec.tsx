import { render, h, describe, it, expect, vi, beforeEach, afterEach } from '@stencil/vitest';
import { setAssetPath } from '@stencil/core';

import '../mud-avatar';
import '../../mud-icon/mud-icon';

import { AVATAR_SIZES, AVATAR_TYPES } from '../mud-avatar.types';
import { deriveInitials, ICON_SIZE_FOR } from '../mud-avatar.utils';

// `mud-icon` fetches its SVGs asynchronously via `getAssetPath` + `fetch`.
// Stub both in this test environment so the avatar tests that render
// `type="icon"` don't blow up on `new URL(...)`.
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  setAssetPath('http://localhost/');
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
    const match = String(url).match(/\/(\d+)\/([^/]+)\.svg/);
    if (!match) return new Response('', { status: 404 });
    return new Response(`<svg data-name="${match[2]}" data-size="${match[1]}"></svg>`, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  });
});

afterEach(() => {
  fetchSpy.mockRestore();
});

const queryInner = (root: Element | null | undefined): Element | null =>
  (root?.shadowRoot?.querySelector('.inner') ?? null) as Element | null;

const queryInitials = (root: Element | null | undefined): Element | null =>
  (root?.shadowRoot?.querySelector('.initials') ?? null) as Element | null;

const queryPhoto = (root: Element | null | undefined): HTMLImageElement | null =>
  (root?.shadowRoot?.querySelector('img.photo') ?? null) as HTMLImageElement | null;

const queryIcon = (root: Element | null | undefined): Element | null =>
  (root?.shadowRoot?.querySelector('mud-icon') ?? null) as Element | null;

describe('deriveInitials', () => {
  it('returns empty string for empty / undefined input', () => {
    expect(deriveInitials(undefined)).toBe('');
    expect(deriveInitials('')).toBe('');
    expect(deriveInitials('   ')).toBe('');
  });

  it('returns the first letter, uppercased, for a single-word name', () => {
    expect(deriveInitials('Ion')).toBe('I');
    expect(deriveInitials('maria')).toBe('M');
    expect(deriveInitials('ștefan')).toBe('Ș');
  });

  it('returns first + last initials for two-word names', () => {
    expect(deriveInitials('Ion Popescu')).toBe('IP');
    expect(deriveInitials('Maria Pop')).toBe('MP');
    expect(deriveInitials('Andrei Ionescu')).toBe('AI');
  });

  it('skips middle names — first + last', () => {
    expect(deriveInitials('Ion Andrei Popescu')).toBe('IP');
    expect(deriveInitials('Elena Maria Dumitrescu')).toBe('ED');
  });

  it('treats hyphens as separators (compound first names collapse)', () => {
    expect(deriveInitials('Maria-Andreea Pop')).toBe('MP');
    expect(deriveInitials('Jean-Luc Picard')).toBe('JP');
  });

  it('collapses repeated whitespace', () => {
    expect(deriveInitials('Ion   Popescu')).toBe('IP');
    expect(deriveInitials('  Ion  Popescu  ')).toBe('IP');
  });
});

describe('ICON_SIZE_FOR', () => {
  it('maps every avatar size to a supported mud-icon size', () => {
    for (const size of AVATAR_SIZES) {
      expect([12, 16, 20, 24]).toContain(ICON_SIZE_FOR[size]);
    }
  });
});

describe('mud-avatar', () => {
  it('renders with default props reflected on host', async () => {
    const { root } = await render(<mud-avatar name="Ion Popescu"></mud-avatar>);

    expect(root?.getAttribute('type')).toBe('initials');
    expect(root?.getAttribute('size')).toBe('md');
    expect(root?.getAttribute('role')).toBe('img');
    expect(root?.getAttribute('aria-label')).toBe('Ion Popescu');
  });

  describe('type prop', () => {
    it.each(AVATAR_TYPES)('reflects type="%s" to the host attribute', async type => {
      const { root } = await render(
        <mud-avatar type={type} src="https://example.com/a.png" name="Ion Popescu"></mud-avatar>,
      );
      expect(root?.getAttribute('type')).toBe(type);
    });
  });

  describe('size prop', () => {
    it.each(AVATAR_SIZES)('reflects size="%s" to the host attribute', async size => {
      const { root } = await render(<mud-avatar size={size} name="Ion Popescu"></mud-avatar>);
      expect(root?.getAttribute('size')).toBe(size);
    });
  });

  describe('type="initials" rendering', () => {
    it('renders 2-letter initials derived from `name`', async () => {
      const { root } = await render(<mud-avatar type="initials" name="Ion Popescu"></mud-avatar>);
      const initials = queryInitials(root);
      expect(initials).toBeTruthy();
      expect(initials?.textContent).toBe('IP');
    });

    it('prefers explicit `initials` over `name`', async () => {
      const { root } = await render(<mud-avatar type="initials" name="Ion Popescu" initials="AB"></mud-avatar>);
      expect(queryInitials(root)?.textContent).toBe('AB');
    });

    it('trims initials to two characters', async () => {
      const { root } = await render(<mud-avatar type="initials" initials="ABCDE"></mud-avatar>);
      expect(queryInitials(root)?.textContent).toBe('AB');
    });

    it('uppercases lowercase initials', async () => {
      const { root } = await render(<mud-avatar type="initials" initials="ab"></mud-avatar>);
      expect(queryInitials(root)?.textContent).toBe('AB');
    });

    it('marks the initials span as aria-hidden', async () => {
      const { root } = await render(<mud-avatar type="initials" name="Ion Popescu"></mud-avatar>);
      expect(queryInitials(root)?.getAttribute('aria-hidden')).toBe('true');
    });

    it('falls back to the icon when neither name nor initials are provided', async () => {
      const { root } = await render(<mud-avatar type="initials" aria-label="User"></mud-avatar>);
      expect(queryInitials(root)).toBeNull();
      expect(queryIcon(root)).toBeTruthy();
    });
  });

  describe('type="photo" rendering', () => {
    it('renders an <img> with src and alt', async () => {
      const { root } = await render(
        <mud-avatar type="photo" src="https://example.com/ion.png" name="Ion Popescu"></mud-avatar>,
      );
      const img = queryPhoto(root);
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe('https://example.com/ion.png');
      expect(img?.getAttribute('alt')).toBe('Ion Popescu');
    });

    it('uses explicit alt when provided', async () => {
      const { root } = await render(
        <mud-avatar
          type="photo"
          src="https://example.com/a.png"
          alt="Avatar al lui Ion"
          name="Ion Popescu"
        ></mud-avatar>,
      );
      expect(queryPhoto(root)?.getAttribute('alt')).toBe('Avatar al lui Ion');
    });

    it('accepts an empty alt to mark the photo as decorative', async () => {
      const { root } = await render(<mud-avatar type="photo" src="https://example.com/a.png" alt=""></mud-avatar>);
      expect(queryPhoto(root)?.getAttribute('alt')).toBe('');
    });

    it('falls back to initials when `src` is missing', async () => {
      const { root } = await render(<mud-avatar type="photo" name="Ion Popescu"></mud-avatar>);
      expect(queryPhoto(root)).toBeNull();
      expect(queryInitials(root)?.textContent).toBe('IP');
    });

    it('falls back to the icon when `src` is missing AND no name', async () => {
      const { root } = await render(<mud-avatar type="photo" aria-label="User"></mud-avatar>);
      expect(queryPhoto(root)).toBeNull();
      expect(queryIcon(root)).toBeTruthy();
    });
  });

  describe('type="icon" rendering', () => {
    it('renders the default person icon', async () => {
      const { root } = await render(<mud-avatar type="icon" aria-label="User"></mud-avatar>);
      const icon = queryIcon(root) as (Element & { name?: string }) | null;
      expect(icon).toBeTruthy();
      // `name` is not a reflected attribute on mud-icon — assert via the JS property.
      expect(icon?.name).toBe('person');
    });

    it('respects a custom icon-name', async () => {
      const { root } = await render(<mud-avatar type="icon" iconName="shield-user" aria-label="Admin"></mud-avatar>);
      const icon = queryIcon(root) as (Element & { name?: string }) | null;
      expect(icon?.name).toBe('shield-user');
    });

    it.each(AVATAR_SIZES)('scales the icon to the right size for size="%s"', async size => {
      const { root } = await render(<mud-avatar type="icon" size={size} aria-label="User"></mud-avatar>);
      const expected = String(ICON_SIZE_FOR[size]);
      expect(queryIcon(root)?.getAttribute('size')).toBe(expected);
    });
  });

  describe('accessibility', () => {
    it('exposes role="img" on the host', async () => {
      const { root } = await render(<mud-avatar name="Ion Popescu"></mud-avatar>);
      expect(root?.getAttribute('role')).toBe('img');
    });

    it('uses `aria-label` override when provided', async () => {
      const { root } = await render(
        <mud-avatar name="Ion Popescu" ariaLabel="Coleg cu rol de administrator"></mud-avatar>,
      );
      expect(root?.getAttribute('aria-label')).toBe('Coleg cu rol de administrator');
    });

    it('falls back to `name` when no aria-label is provided', async () => {
      const { root } = await render(<mud-avatar name="Maria Pop"></mud-avatar>);
      expect(root?.getAttribute('aria-label')).toBe('Maria Pop');
    });

    it('falls back to "Avatar for XX" when only initials are set', async () => {
      const { root } = await render(<mud-avatar initials="AB"></mud-avatar>);
      expect(root?.getAttribute('aria-label')).toBe('Avatar for AB');
    });

    it('falls back to "User avatar" when nothing is set', async () => {
      const { root } = await render(<mud-avatar type="icon"></mud-avatar>);
      expect(root?.getAttribute('aria-label')).toBe('User avatar');
    });
  });

  describe('badge slot', () => {
    it('renders a slotted badge child', async () => {
      const { root } = await render(
        <mud-avatar type="initials" name="Ion Popescu">
          <span slot="badge" id="notif-badge">
            3
          </span>
        </mud-avatar>,
      );
      const slot = root?.shadowRoot?.querySelector('slot[name="badge"]') as HTMLSlotElement | null;
      expect(slot).toBeTruthy();
      const assigned = slot?.assignedElements({ flatten: true });
      expect(assigned?.[0]?.id).toBe('notif-badge');
    });

    it('renders without a badge when none is slotted', async () => {
      const { root } = await render(<mud-avatar type="initials" name="Ion Popescu"></mud-avatar>);
      const slot = root?.shadowRoot?.querySelector('slot[name="badge"]') as HTMLSlotElement | null;
      expect(slot).toBeTruthy();
      expect(slot?.assignedElements().length ?? 0).toBe(0);
    });
  });

  describe('shadow structure', () => {
    it('renders a single `.inner` wrapper', async () => {
      const { root } = await render(<mud-avatar name="Ion Popescu"></mud-avatar>);
      expect(queryInner(root)).toBeTruthy();
    });

    it('applies the resolved-mode class on `.inner` (initials)', async () => {
      const { root } = await render(<mud-avatar type="initials" name="Ion Popescu"></mud-avatar>);
      expect(queryInner(root)?.classList.contains('type-initials')).toBe(true);
    });

    it('applies the resolved-mode class on `.inner` (photo)', async () => {
      const { root } = await render(
        <mud-avatar type="photo" src="https://example.com/a.png" name="Ion Popescu"></mud-avatar>,
      );
      expect(queryInner(root)?.classList.contains('type-photo')).toBe(true);
    });

    it('applies the resolved-mode class on `.inner` (icon)', async () => {
      const { root } = await render(<mud-avatar type="icon" aria-label="User"></mud-avatar>);
      expect(queryInner(root)?.classList.contains('type-icon')).toBe(true);
    });
  });
});
