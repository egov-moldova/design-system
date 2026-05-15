# Agent-Browser + Playwright MCP Integration Plan

A practical integration strategy for using **agent-browser** (Vercel Labs, Rust CLI) and **Playwright MCP** (`mcp8_*`) across AI-driven workflows in this Stencil/Storybook design system project.

---

## 1. Tool Overviews

### agent-browser
- **What it is**: Headless browser CLI built for AI agents (native Rust, Vercel Labs). Outputs a compact **accessibility tree** — not raw HTML or screenshots.
- **Primary strength**: Token-efficient DOM inspection. Returns structured text output that consumes far less context window than HTML dumps or images.
- **Installed via**: `npm install -g agent-browser` → `agent-browser install` (downloads Chrome for Testing)
- **Best for**:
  - Structural/semantic verification ("does this element exist and have the right role?")
  - Lightweight iteration during inner dev loops where screenshot cost is wasteful
  - CI-friendly checks (no GUI, minimal overhead)
  - Accessibility tree audits without opening a full browser session

### Playwright MCP (`mcp8_` / `browser_*`)
- **What it is**: Full browser automation via MCP server — Chromium, Firefox, WebKit. Full DOM access, screenshots, JS evaluation, network inspection.
- **Primary strength**: Rich, precise interaction — visual screenshots, computed style extraction, hover/click/drag, console log capture, network requests.
- **Best for**:
  - Pixel-perfect visual comparison (screenshots → Image Compare MCP)
  - Computed style verification (`browser_evaluate` on shadowRoot)
  - Interactive state testing (hover, focus, click, keyboard)
  - Responsive viewport testing
  - Console error capture during QA

### Key Distinction
| Dimension | agent-browser | Playwright MCP |
|---|---|---|
| Output format | Accessibility tree (text) | Screenshots, DOM, computed styles |
| Context cost | Very low | Medium–high (screenshots are large) |
| Interaction depth | Navigate + read | Full click/hover/type/eval |
| Shadow DOM access | No (accessibility tree only) | Yes (`shadowRoot.querySelector`) |
| Speed | Very fast | Fast but heavier |
| Best phase | Structure/existence checks | Visual/behavioral QA |

---

## 2. Workflow Mapping

### 2a. Component Development Loop

| Step | Tool | Why |
|---|---|---|
| Check token CSS vars exist | **Playwright MCP** `browser_evaluate` | Needs shadowRoot access — agent-browser can't pierce shadow DOM |
| Verify element renders with correct ARIA roles | **agent-browser** | Accessibility tree is exactly what's needed; zero screenshot cost |
| Capture Storybook screenshot for Figma comparison | **Playwright MCP** `browser_take_screenshot` | Visual output required for Image Compare MCP |
| Verify computed spacing/colors match design | **Playwright MCP** `browser_evaluate` | Needs `getComputedStyle` on shadow DOM |
| Interactive state testing (hover, focus, click) | **Playwright MCP** `browser_hover`, `browser_click` | Requires real event dispatch |

### 2b. Accessibility Auditing

| Step | Tool | Why |
|---|---|---|
| Initial role/label/structure audit | **agent-browser** | Compact accessibility tree is purpose-built for this; fast iteration |
| Focus order verification | **Playwright MCP** `browser_press_key` Tab | Needs real keyboard event sequencing |
| ARIA live region behavior | **Playwright MCP** `browser_snapshot` | Needs post-interaction state capture |
| Contrast ratio check (visual) | **Playwright MCP** `browser_evaluate` | Needs `getComputedStyle` for actual color values |

### 2c. Storybook/Figma Visual QA (Pixel-Perfect Loop)

This is the current `_agents/pixel-perfect-qa.md` workflow — no change to tool selection here, but agent-browser can be inserted at Step 1.5:

| Step | Tool |
|---|---|
| 1 — Figma extraction | Figma MCP (`mcp5_*`) |
| **1.5 — Element structure exists?** | **agent-browser** (new) — confirm element renders before spending screenshot tokens |
| 1.5 — CSS var resolution | Playwright MCP `browser_evaluate` |
| 2 — Storybook screenshot | Playwright MCP `browser_take_screenshot` |
| 3 — Compare | Image Compare MCP (`mcp7_*`) |
| 4 — Fix discrepancies | (code changes) |
| 5 — Re-test | Playwright MCP (minimal) |
| 6 — All states | Playwright MCP |
| 7 — Responsive | Playwright MCP `browser_resize` |

