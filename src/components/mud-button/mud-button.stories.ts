import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { BUTTON_APPEARANCES, BUTTON_SHAPES, BUTTON_SIZES, BUTTON_TYPES, BUTTON_VARIANTS } from './mud-button.types';
import type { ButtonAppearance, ButtonShape, ButtonSize, ButtonType, ButtonVariant } from './mud-button.types';

type ButtonArgs = {
  variant: ButtonVariant;
  appearance: ButtonAppearance;
  size: ButtonSize;
  shape: ButtonShape;
  type: ButtonType;
  disabled: boolean;
  loading: boolean;
  fullWidth: boolean;
  href: string;
  label: string;
};

const renderButton = (args: ButtonArgs) => /*html*/ `
  <mud-button
    variant="${args.variant}"
    appearance="${args.appearance}"
    size="${args.size}"
    shape="${args.shape}"
    type="${args.type}"
    ${args.disabled ? 'disabled' : ''}
    ${args.loading ? 'loading' : ''}
    ${args.fullWidth ? 'full-width' : ''}
    ${args.href ? `href="${args.href}"` : ''}
  >${args.label}</mud-button>
`;

// ---------------------------------------------------------------------------
// Docs-source helpers — return clean web-component markup (no demo chrome,
// no wrapper divs, no inline styles) so the Storybook docs "Show code" panel
// shows what a consumer would actually paste into their HTML.
// ---------------------------------------------------------------------------

const docsSourceDefault = (args: ButtonArgs) => {
  const attrs = [
    args.variant !== 'primary' ? `variant="${args.variant}"` : '',
    args.appearance !== 'filled' ? `appearance="${args.appearance}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.shape !== 'rectangular' ? `shape="${args.shape}"` : '',
    args.type !== 'button' && !args.href ? `type="${args.type}"` : '',
    args.disabled ? 'disabled' : '',
    args.loading ? 'loading' : '',
    args.fullWidth ? 'full-width' : '',
    args.href ? `href="${args.href}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const open = attrs ? `<mud-button ${attrs}>` : '<mud-button>';
  return `${open}${args.label}</mud-button>`;
};

const docsSourceAllVariants = BUTTON_VARIANTS.map(v => /*html*/ `<mud-button variant="${v}">${v}</mud-button>`).join(
  '\n',
);

const docsSourceAllSizes = BUTTON_SIZES.map(s => /*html*/ `<mud-button size="${s}">Button</mud-button>`).join('\n');

const docsSourceAllShapes = /*html*/ `<mud-button shape="rectangular">Rectangular</mud-button>
<mud-button shape="circular">Circular pill</mud-button>
<mud-button shape="circular" icon-only label="Navigate forward">
  <mud-icon slot="icon" name="arrow-right" size="20"></mud-icon>
</mud-button>`;

const docsSourceSlotVariations = /*html*/ /*html*/ `<!-- text-only -->
<mud-button>Text only</mud-button>

<!-- icon-start -->
<mud-button>
  <mud-icon slot="icon-start" name="arrow-left" size="20"></mud-icon>
  Leading icon
</mud-button>

<!-- icon-end -->
<mud-button>
  Trailing icon
  <mud-icon slot="icon-end" name="arrow-right" size="20"></mud-icon>
</mud-button>

<!-- icon-start + icon-end -->
<mud-button>
  Leading + Trailing icon
  <mud-icon slot="icon-start" name="arrow-left" size="20"></mud-icon>
  <mud-icon slot="icon-end" name="arrow-right" size="20"></mud-icon>
</mud-button>

<!-- icon-only (requires \`label\` for screen readers) -->
<mud-button icon-only label="Navigate forward">
  <mud-icon slot="icon" name="arrow-right" size="20"></mud-icon>
</mud-button>`;

const docsSourceLoading = BUTTON_VARIANTS.map(v => `<mud-button variant="${v}" loading>${v}</mud-button>`).join('\n');

const docsSourceAsLink = /*html*/ `<mud-button href="https://example.com" target="_blank" rel="noopener noreferrer">
  External link
</mud-button>

<mud-button variant="secondary" href="/docs">Internal link</mud-button>

<mud-button href="/disabled" disabled>Disabled link</mud-button>`;

const docsSourceFormSubmit = /*html*/ `<form>
  <input name="email" type="email" placeholder="Email" required />
  <mud-button type="submit">Submit</mud-button>
  <mud-button variant="neutral" type="reset">Reset</mud-button>
</form>`;

const docsSourceReducedMotion = /*html*/ `<!-- Honor the user's reduce-motion preference, or force it locally. -->
<style>
  .reduced-motion-wrapper {
    --button-container-transition-duration: 0ms;
  }
</style>

<div class="reduced-motion-wrapper">
  <mud-button loading>Loading</mud-button>
</div>`;

const cellLabelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); text-align: center; margin-top: var(--spacing-4);';

