# Migrare Windsurf → Claude Code + Aliniere Documentatie

## Context

**Problema**: Repo-ul `age-design` (design system Stencil + Style Dictionary v4 DTCG) are documentatie si automatizari distribuite intre `.specs/` (high-level specs), `AGENTS.md` ecosystem (active runtime guidance), si `.windsurf/` (workflows + skills + rules pentru Cascade IDE). Trei probleme identificate:

1. **`.specs/` drift**: Cele 3 fisiere active contin referinte invechite (legacy `"value"/"type"` JSON in loc de DTCG `$value/$type`, lipsuri Wireit/workspaces/MCP, naming convention inconsistency), iar `AI-ORCHESTRATION-GUIDE.md` e DEPRECATED dar inca prezent ca fisier complet (1448 linii).
2. **Workflows nemigrate**: 13 workflows Windsurf (`/audit-component`, `/new-component`, etc.) nu au echivalent in Claude Code. `.claude/commands/` si `.claude/agents/` nu exista. Utilizatorul vrea sa invoce aceleasi procese din Claude Code cu acelasi comportament.
3. **Skills verificate**: Au fost 14 skills in ambele `.windsurf/skills/` si `.claude/skills/` — comparatia arata ca sunt **deja identice** (zero de portat), dar trebuie documentat statusul si tratata o singura imbunatatire minora (`carbon-icons`).

**Scop**: Aliniere completa intre `.specs/` si starea reala a codului, migrare workflows in `.claude/commands/` + `.claude/agents/` (hibrid), si marcaj `.windsurf/` ca legacy cross-IDE reference.

**Decizii confirmate cu utilizatorul**:
- Workflows: format hibrid (9 slash commands simple + 5 subagents complexe)
- `.specs/`: rewrite complet aliniat la `AGENTS.md` actual
- `.windsurf/`: pastrat dar marcat read-only/legacy
- MCP: cross-tool `.mcp.json` la root repo (Claude Code standard)
- Image-compare: project-level + pastrat in user-level
- Snyk: CLI prin Bash (fara MCP)
- Scope: un singur plan cu toate 3 puncte + setup MCP, executie secventiala

---

## Phase 0 — MCP Setup (PREREQUISITE)

Fara MCP-urile corect configurate, workflows migrati nu functioneaza. Phase 0 trebuie completat **inainte** de Phase 3 (workflows migration).

### 0.1 Creare `.mcp.json` la root

Path: `x:\WORK\corlab\age-design\.mcp.json` (cross-tool standard, functioneaza in VS Code + Claude Code CLI + alte IDE-uri).

```json
{
  "mcpServers": {
    "agentation": {
      "command": "npx",
      "args": ["-y", "agentation-mcp", "server"]
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp"
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "image-compare": {
      "command": "npx",
      "args": ["-y", "mcp-image-compare-server"]
    }
  }
}
```

**Mapping logical alias din workflows Windsurf → tool names Claude Code**:
| Windsurf alias | Claude Code tool prefix |
|---|---|
| `browser_*` | `mcp__playwright__browser_*` |
| `figma_*` | `mcp__figma__*` |
| `ctx7_*` | `mcp__context7__*` |
| `compare_*` | `mcp__image-compare__*` |
| `agent_*` | `mcp__agentation__*` |

### 0.2 Cleanup `.vscode/mcp.json`

Verifica daca `.vscode/mcp.json` are servere care nu sunt in `.mcp.json` root. Daca nu — sterge fisierul (root preia totul). Daca da — pastreaza doar serverele VS Code-specific.

Status curent: `.vscode/mcp.json` are doar `agentation` → e duplicat in `.mcp.json` root. **Action**: sterge `.vscode/mcp.json` dupa ce confirmi ca `.mcp.json` root e activ.

### 0.3 Cleanup plugins Claude Code (~/.claude/settings.json)

Pentru a evita dublarea MCP serverelor (plugin + root config), dezactiveaza plugin-urile care duplica configurarea din `.mcp.json`:

| Plugin | Status curent | Status dupa | Motiv |
|---|---|---|---|
| `figma@claude-plugins-official` | `false` | `false` (no change) | Era deja off; `.mcp.json` rezolva |
| `playwright@claude-plugins-official` | `true` | `false` | Duplicat cu `.mcp.json` root |
| `context7@claude-plugins-official` | `true` | `false` | Duplicat cu `.mcp.json` root |
| `semgrep@claude-plugins-official` | `false` | `false` (no change) | Snyk via Bash, nu MCP |
| `serena@claude-plugins-official` | `false` | `false` (no change) | Nu e necesar |
| `pr-review-toolkit@claude-plugins-official` | `true` | `true` (no change) | Nu e MCP, e plugin pentru subagents |
| `superpowers@claude-plugins-official` | `true` | `true` (no change) | Nu e MCP, e plugin pentru skills |

**Action**: edit `~/.claude/settings.json` → schimba `playwright` si `context7` la `false` in `enabledPlugins`.

### 0.4 Image-compare in user-level mcp.json — keep as-is

User-level `c:\Users\Dan\AppData\Roaming\Code\User\mcp.json` are deja `image-compare` configurat. Decizie utilizator: **pastreaza** acolo + adauga si in proiect. Posibil conflict daca rulate simultan — VS Code rezolva prin priority (project-level wins). Acceptabil.

### 0.5 Verify agent-browser CLI

```bash
npm list -g agent-browser
agent-browser --version
```

Daca lipseste global: `npm install -g agent-browser`. (User confirma ca e deja instalat global + in devDependencies.)

### 0.6 Update `_agents/mcp-tools.md` — Translation Section

Fisierul actual documenteaza prefix-ele Windsurf (`mcp10_`, `mcp7_`, etc.). Adauga sectiune noua "Claude Code Tool Names" cu translation table de la 0.1. Pastreaza sectiunea Windsurf pentru cross-IDE reference.

### Phase 0 Verification

- [ ] `.mcp.json` exista la root cu cele 5 servere
- [ ] `.vscode/mcp.json` sters (sau golit) daca era doar agentation
- [ ] Restart Claude Code / VS Code → tools `mcp__playwright__*`, `mcp__figma__*`, `mcp__context7__*`, `mcp__image-compare__*`, `mcp__agentation__*` apar in deferred tools list
- [ ] Test minim: `mcp__playwright__browser_navigate({ url: "http://localhost:6007" })` returneaza succes
- [ ] Test minim: `mcp__figma__*` autentifica (probabil OAuth flow la prima utilizare)
- [ ] `~/.claude/settings.json` are `playwright: false`, `context7: false`
- [ ] `_agents/mcp-tools.md` are sectiune noua "Claude Code Tool Names"

---

## Phase 1 — `.specs/` Rewrite Complet

Rescrie cele 3 fisiere active sa reflecte 1:1 starea actuala a repo-ului si convenitiile din `AGENTS.md` ecosystem. Arhiveaza `AI-ORCHESTRATION-GUIDE.md`.

### 1.1 `.specs/PROJECT-SPECIFICATION.md` — Rewrite

**Surse de adevar pentru rewrite**:
- `AGENTS.md` (root) — tech stack actual, MCP prefixes, Wireit
- `package.json` — versiuni exacte, workspaces (`web-components`, `angular-design-system`, `react-design-system`, `vue-design-system`)
- `_agents/environment-commands.md` — comenzi Wireit
- `.storybook/main.ts` + scripts — port 6007

