# Local Skill Overrides Setup

This document explains how to create OS/environment-specific skill overrides.

## Quick Start

```bash
# Create local skills directory
mkdir -p .windsurf/skills.local

# Copy a skill to customize
mkdir -p .windsurf/skills.local/carbon-icons
cp .windsurf/skills/carbon-icons/SKILL.md .windsurf/skills.local/carbon-icons/
```

## Directory Structure

```
.windsurf/
├── skills/                    # Tracked (shared base)
│   ├── carbon-icons/
│   │   └── SKILL.md
│   ├── figma-illustration-import/
│   │   └── SKILL.md
│   └── accessibility-compliance/
│       └── SKILL.md
└── skills.local/              # Gitignored (your overrides)
    └── carbon-icons/
        └── SKILL.md           # Overrides main skill
```

## Priority

1. `skills.local/{skill}/SKILL.md` — Used if exists
2. `skills/{skill}/SKILL.md` — Fallback

## Common Customizations

### MCP Tool Prefixes

Update `allowed-tools` in the YAML frontmatter based on your MCP configuration:

```yaml
# Example: Your Playwright is mcp8, Figma is mcp5
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep, skill, figma_get_*, browser_*]
```

### Windows Commands

Replace Unix commands with Windows equivalents:

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
| `carbon-icons` | Icon usage via `cor-icon` element (naming, sizing, slots, CSS) | ✅ No | Active |
| `figma-illustration-import` | Import Figma vector illustrations as Stencil components | ✅ No | Active |
| `token-creation` | Token creation patterns and naming conventions | ✅ No | Active |
| `systematic-debugging` | Root-cause investigation before any fix. 4-phase discipline. | ✅ No | Active — reference from `/fix-visual-bug` Step 0 |
| `verification-before-completion` | Evidence-based completion gates. No "Done!" without verified output. | ✅ No | Active — reference from `/pre-pr-check`, `/new-component` Step 9 |
| `skill-creator` | Guide for creating new skills with consistent structure | ✅ No | ⚠️ DO NOT PROCEED — use when a new skill creation task arises |
| `accessibility-compliance` | WCAG 2.2, ARIA, keyboard, contrast for Stencil Shadow DOM | ⚠️ Yes (Stencil override needed) | Retained as redirect stub — primary guidance lives in `AGENTS.md` and `src/components/AGENTS.md`; the `references/` folder is kept for ad-hoc consultation. |

## Notes

- The `skills.local/` directory is gitignored
- Each developer maintains their own local overrides
- Base skills in `skills/` receive shared improvements
