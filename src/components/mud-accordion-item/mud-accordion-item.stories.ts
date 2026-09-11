import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { ACCORDION_ICON_POSITIONS, ACCORDION_SIZES } from '../mud-accordion/mud-accordion.types';
import type { AccordionIconPosition, AccordionSize } from '../mud-accordion/mud-accordion.types';

type AccordionItemArgs = {
  heading: string;
  supportingText: string;
  open: boolean;
  disabled: boolean;
  size: AccordionSize;
  iconPosition: AccordionIconPosition;
};

const wrapperStyle = 'display: block; padding: var(--spacing-24); max-width: 996px;';

/** Escapes a control value for interpolation into a double-quoted HTML attribute. */
const attr = (value: string) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

// `size` and `icon-position` go on the container, not on the item: `mud-accordion`
// assigns both onto every child in `propagateToItems()` (mud-accordion.tsx:176) from
// its own `componentDidLoad`, which runs after the child's — so an item-level value
// is overwritten before first paint and the control would do nothing.
const renderItem = (args: AccordionItemArgs) => /*html*/ `
  <div style="${wrapperStyle}">
    <mud-accordion mode="multiple" size="${args.size}" icon-position="${args.iconPosition}">
      <mud-accordion-item
        heading="${attr(args.heading)}"
        ${args.supportingText ? `supporting-text="${attr(args.supportingText)}"` : ''}
        ${args.open ? 'open' : ''}
        ${args.disabled ? 'disabled' : ''}
      >
        Panel body content. Always in the DOM; hidden while the item is closed.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceAllSizes = /*html*/ `<mud-accordion mode="multiple" size="sm">
  <mud-accordion-item heading="size=&quot;sm&quot;" supporting-text="Compact header">Panel body.</mud-accordion-item>
</mud-accordion>

<mud-accordion mode="multiple" size="md">
  <mud-accordion-item heading="size=&quot;md&quot;" supporting-text="Default header">Panel body.</mud-accordion-item>
</mud-accordion>`;

const docsSourceStates = /*html*/ `<mud-accordion mode="multiple">
  <mud-accordion-item heading="Closed">Panel body.</mud-accordion-item>
  <mud-accordion-item heading="Open" open>Panel body.</mud-accordion-item>
  <mud-accordion-item heading="Disabled" disabled>Panel body.</mud-accordion-item>
</mud-accordion>`;

const meta: Meta<AccordionItemArgs> = {
  title: 'Molecules/Accordion Item',
  component: 'mud-accordion-item',
  // The item's API table is rendered on the Accordion docs page (mud-accordion.mdx),
  // because the item is not usable outside a `mud-accordion`. A second autodocs page
  // would compete with it for the same content.
  tags: ['!autodocs'],
  argTypes: {
    heading: { control: 'text' },
    supportingText: { control: 'text' },
    open: { control: 'boolean' },
    disabled: { control: 'boolean' },
    size: { control: 'select', options: ACCORDION_SIZES },
    iconPosition: { control: 'select', options: ACCORDION_ICON_POSITIONS },
  },
  parameters: {
    layout: 'fullscreen',
    // The manifest feeds this component's argTypes (see .storybook/preview.js), and
    // `wca` lists every public class field as a property — so `@Element() host`
    // arrives as a control over a live DOM node. The docs blocks exclude it too;
    // this key is what keeps it out of the Canvas Controls panel.
    controls: { exclude: ['host'] },
  },
};
export default meta;

type Story = StoryObj<AccordionItemArgs>;

export const Default: Story = {
  render: renderItem,
  args: {
    heading: 'Cum efectuez o plată cu MPay?',
    supportingText: 'Pași simpli pentru autentificare și confirmare',
    open: false,
    disabled: false,
    size: 'md',
    iconPosition: 'right',
  },
};

export const AllSizes: Story = {
  render: () => /*html*/ `
    <div style="${wrapperStyle}">
      <mud-accordion mode="multiple" size="sm">
        <mud-accordion-item heading="size=&quot;sm&quot;" supporting-text="Compact header">Panel body.</mud-accordion-item>
      </mud-accordion>
      <mud-accordion mode="multiple" size="md">
        <mud-accordion-item heading="size=&quot;md&quot;" supporting-text="Default header">Panel body.</mud-accordion-item>
      </mud-accordion>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllSizes } },
  },
};

