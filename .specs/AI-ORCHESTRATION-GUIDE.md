> **⚠️ DEPRECATED** — This file is superseded by the root `AGENTS.md` (primary), `src/components/AGENTS.md` (component patterns), and `tokens/AGENTS.md` (token rules). Those files contain up-to-date MCP prefixes, workflows, skills, and verification steps. **Do NOT rely on this file for MCP tool names or workflow instructions.** It is retained for historical reference only.

# AI Development Orchestration Guide

## Overview

This guide provides instructions for AI agents (like Windsurf Cascade, GitHub Copilot, ChatGPT, Claude, etc.) to effectively develop components for the AGE Design System. It defines workflows, prompting strategies, validation steps, and quality checkpoints for autonomous or AI-assisted component development.

---

## 1. AI Agent Capabilities & Responsibilities

### 1.1 What AI Should Do

**Component Development:**
- Generate complete component implementations from specifications
- Create design tokens based on Figma variables or design requirements
- Write comprehensive Storybook stories with all variants
- Generate unit and E2E tests
- Create accessibility-compliant implementations
- Follow slot-based architecture patterns

**Code Quality:**
- Follow existing code patterns and conventions
- Use TypeScript strictly and correctly
- Apply design tokens consistently
- Implement responsive behaviors
- Handle edge cases and error states

**Documentation:**
- Write clear JSDoc comments
- Create usage examples
- Document all props and CSS custom properties
- Explain accessibility features

### 1.2 What AI Should NOT Do

**Avoid:**
- Deviating from slot-based architecture (no prop-based component recreation)
- Hard-coding values instead of using tokens
- Skipping tests or accessibility features
- Creating prop-based components that duplicate native HTML
- Ignoring existing patterns from other components
- Breaking changes without explicit approval
- Modifying core token structure without consultation

### 1.3 AI Agent Types

**Code Generation Agents (Windsurf, Copilot):**
- Generate entire components from scratch
- Refactor existing code
- Fix bugs and issues
- Write tests

**Design-to-Code Agents (Figma-connected):**
- Extract design tokens from Figma
- Generate component structure from designs
- Map Figma components to code components

**QA/Testing Agents:**
- Generate test cases
- Validate accessibility
- Check token usage
- Verify pattern compliance

---

## 2. Component Development Workflow

### Phase 1: Analysis & Planning

**Step 1: Understand Requirements**

```
INPUT: Component specification or Figma design
OUTPUT: Component analysis document

AI TASK:
1. Identify component type (Atom/Molecule/Organism/Template)
2. List all variants and sizes
3. Identify semantic HTML elements for slots
4. Map design properties to design tokens
5. List interactive states (hover, active, focus, disabled)
6. Document accessibility requirements
7. Identify dependencies on other components
```

**Example Analysis Prompt:**
```
Analyze this component specification for AGE Design System:
- Component Name: Input Field
- Type: Molecule
- Design: [Figma link or description]

Generate:
1. Atomic Design classification
2. Required HTML elements for slot-based architecture
3. List of variants (default, error, success)
4. List of sizes (small, medium, large)
5. Design token requirements
6. Accessibility requirements (ARIA attributes, keyboard nav)
7. Dependencies (icons, labels, error messages)
```

**Step 2: Token Identification**

```
AI TASK:
1. Review existing core tokens in tokens/core/*.tokens.json
2. Identify which existing tokens apply to this component
3. Determine if new component-level tokens needed
4. Map design values to token references
5. Plan token file structure
```

**Token Mapping Template:**
```json
{
  "componentName": {
    "// Base properties": "",
    "fontFamily": "{fontFamily.body}",
    "fontSize": "{fontSize.sm}",
    "padding": { "x": "{spacing.md}", "y": "{spacing.sm}" },
    "borderRadius": "{radius.md}",
    
    "// Size variants": "",
    "small": { "fontSize": "{fontSize.xs}", "padding": {...} },
    "medium": { "fontSize": "{fontSize.sm}", "padding": {...} },
    "large": { "fontSize": "{fontSize.md}", "padding": {...} },
    
    "// Color variants with states": "",
    "default": {
      "default": { "background": "{color.neutral.background.default}" },
      "hover": { "background": "{color.neutral.background.hover}" },
      "focus": { "background": "{color.neutral.background.default}" },
      "disabled": { "background": "{color.neutral.background.subtle}" }
    }
  }
}
```

### Phase 2: Implementation

**Step 3: Create Component Files**

```
AI TASK:
Execute in order:
1. Create tokens/core/components/{component-name}.tokens.json
2. Run: yarn tokens.build
3. Create src/components/cor-{component-name}/cor-{component-name}.enums.ts
4. Create src/components/cor-{component-name}/cor-{component-name}.constants.ts
5. Create src/components/cor-{component-name}/cor-{component-name}.tsx
6. Create src/components/cor-{component-name}/cor-{component-name}.css
7. Validate build: yarn build
```

