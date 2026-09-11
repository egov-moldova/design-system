# mud-accordion-item — Stop Writing `disabled` Into Slotted Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `mud-accordion-item` stops writing the `disabled` attribute into slotted light DOM and expresses the disabled state of header content through its own stylesheet instead, so a consumer's independently disabled control is never silently re-enabled.

**Architecture:** Delete `propagateSummaryDisabled` and its two call sites. Replace it with two mechanisms, both inside the component's own shadow DOM. (1) A `:host([disabled]) slot[name='…']::slotted(*)` rule — scoped to the same three header slots the deleted method covered — carrying a token-driven `opacity`/`filter` dim and `pointer-events: none !important`. (2) `inert` on the shadow wrapper that hosts the `trailing` slot, because a disabled native `<button>` does **not** disable its flat-tree slotted descendants: measured, they stay focusable, Tab-reachable and Enter-activatable, so CSS alone would ship a keyboard regression. The consumer's DOM is never mutated by either, so the ownership collision that produced issue #17 becomes unrepresentable rather than compensated for.

**Tech Stack:** Stencil 4.x (shadow DOM, `@Watch`), Vitest browser project via `@storybook/addon-vitest` + Playwright/Chromium, Storybook 9 CSF3 with `@storybook/web-components-vite`, 3-tier CSS custom-property tokens.

**Spec:** https://github.com/egov-moldova/design-system/issues/17 — plus the `### Options` table and `## Decision` section below, which record the contract gate the issue names but deliberately leaves open.

**Reviewed:** preflight c0addf0 critic c0addf0 critic c0addf0 — FORTIFY, RETHINK, FORTIFY across three rounds; 15 above-bar findings, all folded in below

## The problem

`mud-accordion-item.propagateSummaryDisabled` (`mud-accordion-item.tsx:232`) writes
`disabled` onto every element assigned to the `heading`, `supporting` and `trailing`
slots *and onto all of their descendants*, then removes it unconditionally when the
item is re-enabled. It therefore cannot tell the attributes it set from the ones the
consumer authored, so a control the consumer shipped as `<mud-button slot="trailing"
disabled>` comes back enabled the moment the item's own `disabled` goes false — with
no event and no warning. The symptom this plan removes is that silent loss of
consumer state; the cause it removes is the component writing into a cell it does not
own.

## Global Constraints

- Base branch is `main` at `c0addf0`. The issue's claim that `src/components/mud-accordion-item/` exists only on `fix/issue-6-8-accordion-item-docs` is stale: that branch merged as PR #19. Work on `fix/issue-17-accordion-item-slotted-disabled`.
- Every authored file is English — code, comments, JSDoc, commit messages.
- Do not touch `src/legacy/cor-accordion/cor-accordion.tsx:92`. It carries the same bug, is archived, is not shipped, and has no test lane of its own.
- Do not touch the three existing `disabled` spec tests (`src/components/mud-accordion-item/test/mud-accordion-item.spec.tsx:8`, `:46`, `:83`). They must keep passing unchanged.
- No rebase from PR #13 (`feature/92077-refactor-components`) — it touches no accordion file.
- Delete the untracked scratch repro `web-components/demo/pages/navigation/_issue17-repro.html` before the final commit. It must not enter the branch.
- New design values are authored as tokens, per `AGENTS.md:85` ("Token-First: Design tokens are the single source of truth — never hardcode values in CSS"). An earlier draft of this plan claimed `mud-accordion-item.css:39` and `:50` establish a literal-fallback house style; they do not — both fall back to **another token** (`var(--accordion-item-gap-sm, var(--spacing-8))`). The one literal-fallback in the tree is `src/legacy/cor-banner-notification/cor-banner-notification.css:14`, which is legacy and out of scope. Task 1 therefore authors a real token.
- `readme.md` is fully generated below `<!-- Auto Generated Below -->`; never hand-edit it. Prose reaches it through the class-level JSDoc plus `yarn build` (which runs `stencil build --docs`).

---

## Decision

### Options

| Option | Complexity added now | Cost to build | Cost to maintain | Cost to reverse | Risk | Value |
| --- | --- | --- | --- | --- | --- | --- |
| **A′** — write `disabled` only on directly assigned elements, remember what we wrote (`WeakSet`), plus a `::slotted` pointer-events guard | med — introduces a bookkeeping concept (which elements are "ours") that did not exist | med — 3 files | med — the bookkeeping must stay correct across re-slotting and disconnection | high — publishes an attribute-writing contract consumers can build on, and unwinding it later is a breaking change | Residual window survives: a consumer who sets `disabled` on a slotted control *while the item is already disabled* still loses it, because both writers share one cell | Each slotted MUD control keeps rendering its own exact disabled tokens |
| **B** — keep the subtree walk, add the same bookkeeping | med — same bookkeeping concept, applied wider | med — 3 files | high — subtree walk on every change (the current JSDoc already calls it "heavy-handed") plus bookkeeping | high — same published contract, over a wider surface | Same residual window, now spread across the whole flattened subtree; keeps claiming DOM the consumer never handed over | Nothing visible changes except the bug disappearing — lowest churn on shipped `1.0.6` |
| **C** — never write the attribute; express the state in the component's own stylesheet | low — no new concept; CSS in our own shadow root plus one component token in the house fallback style | low — 2 files + 1 story | low — no runtime state at all | low — a CSS rule and a deleted method | Slotted `mud-button` / `mud-link` / `mud-chip` lose their own disabled tokens; mitigated by `grayscale(1)`, and `forced-colors` must be handled explicitly or the state is invisible in high contrast | The ownership collision becomes unrepresentable; `mud-tag` and `mud-badge` — which have zero `disabled` support and are exactly what this repo's own stories and demo slot into `trailing` — gain a disabled signal they never had |

