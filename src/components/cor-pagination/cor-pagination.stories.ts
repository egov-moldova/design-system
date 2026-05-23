import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { PAGINATION_SIZES } from './cor-pagination.types';
import type { PaginationSize } from './cor-pagination.types';

type PaginationArgs = {
  size: PaginationSize;
  currentPage: number;
  totalPages: number;
  siblingCount: number;
  boundaryCount: number;
  showPrevNext: boolean;
  prevLabel: string;
  nextLabel: string;
  ariaLabel: string;
};

const renderPagination = (args: PaginationArgs) => /*html*/ `
  <cor-pagination
    size="${args.size}"
    current-page="${args.currentPage}"
    total-pages="${args.totalPages}"
    sibling-count="${args.siblingCount}"
    boundary-count="${args.boundaryCount}"
    ${args.showPrevNext ? '' : 'show-prev-next="false"'}
    prev-label="${args.prevLabel}"
    next-label="${args.nextLabel}"
    aria-label="${args.ariaLabel}"
  ></cor-pagination>
`;

const docsSourceDefault = (args: PaginationArgs) => {
  const attrs = [
    args.size !== 'md' ? `size="${args.size}"` : '',
    `current-page="${args.currentPage}"`,
    `total-pages="${args.totalPages}"`,
    args.siblingCount !== 1 ? `sibling-count="${args.siblingCount}"` : '',
    args.boundaryCount !== 1 ? `boundary-count="${args.boundaryCount}"` : '',
    args.showPrevNext ? '' : 'show-prev-next="false"',
    args.prevLabel !== 'Anterior' ? `prev-label="${args.prevLabel}"` : '',
    args.nextLabel !== 'Următor' ? `next-label="${args.nextLabel}"` : '',
    args.ariaLabel !== 'Navigare pagini' ? `aria-label="${args.ariaLabel}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<cor-pagination ${attrs}></cor-pagination>`;
};

const cellLabelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); text-align: center; margin-top: var(--spacing-4);';

const meta: Meta<PaginationArgs> = {
  title: 'Molecules/Pagination',
  component: 'cor-pagination',
  argTypes: {
    size: {
      control: 'select',
      options: PAGINATION_SIZES,
      description: 'Visual size rung. Mobile uses `sm`, desktop uses `md`.',
      table: { defaultValue: { summary: 'md' } },
    },
    currentPage: {
      control: { type: 'number', min: 1 },
      name: 'current-page',
      description: 'Active page (1-indexed). Two-way bindable.',
      table: { defaultValue: { summary: '1' } },
    },
    totalPages: {
      control: { type: 'number', min: 1 },
      name: 'total-pages',
      description: 'Total page count. Hides the component when `<= 1`.',
      table: { defaultValue: { summary: '1' } },
    },
    siblingCount: {
      control: { type: 'number', min: 0, max: 3 },
      name: 'sibling-count',
      description: 'Pages shown on each side of the active page.',
      table: { defaultValue: { summary: '1' } },
    },
    boundaryCount: {
      control: { type: 'number', min: 0, max: 3 },
      name: 'boundary-count',
      description: 'Pages shown at start / end of the range.',
      table: { defaultValue: { summary: '1' } },
    },
    showPrevNext: {
      control: 'boolean',
      name: 'show-prev-next',
      description: 'Render the Previous / Next navigation buttons.',
      table: { defaultValue: { summary: 'true' } },
    },
    prevLabel: {
      control: 'text',
      name: 'prev-label',
      description: 'Visible Previous label (hidden on `sm`).',
    },
    nextLabel: {
      control: 'text',
      name: 'next-label',
      description: 'Visible Next label (hidden on `sm`).',
    },
    ariaLabel: {
      control: 'text',
      name: 'aria-label',
      description: 'Accessible name for the outer `<nav>` landmark.',
    },
  },
};
export default meta;

type Story = StoryObj<PaginationArgs>;

// ---------------------------------------------------------------------------
// Default — page 1 of 5
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderPagination,
  args: {
    size: 'md',
    currentPage: 1,
    totalPages: 5,
    siblingCount: 1,
    boundaryCount: 1,
    showPrevNext: true,
    prevLabel: 'Anterior',
    nextLabel: 'Următor',
    ariaLabel: 'Navigare pagini',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: PaginationArgs }) => docsSourceDefault(args),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// ManyPages — leading + trailing ellipsis