**Step 4: Implement Component Logic**

**AI Checklist:**
- [ ] Import required Stencil decorators (@Component, @Prop, @Element, @Event)
- [ ] Import enums and constants
- [ ] Import invalidSlottedTag utility
- [ ] Define component with shadow: true
- [ ] Define all props with @Prop({ reflect: true }) for CSS attributes
- [ ] Add proper TypeScript types
- [ ] Implement slot validation
- [ ] Add comprehensive JSDoc comments
- [ ] Document all @cssprop values

**Step 5: Implement Component Styles**

**AI Checklist:**
- [ ] Use :host for component-level styles
- [ ] Use ::slotted(*) for slotted element styles
- [ ] Use :host([attribute]) for reflected attribute styles
- [ ] Apply token-based styling with fallbacks
- [ ] Implement size variants with :host([size='...'])
- [ ] Implement color variants with :host([variant='...'])
- [ ] Implement interactive states (hover, active, focus, disabled)
- [ ] Add smooth transitions (0.15s ease-in-out)
- [ ] Add focus-visible outlines for accessibility
- [ ] Ensure disabled cursor (cursor: not-allowed)

### Phase 3: Testing & Validation

**Step 6: Create Storybook Stories**

```
AI TASK:
Create stories following this template:
1. Default interactive story with all controls
2. Variants showcase story
3. Sizes showcase story  
4. States showcase story (default, hover, focus, disabled)
5. Real-world examples story
6. Accessibility demo story

Ensure all argTypes have:
- control type (select, boolean, text, etc.)
- description
- default values
```

**Step 7: Write Tests**

**Unit Test Checklist (AI):**
- [ ] Test renders with default props
- [ ] Test all props reflect correctly
- [ ] Test variant rendering
- [ ] Test size rendering
- [ ] Test disabled state
- [ ] Test slot validation
- [ ] Test events emit correctly
- [ ] Test edge cases (empty content, invalid props)

**E2E Test Checklist (AI):**
- [ ] Test component renders in browser
- [ ] Test user interactions (click, keyboard)
- [ ] Test focus management
- [ ] Test form behaviors (if applicable)
- [ ] Test responsive behavior

**Step 8: Accessibility Validation**

```
AI CHECKLIST:
1. Semantic HTML preserved through slots
2. Keyboard navigation works (Tab, Enter, Space, Arrows)
3. Focus indicators visible (outline on :focus-visible)
4. ARIA attributes added where needed
5. Color contrast ratios meet WCAG AA (4.5:1 text, 3:1 UI)
6. Screen reader announcements clear
7. Disabled states properly communicated
8. Error messages associated with inputs (aria-describedby)
9. Labels associated with form elements
10. Interactive elements have accessible names
```

### Phase 4: Documentation & Review

**Step 9: Documentation**

```
AI TASK:
Ensure complete documentation:
1. JSDoc comments in .tsx file (purpose, props, slots, CSS vars)
2. readme.md auto-generated (yarn build generates this)
3. Storybook stories with descriptions
4. Usage examples in stories
5. Accessibility notes
```

**Step 10: Self-Review Checklist**

```
AI VALIDATION:
Run these checks before marking complete:

✓ Build succeeds (yarn build)
✓ No TypeScript errors
✓ No linting errors (yarn lint)
✓ All tests pass (yarn test)
✓ Tokens built successfully (yarn tokens.build)
✓ Storybook displays correctly (yarn dev)
✓ Component uses tokens (no hard-coded values)
✓ Follows slot-based architecture
✓ Matches existing component patterns
✓ Accessibility requirements met
✓ All variants work
✓ All sizes work
✓ All states work (hover, active, focus, disabled)
✓ Dark theme works (if color-dependent)
✓ Responsive behavior correct
```

---

## 3. AI Prompting Strategies

### 3.1 Context-Aware Prompting

**Provide Necessary Context:**

```
When prompting AI to create a component, include:

1. Project Context:
   - "This is the AGE Design System built with Stencil.js"
   - "We use slot-based architecture, not prop-based"
   - "We use a three-tier design token system"

2. Component Context:
   - Atomic Design level
   - Component purpose
   - Visual variants
   - Size variants
   - Interactive states

3. Reference Components:
   - "Follow the pattern from cor-input component"
   - "Use similar token structure as cor-input"

4. Constraints:
   - "Must be WCAG 2.1 AA compliant"
   - "Must use design tokens from tokens/core/"
   - "Must work in light and dark themes"
```

### 3.2 Example Prompts for Common Tasks

