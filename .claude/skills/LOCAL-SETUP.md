# Local Skill Overrides Setup

This document explains how to create OS/environment-specific skill overrides for Claude Code.

## Quick Start

```bash
# Create local skills directory (gitignored)
mkdir -p .claude/skills.local

# Copy a skill to customize
mkdir -p .claude/skills.local/token-creation
cp .claude/skills/token-creation/SKILL.md .claude/skills.local/token-creation/
```

## Directory Structure

```
.claude/
├── skills/                    # Tracked (shared base)
│   ├── token-creation/
│   │   └── SKILL.md
│   ├── figma-illustration-import/
│   │   └── SKILL.md
│   └── accessibility-compliance/
│       └── SKILL.md
└── skills.local/              # Gitignored (your overrides)
    └── token-creation/
        └── SKILL.md           # Overrides main skill
```

## Priority

1. `skills.local/{skill}/SKILL.md` — Used if exists
2. `skills/{skill}/SKILL.md` — Fallback

## Common Customizations

### Windows Commands

Replace Unix commands with Windows equivalents when overriding a skill:

| Unix | Windows (PowerShell) |
|------|---------------------|
| `ls -la` | `Get-ChildItem -Force` |
| `cat file` | `Get-Content file` |
| `lsof -i :6006` | `netstat -ano \| findstr :6006` |
| `command &` | Start in separate terminal |

### Cross-Platform Node.js Alternatives

```bash
# Check file exists (cross-platform)
node -e "console.log(require('fs').existsSync('.storybook'))"

# Check port in use (cross-platform)
npx wait-on http://localhost:6006 --timeout 3000
```

## Available Skills

| Skill | Description | Needs Local Override? | Status |
|-------|-------------|----------------------|--------|
| `figma-illustration-import` | Import Figma vector illustrations as Stencil components | No | Active |
| `token-creation` | Token creation patterns and naming conventions | No | Active |
| `systematic-debugging` | Root-cause investigation before any fix. 4-phase discipline. | No | Active — reference from `/fix-visual-bug` Step 0 |
| `verification-before-completion` | Evidence-based completion gates. No "Done!" without verified output. | No | Active — reference from `/pre-pr-check`, `/new-component` Step 9 |
| `skill-creator` | Guide for creating new skills with consistent structure | No | DO NOT PROCEED — use when a new skill creation task arises |
| `accessibility-compliance` | WCAG 2.1 AA criteria, ARIA, keyboard, contrast (light + dark), focus management for Stencil Shadow DOM | Yes (Stencil override may be needed) | Active — required reference for all `cor-*` components. Includes SKILL.md + `references/` (aria-patterns, mobile-accessibility, wcag-guidelines). Used alongside `AGENTS.md` and `src/components/AGENTS.md`. |
| `stencil-compliance` | Stencil 4.x best practices — decorators, lifecycle, host, JSX/styling, form-associated, reactive data, serialization. 6 reference files + top-25 anti-patterns. | No | Active — invoked by `/audit-component @cor-<name> --deep`, `audit-production` Phase 1, and Wave 1 grep gates in `/pre-pr-check`. |
| `audit-component` | 3-wave production audit per component. Flags: `--deep` (full Stencil + a11y), `--e2e`, `--fast`. | No | Active — wraps the `/audit-component` slash command logic for reuse from other agents (new-component, refactor-component, migrate-component). |

## Notes

- The `skills.local/` directory is gitignored
- Each developer maintains their own local overrides
- Base skills in `skills/` receive shared improvements
