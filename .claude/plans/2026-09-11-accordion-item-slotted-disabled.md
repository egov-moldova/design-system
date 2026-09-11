# mud-accordion-item — Stop Clobbering the Consumer's `disabled` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `mud-accordion-item` keeps mirroring its own `disabled` onto the controls a consumer slots into its header, but takes back only what it itself wrote — so a control the consumer shipped already `disabled` is never silently re-enabled.

**Architecture:** Option A′. Replace the unconditional subtree walk with a bookkeeping sync: on disable, write `disabled` onto the elements DIRECTLY assigned to the `heading` / `supporting` / `trailing` slots, skipping any that already carry it, and record the ones written in a `Set`; on enable, remove `disabled` from exactly that recorded set and clear it. Elements the consumer disabled never enter the set and are therefore never touched. The sync is additionally wired to the three `slotchange` handlers, which the previous implementation lacked, so content that arrives while the item is already disabled is covered. One `::slotted(*)` rule with `pointer-events: none !important` remains as a mouse net for the two things the attribute cannot do: a control nested inside a slotted wrapper, which the narrowed write deliberately no longer reaches, and a slotted element with no `disabled` behaviour of its own. The sync also prunes — an element that leaves the header while the item is disabled gets the attribute back immediately rather than being held until an enable that may never come.

**Tech Stack:** Stencil 4.x (shadow DOM, `@Watch`, `componentDidLoad`), Vitest `spec` project (mock-doc) via `yarn test.dev`, Vitest `storybook` project (Playwright/Chromium) via `yarn test.storybook`, Storybook 9 CSF3.

**Spec:** https://github.com/egov-moldova/design-system/issues/17 — plus the `### Options` table and `## Decision` section below, which record the contract gate the issue names but deliberately leaves open.

**Reviewed:** preflight 175b5b1 preflight 175b5b1 preflight 175b5b1 verify 048ae89 — three preflight legs over this revision before any code (FORTIFY, CONFIRM, then a closing leg over the fortification returning RETHINK and right twice), then `/code-review low` over the built change (4 findings, 3 accepted and fixed in 048ae89), then a verify round against this plan: CONFIRM (high), 0 above-bar findings, 1 beyond-bar cosmetic with no action. The closing preflight leg's catch worth keeping: the bar's own discriminator for the pre-existing storybook-lane failure matched on the keyword "accordion", which the pre-existing error text itself contains — a threshold that failed closed on the exact case it had to pass. Three earlier rounds at c0addf0 (preflight, critic, critic) graded a DIFFERENT decision — option C, "never write the attribute" — which was implemented, failed the merge gate, and is replaced here.

## The problem

`mud-accordion-item.propagateSummaryDisabled` wrote `disabled` onto every element
assigned to the `heading`, `supporting` and `trailing` slots *and onto all of their
descendants*, then removed it unconditionally when the item was re-enabled. It
therefore could not tell the attributes it set from the ones the consumer authored,
so a control shipped as `<mud-button slot="trailing" disabled>` came back enabled the
moment the item's own `disabled` went false — with no event and no warning.

The cause is not that the component writes the attribute. It is that it writes
without evidence: it has no record of what it wrote, so on the way back it guesses,
and the guess is "everything". The fix is the record.

## Global Constraints

- Base branch is `main` at `c0addf0`. Work on `fix/issue-17-accordion-item-slotted-disabled`.
- Every authored file is English — code, comments, JSDoc, commit messages.
- Do not touch `src/legacy/cor-accordion/cor-accordion.tsx:92`. It carries the same bug, is archived, is not shipped, and has no test lane of its own.
- Do not touch the three existing `disabled` spec tests (`src/components/mud-accordion-item/test/mud-accordion-item.spec.tsx:8`, `:46`, `:83`). They must keep passing unchanged.
- No rebase from PR #13 (`feature/92077-refactor-components`) — it touches no accordion file.
- Issue #9 will sweep JSDoc across `mud-accordion-item.tsx`. This plan edits the class-level doc block; say so in the PR.
- `readme.md` is fully generated below `<!-- Auto Generated Below -->`; never hand-edit it. Prose reaches it through the class-level JSDoc plus `yarn build`.
- `@part header` is a published contract on 1.0.6 and does not move.

---

## Decision

### Options

| Option | Complexity added now | Cost to build | Cost to maintain | Cost to reverse | Risk | Value |
| --- | --- | --- | --- | --- | --- | --- |
| **A′** ← chosen — write `disabled` only on directly assigned elements, remember exactly what was written | low — one `Set` field and one method, replacing a method that already existed | low — 4 files | low — the set is written and cleared in one place, and its lifetime is one disabled period | low — the public surface is unchanged from shipped 1.0.6; nothing new is published to unwind | A control NESTED inside a slotted wrapper no longer receives the attribute, and keyboard reach into it is not closed | The consumer's `disabled` survives; every slotted control keeps rendering its own exact disabled tokens; slotted form controls stay excluded from submission and validation |
| **B** — keep the subtree walk, add the same bookkeeping | med — the same bookkeeping, applied to DOM the consumer never handed to a slot | low — 4 files | high — subtree walk on every change (the old JSDoc already called it "heavy-handed"), and the set grows with the subtree | low | Keeps claiming DOM that was never slotted, which is the overreach behind #17's second half | Nothing regresses for nested controls |
| **C** — never write the attribute; express the state in the component's own stylesheet | low — no runtime state at all | low — 2 files + 1 story | low | high — publishes a visual treatment and a token consumers build on | Slotted controls lose their own disabled tokens; a dimmed-but-not-disabled control was measured at 1.23:1 contrast; `filter` makes each slotted element a containing block; slotted form controls re-enter form submission | The ownership collision becomes unrepresentable |