**Create New Component:**
```
Create a new component for AGE Design System following these requirements:

Component: cor-card
Type: Organism
Architecture: Slot-based (wrap semantic HTML)

Variants:
- default, elevated, outlined

Sizes:
- small, medium, large

Slots:
- header (optional)
- default (main content)
- footer (optional)

Features:
- Flexible layout
- Configurable padding
- Optional elevation shadow
- Optional border
- Responsive spacing

Instructions:
1. Create tokens in tokens/core/components/card.tokens.json
2. Reference existing spacing, radius, and shadow tokens
3. Create cor-card.tsx with slot-based architecture
4. Create cor-card.css with token-based styling
5. Create enums for CardVariant and CardSize
6. Create Storybook stories showing all variants
7. Write unit and E2E tests
8. Follow patterns from cor-button and cor-typography

Requirements:
- Use design tokens exclusively (no hard-coded values)
- Support light/dark themes
- WCAG 2.1 AA compliant
- Comprehensive JSDoc documentation
```

**Add Variant to Existing Component:**
```
Add a new variant 'outlined' to the cor-button component:

Requirements:
1. Add 'outlined' to ButtonVariant enum
2. Add token definitions in tokens/core/components/button.tokens.json:
   - button.outlined.default.{background, border, color}
   - button.outlined.hover.{background, border, color}
   - button.outlined.active.{background, border, color}
   - button.outlined.focus.{background, border, color}
   - button.outlined.disabled.{background, border, color}
3. Add CSS rules in cor-button.css for :host([variant='outlined'])
4. Add story in cor-button.stories.ts
5. Add test case in test/cor-button.spec.tsx
6. Rebuild tokens (yarn tokens.build)
7. Test in light and dark themes

Design specs:
- Background: transparent
- Border: 2px solid primary color
- Text color: primary color
- Hover: light primary background
```

**Fix Accessibility Issue:**
```
Fix keyboard navigation in cor-modal component:

Issues:
1. Focus not trapped within modal when open
2. No visible focus indicator on close button
3. ESC key doesn't close modal

Requirements:
1. Implement focus trap (focus stays within modal)
2. Add :focus-visible styles to close button
3. Add @Listen('keydown') for ESC key
4. Set focus to first focusable element on open
5. Restore focus to trigger element on close
6. Add ARIA attributes (aria-modal, role="dialog")
7. Add E2E test for keyboard navigation
8. Follow ARIA Dialog pattern
```

### 3.3 Iterative Refinement Prompts

**After Initial Implementation:**
```
Review this component implementation and suggest improvements:

Component: cor-{name}
File: src/components/cor-{name}/cor-{name}.tsx

Check for:
1. Token usage (any hard-coded values?)
2. Accessibility (keyboard nav, ARIA, focus management)
3. Edge cases (empty content, invalid props, null values)
4. Type safety (any 'any' types?)
5. Pattern consistency (matches cor-button pattern?)
6. Performance (unnecessary re-renders?)
7. Shadow DOM best practices
8. Slot validation
9. Error handling
10. Documentation completeness

Provide specific code fixes for any issues found.
```

---

## 4. AI Development Patterns

### 4.1 Token-First Development

**Pattern:**
1. Start with token definitions
2. Build tokens to generate CSS variables
3. Reference tokens in component CSS
4. Never hard-code values

**AI Instruction:**
```
Always follow this order:
1. Define tokens in JSON
2. Run yarn tokens.build
3. Use tokens in CSS via var(--token-name)
4. Provide fallback chain: var(--specific, var(--general, var(--core)))
```

### 4.2 Slot-Based Component Pattern

**Pattern:**
```typescript
// ✅ CORRECT: Slot-based
<cor-button variant="primary" size="medium">
  <button onClick={handleClick}>Click Me</button>
</cor-button>

// ❌ WRONG: Prop-based (anti-pattern)
<cor-button 
  variant="primary" 
  size="medium" 
  text="Click Me" 
  onClick={handleClick} 
/>
```

**AI Instruction:**
```
CRITICAL: Always use slot-based architecture.

Components must:
1. Accept semantic HTML elements in slots
2. Validate slotted content with invalidSlottedTag()
3. Style slotted content via ::slotted(*) selector
4. Preserve native HTML behavior
5. Never recreate HTML elements with props

Example validation:
const tag = this.host.firstElementChild?.tagName?.toLowerCase();
if (!ALLOWED_TAGS.includes(tag)) {
  return <Host>{invalidSlottedTag(tag, ALLOWED_TAGS)}</Host>;
}
```

### 4.3 Variant Implementation Pattern

