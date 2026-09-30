# Plan: Aliniere @egovmd/mud la WCAG 2.1 AA

## Context

Cerințele proiectului impun conformitate **WCAG 2.1 Level AA** (Perceivable, Operable, Understandable, Robust). Investigația arată mai multe probleme care blochează această conformitate:

**Inconsistențe în standard:**
- [.claude/commands/audit-accessibility.md:2](x:/WORK/corlab/age-design/.claude/commands/audit-accessibility.md#L2) — descrierea zice „WCAG 2.2 AA" dar raportul (linia 191) zice „WCAG 2.1 AA"
- [.claude/skills/accessibility-compliance/references/wcag-guidelines.md](x:/WORK/corlab/age-design/.claude/skills/accessibility-compliance/references/wcag-guidelines.md) — acoperă criteriile noi 2.2 (țintă 24×24, focus appearance), care nu sunt cerute la 2.1 AA și pot crea confuzie

**Gap-uri funcționale:**
- [.storybook/preview.js:144-146](x:/WORK/corlab/age-design/.storybook/preview.js#L144-L146) — addon-ul a11y Storybook este **dezactivat** (`a11y: { disable: true }`), deși este instalat
- Nu există `jest-axe`, `@axe-core/playwright` sau script de verificare contrast pentru token-uri
- Comenzile `pre-pr-check`, `update-tokens`, `fix-visual-bug` nu verifică deloc accesibilitatea
- Agenții `new-component`, `refactor-component`, `migrate-component`, `modify-component` nu rulează verificări a11y înainte să declare componenta gata
- Dark mode nu este audat pentru contrast (deși tokens dark există)

**Skill canonic lipsește:** Skill-ul `accessibility-compliance` este un stub deprecat care încă referă căi `.windsurf/` vechi — fără ghid canonic activ pentru WCAG 2.1 AA.

**Rezultat dorit:** Skill canonic WCAG 2.1 AA reactivat, tooling automat care prinde regresiile, toate skill-urile/agenții de audit verifică explicit accesibilitatea în ambele moduri (light + dark), inclusiv cerințele Figma de la nodul `2753-5965` din [doJ7tDY0PlQ0PqMgbpFVIC](https://www.figma.com/design/doJ7tDY0PlQ0PqMgbpFVIC/Components?node-id=2753-5965&m=dev).

---

## 1. Reactivează Skill `accessibility-compliance` ca ghid canonic WCAG 2.1 AA

**Modifică:** [.claude/skills/accessibility-compliance/SKILL.md](x:/WORK/corlab/age-design/.claude/skills/accessibility-compliance/SKILL.md)

Înlocuiește stub-ul deprecat cu Skill activ care:
- Descrie clar nivelul țintă: **WCAG 2.1 Level AA**
- Listează toate Success Criteria 2.1 AA aplicabile pentru un design system de componente (subset: 1.3.1, 1.3.2, 1.3.4, 1.3.5, 1.4.1, 1.4.3, 1.4.4, 1.4.10, 1.4.11, 1.4.12, 1.4.13, 2.1.1, 2.1.2, 2.1.4, 2.4.3, 2.4.6, 2.4.7, 2.5.1, 2.5.2, 2.5.3, 2.5.4, 3.2.1, 3.2.2, 3.3.1, 3.3.2, 3.3.3, 3.3.4, 4.1.2, 4.1.3)
- Are tabel de contrast: 4.5:1 text normal / 3:1 text mare / 3:1 UI components & focus
- Are checklist scurt pentru fiecare tip de componentă (button, input, modal, dropdown, tab, checkbox)
- Pointer către cerințele specifice Figma (nodul `2753-5965`) ca sursă de adevăr proiect
- Note despre dark mode: ambele teme trebuie validate independent
- Listă explicită „nu cerut de 2.1 AA dar recomandat" pentru criteriile 2.2 (2.4.11 Focus Not Obscured, 2.5.7 Dragging, 2.5.8 Target Size 24×24) — secțiune separată, opt-in

**Modifică:** [.claude/skills/accessibility-compliance/references/wcag-guidelines.md](x:/WORK/corlab/age-design/.claude/skills/accessibility-compliance/references/wcag-guidelines.md)

Restructurează în două secțiuni clare: (a) WCAG 2.1 AA — obligatoriu, (b) WCAG 2.2 — recomandări viitoare opt-in.

**Modifică `description`** la „Use when designing, implementing, auditing, or modifying any component to ensure WCAG 2.1 Level AA conformance. Covers contrast, keyboard navigation, ARIA, focus management, motion preferences, and dark mode validation."

**Re-îndreaptă deprecation notice** — elimină mențiunile `.windsurf/` (cale obsoletă).

---

## 2. Aliniază referințele WCAG la 2.1 AA peste tot

| Fișier | Schimbare |
|---|---|
| [.claude/commands/audit-accessibility.md:2](x:/WORK/corlab/age-design/.claude/commands/audit-accessibility.md#L2) | description: „WCAG 2.2 AA" → „WCAG 2.1 AA" |
| [.claude/commands/audit-accessibility.md](x:/WORK/corlab/age-design/.claude/commands/audit-accessibility.md) | Adaugă Step 5b: contrast în **dark mode** (toggle theme via Storybook global) |
| [.claude/commands/audit-accessibility.md](x:/WORK/corlab/age-design/.claude/commands/audit-accessibility.md) | Adaugă în raportul final coloane pentru Success Criteria numbers (1.4.3, 2.4.7, etc.) |
| [.claude/commands/audit-component.md:235](x:/WORK/corlab/age-design/.claude/commands/audit-component.md) | confirmă „WCAG 2.1 AA" (deja există), adaugă pointer către Skill `accessibility-compliance` |
| [AGENTS.md](x:/WORK/corlab/age-design/AGENTS.md) anti-pattern #20 | Reformulează cu trimitere explicită la Skill `accessibility-compliance` și „WCAG 2.1 AA" ca standard |
| [src/components/AGENTS.md](x:/WORK/corlab/age-design/src/components/AGENTS.md) | Adaugă secțiune scurtă „Accessibility — WCAG 2.1 AA" cu pointer la Skill și 5 reguli esențiale |
| [src/components/_agents/verification-git.md](x:/WORK/corlab/age-design/src/components/_agents/verification-git.md) | Extinde checklist a11y de la 2 linii la 8 linii: contrast (light + dark), focus-visible, keyboard (Tab/Enter/Esc/arrow), ARIA states, reduced-motion, target size (cu excepții documentate), screen reader names, no auto-play motion >5s |

---

## 3. Activează tooling automat a11y

### 3a. Storybook addon-a11y

**Modifică:** [.storybook/preview.js:144-146](x:/WORK/corlab/age-design/.storybook/preview.js#L144-L146)

```js
a11y: {
  config: {
    rules: [
      { id: 'color-contrast', enabled: true },
      { id: 'color-contrast-enhanced', enabled: false }, // AAA, not required
      // ... explicit list pentru 2.1 AA
    ],
  },
  options: {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  },
},
```

Notă: `axe-core` etichetează regulile cu WCAG tags. Tag-urile `wcag21a` + `wcag21aa` filtrează exact criteriile 2.1 AA.

### 3b. jest-axe pentru teste unitare

**Modifică:** [package.json](x:/WORK/corlab/age-design/package.json)

Adaugă `jest-axe` și `@types/jest-axe` la `devDependencies`.

**Modifică:** [jest.config.js](x:/WORK/corlab/age-design/jest.config.js) sau fișier echivalent — adaugă setup pentru jest-axe matcher.

**Creează:** `src/components/_agents/a11y-testing.md` — pattern reutilizabil pentru teste a11y per componentă (apel `axe(container, { rules: { ... } })`).

### 3c. Script verificare contrast tokens

**Creează:** `scripts/audit-token-contrast.mjs`

Script Node care:
- Citește `tokens/core/color.tokens.json` (light) și `tokens/core/color.dark.tokens.json` (dark)
- Pentru fiecare pereche cunoscută (text base / background base, text brand / background brand, focus ring / background, border / background etc.) calculează ratio conform [WCAG relative luminance](https://www.w3.org/TR/WCAG21/#dfn-relative-luminance)
- Reportează PASS/FAIL pentru fiecare pereche (4.5:1 text normal, 3:1 text mare/UI)
- Exit code ≠ 0 dacă vreo pereche obligatorie nu trece
- Adaugă `"audit:contrast": "node scripts/audit-token-contrast.mjs"` în [package.json](x:/WORK/corlab/age-design/package.json) scripts

**Reutilizează:** dependențele existente — nu adăuga librărie nouă pentru calcul contrast; implementă cu math direct (formula WCAG sub 30 linii).

### 3d. @axe-core/playwright pentru e2e

**Modifică:** [package.json](x:/WORK/corlab/age-design/package.json) — adaugă `@axe-core/playwright` la devDependencies.

**Modifică:** [.claude/commands/audit-accessibility.md](x:/WORK/corlab/age-design/.claude/commands/audit-accessibility.md) Step 5 — exemplu cod pentru rulare axe în Playwright via `mcp__playwright__browser_evaluate` cu axe injectat.

---

## 4. Adaugă verificări a11y în skill-urile/agenții care nu le au

| Comandă/Agent | Schimbare |
|---|---|
| [.claude/commands/pre-pr-check.md](x:/WORK/corlab/age-design/.claude/commands/pre-pr-check.md) | Adaugă pas „Run `yarn audit:contrast`" și „Run Storybook a11y addon — verify zero violations" |
| [.claude/commands/update-tokens.md](x:/WORK/corlab/age-design/.claude/commands/update-tokens.md) | Adaugă pas final: rulează `audit:contrast` după modificare token; orice token nou trebuie să aibă pereche contrast documentată |
| [.claude/commands/fix-visual-bug.md](x:/WORK/corlab/age-design/.claude/commands/fix-visual-bug.md) | Adaugă regulă: dacă bug-ul atinge culoare/focus/state vizibilitate, verifică contrast după fix |
| [.claude/commands/modify-component.md](x:/WORK/corlab/age-design/.claude/commands/modify-component.md) | Adaugă pas: dacă variantă/state nouă, rulează `/audit-accessibility` la final |
| [.claude/commands/migrate-component.md](x:/WORK/corlab/age-design/.claude/commands/migrate-component.md) | Adaugă blocker: nu permite graduare la `src/components/` fără pass `/audit-accessibility` complet |
| [.claude/agents/new-component.md](x:/WORK/corlab/age-design/.claude/agents/new-component.md) | În pipeline-ul pixel-perfect, adaugă fază a11y: validează contrast Figma vs token-uri, focus-visible, ARIA |
| [.claude/agents/refactor-component.md](x:/WORK/corlab/age-design/.claude/agents/refactor-component.md) | Baseline screenshot include focus-state; regresie a11y este blocker |
| [.claude/agents/audit-production.md](x:/WORK/corlab/age-design/.claude/agents/audit-production.md) | Faza 3 referă explicit Skill `accessibility-compliance` și rulează atât `/audit-accessibility` cât și `audit:contrast` |

---

## 5. Documentează excepții target size

**Creează:** `src/components/_agents/target-size-exceptions.md`

Document scurt care:
- Notează că **WCAG 2.1 AA nu cere 44×44** (criteriul 2.5.5 este nivel AAA în 2.1; criteriul 2.5.8 din 2.2 cere doar 24×24)
- Listează componentele actuale sub 44×44 ca decizii conștiente conforme: button md (32px), button sm (32px), button xs (24px), checkbox md (20px), checkbox sm (16px)
- Notează că aria interactivă efectivă include padding-ul/hit area în jurul controlului
- Recomandă opt-in: dezvoltatorii aplicațiilor finale pot folosi varianta `lg` (48px) când doresc compliance 2.1 AAA / 2.2 AA pe target size

**Referă din:** [src/components/AGENTS.md](x:/WORK/corlab/age-design/src/components/AGENTS.md) secțiunea Accessibility.

---

## 6. Cerințe specifice Figma

**Nodul Figma:** [doJ7tDY0PlQ0PqMgbpFVIC?node-id=2753-5965](https://www.figma.com/design/doJ7tDY0PlQ0PqMgbpFVIC/Components?node-id=2753-5965&m=dev)

**În timpul implementării (după ce planul este aprobat):**
1. Autorizează Figma MCP (`mcp__figma__authenticate`)
2. Extrage cerințele specifice de la nodul 2753-5965 prin `mcp__figma__get_design_context`
3. Mapează fiecare cerință Figma la Success Criteria WCAG 2.1 AA în Skill
4. Dacă Figma cere ceva în plus față de 2.1 AA (de ex. ratio 7:1 ca în AAA, sau target size 44px), notează în Skill ca „Project-specific addendum to WCAG 2.1 AA"
5. Adaugă pointer din Skill: „Single source of truth pentru cerințele acestui proiect: Figma nodul 2753-5965"

---

## Fișiere de modificat (sumar)

**Skill canonic:**
- [.claude/skills/accessibility-compliance/SKILL.md](x:/WORK/corlab/age-design/.claude/skills/accessibility-compliance/SKILL.md)
- [.claude/skills/accessibility-compliance/references/wcag-guidelines.md](x:/WORK/corlab/age-design/.claude/skills/accessibility-compliance/references/wcag-guidelines.md)
- [.claude/skills/accessibility-compliance/references/aria-patterns.md](x:/WORK/corlab/age-design/.claude/skills/accessibility-compliance/references/aria-patterns.md)

**Comenzi/agenți:**
- [.claude/commands/audit-accessibility.md](x:/WORK/corlab/age-design/.claude/commands/audit-accessibility.md)
- [.claude/commands/audit-component.md](x:/WORK/corlab/age-design/.claude/commands/audit-component.md)
- [.claude/commands/pre-pr-check.md](x:/WORK/corlab/age-design/.claude/commands/pre-pr-check.md)
- [.claude/commands/update-tokens.md](x:/WORK/corlab/age-design/.claude/commands/update-tokens.md)
- [.claude/commands/fix-visual-bug.md](x:/WORK/corlab/age-design/.claude/commands/fix-visual-bug.md)
- [.claude/commands/modify-component.md](x:/WORK/corlab/age-design/.claude/commands/modify-component.md)
- [.claude/commands/migrate-component.md](x:/WORK/corlab/age-design/.claude/commands/migrate-component.md)
- [.claude/agents/new-component.md](x:/WORK/corlab/age-design/.claude/agents/new-component.md)
- [.claude/agents/refactor-component.md](x:/WORK/corlab/age-design/.claude/agents/refactor-component.md)
- [.claude/agents/audit-production.md](x:/WORK/corlab/age-design/.claude/agents/audit-production.md)

**Docs:**
- [AGENTS.md](x:/WORK/corlab/age-design/AGENTS.md)
- [src/components/AGENTS.md](x:/WORK/corlab/age-design/src/components/AGENTS.md)
- [src/components/_agents/verification-git.md](x:/WORK/corlab/age-design/src/components/_agents/verification-git.md)
- `src/components/_agents/a11y-testing.md` (nou)
- `src/components/_agents/target-size-exceptions.md` (nou)

**Tooling:**
- [.storybook/preview.js](x:/WORK/corlab/age-design/.storybook/preview.js)
- [package.json](x:/WORK/corlab/age-design/package.json) (devDeps + scripts)
- `jest.config.js` sau echivalent (setup jest-axe)
- `scripts/audit-token-contrast.mjs` (nou)

---

## Ordinea de execuție

1. **Reactivare Skill `accessibility-compliance`** + restructurare wcag-guidelines.md (ghidul canonic)
2. **Aliniere referințe WCAG 2.1 AA** în toate docs/comenzi/agenți
3. **Activare Storybook a11y addon** cu config 2.1 AA tags
4. **Creare script `audit:contrast`** + verificare token-uri actuale
5. **Adăugare jest-axe + @axe-core/playwright** + pattern testing doc
6. **Extindere comenzi/agenți audit** cu pași a11y obligatorii
7. **Documentare excepții target size**
8. **Autorizare Figma + extragere cerințe nodul 2753-5965** → integrare în Skill ca addendum proiect
9. **Smoke run**: rulează `yarn storybook`, verifică addon a11y arată zero erori pe componentele atomice principale; rulează `yarn audit:contrast` și remediază orice fail

---

## Verificare end-to-end

1. **Skill canonic:** invocă Skill `accessibility-compliance` și confirmă că răspunde cu ghidul WCAG 2.1 AA actualizat.
2. **Storybook a11y:** `yarn sp.dev.watch` → deschide orice componentă → panel a11y → zero violations pentru tag-urile 2.1 AA în light și dark mode.
3. **Contrast tokens:** `yarn audit:contrast` → exit 0; raport listează toate perechile cu ratio actual; orice FAIL este blocant.
4. **jest-axe:** `yarn test` → toate componentele cu test a11y pass; cel puțin un test demonstrativ scris pe mud-button.
5. **Audit accessibility comandă:** rulează `/audit-accessibility @mud-button` → verifică că raportul include light + dark, ARIA states, focus contrast, Success Criteria numbers.
6. **Pre-PR check:** rulează `/pre-pr-check` → include faza a11y (contrast + storybook a11y).
7. **Figma alignment:** după autorizare Figma, confirmă că cerințele de la nodul 2753-5965 sunt reflectate în Skill ca addendum.
8. **Migration blocker:** rulează `/migrate-component` pe o componentă din `src/hidden/` cu probleme a11y intenționate → verifică blocare graduare.