**Recommendation: C.** The defect is the ownership claim itself, not the absence of bookkeeping; A′ and B both simulate a union (`child.disabled |= item.disabled`) by writing into the consumer's cell and remembering, which leaves a residual window no bookkeeping can close, while C obtains the union structurally by never writing at all.

Two further options were raised and are not in the table:

- **D — a second, container-owned cell** (`container-disabled` attribute honoured by each slottable `mud-*`, reusing the pattern `mud-button` already documents at `mud-button.tsx:167-174`: *"Mirrors the disabled state into `fieldsetDisabled` so the control becomes inert without clobbering the consumer-set `disabled` prop"*). Deferred, not scheduled: it is a cross-cutting contract across the design system, it cannot cover non-MUD slotted DOM, and `mud-tag`/`mud-badge` would first need a disabled design that does not exist. Building it now would be paying against a guess about the future.
- **E — delegate appearance to the consumer.** Already available with no component code: `mud-accordion-item[disabled] [slot="trailing"] { … }` works from the consumer's own stylesheet, verified live in Chromium (rule applies while the host carries `disabled`, retracts when it does not). Rejected as the *default* because only the design system holds the disabled tokens, contrast pairs and dark-mode values, and because `pointer-events` and `forced-colors` are correctness rather than taste and must not be delegatable. C leaves the door to E open through the opacity token.

### Measured facts this decision rests on

All measured in Chromium through Playwright against the running demo, not recalled:

1. **The bug.** Item `disabled` → enabled strips a consumer-authored `disabled` from a slotted `mud-button`.
2. **The subtree claim is real.** A native `<button>` nested inside `<div slot="trailing">` — never handed to the component — also receives `disabled`.
3. **A disabled native `<button>` ancestor does NOT block mouse clicks on its descendants.** With the item disabled and the slotted button carrying no `disabled`, a real click reached it. Re-adding `disabled` stopped it. So the propagated attribute is today's only interaction guard, and removing it *requires* replacing it — `pointer-events: none` is not optional polish.
4. **The disabled header button does NOT close keyboard reach** — and an earlier reading of this session's own probe said it did. That reading was confounded: `focus()` was called immediately after removing `disabled` from the slotted `mud-button`, and Stencil re-renders asynchronously, so its inner `<button>` still carried `disabled` and refused focus for its own reason. Re-measured after a settle (`innerDisabled: false`): focus lands (`document.activeElement` → `MUD-BUTTON`, `shadowRoot.activeElement` → `BUTTON`) and activation fires. `disabled` does not propagate across the flat tree — only `<fieldset>` propagates, and only down the DOM tree (fact 5). **So the propagated attribute is today's only keyboard guard, and removing it without a replacement is a WCAG regression against shipped 1.0.6.**

4b. **`inert` on the shadow wrapper closes it, measured on the real component.** With `span.trailing` (`mud-accordion-item.tsx:319`) inert: focus on the slotted control is refused (the previous element keeps it), and `document.elementFromPoint` over the control returns `MUD-ACCORDION-ITEM` rather than the control. The second half also closes the descendant hole — `::slotted(*)` matches only directly assigned elements, and a descendant setting its own `pointer-events` wins over the inherited `none`; that is real in this repo at `src/components/mud-avatar/mud-avatar.css:143`. `::slotted` cannot be followed by a descendant combinator, so CSS alone cannot reach it.

4c. **`forced-colors: active` preserves both `opacity` and `pointer-events`.** Measured with the media genuinely emulated (`matchMedia('(forced-colors: active)').matches === true`): the slotted control computes `opacity: 0.48` and `pointer-events: none`, identical to normal mode. An earlier draft of this plan carried a `forced-colors` block that reset `opacity` to `1` and set `color: GrayText`; both were wrong — the reset would have removed the only working signal, and `GrayText` is inherited `color`, which every slottable MUD control overrides in its own shadow root (`mud-button.css:244`, `mud-tag.css:32`). The block is not in this plan.
5. **A `<fieldset disabled>` inside the item's shadow root does not reach slotted light-DOM elements** — form association follows the DOM tree, not the flat tree — so `mud-button`'s existing `formDisabledCallback` mechanism cannot be reused across the boundary.
6. **`mud-tag` and `mud-badge` have zero `disabled` support** (0 occurrences across `.tsx` and `.css`). Today's propagation writes a dead attribute onto exactly the elements this repo's own stories (`mud-accordion.stories.ts:186`) and demo (`web-components/demo/pages/navigation/mud-accordion.html:46`) put in `trailing`.

### Deviation from the issue's literal acceptance bar

Issue #17's bar item 2 reads: *"a slotted control with no `disabled` of its own is disabled while the item is, and enabled again after."* Under C no attribute is ever written, so that wording cannot hold literally. It is restated in observable terms, which is what the bar was reaching for: **non-interactive and visibly muted while the item is disabled, interactive and normal again after.** Task 1's `play` function asserts exactly that.

### Consumer-visible behaviour change

`disabled` will stop appearing on slotted elements. Consumers whose own CSS keys on `mud-button[disabled]` inside an accordion header, or who query `[slot="trailing"][disabled]`, will see that stop. This is the point of the fix, not a side effect, and it must reach the component docs (Task 3 Step 1) AND the repo's `CHANGELOG.md` (Task 3 Step 2) — not only the commit message. `CHANGELOG.md` exists at the repo root and carries an `## Unreleased` section with prose `### Changed — …` subsections; that is the entry's home. There is no `.changeset/` directory and no release tooling that would generate one, so the entry is written by hand.