**Pattern:**
```typescript
// 1. Define enum
export enum ComponentVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

// 2. Add prop with reflection
@Prop({ reflect: true }) variant: string = ComponentVariant.PRIMARY;

// 3. Define tokens for each variant
{
  "component": {
    "primary": {
      "default": { "background": "{color.primary.background.default}" },
      "hover": { "background": "{color.primary.background.hover}" }
    }
  }
}

// 4. Style with reflected attribute
:host([variant='primary']) {
  ::slotted(*:not(:disabled)) {
    background-color: var(--component-primary-default-background);
  }
  ::slotted(*:hover:not(:disabled)) {
    background-color: var(--component-primary-hover-background);
  }
}
```

### 4.4 State Management Pattern

**CSS State Order:**
```css
/* ALWAYS follow this order */

/* 1. Default state */
::slotted(*:not(:disabled)) {
  /* default styles */
}

/* 2. Hover state */
::slotted(*:hover:not(:disabled)) {
  /* hover styles */
}

/* 3. Active state */
::slotted(*:active:not(:disabled)) {
  /* active styles */
}

/* 4. Focus state */
::slotted(*:focus-visible:not(:disabled)) {
  /* focus styles */
}

/* 5. Disabled state */
::slotted(*:disabled),
::slotted(*[aria-disabled='true']) {
  /* disabled styles */
  cursor: not-allowed;
}
```

### 4.5 Responsive Pattern

**Using Breakpoint Tokens:**
```css
/* Use core screen tokens for breakpoints */
@media (min-width: var(--screen-sm)) {
  :host {
    /* Small screen styles */
  }
}

@media (min-width: var(--screen-md)) {
  :host {
    /* Medium screen styles */
  }
}

@media (min-width: var(--screen-lg)) {
  :host {
    /* Large screen styles */
  }
}
```

---

## 5. Quality Checkpoints

### 5.1 Pre-Commit Validation

**AI should run these before considering work complete:**

```bash
# 1. Build tokens
yarn tokens.build
# Expected: Success, no errors

# 2. Lint code
yarn lint
# Expected: No errors, no warnings

# 3. Run tests
yarn test
# Expected: All tests pass

# 4. Build components
yarn build
# Expected: Success, no TypeScript errors

# 5. Start Storybook
yarn dev
# Expected: Starts on port 6007, no errors
```

### 5.2 Component Quality Matrix

**AI Scoring System (0-100):**

| Category | Weight | Pass Criteria |
|----------|--------|---------------|
| **Architecture** | 20% | Slot-based, proper validation, no prop duplication |
| **Token Usage** | 15% | All values from tokens, proper fallbacks, no hard-coded |
| **Accessibility** | 20% | WCAG AA, keyboard nav, ARIA, focus management |
| **Testing** | 15% | Unit + E2E tests, >80% coverage, edge cases |
| **Documentation** | 10% | JSDoc complete, Storybook stories, usage examples |
| **Type Safety** | 10% | No 'any', proper interfaces, strict mode |
| **Pattern Consistency** | 10% | Matches existing components, follows conventions |

**Scoring:**
- 90-100: Excellent, ready for review
- 80-89: Good, minor improvements needed
- 70-79: Acceptable, revisions required
- <70: Needs significant rework

### 5.3 Automated Validation Checklist

**AI should verify automatically:**

