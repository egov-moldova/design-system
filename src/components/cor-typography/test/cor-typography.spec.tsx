import { newSpecPage } from '@stencil/core/testing';

import { CorTypography } from '../cor-typography';
import { textVariants } from '../cor-typography.enums';

describe('cor-typography', () => {
  describe('basic rendering', () => {
    it('renders with default props', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><p>Hello world</p></cor-typography>`,
      });
      expect(page.root).toBeTruthy();
    });

    it('defaults to body-md variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('body-md');
    });

    it('reflects variant attribute', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="heading-xl"><h1>Heading</h1></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('heading-xl');
    });

    it('renders slot for content', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><p>Content</p></cor-typography>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });
  });

  describe('allowed tags', () => {
    it('allows p tag', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><p>Hello world</p></cor-typography>`,
      });
      expect(page.root).toEqualHtml(`
        <cor-typography variant="body-md">
          <mock:shadow-root>
            <slot></slot>
          </mock:shadow-root>
          <p>Hello world</p>
        </cor-typography>
      `);
    });

    it('allows div tag', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><div>Hello world</div></cor-typography>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });

    it('allows span tag', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><span>Hello world</span></cor-typography>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });

    it('allows h1 tag', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><h1>Hello world</h1></cor-typography>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });

    it('allows h2 tag', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><h2>Hello world</h2></cor-typography>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });

    it('allows h3 tag', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><h3>Hello world</h3></cor-typography>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });

    it('allows h4 tag', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><h4>Hello world</h4></cor-typography>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });

    it('allows h5 tag', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><h5>Hello world</h5></cor-typography>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });

    it('allows h6 tag', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><h6>Hello world</h6></cor-typography>`,
      });
      const slot = page.root?.shadowRoot?.querySelector('slot');
      expect(slot).toBeTruthy();
    });
  });

  describe('invalid tags', () => {
    it('rejects anchor tag', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><a>Hello world</a></cor-typography>`,
      });
      expect(page.root).toEqualHtml(`
        <cor-typography variant="body-md">
          <mock:shadow-root>
            a is invalid. This component only accepts p, div, span, h1, h2, h3, h4, h5, h6
          </mock:shadow-root>
          <a>Hello world</a>
        </cor-typography>
      `);
    });

    it('rejects button tag', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><button>Click me</button></cor-typography>`,
      });
      const shadowContent = page.root?.shadowRoot?.textContent;
      expect(shadowContent).toContain('button is invalid');
    });

    it('rejects img tag', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><img /></cor-typography>`,
      });
      const shadowContent = page.root?.shadowRoot?.textContent;
      expect(shadowContent).toContain('img is invalid');
    });
  });

  describe('variant prop', () => {
    it('renders with heading-4xl variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.HEADING_4XL}"><h1>Title</h1></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('heading-4xl');
    });

    it('renders with heading-3xl variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.HEADING_3XL}"><h1>Title</h1></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('heading-3xl');
    });

    it('renders with heading-2xl variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.HEADING_2XL}"><h2>Title</h2></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('heading-2xl');
    });

    it('renders with heading-xl variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.HEADING_XL}"><h2>Title</h2></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('heading-xl');
    });

    it('renders with heading-lg variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.HEADING_LG}"><h3>Title</h3></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('heading-lg');
    });

    it('renders with heading-md variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.HEADING_MD}"><h4>Title</h4></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('heading-md');
    });

    it('renders with heading-sm variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.HEADING_SM}"><h5>Title</h5></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('heading-sm');
    });

    it('renders with body-lg variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.BODY_LG}"><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('body-lg');
    });

    it('renders with body-lg-underline variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.BODY_LG_UNDERLINE}"><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('body-lg-underline');
    });

    it('renders with body-lg-semibold variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.BODY_LG_SEMIBOLD}"><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('body-lg-semibold');
    });

    it('renders with body-md variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.BODY_MD}"><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('body-md');
    });

    it('renders with body-md-underline variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.BODY_MD_UNDERLINE}"><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('body-md-underline');
    });

    it('renders with body-md-semibold variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.BODY_MD_SEMIBOLD}"><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('body-md-semibold');
    });

    it('renders with body-sm variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.BODY_SM}"><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('body-sm');
    });

    it('renders with body-sm-semibold variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.BODY_SM_SEMIBOLD}"><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('body-sm-semibold');
    });

    it('renders with body-xs variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.BODY_XS}"><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('body-xs');
    });

    it('renders with body-xs-semibold variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.BODY_XS_SEMIBOLD}"><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('body-xs-semibold');
    });

    it('renders with body-xs-uppercase variant', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="${textVariants.BODY_XS_UPPERCASE}"><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('body-xs-uppercase');
    });
  });

  describe('color prop', () => {
    it('does not apply color style when color prop is undefined', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><p>Text</p></cor-typography>`,
      });
      const style = page.root?.style;
      expect(style?.color).toBeFalsy();
    });

    it('applies color style with neutral-text-default', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography color="color-neutral-text-default"><p>Text</p></cor-typography>`,
      });
      const style = page.root?.style;
      expect(style?.color).toBe('var(--color-neutral-text-default)');
    });

    it('applies color style with neutral-text-weak', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography color="color-neutral-text-weak"><p>Text</p></cor-typography>`,
      });
      const style = page.root?.style;
      expect(style?.color).toBe('var(--color-neutral-text-weak)');
    });

    it('applies color style with primary-text-default', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography color="color-primary-text-default"><p>Text</p></cor-typography>`,
      });
      const style = page.root?.style;
      expect(style?.color).toBe('var(--color-primary-text-default)');
    });

    it('applies color style with system-error-text', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography color="color-system-error-text"><p>Text</p></cor-typography>`,
      });
      const style = page.root?.style;
      expect(style?.color).toBe('var(--color-system-error-text)');
    });

    it('applies color style with system-success-text', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography color="color-system-success-text"><p>Text</p></cor-typography>`,
      });
      const style = page.root?.style;
      expect(style?.color).toBe('var(--color-system-success-text)');
    });

    it('applies color style with system-warning-text', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography color="color-system-warning-text"><p>Text</p></cor-typography>`,
      });
      const style = page.root?.style;
      expect(style?.color).toBe('var(--color-system-warning-text)');
    });

    it('applies color style with system-info-text', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography color="color-system-info-text"><p>Text</p></cor-typography>`,
      });
      const style = page.root?.style;
      expect(style?.color).toBe('var(--color-system-info-text)');
    });

    it('reflects color attribute', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography color="color-primary-text-default"><p>Text</p></cor-typography>`,
      });
      expect(page.root?.getAttribute('color')).toBe('color-primary-text-default');
    });

    it('does not apply invalid color token', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography color="invalid-color"><p>Text</p></cor-typography>`,
      });
      const style = page.root?.style;
      expect(style?.color).toBeFalsy();
    });
  });

  describe('combined props', () => {
    it('renders with variant and color together', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography variant="heading-xl" color="color-primary-text-default"><h1>Title</h1></cor-typography>`,
      });
      expect(page.root?.getAttribute('variant')).toBe('heading-xl');
      expect(page.root?.getAttribute('color')).toBe('color-primary-text-default');
      expect(page.root?.style.color).toBe('var(--color-primary-text-default)');
    });

    it('renders text content correctly', async () => {
      const page = await newSpecPage({
        components: [CorTypography],
        html: `<cor-typography><p>Hello World</p></cor-typography>`,
      });
      expect(page.root?.textContent).toContain('Hello World');
    });
  });
});
