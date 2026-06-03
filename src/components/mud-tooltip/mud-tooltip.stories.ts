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
  title: 'Atoms/Tooltip',
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
  },
  args: {
    size: 'sm',
    position: 'auto',
    variant: 'default',
    trigger: 'hover',
    open: false,
    content: 'Ajutor: introdu codul de 13 cifre.',
    triggerLabel: 'Detalii suplimentare',
    maxWidth: 200,
    showDelay: 0,
  },
};

export default meta;
type Story = StoryObj<TooltipArgs>;

// ---------------------------------------------------------------------------
// Default — hover trigger, auto position.
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: args => /*html*/ `
    <div style="${stageStyle}">${renderTooltip(args)}</div>
  `,
  parameters: {
    docs: { source: { code: docsSourceDefault({ ...meta.args! } as TooltipArgs) } },
  },
};

// ---------------------------------------------------------------------------
// FocusTrigger — opens on keyboard focus (Tab) instead of hover.
// ---------------------------------------------------------------------------
export const FocusTrigger: Story = {
  args: { trigger: 'focus', content: 'Apasă Tab pentru a focaliza.' },
  render: args => /*html*/ `
    <div style="${stageStyle}">
      <p style="${captionStyle}">Apasă Tab pentru a focaliza butonul. Apasă Esc pentru a închide.</p>
      ${renderTooltip(args)}
    </div>
  `,
  parameters: {
    docs: {
      source: {
        code: `<mud-tooltip trigger="focus">
  <button slot="trigger" type="button">Detalii suplimentare</button>
  Apasă Tab pentru a focaliza.
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
        <button slot="trigger" type="button" style="${buttonStyle}">Detalii</button>
        Ajutor: dimensiune mică.
      </mud-tooltip>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-12);">
      <p style="${captionStyle}">large</p>
      <mud-tooltip size="lg" trigger="manual" open>
        <button slot="trigger" type="button" style="${buttonStyle}">Detalii</button>
        Ajutor: dimensiune mare.
      </mud-tooltip>
    </div>
  </div>
`;
const docsSourceAllSizes = /*html*/ `<mud-tooltip size="sm" trigger="manual" open>
  <button slot="trigger" type="button">Detalii</button>
  Ajutor: dimensiune mică.
</mud-tooltip>

<mud-tooltip size="lg" trigger="manual" open>
  <button slot="trigger" type="button">Detalii</button>
  Ajutor: dimensiune mare.
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
          Ajutor: poziție ${pos}.
        </mud-tooltip>
      </div>`,
      )
      .join('')}
  </div>
`;
const docsSourceAllPositions = /*html*/ `<mud-tooltip position="top" trigger="manual" open>
  <button slot="trigger" type="button">Trigger</button>
  Ajutor: poziție top.
</mud-tooltip>

<mud-tooltip position="right" trigger="manual" open>
  <button slot="trigger" type="button">Trigger</button>
  Ajutor: poziție right.
</mud-tooltip>

<mud-tooltip position="bottom" trigger="manual" open>
  <button slot="trigger" type="button">Trigger</button>
  Ajutor: poziție bottom.
</mud-tooltip>

<mud-tooltip position="left" trigger="manual" open>
  <button slot="trigger" type="button">Trigger</button>
  Ajutor: poziție left.
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
    <p style="${captionStyle}">Plasează triggerul aproape de marginea de sus a vizibilei — tooltipul se inversează automat.</p>
    <div style="display: flex; justify-content: center;">
      <mud-tooltip position="auto" trigger="manual" open>
        <button slot="trigger" type="button" style="${buttonStyle}">Ajutor</button>
        Auto-flip: poziția preferată este \`top\`, dar tooltipul a fost rotit la \`bottom\` pentru a evita ieșirea din ecran.
      </mud-tooltip>
    </div>
  </div>
`;
const docsSourceAutoFlip = /*html*/ `<mud-tooltip position="auto" trigger="manual" open>
  <button slot="trigger" type="button">Ajutor</button>
  Auto-flip: poziția preferată este \`top\`, dar tooltipul a fost rotit la \`bottom\`.
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
      <button slot="trigger" type="button" style="${buttonStyle}">Buton instrucțional</button>
      Folosește acest control pentru a trimite formularul. Detalii suplimentare apar pe pagina de confirmare.
    </mud-tooltip>
  </div>
`;
const docsSourceCoach = /*html*/ `<mud-tooltip size="lg" variant="coach" trigger="manual" open max-width="280">
  <button slot="trigger" type="button">Buton instrucțional</button>
  Folosește acest control pentru a trimite formularul. Detalii suplimentare apar pe pagina de confirmare.
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
      Tooltip cu o lățime maximă personalizată de 320 de pixeli. Folosit doar atunci când conținutul nu încape în 200px.
    </mud-tooltip>
  </div>
`;
const docsSourceWithMaxWidth = /*html*/ `<mud-tooltip size="lg" trigger="manual" open max-width="320">
  <button slot="trigger" type="button">Trigger</button>
  Tooltip cu o lățime maximă personalizată de 320 de pixeli.
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
      <button slot="trigger" type="button" style="${buttonStyle}">Detalii suplimentare</button>
      Acesta este un tooltip cu mai multe linii de text care depășește lățimea unui singur rând.
    </mud-tooltip>
  </div>
`;
const docsSourceWithLongContent = /*html*/ `<mud-tooltip size="lg" trigger="manual" open>
  <button slot="trigger" type="button">Detalii suplimentare</button>
  Acesta este un tooltip cu mai multe linii de text care depășește lățimea unui singur rând.
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
      Tooltipul este controlat din afară.
    </mud-tooltip>
    <button
      type="button"
      style="${buttonStyle}; margin-inline-start: var(--spacing-12);"
      onclick="(function(b){var t=document.getElementById('manual-tooltip');if(t){t.open=!t.open;b.textContent=t.open?'Ascunde tooltip':'Arată tooltip';}})(this)"
    >Arată tooltip</button>
  </div>
`;
const docsSourceManual = /*html*/ `<mud-tooltip trigger="manual" open>
  <button slot="trigger" type="button">Anchor</button>
  Tooltipul este controlat din afară.
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
      <p style="${captionStyle}">Diacritice românești (ă â î ș ț)</p>
      <div style="${stageStyle}">
        <mud-tooltip size="lg" trigger="manual" open>
          <button slot="trigger" type="button" style="${buttonStyle}">Întreabă</button>
          Așteaptă confirmarea — câmpurile încărcate cu diacritice se afișează corect.
        </mud-tooltip>
      </div>
    </div>
    <div>
      <p style="${captionStyle}">Lângă marginea din dreapta (poziție inițială \`right\` se inversează)</p>
      <div style="display: flex; justify-content: flex-end; padding-inline-end: var(--spacing-8);">
        <mud-tooltip position="right" trigger="manual" open>
          <button slot="trigger" type="button" style="${buttonStyle}">Edge</button>
          Tooltipul se rotește la stânga când dreapta nu încape.
        </mud-tooltip>
      </div>
    </div>
  </div>
`;
const docsSourceEdgeCases = /*html*/ `<mud-tooltip size="lg" trigger="manual" open>
  <button slot="trigger" type="button">Întreabă</button>
  Așteaptă confirmarea — câmpurile încărcate cu diacritice se afișează corect.
</mud-tooltip>

<mud-tooltip position="right" trigger="manual" open>
  <button slot="trigger" type="button">Edge</button>
  Tooltipul se rotește la stânga când dreapta nu încape.
</mud-tooltip>`;
export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceEdgeCases } } },
};