```typescript
// Pseudo-code for AI validation
const validateComponent = (componentPath) => {
  const checks = {
    hasEnums: fileExists(`${componentPath}/*.enums.ts`),
    hasConstants: fileExists(`${componentPath}/*.constants.ts`),
    hasTsx: fileExists(`${componentPath}/*.tsx`),
    hasCss: fileExists(`${componentPath}/*.css`),
    hasStories: fileExists(`${componentPath}/*.stories.ts`),
    hasTests: fileExists(`${componentPath}/test/*.spec.tsx`),
    hasE2E: fileExists(`${componentPath}/test/*.e2e.tsx`),
    hasTokens: fileExists(`tokens/core/components/${name}.tokens.json`),
    
    usesSlotBased: !tsxContains('text=') && tsxContains('<slot'),
    usesTokens: !cssContains('#') && cssContains('var(--'),
    hasReflectedProps: tsxContains('reflect: true'),
    hasValidation: tsxContains('invalidSlottedTag'),
    hasJSDoc: tsxContains('/**'),
    hasCssPropDocs: tsxContains('@cssprop'),
    
    buildsSuccessfully: runCommand('yarn build'),
    passesTests: runCommand('yarn test'),
    passesLint: runCommand('yarn lint'),
  };
  
  return checks;
};
```

---

## 6. Common AI Pitfalls & Solutions

### 6.1 Pitfall: Recreating HTML with Props

**❌ WRONG:**
```typescript
<cor-button text="Click" onClick={handler} />
```

**✅ CORRECT:**
```typescript
<cor-button variant="primary">
  <button onClick={handler}>Click</button>
</cor-button>
```

**AI Solution:**
Always remind the AI: "Use slot-based architecture. Wrap semantic HTML elements."

### 6.2 Pitfall: Hard-Coded Values

**❌ WRONG:**
```css
.button {
  padding: 16px;
  color: #494C83;
  border-radius: 8px;
}
```

**✅ CORRECT:**
```css
::slotted(button) {
  padding: var(--button-padding-block, var(--spacing-sm)) 
           var(--button-padding-inline, var(--spacing-md));
  color: var(--button-primary-default-color);
  border-radius: var(--button-border-radius, var(--radius-md));
}
```

**AI Solution:**
"Never use hard-coded values. Always reference design tokens via CSS variables."

### 6.3 Pitfall: Missing State Validation

**❌ WRONG:**
```css
::slotted(*:hover) {
  background: var(--hover-bg);
}
```

**✅ CORRECT:**
```css
::slotted(*:hover:not(:disabled)) {
  background: var(--hover-bg);
}
```

**AI Solution:**
"Always use :not(:disabled) to prevent state conflicts."

### 6.4 Pitfall: Incomplete Accessibility

**❌ WRONG:**
```typescript
// No keyboard support, no ARIA, no focus management
<cor-modal>
  <div>Modal content</div>
</cor-modal>
```

**✅ CORRECT:**
```typescript
<cor-modal 
  open={isOpen} 
  onCorClose={handleClose}
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <div role="dialog" aria-modal="true">
    <h2 id="modal-title">Title</h2>
    <p id="modal-description">Description</p>
  </div>
</cor-modal>
```

**AI Solution:**
"Always implement full keyboard navigation, ARIA attributes, and focus management."

### 6.5 Pitfall: Missing Token Fallbacks

**❌ WRONG:**
```css
font-size: var(--button-large-font-size);
/* Breaks if token undefined */
```

**✅ CORRECT:**
```css
font-size: var(--button-large-font-size, var(--button-font-size, var(--font-size-md)));
/* Cascading fallbacks */
```

**AI Solution:**
"Always provide fallback chain: specific → general → core → raw value."

---

## 7. Multi-Agent Collaboration

### 7.1 Agent Roles

**Design Agent:**
- Extracts design tokens from Figma
- Generates token JSON files
- Maps design variants to code variants

**Development Agent:**
- Implements component logic
- Writes TypeScript/Stencil code
- Creates component styles
- Follows design tokens

**Testing Agent:**
- Generates test cases
- Validates component behavior
- Checks accessibility
- Verifies pattern compliance

**Documentation Agent:**
- Writes JSDoc comments
- Creates Storybook stories
- Generates usage examples
- Maintains readme files

### 7.2 Handoff Protocol

**Design → Development:**
```json
{
  "component": "cor-card",
  "tokens": {
    "file": "tokens/core/components/card.tokens.json",
    "generated": true
  },
  "variants": ["default", "elevated", "outlined"],
  "sizes": ["small", "medium", "large"],
  "slots": ["header", "default", "footer"]
}
```

**Development → Testing:**
```json
{
  "component": "cor-card",
  "files": [
    "src/components/cor-card/cor-card.tsx",
    "src/components/cor-card/cor-card.css"
  ],
  "implemented": true,
  "needsTests": true,
  "testScenarios": [
    "Renders with all variants",
    "Renders with all sizes",
    "Handles empty slots",
    "Keyboard navigation works"
  ]
}
```

**Testing → Documentation:**
```json
{
  "component": "cor-card",
  "testsPassing": true,
  "coverage": 85,
  "accessibilityScore": 100,
  "needsDocs": true,
  "docSections": [
    "Usage examples",
    "Variant showcase",
    "Accessibility notes"
  ]
}
```

---

## 8. Continuous Improvement

### 8.1 Pattern Learning

**AI should learn from existing components:**

```
Before implementing new component:
1. Review cor-button for slot-based pattern
2. Review cor-icon for prop handling
3. Review cor-grid for responsive patterns
4. Review component tokens for token structure
5. Review component stories for story patterns
6. Review component tests for test patterns

Extract patterns:
- How are variants implemented?
- How are sizes implemented?
- How are states implemented?
- How are tokens referenced?
- How is slot validation done?
- How are stories structured?
```

### 8.2 Feedback Loop

**After each component:**

```
AI Self-Assessment:
1. What went well?
2. What could be improved?
3. What patterns should be extracted?
4. What mistakes should be avoided?
5. What documentation should be updated?

Update pattern library:
- Add successful patterns to reuse
- Document anti-patterns to avoid
- Update checklists based on learnings
- Refine prompts for better results
```

---

## 9. Emergency Protocols

### 9.1 Build Failures

**If `yarn build` fails:**

```
AI RECOVERY STEPS:
1. Read error message carefully
2. Check TypeScript errors in components.d.ts
3. Verify all imports are correct
4. Check for syntax errors
5. Ensure tokens are built (yarn tokens.build)
6. Verify all files exist
7. Check for circular dependencies
8. Review Stencil configuration