### 2d. Regression Testing (CI / Pre-PR)

| Step | Tool | Why |
|---|---|---|
| Structural smoke test (does page/component load?) | **agent-browser** | Fast, no GUI, perfect for CI headless |
| ARIA regression (role/label changes) | **agent-browser** | Structured diff of accessibility tree |
| Visual regression (screenshot diff) | **Playwright MCP** + Image Compare | Full pixel diff needed |
| Console error capture | **Playwright MCP** `browser_console_messages` | Only Playwright captures runtime JS errors |

### 2e. Storybook Story Verification

| Step | Tool | Why |
|---|---|---|
| Story loads (iframe URL resolves) | **agent-browser** | Cheap existence check |
| Controls panel renders correctly | **agent-browser** | Structural check |
| Story screenshot for docs | **Playwright MCP** | Visual output required |
| Story interaction (knobs/controls) | **Playwright MCP** | Needs real click/type events |

---

## 3. Integration Steps

### 3a. Installing agent-browser

```bash
npm install -g agent-browser
agent-browser install          # downloads Chrome for Testing (one-time)
```

For project pinning, add to `package.json` devDependencies:
```json
"agent-browser": "latest"
```

### 3b. Basic agent-browser usage pattern

```bash
# Navigate and dump accessibility tree
agent-browser open http://localhost:6007/iframe.html?id=atoms-cor-button--default

# Check element exists with correct role
agent-browser open http://localhost:6007/... | grep -i "button"
```

The CLI outputs a compact accessibility tree — the AI agent reads this to confirm structure without expensive screenshots.

### 3c. Playwright MCP — current setup (already active)

Already registered as `mcp8_*`. Current workflow in `_agents/pixel-perfect-qa.md` fully covers usage. No changes needed.

### 3d. Structuring combined workflows

**Decision rule** (add to `_agents/mcp-tools.md` if adopted):

```
IF check = "does element/role exist?" OR "what is ARIA structure?"
  → use agent-browser (cheap)

IF check = "does it look right?" OR "what are computed styles?" OR "does interaction work?"
  → use Playwright MCP (precise)
```

### 3e. Connecting agent-browser output to AI reasoning

agent-browser outputs plain text (accessibility tree). The AI reads this inline — no file saving needed. This makes it ideal as a **pre-flight check** before triggering heavier Playwright operations.

Example pre-flight sequence:
1. `agent-browser open <storybook-url>` → confirm component renders (text output)
2. If confirmed → `browser_evaluate` (Playwright) → verify CSS vars
3. If CSS vars OK → `browser_take_screenshot` → compare with Figma

---

## 4. Best Practices

### Use agent-browser when:
- You need to confirm an element/component exists before spending screenshot tokens
- Running an accessibility tree audit (roles, labels, landmarks)
- Working in a CI pipeline where screenshot overhead is undesirable
- Doing structural smoke tests across many stories in bulk
- The check is answerable from the accessibility tree alone (no visual verification needed)

### Use Playwright MCP when:
- You need visual output (screenshots for Figma comparison)
- You need to pierce Shadow DOM (`shadowRoot.querySelector`)
- You need real user interactions (hover, click, type, keyboard)
- You need computed styles (`getComputedStyle`)
- You need JS evaluation or console log capture
- You need network request inspection

### Token/Resource Efficiency
- **Front-load agent-browser checks** — a failed structural check costs near-zero context vs a failed screenshot
- **Batch agent-browser calls** across multiple story URLs before opening a single Playwright session
- **Screenshots only when needed** — avoid taking screenshots just to confirm "it loaded"
- **Image Compare threshold**: `< 0.5%` PASS, `0.5–2.0%` review, `> 2.0%` FAIL (already in `mcp-tools.md`)

### Maintainability
- Keep the **tool decision rule** in `_agents/mcp-tools.md` as a single source of truth
- Use **logical aliases** for both tools in workflow files (translate to `mcp{N}_` at runtime via the existing mapping table)
- If agent-browser is added as a workflow step, add it as a named alias (e.g., `ab_open`) in `mcp-tools.md` for consistency

---

## 5. Deliverables

### 5a. Workflow Sequence — Component QA with Both Tools