---

## File Structure

- `src/components/mud-accordion-item/mud-accordion-item.tsx` — remove the propagation method, its `componentDidLoad` call site, and its `@Watch` call site; extend the class-level JSDoc with the ownership contract and the new custom property.
- `src/components/mud-accordion-item/mud-accordion-item.css` — add the `:host([disabled]) slot[name='…']::slotted(*)` rule. No `forced-colors` counterpart — see the Decision section; the block was measured unnecessary and actively harmful, and must not be re-added here.
- `src/components/mud-accordion-item/test/mud-accordion-item.spec.tsx` — add ONE new `it()` covering the attribute contract (bar rows 1 and 3). The three existing tests are not touched.
- `src/components/mud-accordion-item/mud-accordion-item.stories.ts` — add one hidden regression story with a `play` function, covering the half the spec lane cannot see: computed style, hit-testing and focus.

**The lane split, corrected against a measurement.** Issue #17 states the bug is "unreachable from the `spec` project by construction", and an earlier draft of this plan repeated it. **Both are false.** `@stencil/core`'s mock-doc implements `assignedElements` (`node_modules/@stencil/core/mock-doc/index.js:8260`), so the propagation really runs there. Probed by inserting a temporary `it()` into the real spec file and running `yarn test.dev`: it FAILED today with `after re-enable, authored keeps disabled: false` — the exact issue-#17 symptom, in the fast lane. The probe was reverted; the test it proved belongs in Task 1 Step 1b.

So the attribute contract — the actual defect — gets a deterministic guard that needs no browser, and the browser story carries only what mock-doc genuinely cannot render: `getComputedStyle`, `elementFromPoint` and `inert`.
- `src/components/mud-accordion-item/readme.md` — regenerated, never hand-edited.

Single phase, three sequential tasks — no per-phase execution matrix applies.

---

### Task 1: Failing regression story in the browser lane

**Files:**
- Modify: `src/components/mud-accordion-item/mud-accordion-item.stories.ts` (append after `States`, which ends at `:128`)

**Interfaces:**
- Consumes: the existing `wrapperStyle` const (`mud-accordion-item.stories.ts:15`) and the file's `Story` type alias.
- Produces: `SlottedDisabledContract` — a `Story` export consumed by nothing but the `storybook` vitest project.

- [ ] **Step 1: Write the failing story**

Append to `src/components/mud-accordion-item/mud-accordion-item.stories.ts`:

