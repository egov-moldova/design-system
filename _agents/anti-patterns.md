# Anti-Patterns — Never Do These

## Scope

Complete list of forbidden patterns. **Read before writing component code.**

---

## CSS & Tokens

1. **Hardcoded values in CSS** — always use `var(--token-name)` or `var(--token, var(--fallback))`
2. **Inline styles in TSX** — breaks theming, violates CSP
3. **Use `!important`** — never; use proper specificity and token fallbacks. Shadow DOM prevents conflicts
4. **Round Figma values** — use exact dimensions (`48px` not `50px`). NO rounding
5. **Palette token as CSS fallback** — `var(--token, var(--palette-ui-gray-9))` is forbidden. Use semantic `--color-*` tokens. See `tokens/_agents/semantic-tokens.md`
6. **Direct palette token in CSS** — `var(--palette-ui-gray-13)` is forbidden. Use `var(--color-neutral-text-default)` or component token wrapper
7. **Skip `yarn tokens.build`** after token changes — CSS vars won't update
8. **Skip build entirely** — use targeted commands per `_agents/environment-commands.md` during dev; full `yarn build` for final QA

## Component Architecture

9. **Direct DOM manipulation** outside `componentDidLoad` / event handlers
10. **`any` type in TypeScript** — use proper interfaces. Exception: Storybook stories may use `(args: any)` as a fallback, but prefer a component-specific args type when practical. See `_agents/typescript-strict.md`
11. **Modify generated files** — `components.d.ts`, `.storybook/custom-elements.json`
12. **Boolean props for slot control** — never use boolean props to control slot rendering/visibility. Use CSS `:empty` or slot detection. See `src/components/_agents/slot-patterns.md`
13. **Missing `!` on decorator properties** — `@Element()`, `@Event()`, `@AttachInternals()` MUST have `!`. See `_agents/typescript-strict.md`
14. **Implicit `any` in story renders** — never leave render args untyped. Use `(args: ComponentArgs) =>` (preferred) or `(args: any) =>` (fallback). See `_agents/typescript-strict.md`
15. **Optional chaining without `??`** — must use `?? ''`. See `_agents/typescript-strict.md`
16. **Untyped object maps** — use `Record<string, T>`. See `_agents/typescript-strict.md`
17. **Inline slot validation constants** — use shared constants from `src/components/shared.constants.ts`
18. **Shadow DOM `element.find()` in E2E** — use `page.find('cor-input >>> input')`. See `src/components/_agents/e2e-testing.md`
26. **Imperative `classList` manipulation for state-driven classes** — never use `this.host.classList.add/remove()` in lifecycle methods or event handlers for component state. Use declarative `getHostClasses()` pattern. See `src/components/_agents/component-structure.md §Host Class Management`

## Design Fidelity

19. **Ignore states** — every interactive component needs: default, hover, active, focus-visible, disabled
20. **Forget accessibility** — ARIA labels, keyboard nav, focus rings, color contrast
21. **Assume Figma match** — always screenshot-compare; human eye misses 1–2px diffs
22. **Use placeholder images** — download real assets from Figma; verify >10KB
23. **Add elements not in Figma** — never add sections/components/decorations not in the design
24. **Assume full-width** — check Figma for exact width constraints
25. **Non-functional interactive elements** — search bars must filter, dropdowns must open/close, tabs must switch content. Decorative-only interactive elements are forbidden