Common fixes:
- Missing import statements
- Incorrect file paths
- Malformed JSX
- Invalid TypeScript types
- Token not defined
```

### 9.2 Test Failures

**If tests fail:**

```
AI RECOVERY STEPS:
1. Read test error output
2. Identify failing test
3. Review test expectations
4. Check component implementation
5. Verify test setup
6. Check for async issues
7. Validate test data

Common fixes:
- Update snapshots (if visual changes intended)
- Fix component logic
- Adjust test expectations
- Add missing test setup
- Handle async operations properly
```

### 9.3 Token Issues

**If tokens don't work:**

```
AI RECOVERY STEPS:
1. Verify token file syntax (valid JSON)
2. Check token references (curly braces {})
3. Ensure tokens built (yarn tokens.build)
4. Check CSS variable names (kebab-case)
5. Verify token file location
6. Check Style Dictionary config

Common fixes:
- Fix JSON syntax errors
- Correct token references
- Rebuild tokens
- Fix CSS variable names
- Move token file to correct location
```

---

## 10. Success Metrics

### 10.1 AI Performance KPIs

**Measure AI effectiveness:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| **First-time Build Success** | >90% | Components build without errors on first attempt |
| **Test Pass Rate** | >95% | Tests pass without fixes |
| **Token Compliance** | 100% | No hard-coded values in CSS |
| **Pattern Compliance** | 100% | Follows slot-based architecture |
| **Accessibility Score** | 100% | Meets WCAG 2.1 AA |
| **Documentation Complete** | 100% | All JSDoc, stories, tests present |
| **Code Review Iterations** | <2 | Number of review cycles needed |

### 10.2 Quality Gates

**Component cannot proceed without:**

- [ ] ✅ Builds successfully
- [ ] ✅ All tests pass
- [ ] ✅ Linting passes
- [ ] ✅ Uses design tokens exclusively
- [ ] ✅ Follows slot-based architecture
- [ ] ✅ Accessibility validated
- [ ] ✅ Documentation complete
- [ ] ✅ Storybook stories created
- [ ] ✅ Pattern compliance verified

---

## 11. AI Prompt Templates

### 11.1 Component Creation Template

```
Create a new component for AGE Design System:

CONTEXT:
- Project: AGE Design System (Stencil.js)
- Architecture: Slot-based (NO prop-based element recreation)
- Token System: Three-tier (Global → Semantic → Component)
- Accessibility: WCAG 2.1 AA required

COMPONENT SPECIFICATION:
Name: cor-{name}
Type: Atom/Molecule/Organism/Template
Purpose: {description}

VARIANTS:
- {variant1}: {description}
- {variant2}: {description}

SIZES:
- small: {specs}
- medium: {specs}
- large: {specs}

SLOTS:
- {slot1}: {accepts what HTML elements}
- {slot2}: {accepts what HTML elements}

STATES:
- default: {specs}
- hover: {specs}
- active: {specs}
- focus: {specs}
- disabled: {specs}

ACCESSIBILITY:
- Keyboard: {Tab, Enter, Space, etc.}
- ARIA: {required attributes}
- Screen reader: {announcements}

REFERENCE COMPONENTS:
Follow patterns from: cor-{similar-component}

DELIVERABLES:
1. tokens/core/components/{name}.tokens.json
2. src/components/cor-{name}/cor-{name}.enums.ts
3. src/components/cor-{name}/cor-{name}.constants.ts
4. src/components/cor-{name}/cor-{name}.tsx (with JSDoc)
5. src/components/cor-{name}/cor-{name}.css (with tokens)
6. src/components/cor-{name}/cor-{name}.stories.ts (all variants)
7. test/cor-{name}.spec.tsx (unit tests)
8. test/cor-{name}.e2e.tsx (E2E tests)

VALIDATION:
- yarn tokens.build → success
- yarn build → success
- yarn test → all pass
- yarn lint → no errors
- Manual Storybook review

CRITICAL RULES:
1. MUST use slot-based architecture
2. MUST use design tokens (no hard-coded values)
3. MUST validate slotted content
4. MUST implement all accessibility features
5. MUST follow existing component patterns
6. MUST create comprehensive tests
7. MUST document with JSDoc
```

### 11.2 Bug Fix Template

```
Fix issue in {component-name}:

ISSUE:
{Description of the problem}

CURRENT BEHAVIOR:
{What currently happens}

EXPECTED BEHAVIOR:
{What should happen}

CONTEXT:
- Files: {affected files}
- Related components: {dependencies}
- Token usage: {if token-related}

CONSTRAINTS:
- Cannot break existing API
- Must maintain accessibility
- Must follow patterns
- Must pass all tests

