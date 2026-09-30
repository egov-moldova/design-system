import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { TOOLTIP_POSITIONS, TOOLTIP_SIZES, TOOLTIP_TRIGGERS, TOOLTIP_VARIANTS } from './mud-tooltip.types';
import type { TooltipPosition, TooltipSize, TooltipTrigger, TooltipVariant } from './mud-tooltip.types';

type TooltipArgs = {
  size: TooltipSize;
  position: TooltipPosition;
  variant: TooltipVariant;
  trigger: TooltipTrigger;
  open: boolean;
  content: string;
  triggerLabel: string;
  maxWidth: number;
  showDelay: number;
  locale: string;
  closeLabel: string;
  dismissHint: string;
};

const renderTooltip = (args: TooltipArgs) => /*html*/ `
  <mud-tooltip
    size="${args.size}"
    position="${args.position}"
    variant="${args.variant}"
    trigger="${args.trigger}"
    ${args.open ? 'open' : ''}
    max-width="${args.maxWidth}"
    show-delay="${args.showDelay}"
    ${args.locale ? `locale="${args.locale}"` : ''}
    ${args.closeLabel ? `close-label="${args.closeLabel}"` : ''}
    ${args.dismissHint ? `dismiss-hint="${args.dismissHint}"` : ''}
  >
    <button slot="trigger" type="button">${args.triggerLabel}</button>
    ${args.content}
  </mud-tooltip>
`;

const docsSourceDefault = (args: TooltipArgs) => {
  const attrs = [
    args.size !== 'sm' ? `size="${args.size}"` : '',
    args.position !== 'auto' ? `position="${args.position}"` : '',
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.trigger !== 'hover' ? `trigger="${args.trigger}"` : '',
    args.open ? 'open' : '',
    args.maxWidth !== 200 ? `max-width="${args.maxWidth}"` : '',
    args.showDelay !== 200 ? `show-delay="${args.showDelay}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const open = attrs ? `<mud-tooltip ${attrs}>` : '<mud-tooltip>';
  return `${open}
  <button slot="trigger" type="button">${args.triggerLabel}</button>
  ${args.content}
</mud-tooltip>`;
};

// ---------------------------------------------------------------------------
// Layout helpers — give the bubble breathing room inside the story canvas.
// ---------------------------------------------------------------------------

const stageStyle =
  'display: flex; align-items: center; justify-content: center; min-height: 220px; padding: var(--spacing-48) var(--spacing-24);';
const captionStyle =
  'font-family: var(--font-family-primary); font-size: 12px; font-weight: 500; color: var(--color-text-base-secondary); margin: 0 0 var(--spacing-8) 0;';
const gridStyle =
  'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 240px; row-gap: var(--spacing-48); align-items: end; justify-items: center; padding: var(--spacing-80) var(--spacing-32) var(--spacing-32);';
const positionGridStyle =
  'display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 260px; row-gap: var(--spacing-64); align-items: center; justify-items: center; padding: var(--spacing-80) var(--spacing-64);';
const buttonStyle =
  'font-family: var(--font-family-primary); font-size: 14px; font-weight: 500; padding: var(--spacing-8) var(--spacing-12); border-radius: var(--border-radius-6); border: 1px solid var(--color-border-base-default); background: var(--color-background-base-default); color: var(--color-text-base-default); cursor: pointer;';

const meta: Meta<TooltipArgs> = {
  title: 'Components/Tooltip',
  component: 'mud-tooltip',
  parameters: {
    layout: 'centered',
    docs: {
      // The bubble is `position: fixed`; Storybook's inline Docs canvases apply a
      // `transform` + `overflow` that traps and clips fixed descendants, which
      // mispositions the always-open demo bubbles. Rendering each story in its own
      // iframe gives a clean viewport so positioning resolves correctly.
      story: { inline: false, iframeHeight: 480 },
      description: {
        component: /*md*/ `
**Tooltip** — transient label or persistent coach mark anchored to a trigger
element. The default variant opens on hover (after \`show-delay\` ms) or focus
and closes on \`mouseleave\` / \`blur\` / \`Esc\`. The coach variant adds a close
button and stays open until the user explicitly dismisses it.

Position is computed against the trigger's bounding rect; \`auto\` (default)
prefers \`top\` and flips to the opposite side when the bubble would overflow.

The slotted trigger element receives \`aria-describedby\` pointing at the
bubble (which carries \`role="tooltip"\`) so screen readers announce the
tooltip body alongside the control.

> **Note:** the size/position/variant grids below use \`trigger="manual" open\`
> to display the bubble statically — they do **not** react to hover or click.
> Use **Default** (hover), **Focus Trigger**, or **Manual** to test interaction.
        `.trim(),
      },
    },
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: TOOLTIP_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'sm' } },
    },
    position: {
      control: 'select',
      options: TOOLTIP_POSITIONS,
      description: 'Preferred position relative to the trigger. `auto` flips when overflowing.',
      table: { defaultValue: { summary: 'auto' } },
    },
    variant: {
      control: 'inline-radio',
      options: TOOLTIP_VARIANTS,
      description: 'Visual variant.',
      table: { defaultValue: { summary: 'default' } },
    },
    trigger: {
      control: 'inline-radio',
      options: TOOLTIP_TRIGGERS,
      description: 'Activation mode.',
      table: { defaultValue: { summary: 'hover' } },
    },
    open: { control: 'boolean', description: 'Visibility (used with `trigger="manual"`).' },
    content: { control: 'text', description: 'Default-slot text content.' },
    triggerLabel: { control: 'text', description: 'Trigger button label.' },
    maxWidth: { control: 'number', description: 'Max bubble width in pixels.' },
    showDelay: {
      name: 'show-delay',
      control: 'number',
      description: 'Hover show-delay (ms). Focus/click/manual ignore it.',
      table: { defaultValue: { summary: '200' } },
    },
    locale: {
      control: 'select',
      options: ['', 'ro-MD', 'en-US', 'ru-MD'],
      description: 'Language of the built-in copy. Unset follows the closest ancestor `lang`, else `ro-MD`.',
    },
    closeLabel: {
      name: 'close-label',
      control: 'text',
      description: "Accessible label for the coach variant's close button. Overrides the locale's copy.",
      table: { defaultValue: { summary: 'Close the tooltip' } },
    },
    dismissHint: {
      name: 'dismiss-hint',
      control: 'text',
      description: "Dismiss hint shown in the coach variant's body. Overrides the locale's copy.",
      table: { defaultValue: { summary: 'Press Esc to close.' } },
    },
  },
  args: {
    size: 'sm',
    position: 'auto',
    variant: 'default',
    trigger: 'hover',
    open: false,
    content: 'Help: enter the 13-digit code.',
    triggerLabel: 'More details',
    maxWidth: 200,
    showDelay: 0,
    locale: '',
    closeLabel: '',
    dismissHint: '',
  },
};