export const States: Story = {
  render: () => /*html*/ `
    <div style="${wrapperStyle}">
      <mud-accordion mode="multiple">
        <mud-accordion-item heading="Closed">Panel body.</mud-accordion-item>
        <mud-accordion-item heading="Open" open>Panel body.</mud-accordion-item>
        <mud-accordion-item heading="Disabled" disabled>Panel body.</mud-accordion-item>
      </mud-accordion>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceStates } },
  },
};

// Regression test, not documentation — hidden from the sidebar and autodocs, the
// same shape mud-checkbox uses for its own browser-only contract tests. This covers
// the half of issue #17 that mock-doc genuinely cannot render: computed style for the
// dim, `elementFromPoint` for the pointer guard, and focus for `inert`. The attribute
// contract itself IS observable under mock-doc and is pinned in the spec file instead.
export const SlottedDisabledContract: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `
    <div style="${wrapperStyle}">
      <button id="parking" type="button">focus parking</button>
      <mud-accordion mode="multiple">
        <mud-accordion-item id="authored-disabled" heading="Payment" disabled>
          <mud-button id="retry" slot="trailing" variant="secondary" size="sm" disabled>Retry</mud-button>
          Panel body.
        </mud-accordion-item>
        <mud-accordion-item id="authored-enabled" disabled>
          <span id="head-slot" slot="heading">Shipping</span>
          <span id="sup-slot" slot="supporting">Tracking unavailable</span>
          <mud-button id="track" slot="trailing" variant="secondary" size="sm">Track</mud-button>
          <div slot="trailing"><button id="nested" type="button" style="pointer-events: auto">Nested</button></div>
          Panel body.
        </mud-accordion-item>
      </mud-accordion>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const find = (id: string): HTMLElement => {
      const el = canvasElement.querySelector<HTMLElement>(`#${id}`);
      if (!el) throw new Error(`#${id} did not render`);
      return el;
    };
    // Several frames, not one: `inert` is applied in render(), and Stencil re-renders
    // asynchronously. A single frame was measured to read the PREVIOUS render's state,
    // which is how this session first concluded — wrongly — that focus was already blocked.
    const settle = async () => {
      for (let i = 0; i < 6; i += 1) await new Promise<void>(r => requestAnimationFrame(() => r()));
    };

    await customElements.whenDefined('mud-accordion-item');
    await customElements.whenDefined('mud-button');
    await settle();

    const authoredDisabled = find('authored-disabled');
    const authoredEnabled = find('authored-enabled');
    const retry = find('retry');
    const track = find('track');
    // The guard is a three-clause selector list. Cover every clause: a typo in the
    // `heading` or `supporting` arm would otherwise ship green against a bar that
    // says "a slotted control" without naming a slot.
    const slotted = [
      ['heading', find('head-slot')],
      ['supporting', find('sup-slot')],
      ['trailing', track],
    ] as const;

    // 1. The component never writes into the consumer's cell — in either direction.
    if (!retry.hasAttribute('disabled')) {
      throw new Error('slotted control authored `disabled` lost it while the item was disabled');
    }
    if (track.hasAttribute('disabled')) {
      throw new Error('component wrote `disabled` onto a slotted control the consumer left enabled');
    }

    // 2. While the item is disabled, slotted content is non-interactive. Measured:
    //    a disabled native <button> ancestor does NOT block mouse clicks on its
    //    descendants, so this asserts the CSS guard, not a platform freebie.
    // 3. ...and visibly muted. Both, for every slot the guard names.
    for (const [name, el] of slotted) {
      if (getComputedStyle(el).pointerEvents !== 'none') {
        throw new Error(`slot="${name}" content is still pointer-interactive while the item is disabled`);
      }
      if (Number(getComputedStyle(el).opacity) >= 1) {
        throw new Error(`slot="${name}" content is not visually muted while the item is disabled`);
      }
    }

    // 3b. The guard is a mechanism, not a request: an inline style must not defeat it.
    track.style.pointerEvents = 'auto';
    if (getComputedStyle(track).pointerEvents !== 'none') {
      throw new Error('an inline `pointer-events` on the slotted control defeated the guard');
    }
    track.style.removeProperty('pointer-events');

    // 3c. KEYBOARD. The shape CSS cannot close: a disabled native <button> does not
    //     disable its flat-tree slotted descendants, so without `inert` this focuses.
    const nested = find('nested');
    // Park focus on a real focusable element OUTSIDE the accordion. Two traps this avoids:
    // `mud-accordion-item` carries no tabindex, so focusing the item is a no-op and
    // `activeElement` falls to <body>, which would let the check below pass without
    // proving focus was REFUSED rather than merely moved; and anything inside a
    // `trailing` slot is itself inert after the fix, so it cannot hold focus either.
    const parking = find('parking');
    parking.focus();
    if (document.activeElement !== parking) {
      throw new Error('could not park focus — the keyboard assertion below would be vacuous');
    }
    nested.focus();
    if (document.activeElement !== parking) {
      throw new Error('a slotted control is keyboard-focusable while the item is disabled');
    }

    // 3d. DESCENDANT. `::slotted(*)` matches only the assigned element; this button is a
    //     descendant of a slotted wrapper AND sets its own `pointer-events: auto`, so the
    //     stylesheet loses here and only `inert` wins. Hit-testing is the observable.
    //     `scrollIntoView` first and a non-null check second, both load-bearing:
    //     `elementFromPoint` returns null for any point outside the viewport, so a
    //     bare `hit !== nested` passes vacuously when the fixture sits below the fold.
    const hitTest = (el: HTMLElement) => {
      el.scrollIntoView({ block: 'center' });
      const box = el.getBoundingClientRect();
      return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    };
    const blockedHit = hitTest(nested);
    if (blockedHit === null) {
      throw new Error('hit-test point fell outside the viewport — the assertion would pass vacuously');
    }
    if (blockedHit !== authoredEnabled) {
      throw new Error(`expected the inert wrapper to hand hit-testing to the item host, got ${blockedHit?.tagName}`);
    }

    // 4. Enabling the item restores interactivity and appearance, and STILL does
    //    not touch the consumer's cell — this is the exact transition issue #17 broke.
    authoredDisabled.removeAttribute('disabled');
    authoredEnabled.removeAttribute('disabled');
    await settle();

    if (!retry.hasAttribute('disabled')) {
      throw new Error('re-enabling the item stripped the consumer-authored `disabled` (issue #17)');
    }
    for (const [name, el] of slotted) {
      if (getComputedStyle(el).pointerEvents === 'none') {
        throw new Error(`slot="${name}" content stayed pointer-blocked after the item was enabled`);
      }
      if (Number(getComputedStyle(el).opacity) < 1) {
        throw new Error(`slot="${name}" content stayed muted after the item was enabled`);
      }
    }
    // ...and the keyboard comes back with it. This is the assertion that catches an
    // `inert` left permanently on, which would be a worse bug than the one being fixed.
    parking.focus();
    nested.focus();
    if (document.activeElement !== nested) {
      throw new Error('a slotted control stayed keyboard-unreachable after the item was enabled');
    }
    // The mirror of 3d. Without it, 3d proves nothing: a guard that never lifts would
    // satisfy the disabled-side check forever.
    if (hitTest(nested) !== nested) {
      throw new Error('a slotted descendant stayed hit-test-blocked after the item was enabled');
    }
  },
};