const renderAllVariants = () => /*html*/ `
  <div style="display: flex; align-items: flex-end; gap: var(--spacing-16); padding: var(--spacing-24); flex-wrap: wrap;">
    ${BUTTON_VARIANTS.map(
      variant => /*html*/ `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
        <mud-button variant="${variant}" size="md" shape="rectangular">${variant}</mud-button>
        <span style="${cellLabelStyle}">${variant}</span>
      </div>`,
    ).join('')}
  </div>
`;

const renderAllSizes = () => /*html*/ `
  <div style="display: flex; align-items: flex-end; gap: var(--spacing-16); padding: var(--spacing-24); flex-wrap: wrap;">
    ${BUTTON_SIZES.map(
      size => /*html*/ `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
        <mud-button variant="primary" size="${size}" shape="rectangular">Button</mud-button>
        <span style="${cellLabelStyle}">${size}</span>
      </div>`,
    ).join('')}
  </div>
`;

const renderAllShapes = () => /*html*/ `
  <div style="display: flex; align-items: flex-end; gap: var(--spacing-24); padding: var(--spacing-24); flex-wrap: wrap;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
      <mud-button variant="primary" size="md" shape="rectangular">Rectangular</mud-button>
      <span style="${cellLabelStyle}">rectangular</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
      <mud-button variant="primary" size="md" shape="circular">Circular pill</mud-button>
      <span style="${cellLabelStyle}">circular (pill)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
      <mud-button variant="primary" size="md" shape="circular" icon-only label="Navigate forward">
        <mud-icon slot="icon" name="arrow-right" size="20"></mud-icon>
      </mud-button>
      <span style="${cellLabelStyle}">circular (icon-only)</span>
    </div>
  </div>
`;

const renderAllAppearances = () => /*html*/ `
  <div style="display: flex; align-items: flex-end; gap: var(--spacing-16); padding: var(--spacing-24); flex-wrap: wrap;">
    ${BUTTON_APPEARANCES.map(
      appearance => /*html*/ `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
        <mud-button variant="primary" appearance="${appearance}" size="md">${appearance}</mud-button>
        <span style="${cellLabelStyle}">${appearance}</span>
      </div>`,
    ).join('')}
  </div>
`;

const docsSourceAllAppearances = BUTTON_APPEARANCES.map(
  a => /*html*/ `<mud-button appearance="${a}">${a}</mud-button>`,
).join('\n');

const docsSourceAppearancesXVariants = BUTTON_VARIANTS.map(variant =>
  BUTTON_APPEARANCES.map(
    appearance => /*html*/ `<mud-button variant="${variant}" appearance="${appearance}">${variant}</mud-button>`,
  ).join('\n'),
).join('\n\n');

const docsSourceAppearancesXSizes = BUTTON_SIZES.map(size =>
  BUTTON_APPEARANCES.map(
    appearance =>
      /*html*/ `<mud-button variant="primary" appearance="${appearance}" size="${size}">Button</mud-button>`,
  ).join('\n'),
).join('\n\n');

const docsSourceInvalidComboFallback = /*html*/ `<!-- Outlined and Text only support primary / strict / destructive.
     Pairing them with secondary or neutral renders the primary visual
     and emits a console.warn in dev (open DevTools to verify). -->
<mud-button variant="secondary" appearance="outlined">outlined + secondary</mud-button>
<mud-button variant="neutral" appearance="outlined">outlined + neutral</mud-button>
<mud-button variant="secondary" appearance="text">text + secondary</mud-button>
<mud-button variant="neutral" appearance="text">text + neutral</mud-button>`;