**Recommendation: A′,** and this reverses the recommendation the three earlier review
rounds graded. C was implemented and then failed the merge gate on five counts —
contrast, form participation, `filter` creating a containing block for `position:
fixed` descendants, fallback-vs-slotted divergence against `AGENTS.md:92` rule 9, and
no guard in a lane CI actually runs. Four of those five are structural to "dim from
outside"; none of them exists under A′, which writes an attribute each control already
knows how to render and which the `spec` lane — the one CI runs — can assert.

Two further options were raised and are not in the table:

- **D — a second, container-owned cell** (`container-disabled` honoured by each slottable `mud-*`, reusing the pattern `mud-button` documents at `mud-button.tsx:167-174`). Deferred: a cross-cutting contract across the design system that cannot cover non-MUD slotted DOM, and `mud-tag`/`mud-badge` would first need a disabled design that does not exist. Building it now would be paying against a guess about the future.
- **F — render the `trailing` slot as a SIBLING of the header `<button>` rather than a child.** Interactive content inside a `<button>` is invalid HTML, and it is why the platform's own guards behave inconsistently here. Real, and out of scope: it changes the header's accessible name, the Tab order and the published `@part header` shape. It does NOT invalidate A′ — the sync resolves its slots through `shadowRoot.querySelector('slot[name=…]')` and `assignedElements()`, neither of which depends on where the slot is rendered. Opened as its own issue.

### Measured facts this decision rests on

All measured in Chromium through Playwright against the running demo, not recalled:

1. **The bug.** Item `disabled` → enabled strips a consumer-authored `disabled` from a slotted `mud-button`.
2. **The subtree claim is real.** A native `<button>` nested inside `<div slot="trailing">` — never handed to the component — also received `disabled`.
3. **A disabled native `<button>` ancestor does NOT block mouse clicks on its flat-tree slotted descendants.** A real click reached a slotted control carrying no `disabled` of its own. This is why the `pointer-events` net is kept for the nested case, and why removing the attribute entirely (option C) required replacing it.
4. **It does not block focus either.** An earlier reading of this session's own probe said it did; that reading was confounded by Stencil's async re-render. Re-measured after a settle: focus lands and activation fires. `disabled` does not propagate across the flat tree — only `<fieldset>` propagates, and only down the DOM tree (fact 5).
5. **A `<fieldset disabled>` inside the item's shadow root does not reach slotted light-DOM elements** — form association follows the DOM tree, not the flat tree — so `mud-button`'s `formDisabledCallback` cannot be reused across the boundary.
6. **`mud-tag` and `mud-badge` have zero `disabled` support** (0 occurrences across `.tsx` and `.css`). The attribute A′ writes onto them is inert: they look identical to today under a disabled item. That is not a regression against shipped 1.0.6 — it is exactly today's behaviour — but it is less than option C showed, and it is recorded in § Not Verified rather than claimed as covered.
7. **mock-doc implements `assignedElements`** (`node_modules/@stencil/core/mock-doc/index.js:8260`). Issue #17's claim that the bug is "unreachable from the `spec` project by construction" is false: a probe of the exact shape FAILED under `yarn test.dev` before the fix, with `after re-enable, authored keeps disabled: false`. The `spec` lane is therefore the primary guard.
7b. **CORRECTION, measured at gate time, and it falsifies what rows above and two commit messages on this branch assert: NO CI lane runs any test for this change.** An earlier revision of this plan claimed the `spec` lane "is the lane CI runs (`.github/workflows/ci.yml:250`)". It is not. That step runs `stencil test --spec --maxWorkers=2`, and running that exact command in this repo today errors out: `Please install supported versions of dev dependencies … jest@29`. `jest`, `jest-cli` and `@types/jest` are absent from `devDependencies` and from `node_modules` — the repo migrated to Vitest (`stencil.config.ts:107-108`). The step carries no `continue-on-error`. The only other pull-request job (`.github/workflows/ci.yml:141`, "Build (PR)") is a Docker build with no test step. So `yarn test.dev` passing is a LOCAL fact only, `yarn test.storybook` is broken separately (fact 8), and this branch ships with no automated guard executing anywhere. It is a pre-existing repo condition, not caused here, and it needs its own issue.
8. **`yarn test.storybook` is blocked repo-wide, before this branch, and it never reaches the test phase.** Run on this branch and the output captured: it dies inside `vite:dep-pre-bundle` with `"./dist/components/<component>.js" is not exported under the conditions ["storybook", …] from … react/node_modules/@egov-moldova/mud`, naming **57 distinct components** — the entire library, `mud-accordion-item.js` included. Cause: `react/src/index.ts` imports paths the narrowed `exports` map no longer exposes. Three properties of that output are what bar row 9 grades against, and all three were read off the captured run rather than assumed: the output contains **no `Test Files` or `Tests` summary line at all** (the run never reaches the test phase, so zero stories execute); it names **no `.stories.ts` file**; and the failure is identical on `mud-checkbox.stories.ts`, which this branch does not touch. It deserves its own issue and is not fixed here.
9. **mock-doc does not auto-dispatch `slotchange` on `appendChild`, but the handler wiring is still assertable.** Probed with a throwaway spec file against the real component: after `root.appendChild(el)` and `waitForChanges()`, a listener on the trailing `<slot>` counted `fired=0` while `slot.assignedElements()` correctly returned `1`. Dispatching `slotchange` by hand then reached the JSX-bound handler and the component reacted — `.trailing` gained `has-content`. So the `slotchange` call site added in Task 1 Step 4 IS covered in the `spec` lane, provided the test emits the event rather than waiting for mock-doc to. The probe file was deleted.

