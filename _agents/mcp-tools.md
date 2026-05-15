# MCP Tools Reference — All Tools, Prefix Mapping, Corrections

## Scope
Complete MCP tool reference with correct prefixes and parameter names. **Read when calling any MCP tool.**

---

## MCP Prefix → Server Mapping

Windsurf assigns `mcp{N}_` prefixes based on **registration order** in `mcp_config.json`. Disabled servers **reserve their slot**.

| Server | Current Prefix | Logical Alias | Examples |
| --- | --- | --- | --- |
| **GitKraken** | `mcp0_` | **`git_*`** | `git_log`, `git_status` |
| **a11y-mcp** | `mcp1_` | **`a11y_*`** | `a11y_check` (DISABLED) |
| **agentation** | `mcp2_` | **`agent_*`** | `agent_get_pending`, `agent_acknowledge` |
| **chrome-devtools** | `mcp3_` | **`chrome_*`** | `chrome_*` (DISABLED) |
| **Context7** | `mcp4_` | **`ctx7_*`** | `ctx7_query-docs`, `ctx7_resolve-library-id` |
| **fetch** | `mcp5_` | **`fetch_*`** | `fetch_*` (DISABLED) |
| **figma-desktop** | `mcp6_` | **`figma_desktop_*`** | `figma_desktop_*` (DISABLED) |
| **figma-remote-mcp-server** | `mcp7_` | **`figma_*`** | `figma_get_design_context` |
| **filesystem** | `mcp8_` | **`fs_*`** | `fs_read_file`, `fs_write_file` |
| **mcp-image-compare** | `mcp9_` | **`compare_*`** | `compare_images`, `compare_urls` |
| **mcp-playwright** | `mcp10_` | **`browser_*`** | `browser_snapshot`, `browser_navigate` |
| **memory** | `mcp11_` | **`memory_*`** | `memory_read_graph`, `memory_search_nodes` |
| **sequential-thinking** | `mcp12_` | **`sequential_*`** | `sequential_*` (DISABLED) |
| **Snyk** | `mcp13_` | **`snyk_*`** | `snyk_code_scan`, `snyk_sca_scan` |

### Translation Protocol
**When you see a Logical Alias in any `.md` file, you MUST translate it to the Current Prefix before execution.**

1. **Check this table** for the mapping.
2. **Execute** using the `mcp{N}_` prefix.

> ⚠️ **Maintenance**: Only this table needs to be updated if the `mcp_config.json` registration order changes. All workflows and skills use Logical Aliases.
>
> ⚠️ If servers are added/removed/reordered in `mcp_config.json`, ALL prefixes may shift. Verify before calling.
>
> ⚠️ **Disabled servers reserve their slots** - a11y-mcp (mcp1_), chrome-devtools (mcp3_), fetch (mcp5_), figma-desktop (mcp6_), sequential-thinking (mcp12_) are disabled but their prefixes are reserved.

---

## agentation MCP (`agent_*`)

Annotation system for AI agent feedback and collaboration.

```text
agent_get_pending({ sessionId: "..." })
agent_acknowledge({ annotationId: "..." })
agent_resolve({ annotationId: "...", summary: "..." })
agent_reply({ annotationId: "...", message: "..." })
agent_watch_annotations({ sessionId: "...", timeoutSeconds: 120 })
```

**Use when**:

- Human provides feedback via browser annotations
- Need to acknowledge, resolve, or reply to feedback
- Watching for new annotations during development

---

## filesystem MCP (`fs_*`)

File system operations for reading, writing, and managing files.

```text
fs_read_file({ path: "..." })
fs_write_file({ path: "...", content: "..." })
fs_list_directory({ path: "..." })
fs_create_directory({ path: "..." })
fs_move_file({ source: "...", destination: "..." })
fs_search_files({ path: "...", pattern: "..." })
```

**Use when**:

- Reading/writing project files
- Creating directory structures
- Searching for files by pattern
- File system management tasks

---

## Memory MCP (`memory_*`)

Knowledge graph for storing and retrieving contextual information.

```text
memory_read_graph()
memory_search_nodes({ query: "..." })
memory_create_entities({ entities: [...] })
memory_create_relations({ relations: [...] })
memory_open_nodes({ names: [...] })
```

**Use when**:

- Storing component architecture decisions
- Maintaining project context across conversations
- Building knowledge graphs of relationships
- Retrieving stored contextual information

---

## Figma Remote MCP (`figma_*`)

```text
figma_get_design_context({ nodeId: "123:456", forceCode: true })
figma_get_screenshot({ nodeId: "123:456" })
figma_get_metadata({ nodeId: "123:456" })
figma_get_variable_defs({ nodeId: "123:456" })
figma_generate_diagram({ mermaidSyntax: "...", name: "..." })
figma_create_new_file({ fileName: "...", planKey: "...", editorType: "design" })
figma_add_code_connect_map({ nodeId: "...", fileKey: "...", source: "...", componentName: "...", label: "React" })
```

### Component Behavior via `figma_get_metadata`

Use **BEFORE** visual extraction to identify:

1. **Component Type**: `COMPONENT` / `INSTANCE` / `FRAME`
2. **Main Component Navigation**: If instance → navigate to `mainComponent.id`
3. **Variants**: All variant properties + possible values
4. **Interactive States**: hover, pressed, focus, disabled, selected
5. **Auto Layout**: Direction, spacing, padding, alignment

**Instance workflow**:
```javascript
const metadata = figma_get_metadata({ nodeId: "123:456" });
// If INSTANCE → navigate to main component
const mainMetadata = figma_get_metadata({ nodeId: metadata.mainComponent.id });
// Extract from BOTH
figma_get_design_context({ nodeId: "123:456", forceCode: true });
figma_get_design_context({ nodeId: mainMetadata.id, forceCode: true });
```

---

## Context7 MCP (`ctx7_*`)

```text
ctx7_resolve-library-id({ libraryName: "stenciljs", query: "..." })
ctx7_query-docs({ libraryId: "...", query: "..." })
```

| Library | Typical ID | Use Case |
| --- | --- | --- |
| StencilJS | `/AydenRain/stencil-site` | Component APIs, decorators, form association |
| Style Dictionary | `/amzn/style-dictionary` | Token transforms, formats, config |
| Storybook | `/storybookjs/storybook` | CSF3 format, addons, argTypes |

Always call `resolve-library-id` first, then `query-docs`.

---

## Playwright MCP (`browser_*`)

```text
browser_navigate({ url: "..." })
browser_take_screenshot({ type: "png", filename: "..." })
browser_snapshot()
browser_hover({ ref: "...", element: "..." })
browser_click({ ref: "...", element: "..." })
browser_evaluate({ function: "..." })
browser_console_messages({ level: "error" })
```

---

## Snyk MCP (`snyk_*`)

Security scanning for vulnerabilities in code, dependencies, containers, and IaC.

```text
snyk_code_scan({ path: "...", severity_threshold: "high" })
snyk_sca_scan({ path: "...", command: "python3" })
snyk_container_scan({ image: "...", severity_threshold: "critical" })
snyk_iac_scan({ path: "...", report: true })
snyk_sbom_scan({ file: "..." })
```

**Use when**:

- Scanning for security vulnerabilities
- Checking dependencies for known issues
- Container image security analysis
- Infrastructure as Code security checks
- Software Bill of Materials analysis

---

## agent-browser CLI (`ab_*`)

Headless browser CLI for AI agents (Vercel Labs, native Rust). Outputs a compact **accessibility tree** — not screenshots or raw HTML. **Install once**: `npm install -g agent-browser` → `agent-browser install`.

```bash
# Confirm component renders and check accessibility tree
ab_open → agent-browser open <url>

# Examples
agent-browser open http://localhost:6007/iframe.html?id=atoms-cor-button--default
agent-browser open http://localhost:6007/iframe.html?id=atoms-cor-input--default
```

**Use agent-browser when** the check can be answered by the accessibility tree alone:
- Element/component renders (presence check)
- Correct ARIA role (`role="button"`, `role="combobox"`, etc.)
- Accessible name / label on interactive elements
- Attribute states: `disabled`, `aria-disabled`, `required`, `aria-invalid`
- ARIA states: `aria-expanded`, `aria-selected`, `aria-checked`
- Slot content present (child nodes in tree)
- Story iframe loads without crash (smoke test)

**Do NOT use agent-browser for**: colors, spacing, font sizes, shadows, borders, hover/focus ring appearance, computed styles, shadow DOM internals — use Playwright MCP instead.

---

## Image Compare MCP (`compare_*`)