// Variants × Appearances grid — appearance on columns (filled / outlined / text),
// variants on rows. Surfaces unsupported cells (secondary/neutral × outlined/text)
// which fall back to primary visuals.
const renderAppearancesXVariants = () => /*html*/ `
  <style>
    .appearance-variant-grid {
      display: grid;
      grid-template-columns: 110px repeat(${BUTTON_APPEARANCES.length}, auto);
      gap: var(--spacing-16) var(--spacing-24);
      padding: var(--spacing-24);
      align-items: center;
    }
    .appearance-variant-grid > .row-label,
    .appearance-variant-grid > .col-label {
      font-size: var(--font-size-12);
      color: var(--color-text-base-tertiary);
      font-style: italic;
    }
    .appearance-variant-grid > .row-label { text-align: right; }
    .appearance-variant-grid > .col-label { text-align: center; }
    .appearance-variant-grid > .cell {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .appearance-variant-grid > .cell[data-fallback]::after {
      content: 'fallback → primary';
      position: absolute;
      top: calc(100% + 2px);
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: var(--color-text-base-tertiary);
      font-style: italic;
      white-space: nowrap;
    }
  </style>
  <div class="appearance-variant-grid">
    <span></span>
    ${BUTTON_APPEARANCES.map(a => /*html*/ `<span class="col-label">${a}</span>`).join('')}
    ${BUTTON_VARIANTS.map(
      variant => /*html*/ `
        <span class="row-label">${variant}</span>
        ${BUTTON_APPEARANCES.map(appearance => {
          const isFallback = appearance !== 'filled' && (variant === 'secondary' || variant === 'neutral');
          return /*html*/ `<span class="cell"${isFallback ? ' data-fallback' : ''}>
            <mud-button variant="${variant}" appearance="${appearance}" size="md">${variant}</mud-button>
          </span>`;
        }).join('')}
      `,
    ).join('')}
  </div>
`;

// Sizes × Appearances grid — appearance on columns, sizes on rows.
const renderAppearancesXSizes = () => /*html*/ `
  <style>
    .appearance-size-grid {
      display: grid;
      grid-template-columns: 110px repeat(${BUTTON_APPEARANCES.length}, auto);
      gap: var(--spacing-16) var(--spacing-24);
      padding: var(--spacing-24);
      align-items: center;
    }
    .appearance-size-grid > .row-label,
    .appearance-size-grid > .col-label {
      font-size: var(--font-size-12);
      color: var(--color-text-base-tertiary);
      font-style: italic;
    }
    .appearance-size-grid > .col-label { text-align: center; }
    .appearance-size-grid > .row-label { text-align: right; }
    .appearance-size-grid > .cell { text-align: center; }
  </style>
  <div class="appearance-size-grid">
    <span></span>
    ${BUTTON_APPEARANCES.map(a => /*html*/ `<span class="col-label">${a}</span>`).join('')}
    ${BUTTON_SIZES.map(
      size => /*html*/ `
        <span class="row-label">${size}</span>
        ${BUTTON_APPEARANCES.map(
          appearance => /*html*/ `<div class="cell">
              <mud-button variant="primary" appearance="${appearance}" size="${size}">Button</mud-button>
            </div>`,
        ).join('')}
      `,
    ).join('')}
  </div>
`;

const renderInvalidComboFallback = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); max-width: 540px;">
    <p style="font-size: var(--font-size-14); color: var(--color-text-base-default); margin: 0;">
      Outlined and Text only support <code>primary</code>, <code>strict</code>, <code>destructive</code>.
      Setting <code>appearance="outlined"</code> with <code>variant="secondary"</code> renders the
      <strong>primary</strong> visual and emits a <code>console.warn</code> in dev (open DevTools).
    </p>
    <div style="display: flex; gap: var(--spacing-16); align-items: center;">
      <mud-button variant="secondary" appearance="outlined">outlined + secondary</mud-button>
      <mud-button variant="neutral" appearance="outlined">outlined + neutral</mud-button>
      <mud-button variant="secondary" appearance="text">text + secondary</mud-button>
      <mud-button variant="neutral" appearance="text">text + neutral</mud-button>
    </div>
  </div>