**Sectiuni de adaugat / corectat**:
- **Tech stack actualizat**: Stencil 4.x, TypeScript 5.x, Style Dictionary 4.4+ DTCG, Storybook 8.x (port **6007**), Wireit 0.11+, Vitest, Playwright MCP (`mcp8_`), Figma Remote MCP (`mcp5_`), Snyk (`mcp11_`), Memory (`mcp9_`)
- **Workspace structure**: monorepo Yarn 4.x cu 5 workspaces (`web-components`, plus 3 framework wrappers), nu doar "React + future Angular/Vue" cum spune varianta actuala
- **Wireit orchestration**: sectiune noua despre dependency graph + caching, cu link la `_agents/environment-commands.md`
- **MCP integration**: lista MCP-uri folosite si scop
- **Form-associated components**: mention ElementInternals API + link la `src/components/_agents/form-associated.md`
- **Distribution & framework wrappers**: clarifica ca `web-components` e pachetul principal, frameworks consuma din el

### 1.2 `.specs/TOKEN-ARCHITECTURE.md` — Rewrite

**Surse de adevar**:
- `tokens/AGENTS.md` — 4-part Figma Foundations naming, DTCG format
- `tokens/MIGRATION.md` — convention curenta `--{component}-{element}-{property}-{scale/state}`
- `tokens/core/components/button.tokens.json` — exemplu real DTCG
- `style-dictionary.config.mjs` — pipeline real

**Corecturi critice**:
- **DTCG peste tot**: inlocuieste TOATE exemplele `"value"/"type"` cu `"$value"/"$type"` (linii 48-59, 117-164, 181-188 in actuala versiune)
- **Reconciliere naming**: documenteaza CLAR ca standard-ul curent e cel din `MIGRATION.md` (5-part cu element), nu cel din `.specs/` actual (4-part)
- **14 categorii token**: pastreaza lista, dar sincronizeaza cu `tokens/core/` real (verifica daca exista toate sau lipsesc)
- **Tokenhaus sync**: sectiune noua despre `scripts/sync-tokens-from-tokenhaus.mjs` + workflow staging vs apply
- **Build pipeline**: comenzi Wireit (`yarn tokens.build`, `yarn tokens.build.prod`, `yarn tokens.build.age`, `yarn tokens.watch`, `yarn tokens.audit`)

### 1.3 `.specs/COMPONENT-DEVELOPMENT-GUIDE.md` — Rewrite

**Surse de adevar**:
- `src/components/AGENTS.md` + toate `src/components/_agents/*.md` (form-associated, slot-patterns, component-structure, css-architecture, storybook-stories, composition-interactive, e2e-testing)
- `src/components/cor-button/` — exemplu canonic
- `_agents/anti-patterns.md`, `_agents/pixel-perfect-qa.md`

**Restructurare**:
- **12 pasi development**: pastreaza dar sincronizeaza cu ordinea corecta token-first din workflows
- **Member order TSX**: documenteaza ordinea exacta din `src/components/AGENTS.md` (decorators, props, state, internal vars, lifecycle, methods, render)
- **Slot patterns**: link explicit catre `_agents/slot-patterns.md` + exemplu `invalidSlottedTag` din `cor-button.tsx`
- **Pixel-perfect QA loop**: sectiune noua despre browser screenshot + comparatie Figma (workflow real)
- **Testing**: include unit (Vitest), E2E (Playwright via MCP), visual regression — cu link la `e2e-testing.md`

### 1.4 Arhivare `AI-ORCHESTRATION-GUIDE.md`

- Creeaza folder `.specs/_archive/`
- Muta `AI-ORCHESTRATION-GUIDE.md` acolo
- Adauga `.specs/_archive/README.md` cu o linie: "Historical docs preserved for context. Source of truth lives in root `AGENTS.md` and `.specs/` active files."

**Fisiere finale `.specs/`**:
```
.specs/
├── PROJECT-SPECIFICATION.md       (rewritten)
├── TOKEN-ARCHITECTURE.md          (rewritten)
├── COMPONENT-DEVELOPMENT-GUIDE.md (rewritten)
├── README.md                       (NEW - index 1-pager + how-to-use)
└── _archive/
    ├── README.md
    └── AI-ORCHESTRATION-GUIDE.md
```

---

## Phase 2 — Skills Status Documentation

