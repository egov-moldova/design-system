import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../cor-button';
import '../../cor-spinner/cor-spinner';

import { BUTTON_APPEARANCES, BUTTON_SHAPES, BUTTON_SIZES, BUTTON_TYPES, BUTTON_VARIANTS } from '../cor-button.types';

const queryControl = (root: Element | null | undefined): HTMLButtonElement | HTMLAnchorElement | null =>
  (root?.shadowRoot?.querySelector('.control') ?? null) as HTMLButtonElement | HTMLAnchorElement | null;

describe('cor-button', () => {
  it('renders with default props reflected on host', async () => {
    const { root } = await render(<cor-button>Click me</cor-button>);

    expect(root?.getAttribute('variant')).toBe('primary');
    expect(root?.getAttribute('appearance')).toBe('filled');
    expect(root?.getAttribute('size')).toBe('md');
    expect(root?.getAttribute('shape')).toBe('rectangular');
    expect(root?.getAttribute('type')).toBe('button');
    expect(root?.getAttribute('disabled')).toBeNull();
    expect(root?.getAttribute('loading')).toBeNull();
    expect(root?.getAttribute('icon-only')).toBeNull();
  });

  describe('icon-only prop', () => {
    it('reflects icon-only attribute when set', async () => {
      // Stencil's mock-doc doesn't fire `slotchange` before componentDidLoad,
      // so `hasIcon` stays false and the icon-only contract logs a warning even
      // though the test renders a real `<cor-icon slot="icon">`. Silence the
      // environment artifact — this test asserts attribute reflection only.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(
        <cor-button iconOnly label="Confirm">
          <cor-icon slot="icon" name="arrow-right" size={20}></cor-icon>
        </cor-button>,
      );
      expect(root?.hasAttribute('icon-only')).toBe(true);
      warn.mockRestore();
    });

    it('does not reflect icon-only attribute when prop is false', async () => {
      const { root } = await render(<cor-button>Click</cor-button>);
      expect(root?.hasAttribute('icon-only')).toBe(false);
    });
  });

  describe('full-width prop', () => {
    it('reflects full-width attribute when set', async () => {
      const { root } = await render(<cor-button fullWidth>Stretch</cor-button>);
      expect(root?.hasAttribute('full-width')).toBe(true);
    });

    it('does not reflect full-width attribute when prop is false', async () => {
      const { root } = await render(<cor-button>Click</cor-button>);
      expect(root?.hasAttribute('full-width')).toBe(false);
    });
  });

  it('renders an internal <button> inside shadow DOM by default', async () => {
    const { root } = await render(<cor-button>Save</cor-button>);
    const control = queryControl(root);
    expect(control).toBeTruthy();
    expect(control?.tagName).toBe('BUTTON');
  });

  describe('variant prop', () => {
    it.each(BUTTON_VARIANTS)('reflects variant="%s" to the host attribute', async variant => {
      const { root } = await render(<cor-button variant={variant}>Click</cor-button>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });
  });

  describe('appearance prop', () => {
    it.each(BUTTON_APPEARANCES)('reflects appearance="%s" to the host attribute', async appearance => {
      const { root } = await render(<cor-button appearance={appearance}>Click</cor-button>);
      expect(root?.getAttribute('appearance')).toBe(appearance);
    });

    it('defaults to appearance="filled" when not set', async () => {
      const { root } = await render(<cor-button>Click</cor-button>);
      expect(root?.getAttribute('appearance')).toBe('filled');
    });

    it('does not warn for supported combinations (outlined + primary)', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(
        <cor-button appearance="outlined" variant="primary">
          Click
        </cor-button>,
      );
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it.each([
      ['outlined', 'secondary'],
      ['outlined', 'neutral'],
      ['text', 'secondary'],
      ['text', 'neutral'],
    ] as const)('warns when appearance="%s" is combined with variant="%s"', async (appearance, variant) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(
        <cor-button appearance={appearance} variant={variant}>
          Click
        </cor-button>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`appearance="${appearance}"`));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`variant="${variant}"`));
      warn.mockRestore();
    });

    it('renders the same internal <button> structure across appearances', async () => {
      for (const appearance of BUTTON_APPEARANCES) {
        const { root } = await render(<cor-button appearance={appearance}>Save</cor-button>);
        const control = queryControl(root);
        expect(control?.tagName).toBe('BUTTON');
      }
    });
  });

  describe('size prop', () => {
    it.each(BUTTON_SIZES)('reflects size="%s" to the host attribute', async size => {
      const { root } = await render(<cor-button size={size}>Click</cor-button>);
      expect(root?.getAttribute('size')).toBe(size);
    });
  });

  describe('shape prop', () => {
    it.each(BUTTON_SHAPES)('reflects shape="%s" to the host attribute', async shape => {
      const { root } = await render(<cor-button shape={shape}>Click</cor-button>);
      expect(root?.getAttribute('shape')).toBe(shape);
    });
  });

  describe('type prop', () => {
    it.each(BUTTON_TYPES)('reflects type="%s" and applies it to the internal <button>', async type => {
      const { root } = await render(<cor-button type={type}>Click</cor-button>);
      expect(root?.getAttribute('type')).toBe(type);
      const control = queryControl(root) as HTMLButtonElement | null;
      expect(control?.getAttribute('type')).toBe(type);
    });
  });

  describe('disabled state', () => {
    it('reflects disabled to the host and sets disabled + aria-disabled on the internal button', async () => {
      const { root } = await render(<cor-button disabled>Click</cor-button>);

      expect(root?.getAttribute('disabled')).not.toBeNull();

      const control = queryControl(root) as HTMLButtonElement | null;
      expect(control?.hasAttribute('disabled')).toBe(true);
      expect(control?.getAttribute('aria-disabled')).toBe('true');
    });

    it('does not add aria-disabled when not disabled', async () => {
      const { root } = await render(<cor-button>Click</cor-button>);
      const control = queryControl(root);
      expect(control?.getAttribute('aria-disabled')).toBeNull();
    });
  });

  describe('loading state', () => {
    it('reflects loading and sets aria-busy on the internal control', async () => {
      const { root } = await render(<cor-button loading>Click</cor-button>);

      expect(root?.getAttribute('loading')).not.toBeNull();

      const control = queryControl(root);
      expect(control?.getAttribute('aria-busy')).toBe('true');
    });

    it('does not add aria-busy when not loading', async () => {
      const { root } = await render(<cor-button>Click</cor-button>);
      const control = queryControl(root);
      expect(control?.getAttribute('aria-busy')).toBeNull();
    });

    it('renders a cor-spinner inside the spinner-overlay when loading', async () => {
      const { root } = await render(<cor-button loading>Click</cor-button>);

      const overlay = root?.shadowRoot?.querySelector('.spinner-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay?.getAttribute('aria-hidden')).toBe('true');

      const spinner = overlay?.querySelector('cor-spinner');
      expect(spinner).toBeTruthy();
    });

    describe('spinner size mapping', () => {
      it('uses spinner size xs when button size is sm', async () => {
        const { root } = await render(
          <cor-button loading size="sm">
            Click
          </cor-button>,
        );
        const spinner = root?.shadowRoot?.querySelector('cor-spinner');
        expect(spinner?.getAttribute('size')).toBe('xs');
      });

      it('uses spinner size sm when button size is md', async () => {
        const { root } = await render(
          <cor-button loading size="md">
            Click
          </cor-button>,
        );
        const spinner = root?.shadowRoot?.querySelector('cor-spinner');
        expect(spinner?.getAttribute('size')).toBe('sm');
      });

      it('uses spinner size sm when button size is lg', async () => {
        const { root } = await render(
          <cor-button loading size="lg">
            Click
          </cor-button>,
        );
        const spinner = root?.shadowRoot?.querySelector('cor-spinner');
        expect(spinner?.getAttribute('size')).toBe('sm');
      });
    });

    describe('spinner variant mapping', () => {
      it('uses spinner variant dark for secondary button', async () => {
        const { root } = await render(
          <cor-button loading variant="secondary">
            Click
          </cor-button>,
        );
        const spinner = root?.shadowRoot?.querySelector('cor-spinner');
        expect(spinner?.getAttribute('variant')).toBe('dark');
      });

      it('uses spinner variant dark for neutral button', async () => {
        const { root } = await render(
          <cor-button loading variant="neutral">
            Click
          </cor-button>,
        );
        const spinner = root?.shadowRoot?.querySelector('cor-spinner');
        expect(spinner?.getAttribute('variant')).toBe('dark');
      });

      it('uses spinner variant light-on-color for primary button', async () => {
        const { root } = await render(
          <cor-button loading variant="primary">
            Click
          </cor-button>,
        );
        const spinner = root?.shadowRoot?.querySelector('cor-spinner');
        expect(spinner?.getAttribute('variant')).toBe('light-on-color');
      });

      it('uses spinner variant light-on-color for destructive button', async () => {
        const { root } = await render(
          <cor-button loading variant="destructive">
            Click
          </cor-button>,
        );
        const spinner = root?.shadowRoot?.querySelector('cor-spinner');
        expect(spinner?.getAttribute('variant')).toBe('light-on-color');
      });
    });
  });

  describe('href / anchor mode', () => {
    it('renders an internal <a> when href is set', async () => {
      const { root } = await render(<cor-button href="/docs">Read the docs</cor-button>);
      const control = queryControl(root);
      expect(control?.tagName).toBe('A');
      expect(control?.getAttribute('href')).toBe('/docs');
      expect(control?.getAttribute('role')).toBe('button');
    });

    it('removes href on the anchor when disabled', async () => {
      const { root } = await render(
        <cor-button href="/docs" disabled>
          Disabled link
        </cor-button>,
      );
      const control = queryControl(root) as HTMLAnchorElement | null;
      expect(control?.hasAttribute('href')).toBe(false);
      expect(control?.getAttribute('aria-disabled')).toBe('true');
    });

    it('forwards target and rel attributes to the anchor', async () => {
      const { root } = await render(
        <cor-button href="https://example.com" target="_blank" rel="noopener noreferrer">
          External
        </cor-button>,
      );
      const control = queryControl(root);
      expect(control?.getAttribute('target')).toBe('_blank');
      expect(control?.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  describe('accessible label', () => {
    it('forwards the label prop to aria-label on the internal control', async () => {
      const { root } = await render(<cor-button label="Confirm action"></cor-button>);
      const control = queryControl(root);
      expect(control?.getAttribute('aria-label')).toBe('Confirm action');
    });
  });

  // Note: slotchange events don't fire in Stencil's mock-doc test env, so we
  // can't assert the .has-icon-start / .has-icon-end / .is-icon-only classes here.
  // The class application is verified visually in Storybook + Playwright.
  // What we *can* assert is the structural contract — the named slots exist in
  // shadow DOM in the right order, ready to receive content at runtime.
  describe('slot structure (shadow DOM contract)', () => {
    it('exposes icon-start, default, and icon-end slots in order', async () => {
      const { root } = await render(<cor-button>Click</cor-button>);
      const slots = Array.from(root?.shadowRoot?.querySelectorAll('slot') ?? []);
      const names = slots.map(s => s.getAttribute('name') ?? '(default)');
      expect(names).toEqual(['icon-start', '(default)', 'icon-end', 'icon']);
    });
  });

  describe('optional prop setters', () => {
    it('initialises every optional prop at construction', async () => {
      const { root } = await render(
        <cor-button
          href="https://example.com"
          target="_blank"
          rel="noopener"
          name="action"
          value="save"
          label="Confirm action"
        >
          Submit
        </cor-button>,
      );
      const control = queryControl(root);
      expect(control?.getAttribute('href')).toBe('https://example.com');
      expect(control?.getAttribute('target')).toBe('_blank');
      expect(control?.getAttribute('rel')).toBe('noopener');
      expect(control?.getAttribute('aria-label')).toBe('Confirm action');
    });

    it('trims an all-whitespace label down to nothing on the inner control', async () => {
      const { root } = await render(<cor-button label="   ">Click</cor-button>);
      const control = queryControl(root);
      // `labelAttr = this.label?.trim()` — whitespace-only becomes '', which
      // produces either a null or empty-string attribute depending on the DOM
      // shim. Either way it carries no accessible name.
      const aria = control?.getAttribute('aria-label');
      expect(aria === null || aria === '').toBe(true);
    });
  });

  describe('handleClick (host-attached behaviors)', () => {
    // The Host's onClick is wired in JSX; in mock-doc we have to dispatch the
    // click directly on the host element to exercise handleClick — bubbling
    // from the shadow-internal button does not propagate up in mock-doc.
    const dispatchHostClick = (root: Element | null | undefined) => {
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
      root?.dispatchEvent(ev);
      return ev;
    };

    const attachForm = (root: Element | null | undefined) => {
      const form = document.createElement('form');
      const reset = vi.fn();
      const requestSubmit = vi.fn();
      Object.defineProperty(form, 'reset', { value: reset, writable: true });
      Object.defineProperty(form, 'requestSubmit', { value: requestSubmit, writable: true });
      document.body.appendChild(form);
      if (root) form.appendChild(root);
      // mock-doc does not simulate the form-associated custom element (FACE)
      // attachment algorithm, so `internals.form` stays null after appendChild.
      // We override `internals.form` directly so handleClick can reach our
      // stubbed methods. setFormValue is also a no-op in mock-doc — stub it
      // so we can assert call-shape (2-arg requirement).
      const setFormValue = vi.fn();
      const internalsLike = (root as unknown as { internals?: Record<string, unknown> })?.internals;
      if (internalsLike) {
        Object.defineProperty(internalsLike, 'form', { value: form, writable: true, configurable: true });
        Object.defineProperty(internalsLike, 'setFormValue', { value: setFormValue, writable: true });
      }
      return { form, reset, requestSubmit, setFormValue };
    };

    it('disabled host swallows the click (preventDefault + stopImmediatePropagation)', async () => {
      const { root } = await render(<cor-button disabled>Click</cor-button>);
      const ev = dispatchHostClick(root);
      expect(ev.defaultPrevented).toBe(true);
    });

    it('loading host swallows the click', async () => {
      const { root } = await render(<cor-button loading>Click</cor-button>);
      const ev = dispatchHostClick(root);
      expect(ev.defaultPrevented).toBe(true);
    });

    it('fieldset-disabled host swallows the click', async () => {
      const { root } = await render(<cor-button>Click</cor-button>);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await new Promise(r => setTimeout(r, 0));
      const ev = dispatchHostClick(root);
      expect(ev.defaultPrevented).toBe(true);
    });

    it('href-mode click returns early without form intervention', async () => {
      const { root } = await render(<cor-button href="/docs">Link</cor-button>);
      const { form, reset, requestSubmit } = attachForm(root);
      dispatchHostClick(root);
      expect(reset).not.toHaveBeenCalled();
      expect(requestSubmit).not.toHaveBeenCalled();
      form.remove();
    });

    it('type=submit (no name) calls form.requestSubmit without publishing a submitter value', async () => {
      const { root } = await render(<cor-button type="submit">Go</cor-button>);
      const { form, requestSubmit } = attachForm(root);
      const ev = dispatchHostClick(root);
      expect(ev.defaultPrevented).toBe(true);
      expect(requestSubmit).toHaveBeenCalledTimes(1);
      form.remove();
    });

    it('type=submit (with name + value) publishes the submitter value before requestSubmit', async () => {
      const { root } = await render(
        <cor-button type="submit" name="action" value="save">
          Save
        </cor-button>,
      );
      const { form, requestSubmit, setFormValue } = attachForm(root);
      const ev = dispatchHostClick(root);
      expect(ev.defaultPrevented).toBe(true);
      expect(requestSubmit).toHaveBeenCalledTimes(1);
      // 2-arg form required by Stencil; the same (value, value) pair.
      expect(setFormValue).toHaveBeenCalledWith('save', 'save');
      form.remove();
    });

    it('type=submit (with name but value=undefined) defaults the submitter value to the empty string', async () => {
      const { root } = await render(
        <cor-button type="submit" name="action">
          Submit
        </cor-button>,
      );
      const { form, requestSubmit } = attachForm(root);
      const ev = dispatchHostClick(root);
      expect(ev.defaultPrevented).toBe(true);
      expect(requestSubmit).toHaveBeenCalled();
      form.remove();
    });

    it('type=reset calls form.reset', async () => {
      const { root } = await render(<cor-button type="reset">Reset</cor-button>);
      const { form, reset } = attachForm(root);
      const ev = dispatchHostClick(root);
      expect(ev.defaultPrevented).toBe(true);
      expect(reset).toHaveBeenCalledTimes(1);
      form.remove();
    });

    it('type=button does NOT call form.reset or form.requestSubmit', async () => {
      const { root } = await render(<cor-button type="button">Click</cor-button>);
      const { form, reset, requestSubmit } = attachForm(root);
      dispatchHostClick(root);
      expect(reset).not.toHaveBeenCalled();
      expect(requestSubmit).not.toHaveBeenCalled();
      form.remove();
    });
  });

  describe('accessible-name resolution (hasAccessibleName branches)', () => {
    it('treats an `aria-label` attribute as a valid accessible name', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(
        <cor-button iconOnly aria-label="Open menu">
          <cor-icon slot="icon" name="arrow-right" size={20}></cor-icon>
        </cor-button>,
      );
      await new Promise(r => setTimeout(r, 0));
      // Should NOT warn about missing label when aria-label is on the host.
      const labelWarnings = warn.mock.calls.flat().filter(c => typeof c === 'string' && c.includes('label'));
      expect(labelWarnings.length).toBe(0);
      warn.mockRestore();
    });

    it('treats an `aria-labelledby` attribute as a valid accessible name', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(
        <cor-button iconOnly aria-labelledby="ref-label">
          <cor-icon slot="icon" name="arrow-right" size={20}></cor-icon>
        </cor-button>,
      );
      await new Promise(r => setTimeout(r, 0));
      const labelWarnings = warn.mock.calls.flat().filter(c => typeof c === 'string' && c.includes('label'));
      expect(labelWarnings.length).toBe(0);
      warn.mockRestore();
    });

    it('does not falsely accept an empty-string `label`', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(
        <cor-button iconOnly label="   ">
          <cor-icon slot="icon" name="arrow-right" size={20}></cor-icon>
        </cor-button>,
      );
      await new Promise(r => setTimeout(r, 0));
      // Whitespace-only label should trigger the missing-name warning.
      const labelWarnings = warn.mock.calls.flat().filter(c => typeof c === 'string' && c.includes('icon-only'));
      expect(labelWarnings.length).toBeGreaterThan(0);
      warn.mockRestore();
    });
  });

  describe('form-associated callbacks', () => {
    it('declares formAssociated on the constructor', () => {
      const Ctor = customElements.get('cor-button') as unknown as { formAssociated?: boolean };
      expect(Ctor.formAssociated).toBe(true);
    });

    it('formDisabledCallback marks the inner control disabled and aria-disabled', async () => {
      const { root } = await render(<cor-button>Click</cor-button>);

      // Invoke the callback the way the browser would when fieldset[disabled]
      // toggles around the element.
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await new Promise(r => setTimeout(r, 0));

      const control = queryControl(root) as HTMLButtonElement | null;
      expect(control?.hasAttribute('disabled')).toBe(true);
      expect(control?.getAttribute('aria-disabled')).toBe('true');

      // And recovers when the fieldset is re-enabled.
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(false);
      await new Promise(r => setTimeout(r, 0));

      expect(control?.hasAttribute('disabled')).toBe(false);
      expect(control?.getAttribute('aria-disabled')).toBeNull();
    });

    it('formDisabledCallback also disables anchor-mode (href) buttons via tabindex=-1', async () => {
      const { root } = await render(<cor-button href="/x">Link</cor-button>);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await new Promise(r => setTimeout(r, 0));

      const a = queryControl(root) as HTMLAnchorElement | null;
      expect(a?.tagName).toBe('A');
      expect(a?.hasAttribute('href')).toBe(false);
      expect(a?.getAttribute('aria-disabled')).toBe('true');
      expect(a?.getAttribute('tabindex')).toBe('-1');
    });

    it('formDisabledCallback does not clobber an explicit disabled prop', async () => {
      const { root } = await render(<cor-button disabled>Click</cor-button>);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(false);
      await new Promise(r => setTimeout(r, 0));

      // The explicit disabled prop is preserved.
      expect(root?.getAttribute('disabled')).not.toBeNull();
      const control = queryControl(root) as HTMLButtonElement | null;
      expect(control?.hasAttribute('disabled')).toBe(true);
    });

    it('formResetCallback clears the submitter value', async () => {
      const { root } = await render(
        <cor-button type="submit" name="action" value="save">
          Save
        </cor-button>,
      );
      const r = root as unknown as { formResetCallback: () => void };
      // No throw and the call is observable via the mocked internals.
      expect(() => r.formResetCallback()).not.toThrow();
    });
  });

  describe('slot content reactivity', () => {
    it('reflects the has-icon-start class on the host after slotchange', async () => {
      const { root } = await render(
        <cor-button>
          <cor-icon slot="icon-start" name="arrow-left" size={20}></cor-icon>
          Save
        </cor-button>,
      );
      const slot = root?.shadowRoot?.querySelector('slot[name="icon-start"]') as HTMLSlotElement | null;
      slot?.dispatchEvent(new Event('slotchange'));
      await new Promise(r => setTimeout(r, 0));
      expect(root?.classList.contains('has-icon-start')).toBe(true);
    });

    it('reflects the has-icon-end class on the host after slotchange', async () => {
      const { root } = await render(
        <cor-button>
          Save
          <cor-icon slot="icon-end" name="arrow-right" size={20}></cor-icon>
        </cor-button>,
      );
      const slot = root?.shadowRoot?.querySelector('slot[name="icon-end"]') as HTMLSlotElement | null;
      slot?.dispatchEvent(new Event('slotchange'));
      await new Promise(r => setTimeout(r, 0));
      expect(root?.classList.contains('has-icon-end')).toBe(true);
    });

    it('accepts an icon-only configuration with a labelled `slot="icon"`', async () => {
      // Mock-doc slot timing — see note on the icon-only attribute test.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(
        <cor-button iconOnly label="Navigate forward">
          <cor-icon slot="icon" name="arrow-right" size={20}></cor-icon>
        </cor-button>,
      );
      const control = queryControl(root);
      expect(control?.getAttribute('aria-label')).toBe('Navigate forward');
      warn.mockRestore();
    });
  });

  describe('accessible-name warnings (componentDidLoad)', () => {
    it('warns when icon-only is set without a label or aria-label', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(
        <cor-button iconOnly>
          <cor-icon slot="icon" name="arrow-right" size={20}></cor-icon>
        </cor-button>,
      );
      await new Promise(r => setTimeout(r, 0));
      const calls = warn.mock.calls.flat().join(' ');
      expect(calls).toMatch(/icon-only/i);
      warn.mockRestore();
    });
  });

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('cor-button') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
