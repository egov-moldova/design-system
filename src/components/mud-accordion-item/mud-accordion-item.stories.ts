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
// same shape mud-checkbox uses for its own browser-only contract tests. The attribute
// contract is pinned in the spec file, which is the lane CI runs; this story carries
// only what mock-doc cannot do — hit-testing, real focus, and a NATIVE `slotchange`
// (measured: mock-doc does not fire one on appendChild, so the spec test dispatches
// its own and this one must not).
export const SlottedDisabledContract: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `
    <div style="${wrapperStyle}">
      <button id="parking" type="button">focus parking</button>
      <mud-accordion mode="multiple">
        <mud-accordion-item id="item" heading="Payment" disabled>
          <span id="head-slot" slot="heading">Payment overdue</span>
          <span id="sup-slot" slot="supporting">Tracking unavailable</span>
          <mud-button id="authored" slot="trailing" variant="secondary" size="sm" disabled>Retry</mud-button>
          <mud-button id="ours" slot="trailing" variant="secondary" size="sm">Track</mud-button>
          <a id="link" slot="trailing" href="#go">Details</a>
          <div slot="trailing"><button id="nested" type="button">Nested</button></div>
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
    // Several frames, not one: Stencil re-renders asynchronously, and a single frame
    // was measured to read the PREVIOUS render's state — which is how this session
    // first concluded, wrongly, that a slotted control was already unfocusable.
    const settle = async () => {
      for (let i = 0; i < 6; i += 1) await new Promise<void>(r => requestAnimationFrame(() => r()));
    };
    const hitTest = (el: HTMLElement) => {
      // `scrollIntoView` first and the null check at the call site second, both
      // load-bearing: `elementFromPoint` returns null for any point outside the
      // viewport, so a bare `hit !== el` passes vacuously below the fold.
      el.scrollIntoView({ block: 'center' });
      const box = el.getBoundingClientRect();
      return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    };

    await customElements.whenDefined('mud-accordion-item');
    await customElements.whenDefined('mud-button');
    await settle();

    const item = find('item');
    const authored = find('authored');
    const ours = find('ours');
    const nested = find('nested');

    // 1. While disabled: the write reaches the elements handed to the slot, and
    //    nothing below them.
    if (!authored.hasAttribute('disabled')) {
      throw new Error('a slotted control authored `disabled` lost it while the item was disabled');
    }
    if (!ours.hasAttribute('disabled')) {
      throw new Error('the item did not disable a slotted control the consumer left enabled');
    }
    if (nested.hasAttribute('disabled')) {
      throw new Error('`disabled` reached a control nested inside a slotted wrapper');
    }

    // 1b. The pointer guard is a THREE-clause selector list. Drive every clause:
    //     a typo in the `heading` or `supporting` arm would otherwise ship green,
    //     and mock-doc computes no styles, so only this lane can see it.
    for (const [name, el] of [
      ['heading', find('head-slot')],
      ['supporting', find('sup-slot')],
      ['trailing', ours],
    ] as const) {
      if (getComputedStyle(el).pointerEvents !== 'none') {
        throw new Error(`slot="${name}" content is still pointer-interactive while the item is disabled`);
      }
    }

    // 1c. `!important` is load-bearing and this is its only proof: an inline
    //     declaration on the slotted element must not defeat the guard. Measured
    //     to hold because for `!important` the INNER (shadow) tree wins.
    ours.style.setProperty('pointer-events', 'auto', 'important');
    if (getComputedStyle(ours).pointerEvents !== 'none') {
      throw new Error('an inline `pointer-events !important` on the slotted control defeated the guard');
    }
    ours.style.removeProperty('pointer-events');

    // 1d. The keyboard mirror. `disabled` does nothing to an <a href>, so without
    //     `tabindex="-1"` this element is Tab-reachable while the accessibility
    //     tree reports it disabled — WCAG 2.1 SC 4.1.2.
    const link = find('link');
    if (link.getAttribute('tabindex') !== '-1') {
      throw new Error('a slotted <a href> is still in the tab order while the item is disabled');
    }

    // 2. The nested control gets no attribute, so the stylesheet is all that stands
    //    between it and the mouse — it inherits `pointer-events: none` from the
    //    wrapper the rule matches. Deliberately a plain button: one that sets its
    //    own `pointer-events: auto` is hit-testable regardless, since importance
    //    does not strengthen inheritance and `::slotted` takes no descendant
    //    combinator. That limit is documented, not asserted away here.
    const blocked = hitTest(nested);
    if (blocked === null) {
      throw new Error('hit-test point fell outside the viewport — the assertion would pass vacuously');
    }
    if (blocked === nested) {
      throw new Error('a control nested in a slotted wrapper is still the hit-test target while disabled');
    }

    // 3. KEYBOARD, for a DIRECTLY slotted control. The attribute is what closes this:
    //    measured, a disabled native <button> ancestor does not refuse focus to its
    //    flat-tree slotted descendants, so this fails if the attribute is not written.
    //    Focus is parked on a real element outside the accordion first — the item
    //    carries no tabindex, so `activeElement` would otherwise fall to <body> and
    //    the check would pass without proving focus was REFUSED rather than moved.
    const parking = find('parking');
    parking.focus();
    if (document.activeElement !== parking) {
      throw new Error('could not park focus — the keyboard assertion below would be vacuous');
    }
    ours.focus();
    if (document.activeElement !== parking) {
      throw new Error('a directly slotted control is keyboard-focusable while the item is disabled');
    }

    // 4. A control appended WHILE the item is disabled is disabled too — driven by
    //    the browser's own `slotchange`, with no dispatchEvent. This is the only
    //    place native firing is exercised; the spec lane cannot reach it.
    const late = document.createElement('mud-button');
    late.setAttribute('slot', 'trailing');
    late.textContent = 'Late';
    item.appendChild(late);
    await settle();
    if (!late.hasAttribute('disabled')) {
      throw new Error('a control slotted in while the item was already disabled was not disabled');
    }

    // 5. The transition issue #17 broke. `ours` and `late` go back because the
    //    component recorded writing them; `authored` stays because it never did.
    item.removeAttribute('disabled');
    await settle();

    if (!authored.hasAttribute('disabled')) {
      throw new Error('re-enabling the item stripped the consumer-authored `disabled` (issue #17)');
    }
    if (ours.hasAttribute('disabled')) {
      throw new Error('re-enabling the item left its own `disabled` on a slotted control');
    }
    if (late.hasAttribute('disabled')) {
      throw new Error('re-enabling the item left its own `disabled` on a late-slotted control');
    }
    // The mirror of 2 and 3. Without them, those prove nothing: a guard that never
    // lifts would satisfy the disabled-side checks forever.
    parking.focus();
    ours.focus();
    if (document.activeElement !== ours) {
      throw new Error('a slotted control stayed keyboard-unreachable after the item was enabled');
    }
    if (hitTest(nested) !== nested) {
      throw new Error('a nested slotted control stayed hit-test-blocked after the item was enabled');
    }
    if (link.hasAttribute('tabindex')) {
      throw new Error('the tabindex mirror was not removed when the item was enabled');
    }
  },
};
