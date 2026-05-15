import { newSpecPage } from '@stencil/core/testing';

import { CorButton } from '../cor-button';

describe('cor-button', () => {
  it('allowed tag', async () => {
    const page = await newSpecPage({
      components: [CorButton],
      html: `<cor-button><button>Hello world</button></cor-button>`,
    });
    expect(page.root).toEqualHtml(`
       <cor-button variant="primary" size="md">
         <mock:shadow-root>
           <slot></slot>
         </mock:shadow-root>
         <button>Hello world</button>
       </cor-button>
     `);
  });

  it('not allowed tag', async () => {
    const page = await newSpecPage({
      components: [CorButton],
      html: `<cor-button><p>Hello world</p></cor-button>`,
    });
    expect(page.root).toEqualHtml(`
       <cor-button variant="primary" size="md">
         <mock:shadow-root>
           p is invalid. This component only accepts button, a
         </mock:shadow-root>
         <p>Hello world</p>
       </cor-button>
     `);
  });
});
