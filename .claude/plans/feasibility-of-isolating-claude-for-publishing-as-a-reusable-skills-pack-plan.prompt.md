# Plan: Fezabilitate izolare `.claude/` pentru publicare ca skills pack reutilizabil

## Context

Folderul `x:\WORK\corlab\age-design\.claude\` conține un sistem matur de instrucțiuni AI: **11 agenți, 12 skill-uri, 10 comenzi slash**, construit specific în jurul AGE Design System (`mud-*` Stencil components). Există un repo dedicat (separat de age-design) pentru skill-uri ce pot fi publicate ulterior pe **skills.sh**.

**Decizia user-ului acum**: nu execuția. **Analiza** dacă publicarea agnostică e (a) posibilă, (b) are sens, (c) nu strică calitatea proiectului curent. Implementarea se va face mai târziu în repo-ul dedicat.

**Decizii deja luate (clarificate cu user)**:
- Distribution target: **repo separat dedicat skills-urilor** (existent, target final: skills.sh).
- Maintenance: **generator script** (Opțiunea B) — ~1 zi tooling, zero drift în timp.
- Tier 3 (orchestratori indispensabili): **publicați ca "reference with disclaimer"**, nu plug-and-play.

---

## Findings consolidate (din 3 agenți Explore în paralel)

### Distribuție pe portabilitate

| Categorie | Plug-and-play | Rebrand simplu | Parametrizare | Reference-only | Total |
|-----------|---------------|----------------|---------------|----------------|-------|
| **Agents** | 0 | 5 | 3 | 3 | 11 |
| **Skills** | 5 | 2 | 3 | 2 | 12 |
| **Commands** | 2 | 0 | 6 | 2 | 10 |
| **TOTAL** | **7 (22%)** | **7 (22%)** | **12 (36%)** | **7 (22%)** | **33** |

**Concret pe nume**:

- **Plug-and-play (zero refactor)**: `optimize-prompt`, `skill-creator`, `systematic-debugging`, `terminal-ansi-colors`, `verification-before-completion` skills + `/optimize-prompt`, `/optimize-prompt-new-component` commands.
- **Rebrand simplu (`mud-` → `{{prefix}}-`)**: `story-writer`, `test-writer`, `integration-checker`, `pixel-perfect-verifier`, `a11y-verifier` agents + `carbon-icons`, `figma-illustration-import` skills.
- **Parametrizare moderată (paths + yarn scripts + bundle scripts)**: `token-validator`, `custom-component`, `refactor-component` agents + `accessibility-compliance`, `stencil-compliance`, `token-creation` skills + `/update-tokens`, `/audit-accessibility`, `/modify-component`, `/fix-visual-bug`, `/pre-pr-check`, `/audit-component` commands.
- **Reference-only (orchestratori indispensabili, publici cu disclaimer)**: `new-component`, `redesign-component`, `audit-production` agents + `audit-component`, `parallel-aux-tasks` skills + `/migrate-component` command.

### Surse principale de cuplaj proiect (cuantificate)

1. Prefix `mud-` — **~200+ ocurențe** total în `.claude/`.
2. Path-uri hardcodate (`src/components/`, `src/hidden/`, `tokens/core/`, `tokens/core.dark/`, `tokens/age/`) — ~40 ocurențe.
3. Comenzi yarn proiect-specific (`yarn tokens.build`, `yarn audit:contrast`, `yarn sp.dev.watch`, `yarn lint.tokens`) — ~40 ocurențe.
4. Scripts referențiate din `scripts/audit/*.mjs`, `scripts/tokens-validate.mjs`, `scripts/audit-token-contrast.mjs`, `scripts/git/setup-merge-drivers.mjs` — **NU bundle-uite** în niciun skill, dar invocate.
5. Storybook port 6007 hardcodat — 6 fișiere.
6. Documente "source-of-truth" interne: `tokens/AGENTS.md`, `src/components/AGENTS.md`, `src/components/_agents/*.md`.
7. Cline Kanban + 62-component redesign program — doar în `redesign-component` agent.

---

## Verdict — Răspuns la cele 3 întrebări ale user-ului

### 1. ❓ "Este posibil și cum?"

**DA, fezabil pentru ~78% din colecție** (26 din 33 fișiere = plug-and-play + rebrand + parametrizare).

**Cum**:
- Construim un **generator script** (`scripts/publish-claude-pack.mjs`) în repo-ul age-design care:
  - Citește `.claude/` live
  - Aplică template substitutions definite în `template-vars.json` (`{{prefix}}`, `{{components-root}}`, `{{tokens-root}}`, `{{cmd-tokens-build}}`, `{{cmd-audit-contrast}}`, `{{storybook-port}}`)
  - Copiază scripturi necesare (`scripts/audit/*.mjs`, `scripts/tokens-validate.mjs`, `scripts/audit-token-contrast.mjs`, `scripts/git/setup-merge-drivers.mjs`) în `bundled-scripts/` al fiecărui skill care le referențiază — **skill-urile devin self-contained**.
  - Output: arborele agnostic exportat → copiezi/sincronizezi în repo-ul tău dedicat skill-urilor → publici pe skills.sh.
- Generator-ul rulează la cerere; **nu modifică niciodată `.claude/` live**.

**Tier 3** (7 fișiere indispensabile) se publică cu README explicit "Reference orchestrators — adapt to your release program; not plug-and-play".

### 2. ❓ "Are rost? (skill-urile sunt agnostice meritabil sau prea împletite cu noi?)"

**DA, are rost — pentru ~78% din colecție**. Trei argumente cuantificabile:

- **Valoare unică externă**: 7 fișiere plug-and-play (`optimize-prompt`, `skill-creator`, `systematic-debugging`, `verification-before-completion`, `terminal-ansi-colors`, `/optimize-prompt`, `/optimize-prompt-new-component`) sunt **methodology-only**, **fără nicio referință la AGE** — sunt deja agnostice și valoroase pentru orice echipă.
- **Stencil-specific dar agnostic la design system**: 12 fișiere (3 skills + 5 agents + 4 commands) acoperă patterns universale Stencil 4.x (form-associated, member-order, jsx/styling, `newSpecPage`, jest-axe, CSF3 stories, pixel-perfect verification, integration-checker exports). Echipele Stencil **nu au** o colecție comparabilă publică — acest pack ar fi probabil cel mai complet open-source pe nișă.
- **Token-first DS workflow**: 5 fișiere (`token-validator`, `accessibility-compliance`, `token-creation`, `/update-tokens`, `/audit-accessibility`) codifică o disciplină rar documentată (3-tier hierarchy, dark-mode parity, contrast token-level). Valoare educațională clară.

**NU are rost** doar pentru Tier 3 (7 fișiere) ca self-contained — dar **are rost ca reference** pentru cititori curioși de cum funcționează un orchestrator avansat. Le publicăm cu disclaimer.

### 3. ❓ "Nu strică calitatea/DX-ul proiectului curent?"

**NU, dacă urmăm strict generator-script-approach (Opțiunea B)**. Argumentare:

- `.claude/` live **NU se atinge niciodată**. Generator-ul citește, transformă, scrie în alt output dir.
- Toate exemplele noastre rămân concrete (`mud-button`, `mud-input`) — DX-ul nostru NU pierde claritate.
- Comenzile/agenții/skill-urile invocate de noi rulează identic ca acum.
- Singurul cost intern recurent = sync-ul ocazional (când îmbunătățim un skill, rulăm generator-ul → push la repo-ul publicat). Estimare: <30 min/sync, 4-6 sync/an.

**Risc rezidual zero pe DX**, dar **există un risc de mentenanță publică**: dacă noi modificăm dramatic skill-ul intern, versiunea publicată poate rămâne în urmă. Mitigare: marcăm clar versiunea publicată ca "Synced from age-design @ commit X" în README-ul pack-ului.

---

## Recomandare finală

**Da, mergeți cu publicarea**. Plan în 4 etape — toate izolate de munca curentă pe age-design:

### Etapa A — Spec & generator (1-2 zile)
- Scrie `template-vars.json` cu toate placeholders identificate (prefix, paths, cmd aliases, port).
- Scrie `scripts/publish-claude-pack.mjs` care:
  - Itrate prin `.claude/agents/`, `.claude/commands/`, `.claude/skills/`
  - Aplică substituții
  - Pentru Tier 2/3, copiază scripturile dependente în `bundled-scripts/` al skill-ului
  - Outputs la `<output-dir>` configurabil prin arg CLI
- Test: rulează → verifică `rg "mud-|/scripts/audit/|yarn lint.tokens" <output-dir>` returnează zero hits.

### Etapa B — Manifest & per-tier README (½ zi)
- Generează README per skill cu: parameters required, scripts bundled, dependencies (other skills), example invocation, limitations.
- Manifest top-level `MANIFEST.md`: lista all skills/agents/commands grouped by tier, cu efort de adopție și caveats.

### Etapa C — Validation pe proiect curat Stencil (½ zi)
- Pornește dintr-un `stencil-component-starter` curat.
- Instalează pack-ul (copy în `.claude/`).
- Rulează 3 scenarii: `/optimize-prompt`, `story-writer my-component`, `accessibility-compliance` audit.
- Acceptance criteria: skill-urile rulează fără să caute fișiere AGE-specific; user-ul terț doar configurează 4-5 vars în `template-vars.json` local.

### Etapa D — Push către repo-ul tău dedicat skill-urilor (1-2 ore)
- Copiezi `<output-dir>` în repo-ul skill-uri.
- Verifici git diff: niciun `mud-` rămas; toate paths sunt placeholders sau params.
- Commit + push. Dacă repo-ul are CI care publică pe skills.sh, urmărești release-ul.

**Total efort one-shot**: ~3 zile (one developer). Ongoing: <30 min/sync.

---

## Files de creat (când execută user-ul)

**În age-design (singurele schimbări locale)**:
- `scripts/publish-claude-pack.mjs` — generator nou
- `scripts/publish-claude-pack/template-vars.json` — vars
- `scripts/publish-claude-pack/transformations.mjs` — regex map mud- → placeholders
- (opțional) yarn alias `yarn pack.publish` în `package.json`

**În repo-ul dedicat skill-urilor (separat)**:
- `.claude/agents/*` — copiat din `<output-dir>`
- `.claude/commands/*` — idem
- `.claude/skills/*/*` — idem, cu `bundled-scripts/` populate
- `MANIFEST.md` — generat
- `README.md` — generat

**NIMIC nu se atinge în `x:\WORK\corlab\age-design\.claude\` live.**

---

## Risk assessment final

| Risc | Sev. | Mitigation |
|------|------|------------|
| Modificăm `.claude/` și stricăm DX | HIGH dacă greșim approach-ul | **Nu modifica `.claude/` direct.** Generator output în alt folder. |
| Drift între pack public și `.claude/` live | LOW (generator-driven) | Generator re-runnable; sync 4-6x/an manual. |
| Scripturi bundle-uite au yarn workspace asumat | MED | Generator înlocuiește yarn cmd → `{{cmd-x}}`; bundled-scripts rulează standalone via `node`. |
| User terț nu poate configura placeholders | MED | `template-vars.json` în pack cu valori default sensibile + README cu 5 minute setup. |
| Tier 3 publicat fără disclaimer → utilizatori frustrați | HIGH | Disclaimer obligatoriu în frontmatter + README per orchestrator. |
| Cost mental pe noi de a menține public | LOW | Sync ocazional, asincron. Nu blocant pentru work-ul curent. |

---

## Verification (când execuție va fi făcută)

1. **DX local intact**: înainte și după ce există generator-ul, rulează `audit-component mud-button` în `.claude/` → același output (zero impact).
2. **Cross-project run**: în repo curat Stencil, instalează pack-ul, configurează `template-vars.json` cu `{prefix: "my", components-root: "src/components"}`, rulează `story-writer my-button` → produce stories funcționale fără referințe AGE.
3. **Scripts bundling**: `node skills/audit-component/bundled-scripts/audit/run-all.mjs` rulează standalone fără `scripts/` din root.
4. **Grep clean**: `rg "mud-|/scripts/audit/|yarn lint.tokens|AGE Design System|Corlab" <output-dir>` returnează zero hits pentru Tier 1-2; Tier 3 are doar referințe explicate în README ca "AGE-specific examples".
5. **Doc check**: README pack-ului are: setup guide (5 min), exemplu per tier, limitations Tier 3, sync policy.

---

## Verdict scurt (TL;DR pentru user)

| Întrebare | Răspuns |
|-----------|---------|
| **E posibil?** | DA — 78% (26/33 fișiere) sunt agnostificabile prin generator script. Restul 22% se publică ca reference. |
| **Are rost?** | DA — 7 fișiere sunt deja universal valoroase; 19 oferă patterns Stencil rare în open source; doar 7 sunt strict workflow-coupled. |
| **Strică DX-ul nostru?** | NU — generator-ul citește, nu modifică `.claude/`. Sync ocazional <30 min. Risc zero pe calitate. |
| **Bundling scripts în skills?** | DA, obligatoriu pentru Tier 2 (`scripts/audit/*.mjs`, `tokens-validate.mjs`, `audit-token-contrast.mjs`, `setup-merge-drivers.mjs`). Cost: ~80KB/skill, acceptabil. |
| **Effort one-shot?** | ~3 zile (generator + validation). Ongoing: <30 min × 4-6 sync/an. |
| **Recomandare?** | **Procedează — în 4 etape (Spec → Validation → Push), izolate de age-design work.** |