```ts
// Regression test, not documentation — hidden from the sidebar and autodocs, the
// same shape mud-checkbox uses for its own browser-only contract tests. This covers
// the half of issue #17 that mock-doc genuinely cannot render: computed style for the
// dim, `elementFromPoint` for the pointer guard, and focus for `inert`. The attribute
// contract itself IS observable under mock-doc and is pinned in the spec file instead.
export const SlottedDisabledContract: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `
    <div style="${wrapperStyle}">
      <button id="parking" type="button">focus parking</button>
      <mud-accordion mode="multiple">
        <mud-accordion-item id="authored-disabled" heading="Payment" disabled>
          <mud-button id="retry" slot="trailing" variant="secondary" size="sm" disabled>Retry</mud-button>
          Panel body.
        </mud-accordion-item>
        <mud-accordion-item id="authored-enabled" disabled>
          <span id="head-slot" slot="heading">Shipping</span>
          <span id="sup-slot" slot="supporting">Tracking unavailable</span>
          <mud-button id="track" slot="trailing" variant="secondary" size="sm">Track</mud-button>
          <div slot="trailing"><button id="nested" type="button" style="pointer-events: auto">Nested</button></div>
          Panel body.
        </mud-accordion-item>
      </mud-accordion>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const find = (id: string): HTMLElement => {
      const el = canvasElement.querySelector<HTMLElement>(`#${id}`);
      if (!el) throw new Error(`#${id} did not render`);
      return el;
    };
    // Several frames, not one: `inert` is applied in render(), and Stencil re-renders
    // asynchronously. A single frame was measured to read the PREVIOUS render's state,
    // which is how this session first concluded — wrongly — that focus was already blocked.
    const settle = async () => {
      for (let i = 0; i < 6; i += 1) await new Promise<void>(r => requestAnimationFrame(() => r()));
    };

    await customElements.whenDefined('mud-accordion-item');
    await customElements.whenDefined('mud-button');
    await settle();

    const authoredDisabled = find('authored-disabled');
    const authoredEnabled = find('authored-enabled');
    const retry = find('retry');
    const track = find('track');
    // The guard is a three-clause selector list. Cover every clause: a typo in the
    // `heading` or `supporting` arm would otherwise ship green against a bar that
    // says "a slotted control" without naming a slot.
    const slotted = [
      ['heading', find('head-slot')],
      ['supporting', find('sup-slot')],
      ['trailing', track],
    ] as const;

    // 1. The component never writes into the consumer's cell — in either direction.
    if (!retry.hasAttribute('disabled')) {
      throw new Error('slotted control authored `disabled` lost it while the item was disabled');
    }
    if (track.hasAttribute('disabled')) {
      throw new Error('component wrote `disabled` onto a slotted control the consumer left enabled');
    }

    // 2. While the item is disabled, slotted content is non-interactive. Measured:
    //    a disabled native <button> ancestor does NOT block mouse clicks on its
    //    descendants, so this asserts the CSS guard, not a platform freebie.
    // 3. ...and visibly muted. Both, for every slot the guard names.
    for (const [name, el] of slotted) {
      if (getComputedStyle(el).pointerEvents !== 'none') {
        throw new Error(`slot="${name}" content is still pointer-interactive while the item is disabled`);
      }
      if (Number(getComputedStyle(el).opacity) >= 1) {
        throw new Error(`slot="${name}" content is not visually muted while the item is disabled`);
      }
    }

    // 3b. The guard is a mechanism, not a request: an inline style must not defeat it.
    track.style.pointerEvents = 'auto';
    if (getComputedStyle(track).pointerEvents !== 'none') {
      throw new Error('an inline `pointer-events` on the slotted control defeated the guard');
    }
    track.style.removeProperty('pointer-events');

    // 3c. KEYBOARD. The shape CSS cannot close: a disabled native <button> does not
    //     disable its flat-tree slotted descendants, so without `inert` this focuses.
    const nested = find('nested');
    // Park focus on a real focusable element OUTSIDE the accordion. Two traps this avoids:
    // `mud-accordion-item` carries no tabindex, so focusing the item is a no-op and
    // `activeElement` falls to <body>, which would let the check below pass without
    // proving focus was REFUSED rather than merely moved; and anything inside a
    // `trailing` slot is itself inert after the fix, so it cannot hold focus either.
    const parking = find('parking');
    parking.focus();
    if (document.activeElement !== parking) {
      throw new Error('could not park focus — the keyboard assertion below would be vacuous');
    }
    nested.focus();
    if (document.activeElement !== parking) {
      throw new Error('a slotted control is keyboard-focusable while the item is disabled');
    }

    // 3d. DESCENDANT. `::slotted(*)` matches only the assigned element; this button is a
    //     descendant of a slotted wrapper AND sets its own `pointer-events: auto`, so the
    //     stylesheet loses here and only `inert` wins. Hit-testing is the observable.
    //     `scrollIntoView` first and a non-null check second, both load-bearing:
    //     `elementFromPoint` returns null for any point outside the viewport, so a
    //     bare `hit !== nested` passes vacuously when the fixture sits below the fold.
    const hitTest = (el: HTMLElement) => {
      el.scrollIntoView({ block: 'center' });
      const box = el.getBoundingClientRect();
      return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    };
    const blockedHit = hitTest(nested);
    if (blockedHit === null) {
      throw new Error('hit-test point fell outside the viewport — the assertion would pass vacuously');
    }
    if (blockedHit !== authoredEnabled) {
      throw new Error(
        `expected the inert wrapper to hand hit-testing to the item host, got ${blockedHit?.tagName}`,
      );
    }

    // 4. Enabling the item restores interactivity and appearance, and STILL does
    //    not touch the consumer's cell — this is the exact transition issue #17 broke.
    authoredDisabled.removeAttribute('disabled');
    authoredEnabled.removeAttribute('disabled');
    await settle();

    if (!retry.hasAttribute('disabled')) {
      throw new Error('re-enabling the item stripped the consumer-authored `disabled` (issue #17)');
    }
    for (const [name, el] of slotted) {
      if (getComputedStyle(el).pointerEvents === 'none') {
        throw new Error(`slot="${name}" content stayed pointer-blocked after the item was enabled`);
      }
      if (Number(getComputedStyle(el).opacity) < 1) {
        throw new Error(`slot="${name}" content stayed muted after the item was enabled`);
      }
    }
    // ...and the keyboard comes back with it. This is the assertion that catches an
    // `inert` left permanently on, which would be a worse bug than the one being fixed.
    parking.focus();
    nested.focus();
    if (document.activeElement !== nested) {
      throw new Error('a slotted control stayed keyboard-unreachable after the item was enabled');
    }
    // The mirror of 3d. Without it, 3d proves nothing: a guard that never lifts would
    // satisfy the disabled-side check forever.
    if (hitTest(nested) !== nested) {
      throw new Error('a slotted descendant stayed hit-test-blocked after the item was enabled');
    }
  },
};
```

- [ ] **Step 1b: Write the failing spec test**

Append to `src/components/mud-accordion-item/test/mud-accordion-item.spec.tsx`, after the existing `auto-collapses when transitioned to disabled while open` test (`:83`). The three existing tests are not edited.

```tsx
  it('never writes `disabled` onto slotted content, in either direction (issue #17)', async () => {
    const { root, waitForChanges } = await render(
      <mud-accordion-item heading="Payment" disabled>
        <button slot="trailing" id="authored" disabled>
          Retry
        </button>
        <button slot="trailing" id="untouched">
          Track
        </button>
      </mud-accordion-item>,
    );
    const authored = root!.querySelector('#authored')!;
    const untouched = root!.querySelector('#untouched')!;

    // The consumer authored one and not the other. The component owns neither.
    expect(authored.hasAttribute('disabled')).toBe(true);
    expect(untouched.hasAttribute('disabled')).toBe(false);

    (root as HTMLElement).removeAttribute('disabled');
    await waitForChanges();

    // The transition that issue #17 broke: the authored one must survive it.
    expect(authored.hasAttribute('disabled')).toBe(true);
    expect(untouched.hasAttribute('disabled')).toBe(false);
  });
```

- [ ] **Step 1c: Run the spec lane to verify it fails**

Run: `yarn test.dev`

Expected: FAIL. Today `componentDidLoad` propagates at load, so `#untouched` gains `disabled` and the second assertion breaks first; after the re-enable, `#authored` loses its own and the fourth breaks too. Measured before this plan was written: a probe of this exact shape returned `after re-enable, authored keeps disabled: false`.

