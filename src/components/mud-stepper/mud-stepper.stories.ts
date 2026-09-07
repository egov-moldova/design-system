import type { Meta, StoryObj } from '@storybook/web-components-vite';

import type { StepperStep } from './mud-stepper.types';

type StepperArgs = {
  steps: StepperStep[];
  orientation: 'horizontal' | 'vertical';
  interactive: boolean;
  compact?: boolean;
  currentStep?: number;
  ariaLabel: string;
};

const sectionLabelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); margin: 0 0 var(--spacing-8); font-style: italic;';
const headingStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-default); font-weight: 500; margin: var(--spacing-16) 0 var(--spacing-8); font-family: ui-monospace, SFMono-Regular, Menlo, monospace;';

// ---------------------------------------------------------------------------
// Romanian voice — multi-step onboarding flow for a public-service portal.
// ---------------------------------------------------------------------------
const defaultSteps: StepperStep[] = [
  { label: 'Pasul 1: Date personale', status: 'completed' },
  { label: 'Pasul 2: Documente', status: 'current' },
  { label: 'Pasul 3: Confirmare', status: 'pending' },
];

const verticalSteps: StepperStep[] = [
  { label: 'Pasul 1: Date personale', status: 'completed' },
  { label: 'Pasul 2: Documente', status: 'current' },
  { label: 'Pasul 3: Plată', status: 'pending' },
  { label: 'Pasul 4: Confirmare', status: 'pending' },
];

const allStatesSteps: StepperStep[] = [
  { label: 'Finalizat', status: 'completed' },
  { label: 'Curent', status: 'current' },
  { label: 'Disponibil', status: 'available' },
  { label: 'În așteptare', status: 'pending' },
  { label: 'Eroare', status: 'error' },
];

const withSupportingTextSteps: StepperStep[] = [
  {
    label: 'Pasul 1: Date personale',
    supportingText: 'Nume, prenume, CNP',
    status: 'completed',
  },
  {
    label: 'Pasul 2: Documente',
    supportingText: 'Carte de identitate, adeverință',
    status: 'current',
  },
  {
    label: 'Pasul 3: Plată',
    supportingText: 'Selectați metoda de plată',
    status: 'pending',
  },
  {
    label: 'Pasul 4: Confirmare',
    supportingText: 'Verificați datele introduse',
    status: 'pending',
  },
];

const numberedSteps: StepperStep[] = [
  { label: 'Date personale', status: 'completed' },
  { label: 'Documente', status: 'completed' },
  { label: 'Plată', status: 'current' },
  { label: 'Confirmare', status: 'pending' },
  { label: 'Finalizare', status: 'pending' },
];

const iconSteps: StepperStep[] = [
  { label: 'Date personale', iconName: 'user', status: 'completed' },
  { label: 'Documente', iconName: 'file', status: 'current' },
  { label: 'Plată', iconName: 'wallet', status: 'pending' },
  { label: 'Confirmare', iconName: 'checkmark-large', status: 'pending' },
];

const manySteps: StepperStep[] = [
  { label: 'Pasul 1', status: 'completed' },
  { label: 'Pasul 2', status: 'completed' },
  { label: 'Pasul 3', status: 'completed' },
  { label: 'Pasul 4', status: 'current' },
  { label: 'Pasul 5', status: 'pending' },
  { label: 'Pasul 6', status: 'pending' },
  { label: 'Pasul 7', status: 'pending' },
  { label: 'Pasul 8', status: 'pending' },
];

const interactiveSteps: StepperStep[] = [
  { label: 'Pasul 1: Date personale', status: 'completed' },
  { label: 'Pasul 2: Documente', status: 'completed' },
  { label: 'Pasul 3: Plată', status: 'current' },
  { label: 'Pasul 4: Confirmare', status: 'available' },
  { label: 'Pasul 5: Finalizare', status: 'pending' },
];

let storyInstance = 0;
const nextId = () => `mud-stepper-story-${++storyInstance}`;

const setStepsScript = (id: string, steps: StepperStep[]) =>
  /*html*/ `<script>(function(){const el=document.getElementById('${id}');if(el)el.steps=${JSON.stringify(steps)};})();</script>`;