```
1. [agent-browser]     open storybook iframe URL → confirm element in accessibility tree
2. [Playwright MCP]    browser_evaluate → verify CSS vars resolve in shadowRoot
3. [Playwright MCP]    browser_take_screenshot → capture render
4. [Image Compare]     compare_image_with_url → diff vs Figma screenshot
5. [Playwright MCP]    browser_hover/click → test interactive states
6. [agent-browser]     re-check accessibility tree for state changes (ARIA expanded, etc.)
7. [Playwright MCP]    browser_console_messages → confirm no runtime errors
```

### 5b. Workflow Sequence — CI Regression Smoke Test

```
1. [agent-browser]     open each story URL → confirm renders (bulk, fast)
2. [agent-browser]     check ARIA roles/labels haven't regressed
3. [Playwright MCP]    screenshot critical stories → diff vs baseline
4. [Playwright MCP]    console_messages across all stories → any new errors?
```

### 5c. Workflow Diagram (text)

```
Figma MCP ──────────────────────────────────────────────┐
                                                         ▼
agent-browser ──[structure OK?]──► NO → stop, debug first
                       │
                      YES
                       ▼
Playwright MCP ──[CSS vars OK?]──► NO → fix tokens → yarn tokens.build
                       │
                      YES
                       ▼
Playwright MCP ──[screenshot]──► Image Compare MCP ──[diff < 0.5%?]──► PASS
                                                         │
                                                        FAIL
                                                         ▼
                                              fix → rebuild → repeat
```

### 5d. Scaling Recommendations

- **Per-engineer**: Both tools run locally. agent-browser is CLI-only, no MCP config needed.
- **CI/CD**: Use agent-browser for pre-merge structural smoke tests (fast, no display server needed). Gate Playwright visual regression tests on `main` branch only or nightly to manage cost.
- **Team adoption**: Add a `## Browser Tool Decision Guide` section to `_agents/mcp-tools.md` with the decision rule from §3d. This is the single place engineers check.
- **Windsurf workflows**: If adopted, add agent-browser pre-flight as a new step in `/new-component` and `/fix-visual-bug` workflows (optional — only after team trial).

---

## 6. Quick-Decision Guide — Visual Verification vs Pixel-Perfect Validation

The core question at each QA step: **"Am I checking that something exists and is structured correctly, or am I checking that it looks exactly right?"**

### When agent-browser is sufficient for visual verification

Use agent-browser when the check can be answered by the **accessibility tree alone** — i.e., you only need to confirm *presence*, *role*, *label*, or *state*, not *appearance*.

| Scenario | agent-browser check | Why it's sufficient |
|---|---|---|
| Component rendered after navigation | `agent-browser open <url>` → tree contains element | Confirms mount without screenshot |
| Correct ARIA role on interactive element | Tree shows `role="button"`, `role="dialog"`, etc. | Role is structural, not visual |
| Label / accessible name present | Tree shows `name="Submit"` on button | a11y name is in the tree |
| Disabled state reflected in tree | Tree shows `disabled` / `aria-disabled="true"` | Attribute state, not color |
| Expanded/collapsed state | `aria-expanded="true/false"` in tree | ARIA state, not animation |
| Story iframe loads without crash | Tree is non-empty | Smoke test only |
| Slot content is present | Tree contains child text/element | Structural check |

**Do NOT use agent-browser for**: verifying colors, spacing, font sizes, shadows, borders, hover/focus ring appearance, or any pixel value — it cannot see computed styles.

### When Playwright MCP is required for pixel-perfect validation

Use Playwright MCP when the check requires **visual output or computed style data**:

| Scenario | Playwright MCP tool | Why agent-browser can't do it |
|---|---|---|
| Colors match Figma | `browser_evaluate` → `getComputedStyle` | CSS values not in accessibility tree |
| Spacing/padding exact | `browser_evaluate` → computed padding | Pixel values require style inspection |
| Shadow DOM token resolved | `browser_evaluate` on `shadowRoot` | agent-browser can't pierce shadow DOM |
| Screenshot diff vs Figma | `browser_take_screenshot` + Image Compare | Needs visual output |
| Hover state appearance | `browser_hover` → screenshot | Requires event dispatch + render |
| Focus ring visible | `browser_press_key(Tab)` → screenshot | Requires keyboard event + render |
| Responsive layout correct | `browser_resize` → screenshot | Needs pixel-level layout check |
| Console errors present | `browser_console_messages` | Runtime JS errors not in tree |
| Animation / transition | `browser_take_screenshot` at timed interval | Visual output only |

