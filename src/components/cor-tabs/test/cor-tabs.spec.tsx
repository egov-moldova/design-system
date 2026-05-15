import { newSpecPage } from '@stencil/core/testing';

import { CorTabs } from '../cor-tabs';

describe('cor-tabs', () => {
  it('renders with slot', async () => {
    const page = await newSpecPage({
      components: [CorTabs],
      html: `<cor-tabs tab-style="style-1" size="md" value="tab-1">
        <cor-tab-button value="tab-1">Tab 1</cor-tab-button>
        <cor-tab-button value="tab-2">Tab 2</cor-tab-button>
        <cor-tab-button value="tab-3">Tab 3</cor-tab-button>
        </cor-tabs>`,
    });
    expect(page.root).toEqualHtml(`
      <cor-tabs role="tablist" tab-style="style-1" size="md" value="tab-1">
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
        <cor-tab-button value="tab-1">Tab 1</cor-tab-button>
        <cor-tab-button value="tab-2">Tab 2</cor-tab-button>
        <cor-tab-button value="tab-3">Tab 3</cor-tab-button>
      </cor-tabs>
    `);
  });
});
