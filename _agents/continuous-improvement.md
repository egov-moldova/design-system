# Continuous Improvement — Workflow Refinement

## Scope

Feedback loop to improve AGENTS.md accuracy and prevent recurring issues. **Read when
encountering repeated issues or proposing documentation changes.**

---

## The rule

When the same component needs a **third fix on the same behavior**, that is not another bug —
it is a missing rule. Two things happen in the same PR:

1. **Add a regression test for the contract**, not just a fix for the symptom — as done for
   issue #10 (form-associated `name` reflection, PR #15) and issue #17 (accordion-item
   `disabled` reflection, PR #24).
2. **Record the missing rule** in the relevant `_agents/*.md` file, so the next agent reads it
   before making the same mistake a fourth time.

## Where the rule goes

| Category | Target File |
|---|---|
| Token/CSS validation | `_agents/pre-implementation.md` |
| State extraction | `_agents/state-extraction.md` |
| Shadow DOM pattern | `_agents/shadow-dom-patterns.md` |
| Figma extraction | `_agents/figma-extraction.md` |
| Environment/build | `_agents/environment-commands.md` |
| Component structure or Stencil mistake | `src/components/_agents/component-structure.md` |
| Token naming or hierarchy | `tokens/_agents/naming-conventions.md` |

If none fits, the new rule earns its own file and an index row in the nearest `AGENTS.md`.