`;

const renderSlotVariations = () => /*html*/ `
  <div style="display: flex; align-items: flex-end; gap: var(--spacing-16); padding: var(--spacing-24); flex-wrap: wrap;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
      <mud-button variant="primary" size="md">Text only</mud-button>
      <span style="${cellLabelStyle}">text-only</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
      <mud-button variant="primary" size="md">
        <mud-icon slot="icon-start" name="arrow-left" size="20"></mud-icon>
        Leading icon
      </mud-button>
      <span style="${cellLabelStyle}">icon-start</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
      <mud-button variant="primary" size="md">
        Trailing icon
        <mud-icon slot="icon-end" name="arrow-right" size="20"></mud-icon>
      </mud-button>
      <span style="${cellLabelStyle}">icon-end</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
      <mud-button variant="primary" size="md">
        Leading + Trailing icon
        <mud-icon slot="icon-start" name="arrow-left" size="20"></mud-icon>
        <mud-icon slot="icon-end" name="arrow-right" size="20"></mud-icon>
      </mud-button>
      <span style="${cellLabelStyle}">icon-start + icon-end</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
      <mud-button variant="primary" size="md" icon-only label="Navigate forward">
        <mud-icon slot="icon" name="arrow-right" size="20"></mud-icon>
      </mud-button>
      <span style="${cellLabelStyle}">icon-only</span>
    </div>
  </div>
`;

const renderWidthBoundaries = () => {
  const longLabel = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore';
  const sectionLabelStyle =
    'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); margin: 0 0 var(--spacing-8); font-style: italic;';
  return /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-32); padding: var(--spacing-24); align-items: flex-start;">

    <div>
      <p style="${sectionLabelStyle}">Min-width — short labels never shrink below 52 / 56 / 72 px (sm / md / lg).</p>
      <div style="display: flex; align-items: flex-end; gap: var(--spacing-16); flex-wrap: wrap;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
          <mud-button variant="primary" size="sm">OK</mud-button>
          <span style="${cellLabelStyle}">sm — 52px</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
          <mud-button variant="primary" size="md">OK</mud-button>
          <span style="${cellLabelStyle}">md — 56px</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
          <mud-button variant="primary" size="lg">OK</mud-button>
          <span style="${cellLabelStyle}">lg — 72px</span>
        </div>
      </div>
    </div>

    <div>
      <p style="${sectionLabelStyle}">Max-width — labels wider than 400px truncate with an ellipsis on a single line.</p>
      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-8);">
        <mud-button variant="primary" size="sm">${longLabel}</mud-button>
        <mud-button variant="primary" size="md">${longLabel}</mud-button>
        <mud-button variant="primary" size="lg">${longLabel}</mud-button>
      </div>
    </div>

    <div>
      <p style="${sectionLabelStyle}">Truncation preserves icons — only the label clips; icon-start / icon-end stay intact.</p>
      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-8);">
        <mud-button variant="primary" size="md">
          <mud-icon slot="icon-start" name="arrow-left" size="20"></mud-icon>
          ${longLabel}
        </mud-button>
        <mud-button variant="primary" size="md">
          ${longLabel}
          <mud-icon slot="icon-end" name="arrow-right" size="20"></mud-icon>
        </mud-button>
        <mud-button variant="primary" size="md">
          <mud-icon slot="icon-start" name="arrow-left" size="20"></mud-icon>
          ${longLabel}
          <mud-icon slot="icon-end" name="arrow-right" size="20"></mud-icon>
        </mud-button>
      </div>
    </div>

  </div>
`;
};

const docsSourceWidthBoundaries = /*html*/ `<!-- Min-width — short labels held at 52 / 56 / 72 px -->
<mud-button size="sm">OK</mud-button>
<mud-button size="md">OK</mud-button>
<mud-button size="lg">OK</mud-button>

<!-- Max-width — labels wider than 400px truncate with an ellipsis on a single line -->
<mud-button size="md">Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore</mud-button>

<!-- Truncation preserves icons -->
<mud-button>
  <mud-icon slot="icon-start" name="arrow-left" size="20"></mud-icon>
  Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore
  <mud-icon slot="icon-end" name="arrow-right" size="20"></mud-icon>
</mud-button>`;

