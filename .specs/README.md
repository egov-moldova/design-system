# `.specs/` — High-Level Project Specifications

These three documents describe what `@age/design-system` is, how its design tokens are organized, and how components are built. They are the **onboarding-level reference** — concise enough to read end-to-end, deep enough to anchor decisions.

For **actionable, runtime guidance** (file structures, commands, anti-patterns, workflows), see [`AGENTS.md`](../AGENTS.md) and its scoped subfiles.

## Documents

| Document | Scope | Read when |
|---|---|---|
| [PROJECT-SPECIFICATION.md](PROJECT-SPECIFICATION.md) | Architecture, tech stack, workspaces, build orchestration, distribution | Onboarding, architectural decisions, when adding a new tool/workspace |
| [TOKEN-ARCHITECTURE.md](TOKEN-ARCHITECTURE.md) | 3-tier token hierarchy, DTCG format, naming convention, Style Dictionary pipeline | Designing tokens, debugging token build, naming new properties |
| [COMPONENT-DEVELOPMENT-GUIDE.md](COMPONENT-DEVELOPMENT-GUIDE.md) | Component anatomy, slot patterns, member order, pixel-perfect QA loop | Building a new component, refactoring an existing one |

## Relationship to `AGENTS.md`

- `.specs/` answers **"what is this and why"** — high-level intent, design rationale, system-level constraints.
- `AGENTS.md` + `_agents/*.md` answer **"how do I do this right now"** — concrete commands, anti-patterns, decision matrices, workflows.

If they ever conflict, `AGENTS.md` is authoritative — `.specs/` should be updated to align. The single source of truth for runtime behavior is `AGENTS.md`.

## Archive

[`_archive/`](_archive/) holds deprecated specs (e.g., `AI-ORCHESTRATION-GUIDE.md`) kept for historical context only.
