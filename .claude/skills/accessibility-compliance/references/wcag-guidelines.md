# WCAG Guidelines Reference

**Conformance target for `@age/design-system`:** **WCAG 2.1 Level AA**.

This document is split into two parts:

- **Part A — WCAG 2.1 AA (mandatory)** — every component must conform.
- **Part B — WCAG 2.2 (future / opt-in)** — not required; reference for forward-looking work.

Examples below are JSX/TSX for clarity, but the same principles apply to Stencil/JSX-in-Stencil components in this repo.

---

# Part A — WCAG 2.1 Level AA (Mandatory)

## Conformance Levels

- **Level A**: Minimum accessibility — every component **must** satisfy.
- **Level AA**: Standard accessibility — every component **must** satisfy. ← project target
- **Level AAA**: Enhanced — out of scope; track in component-level notes only.

The 4 principles (POUR): **Perceivable, Operable, Understandable, Robust**.

---

## Principle 1 — Perceivable

### 1.1.1 Non-text Content (Level A)

All non-text content needs text alternatives.

```tsx
<img src="chart.png" alt="Q3 sales increased 25% compared to Q2" />
<img src="decorative-line.svg" alt="" role="presentation" />

<button aria-label="Delete item">
  <TrashIcon aria-hidden="true" />
</button>

<button>
  <DownloadIcon aria-hidden="true" />
  <span>Download</span>
</button>
```

### 1.3.1 Info and Relationships (Level A)

Structure and relationships must be programmatically determinable.

```tsx
<main>
  <h1>Page Title</h1>
  <section>
    <h2>Section Title</h2>
    <h3>Subsection</h3>
  </section>
</main>

<table>
  <caption>Quarterly Sales Report</caption>
  <thead>
    <tr>
      <th scope="col">Product</th>
      <th scope="col">Q1</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Widget A</th>
      <td>$10,000</td>
    </tr>
  </tbody>
</table>

<fieldset>
  <legend>Notification preferences</legend>
  <label><input type="checkbox" /> Email</label>
  <label><input type="checkbox" /> SMS</label>
</fieldset>
```

### 1.3.2 Meaningful Sequence (Level A)

Reading order and tab order must match the logical sequence. Don't use CSS `order` to put visually-later content first in the DOM if it changes meaning.

### 1.3.4 Orientation (Level AA)

Content must not be locked to a single orientation. Components must function in both portrait and landscape.

### 1.3.5 Identify Input Purpose (Level AA)

Use `autocomplete` so user agents can autofill.

```tsx
<form>
  <label htmlFor="name">Full Name</label>
  <input id="name" name="name" autoComplete="name" />

  <label htmlFor="email">Email</label>
  <input id="email" name="email" type="email" autoComplete="email" />

  <label htmlFor="phone">Phone</label>
  <input id="phone" name="phone" type="tel" autoComplete="tel" />
</form>
```

### 1.4.1 Use of Color (Level A)

Color is **not** the only way to convey information.

```tsx
// Bad
<input className={hasError ? 'border-red-500' : ''} />

// Good
<div>
  <input
    aria-invalid={hasError}
    aria-describedby={hasError ? 'error-message' : undefined}
  />
  {hasError && (
    <p id="error-message" className="error">
      <AlertIcon aria-hidden="true" />
      This field is required
    </p>
  )}
</div>
```

### 1.4.3 Contrast (Minimum) (Level AA) — **CRITICAL**

| Element | Min ratio |
|--------|----------|
| Normal text (< 18pt / < 14pt bold) | **4.5 : 1** |
| Large text (≥ 18pt / ≥ 14pt bold) | **3 : 1** |
| Links (must be distinguishable beyond color alone) | 4.5 : 1 + non-color cue |

```css
.text-on-white { color: #595959; }     /* 7:1 ratio */
.text-on-dark  { color: #ffffff; background: #333; } /* 12.6:1 */

.link {
  color: #0066cc;             /* 4.5:1 on white */
  text-decoration: underline; /* non-color cue */
}
```

**Verify:** `yarn audit:contrast` against `tokens/generated/core.tokens.json` AND `core.dark.tokens.json`.

### 1.4.4 Resize Text (Level AA)

Layout survives 200% zoom without horizontal scrolling or loss of content.

### 1.4.10 Reflow (Level AA)

Content reflows to fit a 320 CSS px viewport (single column on mobile). No two-dimensional scrolling for primary content.

### 1.4.11 Non-text Contrast (Level AA) — **CRITICAL**

UI components and graphical objects need **3:1** against adjacent colors.