export default meta;
type Story = StoryObj<TooltipArgs>;

// ---------------------------------------------------------------------------
// Default — hover trigger, auto position.
// ---------------------------------------------------------------------------
export const Default: Story = {
  // Open + manual so the Controls playground stays visible: every prop
  // (size, position, variant, max-width, content…) updates the bubble live.
  // A hover/focus tooltip is invisible until you interact, so the controls
  // would appear to "do nothing". Switch `trigger` to hover/focus/click in
  // Controls (and hover/focus the button) to exercise those activation modes.
  args: { trigger: 'manual', open: true },
  render: args => /*html*/ `
    <div style="${stageStyle}">${renderTooltip(args)}</div>
  `,
  parameters: {
    docs: {
      // Render the playground inline in Docs (overriding the meta-level
      // `inline: false`). Controls only propagate to inline Docs stories; an
      // `inline: false` story lives in an isolated iframe the Controls table
      // can't reach, so prop changes appear to "do nothing" in Docs.
      story: { inline: true },
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: TooltipArgs }) => docsSourceDefault(args),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// FocusTrigger — opens on keyboard focus (Tab) instead of hover.
// ---------------------------------------------------------------------------
export const FocusTrigger: Story = {
  args: { trigger: 'focus', content: 'Press Tab to focus.' },
  render: args => /*html*/ `
    <div style="${stageStyle}">
      <p style="${captionStyle}">Press Tab to focus the button. Press Esc to close.</p>
      ${renderTooltip(args)}
    </div>
  `,
  parameters: {
    docs: {
      source: {
        code: `<mud-tooltip trigger="focus">
  <button slot="trigger" type="button">More details</button>
  Press Tab to focus.
</mud-tooltip>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// AllSizes — sm + lg open, side by side.
// ---------------------------------------------------------------------------
const renderAllSizes = () => /*html*/ `
  <div style="${gridStyle}">
    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-12);">
      <p style="${captionStyle}">small</p>
      <mud-tooltip size="sm" trigger="manual" open>
        <button slot="trigger" type="button" style="${buttonStyle}">Details</button>
        Help: small size.
      </mud-tooltip>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-12);">
      <p style="${captionStyle}">large</p>
      <mud-tooltip size="lg" trigger="manual" open>
        <button slot="trigger" type="button" style="${buttonStyle}">Details</button>
        Help: large size.
      </mud-tooltip>
    </div>
  </div>
`;
const docsSourceAllSizes = /*html*/ `<mud-tooltip size="sm" trigger="manual" open>
  <button slot="trigger" type="button">Details</button>
  Help: small size.
</mud-tooltip>

<mud-tooltip size="lg" trigger="manual" open>
  <button slot="trigger" type="button">Details</button>
  Help: large size.
</mud-tooltip>`;
export const AllSizes: Story = {
  render: renderAllSizes,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceAllSizes } } },
};

// ---------------------------------------------------------------------------
// AllPositions — top / right / bottom / left in a 4-column grid.
// ---------------------------------------------------------------------------
const renderAllPositions = () => /*html*/ `
  <div style="${positionGridStyle}">
    ${(['top', 'right', 'bottom', 'left'] as const)
      .map(
        pos => /*html*/ `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-12);">
        <p style="${captionStyle}">${pos}</p>
        <mud-tooltip size="sm" position="${pos}" trigger="manual" open>
          <button slot="trigger" type="button" style="${buttonStyle}">Trigger</button>
          Help: position ${pos}.
        </mud-tooltip>
      </div>`,
      )
      .join('')}
  </div>
`;
const docsSourceAllPositions = /*html*/ `<mud-tooltip position="top" trigger="manual" open>
  <button slot="trigger" type="button">Trigger</button>
  Help: position top.
</mud-tooltip>

<mud-tooltip position="right" trigger="manual" open>
  <button slot="trigger" type="button">Trigger</button>
  Help: position right.
</mud-tooltip>

<mud-tooltip position="bottom" trigger="manual" open>
  <button slot="trigger" type="button">Trigger</button>
  Help: position bottom.
</mud-tooltip>

<mud-tooltip position="left" trigger="manual" open>
  <button slot="trigger" type="button">Trigger</button>
  Help: position left.
</mud-tooltip>`;
export const AllPositions: Story = {
  render: renderAllPositions,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceAllPositions } } },
};

// ---------------------------------------------------------------------------
// AutoFlip — preferred `top` flips to `bottom` near the top edge of the canvas.
// ---------------------------------------------------------------------------
const renderAutoFlip = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-32); padding: var(--spacing-24);">
    <p style="${captionStyle}">Place the trigger close to the top edge of the viewport — the tooltip flips automatically.</p>
    <div style="display: flex; justify-content: center;">
      <mud-tooltip position="auto" trigger="manual" open>
        <button slot="trigger" type="button" style="${buttonStyle}">Help</button>
        Auto-flip: the preferred position is \`top\`, but the tooltip was flipped to \`bottom\` to stay on screen.
      </mud-tooltip>
    </div>
  </div>
`;
const docsSourceAutoFlip = /*html*/ `<mud-tooltip position="auto" trigger="manual" open>
  <button slot="trigger" type="button">Help</button>
  Auto-flip: the preferred position is \`top\`, but the tooltip was flipped to \`bottom\`.
</mud-tooltip>`;
export const AutoFlip: Story = {
  render: renderAutoFlip,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceAutoFlip } } },
};

