import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { RECEIPT_SERVICES, RECEIPT_STATUSES } from './cor-receipt.types';
import type { ReceiptService, ReceiptStatus } from './cor-receipt.types';

type ReceiptArgs = {
  service: ReceiptService;
  title: string;
  status: ReceiptStatus | '';
  amount: string;
  currency: string;
  date: string;
  description: string;
  transactionId: string;
  senderName: string;
  senderIdnp: string;
  recipientName: string;
  recipientIdnp: string;
  qrData: string;
  showActions: boolean;
};

const renderReceipt = (args: ReceiptArgs) => {
  const status = args.status ? `status="${args.status}"` : '';
  const showActions = args.showActions ? '' : 'show-actions="false"';
  return /*html*/ `
    <cor-receipt
      service="${args.service}"
      title-text="${args.title}"
      ${status}
      amount="${args.amount}"
      currency="${args.currency}"
      date="${args.date}"
      description="${args.description}"
      transaction-id="${args.transactionId}"
      qr-data="${args.qrData}"
      ${showActions}
      id="receipt-default"
    ></cor-receipt>
    <script>
      (function () {
        const el = document.getElementById('receipt-default');
        if (!el) return;
        el.sender = { name: ${JSON.stringify(args.senderName)}, idnp: ${JSON.stringify(args.senderIdnp)} };
        el.recipient = { name: ${JSON.stringify(args.recipientName)}, idnp: ${JSON.stringify(args.recipientIdnp)} };
      })();
    </script>
  `;
};

const meta: Meta<ReceiptArgs> = {
  title: 'Molecules/Receipt',
  component: 'cor-receipt',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Confirmation surface for a finished Moldovan e-Gov transaction. ' +
          'Four service variants (MPay, MPass, MSign, MDelivery), four statuses ' +
          '(paid, confirmed, pending, failed), client-side QR generation, and ' +
          'print-clean styles.',
      },
    },
  },
  argTypes: {
    service: {
      control: 'select',
      options: RECEIPT_SERVICES,
      description: 'Which e-Gov property this receipt belongs to.',
      table: { defaultValue: { summary: 'mpay' } },
    },
    title: {
      control: 'text',
      description: 'Receipt title (defaults to a Romanian per-service string).',
      table: { defaultValue: { summary: 'Bon de plată' } },
    },
    status: {
      control: 'select',
      options: ['', ...RECEIPT_STATUSES],
      description: 'Transaction lifecycle state.',
      table: { defaultValue: { summary: 'paid' } },
    },
    amount: {
      control: 'text',
      description: 'Pre-formatted amount.',
      table: { defaultValue: { summary: '150,00' } },
    },
    currency: {
      control: 'text',
      description: 'Currency code.',
      table: { defaultValue: { summary: 'MDL' } },
    },
    date: {
      control: 'text',
      description: 'ISO-8601 date string.',
      table: { defaultValue: { summary: '2026-05-22T14:32:00Z' } },
    },
    description: {
      control: 'text',
      description: 'Free-text description.',
      table: { defaultValue: { summary: 'Impozit pe bunuri imobile 2026' } },
    },
    transactionId: {
      control: 'text',
      description: 'Opaque transaction identifier.',
      table: { defaultValue: { summary: 'MPY-2026-0001-A47F2' } },
    },
    senderName: {
      control: 'text',
      description: 'Sender display name.',
      table: { defaultValue: { summary: 'Ion Popescu' } },
    },
    senderIdnp: {
      control: 'text',
      description: 'Sender IDNP (13 digits, auto-masked).',
      table: { defaultValue: { summary: '2002003456789' } },
    },
    recipientName: {
      control: 'text',
      description: 'Recipient display name.',
      table: { defaultValue: { summary: 'Serviciul Fiscal de Stat' } },
    },
    recipientIdnp: {
      control: 'text',
      description: 'Recipient IDNP.',
      table: { defaultValue: { summary: '1003600045678' } },
    },
    qrData: {
      control: 'text',
      description: 'Payload encoded into the QR (set empty to hide).',
      table: { defaultValue: { summary: 'https://verify.mpay.gov.md/...' } },
    },
    showActions: {
      control: 'boolean',
      description: 'Whether the action footer renders.',
      table: { defaultValue: { summary: 'true' } },
    },
  },
};
export default meta;

type Story = StoryObj<ReceiptArgs>;

