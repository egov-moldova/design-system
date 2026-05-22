# MCP Tools Reference — All Tools, Prefix Mapping, Corrections

## Scope
Complete MCP tool reference with correct prefixes and parameter names. **Read when calling any MCP tool.**

---

## Claude Code Tool Names

Claude Code reads MCP servers from `.mcp.json` at repo root. Tools are exposed as `mcp__<server-name>__<tool>`.

| Server | Logical Alias | Claude Code tool prefix | Examples |
| --- | --- | --- | --- |
| **playwright** | `browser_*` | `mcp__playwright__browser_*` | `mcp__playwright__browser_navigate`, `mcp__playwright__browser_snapshot` |
| **chrome-devtools** | `cdt_*` | `mcp__chrome-devtools__*` | `mcp__chrome-devtools__performance_start_trace`, `mcp__chrome-devtools__lighthouse_audit` |
| **figma** | `figma_*` | `mcp__figma__*` | `mcp__figma__get_design_context`, `mcp__figma__get_screenshot` |
| **context7** | `ctx7_*` | `mcp__context7__*` | `mcp__context7__resolve-library-id`, `mcp__context7__get-library-docs` |
| **image-compare** | `compare_*` | `mcp__image-compare__*` | `mcp__image-compare__compare_images` |
| **agentation** | `agent_*` | `mcp__agentation__*` | `mcp__agentation__get_pending` |

**Configuration**: `.mcp.json` at repo root. Edit there to add/remove servers — restart Claude Code to pick up changes.

**Replaced by native Claude Code tools** (no MCP needed):
- Filesystem ops → `Read`, `Write`, `Edit`, `Glob`, `Grep`
- Git ops → `Bash` with `git` CLI
- Memory → auto-memory at `~/.claude/projects/<project>/memory/`
- Web fetch → `WebFetch` / `WebSearch`

**Security scanning** (used in `audit-production`): run Snyk via Bash (`yarn snyk:test` or `npx snyk test`) — no MCP server configured.

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
browser_take_screenshot({ type: "png", filename: ".playwright-mcp/<name>.png" })   // ALWAYS prefix with `.playwright-mcp/` — bare filenames land in repo root (Playwright MCP resolves them against cwd, not --output-dir)
browser_snapshot()
browser_hover({ ref: "...", element: "..." })
browser_click({ ref: "...", element: "..." })
browser_evaluate({ function: "..." })
browser_console_messages({ level: "error" })
```

**Use for**: visual checks (computed styles, screenshots, hover/focus), Shadow DOM piercing, Figma pixel diff loop, generic E2E interactions. Default browser MCP.

---

## Chrome DevTools MCP (`cdt_*`)

Native Chrome DevTools Protocol bridge — adds performance traces, Lighthouse audits, deep network inspection, heap profiling and source-mapped console that Playwright MCP does not expose. Runs `--headless --isolated` (temp profile, auto-cleanup) so it does **not** share state with Playwright MCP's Chromium.

### Performance (3)

```text
performance_start_trace({ reload: true, autoStop: true })
performance_stop_trace()
performance_analyze_insight({ insight: "LCP" | "CLS" | "TBT" | ... })
```

### Debugging (8)

```text
lighthouse_audit({ url: "...", categories: ["performance","accessibility","best-practices"] })
evaluate_script({ function: "() => ..." })
list_console_messages()
get_console_message({ id: "..." })
take_screenshot({ format: "png", fullPage: false })
take_snapshot()              // accessibility tree
screencast_start() / screencast_stop()
```

### Network (2)

```text
list_network_requests({ resourceTypes: ["fetch","xhr","script","stylesheet"] })
get_network_request({ url: "..." })
```

### Memory / Heap (5)

```text
take_heapsnapshot()
get_heapsnapshot_summary()
get_heapsnapshot_details({ snapshotId: "..." })
get_heapsnapshot_class_nodes({ className: "HTMLElement" })
get_heapsnapshot_retainers({ nodeId: "..." })
```

### Navigation & input (16)

`navigate_page`, `new_page`, `list_pages`, `select_page`, `close_page`, `wait_for`, `click`, `click_at`, `drag`, `fill`, `fill_form`, `hover`, `press_key`, `type_text`, `upload_file`, `handle_dialog`

### Emulation (2)

`emulate({ device: "..." })`, `resize_page({ width, height })`

**Use for**: Lighthouse pass in `audit-production` and `pre-pr-check`, perf regressions on Storybook iframe, network failure debugging, memory-leak hunts in long-running stories. **Do NOT** use it as the default browser MCP — Playwright MCP stays primary because the rest of the audit pipeline (`pixel-perfect-verifier`, `a11y-verifier`, `scripts/audit/*.mjs`) is wired to `mcp__playwright__*` tool names.

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

Three browser tools, three jobs. Pick the cheapest that answers the question:

```
Q1: Is it perf / network / memory / Lighthouse?
     YES → Chrome DevTools MCP (mcp__chrome-devtools__*)
      NO ↓
Q2: Does it need a pixel value, computed style, screenshot,
    Shadow DOM access, or an interactive state (hover/focus/active)?
     YES → Playwright MCP (mcp__playwright__browser_*)
      NO ↓
Q3: Can the answer come from the accessibility tree alone?
     YES → agent-browser CLI (cheapest, ~200-400 tok per snapshot)
      NO → Playwright MCP (default fallback)
```

### Pick Chrome DevTools MCP for

| Check | Tool |
| --- | --- |
| Page-load performance / Core Web Vitals on a story | `performance_start_trace` → `performance_stop_trace` → `performance_analyze_insight` |
| Lighthouse audit (perf, a11y, best-practices) | `lighthouse_audit` |
| Network request list / failed requests / slow assets | `list_network_requests`, `get_network_request` |
| Console with source-mapped stack traces | `list_console_messages`, `get_console_message` |
| Memory leak / DOM retention in long-running story | `take_heapsnapshot` → `get_heapsnapshot_summary` / `_retainers` |
| Device emulation for responsive perf | `emulate` + `performance_start_trace` |

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

| Skill Says | Claude Code Tool |
| --- | --- |
| `figma_get_metadata({ node_id })` | `mcp__figma__get_metadata` |
| `figma_get_design_context({ node_id })` | `mcp__figma__get_design_context` |
| `browser_*` | `mcp__playwright__browser_*` |
| `cdt_*` / `chrome_devtools_*` / `performance_*` / `lighthouse_*` | `mcp__chrome-devtools__*` |
| `compare_*` | `mcp__image-compare__*` |

---

## Critical Override Rules (Apply to ALL Skills)

1. **Port**: Storybook runs on **6007** - never 6006
2. **Shell**: Cross-platform project - support both **PowerShell** (Windows) and **Unix** (macOS/Linux) commands.
3. **Build commands**: Always **`yarn`**, never `npm run`
4. **CSS patterns**: `:host([attr])` + `::slotted(*)` for slot components
5. **Tokens**: JSON → Style Dictionary → CSS vars → component CSS
6. **Props**: `@Prop({ reflect: true })` default for visual props
7. **Story format**: CSF3 with `@storybook/web-components-vite`, string tag names
8. **Environment**: Always check `_agents/environment-commands.md` before starting servers
