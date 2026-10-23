/**
 * Where `position: fixed` measures from for an element: the viewport, unless an ancestor
 * (crossing shadow roots) creates a containing block for fixed descendants — a `transform`,
 * `filter`, `perspective`, `will-change` or paint/layout containment, as Storybook's Docs canvas
 * does. Returns that ancestor's viewport offset, to subtract from viewport coordinates; `{0, 0}`
 * when there is none. Same walk as `mud-tooltip`'s.
 */
export const fixedContainingBlockOffset = (start: HTMLElement): { top: number; left: number } => {
  if (typeof window === 'undefined') return { top: 0, left: 0 };
  let el: HTMLElement | null = start.parentElement;
  while (el && el !== document.documentElement) {
    const st = window.getComputedStyle(el);
    const createsContainingBlock =
      st.transform !== 'none' ||
      st.perspective !== 'none' ||
      (st.willChange !== 'auto' && st.willChange !== '') ||
      st.filter !== 'none' ||
      st.backdropFilter !== 'none' ||
      (st.contain &&
        st.contain !== 'none' &&
        (st.contain.includes('paint') || st.contain.includes('layout') || st.contain.includes('strict')));
    if (createsContainingBlock) {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, left: rect.left };
    }
    if (el.parentElement) {
      el = el.parentElement;
    } else {
      const root = el.getRootNode();
      el = root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null;
    }
  }
  return { top: 0, left: 0 };
};
