export const FOOTER_VARIANTS = ['evo', 'simple'] as const;
export const FOOTER_LOCALES = ['ro', 'ru', 'en'] as const;
export const FOOTER_SOCIAL_PLATFORMS = ['facebook', 'instagram', 'youtube', 'linkedin', 'twitter', 'tiktok'] as const;
export const FOOTER_PARTNER_LOGOS = ['guvernul', 'age', '100-digital'] as const;

export type FooterVariant = (typeof FOOTER_VARIANTS)[number];
export type FooterLocale = (typeof FOOTER_LOCALES)[number];
export type FooterSocialPlatform = (typeof FOOTER_SOCIAL_PLATFORMS)[number];
export type FooterPartnerLogo = (typeof FOOTER_PARTNER_LOGOS)[number];

/** Single footer link entry inside a `FooterSection`. */
export type FooterLink = {
  /** Visible label. Romanian-first. */
  label: string;
  /** Anchor href. */
  href: string;
  /** When `true`, opens in a new tab and applies `rel="noopener noreferrer"`. */
  external?: boolean;
};

/** One column of titled, vertical links. */
export type FooterSection = {
  /** Column header (e.g. `"Servicii guvernamentale"`). */
  title: string;
  /** Vertical link list. */
  links: ReadonlyArray<FooterLink>;
};

/** Contact block (email, phone, address). */
export type FooterContact = {
  /** Email address. Renders as `mailto:` link. */
  email?: string;
  /** Phone number. Renders as `tel:` link. */
  phone?: string;
  /** Postal/physical address. Plain text. */
  address?: string;
};

/** One social platform link. */
export type FooterSocial = {
  platform: FooterSocialPlatform;
  href: string;
};

/** One government/agency partner logo. */
export type FooterPartner = {
  name: FooterPartnerLogo;
  href?: string;
};

/** Payload emitted by `corLocaleChange`. */
export type FooterLocaleChangeDetail = {
  locale: FooterLocale;
};

/** Romanian-first default copy. Overridable via the public `@Prop` surface. */
export const FOOTER_DEFAULTS = {
  ariaLabel: 'Subsol pagină',
  copyrightText: '© 2026 Guvernul Republicii Moldova. Toate drepturile rezervate.',
  accessibilityLabel: 'Declarație de accesibilitate',
  licenseLabel: 'Politica de confidențialitate',
  termsLabel: 'Termeni și condiții',
  contactHeading: 'Contacte',
  socialHeading: 'Rețele sociale',
  partnersHeading: 'Parteneri instituționali',
  localeLabel: 'Limbă',
  localeMenuLabel: 'Selectează limba',
} as const;

/** Display label for each supported locale. */
export const FOOTER_LOCALE_LABELS: Record<FooterLocale, string> = {
  ro: 'Română',
  ru: 'Русский',
  en: 'English',
};

/** Partner-logo display label (Romanian). */
export const FOOTER_PARTNER_LABELS: Record<FooterPartnerLogo, string> = {
  'guvernul': 'Guvernul Republicii Moldova',
  'age': 'Agenția de Guvernare Electronică',
  '100-digital': '100% Digital',
};

/** Default Romanian section catalogue used when no `sections` prop is passed. */
export const FOOTER_DEFAULT_SECTIONS: ReadonlyArray<FooterSection> = [
  {
    title: 'Servicii guvernamentale',
    links: [
      { label: 'Pentru tine', href: '#pentru-tine' },
      { label: 'Pentru afacerea ta', href: '#pentru-afaceri' },
      { label: 'Prestatori servicii', href: '#prestatori' },
      { label: 'Evenimente de viață', href: '#evenimente' },
    ],
  },
  {
    title: 'Despre noi',
    links: [
      { label: 'Despre AGE', href: '#despre-age' },
      { label: 'Carieră', href: '#cariera' },
      { label: 'Comunicate', href: '#comunicate' },
      { label: 'Rapoarte', href: '#rapoarte' },
    ],
  },
  {
    title: 'Asistență',
    links: [
      { label: 'Întrebări frecvente', href: '#faq' },
      { label: 'Raportează o problemă', href: '#raporteaza' },
      { label: 'Numere de urgență', href: '#urgenta' },
      { label: 'Brand Center', href: '#brand' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Termeni și condiții', href: '#termeni' },
      { label: 'Politica de confidențialitate', href: '#confidentialitate' },
      { label: 'Politica cookie-uri', href: '#cookies' },
      { label: 'GDPR', href: '#gdpr' },
    ],
  },
];

/** Default contact block (AGE Moldova). */
export const FOOTER_DEFAULT_CONTACT: FooterContact = {
  email: 'office@egov.md',
  phone: '0(22) 820 026',
  address: 'Republica Moldova, MD-2012, mun. Chișinău, bd. Ștefan cel Mare și Sfânt 134',
};

/** Default social link catalogue. */
export const FOOTER_DEFAULT_SOCIAL: ReadonlyArray<FooterSocial> = [
  { platform: 'facebook', href: 'https://facebook.com/egov.md' },
  { platform: 'instagram', href: 'https://instagram.com/egov.md' },
  { platform: 'linkedin', href: 'https://linkedin.com/company/egov-md' },
  { platform: 'youtube', href: 'https://youtube.com/@egov-md' },
];

/** Default partner-logo catalogue. */
export const FOOTER_DEFAULT_PARTNERS: ReadonlyArray<FooterPartner> = [{ name: 'guvernul' }, { name: 'age' }];
