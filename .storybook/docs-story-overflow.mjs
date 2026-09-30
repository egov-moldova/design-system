// Lets the overlays of inline Docs stories escape their preview frame (issue #84).
//
// Addon-docs renders each inline story in a `.docs-story` box with `overflow: auto`, inside
// `.sbdocs-preview` with `overflow: hidden`, which clips the absolutely-positioned calendar
// and listbox popovers of `mud-*` components to the closed field — downward, and upward
// when a select flips above a field near the bottom of the viewport. Growing the box to
// fit an open overlay cannot see upward overflow and depends on catching the moment it
// opens, so `storybook-overrides.css` stops the clipping outright on the frames marked
// here: both boxes become `overflow: visible`, and the frame being interacted with is
// raised above its neighbours.
//
// Only a story that fits its frame is marked. CSS cannot scroll one axis and leave the
// other visible — `overflow-x: auto` turns `overflow-y: visible` into `auto` — so a story
// wider than its frame (the logo, pagination and service-button grids on a narrow
// viewport) keeps addon-docs' scrolling box, and so does every frame if this module never
// runs. The measurement runs when stories mount, hydrate, fonts load or the viewport
// resizes, never when an overlay opens.
//
// Not covered:
// - `scrollWidth` also counts a positioned overlay reaching past the frame's side edge,
//   hidden or not, so a frame measured while one sticks out stays a scrolling box;
// - a story whose width changes inside a shadow root with no class or DOM change
//   (a pagination re-render) keeps its previous mark until the next measurement;
// - a story with `parameters.docs.story.height`, whose inner box addon-docs sets to
//   `overflow: auto` itself.

export const STORY_BLOCK_SELECTOR = '.docs-story';
export const VISIBLE_ATTRIBUTE = 'data-mud-overflow-visible';

// A sub-pixel layout rounding is not overflow.
const TOLERANCE_PX = 1;

/** Marks every story block whose content fits its width, letting its overlays overflow. */
export function markFittingStoryBlocks(doc) {
  const blocks = [...doc.querySelectorAll(STORY_BLOCK_SELECTOR)];
  // Read every width before writing any mark, so the pass costs one layout, not one per
  // block. Both widths read the same whether the block scrolls or overflows visibly.
  const fits = blocks.map(block => block.scrollWidth - block.clientWidth <= TOLERANCE_PX);
  blocks.forEach((block, i) => block.toggleAttribute(VISIBLE_ATTRIBUTE, fits[i]));
}

/** Keeps the marks current as stories mount, hydrate and resize. Returns an uninstaller. */
export function installDocsStoryOverflow(win) {
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = win.requestAnimationFrame(() => {
      frame = 0;
      markFittingStoryBlocks(win.document);
    });
  };

  // `childList` sees a story mount or re-render on a Controls change; `class` sees Stencil
  // add `hydrated` once a component has rendered its shadow DOM, which is when its width
  // is final. The marks are a `data-*` attribute, outside the filter, so writing them
  // never re-triggers this observer.
  const observer = new win.MutationObserver(schedule);
  observer.observe(win.document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  win.addEventListener('resize', schedule);
  // Onest loads with `font-display: swap`, so text-heavy grids widen once it arrives.
  win.document.fonts?.addEventListener('loadingdone', schedule);
  schedule();

  return () => {
    observer.disconnect();
    win.removeEventListener('resize', schedule);
    win.document.fonts?.removeEventListener('loadingdone', schedule);
    win.cancelAnimationFrame(frame);
    frame = 0;
  };
}
