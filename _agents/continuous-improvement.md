# Continuous Improvement — Workflow Refinement

## Scope

Feedback loop to improve AGENTS.md accuracy and prevent recurring issues. **Read when encountering repeated issues or proposing documentation changes.**

---

## When to Trigger Improvement Analysis

1. **Multiple fix iterations** (3+ rounds) for the same visual property
2. **Recurring pattern of mistakes** across different components
3. **Missing validation step** that would have caught an issue earlier
4. **Ambiguous or incomplete guidance** that led to incorrect implementation
5. **New pattern or technique** discovered during implementation
6. **User correction** that reveals a gap in the workflow

---

## Improvement Analysis Process

### Step 1: Document the Issue

```markdown
## Workflow Gap Analysis — [Date]

**Component**: `mud-[name]`
**Issue Type**: [Visual Bug | Process Gap | Missing Validation | Pattern Discovery]

### What Went Wrong
- [Issue description]
- [Number of fix iterations]
- [Root cause]

### Why It Happened
- [Which section was followed]
- [What guidance was missing]

### What Would Have Prevented It
- [Specific check or validation]
- [New section or enhancement needed]

### Proposed Enhancement
- **File**: `_agents/[file].md`
- **Change Type**: [New Section | Enhancement | Checklist Addition | Example]
- **Content**: [Exact text to add]
```

### Step 2: Categorize

| Category | Example | Target File |
|---|---|---|
| Token/CSS Validation | CSS variable naming mismatch | `_agents/pre-implementation.md` |
| State Extraction | Missing selected state properties | `_agents/state-extraction.md` |
| Shadow DOM Pattern | Slot styling not working | `_agents/shadow-dom-patterns.md` |
| Figma Extraction | Incomplete property extraction | `_agents/figma-extraction.md` |
| Pre-Build Validation | Token not built before testing | `_agents/environment-commands.md` |
| Typography | Font-weight changes in states | `_agents/state-extraction.md` |

### Step 3: Present to User

```markdown
## Task Complete + Workflow Improvement

### Implementation Summary
[Per-component summary]

### 🔄 Improvement Identified
**Issue**: [Brief description]
**Impact**: [How many fix iterations]
**Recommended Enhancement**: [Specific file + content]
**Would you like me to implement this?**
```

---

## Common Improvement Patterns

### Pattern 1: Pre-Build Validation Gaps

**Symptom**: Visual bugs discovered only after screenshots
**Solution**: Add validation step before visual QA
**Target**: `_agents/pixel-perfect-qa.md` Step 1.5

### Pattern 2: Incomplete State Extraction

**Symptom**: Multiple rounds adding missing states
**Solution**: Comprehensive upfront state matrix
**Target**: `_agents/state-extraction.md`

### Pattern 3: Shadow DOM Styling Gaps

**Symptom**: Styles work for slotted but not default elements
**Solution**: Dual selector pattern
**Target**: `_agents/shadow-dom-patterns.md`

### Pattern 4: Token Naming Mismatches

**Symptom**: CSS variables resolve to `rgba(0, 0, 0, 0)`
**Root Cause**: `"components"` wrapper in token JSON or camelCase in CSS
**Target**: `_agents/pre-implementation.md` + `tokens/_agents/naming-conventions.md`

---

## Implementation Workflow

When user approves:

1. Identify target `_agents/*.md` file
2. Draft exact content
3. Add maintaining existing structure
4. Update cross-references if needed
5. Commit: `docs: enhance _agents/[file].md - [description]`

**Always ask user before implementing** — present analysis and wait for approval.