- [ ] **Step 2: Run the story to verify it fails**

Run: `yarn test.storybook`

Expected: FAIL on `SlottedDisabledContract`. The FIRST throw today is assertion 1's second clause — `component wrote 'disabled' onto a slotted control the consumer left enabled` — because `componentDidLoad` (`mud-accordion-item.tsx:155-157`) propagates at load, before the play function runs.

Do NOT expect the pointer clause to pass today. `mud-button` scopes `pointer-events: none` to `.control` INSIDE its own shadow root (`mud-button.css:343-348`); the host's computed `pointer-events` stays `auto` even with `disabled` set, and `#head-slot`/`#sup-slot` are plain `<span>`s on which `disabled` means nothing at all. So once the attribute write is removed, the loop's first failure is `slot="heading" content is still pointer-interactive` — and that is the stronger reason to keep the clause: nothing on the platform provides it today, so the guard is not redundant with anything.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/components/mud-accordion-item/mud-accordion-item.stories.ts src/components/mud-accordion-item/test/mud-accordion-item.spec.tsx
git commit -F - <<'EOF'
test(accordion-item): pin the slotted `disabled` ownership contract

Two lanes, because the defect has two halves. The attribute contract — the
actual bug — is observable under mock-doc: its `assignedElements` is real, so
the propagation runs there and a spec test sees the re-enable strip the
consumer's own `disabled`. The other half needs a browser: computed style for
the dim, `elementFromPoint` for the pointer guard, and focus for `inert`.

Both fail today. Refs #17.
EOF
```

---

### Task 2: Remove the propagation, add the stylesheet guard

**Files:**
- Modify: `tokens/core/components/accordion.tokens.json` (add one entry under `accordion.item`)
- Modify: `src/components/mud-accordion-item/mud-accordion-item.tsx:143`, `:155-157`, `:223-248` (the propagation block: JSDoc opens at `:223`, the method closes at `:248` — an earlier draft said `:224-256`, which missed the JSDoc's first line and overshot into `render()`), `:319` (the `trailing` wrapper)
- Modify: `src/components/mud-accordion-item/mud-accordion-item.css:67-71` (append after this block). Note the file already carries two `::slotted` rules — `:133` scoped to `icon-start`, `:250` a global `margin-block` reset. Neither sets any property this task sets, so there is no cascade interaction.

**Interfaces:**
- Consumes: nothing from Task 1 beyond the story it must now satisfy.
- Produces: removal of the private method `propagateSummaryDisabled(disabled: boolean): void` and of the `componentDidLoad()` lifecycle hook. No public API changes — no prop, event, method or part is added or removed.

- [ ] **Step 1: Author the component token**

In `tokens/core/components/accordion.tokens.json`, add one entry under `accordion.item`,
alongside the existing `*Color.disabled` entries. Shape matches the file's own precedent for a
unitless number — `tokens/core/components/tooltip.tokens.json:53` authors `"opacity": { "$value": "0.72", "$type": "number" }`:

```json
"slottedOpacity": {
  "disabled": { "$value": "0.5", "$type": "number" }
}
```

`0.5` and not something finer: it is what Shoelace's `sl-details` — the direct analog of an
accordion item — uses to dim its whole disabled header including slotted summary content, it
is a round half rather than a tuned constant, and combined with `grayscale(1)` it was rendered
side by side against real `[disabled]` tokens and read as disabled. The repo's only other
disabled-opacity token is `--service-button-disabled-badge-opacity: 0.3`, which dims a small
badge, not a whole header region.

`tokens/core.dark/components/` carries no accordion file, so no dark counterpart is owed: a
unitless opacity is theme-independent, unlike the `{color.text.disabled.default}` references
beside it.

- [ ] **Step 2: Build the tokens and confirm the variable exists**

Run: `yarn tokens.build`

Expected: `tokens/generated/core.tokens.css` gains `--accordion-item-slotted-opacity-disabled: 0.5;`.
Confirm with `grep -n 'accordion-item-slotted-opacity-disabled' tokens/generated/core.tokens.css`;
an empty result means the nesting under `accordion.item` is wrong and the CSS in Step 6 would
silently compute `opacity: 1`, which the browser lane would catch but only after a full run.

- [ ] **Step 3: Delete the propagation call from the watcher**

In `src/components/mud-accordion-item/mud-accordion-item.tsx`, replace:

```ts
  @Watch('disabled')
  watchDisabled(next: boolean) {
    if (next && this.open) {
      this.open = false;
    }
    this.propagateSummaryDisabled(next);
  }
```

with:

```ts
  @Watch('disabled')
  watchDisabled(next: boolean) {
    if (next && this.open) {
      this.open = false;
    }
  }
```

- [ ] **Step 4: Delete the `componentDidLoad` hook**

Its entire body was the propagation call, so the hook goes with it. Remove:

```ts
  componentDidLoad() {
    this.propagateSummaryDisabled(this.disabled);
  }
