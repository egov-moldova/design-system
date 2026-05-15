import { Component, Element, h, Host } from '@stencil/core';

/**
 * Fully custom, cross-browser scrollbar wrapper.
 *
 * - Automatically detects vertical and horizontal scroll
 * - Shows only required scrollbars
 *
 * @element cor-scrollbar
 * @slot default - Scrollable content
 */
@Component({
  tag: 'cor-scrollbar',
  styleUrl: 'cor-scrollbar.css',
  shadow: true,
})
export class CorScrollbar {
  @Element() host!: HTMLElement;

  private contentEl!: HTMLElement;

  private trackY!: HTMLElement;
  private trackX!: HTMLElement;

  private thumbY!: HTMLElement;
  private thumbX!: HTMLElement;

  // Dragging state
  private draggingY = false;
  private draggingX = false;
  private dragStartPosY = 0;
  private dragStartScrollTop = 0;
  private dragThumbSizeY = 0;
  private dragStartPosX = 0;
  private dragStartScrollLeft = 0;
  private dragThumbSizeX = 0;

  componentDidLoad() {
    this.sync();
    this.contentEl.addEventListener('scroll', this.sync);
    window.addEventListener('resize', this.sync);

    this.thumbY?.addEventListener('pointerdown', this.startDragY);
    this.thumbX?.addEventListener('pointerdown', this.startDragX);
  }

  disconnectedCallback() {
    this.contentEl.removeEventListener('scroll', this.sync);
    window.removeEventListener('resize', this.sync);

    this.thumbY?.removeEventListener('pointerdown', this.startDragY);
    this.thumbX?.removeEventListener('pointerdown', this.startDragX);

    document.removeEventListener('pointermove', this.onDragMoveY);
    document.removeEventListener('pointerup', this.onDragEndY);
    document.removeEventListener('pointermove', this.onDragMoveX);
    document.removeEventListener('pointerup', this.onDragEndX);
    document.body.style.userSelect = '';
  }

  sync = () => {
    const c = this.contentEl;

    const hasY = c.scrollHeight > c.clientHeight;
    const hasX = c.scrollWidth > c.clientWidth;

    this.trackY.style.display = hasY ? 'block' : 'none';
    this.trackX.style.display = hasX ? 'block' : 'none';

    if (hasY) this.syncY();
    if (hasX) this.syncX();
  };

  private syncY() {
    const c = this.contentEl;
    const t = this.thumbY;

    const ratio = c.scrollTop / (c.scrollHeight - c.clientHeight);
    const thumbSize = Math.max(c.clientHeight * 0.15, 24);

    t.style.height = `${thumbSize}px`;
    t.style.transform = `translateY(${ratio * (c.clientHeight - thumbSize)}px)`;
  }

  private syncX() {
    const c = this.contentEl;
    const t = this.thumbX;

    const ratio = c.scrollLeft / (c.scrollWidth - c.clientWidth);
    const thumbSize = Math.max(c.clientWidth * 0.15, 24);

    t.style.width = `${thumbSize}px`;
    t.style.transform = `translateX(${ratio * (c.clientWidth - thumbSize)}px)`;
  }