const DEFAULT_ARGS: ReceiptArgs = {
  service: 'mpay',
  title: 'Bon de plată',
  status: 'paid',
  amount: '150,00',
  currency: 'MDL',
  date: '2026-05-22T14:32:00Z',
  description: 'Impozit pe bunuri imobile 2026',
  transactionId: 'MPY-2026-0001-A47F2',
  senderName: 'Ion Popescu',
  senderIdnp: '2002003456789',
  recipientName: 'Serviciul Fiscal de Stat',
  recipientIdnp: '1003600045678',
  qrData: 'https://verify.mpay.gov.md/tx/MPY-2026-0001-A47F2',
  showActions: true,
};

export const Default: Story = {
  args: DEFAULT_ARGS,
  render: renderReceipt,
};

export const MPass: Story = {
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <cor-receipt
      service="mpass"
      status="confirmed"
      date="2026-05-22T09:14:00Z"
      description="Autentificare reușită pe portalul MPay"
      transaction-id="MPS-SESS-7F22A1"
      qr-data="https://verify.mpass.gov.md/session/7F22A1"
      id="receipt-mpass"
    ></cor-receipt>
    <script>
      (function () {
        const el = document.getElementById('receipt-mpass');
        if (!el) return;
        el.sender = { name: 'Maria Lungu', idnp: '2003114567890' };
      })();
    </script>
  `,
};

export const MSign: Story = {
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <cor-receipt
      service="msign"
      status="confirmed"
      date="2026-05-21T16:08:00Z"
      description="Contract individual de muncă semnat electronic"
      transaction-id="MSN-2026-A102-DDC7"
      qr-data="https://verify.msign.gov.md/doc/A102DDC7"
      id="receipt-msign"
    ></cor-receipt>
    <script>
      (function () {
        const el = document.getElementById('receipt-msign');
        if (!el) return;
        el.sender = { name: 'Andrei Ciobanu', idnp: '2005220001234' };
        el.recipient = { name: 'SRL Tehno-Construct', idnp: '1014600009876' };
      })();
    </script>
  `,
};

export const MDelivery: Story = {
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <cor-receipt
      service="mdelivery"
      status="confirmed"
      date="2026-05-22T11:45:00Z"
      description="Livrat la Oficiul Poștal Chișinău, Sector Centru"
      transaction-id="MDL-PKG-883201"
      qr-data="https://verify.mdelivery.gov.md/pkg/883201"
      id="receipt-mdelivery"
    ></cor-receipt>
    <script>
      (function () {
        const el = document.getElementById('receipt-mdelivery');
        if (!el) return;
        el.sender = { name: 'Casa Națională de Asigurări Sociale' };
        el.recipient = { name: 'Maria Lungu', idnp: '2003114567890' };
      })();
    </script>
  `,
};

export const Pending: Story = {
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <cor-receipt
      service="mpay"
      status="pending"
      amount="500,00"
      currency="MDL"
      date="2026-05-22T14:32:00Z"
      description="Taxă pentru permis de conducere"
      transaction-id="MPY-2026-0042-PEND"
      qr-data="https://verify.mpay.gov.md/tx/0042-PEND"
      id="receipt-pending"
    ></cor-receipt>
    <script>
      (function () {
        const el = document.getElementById('receipt-pending');
        if (!el) return;
        el.sender = { name: 'Ion Popescu', idnp: '2002003456789' };
        el.recipient = { name: 'Agenția Servicii Publice', idnp: '1003600045679' };
      })();
    </script>
  `,
};