### Deviation from the issue's literal acceptance bar

None. Issue #17's bar items 1 and 2 both describe attribute observations, and A′ keeps
writing the attribute, so both hold literally.

Bar item 4 — "the gate decision is written where the next reader finds it" — is met by
the class-level JSDoc (which generates `readme.md`) plus `CHANGELOG.md`.

Bar item 3 has two halves and they part company. "The three existing spec tests are
untouched" holds — bar row 6. "`yarn test.storybook` passes" does NOT, and this is the
one hard literal requirement of issue #17 this plan does not meet. It is not met because
it is not currently meetable by anyone: the lane is broken repo-wide, before this branch,
on a cause that has nothing to do with the accordion (measured fact 8). Bar row 9 grades
it by that evidence rather than waiving it.

Bar item 7 asks for the regression test in the browser project. That story is written
(Task 3) in the established `play`-function shape, **but it cannot be executed on this
branch** — same cause, measured fact 8. The contract it asserts is also asserted in the
`spec` lane, which does run, and which is where the defect was actually reproduced.

### Consumer-visible behaviour change

Two, both narrower than what option C would have shipped:

1. `disabled` stops appearing on DESCENDANTS of slotted elements. A consumer who wrapped a control in `<div slot="trailing">` and relied on the walk reaching it loses that. Put the control directly in the slot.
2. A consumer's own `disabled` on a slotted control now survives the item's disable/enable cycle. That is the fix.

---

## File Structure

- `src/components/mud-accordion-item/mud-accordion-item.tsx` — restore a narrowed, bookkeeping propagation method and wire it to `@Watch('disabled')`, `componentDidLoad` and the three `slotchange` handlers; remove `inert` from the trailing wrapper; rewrite the class-level JSDoc contract paragraph.
- `src/components/mud-accordion-item/mud-accordion-item.css` — replace the dim block with a single `pointer-events: none` rule, no `!important`, no `opacity`, no `filter`.
- `tokens/core/components/accordion.tokens.json` — remove `item.slottedOpacity`, which loses its only consumer.
- `src/components/mud-accordion-item/test/mud-accordion-item.spec.tsx` — rewrite the one new `it()` to assert the A′ contract. The three protected tests are not touched.
- `src/components/mud-accordion-item/mud-accordion-item.stories.ts` — shrink `SlottedDisabledContract` to the A′ contract plus the one thing mock-doc cannot see (hit-testing a nested control).
- `src/components/mud-accordion/mud-accordion.stories.ts` — retarget the `Disabled` story's contract section at A′.
- `src/components/mud-accordion-item/readme.md` — regenerated, never hand-edited.
- `CHANGELOG.md` — rewrite the `## Unreleased` subsection for A′.

Single phase, four sequential tasks — no per-phase execution matrix applies.

---

### Task 1: Narrow the propagation and give it a memory

**Files:**
- Modify: `src/components/mud-accordion-item/mud-accordion-item.tsx`

**Interfaces:**
- Produces: `private syncSlottedDisabled(): void` and `private ownedDisabled: Set<Element>`, consumed by `watchDisabled`, `componentDidLoad` and the three `slotchange` handlers in the same file. Nothing outside the class sees either.

- [ ] **Step 1: Add the module-level slot list**

Above the class, beside `let uidSeed = 0;`:

```ts
/**
 * The header slots whose directly assigned elements mirror the item's own
 * `disabled`. The panel's default slot is deliberately absent: its content is
 * hidden when closed and is not part of the header's interactive row.
 */
const SUMMARY_SLOTS = ['heading', 'supporting', 'trailing'] as const;
```

- [ ] **Step 2: Add the bookkeeping field**

As the first private member of the class, above the `@State()` declarations:

