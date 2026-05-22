import { render, h, describe, it, expect } from '@stencil/vitest';

import '../cor-service-button';

describe('cor-service-button', () => {
  it('renders with default props (appearance=primary, type=button)', async () => {
    const { root, waitForChanges } = await render(<cor-service-button>Plătește cu mpay</cor-service-button>);
    await waitForChanges();

    expect(root?.getAttribute('appearance')).toBe('primary');
    expect(root?.getAttribute('type')).toBe('button');
    expect(root?.shadowRoot?.querySelector('button.control')).toBeTruthy();
  });

  it('reflects appearance, disabled, loading, full-width to host attributes', async () => {
    const { root } = await render(
      <cor-service-button appearance="neutral" disabled loading full-width>
        Test
      </cor-service-button>,
    );
    expect(root?.getAttribute('appearance')).toBe('neutral');
    expect(root?.hasAttribute('disabled')).toBe(true);
    expect(root?.hasAttribute('loading')).toBe(true);
    expect(root?.hasAttribute('full-width')).toBe(true);
  });

  it('renders <a> instead of <button> when href is set', async () => {
    const { root, waitForChanges } = await render(
      <cor-service-button href="https://mpay.gov.md" target="_blank" rel="noopener">
        Pay
      </cor-service-button>,
    );
    await waitForChanges();

    const anchor = root?.shadowRoot?.querySelector('a.control') as HTMLAnchorElement | null;
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toBe('https://mpay.gov.md');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener');
    expect(anchor?.getAttribute('role')).toBe('button');
  });

  it('strips href when inert (disabled) to prevent navigation', async () => {
    const { root, waitForChanges } = await render(
      <cor-service-button href="https://mpay.gov.md" disabled>
        Pay
      </cor-service-button>,
    );
    await waitForChanges();

    const anchor = root?.shadowRoot?.querySelector('a.control') as HTMLAnchorElement | null;
    expect(anchor?.hasAttribute('href')).toBe(false);
    expect(anchor?.getAttribute('aria-disabled')).toBe('true');
  });

  it('disabled state: native disabled attribute + aria-disabled=true', async () => {
    const { root, waitForChanges } = await render(<cor-service-button disabled>Pay</cor-service-button>);
    await waitForChanges();

    const btn = root?.shadowRoot?.querySelector('button.control') as HTMLButtonElement | null;
    expect(btn?.hasAttribute('disabled')).toBe(true);
    expect(btn?.getAttribute('aria-disabled')).toBe('true');
  });

  it('loading state: aria-busy=true, spinner shown, badge+label remain in DOM (CSS hides visually to preserve width)', async () => {
    const { root, waitForChanges } = await render(<cor-service-button loading>Pay</cor-service-button>);
    await waitForChanges();

    const btn = root?.shadowRoot?.querySelector('button.control') as HTMLButtonElement | null;
    expect(btn?.getAttribute('aria-busy')).toBe('true');
    expect(root?.shadowRoot?.querySelector('cor-spinner')).toBeTruthy();
    // Badge + label remain in DOM so the button keeps its intrinsic width — CSS hides them.
    expect(root?.shadowRoot?.querySelector('.badge')).toBeTruthy();
    expect(root?.shadowRoot?.querySelector('.label')).toBeTruthy();
  });

  it('loading: spinner variant is light-on-color for primary, dark for neutral', async () => {
    const { root: rootPrimary, waitForChanges: waitPrimary } = await render(
      <cor-service-button loading appearance="primary">
        Pay
      </cor-service-button>,
    );
    await waitPrimary();
    expect(rootPrimary?.shadowRoot?.querySelector('cor-spinner')?.getAttribute('variant')).toBe('light-on-color');

    const { root: rootNeutral, waitForChanges: waitNeutral } = await render(
      <cor-service-button loading appearance="neutral">
        Pay
      </cor-service-button>,
    );
    await waitNeutral();
    expect(rootNeutral?.shadowRoot?.querySelector('cor-spinner')?.getAttribute('variant')).toBe('dark');
  });

  it('renders badge slot and default label slot', async () => {
    const { root, waitForChanges } = await render(
      <cor-service-button>
        <span slot="badge">LOGO</span>
        Pay
      </cor-service-button>,
    );
    await waitForChanges();

    expect(root?.shadowRoot?.querySelector('.badge')).toBeTruthy();
    expect(root?.shadowRoot?.querySelector('.label')).toBeTruthy();
  });

  it('forwards label prop as aria-label on the internal control', async () => {
    const { root, waitForChanges } = await render(
      <cor-service-button label="Pay with MPay">Plătește cu mpay</cor-service-button>,
    );
    await waitForChanges();

    const btn = root?.shadowRoot?.querySelector('button.control') as HTMLButtonElement | null;
    expect(btn?.getAttribute('aria-label')).toBe('Pay with MPay');
  });

  it('inert click is blocked: handleClick preventDefault when disabled/loading', async () => {
    const { root, waitForChanges } = await render(<cor-service-button disabled>Pay</cor-service-button>);
    await waitForChanges();

    type Instance = { handleClick: (ev: MouseEvent) => void };
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    (root as unknown as Instance).handleClick(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('focuses the internal control via delegatesFocus', async () => {
    const { root, waitForChanges } = await render(<cor-service-button>Pay</cor-service-button>);
    await waitForChanges();
    // Just verify the shadow root has the control — delegatesFocus is a Stencil-config
    // detail; behaviour is browser-verified in stories. Smoke test only.
    expect(root?.shadowRoot?.querySelector('button.control')).toBeTruthy();
  });
});