export const Failed: Story = {
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <cor-receipt
      service="mpay"
      status="failed"
      amount="1 250,00"
      currency="MDL"
      date="2026-05-22T15:01:00Z"
      description="Plata a fost respinsă de instituția emitentă a cardului"
      transaction-id="MPY-2026-0099-FAIL"
      qr-data="https://verify.mpay.gov.md/tx/0099-FAIL"
      id="receipt-failed"
    ></cor-receipt>
    <script>
      (function () {
        const el = document.getElementById('receipt-failed');
        if (!el) return;
        el.sender = { name: 'Ion Popescu', idnp: '2002003456789' };
        el.recipient = { name: 'Casa Națională de Asigurări Sociale', idnp: '1003600045680' };
      })();
    </script>
  `,
};

export const Mobile: Story = {
  parameters: {
    controls: { disable: true },
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => /*html*/ `
    <div style="max-width: 360px;">
      <cor-receipt
        service="mpay"
        status="paid"
        amount="150,00"
        currency="MDL"
        date="2026-05-22T14:32:00Z"
        description="Impozit pe bunuri imobile 2026"
        transaction-id="MPY-2026-0001-A47F2"
        qr-data="https://verify.mpay.gov.md/tx/0001"
        id="receipt-mobile"
      ></cor-receipt>
      <script>
        (function () {
          const el = document.getElementById('receipt-mobile');
          if (!el) return;
          el.sender = { name: 'Ion Popescu', idnp: '2002003456789' };
          el.recipient = { name: 'Serviciul Fiscal de Stat', idnp: '1003600045678' };
        })();
      </script>
    </div>
  `,
};

export const PrintPreview: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Preview of the print stylesheet — actions hidden, shadows dropped, ' +
          'amount panel switched to a hairline border, all surfaces forced to ' +
          'canvas white. Use the browser Print dialog to verify the live output.',
      },
    },
  },
  render: () => /*html*/ `
    <div style="background: var(--color-background-base-secondary); padding: var(--spacing-24);">
      <cor-receipt
        service="mpay"
        status="paid"
        amount="150,00"
        currency="MDL"
        date="2026-05-22T14:32:00Z"
        description="Impozit pe bunuri imobile 2026"
        transaction-id="MPY-2026-0001-A47F2"
        qr-data="https://verify.mpay.gov.md/tx/0001"
        id="receipt-print"
        style="--receipt-container-shadow: none;"
      ></cor-receipt>
      <script>
        (function () {
          const el = document.getElementById('receipt-print');
          if (!el) return;
          el.sender = { name: 'Ion Popescu', idnp: '2002003456789' };
          el.recipient = { name: 'Serviciul Fiscal de Stat', idnp: '1003600045678' };
        })();
      </script>
    </div>
  `,
};

export const WithoutActions: Story = {
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <cor-receipt
      service="mpay"
      status="paid"
      amount="150,00"
      currency="MDL"
      date="2026-05-22T14:32:00Z"
      description="Impozit pe bunuri imobile 2026"
      transaction-id="MPY-2026-0001-A47F2"
      qr-data="https://verify.mpay.gov.md/tx/0001"
      id="receipt-no-actions"
    ></cor-receipt>
    <script>
      (function () {
        const el = document.getElementById('receipt-no-actions');
        if (!el) return;
        el.showActions = false;
        el.sender = { name: 'Ion Popescu', idnp: '2002003456789' };
        el.recipient = { name: 'Serviciul Fiscal de Stat', idnp: '1003600045678' };
      })();
    </script>
  `,
};

export const WithCustomQr: Story = {
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <cor-receipt
      service="mpay"
      status="paid"
      amount="150,00"
      currency="MDL"
      date="2026-05-22T14:32:00Z"
      description="Impozit pe bunuri imobile 2026"
      transaction-id="MPY-2026-0001-A47F2"
      id="receipt-custom-qr"
    >
      <div slot="qr" style="
        width: 100%; height: 100%;
        display: grid; place-items: center;
        background: var(--color-background-brand-secondary);
        color: var(--color-text-brand-default);
        font-family: var(--fontFamily-primary, 'Onest'); font-size: 11px;
        text-align: center; padding: 8px;
      ">
        Cod furnizat<br/>de consumator
      </div>
    </cor-receipt>
    <script>
      (function () {
        const el = document.getElementById('receipt-custom-qr');
        if (!el) return;
        el.sender = { name: 'Ion Popescu', idnp: '2002003456789' };
        el.recipient = { name: 'Serviciul Fiscal de Stat', idnp: '1003600045678' };
      })();
    </script>
  `,
};

export const EdgeCases: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Long party names, very long descriptions, and a long custom transaction ' +
          'identifier — verifying that wrap, truncation, and tabular numerals stay ' +
          'readable. IDNPs are masked.',
      },
    },
  },
  render: () => /*html*/ `
    <cor-receipt
      service="mpay"
      status="paid"
      amount="9 876 543,21"
      currency="MDL"
      date="2026-05-22T23:59:00Z"
      description="Plata pentru servicii de consultanță juridică, redactarea contractului de prestări servicii și înregistrarea modificărilor în Registrul de stat al persoanelor juridice, anul fiscal 2026"
      transaction-id="MPY-2026-0001-A47F2-LONGINSTITUTIONALREFERENCE-9988-7766-5544"
      qr-data="https://verify.mpay.gov.md/tx/edge-case-very-long-payload?ref=abc123&signature=def456"
      id="receipt-edge"
    ></cor-receipt>
    <script>
      (function () {
        const el = document.getElementById('receipt-edge');
        if (!el) return;
        el.sender = {
          name: 'Întreprinderea Individuală „Popescu Ion și Asociații Consultanță Juridică”',
          idnp: '2002003456789',
        };
        el.recipient = {
          name: 'Inspectoratul Fiscal Principal de Stat al Republicii Moldova, Direcția Generală Administrare Fiscală Chișinău',
          idnp: '1003600045678',
        };
      })();
    </script>
  `,
};