```ts
  /**
   * The elements this component wrote `disabled` onto, so re-enabling gives back
   * exactly what was taken. An element that already carried `disabled` when the
   * item was disabled never enters this set and is never touched — that is the
   * whole of issue #17.
   *
   * Populated on disable and cleared on enable, so it holds references only for
   * as long as the item is disabled.
   */
  private ownedDisabled = new Set<Element>();
```

- [ ] **Step 3: Add the sync method**

Directly above `private slotHasContent`:

```ts
  /**
   * Mirror the item's `disabled` onto the elements directly assigned to the
   * header slots, recording what was written so it can be taken back precisely.
   *
   * Directly assigned ONLY. The previous implementation walked the whole
   * assigned subtree, which wrote into DOM the consumer never handed to a slot;
   * a control nested inside a slotted wrapper is not covered here, by design —
   * put controls directly in the slot.
   *
   * No-op before the first render, and in any environment without the slot API.
   */
  private syncSlottedDisabled() {
    if (!this.disabled) {
      for (const el of this.ownedDisabled) el.removeAttribute('disabled');
      this.ownedDisabled.clear();
      return;
    }
    const root = this.host.shadowRoot;
    if (!root) return;
    for (const name of SUMMARY_SLOTS) {
      const slot = root.querySelector<HTMLSlotElement>(`slot[name="${name}"]`);
      if (typeof slot?.assignedElements !== 'function') continue;
      for (const el of slot.assignedElements({ flatten: true })) {
        // Already disabled: either the consumer's own value, or ours from a
        // previous pass. Either way there is nothing to write and nothing to
        // record — a consumer value must never enter the set.
        if (el.hasAttribute('disabled')) continue;
        el.setAttribute('disabled', '');
        this.ownedDisabled.add(el);
      }
    }
  }
```

Note the enable branch runs BEFORE the `shadowRoot` guard, deliberately: giving back
what was taken must not depend on the slots still resolving.

- [ ] **Step 4: Wire the three call sites**

Extend the existing `@Watch('disabled')` handler:

```ts
  @Watch('disabled')
  watchDisabled(next: boolean) {
    if (next && this.open) {
      this.open = false;
    }
    this.syncSlottedDisabled();
  }
```

Add `componentDidLoad`, immediately after `connectedCallback` — an item that renders
with `disabled` already set fires no `@Watch`:

```ts
  componentDidLoad() {
    this.syncSlottedDisabled();
  }
```

And append the call to each of the three header `slotchange` handlers, e.g.:

```ts
  private onHeadingSlotChange = (ev: Event) => {
    this.hasHeadingSlot = this.slotHasContent(ev);
    this.syncSlottedDisabled();
  };
```

Same for `onSupportingSlotChange` and `onTrailingSlotChange`. NOT
`onIconStartSlotChange` — `icon-start` is not in `SUMMARY_SLOTS` and never was.

This is the one behavioural addition over the pre-fix code: content slotted in while
the item is already disabled used to stay enabled.

- [ ] **Step 5: Remove `inert` from the trailing wrapper**

In `render()`, restore the wrapper to its shipped shape and delete the comment block
above it that explains `inert`:

```tsx
          <span class={{ 'trailing': true, 'has-content': this.hasTrailing }}>
```

The attribute now carries the keyboard guard for directly slotted controls, so `inert`
buys nothing and costs accessibility-tree surface.

- [ ] **Step 6: Rewrite the class-level JSDoc contract paragraph**

Replace the whole "Disabled state and slotted content" / "Three slots, two mechanisms" /
"Override the dim's opacity" block with:

```
 * Disabled state and slotted content: while the item is disabled it sets
 * `disabled` on the elements you place DIRECTLY in the `heading`, `supporting`
 * and `trailing` slots, and it removes it again only from the elements it set it
 * on. A control you ship already disabled stays disabled — the component keeps a
 * record of its own writes rather than clearing the attribute wholesale, which is
 * what used to re-enable your control behind your back (issue #17).
 *
 * Directly slotted elements only. A control nested inside a slotted wrapper
 * (`<div slot="trailing"><button>`) receives nothing: the component does not claim
 * DOM that was never handed to a slot. Such a control is blocked from the mouse by
 * a `pointer-events` rule in this component's stylesheet, but it stays
 * keyboard-reachable while the item is disabled. Put controls directly in the slot.
```

Also drop `Made inert while the item is disabled — see the note above.` from the
`@slot trailing` tag, replacing it with
`Disabled along with the item while directly slotted.`

Keep the paragraph in the untagged block above `@element`: Stencil concatenates
untagged prose into the PRECEDING tag's description, which the comment at
`mud-accordion-item.tsx:11-13` records happening before.

- [ ] **Step 7: Typecheck**

Run: `yarn typecheck`
Expected: clean. A wireit output-tracking race can fail this once under concurrent
builds; re-run before investigating.

- [ ] **Step 8: Commit**

```bash
git add src/components/mud-accordion-item/mud-accordion-item.tsx
git commit -F - <<'EOF'
fix(accordion-item): take back only the `disabled` it wrote

<body>
EOF
```