### Decision flowchart (inline)

```
New QA check needed
        │
        ▼
"Does this check need a pixel value,
 computed style, screenshot, or
 user interaction to answer?"
        │
       YES ──────────────────► Playwright MCP
        │
        NO
        │
        ▼
"Is the answer in the accessibility
 tree? (role, label, state, presence)"
        │
       YES ──────────────────► agent-browser (fast, cheap)
        │
        NO
        │
        ▼
   Playwright MCP (default)
```

---

## 7. UI/Component Check Safety Matrix

This matrix maps every common check type in this design system to the correct tool. **"Safe with agent-browser"** means the accessibility tree is authoritative for that check. **"Requires Playwright MCP"** means computed style, shadow DOM, or visual output is needed.

### Structural & Semantic Checks — Safe with agent-browser

| Check | What to look for in tree |
|---|---|
| Component renders | Element present in accessibility tree |
| Correct element role | `role="button"`, `role="combobox"`, `role="dialog"`, etc. |
| Accessible name / label | `name` property on interactive elements |
| `disabled` attribute | `disabled` or `aria-disabled="true"` |
| `required` attribute | `aria-required="true"` |
| `invalid` / error state | `aria-invalid="true"` |
| `expanded` state (dropdown, accordion) | `aria-expanded="true/false"` |
| `selected` state (tab, option) | `aria-selected="true/false"` |
| `checked` state (checkbox, radio) | `checked` or `aria-checked` |
| Slot content present | Child text/element nodes in tree |
| Landmark regions | `role="navigation"`, `role="main"`, etc. |
| Modal / dialog open | `role="dialog"` + `aria-modal="true"` in tree |
| Number of items rendered | Count child nodes in list/grid |
| Story loads (smoke test) | Tree is non-empty / no error node |

### Visual & Behavioral Checks — Require Playwright MCP

| Check | Playwright MCP method |
|---|---|
| Background color matches token | `browser_evaluate` → `getComputedStyle().backgroundColor` |
| Text color matches token | `browser_evaluate` → `getComputedStyle().color` |
| Border color / radius matches | `browser_evaluate` → `borderColor`, `borderRadius` |
| Padding / margin exact (px) | `browser_evaluate` → `padding`, `margin` |
| Font size / weight / family | `browser_evaluate` → `fontSize`, `fontWeight` |
| Box shadow present | `browser_evaluate` → `boxShadow` |
| Opacity (disabled state) | `browser_evaluate` → `opacity` |
| Token CSS var resolves (not `rgba(0,0,0,0)`) | `browser_evaluate` on shadowRoot element |
| Screenshot diff vs Figma baseline | `browser_take_screenshot` + `compare_image_with_url` |
| Hover state colors | `browser_hover` → `browser_evaluate` |
| Focus ring visible + color | `browser_press_key(Tab)` → screenshot/evaluate |
| Active/pressed state | `browser_click` (hold) → evaluate |
| Responsive layout (no overflow) | `browser_resize` → screenshot |
| Dropdown opens to correct position | `browser_click` → `browser_evaluate` bounding rect |
| Animation / transition fires | `browser_evaluate` after delay |
| Console errors after interaction | `browser_console_messages({ level: 'error' })` |
| Network requests triggered | `browser_network_requests` |

### Stencil Shadow DOM — Always Playwright MCP

All shadow DOM checks require Playwright MCP. agent-browser **cannot** pierce Shadow DOM boundaries.

| Stencil-specific check | Playwright MCP method |
|---|---|
| CSS custom property resolves | `browser_evaluate` → `getComputedStyle` on `shadowRoot.querySelector(...)` |
| Internal element exists (`.button`, `.input`, etc.) | `browser_evaluate` → `shadowRoot.querySelector(...)` |
| Internal class applied (`.is-disabled`, `.has-error`) | `browser_evaluate` → `shadowRoot.querySelector(...).classList` |
| Slot content renders inside shadow | `browser_evaluate` → `assignedNodes()` on slot |

---

## Implementation Priority

If you decide to adopt this plan:

1. **Immediate (no code change)**: Start using agent-browser manually for existence checks before Playwright sessions
2. **Short-term**: Add the tool decision rule to `_agents/mcp-tools.md`
3. **Medium-term**: Add agent-browser pre-flight step to `pixel-perfect-qa.md` Step 1.5
4. **Long-term**: CI pipeline integration for regression smoke tests