// ---------------------------------------------------------------------------
// Coach — persistent instructional variant with close button + Esc hint.
// ---------------------------------------------------------------------------
const renderCoach = () => /*html*/ `
  <div style="${stageStyle}">
    <mud-tooltip size="lg" variant="coach" trigger="manual" open max-width="280">
      <button slot="trigger" type="button" style="${buttonStyle}">Instruction button</button>
      Use this control to submit the form. Additional details appear on the confirmation page.
    </mud-tooltip>
  </div>
`;
const docsSourceCoach = /*html*/ `<mud-tooltip size="lg" variant="coach" trigger="manual" open max-width="280">
  <button slot="trigger" type="button">Instruction button</button>
  Use this control to submit the form. Additional details appear on the confirmation page.
</mud-tooltip>`;
export const Coach: Story = {
  render: renderCoach,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceCoach } } },
};

// ---------------------------------------------------------------------------
// WithMaxWidth — custom maxWidth override (default 200).
// ---------------------------------------------------------------------------
const renderWithMaxWidth = () => /*html*/ `
  <div style="${stageStyle}">
    <mud-tooltip size="lg" trigger="manual" open max-width="320">
      <button slot="trigger" type="button" style="${buttonStyle}">Trigger</button>
      Tooltip with a custom maximum width of 320 pixels. Used only when the content does not fit in 200px.
    </mud-tooltip>
  </div>
`;
const docsSourceWithMaxWidth = /*html*/ `<mud-tooltip size="lg" trigger="manual" open max-width="320">
  <button slot="trigger" type="button">Trigger</button>
  Tooltip with a custom maximum width of 320 pixels.
</mud-tooltip>`;
export const WithMaxWidth: Story = {
  render: renderWithMaxWidth,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceWithMaxWidth } } },
};