---

### Task 2: Replace the stylesheet guard and drop the token

**Files:**
- Modify: `src/components/mud-accordion-item/mud-accordion-item.css:73-106`
- Modify: `tokens/core/components/accordion.tokens.json:109-111`

- [ ] **Step 1: Replace the dim block**

Delete the block at `mud-accordion-item.css:73-106` in full — comment, `opacity`,
`filter` and the `!important` — and put this in its place:

```css
/* Mouse net for what the attribute deliberately does not reach.
 *
 * `disabled` is written onto the elements DIRECTLY assigned to these three slots
 * (see the TSX), which is where controls belong. A control NESTED inside a
 * slotted wrapper gets no attribute, and a disabled native <button> ancestor does
 * not block clicks on its flat-tree slotted descendants — measured in Chromium.
 * This line closes that hole for the mouse. It does not close it for the
 * keyboard; CSS cannot, and `::slotted` cannot be followed by a descendant
 * combinator to reach the nested control directly.
 *
 * No `!important`: the attribute carries the contract, this is a net. A consumer
 * who re-enables pointer events on their own element is deciding about their own
 * DOM, and nothing here should overrule that. */
:host([disabled]) slot[name='heading']::slotted(*),
:host([disabled]) slot[name='supporting']::slotted(*),
:host([disabled]) slot[name='trailing']::slotted(*) {
  pointer-events: none;
}
```

No `opacity` and no `filter`, deliberately: each slotted control renders its own
disabled tokens now, a second dim on top of that was measured at 1.23:1 contrast, and
`filter` makes every slotted header element a containing block for `position: fixed`
descendants.

- [ ] **Step 2: Remove the token**

Delete the three lines at `tokens/core/components/accordion.tokens.json:109-111`
(`"slottedOpacity": { "disabled": … },`). It has no consumer after Step 1, and a token
with no consumer is a published value nobody can change safely.

- [ ] **Step 3: Rebuild tokens and prove it is gone**

Run: `yarn tokens.build && grep -c 'accordion-item-slotted-opacity' tokens/generated/core.tokens.css`
Expected: `0` (grep exits 1; that is the pass).

`tokens/generated/` is gitignored (`.gitignore:7`) — do not try to stage it.

- [ ] **Step 4: Lint**

Run: `yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/mud-accordion-item/mud-accordion-item.css tokens/core/components/accordion.tokens.json
git commit -F - <<'EOF'
style(accordion-item): keep only the pointer net, drop the outside dim

<body>
EOF
```

---

### Task 3: Pin the contract in both lanes

**Files:**
- Modify: `src/components/mud-accordion-item/test/mud-accordion-item.spec.tsx:116-140`
- Modify: `src/components/mud-accordion-item/mud-accordion-item.stories.ts`
- Modify: `src/components/mud-accordion/mud-accordion.stories.ts`

- [ ] **Step 1: Rewrite the spec test to the A′ contract**

Replace the `it('never writes \`disabled\` onto slotted content…')` block added by
commit `f6399e8` with:

```tsx
  it('takes back only the `disabled` it wrote (issue #17)', async () => {
    const { root, waitForChanges } = await render(
      <mud-accordion-item heading="Payment" disabled>
        <button slot="trailing" id="authored" disabled>
          Retry
        </button>
        <button slot="trailing" id="ours">
          Track
        </button>
        <div slot="trailing" id="wrapper">
          <button id="nested">Nested</button>
        </div>
      </mud-accordion-item>,
    );
    const authored = root!.querySelector('#authored')!;
    const ours = root!.querySelector('#ours')!;
    const nested = root!.querySelector('#nested')!;

    // While disabled: the component's own write lands on the element it was
    // handed, and nowhere else.
    expect(ours.hasAttribute('disabled')).toBe(true);
    expect(authored.hasAttribute('disabled')).toBe(true);
    expect(nested.hasAttribute('disabled')).toBe(false);

    (root as HTMLElement).removeAttribute('disabled');
    await waitForChanges();

    // After re-enable: it gives back exactly what it took.
    expect(ours.hasAttribute('disabled')).toBe(false);
    expect(authored.hasAttribute('disabled')).toBe(true);
  });
```

The `#authored` assertion after re-enable is the regression guard: it fails on `main`.

- [ ] **Step 2: Add a second spec test for the slotchange path**

Immediately after it — this covers the behaviour the pre-fix code did not have, so it
needs its own row. The explicit `dispatchEvent` is not a convenience: measured fact 9
records that mock-doc does not fire `slotchange` on `appendChild` while a real browser
does, so this is the shape that tests the handler wiring in the lane CI runs.