// ---------------------------------------------------------------------------
export const ManyPages: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24);">
      <div>
        <p style="${cellLabelStyle}">first page — no leading ellipsis</p>
        <cor-pagination current-page="1" total-pages="27"></cor-pagination>
      </div>
      <div>
        <p style="${cellLabelStyle}">page 3 — leading overflow appears</p>
        <cor-pagination current-page="3" total-pages="27"></cor-pagination>
      </div>
      <div>
        <p style="${cellLabelStyle}">page 12 — leading + trailing overflow</p>
        <cor-pagination current-page="12" total-pages="27"></cor-pagination>
      </div>
      <div>
        <p style="${cellLabelStyle}">page 25 — trailing overflow only</p>
        <cor-pagination current-page="25" total-pages="27"></cor-pagination>
      </div>
      <div>
        <p style="${cellLabelStyle}">last page — no trailing ellipsis</p>
        <cor-pagination current-page="27" total-pages="27"></cor-pagination>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: /*html*/ `<!-- Leading + trailing ellipsis examples -->
<cor-pagination current-page="1" total-pages="27"></cor-pagination>
<cor-pagination current-page="3" total-pages="27"></cor-pagination>
<cor-pagination current-page="12" total-pages="27"></cor-pagination>
<cor-pagination current-page="25" total-pages="27"></cor-pagination>
<cor-pagination current-page="27" total-pages="27"></cor-pagination>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// WithoutPrevNext — page buttons only
// ---------------------------------------------------------------------------
export const WithoutPrevNext: Story = {
  render: () => /*html*/ `
    <cor-pagination
      current-page="3"
      total-pages="7"
      show-prev-next="false"
    ></cor-pagination>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<cor-pagination current-page="3" total-pages="7" show-prev-next="false"></cor-pagination>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// SizeSmall — mobile breakpoint, prev/next icon-only, smaller items
// ---------------------------------------------------------------------------
export const SizeSmall: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24);">
      <div>
        <p style="${cellLabelStyle}">page 2 of 5 — mobile breakpoint</p>
        <cor-pagination size="sm" current-page="2" total-pages="5"></cor-pagination>
      </div>
      <div>
        <p style="${cellLabelStyle}">page 12 of 27 — leading + trailing overflow</p>
        <cor-pagination size="sm" current-page="12" total-pages="27"></cor-pagination>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<cor-pagination size="sm" current-page="2" total-pages="5"></cor-pagination>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// SizeMedium — desktop breakpoint, prev/next with text labels
// ---------------------------------------------------------------------------
export const SizeMedium: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24);">
      <div>
        <p style="${cellLabelStyle}">page 2 of 7 — desktop breakpoint</p>
        <cor-pagination size="md" current-page="2" total-pages="7"></cor-pagination>
      </div>
      <div>
        <p style="${cellLabelStyle}">page 12 of 27 — with ellipses</p>
        <cor-pagination size="md" current-page="12" total-pages="27"></cor-pagination>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<cor-pagination size="md" current-page="2" total-pages="7"></cor-pagination>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Disabled — total-pages=1 hides the component
// ---------------------------------------------------------------------------
export const Disabled: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); max-width: 540px;">
      <p style="font-size: var(--font-size-14); color: var(--color-text-base-default); margin: 0;">
        When <code>total-pages</code> is <code>1</code> (or less), the component renders nothing —
        there is no navigation needed. The host stays in the DOM with <code>aria-hidden="true"</code>
        so consumers can keep the markup stable.
      </p>
      <div style="border: 1px dashed var(--color-border-base-default); padding: var(--spacing-12); border-radius: var(--border-radius-6);">
        <cor-pagination current-page="1" total-pages="1"></cor-pagination>
        <p style="${cellLabelStyle}">(nothing rendered above this line)</p>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<cor-pagination current-page="1" total-pages="1"></cor-pagination>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// EdgeCases — boundary behavior
// ---------------------------------------------------------------------------
export const EdgeCases: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24);">
      <div>
        <p style="${cellLabelStyle}">first page — Previous is disabled</p>
        <cor-pagination current-page="1" total-pages="7"></cor-pagination>
      </div>
      <div>
        <p style="${cellLabelStyle}">last page — Next is disabled</p>
        <cor-pagination current-page="7" total-pages="7"></cor-pagination>
      </div>
      <div>
        <p style="${cellLabelStyle}">two pages — both ends reachable in a single step</p>
        <cor-pagination current-page="1" total-pages="2"></cor-pagination>
      </div>
      <div>
        <p style="${cellLabelStyle}">sm size at first page — icon-only prev disabled</p>
        <cor-pagination size="sm" current-page="1" total-pages="5"></cor-pagination>
      </div>
      <div>
        <p style="${cellLabelStyle}">sm size at last page — icon-only next disabled</p>
        <cor-pagination size="sm" current-page="5" total-pages="5"></cor-pagination>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: /*html*/ `<!-- Edge cases — prev/next disable at boundaries -->
<cor-pagination current-page="1" total-pages="7"></cor-pagination>
<cor-pagination current-page="7" total-pages="7"></cor-pagination>
<cor-pagination size="sm" current-page="1" total-pages="5"></cor-pagination>`,
      },
    },
  },
};