```

- [ ] **Step 5: Delete the propagation method**

Remove the whole block — the JSDoc and the method — from `this.propagateSummaryDisabled`'s definition:

```ts
  /**
   * Mirror the item's `disabled` state onto every element currently slotted
   * into `heading` / `supporting` / `trailing` slots. Legacy parity — when
   * the consumer's slotted control (e.g. `mud-button`) supports a `disabled`
   * attribute, it stays in sync with the accordion's own disabled state.
   *
   * NOTE: heavy-handed — walks the assigned subtree on every change. Only
   * runs in browser env (no-op when shadowRoot / slot APIs are missing).
   */
  private propagateSummaryDisabled(disabled: boolean) {
    const root = this.host.shadowRoot;
    if (!root) return;
    const slots = ['heading', 'supporting', 'trailing']
      .map(name => root.querySelector<HTMLSlotElement>(`slot[name="${name}"]`))
      .filter((s): s is HTMLSlotElement => !!s);
    for (const slot of slots) {
      const assigned = slot.assignedElements({ flatten: true });
      for (const el of assigned) {
        const children = [el, ...Array.from(el.querySelectorAll('*'))] as HTMLElement[];
        for (const child of children) {
          if (disabled) child.setAttribute('disabled', '');
          else child.removeAttribute('disabled');
        }
      }
    }
  }
```

- [ ] **Step 5b: Make the `trailing` wrapper inert while the item is disabled**

In `render()`, the wrapper at `src/components/mud-accordion-item/mud-accordion-item.tsx:319`. Replace:

```tsx
          <span class={{ 'trailing': true, 'has-content': this.hasTrailing }}>
            <slot name="trailing" onSlotchange={this.onTrailingSlotChange} />
          </span>
```

with:

```tsx
          {/* `inert`, not CSS, and only here. A disabled native <button> does not disable its
              flat-tree slotted descendants — measured: they stay focusable, Tab-reachable and
              Enter-activatable — so the stylesheet guard below closes the mouse but not the
              keyboard. `inert` closes both, and also covers a descendant of a slotted wrapper
              that sets its own `pointer-events` (real in this repo at mud-avatar.css:143),
              which `::slotted` cannot reach because it takes no descendant combinator.
              Scoped to `trailing` because that is the slot documented to carry controls;
              `heading` and `supporting` are documented for text and keep the CSS guard only. */}
          <span class={{ 'trailing': true, 'has-content': this.hasTrailing }} inert={isDisabled}>
            <slot name="trailing" onSlotchange={this.onTrailingSlotChange} />
          </span>
```

`isDisabled` is already in scope — it is bound at `:251` and used on the header button at `:292`.

If Stencil's JSX typings do not carry `inert` on an intrinsic `span`, `yarn lint` at Step 9 will
say so; the narrow fix is `{...{ inert: isDisabled }}` rather than widening the element's type.

- [ ] **Step 6: Add the stylesheet guard**

In `src/components/mud-accordion-item/mud-accordion-item.css`, append immediately after the existing `:host([disabled])` block (`:67-71` — selector at `:67`, three declarations, closing brace at `:71`):

```css
/* Slotted header content under a disabled item.
 *
 * The component deliberately writes nothing onto slotted elements — `disabled`
 * is the consumer's cell, and writing into it is what made an independently
 * disabled control silently come back enabled (issue #17). The state is
 * expressed here instead, in our own stylesheet, where it cannot collide.
 *
 * `pointer-events` is correctness, not polish: a disabled native `<button>`
 * ancestor blocks FOCUS on its descendants but not mouse clicks, so without
 * this line a slotted control stays clickable inside a disabled header.
 *
 * Scoped to the three slots the deleted propagation covered, deliberately: a
 * bare `::slotted(*)` would also catch the default panel slot and `icon-start`,
 * widening the change beyond the defect. `icon-start` needs nothing — it already
 * follows the header's `currentcolor` through the rule at the top of this file.
 *
 * The opacity is a component token so a consumer who wants their own treatment
 * can neutralise it and style `mud-accordion-item[disabled] [slot]` from their
 * own stylesheet. The pointer-events guard is not neutralisable, by design —
 * `!important` is what makes that true rather than merely stated. Keyboard reach
 * is closed separately, by `inert` on the trailing wrapper in the TSX: CSS cannot
 * close it, and a disabled ancestor button does not close it either. */
:host([disabled]) slot[name='heading']::slotted(*),
:host([disabled]) slot[name='supporting']::slotted(*),
:host([disabled]) slot[name='trailing']::slotted(*) {
  opacity: var(--accordion-item-slotted-opacity-disabled);
  filter: grayscale(1);
  /* `!important` on this line only, and it is load-bearing. Measured in Chromium:
   * a plain `::slotted` declaration LOSES to an inline `style="pointer-events:auto"`
   * on the slotted element (computed `auto`); with `!important` it wins (`none`),
   * and it still wins against an inline `!important` (`none`). Without it the
   * inertness guard is defeatable by any consumer, which is exactly the
   * delegatable failure option E was rejected for. The opacity above is
   * deliberately NOT important — that one is meant to be overridable. */
  pointer-events: none !important;
}

/* No `forced-colors` block, deliberately. Measured with the media emulated
 * (`matchMedia('(forced-colors: active)').matches === true`): `opacity` and
 * `pointer-events` both survive unchanged, so the dim keeps working. An earlier
 * draft carried a block that reset `opacity` to `1` and set `color: GrayText`;
 * it would have REMOVED the only working signal, and `GrayText` is inherited
 * `color`, which every slottable MUD control overrides in its own shadow root
 * (`mud-button.css:244`, `mud-tag.css:32`) — so it could not have reached them. */