```tsx
  it('disables a control slotted in while the item is already disabled', async () => {
    const { root, waitForChanges } = await render(
      <mud-accordion-item heading="Payment" disabled></mud-accordion-item>,
    );
    const late = document.createElement('button');
    late.setAttribute('slot', 'trailing');
    root!.appendChild(late);
    // mock-doc does not fire `slotchange` on appendChild the way a browser does,
    // but a dispatched one reaches the JSX-bound handler. Emitting it here tests
    // the wiring; the browser story covers the native firing.
    root!.shadowRoot!.querySelector('slot[name="trailing"]')!.dispatchEvent(new Event('slotchange'));
    await waitForChanges();
    expect(late.hasAttribute('disabled')).toBe(true);

    (root as HTMLElement).removeAttribute('disabled');
    await waitForChanges();
    expect(late.hasAttribute('disabled')).toBe(false);
  });
```

If this still fails at the first assertion, do not delete it and do not weaken it:
say so in the completion report, move the coverage to the browser story in Step 3, and
record it in § Not Verified. A test that cannot run is honest; a test rewritten until it
passes is not.

- [ ] **Step 3: Shrink `SlottedDisabledContract`**

Rewrite the hidden story added by commit `f6399e8`/`175b5b1` to assert exactly four
things, dropping every opacity, grayscale, contrast and inline-`!important` assertion,
which have no referent now:

1. While the item is disabled, `#authored` and `#ours` both carry `disabled`, `#nested` does not.
2. `document.elementFromPoint` over `#nested` does not return `#nested` — the `pointer-events` net holds for a descendant of a slotted wrapper.
3. After the item is re-enabled, `#authored` still carries `disabled` and `#ours` does not.
4. A `mud-button` slotted into `trailing` with no `disabled` of its own is not focusable while the item is disabled, and is focusable again after — driven through the six-frame `settle()` helper already in the file, because Stencil re-renders asynchronously and a one-frame check measures the wrong state.
5. A control appended to `trailing` WHILE the item is already disabled receives `disabled` — with no manual `dispatchEvent`. This is the assertion bar row 4 cites, and it is the only place the NATIVE `slotchange` firing is exercised: measured fact 9 records that mock-doc does not fire it, so the `spec` lane's version of this test emits the event by hand and this one must not.

Keep the `['!autodocs', '!dev']` tags and the `play` shape from commit `4962bae` on
`mud-checkbox.stories.ts`.

- [ ] **Step 4: Retarget the `Disabled` docs story**

In `src/components/mud-accordion/mud-accordion.stories.ts`, the contract section added
to `renderDisabled` and its `docsSourceDisabled` copy describe the C treatment. Rewrite
both for A′: the visible point is that `#authored-disabled` is still disabled after the
toggle, and `#retry` is enabled again.

- [ ] **Step 5: Run the spec lane**

Run: `yarn test.dev`
Expected: all pass, including the three protected `disabled` tests unchanged.

- [ ] **Step 6: Prove the guard actually guards**

Run: `git stash push src/components/mud-accordion-item/mud-accordion-item.tsx && yarn test.dev; git stash pop`
Expected: the two new tests FAIL with the component reverted, then pass again after the
pop. A guard nobody has seen fail is not known to be a guard.

Note this is the main session running `git stash`, not a dispatched leg.

- [ ] **Step 7: Commit**

```bash
git add src/components/mud-accordion-item/test/mud-accordion-item.spec.tsx src/components/mud-accordion-item/mud-accordion-item.stories.ts src/components/mud-accordion/mud-accordion.stories.ts
git commit -F - <<'EOF'
test(accordion-item): pin the narrowed `disabled` contract in both lanes

<body>
EOF
```

---

### Task 4: Say what changed, where the next reader looks

**Files:**
- Modify: `src/components/mud-accordion-item/readme.md` (generated)
- Modify: `CHANGELOG.md:3-35`

- [ ] **Step 1: Regenerate the readme**

Run: `yarn build`
Expected: `readme.md`'s Overview carries the Task 1 Step 6 prose; `@slot trailing`
no longer mentions `inert`.

- [ ] **Step 2: Rewrite the CHANGELOG subsection**

Replace the `### Changed — \`mud-accordion-item\` no longer writes \`disabled\` onto
slotted content` subsection in full. The new one says, in this order: the consumer's
`disabled` now survives an item's disable/enable cycle; the attribute is still written,
but only on directly slotted elements, so a control nested inside a slotted wrapper no
longer receives it; that nested control is blocked from the mouse but not the keyboard;
and `--accordion-item-slotted-opacity-disabled`, which existed only on this unreleased
branch, is gone. Header wording names the narrowing, since that is the part that can
break a consumer.

- [ ] **Step 3: Confirm the scratch repro is not in the branch**

Run: `git status --short -- web-components/`
Expected: empty. (Not the bare form — the plan file is untracked and not ignored.)

- [ ] **Step 4: Commit**

```bash
git add src/components/mud-accordion-item/readme.md CHANGELOG.md
git commit -F - <<'EOF'
docs(accordion-item): state who owns `disabled` on slotted content

<body>
EOF
```

---

## Acceptance bar

Graded PASS/WARN/FAIL. A non-PASS names the responsible file and line.

