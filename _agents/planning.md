# Planning — When and How to Write a Plan

## Scope
Governs when a change needs a written plan, where it lives, and what it must contain.
**Read before starting any non-trivial change.**

---

## When a plan is required

Write a plan before touching a change that:

- touches a public contract — props, events, slots, parts, or token names;
- spans more than one component; or
- has more than one viable approach.

Not required for a single-file fix with one obvious approach.

## Location and name

`.claude/plans/YYYY-MM-DD-<slug>.md`, at the repo root. A closed plan (merged or abandoned)
moves to `.claude/plans/_archive/`.

## Required sections

- **Goal** — the outcome, in one or two sentences.
- **Spec/issue link** — what the plan resolves.
- **Options** — a table, when more than one approach exists.
- **Decision** — which option was taken, and why.
- **Global constraints** — anything that bounds every task in the plan (scope, branch, commit
  style, files never touched).
- **Tasks** — checkboxes, each with its own verify command.
- **Not verified** — what the plan deliberately leaves unchecked, stated rather than implied.

## Practice

- Plans are written in English and committed on the branch that carries the change they
  drive, so the plan and the work are reviewed in the same PR.
- A plan describes the artefact, not any particular assistant's workflow: no tool-specific
  invocation steps, no references to a session or a subagent by name. The next reader may be
  a different tool entirely.
- Multi-phase plans record what was decided and what was re-measured before executing — facts
  go stale between planning and execution. See `_agents/continuous-improvement.md` for what a
  repeated fix should feed back into the docs.