const renderTouchTarget = () => {
  const sectionLabelStyle =
    'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); margin: 0 0 var(--spacing-8); font-style: italic;';
  return /*html*/ `
  <style>
    .touch-row { display: flex; align-items: center; gap: var(--spacing-32); flex-wrap: wrap; }
    .touch-cell { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-12); }
    .touch-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .touch-wrap::before {
      content: '';
      position: absolute;
      inset: calc((var(--btn-h) - var(--btn-t)) / 2);
      border: 1px dashed var(--color-border-warning-default);
      border-radius: var(--border-radius-6);
      pointer-events: none;
    }
    .touch-wrap[data-shape='icon-only']::before {
      border-radius: var(--border-radius-full);
    }
  </style>
  <div style="display: flex; flex-direction: column; gap: var(--spacing-32); padding: var(--spacing-24); align-items: flex-start;">

    <div>
      <p style="${sectionLabelStyle}">Touch target — on coarse pointers (touch devices) the hit area extends to 40 / 48 / 48 px on both axes without changing the visual size. The dashed outline visualises the <code>::before</code> hit area injected when <code>@media (pointer: coarse)</code> matches.</p>
      <div class="touch-row">
        <div class="touch-cell">
          <span class="touch-wrap" style="--btn-h: 32px; --btn-t: 40px;">
            <mud-button size="sm">OK</mud-button>
          </span>
          <span style="${cellLabelStyle}">sm — visual 32 / touch 40</span>
        </div>
        <div class="touch-cell">
          <span class="touch-wrap" style="--btn-h: 40px; --btn-t: 48px;">
            <mud-button size="md">OK</mud-button>
          </span>
          <span style="${cellLabelStyle}">md — visual 40 / touch 48</span>
        </div>
        <div class="touch-cell">
          <mud-button size="lg">OK</mud-button>
          <span style="${cellLabelStyle}">lg — 48 / 48 (no expansion needed)</span>
        </div>
      </div>
    </div>

    <div>
      <p style="${sectionLabelStyle}">Icon-only buttons share the same rule — square footprint, symmetric expansion on all four sides.</p>
      <div class="touch-row">
        <div class="touch-cell">
          <span class="touch-wrap" data-shape="icon-only" style="--btn-h: 32px; --btn-t: 40px;">
            <mud-button size="sm" shape="circular" icon-only label="Navigate forward">
              <mud-icon slot="icon" name="arrow-right" size="16"></mud-icon>
            </mud-button>
          </span>
          <span style="${cellLabelStyle}">sm — 32 → 40 (both axes)</span>
        </div>
        <div class="touch-cell">
          <span class="touch-wrap" data-shape="icon-only" style="--btn-h: 40px; --btn-t: 48px;">
            <mud-button size="md" shape="circular" icon-only label="Navigate forward">
              <mud-icon slot="icon" name="arrow-right" size="20"></mud-icon>
            </mud-button>
          </span>
          <span style="${cellLabelStyle}">md — 40 → 48 (both axes)</span>
        </div>
        <div class="touch-cell">
          <mud-button size="lg" shape="circular" icon-only label="Navigate forward">
            <mud-icon slot="icon" name="arrow-right" size="20"></mud-icon>
          </mud-button>
          <span style="${cellLabelStyle}">lg — 48 / 48 (no expansion)</span>
        </div>
      </div>
    </div>

  </div>
  `;
};

const docsSourceTouchTarget = /*html*/ `<!-- Touch-target expansion is driven by tokens consumed in mud-button.css:
       sm → height 32, touch-target 40  (+4px on every side)
       md → height 40, touch-target 48  (+4px on every side)
       lg → height 48, touch-target 48  (no expansion)
     The component injects a ::before pseudo-element that extends the hit
     area on both axes only when @media (pointer: coarse) matches —
     desktop browsers do not see the expansion. -->

<!-- Text buttons -->
<mud-button size="sm">OK</mud-button>
<mud-button size="md">OK</mud-button>
<mud-button size="lg">OK</mud-button>

<!-- Icon-only -->
<mud-button size="sm" shape="circular" icon-only label="Navigate forward">
  <mud-icon slot="icon" name="arrow-right" size="16"></mud-icon>
</mud-button>
<mud-button size="md" shape="circular" icon-only label="Navigate forward">
  <mud-icon slot="icon" name="arrow-right" size="20"></mud-icon>
</mud-button>`;