// ---------------------------------------------------------------------------
// WithLongContent — wrapping behavior + 200px max-width.
// ---------------------------------------------------------------------------
const renderWithLongContent = () => /*html*/ `
  <div style="${stageStyle}">
    <mud-tooltip size="lg" trigger="manual" open>
      <button slot="trigger" type="button" style="${buttonStyle}">More details</button>
      This is a tooltip with several lines of text that exceeds the width of a single row.
    </mud-tooltip>
  </div>
`;
const docsSourceWithLongContent = /*html*/ `<mud-tooltip size="lg" trigger="manual" open>
  <button slot="trigger" type="button">More details</button>
  This is a tooltip with several lines of text that exceeds the width of a single row.
</mud-tooltip>`;
export const WithLongContent: Story = {
  render: renderWithLongContent,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithLongContent } },
  },
};

// ---------------------------------------------------------------------------
// Manual — visibility driven entirely by the `open` prop.
// ---------------------------------------------------------------------------
const renderManual = () => /*html*/ `
  <div style="${stageStyle}">
    <mud-tooltip id="manual-tooltip" trigger="manual">
      <button slot="trigger" type="button" style="${buttonStyle}">Anchor</button>
      The tooltip is controlled from outside.
    </mud-tooltip>
    <button
      type="button"
      style="${buttonStyle}; margin-inline-start: var(--spacing-12);"
      onclick="(function(b){var t=document.getElementById('manual-tooltip');if(t){t.open=!t.open;b.textContent=t.open?'Hide tooltip':'Show tooltip';}})(this)"
    >Show tooltip</button>
  </div>
`;
const docsSourceManual = /*html*/ `<mud-tooltip trigger="manual" open>
  <button slot="trigger" type="button">Anchor</button>
  The tooltip is controlled from outside.
</mud-tooltip>`;
export const Manual: Story = {
  render: renderManual,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceManual } } },
};

// ---------------------------------------------------------------------------
// EdgeCases — top edge (forces flip), right edge (forces flip), diacritics.
// ---------------------------------------------------------------------------
const renderEdgeCases = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-32); padding: var(--spacing-24);">
    <div>
      <p style="${captionStyle}">Accented characters (é ü ñ)</p>
      <div style="${stageStyle}">
        <mud-tooltip size="lg" trigger="manual" open>
          <button slot="trigger" type="button" style="${buttonStyle}">Ask</button>
          Accented characters (é ü ñ) render correctly in loaded fields.
        </mud-tooltip>
      </div>
    </div>
    <div>
      <p style="${captionStyle}">Near the right edge (initial position \`right\` flips)</p>
      <div style="display: flex; justify-content: flex-end; padding-inline-end: var(--spacing-8);">
        <mud-tooltip position="right" trigger="manual" open>
          <button slot="trigger" type="button" style="${buttonStyle}">Edge</button>
          The tooltip flips to the left when the right side does not fit.
        </mud-tooltip>
      </div>
    </div>
  </div>
`;
const docsSourceEdgeCases = /*html*/ `<mud-tooltip size="lg" trigger="manual" open>
  <button slot="trigger" type="button">Ask</button>
  Accented characters (é ü ñ) render correctly in loaded fields.
</mud-tooltip>

<mud-tooltip position="right" trigger="manual" open>
  <button slot="trigger" type="button">Edge</button>
  The tooltip flips to the left when the right side does not fit.
</mud-tooltip>`;
export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceEdgeCases } } },
};

// ---------------------------------------------------------------------------
// Locales — the coach tooltip's built-in dismiss hint
// ---------------------------------------------------------------------------
const LOCALES = ['ro-MD', 'en-US', 'ru-MD'] as const;

const localesTooltip = (locale: string) => /*html*/ `
  <div style="${stageStyle}">
    <mud-tooltip locale="${locale}" size="lg" variant="coach" trigger="manual" open max-width="240">
      <button slot="trigger" type="button" style="${buttonStyle}">Instruction button</button>
      Use this control to submit the form.
    </mud-tooltip>
  </div>
`;

export const Locales: Story = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--spacing-24);">
      ${LOCALES.map(locale => /*html*/ `<div><p style="${captionStyle}">locale="${locale}"</p>${localesTooltip(locale)}</div>`).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The same component under each supported locale. Only the built-in copy changes; content stays as written. This is the one place a story pins `locale` — every other story follows the Storybook toolbar.',
      },
      source: { code: LOCALES.map(localesTooltip).join('\n') },
    },
  },
};