**Constatare**: `.claude/skills/` are COMPLET inventarul din `.windsurf/skills/`. Continut active skills e identic 100%. Deprecated stubs (accessibility-compliance, e2e-testing-patterns, pix-stencil-storybook, stencil-atomic-design-system, stenciljs-component-development, storybook-story-writing) redirecteaza corect la `AGENTS.md`.

**Actiuni minore**:

### 2.1 Carbon-icons Sync Cross-IDE
Claude versiunea are guidance superior (explicit 4-part scheme `--color-icon-{role}-{variant}`). Replicheaza acelasi continut in `.windsurf/skills/carbon-icons/SKILL.md` ca sa fie consistent cross-IDE.

### 2.2 Documenteaza Sync Status
Adauga sectiune scurta in `.claude/skills/LOCAL-SETUP.md` (sau creeaza `SYNC-STATUS.md`) care explica:
- Skills sunt sincronizate intre `.claude/skills/` si `.windsurf/skills/`
- Daca editi unul, sincronizeaza in celalalt (sau folder cross-link daca filesystem suporta)
- Deprecated stubs redirecteaza intentionat la `AGENTS.md` — nu rescrie

---

## Phase 3 — Workflows Migration (Hibrid)

Creeaza `.claude/commands/` si `.claude/agents/`. Pentru fiecare workflow Windsurf, creeaza echivalentul Claude Code conform mapping-ului analizat.

### 3.1 Setup Structura

```
.claude/
├── commands/      (NEW - slash commands)
│   ├── README.md  (index + invocation patterns)
│   └── *.md       (9 fisiere)
└── agents/        (NEW - subagents)
    ├── README.md  (index + when-to-use)
    └── *.md       (5 fisiere)
```

### 3.2 Slash Commands — `.claude/commands/` (9 fisiere)

Pentru workflows linear, single-pass, fara checkpoint state complex. Suporta `$ARGUMENTS` placeholder pentru input gen `@cor-button`.

**Format Claude Code slash command**:
```markdown
---
description: <short help text shown in /help>
argument-hint: "@cor-<component-name>"
allowed-tools: [Read, Glob, Grep, Bash, ...]
---

<system prompt content - converted from Windsurf workflow steps>

Component: $ARGUMENTS
```

**Migrari**:

| Slash command | Sursa Windsurf | Argumente |
|---|---|---|
| `/audit-component` | `audit-component.md` | `@cor-{name}` |
| `/audit-accessibility` | `audit-accessibility.md` | `@cor-{name}` |
| `/pre-pr-check` | `pre-pr-check.md` | (niciunul) |
| `/update-tokens` | `update-tokens.md` | component name + scope |
| `/fix-visual-bug` | `fix-visual-bug.md` | `@cor-{name}` + descriere + optional Figma link |
| `/migrate-component` | `migrate-component.md` | `@cor-{name}` din `src/hidden/` |
| `/modify-component` | `modify-component.md` | `@cor-{name}` + descriere change + optional Figma link |
| `/optimize-prompt` | `optimize-prompt.md` | raw prompt |
| `/optimize-prompt-new-component` | `optimize-prompt-new-component.md` | raw prompt |

**Conversii necesare la portare**:
- `// turbo` directives din Windsurf → mentiune in description "auto-approvable steps marked safe in tooling"
- `browser_*` calls → ramane la fel (Playwright MCP e disponibil in Claude Code)
- `figma_get_*` calls → ramane la fel (Figma MCP disponibil)
- `compare_images` → fallback la `mcp8_browser_take_screenshot` + verificare manuala (Claude Code nu are image diff MCP nativ); documenta limitarea in slash command
- `Context7 MCP` (Stencil docs runtime) → inlocuieste cu link catre `_agents/stencil-patterns.md` (sau echivalent) sau `WebFetch` la docs.stencil-community.io
- Skill invocations (`systematic-debugging`, `token-creation`) → ramane sintaxa Skill tool