```css
.button {
  border: 2px solid #767676; /* 3:1 against white */
  background: white;
}

.input { border: 1px solid #767676; }

.input:focus-visible {
  outline: 2px solid #0066cc; /* focus ring 3:1 */
  outline-offset: 2px;
}

.checkbox { border: 2px solid #767676; }
.checkbox:checked {
  background: #0066cc;
  border-color: #0066cc;
}
```

### 1.4.12 Text Spacing (Level AA)

Layout doesn't break when user applies:

- line-height ≥ 1.5× font size
- letter-spacing ≥ 0.12em
- word-spacing ≥ 0.16em
- paragraph spacing ≥ 2× font size

```css
.content {
  line-height: 1.5;
  letter-spacing: 0.12em;
  word-spacing: 0.16em;
  min-height: auto;       /* don't pin heights */
  overflow-wrap: break-word;
}
```

### 1.4.13 Content on Hover or Focus (Level AA)

Tooltips and other hover/focus revealed content must be:

- **Dismissible** — Escape closes without moving pointer/focus.
- **Hoverable** — pointer can move into the revealed content without it disappearing.
- **Persistent** — stays visible until trigger loses hover/focus, user dismisses, or the info is no longer valid.

```tsx
function Tooltip({ content, children }) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          onKeyDown={(e) => e.key === 'Escape' && setIsVisible(false)}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          {content}
        </div>
      )}
    </div>
  );
}
```

---

## Principle 2 — Operable

### 2.1.1 Keyboard (Level A)

All functionality must be operable via keyboard.

```tsx
// Bad — div as button without keyboard handler
<div onClick={onClick}>Save</div>

// Good — native button
<button onClick={onClick}>Save</button>

// Acceptable — custom widget with full keyboard support
<div
  role="button"
  tabIndex={0}
  onClick={onClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }}
>
  Save
</div>
```

### 2.1.2 No Keyboard Trap (Level A)

Focus must never be trapped — user can always Tab / Shift+Tab out. Modal focus traps are allowed only when Escape closes them.

```tsx
function Modal({ isOpen, onClose, children }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement;
    closeRef.current?.focus();
    return () => (prev as HTMLElement)?.focus();
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <FocusTrap>
      <div role="dialog" aria-modal="true">
        <button ref={closeRef} onClick={onClose}>Close</button>
        {children}
      </div>
    </FocusTrap>
  );
}
```

### 2.1.4 Character Key Shortcuts (Level A)

If a single-key shortcut is implemented, it must be: turn-off-able, remappable, or active-only-on-focus.

### 2.4.3 Focus Order (Level A)

Tab order matches visual/logical reading order. Verify with `mcp__playwright__browser_press_key({ key: 'Tab' })` + snapshot.

### 2.4.6 Headings and Labels (Level AA)

Labels and headings describe topic/purpose. No generic "Click here" labels.

### 2.4.7 Focus Visible (Level AA) — **CRITICAL**

A visible focus indicator must be present on every focusable element when reached via keyboard.

```css
/* Default — use :focus-visible (not :focus) */
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* Custom focus style on a button */
.button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-focus);
}
```

**The focus ring contrast must be ≥ 3:1** against both the background and the adjacent unfocused element (1.4.11).

### 2.5.1 Pointer Gestures (Level A)

No required multi-finger or path-based gesture without a single-pointer alternative.

### 2.5.2 Pointer Cancellation (Level A)

Down-event alone must not trigger destructive action. Use `click` (up-event) and provide a way to abort by moving off.

### 2.5.3 Label in Name (Level A)

The accessible name must include the visible text. If a button shows "Save" then `aria-label` must not be "Submit form" — it should be "Save" or include "Save".

### 2.5.4 Motion Actuation (Level A)

Don't require device motion (shake, tilt) without an alternative UI control.

---

## Principle 3 — Understandable

### 3.2.1 On Focus (Level A)

Focusing a control must not trigger a context change (navigation, form submission, opening a modal).

### 3.2.2 On Input (Level A)

Changing a control's value must not trigger a context change. Use an explicit submit action.

```tsx
// Bad — auto-submit on selection
<select onChange={(e) => form.submit()} />

// Good — explicit submit
<select onChange={(e) => setCountry(e.target.value)} />
<button type="submit">Continue</button>
```

### 3.3.1 Error Identification (Level A)

Errors must be identified in text (not just color/icon).