SOLUTION REQUIREMENTS:
1. Identify root cause
2. Implement minimal fix
3. Add/update tests to prevent regression
4. Update documentation if needed
5. Verify no side effects

VALIDATION:
- yarn build → success
- yarn test → all pass
- Specific test for this bug passes
- No regression in other features
```

### 11.3 Refactoring Template

```
Refactor {component-name} for {reason}:

CURRENT STATE:
{Description of current implementation}

ISSUES:
{Problems with current approach}

TARGET STATE:
{Desired implementation}

BENEFITS:
{Why this refactoring improves the codebase}

CONSTRAINTS:
- Must maintain backward compatibility
- Cannot break existing usage
- Must improve code quality metrics
- Must maintain or improve performance

APPROACH:
1. {Step 1}
2. {Step 2}
3. {Step 3}

VALIDATION:
- All existing tests still pass
- Code coverage maintained or improved
- No breaking changes
- Performance maintained or improved
- Documentation updated
```

---

## 12. Quick Reference for AI Agents

### Command Cheat Sheet

```bash
# Component Generation
yarn generate                           # Create component scaffold

# Token Management
yarn tokens.build                       # Build all tokens
yarn tokens.build.core                  # Build core tokens only
yarn tokens.build.age                   # Build AGE tokens only

# Development
yarn dev                                # Start Storybook dev server
yarn build.watch                        # Build with watch mode
yarn start                              # Stencil dev server

# Building
yarn build                              # Build components
yarn build.react                        # Build with React wrappers
yarn sp.build                           # Build Storybook static

# Testing
yarn test                               # Run all tests
yarn test.watch                         # Run tests in watch mode
yarn test --e2e                         # Run E2E tests only

# Quality
yarn lint                               # Run ESLint
yarn format                             # Format with Prettier
```

### File Path Templates

```
Component Files:
src/components/cor-{name}/cor-{name}.tsx
src/components/cor-{name}/cor-{name}.css
src/components/cor-{name}/cor-{name}.enums.ts
src/components/cor-{name}/cor-{name}.constants.ts
src/components/cor-{name}/cor-{name}.stories.ts
src/components/cor-{name}/test/cor-{name}.spec.tsx
src/components/cor-{name}/test/cor-{name}.e2e.tsx

Token Files:
tokens/core/components/{name}.tokens.json
tokens/age/components/{name}.tokens.json (if client-specific)
```

### Pattern Quick Reference

```typescript
// Enum Pattern
export enum ComponentVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

// Prop Pattern
@Prop({ reflect: true }) variant: string = ComponentVariant.PRIMARY;

// Validation Pattern
const tag = this.host.firstElementChild?.tagName?.toLowerCase();
if (!ALLOWED_TAGS.includes(tag)) {
  return <Host>{invalidSlottedTag(tag, ALLOWED_TAGS)}</Host>;
}

// Render Pattern
return (
  <Host>
    <slot />
  </Host>
);
```

```css
/* CSS Pattern */
:host {
  display: inline-block;
}

::slotted(*:not(:disabled)) {
  /* default styles */
}

::slotted(*:hover:not(:disabled)) {
  /* hover styles */
}

:host([variant='primary']) {
  ::slotted(*) {
    /* variant styles */
  }
}
```

---

## 13. Conclusion

AI agents following this guide should be able to autonomously develop high-quality, accessible, token-driven components for the AGE Design System. The key principles are:

1. **Slot-based architecture** - Always wrap semantic HTML
2. **Token-driven styling** - Never hard-code values
3. **Accessibility-first** - WCAG 2.1 AA compliance mandatory
4. **Pattern consistency** - Follow existing component patterns
5. **Comprehensive testing** - Unit, E2E, and accessibility tests
6. **Complete documentation** - JSDoc, Storybook, and usage examples

By adhering to these guidelines, AI-generated components will seamlessly integrate into the design system and maintain the highest quality standards.

---

## 14. Skill Usage Clarifications

When using `.windsurf/skills/`, note these project-specific overrides and clarifications:

### 14.1 Storybook Stories (Web Components, not React)

The `storybook-story-writing` skill shows React examples, but this project uses **Web Components with `lit-html`**:

```typescript
// ❌ WRONG (React pattern from skill)
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

export const Primary: Story = {
  args: { primary: true, label: 'Button' },
};

// ✅ CORRECT (Web Components pattern for this project)
import { html } from 'lit-html';
import type { Meta, StoryObj } from '@storybook/web-components';
import { ButtonVariant, ButtonSize } from './cor-button.enums';

export default {
  title: 'Atoms/Button',
  component: 'cor-button',
  argTypes: {
    variant: {
      control: 'select',
      options: Object.values(ButtonVariant),
    },
  },
};