### 3.3 Subagents — `.claude/agents/` (5 fisiere)

Pentru workflows complexe, multi-phase, cu checkpoint state, context window separat util. Invocate via Task tool.

**Format Claude Code subagent**:
```markdown
---
name: <kebab-case-name>
description: <when to use this agent - triggers Task tool invocation>
tools: [Read, Edit, Write, Glob, Grep, Bash, mcp__playwright__*, mcp__figma__*, ...]
model: opus  # or sonnet/haiku based on task complexity
---

<full system prompt - converted from Windsurf workflow with phase tracking>
```

**Migrari**:

| Subagent | Sursa Windsurf | Model recomandat | Justificare |
|---|---|---|---|
| `new-component` | `new-component.md` | opus | Pipeline Figma→tokens→code→stories→QA, multi-phase cu checkpoint inventory |
| `custom-component` | `custom-component.md` | sonnet | Similar dar fara Figma, Q&A first |
| `audit-production` | `audit-production.md` | opus | 9 faze comprehensive, fiecare cu checks multiple |
| `refactor-component` | `refactor-component.md` | opus | Audit + baseline screenshots + phase apply + regression loop |
| `optimize-prompt-new-component` | sau combinat cu `optimize-prompt.md` | sonnet | Reasoning multi-step pentru clarificare requirements |

**Cheie pentru subagents**:
- Sectiune "Checkpoints" cu human-approval gates explicite (subagent intoarce control catre main agent care intreaba user)
- Sectiune "State Tracking" pentru audit-production (ce faze sunt complete)
- Pentru `new-component` si `refactor-component` cu pixel-perfect QA loop: documenta limitarea image-diff si folosesc screenshot + manual visual inspection

### 3.4 Index & Documentation

**`.claude/commands/README.md`**: copie adaptata din `.windsurf/workflows/README.md` (tabel quick-reference + decision guide), eliminand sectiunea "LLM Model Reference" (Claude Code foloseste un singur model per session).

**`.claude/agents/README.md`**: lista cele 5 subagents cu when-to-use + cum sunt invocate (Task tool din main agent sau auto-trigger pe baza de description).

**`AGENTS.md` (root) update**: adauga sectiune scurta "Automation" care indica `.claude/commands/` si `.claude/agents/` ca puncte de intrare, cu link la cele 2 README-uri.

---

## Phase 4 — `.windsurf/` Legacy Marker

### 4.1 Top-level Notice
Creeaza `.windsurf/README.md`:
```markdown
# Windsurf Configuration — LEGACY / Cross-IDE Reference

> Source of truth for AI automation in this repo is now `.claude/` (commands, agents, skills).
> This folder is preserved for users still working in Windsurf Cascade.
> **Do not edit unless you intentionally maintain Windsurf parity.**

See `.claude/commands/`, `.claude/agents/`, `.claude/skills/`.

## Sync Status
- `.windsurf/skills/` ↔ `.claude/skills/` — synchronized (manual; edit both)
- `.windsurf/workflows/` → migrated to `.claude/commands/` + `.claude/agents/`
- `.windsurf/rules/ansicolor.md` → covered by `.claude/skills/terminal-ansi-colors/`
- `.windsurf/templates/state-extraction-checklist.md` → embedded in `new-component` subagent
- `.windsurf/plans/` — historical plans, frozen
```

### 4.2 Per-workflow Header
Adauga header in fiecare `.windsurf/workflows/*.md`:
```markdown
> **MIGRATED**: This workflow has been ported to `.claude/commands/<name>.md` (or `.claude/agents/<name>.md`).
> Edits should be made there. Kept here for Windsurf users.
```

---

## Phase 5 — Execution Order & Branching Strategy

**Recomandare branch**: `chore/migrate-windsurf-to-claude` (un singur PR mare) sau 3 branch-uri separate per phase.

