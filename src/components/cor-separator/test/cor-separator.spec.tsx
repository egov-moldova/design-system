import { newSpecPage } from '@stencil/core/testing';

import { CorSeparator } from '../cor-separator';

describe('cor-separator', () => {
  it('renders with default variant', async () => {
    const page = await newSpecPage({
      components: [CorSeparator],
      html: `<cor-separator></cor-separator>`,
    });

    expect(page.root).toEqualHtml(`
      <cor-separator role="separator" variant="divider">
        <mock:shadow-root></mock:shadow-root>
      </cor-separator>
    `);
  });

  it('renders with custom variant', async () => {
    const page = await newSpecPage({
      components: [CorSeparator],
      html: `<cor-separator variant="line"></cor-separator>`,
    });

    expect(page.root!.getAttribute('variant')).toBe('line');
  });
});