| # | Assertion | How it is proven |
| --- | --- | --- |
| 1 | A slotted control that arrives already `disabled` still carries `disabled` after the item's own `disabled` goes true and back to false | Task 3 Step 1, assertion 5 (`spec` lane) and Step 3 assertion 3 (browser) |
| 2 | A directly slotted control with no `disabled` of its own carries it while the item is disabled and not after | Task 3 Step 1, assertions 1 and 4 |
| 3 | The component writes `disabled` on no element other than those directly assigned to the three header slots | Task 3 Step 1, assertion 3 (`#nested` stays clean) |
| 4 | A control slotted in WHILE the item is already disabled receives `disabled` | Task 3 Step 2, whose explicit `dispatchEvent` is justified by measured fact 9. Native `slotchange` firing is covered by Task 3 Step 3 in the browser lane |
| 5 | Each new spec test fails with the code it guards reverted | Task 3 Step 6. Run twice: the two contract tests against the pre-A′ component (both failed), the pruning test against A′ without its prune branch (failed) |
| 5b | An element unslotted while the item is disabled does not keep the component's `disabled` | Task 3 Step 2b |
| 6 | The three existing `disabled` spec tests pass, unmodified | `yarn test.dev` plus `git diff` showing no change to `mud-accordion-item.spec.tsx:8`, `:46`, `:83` |
| 7 | `yarn test.dev` passes | Task 3 Step 5 |
| 8 | `yarn lint` and `yarn typecheck` pass | Task 2 Step 4, Task 1 Step 7 |
| 9 | `yarn test.storybook` fails for the pre-existing reason and no other | **Expected FAIL, pre-existing** — decided by two commands over one captured run, not by judgment. (a) `grep -cE '^[[:space:]]*(Test Files\|Tests)[[:space:]]' <output>` is `0` — the run never reaches the test phase, so no story of this branch's can be the cause; and (b) `grep -c '\.stories' <output>` is `0` — no failure names any story file. Either condition unmet → real FAIL, because a story this branch broke would have to either reach the test phase or be named. A keyword match on `accordion` is NOT the discriminator and was rejected: the pre-existing error text contains `mud-accordion.js` and `mud-accordion-item.js` itself (measured fact 8), so that grep is non-zero in exactly the case this row must pass |
| 10 | Exactly one `!important` declaration, on the pointer net, and its comment states both why it is load-bearing and what it does NOT reach | `grep -cE '^[[:space:]]*[a-z-]+:.*!important' src/components/mud-accordion-item/mud-accordion-item.css` is `1`, and the comment above it says importance does not strengthen inheritance. Dropping it was tried and reverted: measured, a plain declaration loses to an inline `style="pointer-events: auto"` on the slotted element |
| 11 | `--accordion-item-slotted-opacity-disabled` exists nowhere | `grep -rn 'slotted-opacity\|slottedOpacity' src tokens` is empty |
| 12 | `inert` is no longer applied as an ATTRIBUTE | `grep -cE 'inert[=}]\|inert>' src/components/mud-accordion-item/mud-accordion-item.tsx` is `0`. The bare keyword grep is not the check — the JSDoc uses the word "inert" in prose about `mud-tag` and would fail its own bar |
| 16 | Every element assigned to the three header slots carries `tabindex="-1"` while the item is disabled, and gets its authored value back after | Spec test "suppresses and restores `tabindex` on slotted content (WCAG 4.1.2)", plus a Chromium measurement: under a disabled item the tab-reachable set is `[before, nested, after]`, and after enabling it is `[before, link, btn, nested, after]` with `tabindex="0"` restored verbatim |
| 17 | `disabled` is written on the `trailing` slot only, never on `heading` or `supporting` | Spec test "writes `disabled` only on the control slot, never on the text slots" |
| 18 | A control whose `disabled` is a PROPERTY rather than an attribute is not claimed | Spec test "does not claim a control whose `disabled` is a property, not an attribute" |
| 19 | Everything written is released when the item leaves the document AND re-applied when it comes back | `disconnectedCallback` calls `releaseSlottedWrites`; `connectedCallback` calls `syncSlottedDisabled`. Spec test "re-applies its writes when the item is reconnected while disabled", mutation-confirmed: deleting the `connectedCallback` call turns it red. The return trip needs its own call site because, measured against `@stencil/core` 4.43.4, a second connect takes the `else` branch at `internal/client/index.js:4011` and never re-runs `componentDidLoad`, while `@Watch('disabled')` does not fire on an unchanged value |
| 20 | Trailing content's colour is untouched outside the disabled state | The rule is `:host([disabled]) .trailing`. Measured in Chromium against a page whose own `color` is `rgb(200,0,100)`: a `<span slot="trailing">` computes `rgb(200,0,100)` closed, open, and after being toggled open, and `rgb(178,178,178)` under a disabled item. Unscoped it inherited `--_trigger-color`, which `:host([open])` redefines, so it would have flipped blue on every open |
| 21 | Every new spec test fails with the exact line it guards deleted | Mutation-run per guard, not per file: the property-ownership guard and the `connectedCallback` re-acquire were each deleted in turn and the matching test turned red, then restored (`git diff` clean, suite back to 2002) |
| 13 | The contract is readable from the component's own docs | `readme.md` Overview carries the Task 1 Step 6 prose, and says the nested case is uncovered for the keyboard |
| 14 | Both consumer-visible changes are announced in `CHANGELOG.md` under `## Unreleased` | Task 4 Step 2 |
| 15 | The scratch repro page is not in the branch | Task 4 Step 3 |