```

- [ ] **Step 7: Run the browser lane to verify it passes**

Run: `yarn test.storybook`

Expected: PASS, `SlottedDisabledContract` included.

- [ ] **Step 8: Run the spec lane to verify the three existing tests are untouched**

Run: `yarn test.dev`

Expected: PASS. Specifically `reflects open and disabled to the host`, `does not toggle when disabled`, and `auto-collapses when transitioned to disabled while open` all still pass — none of them observed the propagation, and the auto-collapse behaviour lives in `watchDisabled`, which keeps its first statement.

- [ ] **Step 9: Run lint**

Run: `yarn lint`

Expected: PASS. `@Element() host` may now be used only by `focusHeader`/`handleKeyDown`; confirm it still has at least one reader before assuming an unused-member warning is spurious.

- [ ] **Step 10: Commit**

```bash
# `tokens/generated/` is gitignored (.gitignore:7) — staging it makes `git add` exit non-zero
# and stage NOTHING. It is a build artifact, reproduced by `yarn tokens.build`.
git add tokens/core/components/accordion.tokens.json src/components/mud-accordion-item/mud-accordion-item.tsx src/components/mud-accordion-item/mud-accordion-item.css
git commit -F - <<'EOF'
fix(accordion-item): stop writing `disabled` into slotted content

The component walked the flattened subtree of the heading/supporting/trailing
slots and set or removed `disabled` on every element, so it could not tell the
attributes it had set from the ones the consumer authored. Re-enabling the item
removed both, silently discarding the consumer's state.

Express the state in the component's own shadow DOM instead: a `::slotted` dim
plus `pointer-events: none !important` for the mouse, and `inert` on the trailing
wrapper for the keyboard. Both are needed. Measured: a disabled native <button>
does not disable its flat-tree slotted descendants, so without the CSS guard they
stay clickable and without `inert` they stay focusable, Tab-reachable and
Enter-activatable.

Consumer-visible: `disabled` no longer appears on slotted elements.

Closes #17.
EOF
```

---

### Task 3: Document the contract where the next reader finds it

**Files:**
- Modify: `src/components/mud-accordion-item/mud-accordion-item.tsx:17-30` (class-level JSDoc block)
- Modify: `CHANGELOG.md` (append a subsection under the existing `## Unreleased`)
- Regenerate: `src/components/mud-accordion-item/readme.md`

**Interfaces:**
- Consumes: the behaviour shipped in Task 2.
- Produces: prose only. No code contract changes.

> **Note for issue #9:** this task edits the class-level JSDoc block of `mud-accordion-item.tsx`. Issue #9 plans a JSDoc sweep across the same file and will need to preserve or restate the paragraph added here.

- [ ] **Step 1: Extend the class-level JSDoc**

The paragraph goes in the **untagged** prose block at the top of the docblock — `src/components/mud-accordion-item/mud-accordion-item.tsx:17-21`, the block that opens `Accordion item — a single collapsible row inside \`mud-accordion\``. That block is what feeds the readme's Overview.

**Not after `@slot trailing`.** Stencil concatenates untagged prose into the PRECEDING tag's description, so a paragraph placed there lands inside the generated Slots table cell — the file's own comment at `mud-accordion-item.tsx:12-13` records that this already happened once, to the `panel` shadow-part row. An earlier draft of this plan made exactly that mistake.

Append to the untagged block, after the `Pattern B (atom-interactive)` paragraph and before `@element`:

```ts
 *
 * Disabled state and slotted content: this component never writes `disabled`
 * onto elements you slot into it. That attribute is yours, and a component that
 * writes into it cannot tell your value from its own — which is how an
 * independently disabled control used to come back enabled when the item was
 * re-enabled (issue #17). While the item is disabled, slotted header content is
 * dimmed and made non-interactive from this component's own shadow DOM instead:
 * a `::slotted` rule for the mouse, and `inert` on the `trailing` wrapper for
 * the keyboard, because a disabled native `<button>` does not disable its
 * flat-tree slotted descendants. Override the dim with the
 * `--accordion-item-slotted-opacity-disabled` custom property (default `0.5`).
 * The non-interactivity is not overridable, by design.
```

And leave the `@slot trailing` tag as a one-line pointer:

```ts
 * @slot trailing - Optional trailing content (`mud-badge`, `mud-button`, label).
 *                   Sits between the heading group and the open/close trigger.
 *                   Made inert while the item is disabled — see the note above.
```

- [ ] **Step 2: Add the changelog entry**

Under the existing `## Unreleased` heading in `CHANGELOG.md`, append a new subsection in the file's established prose style:

```markdown
### Changed — `mud-accordion-item` no longer writes `disabled` onto slotted content

While an item was disabled it used to set `disabled` on every element in its
`heading`, `supporting` and `trailing` slots and on all of their descendants, and
remove it again when the item was re-enabled. It could not distinguish the attributes
it had set from the ones you authored, so a control you shipped as
`<mud-button slot="trailing" disabled>` came back enabled with the item.

The attribute is no longer written or removed. Your `disabled` is yours. While the
item is disabled, slotted header content is made inert and muted from the component's
own stylesheet instead.

**What changes for you.** CSS or queries keyed on `disabled` appearing on slotted
elements — `mud-button[disabled]` inside an accordion header,
`[slot="trailing"][disabled]` — no longer match. Key on the item instead:
`mud-accordion-item[disabled] [slot="trailing"]`, which works from your own stylesheet
because both elements live in your tree.

Override the dim with `--accordion-item-slotted-opacity-disabled` (default `0.5`).
The non-interactivity is not overridable, by design.
```

- [ ] **Step 3: Regenerate the readme**

Run: `yarn build`

Expected: `src/components/mud-accordion-item/readme.md` picks up the new Overview prose below `<!-- Auto Generated Below -->`. Confirm with `git diff --stat src/components/mud-accordion-item/readme.md` that only that file changed among docs.

- [ ] **Step 4: Remove the scratch repro page**

```bash
rm -f web-components/demo/pages/navigation/_issue17-repro.html
git status --short
```

Expected: no untracked files under `web-components/`.