```text
compare_images({ image1_path: "...", image2_path: "...", diff_output_path: "..." })
compare_image_with_url({ image_path: "...", url: "...", diff_output_path: "..." })
```

**Thresholds**: `< 0.5%` → PASS | `0.5–2.0%` → WARNING (review) | `> 2.0%` → FAIL

---

## Browser Tool Decision Guide

At each QA step, ask: **"Does this check need a pixel value, computed style, screenshot, or user interaction?"**

```
YES → Playwright MCP (browser_*)
 NO → "Is the answer in the accessibility tree?"
       YES → agent-browser (fast, cheap)
        NO → Playwright MCP (default)
```

### Safe with agent-browser (accessibility tree is authoritative)

| Check | What to look for |
| --- | --- |
| Component renders | Element present in tree |
| Correct element role | `role="button"`, `role="combobox"`, `role="dialog"`, etc. |
| Accessible name / label | `name` property on interactive elements |
| `disabled` state | `disabled` or `aria-disabled="true"` |
| `required` / `invalid` | `aria-required`, `aria-invalid="true"` |
| `expanded` / `selected` / `checked` | `aria-expanded`, `aria-selected`, `aria-checked` |
| Slot content present | Child text/element nodes in tree |
| Modal / dialog open | `role="dialog"` + `aria-modal="true"` |
| Story smoke test | Tree is non-empty / no error node |

### Requires Playwright MCP (visual or computed style)

| Check | Playwright MCP method |
| --- | --- |
| Colors match token | `browser_evaluate` → `getComputedStyle().backgroundColor/color` |
| Spacing/padding exact | `browser_evaluate` → `padding`, `margin` |
| Typography | `browser_evaluate` → `fontSize`, `fontWeight`, `fontFamily` |
| Box shadow, border radius | `browser_evaluate` → `boxShadow`, `borderRadius` |
| Opacity (disabled) | `browser_evaluate` → `opacity` |
| Token CSS var resolves | `browser_evaluate` on `shadowRoot.querySelector(...)` |
| Screenshot diff vs Figma | `browser_take_screenshot` + `compare_image_with_url` |
| Hover / focus / active state | `browser_hover`, `browser_press_key(Tab)`, `browser_click` |
| Responsive layout | `browser_resize` → screenshot |
| Console errors | `browser_console_messages({ level: 'error' })` |

### Stencil Shadow DOM — always Playwright MCP

agent-browser **cannot** pierce Shadow DOM. All internal Stencil element checks require:

```javascript
browser_evaluate({
  function: `() => {
    const el = document.querySelector('cor-[name]')?.shadowRoot?.querySelector('.inner-el');
    return window.getComputedStyle(el).backgroundColor;
  }`
})
```

---

## Skill File Tool Name Corrections

| Skill/Legacy Says | Logical Alias |
| --- | --- |
| `figma_get_metadata({ node_id })` | `figma_get_metadata` |
| `figma_get_design_context({ node_id })` | `figma_get_design_context` |
| `mcp{N}_browser_*` | `browser_*` |
| `mcp{N}_compare_*` | `compare_*` |

---

## Critical Override Rules (Apply to ALL Skills)

1. **MCP prefixes**: GitKraken = `mcp0_`, a11y-mcp = `mcp1_`, agentation = `mcp2_`, chrome-devtools = `mcp3_`, Context7 = `mcp4_`, fetch = `mcp5_`, figma-desktop = `mcp6_`, figma-remote = `mcp7_`, filesystem = `mcp8_`, Image Compare = `mcp9_`, Playwright = `mcp10_`, Memory = `mcp11_`, sequential-thinking = `mcp12_`, Snyk = `mcp13_`
2. **Port**: Storybook runs on **6007** - never 6006
3. **Shell**: Cross-platform project - support both **PowerShell** (Windows) and **Unix** (macOS/Linux) commands.
4. **Build commands**: Always **`yarn`**, never `npm run`
5. **CSS patterns**: `:host([attr])` + `::slotted(*)` for slot components
6. **Tokens**: JSON → Style Dictionary → CSS vars → component CSS
7. **Props**: `@Prop({ reflect: true })` default for visual props
8. **Story format**: CSF3 with `@storybook/web-components`, string tag names
9. **Environment**: Always check `_agents/environment-commands.md` before starting servers