const renderLoadingPlayground = () => /*html*/ `
  <div style="display: flex; align-items: center; gap: var(--spacing-16); padding: var(--spacing-24); flex-wrap: wrap;">
    ${BUTTON_VARIANTS.map(
      variant => /*html*/ `<mud-button variant="${variant}" size="md" loading>${variant}</mud-button>`,
    ).join('')}
  </div>
`;

const renderAsLink = () => /*html*/ `
  <div style="display: flex; align-items: center; gap: var(--spacing-16); padding: var(--spacing-24); flex-wrap: wrap;">
    <mud-button variant="primary" href="https://example.com" target="_blank" rel="noopener noreferrer">
      External link
    </mud-button>
    <mud-button variant="secondary" href="/docs">Internal link</mud-button>
    <mud-button variant="primary" href="/disabled" disabled>Disabled link</mud-button>
  </div>
`;

const renderFormSubmit = () => /*html*/ `
  <form id="example-form" style="display: flex; flex-direction: column; gap: var(--spacing-12); padding: var(--spacing-24); max-width: 360px;"
        onsubmit="event.preventDefault(); document.getElementById('form-status').textContent = 'submitted at ' + new Date().toLocaleTimeString();">
    <input name="email" type="email" placeholder="Email" required style="padding: var(--spacing-8); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-6);" />
    <div style="display: flex; gap: var(--spacing-8);">
      <mud-button variant="primary" type="submit">Submit</mud-button>
      <mud-button variant="neutral" type="reset">Reset</mud-button>
    </div>
    <p id="form-status" style="font-size: var(--font-size-12); color: var(--color-text-base-tertiary); margin: 0;"></p>
  </form>
`;

const renderReducedMotion = () => /*html*/ `
  <style>
    .reduced-motion-wrapper {
      --button-container-transition-duration: 0ms;
      --spinner-transition-duration: 0ms;
      display: flex;
      gap: var(--spacing-16);
      padding: var(--spacing-24);
      align-items: center;
    }
  </style>
  <div class="reduced-motion-wrapper">
    ${BUTTON_VARIANTS.map(v => `<mud-button variant="${v}" size="md" loading>${v}</mud-button>`).join('')}
  </div>
  <p style="${cellLabelStyle}; max-width: 540px; padding: 0 var(--spacing-24); text-align: left; font-style: italic;">
    This story overrides <code>--button-container-transition-duration</code> to demonstrate the
    static state shown when the user enables OS-level "reduce motion".
  </p>
`;

const meta: Meta<ButtonArgs> = {
  title: 'Atoms/Button',
  component: 'mud-button',
  argTypes: {
    variant: {
      control: 'select',
      options: BUTTON_VARIANTS,
      description: 'Color treatment.',
      table: { defaultValue: { summary: 'primary' } },
    },
    appearance: {
      control: 'select',
      options: BUTTON_APPEARANCES,
      description:
        'Visual treatment. `outlined` and `text` only support `primary`, `strict`, `destructive`; other variants fall back to `primary` with a dev console warning.',
      table: { defaultValue: { summary: 'filled' } },
    },
    size: {
      control: 'select',
      options: BUTTON_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    shape: {
      control: 'select',
      options: BUTTON_SHAPES,
      description: 'Container silhouette.',
      table: { defaultValue: { summary: 'rectangular' } },
    },
    type: {
      control: 'select',
      options: BUTTON_TYPES,
      description: 'Native button `type`. Ignored when `href` is set.',
      table: { defaultValue: { summary: 'button' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables interactivity.',
      table: { defaultValue: { summary: 'false' } },
    },
    loading: {
      control: 'boolean',
      description: 'Renders a centered spinner and blocks interactivity.',
      table: { defaultValue: { summary: 'false' } },
    },
    fullWidth: {
      control: 'boolean',
      description: 'Expands the button to fill its container inline-size.',
      name: 'full-width',
      table: { defaultValue: { summary: 'false' } },
    },
    href: {
      control: 'text',
      description: 'When set, the button renders as `<a href>`.',
    },
    label: {
      control: 'text',
      description: 'Button text content.',
      table: { defaultValue: { summary: 'Button' } },
    },
  },
};
export default meta;

type Story = StoryObj<ButtonArgs>;

// ---------------------------------------------------------------------------
// Default — single button with full argTypes controls
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderButton,
  args: {
    variant: 'primary',
    appearance: 'filled',
    size: 'md',
    shape: 'rectangular',
    type: 'button',
    disabled: false,
    loading: false,
    fullWidth: false,
    href: '',
    label: 'Button',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        // Returns the minimal `<mud-button …>` markup a consumer would write —
        // omits default attributes so the snippet stays clean as controls move.
        transform: (_code: string, { args }: { args: ButtonArgs }) => docsSourceDefault(args),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// AllVariants — 5 variants in a row, size=md, shape=rectangular
// ---------------------------------------------------------------------------
export const AllVariants: Story = {
  render: renderAllVariants,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllVariants } },
  },
};

// ---------------------------------------------------------------------------
// AllSizes — 3 sizes in a row, variant=primary
// ---------------------------------------------------------------------------
export const AllSizes: Story = {
  render: renderAllSizes,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllSizes } },
  },
};