- [ ] **Step 5: Commit**

```bash
git add src/components/mud-accordion-item/mud-accordion-item.tsx src/components/mud-accordion-item/readme.md CHANGELOG.md
git commit -F - <<'EOF'
docs(accordion-item): state who owns `disabled` on slotted content

The decision behind the #17 fix belongs where the next reader hits it, not only
in a commit message. Names the override token and says plainly that the
inertness guard is not overridable.
EOF
```

---

## Acceptance bar

Graded PASS/FAIL. A non-PASS names the responsible file and line.

| # | Assertion | How it is proven |
| --- | --- | --- |
| 1 | A slotted control that arrives already `disabled` still carries `disabled` after the item's own `disabled` goes true and back to false | `SlottedDisabledContract` assertion 4, browser lane |
| 2 | A slotted control the consumer left enabled is non-interactive and visibly muted while the item is disabled, and interactive and normal again after | `SlottedDisabledContract` assertions 2, 3 and 4, browser lane |
| 3 | The component writes nothing into the consumer's `disabled` cell, in either direction | `SlottedDisabledContract` assertion 1, browser lane |
| 4 | `yarn test.storybook` passes | Task 2 Step 7 |
| 5 | The three existing `disabled` spec tests pass, unmodified | Task 2 Step 8; `git diff` shows the spec file gained only the new `it()` from Task 1 Step 1b, and no change to the three protected tests |
| 6 | `yarn lint` passes | Task 2 Step 9 |
| 7 | The contract decision is readable from the component's own docs, not only the commit log | Task 3; `readme.md` Overview contains the paragraph |
| 8 | The scratch repro page is not in the branch | Task 3 Step 4; `git status --short -- web-components/` is empty. NOT `git status --short` bare — the plan file itself is untracked and not ignored, so the bare form never returns clean and the row would fail with its intent fully met |
| 9 | The consumer-visible removal is announced in `CHANGELOG.md` under `## Unreleased` | Task 3 Step 2; `git diff CHANGELOG.md` shows the new subsection |
| 10 | The inertness guard survives an inline `pointer-events` on the slotted control | `SlottedDisabledContract` assertion 3b, browser lane |
| 11 | The dim and pointer guard hold for all three slots they name, not only `trailing` | `SlottedDisabledContract` assertions 2/3 and 4, which loop over `heading`, `supporting` and `trailing` |
| 12 | A control slotted into **`trailing`** is not keyboard-reachable while the item is disabled, and is again after | `SlottedDisabledContract` assertions 3c and 4's closing focus check. Deliberately scoped: `heading`/`supporting` carry the CSS guard only, and `pointer-events` does not affect focus, so an unqualified row would promise a WCAG guarantee this change does not deliver — see § Not Verified |
| 13 | A descendant of a slotted wrapper that sets its own `pointer-events` is still not the hit-test target while disabled | `SlottedDisabledContract` assertion 3d |
| 14 | `--accordion-item-slotted-opacity-disabled` is a real token, not a literal | Task 2 Step 2; `grep -n 'accordion-item-slotted-opacity-disabled' tokens/generated/core.tokens.css` is non-empty |

## Not Verified By This Plan

- **Dark mode.** The dim is opacity + grayscale over whatever the slotted component renders, so it follows the theme by construction, but no dark-mode screenshot is taken.
- **Real high-contrast rendering on an actual OS.** No `forced-colors` block ships. The dim was measured to survive `forced-colors: active` under Playwright's media emulation, which is not the same as a real Windows High Contrast session; nobody has looked at it there.
- **Non-Chromium browsers.** The browser project runs Chromium only (`vitest.config.mts:121`). `::slotted`, `pointer-events` and `inert` are all broadly supported, but nothing here measures Firefox or WebKit — and **`inert`'s propagation across the flat tree into slotted light DOM is the least-settled of the three and the one carrying the keyboard/WCAG guarantee.** Everything this plan knows about it is one Chromium measurement.
- **Consumers in the wild.** Whether any consumer of `@egov-moldova/mud@1.0.6` actually depends on `disabled` appearing on slotted elements is unknown; the change is announced, not surveyed.
- **The component loaded without the token stylesheet.** `opacity: var(--accordion-item-slotted-opacity-disabled)` carries no literal fallback, so a consumer who loads the bundle without `@egov-moldova/mud/tokens/core.tokens.css` gets an invalid declaration, `opacity: 1`, and `pointer-events: none` still applied — a control that looks normal and silently does nothing. A fallback was considered and NOT taken: the whole stylesheet is token-referencing with no fallbacks (`mud-accordion-item.css:58-64` is one of many such blocks), so that consumer's component is already fully unstyled — colours, spacing, type — and this rule is not where they would notice. Adding one literal here would buy nothing and would contradict `AGENTS.md:85` for the one value in the file that has an alternative.
- **An interactive control slotted into `heading` or `supporting`.** Those two keep the CSS guard only — no `inert` — so a control placed there stays keyboard-reachable while the item is disabled. They are documented for text (`@slot heading - Optional rich heading content`, `@slot supporting - Optional supporting text`), and making them inert was not taken because the accessible-name cost could not be settled: with all three wrappers inert the header button's name survived intact for a PROP-supplied heading, but the slotted-heading variant was measured inconclusively. If a consumer is found slotting controls into those, that is the trigger to revisit, with the a11y-name question measured first.
- **The `trailing` slot's a11y shape.** Interactive content nested inside the header `<button>` is invalid HTML and remains so after this change. Out of scope for #17, but it is the reason the platform's own guards behave inconsistently here.
