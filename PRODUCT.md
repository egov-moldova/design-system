# Product

## Register

product

## Users

**Primary: Moldovan citizens** using government services online. They open `egov.md` properties (FOD, MPay, MPass, MSign, MPower, MDelivery) to pay fees, authenticate against state systems, sign documents, grant power-of-attorney, or receive deliveries. Their context: they have *one task* to finish — usually under time pressure, often on mobile, often anxious that they will misclick and lose their place in the queue.

**Secondary: integrators inside government agencies and public-service operators** consuming `@egovmd/mud` to build their own service flows on top of the e-Gov stack. They want a small, stable component contract that compiles into any framework and survives accessibility audits without rework.

**Tertiary: in-house product and design teams** at Corlab and partner agencies shipping new screens against shared tokens.

The job is always the same shape: complete a government interaction with confidence that the right thing happened. No persuasion. No upsell. No browsing.

## Product Purpose

`@egovmd/mud` is the visual and behavioral substrate of the Moldovan e-Government ecosystem. It exists to make every state-issued web surface — payment, authentication, signature, representation registry, delivery — look, feel, and behave the same way, so that a citizen who learns one service has already learned the rest.

Success looks like: a person submitting a form on `mpay.gov.md`, then opening `mdelivery.gov.md` the same week, and never wondering whether they are still on a `.gov.md` site. The button looks the same. The error state looks the same. The keyboard works the same. The institution is recognisable.

## Brand Personality

**Three words: calm, civic, exact.**

Calm — surfaces breathe, motion is restrained, the system never shouts. A citizen filing taxes does not need confetti.

Civic — the design speaks for the state without theatre. Authority is conveyed through clarity and consistency, not weight or ornament. The aesthetic is closer to a well-lit modern public library than to a corporate landing page or a bureaucratic counter from the nineties.

Exact — every element earns its place. Spacing, type, and color are deliberate. The components are small in number and large in coverage. A primary button is one thing, not eleven.

Voice: in Romanian first, factual, polite, second-person singular formal ("dumneavoastră" implied). Verbs over nouns ("plătește" not "efectuarea plății"). No marketing copy, no exclamation marks. Errors say what happened and what to do, in that order.

## Anti-references

The system must explicitly NOT look or feel like any of the following:

- **SaaS landing-page aesthetics.** No gradient heroes. No "Sign up free" CTAs styled as the only blue thing on a page. No glassmorphism cards floating over abstract backgrounds.
- **Generic admin-template bureaucracy.** No Bootstrap-default gray-on-white forms. No fixed sidebars with 14 hardcoded items.
- **Material You / iOS / Liquid Glass mimicry.** These belong to specific vendor identities. A `.gov.md` surface must read as institutional and neutral, not as "a Google app" or "an Apple app".
- **Crypto / fintech aggression.** No neon accents on black, no animated gradients, no "futuristic" geometry.
- **Decorative chrome.** No icon-laden hero illustrations on every section. No motion that exists for its own sake.
- **The hero-metric template.** Big number, small label, supporting stats. Wrong category — this is service software, not a marketing dashboard.

If a screenshot of a new screen could be mistaken for a startup landing page, a fintech onboarding, or a Material 3 demo, it has failed the brand.

## Design Principles

1. **Civic trust through clarity.** The fastest signal that "this is a state surface" must be the *consistency and restraint* of the visual language, not a flag or a seal. Every screen should be immediately legible to a person who has used one other `.gov.md` page.

2. **Accessibility is non-negotiable.** WCAG 2.1 AA is the floor. Keyboard navigation, screen-reader contracts, reduced-motion preferences, and color-contrast pairs are validated automatically in the audit pipeline. If a pattern cannot meet AA, the pattern does not ship.

3. **One way to do each thing.** A button, an input, an error. Variants exist only when a real semantic distinction (primary vs destructive, sm vs md vs lg) demands them. The system rejects "decorative variants" that look different without behaving differently.

4. **Multilingual without ornament.** Romanian is primary, but the type scale, spacing rhythm, and component widths must accommodate longer Russian and English translations without breaking. Plan for ±20% string length, plan for diacritics (ă, â, î, ș, ț), plan for accessible label growth.

5. **Calm authority.** Soft ambient shadow, generous spacing, restrained accent use, motion under 200ms. The system never demands attention through aggression. The brand blue is rare on screen on purpose; its rarity is what gives it weight.

## Accessibility & Inclusion

- **Conformance target: WCAG 2.1 Level AA**, validated per component via `accessibility-compliance` skill and the audit pipeline.
- **Color contrast pairs** (`yarn audit:contrast`, `yarn audit:contrast-pairs`) gate every token shipped — both light and dark themes.
- **Keyboard navigation:** every interactive element is reachable and operable without a pointer. Focus indicators are visible at AA contrast against every background variant.
- **Reduced motion:** all transitions respect `prefers-reduced-motion`. Animations are functional (state feedback under 200ms), never decorative.
- **Screen readers:** components expose a structural ARIA contract validated in `*.spec.tsx` (`audit:a11y-tree`).
- **Low-vision:** zoom up to 200% must not break layout; the type scale (10–64px) and spacing scale (0–120px) are designed for proportional resizing.
- **Cognitive load:** error messages are pre-validated by content guidelines (factual, second-person formal, action-oriented). Loading and disabled states are clearly distinguishable from active ones.
- **Language:** screen-reader output, error messages, and labels follow the Romanian institutional voice; component slots accept arbitrary content so consumers can translate.
- **Inclusive defaults:** no time-pressured interactions, no flashing content, no required pointer-only gestures.

## Surfaces this serves

Component consumers visible in the codebase and logos manifest:

- **MPay** — *plătește* — electronic payments service
- **MPass** — *loghează-te* — authentication and access-control service
- **MSign** — *semnează* — electronic signature service
- **MPower** — *împuternicește* — electronic representation / power-of-attorney registry
- **MDelivery** — *solicită și primește* — government delivery service
- **FOD** — front-office portal that hosts the live component demo at `fod.dev.egov.md`

Design decisions in DESIGN.md are made for this set of surfaces. New consumers join the system on the same contract.
