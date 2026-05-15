# Local Skill Overrides Setup

This document explains how to create OS/environment-specific skill overrides.

## Cross-IDE Sync Status (Claude Code ↔ Windsurf)

Skills are mirrored between `.claude/skills/` (primary, Claude Code) and `.windsurf/skills/` (legacy, Windsurf Cascade). All 14 skill folders are present in both locations with identical or near-identical content.

**Rules**:
- `.claude/skills/` is the source of truth for Claude Code.
- `.windsurf/skills/` is preserved for Windsurf users — kept in manual sync.
- When editing a skill, update **both** copies (or use a sync script).
- Deprecated skills (accessibility-compliance, e2e-testing-patterns, pix-stencil-storybook, stencil-atomic-design-system, stenciljs-component-development, storybook-story-writing) intentionally redirect to `AGENTS.md` and its `_agents/` subfiles — do not rewrite their content.

**Verifying sync**:

```bash
# PowerShell
Compare-Object (Get-ChildItem .claude/skills -Recurse -File) (Get-ChildItem .windsurf/skills -Recurse -File) -Property Name, Length

# Unix
diff -r .claude/skills .windsurf/skills
```

Expected drift: zero. If diff appears, decide which side is authoritative and propagate.

---


## Quick Start

```bash
# Create local skills directory
mkdir -p .windsurf/skills.local

# Copy a skill to customize
mkdir -p .windsurf/skills.local/pix-stencil-storybook
cp .windsurf/skills/pix-stencil-storybook/SKILL.md .windsurf/skills.local/pix-stencil-storybook/
```

## Directory Structure

```
.windsurf/
├── skills/                    # Tracked (shared base)
│   ├── carbon-icons/
│   │   └── SKILL.md
│   ├── figma-illustration-import/
│   │   └── SKILL.md
│   ├── pix-stencil-storybook/
│   │   └── SKILL.md
│   ├── stencil-atomic-design-system/
│   │   └── SKILL.md
│   ├── stenciljs-component-development/
│   │   └── SKILL.md
│   └── storybook-story-writing/
│       └── SKILL.md
└── skills.local/              # Gitignored (your overrides)
    └── pix-stencil-storybook/
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
| `design-system-patterns` | Multi-theme architecture, semantic token layer, variant systems | ✅ No | Active |
| `figma-illustration-import` | Import Figma vector illustrations as Stencil components | ✅ No | Active |
| `implement-design` | Figma MCP workflow, asset extraction, validation checklist | ✅ No | Active |
| `pix-stencil-storybook` | Pixel-perfect component workflow (Figma + Playwright) | ⚠️ Yes (MCP prefixes, bash commands) | Active |
| `stencil-atomic-design-system` | Design system architecture (tokens, theming, slots) | ✅ No | Active |
| `stenciljs-component-development` | Stencil component development best practices | ✅ No | Active |
| `storybook-story-writing` | CSF3 story writing patterns | ✅ No | Active |
| `token-creation` | Token creation patterns and naming conventions | ✅ No | Active |
| `systematic-debugging` | Root-cause investigation before any fix. 4-phase discipline. | ✅ No | Active — reference from `/fix-visual-bug` Step 0 |
| `verification-before-completion` | Evidence-based completion gates. No "Done!" without verified output. | ✅ No | Active — reference from `/pre-pr-check`, `/new-component` Step 9 |
| `webapp-testing` | Browser testing patterns, reconnaissance-then-action, Shadow DOM | ✅ No | ⚠️ DO NOT PROCEED — not yet wired into AGENTS.md/workflows |
| `skill-creator` | Guide for creating new skills with consistent structure | ✅ No | ⚠️ DO NOT PROCEED — use when a new skill creation task arises |
| `accessibility-compliance` | WCAG 2.2, ARIA, keyboard, contrast for Stencil Shadow DOM | ⚠️ Yes (Stencil override needed) | ⚠️ DO NOT PROCEED — `/audit-accessibility` workflow already exists; Storybook addon disabled |
| `e2e-testing-patterns` | Visual regression, axe-core, Page Object Model for Playwright | ⚠️ Yes (Stencil override needed) | ⚠️ DO NOT PROCEED — `src/components/AGENTS.md` has Shadow DOM E2E patterns |

## Notes

- The `skills.local/` directory is gitignored
- Each developer maintains their own local overrides
- Base skills in `skills/` receive shared improvements