// ---------------------------------------------------------------------------
// AllShapes — rectangular, circular pill, circular icon-only
// ---------------------------------------------------------------------------
export const AllShapes: Story = {
  render: renderAllShapes,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllShapes } },
  },
};

// ---------------------------------------------------------------------------
// AllAppearances — 3 appearances in a row, variant=primary
// ---------------------------------------------------------------------------
export const AllAppearances: Story = {
  render: renderAllAppearances,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllAppearances } },
  },
};

// ---------------------------------------------------------------------------
// AppearancesXVariants — 3×5 grid (appearances × variants), surfaces fallback cells
// ---------------------------------------------------------------------------
export const AppearancesXVariants: Story = {
  name: 'Appearances × Variants',
  render: renderAppearancesXVariants,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Outlined and Text only support primary / strict / destructive. The cells marked "fallback" render the primary visuals when an unsupported variant is set, and emit a console.warn in dev.',
      },
      source: { code: docsSourceAppearancesXVariants },
    },
  },
};

// ---------------------------------------------------------------------------
// AppearancesXSizes — 3×3 grid (appearances × sizes), variant=primary
// ---------------------------------------------------------------------------
export const AppearancesXSizes: Story = {
  name: 'Appearances × Sizes',
  render: renderAppearancesXSizes,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAppearancesXSizes } },
  },
};

// ---------------------------------------------------------------------------
// InvalidComboFallback — documents the warning + visual fallback behaviour
// ---------------------------------------------------------------------------
export const InvalidComboFallback: Story = {
  render: renderInvalidComboFallback,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceInvalidComboFallback } },
  },
};

// ---------------------------------------------------------------------------
// States — default · disabled · loading · fieldset-disabled (×3 variants)
// ---------------------------------------------------------------------------
const stateVariants: ButtonVariant[] = ['primary', 'secondary', 'destructive'];

const renderStates = () => /*html*/ `
  <style>
    .states-grid {
      display: grid;
      grid-template-columns: 120px repeat(${stateVariants.length}, auto);
      gap: var(--spacing-16) var(--spacing-24);
      padding: var(--spacing-24);
      align-items: center;
    }
    .states-grid > .row-label {
      font-size: var(--font-size-12);
      color: var(--color-text-base-tertiary);
      font-style: italic;
      text-align: right;
    }
    .states-grid > .col-label {
      font-size: var(--font-size-12);
      color: var(--color-text-base-tertiary);
      text-align: center;
    }
  </style>
  <div class="states-grid">
    <span></span>
    ${stateVariants.map(v => /*html*/ `<span class="col-label">${v}</span>`).join('')}

    <span class="row-label">default</span>
    ${stateVariants.map(v => /*html*/ `<mud-button variant="${v}">Button</mud-button>`).join('')}

    <span class="row-label">disabled</span>
    ${stateVariants.map(v => /*html*/ `<mud-button variant="${v}" disabled>Button</mud-button>`).join('')}

    <span class="row-label">loading</span>
    ${stateVariants.map(v => /*html*/ `<mud-button variant="${v}" loading>Button</mud-button>`).join('')}

    <span class="row-label">fieldset-disabled</span>
    ${stateVariants
      .map(
        v =>
          /*html*/ `<fieldset disabled style="border: 0; padding: 0; margin: 0;"><mud-button variant="${v}">Button</mud-button></fieldset>`,
      )
      .join('')}
  </div>
`;