## Not Verified By This Plan

- **The browser lane does not run.** Measured fact 8. The story in Task 3 Step 3 is written but unexecuted by CI and by this branch; it was hand-driven in a running Storybook instead. Everything the `spec` lane cannot see — hit-testing, focus — rests on that hand-drive.
- **A consumer who sets `disabled` on a slotted control WHILE the item is already disabled** still loses it on re-enable: the attribute is already present, so the component cannot tell the write happened, and its record says the element is one of its own. The window is narrow (the consumer's write is a visual no-op at the time, and any framework that re-applies attributes on render repairs it at the next render) and closing it would need a `MutationObserver` on every slotted element — cost out of proportion to a case nobody has reported.
- **A control nested inside a slotted wrapper is not keyboard-blocked** while the item is disabled. The mouse is blocked by the Task 2 Step 1 rule; Tab is not. The pre-fix subtree walk covered it, and dropping that coverage is deliberate — the broad claim is the cause of #17.
- **A nested control that sets its own `pointer-events: auto` is not mouse-blocked either.** `!important` does not strengthen inheritance and `::slotted` takes no descendant combinator, so CSS cannot reach such a descendant at all. `mud-avatar.css:143` is a real instance in this repo: slot a `mud-avatar` into `trailing` and its internal `.badge-slot` stays hit-testable under a disabled item. The stylesheet comment says so rather than claiming coverage it does not have.
- **A slotted element with no `disabled` behaviour of its own gains nothing from the attribute.** An `<a href>`, a `<div tabindex>`, or a custom element that does not implement `disabled` receives it and stays focusable and activatable. Native form controls and `mud-*` controls do implement it and do become non-interactive. This is a property of `disabled` as an HTML attribute, not of this change, and it is stated in the component's own docs.
- **A consumer who removes our `disabled` while the item is still disabled** has it written back on the next sync. The end state after re-enable is the one they asked for — the attribute is removed, because the element is still in the record — so nothing is lost; only the interim differs, and re-asserting `disabled` under a disabled item is the intended behaviour.
- **`mud-tag` and `mud-badge` show no disabled treatment.** They have no `disabled` support (measured fact 6), so the attribute written onto them does nothing. Identical to shipped 1.0.6, and less than option C showed. The real fix is a disabled design for those two, which is design work, not engineering.
- **That a real browser's native `slotchange` reaches the new call site.** Measured fact 9 proves the handler reacts to a dispatched event in mock-doc; that the browser fires it on `appendChild` is platform behaviour this branch asserts only in the browser story, which does not run (measured fact 8).
- **Non-Chromium browsers.** The browser project runs Chromium only (`vitest.config.mts:121`). Nothing here is measured on Firefox or WebKit — though A′ rests on `assignedElements` and an attribute, not on `inert` or `::slotted` cascade edge cases, so the surface is far smaller than option C's.
- **`tabindex="-1"` is written to all three slots, so a consumer's `<h3 slot="heading">` becomes programmatically focusable while the item is disabled.** It is not in the tab order and `pointer-events: none` blocks the click path, so nothing reaches a user; the attribute is restored on enable. Narrowing the mirror to focusable elements only would need a focusability predicate across arbitrary custom elements, which is an unbounded grammar this repo does not own.
- **A slotted component with its own roving `tabindex` would have a mid-cycle change clobbered** by the verbatim restore: what comes back is what was captured at disable time, not what the component set since.
- **The `pointer-events` guard has no escape hatch.** Measured unbeatable from the consumer side — inline `!important` loses, document-level `!important` loses, and `::part(header)` does not reach slotted content. A consumer with a legitimate affordance under a disabled item has no override. Stated in `CHANGELOG.md` rather than solved; a `--accordion-item-slotted-pointer-events` custom property would be new public API for a bug fix.
- **The ownership ledger is instance memory and does not survive re-instantiation.** If a page serializes and re-parses markup the component has already written to (`innerHTML` round-trip, `cloneNode`, a framework recreating the element), the new instance sees the attribute, reads it as consumer-authored, and never removes it — a control stuck disabled. Closing it would need a self-describing marker in the DOM (`data-mud-disabled-by`), which is a wider contract than this issue; recorded rather than built.
- **`disconnectedCallback`'s release is untested.** The symmetry is implemented and read correct, but no lane exercises an unmount-while-disabled.
- **Consumers in the wild.** Whether any consumer of `@egov-moldova/mud@1.0.6` relies on the attribute reaching nested descendants is unknown; the change is announced, not surveyed.
- **The `trailing` slot's a11y shape.** Interactive content nested inside the header `<button>` is invalid HTML and remains so. Option F, out of scope, opened separately.