const renderStepper = (args: StepperArgs, steps: StepperStep[] = args.steps) => {
  const id = nextId();
  return /*html*/ `
    <mud-stepper
      id="${id}"
      orientation="${args.orientation}"
      ${args.interactive ? 'interactive' : ''}
      ${args.compact ? 'compact' : ''}
      ${typeof args.currentStep === 'number' ? `current-step="${args.currentStep}"` : ''}
      ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
    ></mud-stepper>
    ${setStepsScript(id, steps)}
  `;
};

const renderDefault = (args: StepperArgs) => /*html*/ `
  <div style="padding: var(--spacing-24); background: var(--color-background-base-default); max-width: 996px;">
    ${renderStepper(args)}
  </div>
`;

const docsSourceDefault = (args: StepperArgs) => `<mud-stepper id="my-tracker"
  orientation="${args.orientation}"
  ${args.interactive ? 'interactive' : ''}></mud-stepper>
<script>
  document.getElementById('my-tracker').steps = ${JSON.stringify(args.steps, null, 2)};
</script>`;

const meta: Meta<StepperArgs> = {
  title: 'Molecules/Stepper',
  component: 'mud-stepper',
  argTypes: {
    steps: {
      control: 'object',
      description:
        'Typed step list. Each item: { label, status, supportingText?, iconName?, id?, disabled? }. Status drives visual state and ARIA semantics.',
    },
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
      description: 'Layout direction. Horizontal places labels under indicators; vertical places labels beside.',
      table: { defaultValue: { summary: 'horizontal' } },
    },
    interactive: {
      control: 'boolean',
      description: 'When true, completed/current steps render as `<button>` and emit `mudStepClick`.',
      table: { defaultValue: { summary: 'false' } },
    },
    compact: {
      control: 'boolean',
      description: 'Mobile dot rail — step numbers + labels hidden (status icons kept). Works in both orientations.',
      table: { defaultValue: { summary: 'false' } },
    },
    currentStep: {
      control: { type: 'number', min: 0 },
      description: 'Optional override — zero-based index of the current step.',
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible name for the list landmark.',
      table: { defaultValue: { summary: 'Progress tracker' } },
    },
  },
};
export default meta;

type Story = StoryObj<StepperArgs>;

// ---------------------------------------------------------------------------
// Default — horizontal, 3 steps (Pasul 1 / 2 / 3) — covers completed/current/pending.
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderDefault,
  args: {
    steps: defaultSteps,
    orientation: 'horizontal',
    interactive: false,
    ariaLabel: 'Pași de înregistrare',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: StepperArgs }) => docsSourceDefault(args),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Vertical — 4 steps, top-to-bottom (sidebar wizard pattern).
