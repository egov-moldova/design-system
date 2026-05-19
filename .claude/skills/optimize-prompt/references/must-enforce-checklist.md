# Must-Enforce Checklist — 15 Rules

Every optimize-prompt output is graded against this checklist. Each rule cites its canonical `_agents/*.md` source so downstream agents can re-resolve the full rule on demand. **Never inline a rule's body here — always cite.**

| # | Rule | Output section | Citation |
|---|---|---|---|
| 1 | CSS Pattern A/B/C declared upfront | Architecture Constraints | [`_agents/reuse-architecture.md`](../../../../_agents/reuse-architecture.md) § "Architecture Decision Tree" |
| 2 | Form-associated checklist complete (4 callbacks + `@AttachInternals` + `setFormValue(v, state)` both args) | Architecture + API | [`src/components/_agents/form-associated.md`](../../../../src/components/_agents/form-associated.md) |
| 3 | State × Element matrix mandatory for interactive archetypes | Behavior + Token Mapping | [`_agents/state-extraction.md`](../../../../_agents/state-extraction.md) |
| 4 | Token references as `{token.path}` (never hex/px) | Implementation Rules + Token Mapping | [`tokens/AGENTS.md`](../../../../tokens/AGENTS.md), [`_agents/pre-implementation.md`](../../../../_agents/pre-implementation.md) |
| 5 | Slot validation constants cited from `shared.constants.ts` | API → Slots | [`src/components/_agents/slot-patterns.md`](../../../../src/components/_agents/slot-patterns.md) |
| 6 | No boolean slot-visibility props (`showIcon: boolean` forbidden) | API → Props validation | [`_agents/anti-patterns.md`](../../../../_agents/anti-patterns.md) #12 |
| 7 | Dual-selector CSS for slot defaults (`::slotted(*)` + direct child) | Implementation Rules | [`_agents/shadow-dom-patterns.md`](../../../../_agents/shadow-dom-patterns.md) |
| 8 | `getHostClasses()` declarative; no imperative `classList` | Implementation Rules | [`_agents/anti-patterns.md`](../../../../_agents/anti-patterns.md) #26 |
| 9 | WCAG 2.1 AA checklist auto-injected | Acceptance Criteria | [`src/components/AGENTS.md`](../../../../src/components/AGENTS.md) § A11y |
| 10 | Story variants explicit (Default, AllVariants, AllSizes, States, AllStatesTable as applicable) | Acceptance Criteria → Stories | [`src/components/_agents/storybook-stories.md`](../../../../src/components/_agents/storybook-stories.md) |
| 11 | TSX member order — 10-item sequence (cited, never inlined) | Implementation Rules | [`src/components/AGENTS.md`](../../../../src/components/AGENTS.md) § "TSX Member Order" |
| 12 | TypeScript strict: `!` decorators, `Record<>`, `?? ''`, `import type` | Implementation Rules | [`_agents/typescript-strict.md`](../../../../_agents/typescript-strict.md) |
| 13 | Event naming `cor<Component><Action>` + exported `EventEmitter<T>` payload type | API → Events | [`canonical-defaults.md`](canonical-defaults.md) § 7 |
| 14 | Reuse check (Step 0) — scan existing components/tokens before emission | Top of output (Reuse candidates block) | [`_agents/reuse-architecture.md`](../../../../_agents/reuse-architecture.md) § "Reuse-First Protocol" |
| 15 | Token JSON path explicit (`tokens/core/components/<name>.tokens.json`) + DTCG format reminder | Implementation Rules | [`.claude/skills/token-creation/SKILL.md`](../../token-creation/SKILL.md) |

---

## How to apply per output

### Always-on (every mode + every archetype)

- #4 Token references format
- #9 WCAG checklist (except `tokens` mode)
- #14 Reuse check
- #12 TypeScript strict (cited inline as one liner)

### Conditional on archetype

| Archetype | Adds rules |
|---|---|
| atom-visual | #3 (only if state-driven), #8 |
| atom-interactive | #1, #3, #5, #6, #7, #8, #10, #11, #13 |
| form-associated | #1, #2, #3, #5, #6, #7, #8, #10, #11, #13 |
| molecule | #1, #5 (if slots), #8, #10 |
| molecule-interactive | #1, #3, #5 (if slots), #6, #8, #10, #13 |
| organism | #1, #3, #5, #6, #7, #8, #10, #11, #13 |
| layout | #1 (minimal), #11 |

### Conditional on mode

| Mode | Skips rules |
|---|---|
| `new` | none — all applicable rules emit |
| `redesign` | none — emit Migration block for any forbidden→canonical rename triggered by #5, #6 |
| `modify` | omit rules for unchanged sections; keep #4, #14 |
| `fix` | only emit rules for the layer being changed (token / CSS / TSX) |
| `tokens` | only #4, #15 |

---

## Citation format

Every must-enforce rule emitted MUST end with a one-line citation in this format:

```
(see _agents/<file>.md § <section>)
```

Or for project AGENTS files:

```
(see src/components/AGENTS.md § <section>)
```

Or for sibling skills:

```
(see .claude/skills/<skill>/SKILL.md § <section>)
```

This is non-negotiable: it's how downstream consumers re-resolve the full rule without us duplicating it here.

---

## Failure handling

If a rule cannot be applied (e.g., user explicitly opted out via `--no-a11y-block`):
- Emit a `## Suppressed Rules` block at top of output listing rule # + reason
- Continue emission — never block on opt-outs

If a rule's citation file is missing (rare — would indicate stale skill):
- Emit `## Validation Issues` warning with the broken citation
- Continue emission with rule body inlined as fallback

---

## Maintenance

When a new must-enforce rule emerges in `_agents/*.md`:
1. Add the rule + citation to this table
2. Update the archetype × rule matrix above
3. Update [`SKILL.md`](../SKILL.md) Step 2 detector list if it has a contradiction shape
4. Increment the count in the file header (currently "15 Rules")

Never expand past ~20 rules. Beyond that, the cost of forcing every rule per emission outweighs the benefit — audit-component skill catches the long-tail at execution time.
