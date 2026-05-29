/**
 * Public type surface for `mud-receipt`.
 *
 * Service identifiers match the Romanian e-Gov product set and the
 * `mud-logo` `name` prefixes:
 *   - mpay      → MPay payment receipt        (default title: "Bon de plată")
 *   - mpass     → MPass authentication log    (default title: "Confirmare autentificare")
 *   - msign     → MSign signature receipt     (default title: "Confirmare semnătură")
 *   - mdelivery → MDelivery confirmation      (default title: "Confirmare livrare")
 */
export const RECEIPT_SERVICES = ['mpay', 'mpass', 'msign', 'mdelivery'] as const;
export type ReceiptService = (typeof RECEIPT_SERVICES)[number];

/**
 * Lifecycle state of the underlying transaction.
 * Maps to a `mud-tag` semantic + Romanian label inside the component:
 *   - paid      → tag positive  · "Plătit"
 *   - confirmed → tag brand     · "Confirmat"
 *   - pending   → tag warning   · "În curs"
 *   - failed    → tag danger    · "Refuzat"
 */
export const RECEIPT_STATUSES = ['paid', 'confirmed', 'pending', 'failed'] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

/** A party (sender / recipient) on the receipt. */
export interface ReceiptParty {
  /** Full legal name. Rendered as-is. */
  name?: string;
  /** Moldovan IDNP (13 digits). Auto-masked to keep first 4 + last 3 visible. */
  idnp?: string;
}

/** Payload emitted by the four action events (`mudDownload`, `mudShare`, `mudEmail`, `mudPrint`). */
export interface ReceiptActionDetail {
  service: ReceiptService;
  status?: ReceiptStatus;
  transactionId?: string;
}