**Ordine recomandata**:
1. **Phase 2 first** (skills doc) — quick, no risk
2. **Phase 3** (workflows migration) — biggest value, isolated changes (new files)
3. **Phase 4** (windsurf legacy markers) — depends on Phase 3 completion
4. **Phase 1** (.specs rewrite) — most editing, do last after we've confirmed AGENTS.md is truly source of truth via working migrations

**Rationale**: Punctul 1 implica rewrite documentatie inalt-nivel; e mai sigur dupa ce Phase 3 a confirmat ca AGENTS.md acopera tot.

---

## Critical Files

### Files to be Modified (Phase 1)
- `.specs/PROJECT-SPECIFICATION.md` — rewrite complet
- `.specs/TOKEN-ARCHITECTURE.md` — rewrite complet (fix DTCG + naming reconciliation)
- `.specs/COMPONENT-DEVELOPMENT-GUIDE.md` — rewrite complet
- `.specs/AI-ORCHESTRATION-GUIDE.md` — MOVE to `.specs/_archive/AI-ORCHESTRATION-GUIDE.md`

### Files to be Created (Phase 1)
- `.specs/README.md` — index 1-pager
- `.specs/_archive/README.md` — archive notice

### Files to be Created (Phase 3 — Commands)
- `.claude/commands/README.md`
- `.claude/commands/audit-component.md`
- `.claude/commands/audit-accessibility.md`
- `.claude/commands/pre-pr-check.md`
- `.claude/commands/update-tokens.md`
- `.claude/commands/fix-visual-bug.md`
- `.claude/commands/migrate-component.md`
- `.claude/commands/modify-component.md`
- `.claude/commands/optimize-prompt.md`
- `.claude/commands/optimize-prompt-new-component.md`

### Files to be Created (Phase 3 — Agents)
- `.claude/agents/README.md`
- `.claude/agents/new-component.md`
- `.claude/agents/custom-component.md`
- `.claude/agents/audit-production.md`
- `.claude/agents/refactor-component.md`
- `.claude/agents/optimize-prompt-new-component.md` (decizie: subagent doar pentru varianta noua, slash pentru cea generica — sau invers, alegere finala la implementare)

### Files to be Modified (Phase 2)
- `.windsurf/skills/carbon-icons/SKILL.md` — sync cu Claude version
- `.claude/skills/LOCAL-SETUP.md` — adauga sectiune SYNC-STATUS

### Files to be Created/Modified (Phase 4)
- `.windsurf/README.md` (NEW) — legacy notice
- `.windsurf/workflows/*.md` (13 fisiere) — header "MIGRATED" prepended

### Files to be Modified (Phase 3 docs)
- `AGENTS.md` (root) — adauga sectiune "Automation" cu link la `.claude/commands/` si `.claude/agents/`

---

## Existing Functions & Patterns to Reuse

### From `_agents/` (root)
- `_agents/environment-commands.md` — Wireit usage patterns pentru `pre-pr-check`, `update-tokens`
- `_agents/mcp-tools.md` — MCP prefix conventions (`mcp8_`, `mcp5_`, etc.)
- `_agents/figma-extraction.md` — pattern Figma node extraction pentru `new-component`, `modify-component`
- `_agents/pixel-perfect-qa.md` — screenshot loop pattern pentru `new-component`, `refactor-component`
- `_agents/anti-patterns.md` — referinte pentru audit-component, audit-production
- `_agents/workflow-rules.md` — Figma-first rule + exceptii

### From `src/components/_agents/`
- `component-structure.md`, `slot-patterns.md`, `css-architecture.md`, `storybook-stories.md`, `composition-interactive.md`, `e2e-testing.md`, `form-associated.md` — refera in slash commands relevante (audit-component, modify-component, etc.) in loc de a duplica continutul

### Existing skills (reusable in commands/agents)
- `systematic-debugging` — invocat in `/fix-visual-bug`
- `token-creation` — invocat in `/update-tokens`, `new-component` subagent
- `carbon-icons` — invocat in `new-component` subagent
- `verification-before-completion` — invocat in `/pre-pr-check`, toate workflow-uri finale
- `figma-illustration-import` — fallback in `new-component` subagent cand componenta e illustration

