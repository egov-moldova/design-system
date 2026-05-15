import { newSpecPage } from '@stencil/core/testing';
import { CorChip } from '../cor-chip';

// Suppress expected accessibility warning for chips without content
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    const message = args[0]?.toString() ?? '';
    if (message.includes('[cor-chip] No accessible name provided')) {
      return;
    }
    originalWarn.apply(console, args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});

describe('cor-chip', () => {
  // ============================================================================
  // SLOT CONTENT INITIALIZATION TESTS
  // ============================================================================

  describe('slot content initialization', () => {
    it('shows label and default content on initial render', async () => {
      const { root, waitForChanges } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <span slot="label">Muted</span>
            Primary
          </cor-chip>
        `,
      });

      await waitForChanges();

      const content = root?.shadowRoot?.querySelector('.chip__content');
      const labelSlot = root?.shadowRoot?.querySelector('slot[name="label"]') as HTMLSlotElement | null;
      const defaultSlot = root?.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement | null;

      expect(content?.classList.contains('chip__content--empty')).toBe(false);
      expect(labelSlot?.assignedNodes({ flatten: true }).length).toBeGreaterThan(0);
      expect(defaultSlot?.assignedNodes({ flatten: true }).length).toBeGreaterThan(0);
    });

    it('treats empty label and default slot elements as empty content', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <span slot="label"></span>
            <span></span>
          </cor-chip>
        `,
      });

      const content = root?.shadowRoot?.querySelector('.chip__content');

      expect(content?.classList.contains('chip__content--empty')).toBe(true);
    });

    it('hides the content wrapper when no label or default content is provided', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip></cor-chip>',
      });

      const content = root?.shadowRoot?.querySelector('.chip__content');
      expect(content?.classList.contains('chip__content--empty')).toBe(true);
    });

    it('detects text content in default slot', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Text Content</cor-chip>',
      });

      const textSpan = root?.shadowRoot?.querySelector('.chip__text');
      expect(textSpan?.classList.contains('chip__text--empty')).toBe(false);
    });

    it('detects custom element content in slots', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <span slot="label"><custom-element></custom-element></span>
          </cor-chip>
        `,
      });

      const labelSpan = root?.shadowRoot?.querySelector('.chip__label');
      expect(labelSpan?.classList.contains('chip__label--empty')).toBe(false);
    });
  });

  // ============================================================================
  // PROP TESTS
  // ============================================================================

  describe('props', () => {
    it('has default size of lg', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip></cor-chip>',
      });

      expect(root?.getAttribute('size')).toBe('lg');
    });

    it('reflects size prop to attribute', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip size="sm"></cor-chip>',
      });

      expect(root?.getAttribute('size')).toBe('sm');
    });

    it('reflects active prop to attribute', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip active></cor-chip>',
      });

      expect(root?.hasAttribute('active')).toBe(true);
    });

    it('reflects disabled prop to attribute', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip disabled></cor-chip>',
      });

      expect(root?.hasAttribute('disabled')).toBe(true);
    });

    it('reflects skeleton prop to attribute', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip skeleton></cor-chip>',
      });

      expect(root?.hasAttribute('skeleton')).toBe(true);
    });

    it('reflects error prop to attribute', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip error></cor-chip>',
      });

      expect(root?.hasAttribute('error')).toBe(true);
    });

    it('sets aria-label on chip button', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip aria-label="Custom Label">Content</cor-chip>',
      });

      const chip = root?.shadowRoot?.querySelector('.chip');
      expect(chip?.getAttribute('aria-label')).toBe('Custom Label');
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('accessibility', () => {
    it('has button role', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Content</cor-chip>',
      });

      const chip = root?.shadowRoot?.querySelector('.chip');
      expect(chip?.getAttribute('role')).toBe('button');
    });

    it('has tabindex 0 when enabled', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Content</cor-chip>',
      });

      const chip = root?.shadowRoot?.querySelector('.chip');
      expect(chip?.getAttribute('tabindex')).toBe('0');
    });

    it('has tabindex -1 when disabled', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip disabled>Content</cor-chip>',
      });

      const chip = root?.shadowRoot?.querySelector('.chip');
      expect(chip?.getAttribute('tabindex')).toBe('-1');
    });

    it('sets aria-pressed true when active', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip active>Content</cor-chip>',
      });

      const chip = root?.shadowRoot?.querySelector('.chip');
      expect(chip?.getAttribute('aria-pressed')).toBe('true');
    });

    it('sets aria-pressed false when not active', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Content</cor-chip>',
      });

      const chip = root?.shadowRoot?.querySelector('.chip');
      expect(chip?.getAttribute('aria-pressed')).toBe('false');
    });

    it('sets aria-disabled when disabled', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip disabled>Content</cor-chip>',
      });

      const chip = root?.shadowRoot?.querySelector('.chip');
      expect(chip?.getAttribute('aria-disabled')).toBe('true');
    });

    it('does not set aria-disabled when enabled', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Content</cor-chip>',
      });

      const chip = root?.shadowRoot?.querySelector('.chip');
      expect(chip?.hasAttribute('aria-disabled')).toBe(false);
    });
  });

  // ============================================================================
  // EVENT TESTS
  // ============================================================================

  describe('events', () => {
    it('emits corChipClick when clicked', async () => {
      const { root, waitForChanges } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Chip Label</cor-chip>',
      });

      await waitForChanges();

      const clickSpy = jest.fn();
      root?.addEventListener('corChipClick', clickSpy);

      const chip = root?.shadowRoot?.querySelector('.chip');
      chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy.mock.calls[0][0].detail).toEqual({ label: 'Chip Label' });
    });

    it('does not emit corChipClick when disabled', async () => {
      const { root, waitForChanges } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip disabled>Chip Label</cor-chip>',
      });

      await waitForChanges();

      const clickSpy = jest.fn();
      root?.addEventListener('corChipClick', clickSpy);

      const chip = root?.shadowRoot?.querySelector('.chip');
      chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('does not emit corChipClick when skeleton', async () => {
      const { root, waitForChanges } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip skeleton>Chip Label</cor-chip>',
      });

      await waitForChanges();

      const clickSpy = jest.fn();
      root?.addEventListener('corChipClick', clickSpy);

      // Skeleton mode renders different structure - no .chip element
      // Click on host should not emit
      root?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('prevents default when disabled', async () => {
      const { root, waitForChanges } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip disabled>Chip Label</cor-chip>',
      });

      await waitForChanges();

      const chip = root?.shadowRoot?.querySelector('.chip');
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      chip?.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // KEYBOARD INTERACTION TESTS
  // ============================================================================

  describe('keyboard interaction', () => {
    it('handles Enter key to trigger click', async () => {
      const { root, waitForChanges } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Chip Label</cor-chip>',
      });

      await waitForChanges();

      const clickSpy = jest.fn();
      root?.addEventListener('corChipClick', clickSpy);

      const chip = root?.shadowRoot?.querySelector('.chip');
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      chip?.dispatchEvent(event);

      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('handles Space key to trigger click', async () => {
      const { root, waitForChanges } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Chip Label</cor-chip>',
      });

      await waitForChanges();

      const clickSpy = jest.fn();
      root?.addEventListener('corChipClick', clickSpy);

      const chip = root?.shadowRoot?.querySelector('.chip');
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      chip?.dispatchEvent(event);

      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('prevents default on Enter/Space', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Chip Label</cor-chip>',
      });

      const chip = root?.shadowRoot?.querySelector('.chip');
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      chip?.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('ignores other keys for click trigger', async () => {
      const { root, waitForChanges } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Chip Label</cor-chip>',
      });

      await waitForChanges();

      const clickSpy = jest.fn();
      root?.addEventListener('corChipClick', clickSpy);

      const chip = root?.shadowRoot?.querySelector('.chip');
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      chip?.dispatchEvent(event);

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // MOUSE INTERACTION TESTS
  // ============================================================================

  describe('mouse interaction', () => {
    it('adds chip--pressed class on mousedown', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Content</cor-chip>',
      });

      root?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(root?.classList.contains('chip--pressed')).toBe(true);
    });

    it('removes chip--pressed class on mouseup', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Content</cor-chip>',
      });

      root?.classList.add('chip--pressed');
      root?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      expect(root?.classList.contains('chip--pressed')).toBe(false);
    });

    it('removes chip--pressed class on mouseleave', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip>Content</cor-chip>',
      });

      root?.classList.add('chip--pressed');
      root?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      expect(root?.classList.contains('chip--pressed')).toBe(false);
    });

    it('does not add chip--pressed when disabled', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip disabled>Content</cor-chip>',
      });

      root?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(root?.classList.contains('chip--pressed')).toBe(false);
    });

    it('does not add chip--pressed when skeleton', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip skeleton>Content</cor-chip>',
      });

      root?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(root?.classList.contains('chip--pressed')).toBe(false);
    });
  });

  // ============================================================================
  // SKELETON MODE TESTS
  // ============================================================================

  describe('skeleton mode', () => {
    it('renders cor-skeleton when skeleton prop is true', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip skeleton>Content</cor-chip>',
      });

      const skeleton = root?.shadowRoot?.querySelector('cor-skeleton');
      expect(skeleton).toBeTruthy();
    });

    it('does not render chip content when skeleton', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip skeleton>Content</cor-chip>',
      });

      const chip = root?.shadowRoot?.querySelector('.chip');
      expect(chip).toBeFalsy();
    });

    it('sets aria-busy on host in skeleton mode', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip skeleton>Content</cor-chip>',
      });

      expect(root?.getAttribute('aria-busy')).toBe('true');
    });

    it('sets default aria-label in skeleton mode', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip skeleton>Content</cor-chip>',
      });

      expect(root?.getAttribute('aria-label')).toBe('Loading');
    });

    it('uses custom aria-label in skeleton mode when provided', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip skeleton aria-label="Custom Loading">Content</cor-chip>',
      });

      expect(root?.getAttribute('aria-label')).toBe('Custom Loading');
    });

    it('renders correct skeleton size for lg', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip skeleton size="lg">Content</cor-chip>',
      });

      const skeleton = root?.shadowRoot?.querySelector('cor-skeleton');
      expect(skeleton?.getAttribute('width')).toBe('150px');
      expect(skeleton?.getAttribute('height')).toBe('32px');
      expect(skeleton?.getAttribute('border-radius')).toBe('12px');
    });

    it('renders correct skeleton size for md', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip skeleton size="md">Content</cor-chip>',
      });

      const skeleton = root?.shadowRoot?.querySelector('cor-skeleton');
      expect(skeleton?.getAttribute('width')).toBe('150px');
      expect(skeleton?.getAttribute('height')).toBe('24px');
      expect(skeleton?.getAttribute('border-radius')).toBe('8px');
    });

    it('renders correct skeleton size for sm', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: '<cor-chip skeleton size="sm">Content</cor-chip>',
      });

      const skeleton = root?.shadowRoot?.querySelector('cor-skeleton');
      expect(skeleton?.getAttribute('width')).toBe('106px');
      expect(skeleton?.getAttribute('height')).toBe('20px');
      expect(skeleton?.getAttribute('border-radius')).toBe('4px');
    });
  });

  // ============================================================================
  // SLOT VALIDATION TESTS
  // ============================================================================

  describe('slot validation', () => {
    it('shows error for invalid icon-left tag', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <span slot="icon-left">Invalid</span>
          </cor-chip>
        `,
      });

      const errorMessage = root?.shadowRoot?.textContent;
      expect(errorMessage).toContain('is invalid');
      expect(errorMessage).toContain('cor-icon');
    });

    it('shows error for invalid icon-right tag', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <div slot="icon-right">Invalid</div>
          </cor-chip>
        `,
      });

      const errorMessage = root?.shadowRoot?.textContent;
      expect(errorMessage).toContain('is invalid');
      expect(errorMessage).toContain('cor-icon');
    });

    it('shows error for invalid pre-content tag', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <span slot="pre-content">Invalid</span>
          </cor-chip>
        `,
      });

      const errorMessage = root?.shadowRoot?.textContent;
      expect(errorMessage).toContain('is invalid');
      expect(errorMessage).toContain('cor-avatar');
    });
  });

  // ============================================================================
  // ICON WRAP BEHAVIOR TESTS
  // ============================================================================

  describe('icon wrap behavior', () => {
    it('creates clickable icon wrap when icon has data-clickable attribute', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <cor-icon slot="icon-left" data-clickable data-icon-label="Close"></cor-icon>
          </cor-chip>
        `,
      });

      const iconWrap = root?.shadowRoot?.querySelector('.chip__icon-wrap--left');
      expect(iconWrap).toBeTruthy();
      expect(iconWrap?.getAttribute('role')).toBe('button');
    });

    it('does not create icon wrap when icon lacks onclick', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <cor-icon slot="icon-left"></cor-icon>
          </cor-chip>
        `,
      });

      const iconWrap = root?.shadowRoot?.querySelector('.chip__icon-wrap');
      expect(iconWrap).toBeFalsy();
    });

    it('icon wrap has correct aria-label from data attribute', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <cor-icon slot="icon-left" data-clickable data-icon-label="Remove"></cor-icon>
          </cor-chip>
        `,
      });

      const iconWrap = root?.shadowRoot?.querySelector('.chip__icon-wrap--left');
      expect(iconWrap?.getAttribute('aria-label')).toBe('Remove');
    });

    it('icon wrap has tabindex -1 when chip is disabled', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip disabled>
            <cor-icon slot="icon-left" data-clickable></cor-icon>
          </cor-chip>
        `,
      });

      const iconWrap = root?.shadowRoot?.querySelector('.chip__icon-wrap--left');
      expect(iconWrap?.getAttribute('tabindex')).toBe('-1');
    });

    it('icon wrap has tabindex 0 when chip is enabled', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <cor-icon slot="icon-left" data-clickable></cor-icon>
          </cor-chip>
        `,
      });

      const iconWrap = root?.shadowRoot?.querySelector('.chip__icon-wrap--left');
      expect(iconWrap?.getAttribute('tabindex')).toBe('0');
    });

    it('does not trigger chip click when icon wrap is clicked', async () => {
      const { root, waitForChanges } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <cor-icon slot="icon-left" data-clickable data-icon-label="Close"></cor-icon>
          </cor-chip>
        `,
      });

      await waitForChanges();

      const clickSpy = jest.fn();
      root?.addEventListener('corChipClick', clickSpy);

      const iconWrap = root?.shadowRoot?.querySelector('.chip__icon-wrap--left');
      iconWrap?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('icon wrap handles Enter key', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <cor-icon slot="icon-left" data-clickable></cor-icon>
          </cor-chip>
        `,
      });

      const iconWrap = root?.shadowRoot?.querySelector('.chip__icon-wrap--left') as HTMLElement;
      const clickSpy = jest.spyOn(iconWrap, 'click');

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      iconWrap?.dispatchEvent(event);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('icon wrap handles Space key', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <cor-icon slot="icon-left" data-clickable></cor-icon>
          </cor-chip>
        `,
      });

      const iconWrap = root?.shadowRoot?.querySelector('.chip__icon-wrap--left') as HTMLElement;
      const clickSpy = jest.spyOn(iconWrap, 'click');

      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      iconWrap?.dispatchEvent(event);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('icon wrap stops propagation on mousedown', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip>
            <cor-icon slot="icon-left" data-clickable></cor-icon>
          </cor-chip>
        `,
      });

      const iconWrap = root?.shadowRoot?.querySelector('.chip__icon-wrap--left');
      const event = new MouseEvent('mousedown', { bubbles: true });
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

      iconWrap?.dispatchEvent(event);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // STATE PROPAGATION TESTS
  // ============================================================================

  describe('state propagation to slotted elements', () => {
    it('propagates disabled to slotted icon-left', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip disabled>
            <cor-icon slot="icon-left" id="test-icon"></cor-icon>
          </cor-chip>
        `,
      });

      const icon = root?.querySelector('#test-icon');
      expect(icon?.hasAttribute('disabled')).toBe(true);
    });

    it('propagates disabled to slotted icon-right', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip disabled>
            <cor-icon slot="icon-right" id="test-icon"></cor-icon>
          </cor-chip>
        `,
      });

      const icon = root?.querySelector('#test-icon');
      expect(icon?.hasAttribute('disabled')).toBe(true);
    });

    it('removes disabled from slotted icon when chip enabled', async () => {
      const { root, waitForChanges } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip disabled>
            <cor-icon slot="icon-left" id="test-icon"></cor-icon>
          </cor-chip>
        `,
      });

      const icon = root?.querySelector('#test-icon');
      expect(icon?.hasAttribute('disabled')).toBe(true);

      root?.removeAttribute('disabled');
      await waitForChanges();

      expect(icon?.hasAttribute('disabled')).toBe(false);
    });

    it('propagates active to slotted pre-content (avatar)', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip active>
            <cor-avatar slot="pre-content" id="test-avatar"></cor-avatar>
          </cor-chip>
        `,
      });

      const avatar = root?.querySelector('#test-avatar');
      expect(avatar?.hasAttribute('active')).toBe(true);
    });

    it('propagates disabled to slotted pre-content (avatar)', async () => {
      const { root } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip disabled>
            <cor-avatar slot="pre-content" id="test-avatar"></cor-avatar>
          </cor-chip>
        `,
      });

      const avatar = root?.querySelector('#test-avatar');
      expect(avatar?.hasAttribute('disabled')).toBe(true);
    });

    it('removes active from slotted avatar when chip not active', async () => {
      const { root, waitForChanges } = await newSpecPage({
        components: [CorChip],
        html: `
          <cor-chip active>
            <cor-avatar slot="pre-content" id="test-avatar"></cor-avatar>
          </cor-chip>
        `,
      });

      const avatar = root?.querySelector('#test-avatar');
      expect(avatar?.hasAttribute('active')).toBe(true);

      root?.removeAttribute('active');
      await waitForChanges();

      expect(avatar?.hasAttribute('active')).toBe(false);
    });
  });
});