// ---------------------------------------------------------------------------
export const Vertical: Story = {
  render: args => /*html*/ `
    <div style="padding: var(--spacing-24); background: var(--color-background-base-default); max-width: 400px;">
      <p style="${sectionLabelStyle}">Orientation = vertical — flow runs top to bottom; labels render next to each indicator.</p>
      ${renderStepper(args, verticalSteps)}
    </div>
  `,
  args: {
    steps: verticalSteps,
    orientation: 'vertical',
    interactive: false,
    ariaLabel: 'Pași',
  },
  parameters: {
    controls: { disable: false },
    docs: {
      source: {
        code: docsSourceDefault({
          steps: verticalSteps,
          orientation: 'vertical',
          interactive: false,
          ariaLabel: 'Pași',
        }),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Interactive — completed/current steps are clickable buttons.
// ---------------------------------------------------------------------------
export const Interactive: Story = {
  render: args => {
    const id = nextId();
    const logId = `${id}-log`;
    return /*html*/ `
      <div style="padding: var(--spacing-24); background: var(--color-background-base-default); max-width: 996px;">
        <p style="${sectionLabelStyle}">interactive = true — completed, current, and available steps render as &lt;button&gt; and emit <code>mudStepClick</code>. Completed/available labels become brand underlined links. Pending steps remain non-actionable per the WAI-ARIA stepper pattern.</p>
        <mud-stepper
          id="${id}"
          orientation="${args.orientation}"
          interactive
          ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
        ></mud-stepper>
        ${setStepsScript(id, interactiveSteps)}
        <p id="${logId}" style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: var(--font-size-12); margin-top: var(--spacing-16); color: var(--color-text-base-tertiary);">Click any non-pending step…</p>
        <script>(function(){const el=document.getElementById('${id}');const log=document.getElementById('${logId}');if(el&&log){el.addEventListener('mudStepClick',function(ev){log.textContent='mudStepClick → index='+ev.detail.index+', label="'+ev.detail.step.label+'"';});}})();</script>
      </div>
    `;
  },
  args: {
    steps: interactiveSteps,
    orientation: 'horizontal',
    interactive: true,
    ariaLabel: 'Pași de înregistrare',
  },
  parameters: {
    docs: {
      source: {
        code: docsSourceDefault({
          steps: interactiveSteps,
          orientation: 'horizontal',
          interactive: true,
          ariaLabel: 'Pași de înregistrare',
        }),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// NonInteractive — explicit read-only display tracker (default behaviour).
// ---------------------------------------------------------------------------
export const NonInteractive: Story = {
  render: args => /*html*/ `
    <div style="padding: var(--spacing-24); background: var(--color-background-base-default); max-width: 996px;">
      <p style="${sectionLabelStyle}">interactive = false (default) — pure display. Each step is rendered as a non-actionable &lt;li&gt; with appropriate ARIA semantics for screen readers.</p>
      ${renderStepper(args, defaultSteps)}
    </div>
  `,
  args: {
    steps: defaultSteps,
    orientation: 'horizontal',
    interactive: false,
    ariaLabel: 'Pași de înregistrare',
  },
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// AllStates — pending / current / completed / error side-by-side.
// ---------------------------------------------------------------------------
export const AllStates: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); background: var(--color-background-base-default); max-width: 996px;">
      <p style="${sectionLabelStyle}">All five lifecycle states sampled from Figma node 634:10573. The error state retains the danger indicator even when overridden by <code>currentStep</code>.</p>
      <div>
        <p style="${headingStyle}">horizontal — completed / current / available / pending / error</p>
        ${renderStepper({
          steps: allStatesSteps,
          orientation: 'horizontal',
          interactive: false,
          ariaLabel: 'Toate stările',
        })}
      </div>
      <div>
        <p style="${headingStyle}">vertical — same states stacked</p>
        <div style="max-width: 320px;">
          ${renderStepper({
            steps: allStatesSteps,
            orientation: 'vertical',
            interactive: false,
            ariaLabel: 'Toate stările',
          })}
        </div>
      </div>
    </div>
  `,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// WithSupportingText — each step has a secondary line under the label.
// ---------------------------------------------------------------------------
export const WithSupportingText: Story = {
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); background: var(--color-background-base-default); max-width: 400px;">
      <p style="${sectionLabelStyle}">Step variant with <code>supportingText</code> — recommended for vertical orientation where the extra line has room to breathe.</p>
      ${renderStepper({
        steps: withSupportingTextSteps,
        orientation: 'vertical',
        interactive: false,
        ariaLabel: 'Pași cu detalii',
      })}
    </div>
  `,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// NumberedIndicators — explicit number-only flow.
// ---------------------------------------------------------------------------
export const NumberedIndicators: Story = {
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); background: var(--color-background-base-default); max-width: 996px;">
      <p style="${sectionLabelStyle}">Numbered indicators (default for pending/current). Completed steps automatically swap to a checkmark.</p>
      ${renderStepper({
        steps: numberedSteps,
        orientation: 'horizontal',
        interactive: false,
        ariaLabel: 'Pași numerotați',
      })}
    </div>
  `,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// IconIndicators — each step uses a domain-specific icon.
// ---------------------------------------------------------------------------
export const IconIndicators: Story = {
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); background: var(--color-background-base-default); max-width: 996px;">
      <p style="${sectionLabelStyle}">Per-step <code>iconName</code> override — use sparingly when a domain icon is clearer than a number (e.g. user, file, wallet).</p>
      ${renderStepper({
        steps: iconSteps,
        orientation: 'horizontal',
        interactive: false,
        ariaLabel: 'Pași cu pictograme',
      })}
    </div>
  `,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// StepIndicatorOnly — compact dot rail (mini variant).
// ---------------------------------------------------------------------------
export const StepIndicatorOnly: Story = {
  render: () => /*html*/ `
      <div style="padding: var(--spacing-24); background: var(--color-background-base-default); max-width: 240px;">
        <p style="${sectionLabelStyle}">Compact <code>compact</code> variant — number-less dot rail, labels stripped (status icons kept). Useful inside cards or tight headers. Step status/labels stay in the accessibility tree.</p>
        ${renderStepper({
          steps: defaultSteps,
          orientation: 'horizontal',
          interactive: false,
          compact: true,
          ariaLabel: 'Indicator pași',
        })}
      </div>
    `,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// Mobile — the `compact` dot rail in both orientations (Figma mobile breakpoint).
// ---------------------------------------------------------------------------
const mobileSteps: StepperStep[] = [
  { label: 'Pasul 1', status: 'completed' },
  { label: 'Pasul 2', status: 'current' },
  { label: 'Pasul 3', status: 'pending' },
  { label: 'Pasul 4', status: 'pending' },
  { label: 'Pasul 5', status: 'pending' },
];

export const Mobile: Story = {
  name: 'Mobile (compact)',
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-32); padding: var(--spacing-24); background: var(--color-background-base-default);">
      <div>
        <p style="${headingStyle}">horizontal — full-width dot rail (343px)</p>
        <p style="${sectionLabelStyle}">The Figma "Breakpoints — mobile" representation: <code>compact</code> hides the step numbers + labels, leaving a dot rail. Filled brand + checkmark = completed, hollow ring = current/upcoming.</p>
        <div style="max-width: 343px;">
          ${renderStepper({ steps: mobileSteps, orientation: 'horizontal', interactive: false, compact: true, ariaLabel: 'Pași (mobil)' })}
        </div>
      </div>
      <div>
        <p style="${headingStyle}">vertical — compact dot rail</p>
        ${renderStepper({ steps: mobileSteps, orientation: 'vertical', interactive: false, compact: true, ariaLabel: 'Pași (mobil, vertical)' })}
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Set the `compact` attribute for the mobile breakpoint. The step numbers and text labels are hidden, leaving a dot rail; progress is conveyed by the per-status fills (filled brand + checkmark = completed, hollow ring = current / available / pending, danger ring + cross = error). The step labels remain in the accessibility tree.',
      },
      source: {
        code: `<mud-stepper compact aria-label="Pași"></mud-stepper>
<script>
  document.querySelector('mud-stepper').steps = [
    { label: 'Pasul 1', status: 'completed' },
    { label: 'Pasul 2', status: 'current' },
    { label: 'Pasul 3', status: 'pending' },
  ];
</script>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// EdgeCases — many steps (8), overflow / wrap behaviour.
// ---------------------------------------------------------------------------
export const EdgeCases: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); background: var(--color-background-base-default);">
      <div>
        <p style="${headingStyle}">8 steps at full width</p>
        <p style="${sectionLabelStyle}">The tracker proportionally distributes the connector length. Overall width is capped at 996px per the Figma specification.</p>
        ${renderStepper({
          steps: manySteps,
          orientation: 'horizontal',
          interactive: false,
          ariaLabel: 'Pași multipli',
        })}
      </div>
      <div>
        <p style="${headingStyle}">narrow container (480px)</p>
        <p style="${sectionLabelStyle}">When the parent is too narrow, connectors collapse to their minimum length (<code>--stepper-connector-min-length</code>) and labels can clip — designers should switch to vertical for &lt;640px.</p>
        <div style="max-width: 480px; border: 1px dashed var(--color-border-base-default); border-radius: 8px; padding: var(--spacing-12);">
          ${renderStepper({
            steps: manySteps,
            orientation: 'horizontal',
            interactive: false,
            ariaLabel: 'Pași multipli compacți',
          })}
        </div>
      </div>
      <div>
        <p style="${headingStyle}">single step</p>
        <p style="${sectionLabelStyle}">A one-step tracker — no connectors render.</p>
        ${renderStepper({
          steps: [{ label: 'Doar un singur pas', status: 'current' }],
          orientation: 'horizontal',
          interactive: false,
          ariaLabel: 'Un singur pas',
        })}
      </div>
    </div>
  `,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// Coverage guard — ensures Stencil constructor is exercised in tests.
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<mud-stepper id="mud-stepper-coverage"></mud-stepper>
    <script>(function(){const el=document.getElementById('mud-stepper-coverage');if(el)el.steps=${JSON.stringify(defaultSteps)};})();</script>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('mud-stepper') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    if (!Ctor) throw new Error('mud-stepper constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('mud-stepper did not construct');
  },
};