### Scripts
- `scripts/sync-tokens-from-tokenhaus.mjs` — referit in `.specs/TOKEN-ARCHITECTURE.md` rewrite + `update-tokens` slash command

---

## Verification

### Phase 1 — `.specs/` rewrite verification
- [ ] `grep -r '"value"' .specs/` returns zero results (DTCG enforced)
- [ ] `grep -r 'AI-ORCHESTRATION' .specs/` returns only `.specs/_archive/`
- [ ] Cross-check fiecare claim din PROJECT-SPECIFICATION.md cu codul real (versiuni `package.json`, comenzi `yarn`, port `6007`)
- [ ] Open `.specs/README.md` in editor → trebuie sa fie scanabil sub 1 minut

### Phase 2 — Skills sync
- [ ] `diff -r .windsurf/skills/ .claude/skills/` → diferentele asteptate doar in `carbon-icons` (Claude e superior, dupa sync cross-IDE diferenta dispare)
- [ ] `.claude/skills/LOCAL-SETUP.md` mentioneaza sync workflow

### Phase 3 — Workflows migration end-to-end
Pentru fiecare slash command nou:
- [ ] Invoca in Claude Code via `/<name> @cor-button` (sau argument relevant)
- [ ] Verifica ca pasii descrisi se executa
- [ ] Verifica ca tool calls (figma_*, browser_*) functioneaza prin MCP

Pentru fiecare subagent:
- [ ] Test invocation via Task tool cu `subagent_type: <name>`
- [ ] Verifica ca checkpoints se intorc corect la main agent
- [ ] Pentru `new-component`: rulare end-to-end pe o componenta simpla (de ex. `cor-divider` daca nu exista) cu Figma link
- [ ] Pentru `audit-production`: rulare pe `cor-button` (componenta matura) — toate 9 faze ar trebui sa returneze raport structurat

### Phase 4 — Windsurf legacy marker
- [ ] `.windsurf/README.md` exista cu mesaj clar de redirectionare
- [ ] Toate 13 `.windsurf/workflows/*.md` au header MIGRATED
- [ ] Test in Windsurf: workflows inca functioneaza (read-only preservation)

### Final integration test
- [ ] Rulare `/pre-pr-check` din Claude Code pe branch curent — pass
- [ ] Rulare `/audit-component @cor-button` — output structurat 12-categorii
- [ ] Update minor in `.specs/TOKEN-ARCHITECTURE.md` → confirma ca developer care urmeaza specs creeaza token JSON valid DTCG
- [ ] Sectiunea "Automation" din root `AGENTS.md` linkurile sunt valide

---

## Trade-offs Notabile

1. **Pixel-perfect QA loss**: Claude Code nu are `compare_images` MCP nativ. Subagents `new-component` si `refactor-component` vor depinde de screenshot + visual inspection manuala. Limitare documentata in subagent description.

2. **Context7 (Stencil docs runtime) loss**: Workflows care queryeau docs Stencil la runtime vor folosi `_agents/stencil-patterns.md` static sau WebFetch ca fallback. Posibil drift daca Stencil API se schimba.

3. **`.specs/` rewrite vs incremental fix**: Rewrite complet e mai mult de munca dar elimina toate inconsistentele intr-un pas. Alternativa (fix incremental) ar fi lasat fisierele cu zone "fresh" si "stale" amestecate.

4. **`.windsurf/` divergence over time**: Cross-IDE setup inseamna doua surse care pot diverge. Documentat ca "manual sync" — risc acceptat de utilizator pentru flexibilitate cross-IDE.

5. **Subagent vs slash command pentru `optimize-prompt-*`**: Ambele variante sunt reasoning-heavy. Implementare initiala: slash command pentru ambele (mai simplu, output rapid). Daca se dovedeste insuficient → promoteaza la subagent.