export const Default = (args) => html`
  <cor-button variant="${args.variant}" size="${args.size}">
    <button>${args.content}</button>
  </cor-button>
`;
```

**Reference:** `src/components/cor-button/cor-button.stories.ts`

### 14.2 Token Variable Naming

Use `--space-*` (not `--spacing-*`) for spacing tokens as defined in token files:

| ✅ Correct | ❌ Incorrect |
|-----------|-------------|
| `var(--space-xs)` | `var(--spacing-xs)` |
| `var(--space-sm)` | `var(--spacing-sm)` |
| `var(--space-md)` | `var(--spacing-md)` |
| `var(--space-lg)` | `var(--spacing-lg)` |
| `var(--space-xl)` | `var(--spacing-xl)` |

**Reference:** `tokens/core/space.tokens.json`

### 14.3 MCP Tool Prefixes

When using `pix-stencil-storybook` skill, note current MCP server tool naming:

| MCP Server | Tool Prefix | Example |
|------------|-------------|---------|
| GitKraken | `mcp0_*` | `mcp0_git_status` |
| Context7 | `mcp2_*` | `mcp2_resolve-library-id` |
| Figma Desktop | `mcp3_*` | `mcp3_get_design_context` |
| Image Compare | `mcp5_*` | `mcp5_compare_images` |
| Playwright | `mcp6_*` | `mcp6_browser_navigate` |

### 14.4 Reference Files

| Topic | Location |
|-------|----------|
| Token structure | `tokens/core/*.tokens.json` |
| Component pattern | `src/components/cor-button/` |
| Storybook config | `.storybook/main.mjs` |
| Project spec | `.specs/PROJECT-SPECIFICATION.md` |
| Token architecture | `.specs/TOKEN-ARCHITECTURE.md` |
| Component guide | `.specs/COMPONENT-DEVELOPMENT-GUIDE.md` |

### 14.5 Skill Priority

When skills conflict with specs, **specs take precedence**:

1. `.specs/PROJECT-SPECIFICATION.md` (highest priority)
2. `.specs/COMPONENT-DEVELOPMENT-GUIDE.md`
3. `.specs/TOKEN-ARCHITECTURE.md`
4. `.specs/AI-ORCHESTRATION-GUIDE.md`
5. `.windsurf/skills/*` (reference patterns only)

### 14.6 Local Skill Overrides

Developers can create OS/environment-specific skill overrides that are not version-controlled.

**Directory Structure:**

```
.windsurf/
├── skills/                    # Tracked (shared base)
│   ├── pix-stencil-storybook/
│   │   └── SKILL.md
│   └── ...
└── skills.local/              # Gitignored (personal overrides)
    └── pix-stencil-storybook/
        └── SKILL.md           # Overrides main if exists
```

**Priority Order:**

1. `.windsurf/skills.local/{skill-name}/SKILL.md` (if exists)
2. `.windsurf/skills/{skill-name}/SKILL.md` (fallback)

**Creating a Local Override:**

```bash
# Copy skill to override locally
mkdir -p .windsurf/skills.local/pix-stencil-storybook
cp .windsurf/skills/pix-stencil-storybook/SKILL.md .windsurf/skills.local/pix-stencil-storybook/
```

**Common Customizations:**

| Item | Example |
|------|---------|
| MCP prefixes | `mcp2_*` → `mcp3_*` based on your setup |
| Shell commands | Unix → Windows equivalents |
| Tool paths | System-specific paths |
| Port numbers | Custom dev server ports |

**Note:** The `.windsurf/skills.local/` directory is gitignored. See `skills.local/README.md` for setup instructions.

---

## Appendix: AI Training Examples

### Example 1: Simple Atom Component

**Input Spec:**
```
Create cor-badge component
- Type: Atom
- Variants: neutral, primary, success, warning, danger
- Sizes: small, medium
- Slot: <span> with badge text
```

**Expected AI Output:**
- Complete component implementation
- Token file with all variants
- CSS with token references
- Storybook stories
- Tests
- All patterns followed

### Example 2: Complex Molecule Component

**Input Spec:**
```
Create cor-input-field component
- Type: Molecule
- Includes: label, input, error message
- Variants: default, error, success
- Sizes: small, medium, large
- Accessibility: label association, error announcement
```

**Expected AI Output:**
- Multi-slot component
- Form validation support
- ARIA attributes
- Keyboard navigation
- Error state handling
- Comprehensive tests

### Example 3: Organism Component

**Input Spec:**
```
Create cor-data-table component
- Type: Organism
- Features: sorting, pagination, row selection
- Slots: table with semantic HTML
- Accessibility: keyboard navigation, screen reader
```

**Expected AI Output:**
- Complex interaction handling
- State management
- Event emitters
- Full accessibility
- E2E tests for interactions
```