  // Vertical drag handlers
  private startDragY = (ev: PointerEvent) => {
    ev.preventDefault();
    this.draggingY = true;
    this.dragStartPosY = ev.clientY;
    this.dragStartScrollTop = this.contentEl.scrollTop;
    this.dragThumbSizeY = this.thumbY.getBoundingClientRect().height;
    document.addEventListener('pointermove', this.onDragMoveY);
    document.addEventListener('pointerup', this.onDragEndY);
    document.body.style.userSelect = 'none';
    try {
      (ev.target as Element & { setPointerCapture?: unknown }).setPointerCapture?.(ev.pointerId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Pointer capture is a best-effort enhancement; document-level drag listeners keep dragging functional if it fails.
    }
  };

  private onDragMoveY = (ev: PointerEvent) => {
    if (!this.draggingY) return;
    const delta = ev.clientY - this.dragStartPosY;
    const trackLength = this.contentEl.clientHeight - this.dragThumbSizeY;
    const maxScroll = this.contentEl.scrollHeight - this.contentEl.clientHeight;
    if (trackLength <= 0 || maxScroll <= 0) return;
    const ratio = delta / trackLength;
    let newScrollTop = this.dragStartScrollTop + ratio * maxScroll;
    newScrollTop = Math.max(0, Math.min(newScrollTop, maxScroll));
    this.contentEl.scrollTop = newScrollTop;
  };

  private onDragEndY = (ev: PointerEvent) => {
    if (!this.draggingY) return;
    this.draggingY = false;
    document.removeEventListener('pointermove', this.onDragMoveY);
    try {
      (ev.target as Element & { releasePointerCapture?: unknown }).releasePointerCapture?.(ev.pointerId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Safe to ignore: pointer capture may already be released or owned by a different target during drag cleanup.
    }
    document.body.style.userSelect = '';
    try {
      (ev.target as Element & { releasePointerCapture?: unknown }).releasePointerCapture?.(ev.pointerId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Safe to ignore: pointer capture may already be released or owned by a different target during drag cleanup.
    }
  };

  // Horizontal drag handlers
  private startDragX = (ev: PointerEvent) => {
    ev.preventDefault();
    this.draggingX = true;
    this.dragStartPosX = ev.clientX;
    this.dragStartScrollLeft = this.contentEl.scrollLeft;
    this.dragThumbSizeX = this.thumbX.getBoundingClientRect().width;
    document.addEventListener('pointermove', this.onDragMoveX);
    document.addEventListener('pointerup', this.onDragEndX);
    document.body.style.userSelect = 'none';
    try {
      (ev.target as Element & { setPointerCapture?: unknown }).setPointerCapture?.(ev.pointerId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Pointer capture is a best-effort enhancement; document-level drag listeners keep dragging functional if it fails.
    }
  };

  private onDragMoveX = (ev: PointerEvent) => {
    if (!this.draggingX) return;
    const delta = ev.clientX - this.dragStartPosX;
    const trackLength = this.contentEl.clientWidth - this.dragThumbSizeX;
    const maxScroll = this.contentEl.scrollWidth - this.contentEl.clientWidth;
    if (trackLength <= 0 || maxScroll <= 0) return;
    const ratio = delta / trackLength;
    let newScrollLeft = this.dragStartScrollLeft + ratio * maxScroll;
    newScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
    this.contentEl.scrollLeft = newScrollLeft;
  };

  private onDragEndX = (ev: PointerEvent) => {
    if (!this.draggingX) return;
    this.draggingX = false;
    document.removeEventListener('pointermove', this.onDragMoveX);
    document.removeEventListener('pointerup', this.onDragEndX);
    document.body.style.userSelect = '';
    try {
      (ev.target as Element & { releasePointerCapture?: unknown }).releasePointerCapture?.(ev.pointerId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Safe to ignore: pointer capture may already be released or owned by a different target during drag cleanup.
    }
  };

  render() {
    return (
      <Host>
        <div class="scroll">
          <div class="scroll__content" ref={el => (this.contentEl = el as HTMLElement)}>
            <slot />
          </div>

          {/* Vertical scrollbar */}
          <div class="scroll__track scroll__track--y" ref={el => (this.trackY = el as HTMLElement)}>
            <div class="scroll__thumb scroll__thumb--y" ref={el => (this.thumbY = el as HTMLElement)} />
          </div>

          {/* Horizontal scrollbar */}
          <div class="scroll__track scroll__track--x" ref={el => (this.trackX = el as HTMLElement)}>
            <div class="scroll__thumb scroll__thumb--x" ref={el => (this.thumbX = el as HTMLElement)} />
          </div>
        </div>
      </Host>
    );
  }
}