```tsx
function FormField({ id, label, error, ...props }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

### 3.3.2 Labels or Instructions (Level A)

All form inputs have a visible label (or `aria-label` if no visible text).

### 3.3.3 Error Suggestion (Level AA)

When an error is detected and a suggestion is known, provide it (e.g., "Did you mean user@example.com?").

### 3.3.4 Error Prevention (Legal, Financial, Data) (Level AA)

For irreversible actions, provide one of: reversal, confirmation, review.

---

## Principle 4 — Robust

### 4.1.2 Name, Role, Value (Level A)

All custom controls expose name, role, and value to assistive technology.

```tsx
function CustomCheckbox({ checked, onChange, label }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      {checked ? '✓' : '○'} {label}
    </button>
  );
}
```

Native HTML is always preferred over `role="..."`.

### 4.1.3 Status Messages (Level AA)

Dynamic status messages must be programmatically determinable and announced without focus change.

```tsx
<div role="status" aria-live="polite">
  {count} results found
</div>

<div role="alert" aria-live="assertive">
  Error: payment failed
</div>
```

---

## Testing Checklist (2.1 AA)

### Keyboard

- [ ] All interactive elements focusable with Tab
- [ ] Focus order matches visual order
- [ ] Focus indicator always visible (`:focus-visible`)
- [ ] Focus ring contrast ≥ 3:1
- [ ] No keyboard traps
- [ ] Escape closes overlays/modals
- [ ] Enter/Space activates correctly
- [ ] Arrow keys navigate composite widgets

### Screen Reader

- [ ] All images have alt text or are decorative
- [ ] Form inputs have labels
- [ ] Dynamic status announced (`aria-live` / `role="status"` or `role="alert"`)
- [ ] Errors announced
- [ ] Custom widgets expose name/role/value

### Visual

- [ ] Text contrast ≥ 4.5:1 (normal) / 3:1 (large)
- [ ] UI component contrast ≥ 3:1
- [ ] Works at 200% zoom
- [ ] Reflows to 320 px wide
- [ ] Survives 1.5× line-height / 0.12em letter-spacing
- [ ] Color is never the sole indicator
- [ ] **Verified in light AND dark mode**

### Motion

- [ ] No content flashes > 3 Hz
- [ ] `prefers-reduced-motion: reduce` honored
- [ ] Long auto-playing animations pausable

---

# Part B — WCAG 2.2 (Future / Opt-In, Not Required for 2.1 AA)

The criteria below are **new in WCAG 2.2**. They are **not required** by the project's WCAG 2.1 AA target. Reference them only if a downstream consumer or the Figma project spec requires them.

## 2.4.11 Focus Not Obscured (Minimum) (Level AA, new in 2.2)

When an element receives focus, it must not be entirely hidden by author-created content (e.g., sticky header/footer).

## 2.4.13 Focus Appearance (Level AAA, new in 2.2)

Stronger focus indicator: at least 2 CSS px outline, ≥ 3:1 contrast change, encloses the element.

## 2.5.7 Dragging Movements (Level AA, new in 2.2)

Provide a single-pointer alternative to any drag-and-drop interaction (e.g., reorder via arrow keys or up/down buttons).

## 2.5.8 Target Size (Minimum) (Level AA, new in 2.2)

Interactive targets must be ≥ 24×24 CSS pixels (with exceptions for inline, user-agent default, essential, and equivalent alternatives).

```css
.interactive { min-width: 24px; min-height: 24px; }

/* 2.5.5 Target Size (Enhanced) is Level AAA: 44×44 */
.touch-target-aaa { min-width: 44px; min-height: 44px; }
```

**Note:** The `@age/design-system` has documented exceptions where `button` sm/xs and `checkbox` sm/md are below 24×24 visually but maintain adequate spacing. See [`src/components/_agents/target-size-exceptions.md`](../../../../src/components/_agents/target-size-exceptions.md).

## 3.2.6 Consistent Help (Level A, new in 2.2)

Help mechanisms (contact info, chat, FAQ link) appear in consistent order across pages — application-layer concern.

## 3.3.7 Redundant Entry (Level A, new in 2.2)

Don't require re-entering information previously provided in the same process (e.g., billing → shipping autofill).

## 3.3.8 Accessible Authentication (Minimum) (Level AA, new in 2.2)

No cognitive function test (transcribing, memorization) required for auth, unless there's an alternative.

---

## Resources

- [WCAG 2.1 Quick Reference (W3C)](https://www.w3.org/WAI/WCAG21/quickref/) — **canonical**
- [Understanding WCAG 2.1 (W3C)](https://www.w3.org/WAI/WCAG21/Understanding/)
- [WCAG 2.2 Quick Reference (W3C)](https://www.w3.org/WAI/WCAG22/quickref/) — future
- [WAI-ARIA Authoring Practices (W3C)](https://www.w3.org/WAI/ARIA/apg/)
