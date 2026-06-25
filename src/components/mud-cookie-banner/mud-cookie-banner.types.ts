export const COOKIE_BANNER_VARIANTS = ['simple', 'detailed'] as const;
export const COOKIE_BANNER_POSITIONS = ['bottom', 'top'] as const;

export type CookieBannerVariant = (typeof COOKIE_BANNER_VARIANTS)[number];
export type CookieBannerPosition = (typeof COOKIE_BANNER_POSITIONS)[number];

/**
 * One category of cookies the user can opt into or out of.
 *
 * `required: true` categories cannot be disabled (the switch is replaced by a
 * fixed check-mark indicator and the `enabled` state is forced to `true`).
 */
export type CookieCategory = {
  /** Stable identifier returned in the consent payload (e.g. `"analytics"`). */
  id: string;
  /** Visible label (e.g. `"Cookie-uri statistice"`). */
  label: string;
  /** Description rendered under the label. Plain text. */
  description: string;
  /** When set, the category is always-on (check-mark instead of switch). */
  required?: boolean;
  /** Initial value for the switch. Ignored when `required` is `true`. */
  enabled?: boolean;
};

/** Payload emitted by `mudAccept` and `mudSavePreferences`. */
export type CookieConsentDetail = {
  /** Map of category id → user's choice. Required categories are always `true`. */
  categories: Record<string, boolean>;
};

/** Romanian-first default copy. Overridable via the public `@Prop`s. */
export const COOKIE_BANNER_DEFAULTS = {
  title: 'Folosim cookie-uri',
  body: 'Acest site folosește cookie-uri pentru a asigura funcționalitatea de bază și performanța. În plus, utilizăm cookie-uri de țintire pentru a îmbunătăți experiența ta, pentru analize și pentru a afișa conținut personalizat.',
  expandedTitle: 'Alege ce cookie-uri să accepți',
  acceptLabel: 'Accept toate',
  rejectLabel: 'Refuză toate',
  manageLabel: 'Personalizează',
  saveLabel: 'Salvează preferințele',
  privacyLabel: 'Politica de confidențialitate',
  requiredLabel: 'Obligatoriu',
  closeLabel: 'Închide',
  moreLabel: 'Mai mult',
  lessLabel: 'Mai puțin',
} as const;

/**
 * Default category catalogue used when the consumer does not pass `categories`.
 * Aligns with the GDPR-recommended three buckets (necessary / analytics /
 * marketing). Consumers should override with their own copy and ids.
 */
export const COOKIE_BANNER_DEFAULT_CATEGORIES: ReadonlyArray<CookieCategory> = [
  {
    id: 'necessary',
    label: 'Cookie-uri necesare',
    description:
      'Aceste cookie-uri sunt esențiale pentru funcționalitatea de bază a site-ului, cum ar fi navigarea. Nu pot fi dezactivate.',
    required: true,
    enabled: true,
  },
  {
    id: 'analytics',
    label: 'Cookie-uri statistice',
    description:
      'Colectează informații despre modul în care vizitatorii folosesc site-ul. Datele ajută la îmbunătățirea performanței site-ului.',
    enabled: false,
  },
  {
    id: 'marketing',
    label: 'Cookie-uri de marketing',
    description:
      'Sunt folosite pentru a urmări vizitatorii pe diferite site-uri în scopul afișării reclamelor relevante.',
    enabled: false,
  },
];