const docsSourceStates = /*html*/ `<!-- default -->
<mud-button variant="primary">Button</mud-button>

<!-- disabled (consumer-controlled) -->
<mud-button variant="primary" disabled>Button</mud-button>

<!-- loading (blocks interaction, preserves accessible name) -->
<mud-button variant="primary" loading>Button</mud-button>

<!-- inherited disable from an ancestor <fieldset disabled> — no extra attribute -->
<fieldset disabled>
  <mud-button variant="primary">Button</mud-button>
</fieldset>`;

export const States: Story = {
  render: renderStates,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceStates } },
  },
};

// ---------------------------------------------------------------------------
// SlotVariations — text-only, icon-start, icon-end, icon-only
// ---------------------------------------------------------------------------
export const SlotVariations: Story = {
  render: renderSlotVariations,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceSlotVariations } },
  },
};

// ---------------------------------------------------------------------------
// WidthBoundaries — min-width, max-width (400px), and single-line truncation
// ---------------------------------------------------------------------------
export const WidthBoundaries: Story = {
  render: renderWidthBoundaries,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWidthBoundaries } },
  },
};

// ---------------------------------------------------------------------------
// TouchTarget — visualises the coarse-pointer hit-area expansion via ::before
// ---------------------------------------------------------------------------
export const TouchTarget: Story = {
  render: renderTouchTarget,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceTouchTarget } },
  },
};

// ---------------------------------------------------------------------------
// LoadingPlayground — loading state across all variants
// ---------------------------------------------------------------------------
export const LoadingPlayground: Story = {
  render: renderLoadingPlayground,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceLoading } },
  },
};

// ---------------------------------------------------------------------------
// AsLink — href prop renders an <a> instead of a <button>
// ---------------------------------------------------------------------------
export const AsLink: Story = {
  render: renderAsLink,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAsLink } },
  },
};

// ---------------------------------------------------------------------------
// FormSubmit — type="submit" inside a real <form>
// ---------------------------------------------------------------------------
export const FormSubmit: Story = {
  render: renderFormSubmit,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceFormSubmit } },
  },
};

// ---------------------------------------------------------------------------
// FullWidth — full-width prop expands the button to fill its container
// ---------------------------------------------------------------------------
const renderFullWidth = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); align-items: flex-start;">
    <p style="${cellLabelStyle.replace('text-align: center; margin-top: var(--spacing-4)', 'margin: 0; text-align: left; font-style: italic')}">
      Container = 320px. With <code>full-width</code> the button stretches to fill the container; the internal control drops <code>max-inline-size</code> so the label can expand.
    </p>
    <div style="width: 320px;">
      <mud-button variant="primary" full-width>Save changes</mud-button>
    </div>
    <div style="width: 320px;">
      <mud-button variant="secondary" full-width>
        <mud-icon slot="icon-start" name="arrow-left" size="20"></mud-icon>
        Back to dashboard
      </mud-button>
    </div>
  </div>
`;

const docsSourceFullWidth = /*html*/ `<!-- Add the \`full-width\` attribute to expand the button to its container. -->
<div style="width: 320px;">
  <mud-button variant="primary" full-width>Save changes</mud-button>
</div>

<div style="width: 320px;">
  <mud-button variant="secondary" full-width>
    <mud-icon slot="icon-start" name="arrow-left" size="20"></mud-icon>
    Back to dashboard
  </mud-button>
</div>`;

export const FullWidth: Story = {
  render: renderFullWidth,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceFullWidth } },
  },
};

// ---------------------------------------------------------------------------
// CoverageGuard — Stencil constructor branch coverage
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<mud-button variant="primary" size="md">Coverage</mud-button>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('mud-button') as unknown as (new (registerHost: boolean) => unknown) | undefined;
    if (!Ctor) throw new Error('mud-button constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};

// ---------------------------------------------------------------------------
// ReducedMotion — spinner static when prefers-reduced-motion: reduce
// ---------------------------------------------------------------------------
export const ReducedMotion: Story = {
  render: renderReducedMotion,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceReducedMotion } },
  },
};
